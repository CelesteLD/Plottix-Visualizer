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

# In-memory session store
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
    dtypes = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            dtypes[col] = str(df[col].dtype)
        else:
            ratio = pd.to_numeric(df[col], errors="coerce").notna().mean()
            dtypes[col] = str(df[col].dtype) if ratio <= 0.7 else "float64"
    return dtypes

# ── ServiceX compatible catalogue ─────────────────────────────────────────────

@app.route("/api/operations", methods=["GET"])
def get_operations():
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
    f   = request.files["file"]
    ext = (f.filename or "").rsplit(".", 1)[-1].lower()

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



# ── Export PDF ────────────────────────────────────────────────────────────────

@app.route("/api/export-pdf", methods=["POST"])
def export_pdf():
    """
    Generate a PDF report with all charts, their titles, narratives, and
    a dataset description header.

    Body: {
        "filename":    "my_dataset.csv",
        "description": "LLM dataset description text (optional)",
        "charts": [
            {
                "job_id":    "abc123",
                "title":     "Chart title",
                "narrative": "LLM narrative (optional)"
            },
            ...
        ]
    }
    """
    body      = request.get_json() or {}
    filename  = body.get("filename", "Dataset")
    desc      = body.get("description", "")
    charts    = body.get("charts", [])

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Image as RLImage,
            HRFlowable,
        )
        from reportlab.lib import colors

        buf = io.BytesIO()
        PAGE_W, PAGE_H = A4
        MARGIN = 2 * cm

        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=MARGIN, rightMargin=MARGIN,
            topMargin=MARGIN, bottomMargin=MARGIN,
        )

        # ── Styles ────────────────────────────────────────────────────────────
        GREEN_DARK  = colors.HexColor("#1A4A14")
        GREEN_MID   = colors.HexColor("#72BF78")
        GREEN_LIGHT = colors.HexColor("#D3EE98")
        INK_MUTED   = colors.HexColor("#5A7A54")

        style_title = ParagraphStyle(
            "PlottixTitle",
            fontSize=20, leading=26, textColor=GREEN_DARK,
            fontName="Helvetica-Bold", spaceAfter=4,
        )
        style_desc = ParagraphStyle(
            "PlottixDesc",
            fontSize=10, leading=15, textColor=INK_MUTED,
            fontName="Helvetica", spaceAfter=0,
        )
        style_chart_title = ParagraphStyle(
            "ChartTitle",
            fontSize=13, leading=17, textColor=GREEN_DARK,
            fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=4,
        )
        style_narrative = ParagraphStyle(
            "Narrative",
            fontSize=9, leading=13, textColor=INK_MUTED,
            fontName="Helvetica", spaceAfter=6,
        )
        style_nar_label = ParagraphStyle(
            "NarLabel",
            fontSize=8, leading=11, textColor=GREEN_MID,
            fontName="Helvetica-Bold", spaceAfter=2,
        )

        # ── Story ─────────────────────────────────────────────────────────────
        story = []

        # Header: filename as title
        name_clean = filename.replace(".csv","").replace(".xlsx","").replace(".tsv","").replace("_"," ").replace("-"," ")
        story.append(Paragraph(name_clean, style_title))
        story.append(HRFlowable(width="100%", thickness=1.5, color=GREEN_MID, spaceAfter=8))

        # Dataset description
        if desc:
            story.append(Paragraph(desc, style_desc))
            story.append(Spacer(1, 14))

        # Charts
        usable_width = PAGE_W - 2 * MARGIN

        for i, chart in enumerate(charts):
            job_id    = chart.get("job_id", "")
            title     = chart.get("title", f"Gráfico {i+1}")
            narrative = chart.get("narrative", "")

            if not job_id or not job_id.isalnum():
                continue

            png_path = os.path.join(OUTPUTS_DIR, f"{job_id}.png")
            if not os.path.exists(png_path):
                continue

            # Page break before every chart except the first
            if i > 0:
                from reportlab.platypus import PageBreak
                story.append(PageBreak())

            # Chart title
            story.append(Paragraph(title, style_chart_title))

            # Chart image — scale to fit page width, max height 12cm
            from PIL import Image as PILImage
            with PILImage.open(png_path) as pil_img:
                img_w, img_h = pil_img.size

            max_w = usable_width
            max_h = 12 * cm
            ratio = min(max_w / img_w, max_h / img_h)
            draw_w = img_w * ratio
            draw_h = img_h * ratio

            story.append(RLImage(png_path, width=draw_w, height=draw_h))

            # Narrative
            if narrative:
                story.append(Spacer(1, 4))
                story.append(Paragraph("✦ Análisis IA", style_nar_label))
                story.append(Paragraph(narrative, style_narrative))

        # Footer note
        story.append(Spacer(1, 16))
        story.append(HRFlowable(width="100%", thickness=0.5, color=GREEN_LIGHT))
        story.append(Paragraph(
            f"Generado con Plottix Visualizer · {len(charts)} gráfico(s)",
            ParagraphStyle("Footer", fontSize=8, textColor=INK_MUTED,
                           fontName="Helvetica", spaceBefore=6, alignment=TA_CENTER),
        ))

        doc.build(story)
        buf.seek(0)

        safe_name = filename.replace(" ", "_").rsplit(".", 1)[0]
        return send_file(
            buf,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"{safe_name}_report.pdf",
        )

    except Exception as e:
        return jsonify({"error": f"Error generando PDF: {e}"}), 500



# ── Export ML PDF ─────────────────────────────────────────────────────────────

@app.route("/api/export-ml-pdf", methods=["POST"])
def export_ml_pdf():
    """
    Generate a PDF report for trained ML models.

    Body: {
        "filename":    "my_dataset.csv",
        "results":     [ ...model result objects from /api/ml/train... ],
        "elbow_data":  { "elbow": [{k, inertia}, ...] } | null,
        "elbow_k":     3  (selected k, optional)
    }
    """
    body       = request.get_json() or {}
    filename   = body.get("filename", "Dataset")
    results    = body.get("results", [])
    elbow_data = body.get("elbow_data")
    elbow_k    = body.get("elbow_k")

    if not results:
        return jsonify({"error": "No hay resultados para exportar"}), 400

    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import matplotlib.patches as mpatches
        import numpy as np
        from io import BytesIO

        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.lib.styles import ParagraphStyle
        from reportlab.lib.enums import TA_LEFT, TA_CENTER
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Image as RLImage,
            HRFlowable, PageBreak, Table, TableStyle,
        )
        from reportlab.lib import colors

        PAGE_W, PAGE_H = A4
        MARGIN     = 2 * cm
        USABLE_W   = PAGE_W - 2 * MARGIN

        GREEN_DARK  = colors.HexColor("#1A4A14")
        GREEN_MID   = colors.HexColor("#72BF78")
        GREEN_LIGHT = colors.HexColor("#D3EE98")
        GREEN_PALE  = colors.HexColor("#EEF7E4")
        INK_MUTED   = colors.HexColor("#5A7A54")
        AMBER       = colors.HexColor("#D97706")
        TEAL        = colors.HexColor("#1D9E75")

        CAT_COLORS = {"classification": GREEN_MID, "regression": TEAL, "clustering": AMBER}

        s_title = ParagraphStyle("MLTitle", fontSize=20, leading=26,
                                  textColor=GREEN_DARK, fontName="Helvetica-Bold", spaceAfter=4)
        s_h1    = ParagraphStyle("MLH1", fontSize=15, leading=20,
                                  textColor=GREEN_DARK, fontName="Helvetica-Bold", spaceBefore=0, spaceAfter=6)
        s_h2    = ParagraphStyle("MLH2", fontSize=11, leading=15,
                                  textColor=INK_MUTED, fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4)
        s_body  = ParagraphStyle("MLBody", fontSize=9, leading=13,
                                  textColor=INK_MUTED, fontName="Helvetica", spaceAfter=4)
        s_foot  = ParagraphStyle("MLFoot", fontSize=8, leading=11,
                                  textColor=INK_MUTED, fontName="Helvetica",
                                  spaceBefore=6, alignment=TA_CENTER)

        # ── helpers ───────────────────────────────────────────────────────────

        def fig_to_rl_image(fig, max_w=USABLE_W, max_h=10*cm):
            buf = BytesIO()
            fig.savefig(buf, format="png", bbox_inches="tight",
                        facecolor=fig.get_facecolor(), dpi=140)
            plt.close(fig)
            buf.seek(0)
            from PIL import Image as PILImage
            with PILImage.open(buf) as pil:
                w, h = pil.size
            ratio  = min(max_w / w, max_h / h)
            buf.seek(0)
            return RLImage(buf, width=w*ratio, height=h*ratio)

        def green_table(data, col_widths=None):
            t = Table(data, colWidths=col_widths)
            t.setStyle(TableStyle([
                ("BACKGROUND",  (0,0), (-1,0), GREEN_LIGHT),
                ("TEXTCOLOR",   (0,0), (-1,0), GREEN_DARK),
                ("FONTNAME",    (0,0), (-1,0), "Helvetica-Bold"),
                ("FONTSIZE",    (0,0), (-1,-1), 8),
                ("FONTNAME",    (0,1), (-1,-1), "Helvetica"),
                ("TEXTCOLOR",   (0,1), (-1,-1), INK_MUTED),
                ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, GREEN_PALE]),
                ("GRID",        (0,0), (-1,-1), 0.4, GREEN_MID),
                ("LEFTPADDING", (0,0), (-1,-1), 6),
                ("RIGHTPADDING",(0,0), (-1,-1), 6),
                ("TOPPADDING",  (0,0), (-1,-1), 4),
                ("BOTTOMPADDING",(0,0), (-1,-1), 4),
            ]))
            return t

        # ── story ──────────────────────────────────────────────────────────────
        buf_pdf = BytesIO()
        doc = SimpleDocTemplate(buf_pdf, pagesize=A4,
                                 leftMargin=MARGIN, rightMargin=MARGIN,
                                 topMargin=MARGIN, bottomMargin=MARGIN)
        story = []

        name_clean = filename.replace(".csv","").replace(".xlsx","").replace(".tsv","").replace("_"," ").replace("-"," ")
        story.append(Paragraph(f"Informe ML — {name_clean}", s_title))
        story.append(HRFlowable(width="100%", thickness=1.5, color=GREEN_MID, spaceAfter=8))
        story.append(Paragraph(
            f"{len(results)} modelo(s) entrenado(s): " +
            ", ".join(r.get("label", r.get("model_type","?")) for r in results),
            s_body))
        story.append(Spacer(1, 10))

        for idx, result in enumerate(results):
            if idx > 0:
                story.append(PageBreak())

            model_label = result.get("label", result.get("model_type", "Modelo"))
            category    = result.get("category", "")
            metrics     = result.get("metrics", {})
            cfg         = result.get("config", {})
            cat_color   = CAT_COLORS.get(category, GREEN_MID)

            # ── Model heading ─────────────────────────────────────────────────
            story.append(Paragraph(model_label, s_h1))
            story.append(HRFlowable(width="100%", thickness=1, color=cat_color, spaceAfter=8))

            # ── Config table ──────────────────────────────────────────────────
            story.append(Paragraph("Configuración", s_h2))
            features = cfg.get("features", [])
            if category in ("classification", "regression"):
                cfg_rows = [["Parámetro", "Valor"]]
                cfg_rows.append(["Target",    cfg.get("target", "—")])
                cfg_rows.append(["Features",  ", ".join(features) if features else "—"])
                cfg_rows.append(["Test size", f"{round(cfg.get('test_size', 0) * 100)}%"])
                if result.get("model_type") in ("random_forest", "random_forest_reg"):
                    cfg_rows.append(["Nº árboles", str(cfg.get("n_estimators", "—"))])
                if result.get("model_type") in ("knn", "knn_reg"):
                    cfg_rows.append(["K vecinos", str(cfg.get("n_neighbors", "—"))])
                if result.get("model_type") == "ridge":
                    cfg_rows.append(["Alpha (Ridge)", str(cfg.get("alpha", "—"))])
            else:  # clustering
                cfg_rows = [["Parámetro", "Valor"]]
                cfg_rows.append(["Features", ", ".join(features) if features else "—"])
                if result.get("model_type") == "kmeans":
                    cfg_rows.append(["K clusters", str(cfg.get("n_clusters", "—"))])
                else:
                    cfg_rows.append(["eps",         str(cfg.get("eps", "—"))])
                    cfg_rows.append(["min_samples",  str(cfg.get("min_samples", "—"))])

            story.append(green_table(cfg_rows, col_widths=[USABLE_W*0.35, USABLE_W*0.65]))
            story.append(Spacer(1, 10))

            # ── Metrics table ──────────────────────────────────────────────────
            story.append(Paragraph("Métricas", s_h2))
            if category == "classification":
                m_rows = [["Métrica", "Valor"],
                          ["Accuracy",    str(round(metrics.get("accuracy", 0), 4))],
                          ["F1 Weighted", str(round(metrics.get("f1_weighted", 0), 4))],
                          ["Clases",      str(metrics.get("n_classes", "—"))],
                          ["Train size",  str(metrics.get("train_size", "—"))],
                          ["Test size",   str(metrics.get("test_size", "—"))]]
            elif category == "regression":
                m_rows = [["Métrica", "Valor"],
                          ["R²",   str(round(metrics.get("r2", 0), 4))],
                          ["RMSE", str(round(metrics.get("rmse", 0), 4))],
                          ["MAE",  str(round(metrics.get("mae", 0), 4))],
                          ["Train size", str(metrics.get("train_size", "—"))],
                          ["Test size",  str(metrics.get("test_size", "—"))]]
            else:
                m_rows = [["Métrica", "Valor"],
                          ["Silhouette", str(round(metrics.get("silhouette_score", 0), 4))],
                          ["Clusters",   str(metrics.get("n_clusters", "—"))],
                          ["Muestras",   str(metrics.get("n_samples", "—"))]]
                if metrics.get("inertia") is not None:
                    m_rows.append(["Inercia", str(round(metrics.get("inertia", 0), 2))])
                if metrics.get("n_noise_points") is not None:
                    m_rows.append(["Puntos ruido", str(metrics.get("n_noise_points", 0))])

            story.append(green_table(m_rows, col_widths=[USABLE_W*0.45, USABLE_W*0.55]))
            story.append(Spacer(1, 12))

            # ── Feature importances chart ──────────────────────────────────────
            fi = result.get("feature_importances", [])
            if fi:
                story.append(Paragraph("Importancia de features", s_h2))
                items   = fi[:10]
                labels_ = [d["feature"] for d in items]
                vals_   = [d["importance"] for d in items]
                colors_ = ["#72BF78" if i == 0 else "#A0D683" if i <= 2 else "#D3EE98"
                           for i in range(len(items))]
                fig, ax = plt.subplots(figsize=(7, max(2.5, len(items)*0.38)))
                bars = ax.barh(labels_[::-1], vals_[::-1], color=colors_[::-1])
                ax.set_facecolor("#F2F8ED"); fig.patch.set_facecolor("#FFFFFF")
                ax.tick_params(colors="#5A7A54", labelsize=8)
                ax.xaxis.label.set_color("#5A7A54")
                for spine in ax.spines.values():
                    spine.set_edgecolor("#DFF0D0")
                ax.grid(axis="x", color="#DFF0D0", linewidth=0.5, alpha=0.8)
                for bar, val in zip(bars, vals_[::-1]):
                    ax.text(bar.get_width() + 0.002, bar.get_y() + bar.get_height()/2,
                            f"{val:.3f}", va="center", fontsize=7.5, color="#2E4A28")
                ax.set_title("Importancia de features", fontsize=10, color="#1A4A14", pad=8)
                story.append(fig_to_rl_image(fig, max_h=9*cm))
                story.append(Spacer(1, 10))

            # ── Confusion matrix chart (classification) ────────────────────────
            cm_data = result.get("confusion_matrix")
            if cm_data and category == "classification":
                story.append(Paragraph("Matriz de confusión (top 10 clases)", s_h2))
                labels_  = cm_data["labels"][:10]
                matrix_  = [row[:10] for row in cm_data["matrix"][:10]]
                n        = len(labels_)
                mat_arr  = np.array(matrix_, dtype=float)
                max_val  = mat_arr.max() or 1

                fig, ax = plt.subplots(figsize=(max(4, n*0.55), max(3.5, n*0.48)))
                im = ax.imshow(mat_arr, cmap="Greens", vmin=0, vmax=max_val, aspect="auto")
                ax.set_xticks(range(n)); ax.set_yticks(range(n))
                short = [l[:8]+"…" if len(l)>9 else l for l in labels_]
                ax.set_xticklabels(short, rotation=40, ha="right", fontsize=7)
                ax.set_yticklabels(short, fontsize=7)
                for i in range(n):
                    for j in range(n):
                        v = int(mat_arr[i,j])
                        ax.text(j, i, str(v), ha="center", va="center",
                                fontsize=7.5,
                                color="#FFFFFF" if mat_arr[i,j]/max_val > 0.5 else "#1A4A14",
                                fontweight="bold" if i==j else "normal")
                ax.set_facecolor("#F2F8ED"); fig.patch.set_facecolor("#FFFFFF")
                ax.set_xlabel("Predicho", fontsize=8, color="#5A7A54")
                ax.set_ylabel("Real", fontsize=8, color="#5A7A54")
                ax.tick_params(colors="#5A7A54")
                for spine in ax.spines.values(): spine.set_edgecolor("#DFF0D0")
                ax.set_title(
                    f"Matriz de confusión — {model_label}" +
                    (f" ({len(cm_data['labels'])} clases en total)" if len(cm_data['labels'])>10 else ""),
                    fontsize=9, color="#1A4A14", pad=8)
                fig.tight_layout()
                story.append(fig_to_rl_image(fig, max_h=10*cm))
                story.append(Spacer(1, 10))

            # ── Scatter actual vs predicted (regression) ───────────────────────
            scatter_data = result.get("scatter")
            if scatter_data and category == "regression":
                story.append(Paragraph("Predicho vs Real", s_h2))
                actuals = [d["actual"]    for d in scatter_data]
                preds   = [d["predicted"] for d in scatter_data]
                fig, ax = plt.subplots(figsize=(5.5, 4))
                ax.scatter(actuals, preds, color="#72BF78", alpha=0.45, s=14, edgecolors="none")
                mn, mx = min(actuals+preds), max(actuals+preds)
                ax.plot([mn,mx],[mn,mx], color="#D97706", lw=1.4, linestyle="--", alpha=0.7,
                        label="Predicción perfecta")
                ax.set_facecolor("#F2F8ED"); fig.patch.set_facecolor("#FFFFFF")
                ax.set_xlabel("Real", fontsize=8, color="#5A7A54")
                ax.set_ylabel("Predicho", fontsize=8, color="#5A7A54")
                ax.tick_params(colors="#5A7A54", labelsize=7)
                for spine in ax.spines.values(): spine.set_edgecolor("#DFF0D0")
                ax.grid(color="#DFF0D0", linewidth=0.5, alpha=0.7)
                ax.legend(fontsize=7, framealpha=0.5)
                ax.set_title(f"Predicho vs Real — {model_label}", fontsize=9, color="#1A4A14", pad=8)
                story.append(fig_to_rl_image(fig, max_h=9*cm))
                story.append(Spacer(1, 10))

            # ── Cluster PCA scatter ────────────────────────────────────────────
            if scatter_data and category == "clustering":
                story.append(Paragraph("Clusters (proyección PCA 2D)", s_h2))
                CLUSTER_PALETTE = ["#72BF78","#D97706","#5DCAA5","#A0D683","#3A8C42",
                                   "#F59E0B","#1D9E75","#E67E22","#6B9A55","#FAC775"]
                xs = [d["x"] for d in scatter_data]
                ys = [d["y"] for d in scatter_data]
                cl = [d["cluster"] for d in scatter_data]
                fig, ax = plt.subplots(figsize=(5.5, 4.2))
                unique_cl = sorted(set(cl))
                for k in unique_cl:
                    mask = [c == k for c in cl]
                    color = "#9ca3af" if k == -1 else CLUSTER_PALETTE[k % len(CLUSTER_PALETTE)]
                    lbl   = "Ruido" if k == -1 else f"Cluster {k}"
                    ax.scatter([xs[i] for i,m in enumerate(mask) if m],
                               [ys[i] for i,m in enumerate(mask) if m],
                               color=color, alpha=0.65, s=16, label=lbl, edgecolors="none")
                ax.set_facecolor("#F2F8ED"); fig.patch.set_facecolor("#FFFFFF")
                pct = result.get("pca_variance", [])
                ax.set_xlabel(f"PC1{f' ({pct[0]*100:.1f}%)' if len(pct)>0 else ''}", fontsize=8, color="#5A7A54")
                ax.set_ylabel(f"PC2{f' ({pct[1]*100:.1f}%)' if len(pct)>1 else ''}", fontsize=8, color="#5A7A54")
                ax.tick_params(colors="#5A7A54", labelsize=7)
                for spine in ax.spines.values(): spine.set_edgecolor("#DFF0D0")
                ax.grid(color="#DFF0D0", linewidth=0.5, alpha=0.7)
                ax.legend(fontsize=7, framealpha=0.6, ncol=2)
                ax.set_title(f"Clusters PCA — {model_label}", fontsize=9, color="#1A4A14", pad=8)
                story.append(fig_to_rl_image(fig, max_h=9*cm))
                story.append(Spacer(1, 10))

            # ── Elbow chart — only for K-Means, only if provided ───────────────
            if (result.get("model_type") == "kmeans"
                    and elbow_data and elbow_data.get("elbow")):
                story.append(Paragraph("Método del codo (K-Means)", s_h2))
                elbow_pts = elbow_data["elbow"]
                ks      = [p["k"]       for p in elbow_pts]
                inertias= [p["inertia"] for p in elbow_pts]
                fig, ax = plt.subplots(figsize=(5.5, 3.2))
                ax.plot(ks, inertias, color="#72BF78", linewidth=2, marker="o",
                        markersize=6, markerfacecolor="#3A8C42")
                if elbow_k and elbow_k in ks:
                    idx_k = ks.index(elbow_k)
                    ax.axvline(x=elbow_k, color="#D97706", linestyle="--",
                               linewidth=1.4, alpha=0.8, label=f"k seleccionado = {elbow_k}")
                    ax.scatter([elbow_k], [inertias[idx_k]],
                               color="#D97706", s=60, zorder=5)
                    ax.legend(fontsize=8, framealpha=0.6)
                ax.set_facecolor("#F2F8ED"); fig.patch.set_facecolor("#FFFFFF")
                ax.set_xlabel("k (número de clusters)", fontsize=8, color="#5A7A54")
                ax.set_ylabel("Inercia", fontsize=8, color="#5A7A54")
                ax.tick_params(colors="#5A7A54", labelsize=8)
                for spine in ax.spines.values(): spine.set_edgecolor("#DFF0D0")
                ax.grid(color="#DFF0D0", linewidth=0.5, alpha=0.7)
                ax.set_title("Método del codo — inercia vs k", fontsize=9, color="#1A4A14", pad=8)
                story.append(fig_to_rl_image(fig, max_h=7*cm))
                story.append(Spacer(1, 6))
                if elbow_k:
                    story.append(Paragraph(f"k seleccionado por el usuario: <b>{elbow_k}</b>", s_body))

        # ── Footer ────────────────────────────────────────────────────────────
        story.append(Spacer(1, 16))
        story.append(HRFlowable(width="100%", thickness=0.5, color=GREEN_LIGHT))
        story.append(Paragraph(
            f"Generado con Plottix Visualizer · {len(results)} modelo(s)",
            s_foot))

        doc.build(story)
        buf_pdf.seek(0)

        safe_name = filename.replace(" ", "_").rsplit(".", 1)[0]
        return send_file(
            buf_pdf,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"{safe_name}_ml_report.pdf",
        )

    except Exception as e:
        import traceback
        return jsonify({"error": f"Error generando PDF ML: {e}", "trace": traceback.format_exc()}), 500


# ── Health ────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "plottix"})


# ── LLM — status ──────────────────────────────────────────────────────────────

@app.route("/api/llm/status", methods=["GET"])
def llm_status():
    """Check whether the Ollama service and required models are available."""
    from llm_service import llm_status as _llm_status
    return jsonify(_llm_status())


# ── LLM — describe dataset ────────────────────────────────────────────────────

@app.route("/api/llm/describe", methods=["POST"])
def llm_describe():
    """
    Generate a natural-language description of an uploaded dataset.
    Body: { "session_id": "..." }
    """
    body       = request.get_json()
    session_id = body.get("session_id")
    df         = _sessions.get(session_id)
    if df is None:
        return jsonify({"error": "Sesión no encontrada"}), 404

    try:
        from llm_service import describe_dataset
        text = describe_dataset(
            columns      = df.columns.tolist(),
            dtypes       = _classify_columns(df),
            n_rows       = len(df),
            missing_info = _missing_summary(df),
            sample_rows  = df.head(5).to_dict(orient="records"),
        )
        return jsonify({"description": text})
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"Error generando descripción: {e}"}), 500


# ── LLM — interpret chart ─────────────────────────────────────────────────────

@app.route("/api/llm/interpret/<job_id>", methods=["POST"])
def llm_interpret(job_id: str):
    """
    Generate a narrative explanation for a previously generated chart PNG.
    Body: { "chart_type": "bar", "title": "...", "x_column": "...", "y_column": "..." }
    """
    if not job_id.isalnum():
        return jsonify({"error": "job_id inválido"}), 400

    png_path = os.path.join(OUTPUTS_DIR, f"{job_id}.png")
    if not os.path.exists(png_path):
        return jsonify({"error": "Gráfico no encontrado. Solo se pueden interpretar gráficos PNG."}), 404

    body = request.get_json() or {}

    try:
        with open(png_path, "rb") as f:
            image_bytes = f.read()

        from llm_service import interpret_chart
        text = interpret_chart(
            image_bytes = image_bytes,
            chart_type  = body.get("chart_type", ""),
            title       = body.get("title", ""),
            x_column    = body.get("x_column"),
            y_column    = body.get("y_column"),
        )
        return jsonify({"narrative": text})
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"Error interpretando gráfico: {e}"}), 500


# ── ML endpoints ──────────────────────────────────────────────────────────────

@app.route("/api/ml/models", methods=["GET"])
def get_ml_models():
    """Return all available ML models grouped by category."""
    from ml.factory import MLModelFactory
    models = MLModelFactory.available()
    grouped = {"classification": [], "regression": [], "clustering": []}
    for m in models:
        grouped[m["category"]].append({"value": m["value"], "label": m["label"]})
    return jsonify(grouped)


@app.route("/api/ml/elbow", methods=["POST"])
def ml_elbow():
    """Compute K-Means elbow curve (inertia vs k)."""
    body       = request.get_json()
    session_id = body.get("session_id")
    df         = _sessions.get(session_id)
    if df is None:
        return jsonify({"error": "Sesión no encontrada"}), 404

    features = body.get("features", [])
    max_k    = int(body.get("max_k", 10))

    for col in features:
        if col not in df.columns:
            return jsonify({"error": f"Columna '{col}' no encontrada"}), 400

    try:
        from ml.clustering import KMeansModel
        model  = KMeansModel()
        result = model.elbow(df, {"features": features, "max_k": max_k})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(result)


@app.route("/api/ml/train", methods=["POST"])
def ml_train():
    """Train one or more ML models and return all results."""
    body       = request.get_json()
    session_id = body.get("session_id")
    df         = _sessions.get(session_id)
    if df is None:
        return jsonify({"error": "Sesión no encontrada"}), 404

    model_types = body.get("model_types", [])
    if not model_types:
        return jsonify({"error": "Selecciona al menos un modelo"}), 400

    config = {
        "features":     body.get("features", []),
        "target":       body.get("target"),
        "test_size":    float(body.get("test_size", 0.2)),
        "n_estimators": int(body.get("n_estimators", 100)),
        "n_neighbors":  int(body.get("n_neighbors", 5)),
        "alpha":        float(body.get("alpha", 1.0)),
        "n_clusters":   int(body.get("n_clusters", 3)),
        "eps":          float(body.get("eps", 0.5)),
        "min_samples":  int(body.get("min_samples", 5)),
    }

    from ml.factory import MLModelFactory

    results, errors = [], []
    for mt in model_types:
        try:
            model  = MLModelFactory.get_model(mt)
            result = model.train(df, config)
            results.append(result)
        except ValueError as e:
            errors.append({"model_type": mt, "error": str(e)})
        except Exception as e:
            errors.append({"model_type": mt, "error": f"Error inesperado: {e}"})

    return jsonify({"results": results, "errors": errors})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)