"""
llm_service.py — Plottix LLM integration
Communicates with a local Ollama instance (moondream2) to:
  1. Generate a natural-language description of an uploaded dataset.
  2. Generate a narrative explanation of a chart image (vision).
"""

import base64
import logging
import os

import requests

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

OLLAMA_BASE  = os.getenv("OLLAMA_URL", "http://ollama:11434")
TEXT_MODEL   = os.getenv("LLM_TEXT_MODEL",  "phi3:mini")      # dataset description
VISION_MODEL = os.getenv("LLM_VISION_MODEL", "llava-phi3")    # chart interpretation
TIMEOUT      = int(os.getenv("LLM_TIMEOUT", "120"))           # seconds


# ── Internal helper ───────────────────────────────────────────────────────────

def _ollama_generate(model: str, prompt: str, images: list[str] | None = None) -> str:
    """
    Call POST /api/generate on the local Ollama service.
    `images` is an optional list of base64-encoded PNG strings (for vision models).
    Returns the generated text or raises RuntimeError on failure.
    """
    payload: dict = {
        "model":  model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,   # low temp → factual, reproducible outputs
            "num_predict": 256,   # cap token output to keep responses concise
        },
    }
    if images:
        payload["images"] = images

    try:
        resp = requests.post(
            f"{OLLAMA_BASE}/api/generate",
            json=payload,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json().get("response", "").strip()
    except requests.exceptions.ConnectionError:
        raise RuntimeError("No se pudo conectar con el servicio LLM (Ollama). ¿Está arrancado?")
    except requests.exceptions.Timeout:
        raise RuntimeError("El servicio LLM tardó demasiado en responder. Inténtalo de nuevo.")
    except requests.exceptions.HTTPError as e:
        raise RuntimeError(f"Error del servicio LLM: {e}")


def _ollama_ready() -> bool:
    """Return True if Ollama is reachable."""
    try:
        r = requests.get(f"{OLLAMA_BASE}/api/tags", timeout=5)
        return r.status_code == 200
    except Exception:
        return False


# ── Public API ────────────────────────────────────────────────────────────────

def describe_dataset(
    columns: list[str],
    dtypes: dict[str, str],
    n_rows: int,
    missing_info: list[dict],
    sample_rows: list[dict],
) -> str:
    """
    Generate a 1-2 sentence description of a dataset.
    Uses only column names + row count — no sample data — to prevent prompt injection.
    """
    # Sanitize column names: strip anything after a newline or special char sequence
    # that could be used for prompt injection
    def sanitize(s: str) -> str:
        return s.split("\n")[0].split("##")[0].strip()[:60]

    cols_summary = ", ".join(sanitize(c) for c in columns[:20])
    if len(columns) > 20:
        cols_summary += f" … y {len(columns) - 20} más"

    n_missing_cols = sum(1 for m in missing_info if m["missing_count"] > 0)
    missing_note   = f"{n_missing_cols} columnas con valores faltantes." if n_missing_cols else ""

    # No sample_rows in the prompt — they are untrusted user data and can contain
    # prompt injection instructions. Column names + row count are sufficient.
    prompt = (
        f"Completa esta frase en una o dos oraciones en español, "
        f"de forma directa y sin listas:\n\n"
        f"Este dataset tiene {n_rows} filas y {len(columns)} columnas "
        f"({cols_summary}). {missing_note}\n\n"
        f"En resumen, parece contener información sobre"
    )

    result = _ollama_generate(TEXT_MODEL, prompt)

    # Prepend the factual opener so the response always starts grounded
    prefix = f"Dataset con {n_rows:,} filas y {len(columns)} columnas. "
    return prefix + result


def interpret_chart(
    image_bytes: bytes,
    chart_type: str,
    title: str,
    x_column: str | None,
    y_column: str | None,
) -> str:
    """
    Generate a natural-language narrative for a chart image.

    Parameters
    ----------
    image_bytes : raw PNG bytes of the chart
    chart_type  : e.g. "bar", "scatter", "histogram"
    title       : chart title as configured by the user
    x_column    : name of the X axis column (may be None for histograms etc.)
    y_column    : name of the Y axis column

    Returns
    -------
    A 3-5 sentence plain-text narrative in Spanish.
    """
    b64_image = base64.b64encode(image_bytes).decode("utf-8")

    axes_info = ""
    if x_column:
        axes_info += f"Eje X: {x_column}. "
    if y_column:
        axes_info += f"Eje Y: {y_column}. "

    chart_labels = {
        "bar":         "gráfico de barras",
        "line":        "gráfico de líneas",
        "scatter":     "diagrama de dispersión",
        "histogram":   "histograma",
        "pie":         "gráfico de tarta",
        "boxplot":     "diagrama de caja",
        "kde":         "curva de densidad",
        "violin":      "diagrama de violín",
        "correlogram": "correlograma",
        "geomap":      "mapa coroplético",
    }
    chart_label = chart_labels.get(chart_type, chart_type)

    # Step 1: moondream extracts raw visual observations from the image
    vision_prompt = f"Describe the data points, axes, and any visible trend in this {chart_label}."
    raw_vision = _ollama_generate(VISION_MODEL, vision_prompt, images=[b64_image])

    # Step 2: phi3:mini uses the visual observations + metadata to write
    # a coherent Spanish narrative, compensating for moondream inconsistencies
    enhance_prompt = f"""Eres un asistente de análisis de datos. A partir de la siguiente observación visual de un gráfico y sus metadatos, escribe una narrativa clara en español de 3-4 frases que explique qué muestra el gráfico, su tendencia principal y qué conclusión puede extraer el usuario.
Devuelve solo el texto, sin listas ni markdown.

Metadatos del gráfico:
- Tipo: {chart_label}
- Título: {title}
- Eje X: {x_column or 'N/A'}
- Eje Y: {y_column or 'N/A'}

Observación visual del modelo de visión:
{raw_vision or 'No disponible.'}

Narrativa en español:"""

    return _ollama_generate(TEXT_MODEL, enhance_prompt)


def llm_status() -> dict:
    """Return a dict with LLM service availability info (used by /api/llm/status)."""
    if not _ollama_ready():
        return {"available": False, "reason": "Ollama no disponible"}

    # Check which models are pulled
    try:
        r = requests.get(f"{OLLAMA_BASE}/api/tags", timeout=5)
        pulled = {m["name"].split(":")[0] for m in r.json().get("models", [])}
    except Exception:
        pulled = set()

    text_ready   = any(TEXT_MODEL.split(":")[0]   in p for p in pulled) or TEXT_MODEL.split(":")[0] in pulled
    vision_ready = any(VISION_MODEL.split(":")[0] in p for p in pulled) or VISION_MODEL.split(":")[0] in pulled

    return {
        "available":     True,
        "text_model":    {"name": TEXT_MODEL,   "ready": text_ready},
        "vision_model":  {"name": VISION_MODEL, "ready": vision_ready},
    }