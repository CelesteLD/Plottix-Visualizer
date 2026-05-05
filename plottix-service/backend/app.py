"""
Plottix Service — Backend
Flask server following the ServiceX pattern.
Receives datasets, generates chart PNGs with matplotlib/seaborn,
and serves them back to the dashboard client.
"""
import os
import io
import uuid
import json

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR    = os.path.dirname(__file__)
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUTPUTS_DIR, exist_ok=True)

# In-memory session store (replace with Redis in production)
_sessions: dict[str, pd.DataFrame] = {}

# ── Descriptor ────────────────────────────────────────────────────────────────

with open(os.path.join(BASE_DIR, "descriptor.json")) as f:
    _DESCRIPTOR = json.load(f)

# ── Helpers ───────────────────────────────────────────────────────────────────

def _missing_summary(df: pd.DataFrame) -> list[dict]:
    total = len(df)
    return [
        {
            "column":        col,
            "missing_count": int(df[col].isna().sum()),
            "missing_pct":   round(df[col].isna().sum() / total * 100, 2) if total else 0,
            "dtype":         str(df[col].dtype),
            "is_numeric":    pd.api.types.is_numeric_dtype(df[col]),
        }
        for col in df.columns
    ]

def _classify_columns(df: pd.DataFrame) -> dict:
    """Return dtypes dict classifying each column as numeric or categorical."""
    dtypes = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            dtypes[col] = str(df[col].dtype)
        else:
            # Try soft-numeric detection
            ratio = pd.to_numeric(df[col], errors="coerce").notna().mean()
            dtypes[col] = str(df[col].dtype) if ratio <= 0.7 else "float64"
    return dtypes

# ── ServiceX compatible catalogue ────────────────────────────────────────────

@app.route("/api/operations", methods=["GET"])
def get_operations():
    """ServiceX-compatible endpoint: returns this service's descriptor."""
    return jsonify({"operations": [_DESCRIPTOR]})


@app.route("/api/chart-types", methods=["GET"])
def get_chart_types():
    return jsonify({"chart_types": [
        {"value": "bar",         "label": "Bar Chart"},
        {"value": "line",        "label": "Line Chart"},
        {"value": "scatter",     "label": "Scatter Plot"},
        {"value": "histogram",   "label": "Histogram"},
        {"value": "pie",         "label": "Pie Chart"},
        {"value": "boxplot",     "label": "Box Plot"},
        {"value": "kde",         "label": "Density Curve"},
        {"value": "violin",      "label": "Violin Plot"},
        {"value": "correlogram", "label": "Correlogram"},
        {"value": "geomap",      "label": "Mapa Coroplético"},
    ]})


# ── Upload ────────────────────────────────────────────────────────────────────

@app.route("/api/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No se recibió ningún fichero"}), 400
    f    = request.files["file"]
    ext  = (f.filename or "").rsplit(".", 1)[-1].lower()

    try:
        if ext in ("csv", "txt", "tsv"):
            sep = "\t" if ext == "tsv" else ","
            df  = pd.read_csv(f, sep=sep)
        elif ext in ("xlsx", "xls"):
            df  = pd.read_excel(f)
        else:
            return jsonify({"error": f"Formato no soportado: .{ext}"}), 400
    except Exception as e:
        return jsonify({"error": f"No se pudo parsear el fichero: {e}"}), 422

    session_id = str(uuid.uuid4())
    _sessions[session_id] = df

    return jsonify({
        "session_id":   session_id,
        "columns":      df.columns.tolist(),
        "rows":         len(df),
        "dtypes":       _classify_columns(df),
        "missing_info": _missing_summary(df),
    })


# ── Handle missings ───────────────────────────────────────────────────────────

ALLOWED_STRATEGIES = {"drop", "mean", "median", "mode", "fill_empty", "none"}

@app.route("/api/handle-missings", methods=["POST"])
def handle_missings():
    body = request.get_json()
    df   = _sessions.get(body.get("session_id"))
    if df is None:
        return jsonify({"error": "Sesión no encontrada"}), 404

    df = df.copy()
    for item in body.get("strategies", []):
        col, strategy = item["column"], item["strategy"]
        if col not in df.columns or strategy not in ALLOWED_STRATEGIES:
            continue
        if strategy == "drop":
            df = df.dropna(subset=[col])
        elif strategy == "mean" and pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].fillna(df[col].mean())
        elif strategy == "median" and pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].fillna(df[col].median())
        elif strategy == "mode":
            m = df[col].mode()
            if not m.empty:
                df[col] = df[col].fillna(m.iloc[0])
        elif strategy == "fill_empty":
            df[col] = df[col].fillna(0 if pd.api.types.is_numeric_dtype(df[col]) else "N/A")

    _sessions[body["session_id"]] = df
    return jsonify({"rows": len(df), "missing_info": _missing_summary(df)})


# ── Visualize → PNG ───────────────────────────────────────────────────────────

@app.route("/api/visualize", methods=["POST"])
def visualize():
    body       = request.get_json()
    session_id = body.get("session_id")
    df         = _sessions.get(session_id)
    if df is None:
        return jsonify({"error": "Sesión no encontrada"}), 404

    chart_type  = body.get("chart_type", "bar")
    x_column    = body.get("x_column")
    y_column    = body.get("y_column")
    y_columns   = body.get("y_columns", [])
    aggregation = body.get("aggregation", "mean")
    title       = body.get("title", "Chart")

    try:
        from visualizers.factory import ChartFactory
        factory = ChartFactory()
        result  = factory.generate_png(
            df          = df,
            chart_type  = chart_type,
            x_column    = x_column,
            y_column    = y_column,
            y_columns   = y_columns,
            aggregation = aggregation,
            title       = title,
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Error generando gráfico: {e}"}), 500

    job_id = uuid.uuid4().hex

    # Interactive chart (Folium HTML) — save as .html
    if isinstance(result, dict) and result.get("is_interactive"):
        out_path = os.path.join(OUTPUTS_DIR, f"{job_id}.html")
        with open(out_path, "w", encoding="utf-8") as fout:
            fout.write(result["html"])
        return jsonify({
            "job_id":         job_id,
            "chart_type":     chart_type,
            "title":          title,
            "is_interactive": True,
        })

    # Static chart (PNG)
    out_path = os.path.join(OUTPUTS_DIR, f"{job_id}.png")
    with open(out_path, "wb") as fout:
        fout.write(result.getvalue())

    return jsonify({
        "job_id":         job_id,
        "chart_type":     chart_type,
        "title":          title,
        "is_interactive": False,
    })


# ── Serve PNG ─────────────────────────────────────────────────────────────────

@app.route("/api/result/<job_id>", methods=["GET"])
def get_result(job_id):
    if not job_id.isalnum():
        return jsonify({"error": "job_id inválido"}), 400
    path = os.path.join(OUTPUTS_DIR, f"{job_id}.png")
    if not os.path.exists(path):
        return jsonify({"error": "Resultado no encontrado"}), 404
    return send_file(path, mimetype="image/png")


# ── Serve interactive HTML (Folium maps) ──────────────────────────────────────

@app.route("/api/result-html/<job_id>", methods=["GET"])
def get_result_html(job_id):
    if not job_id.isalnum():
        return jsonify({"error": "job_id inválido"}), 400
    path = os.path.join(OUTPUTS_DIR, f"{job_id}.html")
    if not os.path.exists(path):
        return jsonify({"error": "Resultado HTML no encontrado"}), 404
    return send_file(path, mimetype="text/html")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "plottix"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)