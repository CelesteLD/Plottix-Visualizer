import pandas as pd
from visualizers.ivisualizer import IVisualizer


class ScatterPlotVisualizer(IVisualizer):
    """Concrete strategy: scatter plot."""

    @property
    def chart_type(self) -> str:
        return "scatter"

    @property
    def label(self) -> str:
        return "Scatter Plot"

    def generate(self, df: pd.DataFrame, x_column: str, y_column: str, title: str = "Chart") -> dict:
        # Scatter needs both axes numeric; delegate to smart _prepare_data
        data = self._prepare_data(df, x_column, y_column, max_points=500)
        return {
            "chart_type": self.chart_type,
            "title": title,
            "data": data,
            "x_label": x_column,
            "y_label": y_column,
        }