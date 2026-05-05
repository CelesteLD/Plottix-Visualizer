import numpy as np
import pandas as pd
from visualizers.ivisualizer import IVisualizer


class ViolinChartVisualizer(IVisualizer):
    """Concrete strategy: violin plot.

    Combines a KDE shape with box plot statistics for a single numeric column.
    X axis not used — only y_column is required.
    The frontend renders the KDE outline as a symmetric filled shape.
    """

    @property
    def chart_type(self) -> str:
        return "violin"

    @property
    def label(self) -> str:
        return "Violin Plot"

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

        if len(series) < 4:
            raise ValueError(
                f"Column '{y_column}' has too few numeric values. "
                "Violin plot requires at least 4 data points."
            )

        # KDE for the violin shape — 120 points is enough for smooth rendering
        kde = stats.gaussian_kde(series)
        y_min, y_max = float(series.min()), float(series.max())
        pad = (y_max - y_min) * 0.1 or 1.0
        ys = np.linspace(y_min - pad, y_max + pad, 120)
        densities = kde(ys)

        # Normalise density to [-1, 1] range so the violin is symmetric
        max_d = float(densities.max()) or 1.0
        kde_points = [
            {"value": round(float(y), 4), "density": round(float(d / max_d), 4)}
            for y, d in zip(ys, densities)
        ]

        # Box plot statistics for the inner markers
        q1  = float(np.percentile(series, 25))
        med = float(np.percentile(series, 50))
        q3  = float(np.percentile(series, 75))
        iqr = q3 - q1
        w_lo = float(max(series.min(), q1 - 1.5 * iqr))
        w_hi = float(min(series.max(), q3 + 1.5 * iqr))
        mean = float(np.mean(series))

        return {
            "chart_type": self.chart_type,
            "title": title,
            "kde_points": kde_points,
            "stats": {
                "min":    round(w_lo, 4),
                "q1":     round(q1, 4),
                "median": round(med, 4),
                "mean":   round(mean, 4),
                "q3":     round(q3, 4),
                "max":    round(w_hi, 4),
                "n":      int(len(series)),
            },
            "x_label": y_column,
            "y_label": "Density",
            "aggregation": "none",
        }