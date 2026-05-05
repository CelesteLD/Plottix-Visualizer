import pandas as pd
from visualizers.ivisualizer import IVisualizer


class LineChartVisualizer(IVisualizer):
    """Line chart: X numeric (time/ordered), Y numeric."""

    @property
    def chart_type(self) -> str:
        return "line"

    @property
    def label(self) -> str:
        return "Line Chart"

    def generate(
        self,
        df: pd.DataFrame,
        x_column: str,
        y_column: str,
        title: str = "Chart",
        aggregation: str = "mean",
    ) -> dict:
        x_numeric = pd.to_numeric(df[x_column], errors="coerce").notna().mean() > 0.7
        y_numeric = pd.to_numeric(df[y_column], errors="coerce").notna().mean() > 0.7

        if not x_numeric:
            raise ValueError(
                f"La columna X '{x_column}' es categórica. "
                "El gráfico de líneas requiere un eje X numérico o temporal. "
                "Considera usar un gráfico de barras."
            )
        if not y_numeric:
            raise ValueError(
                f"La columna Y '{y_column}' no es numérica. "
                "El gráfico de líneas requiere columnas numéricas en ambos ejes."
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
