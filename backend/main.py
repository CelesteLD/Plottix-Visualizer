from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
import io
import uuid

import pandas as pd

from parsers.factory import ParserFactory
from visualizers.factory import VisualizerFactory

app = FastAPI(title="Plottix API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_dataframe_store: dict[str, pd.DataFrame] = {}

ALLOWED_STRATEGIES   = {"drop", "mean", "median", "mode", "fill_empty", "none"}
ALLOWED_AGGREGATIONS = {"mean", "sum", "count", "min", "max"}


class MissingStrategy(BaseModel):
    column:   str
    strategy: str


class HandleMissingsRequest(BaseModel):
    session_id: str
    strategies: list[MissingStrategy]


class VisualizeRequest(BaseModel):
    session_id:  str
    x_column:    str
    y_column:    Optional[str] = None
    chart_type:  str
    title:       Optional[str] = "Chart"
    aggregation: Optional[str] = "mean"


def _missing_summary(df: pd.DataFrame) -> list[dict]:
    total = len(df)
    result = []
    for col in df.columns:
        n_missing = int(df[col].isna().sum())
        result.append({
            "column":        col,
            "missing_count": n_missing,
            "missing_pct":   round(n_missing / total * 100, 2) if total > 0 else 0.0,
            "dtype":         str(df[col].dtype),
            "is_numeric":    pd.api.types.is_numeric_dtype(df[col]),
        })
    return result


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    content   = await file.read()
    filename  = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else "csv"

    try:
        parser = ParserFactory.get_parser(extension)
        df = parser.parse(io.BytesIO(content))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"No se pudo parsear el fichero: {e}")

    session_id = str(uuid.uuid4())
    _dataframe_store[session_id] = df

    return {
        "session_id":   session_id,
        "columns":      df.columns.tolist(),
        "rows":         len(df),
        "dtypes":       {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missing_info": _missing_summary(df),
    }


@app.post("/handle-missings")
def handle_missings(req: HandleMissingsRequest):
    df = _dataframe_store.get(req.session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada. Por favor, vuelve a subir el fichero.")

    df = df.copy()

    for item in req.strategies:
        col      = item.column
        strategy = item.strategy

        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Columna '{col}' no encontrada.")
        if strategy not in ALLOWED_STRATEGIES:
            raise HTTPException(status_code=400, detail=f"Estrategia desconocida '{strategy}'.")

        if strategy == "none":
            pass
        elif strategy == "drop":
            df = df.dropna(subset=[col])
        elif strategy == "mean":
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise HTTPException(status_code=400, detail=f"'mean' requiere columna numérica ('{col}' no lo es).")
            df[col] = df[col].fillna(df[col].mean())
        elif strategy == "median":
            if not pd.api.types.is_numeric_dtype(df[col]):
                raise HTTPException(status_code=400, detail=f"'median' requiere columna numérica ('{col}' no lo es).")
            df[col] = df[col].fillna(df[col].median())
        elif strategy == "mode":
            mode_val = df[col].mode()
            if not mode_val.empty:
                df[col] = df[col].fillna(mode_val.iloc[0])
        elif strategy == "fill_empty":
            df[col] = df[col].fillna("N/A" if not pd.api.types.is_numeric_dtype(df[col]) else 0)

    _dataframe_store[req.session_id] = df
    return {"rows": len(df), "missing_info": _missing_summary(df)}


@app.get("/chart-types")
def get_chart_types():
    return {"chart_types": VisualizerFactory.available()}


@app.post("/visualize")
def visualize(req: VisualizeRequest):
    df = _dataframe_store.get(req.session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada. Por favor, vuelve a subir el fichero.")

    x_required = req.chart_type not in {"histogram", "kde", "violin"}
    y_optional = req.chart_type == "pie"

    if x_required and req.x_column not in df.columns:
        raise HTTPException(status_code=400, detail="Columna X no encontrada en el dataset.")
    if not y_optional and (not req.y_column or req.y_column not in df.columns):
        raise HTTPException(status_code=400, detail="Columna Y no encontrada en el dataset.")
    if y_optional and req.y_column and req.y_column not in df.columns:
        raise HTTPException(status_code=400, detail="Columna Y no encontrada en el dataset.")

    aggregation = req.aggregation or "mean"
    if aggregation not in ALLOWED_AGGREGATIONS:
        raise HTTPException(status_code=400, detail=f"Agregación desconocida '{aggregation}'.")

    try:
        visualizer = VisualizerFactory.get_visualizer(req.chart_type)
        result     = visualizer.generate(df, req.x_column, req.y_column, req.title, aggregation)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result


# ── Multi-series endpoint ───────────────────────────────────────────────────────

MULTI_ALLOWED_CHARTS = {"bar", "line"}


class VisualizeMultiRequest(BaseModel):
    session_id:  str
    x_column:    str
    y_columns:   list[str]
    chart_type:  str
    title:       Optional[str] = "Chart"
    aggregation: Optional[str] = "mean"


@app.post("/visualize-multi")
def visualize_multi(req: VisualizeMultiRequest):
    df = _dataframe_store.get(req.session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada. Por favor, vuelve a subir el fichero.")

    if req.chart_type not in MULTI_ALLOWED_CHARTS:
        raise HTTPException(status_code=400, detail=f"Multi-serie solo se soporta en: {MULTI_ALLOWED_CHARTS}.")

    if len(req.y_columns) < 2:
        raise HTTPException(status_code=400, detail="Se necesitan al menos 2 columnas Y para multi-serie.")

    if req.x_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Columna X '{req.x_column}' no encontrada.")

    for col in req.y_columns:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Columna Y '{col}' no encontrada.")
        # Enforce numeric Y
        if pd.to_numeric(df[col], errors="coerce").notna().mean() <= 0.7:
            raise HTTPException(
                status_code=400,
                detail=f"La columna '{col}' no es numérica. Multi-serie requiere columnas Y numéricas."
            )

    aggregation = req.aggregation or "mean"
    if aggregation not in ALLOWED_AGGREGATIONS:
        raise HTTPException(status_code=400, detail=f"Agregación desconocida '{aggregation}'.")

    try:
        from visualizers.ivisualizer import VALID_AGGS
        agg       = aggregation if aggregation in VALID_AGGS else "mean"
        x_col     = req.x_column
        x_numeric = pd.to_numeric(df[x_col], errors="coerce").notna().mean() > 0.7
        series:   dict[str, dict] = {}

        for y_col in req.y_columns:
            subset    = df[[x_col, y_col]].copy()
            subset[y_col] = pd.to_numeric(subset[y_col], errors="coerce")

            if not x_numeric:
                # Categorical X + numeric Y
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
            else:
                # Numeric X + numeric Y
                subset[x_col] = pd.to_numeric(subset[x_col], errors="coerce")
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
        "chart_type":  f"multi_{req.chart_type}",
        "title":       req.title,
        "data":        data,
        "x_label":     x_col,
        "y_columns":   req.y_columns,
        "aggregation": aggregation,
    }


# ── Correlogram endpoint ────────────────────────────────────────────────────────

class VisualizeCorrelogramRequest(BaseModel):
    session_id: str
    columns:    list[str]
    title:      Optional[str] = "Correlogram"


@app.post("/visualize-correlogram")
def visualize_correlogram(req: VisualizeCorrelogramRequest):
    df = _dataframe_store.get(req.session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Sesión no encontrada. Por favor, vuelve a subir el fichero.")

    if len(req.columns) < 2:
        raise HTTPException(status_code=400, detail="El correlograma requiere al menos 2 columnas.")

    try:
        from visualizers.correlogram import CorrelogramVisualizer
        viz    = CorrelogramVisualizer()
        result = viz.generate_multi(df, req.columns, req.title)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result
