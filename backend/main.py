from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import io

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
_dataframe_store = {}

class VisualizeRequest(BaseModel):
    session_id: str
    x_column: str
    y_column: str
    chart_type: str
    title: Optional[str] = "Chart"

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a dataset file. Returns session_id + column names."""
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

    import uuid
    session_id = str(uuid.uuid4())
    _dataframe_store[session_id] = df

    return {
        "session_id": session_id,
        "columns": df.columns.tolist(),
        "rows": len(df),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
    }

@app.get("/chart-types")
def get_chart_types():
    """Return available chart types."""
    return {"chart_types": VisualizerFactory.available()}

@app.post("/visualize")
def visualize(req: VisualizeRequest):
    """Generate chart data for given columns and chart type."""
    df = _dataframe_store.get(req.session_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Session not found. Please re-upload the file.")

    if req.x_column not in df.columns or req.y_column not in df.columns:
        raise HTTPException(status_code=400, detail="Column not found in dataset.")

    try:
        visualizer = VisualizerFactory.get_visualizer(req.chart_type)
        result = visualizer.generate(df, req.x_column, req.y_column, req.title)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result
