import numpy as np
import pandas as pd
from visualizers.ivisualizer import IVisualizer


class KDEChartVisualizer(IVisualizer):
    """Concrete strategy: Kernel Density Estimation curve.

    Shows the smoothed probability density of a single numeric column.
    X axis not used — only y_column is required.
    """

    @property
    def chart_type(self) -> str:
        return "kde"

    @property
    def label(self) -> str:
        return "Density Curve"

    def generate(
        self,
        df: pd.DataFrame,
        x_column: str,
        y_column: str,
        title: str = "Chart",
        aggregation: str = "mean",
    ) -> dict:
        import scipy.stats as stats

        series = pd.to_numeric(df[y_column], errors="coerce").dropna()

        if len(series) < 2:
            raise ValueError(
                f"Column '{y_column}' has fewer than 2 numeric values. "
                "Density curve requires a numeric column with enough data."
            )

        # KDE evaluation over 200 evenly-spaced points
        kde = stats.gaussian_kde(series)
        x_min, x_max = float(series.min()), float(series.max())
        pad = (x_max - x_min) * 0.1 or 1.0
        xs = np.linspace(x_min - pad, x_max + pad, 200)
        ys = kde(xs)

        data = [
            {"x": round(float(x), 4), "y": round(float(y), 6)}
            for x, y in zip(xs, ys)
        ]

        return {
            "chart_type": self.chart_type,
            "title": title,
            "data": data,
            "x_label": y_column,
            "y_label": "Density",
            "aggregation": "none",
        }