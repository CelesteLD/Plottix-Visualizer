from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
import io
import uuid

import pandas as pd

from parsers.factory import ParserFactory
from visualizers.factory import VisualizerFactory

app = FastAPI(title="DataVis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store (per session would use Redis in prod)
_dataframe_store: dict[str, pd.DataFrame] = {}

# ── Models ─────────────────────────────────────────────────────────────────────

ALLOWED_STRATEGIES = {"drop", "mean", "median", "mode", "fill_empty", "none"}
ALLOWED_AGGREGATIONS = {"mean", "sum", "count", "min", "max"}

class MissingStrategy(BaseModel):
    column: str
    strategy: str  # drop | mean | median | mode | fill_empty | none

class HandleMissingsRequest(BaseModel):
    session_id: str
    strategies: list[MissingStrategy]

class VisualizeRequest(BaseModel):
    session_id: str
    x_column: str
    y_column: str
    chart_type: str
    title: Optional[str] = "Chart"
    aggregation: Optional[str] = "mean"  # mean | sum | count | min | max


def _missing_summary(df: pd.DataFrame) -> list[dict]:
    """Return per-column missing value info."""
    total = len(df)
    result = []
    for col in df.columns:
        n_missing = int(df[col].isna().sum())
        result.append({
            "column": col,
            "missing_count": n_missing,
            "missing_pct": round(n_missing / total * 100, 2) if total > 0 else 0.0,
            "dtype": str(df[col].dtype),
            "is_numeric": pd.api.types.is_numeric_dtype(df[col]),
        })
    return result


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a dataset file. Returns session_id, column names and missing info."""
    content = await file.read()
    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else "csv"

    try:
        parser = ParserFactory.get_parser(extension)
        df = parser.parse(io.BytesIO(content))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    session_id = str(uuid.uuid4())
    _dataframe_store[session_id] = df

    return {
        "session_id": session_id,
        "columns": df.columns.tolist(),
        "rows": len(df),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missing_info": _missing_summary(df),
    }


@app.post("/handle-missings")
def handle_missings(req: HandleMissingsRequest):
    """Apply per-column missing-value strategies and persist the cleaned DataFrame."""
    df = _dataframe_store.get(req.session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Session not found. Please re-upload the file.")

    df = df.copy()

    for item in req.strategies:
        col = item.column
        strategy = item.strategy

        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{col}' not found.")
        if strategy not in ALLOWED_STRATEGIES:
            raise HTTPException(status_code=400, detail=f"Unknown strategy '{strategy}'.")

        if strategy == "none":
            pass  # leave as-is

        elif strategy == "drop":
            df = df.dropna(subset=[col])

        elif strategy == "mean":
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise HTTPException(status_code=400, detail=f"'mean' requires numeric column ('{col}' is not).")
            df[col] = df[col].fillna(df[col].mean())

        elif strategy == "median":
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise HTTPException(status_code=400, detail=f"'median' requires numeric column ('{col}' is not).")
            df[col] = df[col].fillna(df[col].median())

        elif strategy == "mode":
            mode_val = df[col].mode()
            if not mode_val.empty:
                df[col] = df[col].fillna(mode_val.iloc[0])

        elif strategy == "fill_empty":
            df[col] = df[col].fillna("N/A" if not pd.api.types.is_numeric_dtype(df[col]) else 0)

    _dataframe_store[req.session_id] = df

    return {
        "rows": len(df),
        "missing_info": _missing_summary(df),
    }


@app.get("/chart-types")
def get_chart_types():
    """Return available chart types."""
    return {"chart_types": VisualizerFactory.available()}


@app.post("/visualize")
def visualize(req: VisualizeRequest):
    """Generate chart data for given columns, chart type and aggregation."""
    df = _dataframe_store.get(req.session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Session not found. Please re-upload the file.")

    # Histogram only uses y_column; skip x_column validation for it
    x_required = req.chart_type != "histogram"
    if x_required and req.x_column not in df.columns:
        raise HTTPException(status_code=400, detail="X column not found in dataset.")
    if req.y_column not in df.columns:
        raise HTTPException(status_code=400, detail="Y column not found in dataset.")

    aggregation = req.aggregation or "mean"
    if aggregation not in ALLOWED_AGGREGATIONS:
        raise HTTPException(status_code=400, detail=f"Unknown aggregation '{aggregation}'.")

    try:
        visualizer = VisualizerFactory.get_visualizer(req.chart_type)
        result = visualizer.generate(df, req.x_column, req.y_column, req.title, aggregation)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result

# ── Multi-series endpoint ───────────────────────────────────────────────────────

MULTI_ALLOWED_CHARTS = {"bar", "line"}

class VisualizeMultiRequest(BaseModel):
    session_id: str
    x_column: str
    y_columns: list[str]   # 2+ columns
    chart_type: str        # bar | line
    title: Optional[str] = "Chart"
    aggregation: Optional[str] = "mean"


@app.post("/visualize-multi")
def visualize_multi(req: VisualizeMultiRequest):
    """Generate multi-series chart data (multiple Y columns, same X)."""
    df = _dataframe_store.get(req.session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Session not found. Please re-upload the file.")

    if req.chart_type not in MULTI_ALLOWED_CHARTS:
        raise HTTPException(status_code=400, detail=f"Multi-series is only supported for: {MULTI_ALLOWED_CHARTS}.")

    if len(req.y_columns) < 2:
        raise HTTPException(status_code=400, detail="At least 2 Y columns are required for multi-series.")

    if req.x_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"X column '{req.x_column}' not found.")

    for col in req.y_columns:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Y column '{col}' not found.")

    aggregation = req.aggregation or "mean"
    if aggregation not in ALLOWED_AGGREGATIONS:
        raise HTTPException(status_code=400, detail=f"Unknown aggregation '{aggregation}'.")

    try:
        # Build a merged dict keyed by X value, one entry per Y column
        from visualizers.ivisualizer import VALID_AGGS
        agg = aggregation if aggregation in VALID_AGGS else "mean"

        x_col = req.x_column
        x_numeric = pd.to_numeric(df[x_col], errors="coerce").notna().mean() > 0.7

        # Gather per-Y series
        series: dict[str, dict] = {}  # x_val -> {y_col: value}

        for y_col in req.y_columns:
            subset = df[[x_col, y_col]].copy()
            y_numeric = pd.to_numeric(subset[y_col], errors="coerce").notna().mean() > 0.7

            if not x_numeric and y_numeric:
                subset[y_col] = pd.to_numeric(subset[y_col], errors="coerce")
                grouped = (
                    subset.groupby(x_col, observed=True)[y_col]
                    .agg(agg)
                    .dropna()
                    .sort_values(ascending=False)
                    .head(50)
                )
                for k, v in grouped.items():
                    key = str(k)
                    series.setdefault(key, {"x": key})
                    series[key][y_col] = round(float(v), 4)

            elif not x_numeric and not y_numeric:
                counts = subset[x_col].value_counts().head(50)
                for k, v in counts.items():
                    key = str(k)
                    series.setdefault(key, {"x": key})
                    series[key][y_col] = int(v)

            else:
                # Both numeric — use mean of Y per unique X value
                subset[x_col] = pd.to_numeric(subset[x_col], errors="coerce")
                subset[y_col] = pd.to_numeric(subset[y_col], errors="coerce")
                grouped = (
                    subset.groupby(x_col, observed=True)[y_col]
                    .agg(agg)
                    .dropna()
                    .head(50)
                )
                for k, v in grouped.items():
                    key = str(k)
                    series.setdefault(key, {"x": key})
                    series[key][y_col] = round(float(v), 4)

        data = list(series.values())

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "chart_type": f"multi_{req.chart_type}",
        "title": req.title,
        "data": data,
        "x_label": x_col,
        "y_columns": req.y_columns,
        "aggregation": aggregation,
    }