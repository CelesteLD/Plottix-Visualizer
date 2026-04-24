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