import pandas as pd
import numpy as np
from visualizers.ivisualizer import IVisualizer


class BoxPlotVisualizer(IVisualizer):
    """Concrete strategy: box plot. X categorical (groups), Y numeric."""

    @property
    def chart_type(self) -> str:
        return "boxplot"

    @property
    def label(self) -> str:
        return "Box Plot"

    def generate(self, df: pd.DataFrame, x_column: str, y_column: str, title: str = "Chart", aggregation: str = "mean") -> dict:
        y_series = pd.to_numeric(df[y_column], errors="coerce")
        if y_series.notna().mean() <= 0.7:
            raise ValueError(
                f"Column '{y_column}' is not numeric. "
                "Box plot requires a numeric column on the Y axis."
            )

        subset = df[[x_column, y_column]].copy()
        subset[y_column] = pd.to_numeric(subset[y_column], errors="coerce")
        subset = subset.dropna()

        groups = subset[x_column].value_counts().head(15).index.tolist()
        data = []

        for group in groups:
            vals = subset.loc[subset[x_column] == group, y_column].values
            if len(vals) == 0:
                continue
            q1  = float(np.percentile(vals, 25))
            med = float(np.percentile(vals, 50))
            q3  = float(np.percentile(vals, 75))
            iqr = q3 - q1
            w_lo = float(max(vals.min(), q1 - 1.5 * iqr))
            w_hi = float(min(vals.max(), q3 + 1.5 * iqr))
            mean = float(np.mean(vals))

            # Outliers: points outside whiskers (capped at 50 per group)
            outliers = [round(float(v), 4) for v in vals if v < w_lo or v > w_hi][:50]

            data.append({
                "group":    str(group),
                "min":      round(w_lo, 4),
                "q1":       round(q1, 4),
                "median":   round(med, 4),
                "mean":     round(mean, 4),
                "q3":       round(q3, 4),
                "max":      round(w_hi, 4),
                "outliers": outliers,
            })

        return {
            "chart_type": self.chart_type,
            "title": title,
            "data": data,
            "x_label": x_column,
            "y_label": y_column,
            "aggregation": "none",
        }