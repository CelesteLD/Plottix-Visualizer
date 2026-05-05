import pandas as pd
from visualizers.ivisualizer import IVisualizer


class ScatterPlotVisualizer(IVisualizer):
    """Concrete strategy: scatter plot. Requires both axes to be numeric."""

    @property
    def chart_type(self) -> str:
        return "scatter"

    @property
    def label(self) -> str:
        return "Scatter Plot"

    def generate(self, df: pd.DataFrame, x_column: str, y_column: str, title: str = "Chart", aggregation: str = "mean") -> dict:
        x_series = pd.to_numeric(df[x_column], errors="coerce")
        y_series = pd.to_numeric(df[y_column], errors="coerce")

        x_numeric_ratio = x_series.notna().mean()
        y_numeric_ratio = y_series.notna().mean()

        if x_numeric_ratio <= 0.7:
            raise ValueError(
                f"Column '{x_column}' is not numeric. "
                "Scatter plot requires numeric columns on both axes."
            )
        if y_numeric_ratio <= 0.7:
            raise ValueError(
                f"Column '{y_column}' is not numeric. "
                "Scatter plot requires numeric columns on both axes."
            )

        # Build pairs, drop rows where either value is NaN, cap at 500 points
        combined = pd.DataFrame({"x": x_series, "y": y_series}).dropna().head(500)
        data = [
            {"x": float(row["x"]), "y": float(row["y"])}
            for _, row in combined.iterrows()
        ]

        return {
            "chart_type": self.chart_type,
            "title": title,
            "data": data,
            "x_label": x_column,
            "y_label": y_column,
            "aggregation": "none",
        }