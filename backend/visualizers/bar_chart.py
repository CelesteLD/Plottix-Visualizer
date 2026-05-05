import pandas as pd
from visualizers.ivisualizer import IVisualizer


class BarChartVisualizer(IVisualizer):
    """Bar chart: X categorical, Y numeric."""

    @property
    def chart_type(self) -> str:
        return "bar"

    @property
    def label(self) -> str:
        return "Bar Chart"

    def generate(
        self,
        df: pd.DataFrame,
        x_column: str,
        y_column: str,
        title: str = "Chart",
        aggregation: str = "mean",
    ) -> dict:
        # Validate Y is numeric
        y_numeric = pd.to_numeric(df[y_column], errors="coerce").notna().mean() > 0.7
        if not y_numeric:
            raise ValueError(
                f"La columna Y '{y_column}' no es numérica. "
                "El gráfico de barras requiere una columna numérica en el eje Y."
            )

        data = self._prepare_data(df, x_column, y_column, aggregation)
        return {
            "chart_type":  self.chart_type,
            "title":       title,
            "data":        data,
            "x_label":     x_column,
            "y_label":     y_column,
            "aggregation": aggregation,
        }
