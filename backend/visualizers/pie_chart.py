import pandas as pd
from visualizers.ivisualizer import IVisualizer


class PieChartVisualizer(IVisualizer):
    """Concrete strategy: pie chart. X categorical, Y numeric (or count)."""

    @property
    def chart_type(self) -> str:
        return "pie"

    @property
    def label(self) -> str:
        return "Pie Chart"

    def generate(self, df: pd.DataFrame, x_column: str, y_column: str, title: str = "Chart", aggregation: str = "mean") -> dict:
        from visualizers.ivisualizer import VALID_AGGS
        agg = aggregation if aggregation in VALID_AGGS else "mean"

        subset = df[[x_column, y_column]].copy()
        y_numeric = pd.to_numeric(subset[y_column], errors="coerce").notna().mean() > 0.7

        if y_numeric:
            subset[y_column] = pd.to_numeric(subset[y_column], errors="coerce")
            grouped = (
                subset.groupby(x_column, observed=True)[y_column]
                .agg(agg)
                .dropna()
                .sort_values(ascending=False)
                .head(12)  # pie charts with >12 slices are unreadable
            )
            data = [{"name": str(k), "value": round(float(v), 4)} for k, v in grouped.items()]
        else:
            # Both categorical — count occurrences of X
            counts = subset[x_column].value_counts().head(12)
            data = [{"name": str(k), "value": int(v)} for k, v in counts.items()]

        return {
            "chart_type": self.chart_type,
            "title": title,
            "data": data,
            "x_label": x_column,
            "y_label": y_column,
            "aggregation": agg,
        }