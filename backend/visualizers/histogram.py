import pandas as pd
import numpy as np
from visualizers.ivisualizer import IVisualizer


class HistogramVisualizer(IVisualizer):
    """Concrete strategy: histogram (distribution of a single numeric column)."""

    @property
    def chart_type(self) -> str:
        return "histogram"

    @property
    def label(self) -> str:
        return "Histogram"

    def generate(self, df: pd.DataFrame, x_column: str, y_column: str, title: str = "Chart", aggregation: str = "mean") -> dict:
        # Histogram uses y_column as the numeric column to bucket; aggregation not applicable
        series = pd.to_numeric(df[y_column], errors="coerce").dropna()

        if len(series) == 0:
            raise ValueError(
                f"Column '{y_column}' has no numeric values. "
                "Histogram requires a numeric column in the Y axis."
            )

        counts, bin_edges = np.histogram(series, bins=20)
        data = [
            # Use ASCII hyphen to avoid encoding issues with em-dash
            {"x": f"{bin_edges[i]:.2f} - {bin_edges[i+1]:.2f}", "y": int(counts[i])}
            for i in range(len(counts))
        ]
        return {
            "chart_type": self.chart_type,
            "title": title,
            "data": data,
            "x_label": f"{y_column} (bins)",
            "y_label": "Frequency",
            "aggregation": "none",
        }