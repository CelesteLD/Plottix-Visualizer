import pandas as pd
from visualizers.ivisualizer import IVisualizer


class LineChartVisualizer(IVisualizer):
    """Concrete strategy: line chart."""

    @property
    def chart_type(self) -> str:
        return "line"

    @property
    def label(self) -> str:
        return "Line Chart"

    def generate(self, df: pd.DataFrame, x_column: str, y_column: str, title: str = "Chart", aggregation: str = "mean") -> dict:
        data = self._prepare_data(df, x_column, y_column, aggregation)
        return {
            "chart_type": self.chart_type,
            "title": title,
            "data": data,
            "x_label": x_column,
            "y_label": y_column,
            "aggregation": aggregation,
        }