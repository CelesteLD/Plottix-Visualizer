import pandas as pd
from visualizers.ivisualizer import IVisualizer


class PieChartVisualizer(IVisualizer):
    """Concrete strategy: pie chart.

    x_column (required): categorical column that defines the slices.
    y_column (optional): numeric column to sum per slice.
                         If omitted or empty, slice size = frequency count of x_column.

    Aggregation is always 'sum' when Y is provided (parts must add up to a whole),
    or 'count' when Y is absent. The aggregation parameter from the request is ignored.
    """

    @property
    def chart_type(self) -> str:
        return "pie"

    @property
    def label(self) -> str:
        return "Pie Chart"

    def generate(
        self,
        df: pd.DataFrame,
        x_column: str,
        y_column: str | None,
        title: str = "Chart",
        aggregation: str = "sum",   # ignored — pie always uses sum or count
    ) -> dict:

        # Y not provided → count occurrences of each X category
        if not y_column:
            counts = df[x_column].value_counts().head(12)
            data = [{"name": str(k), "value": int(v)} for k, v in counts.items()]
            return {
                "chart_type": self.chart_type,
                "title": title,
                "data": data,
                "x_label": x_column,
                "y_label": "count",
                "aggregation": "count",
            }

        # Y provided and numeric → sum per X category
        subset = df[[x_column, y_column]].copy()
        y_numeric = pd.to_numeric(subset[y_column], errors="coerce").notna().mean() > 0.7

        if y_numeric:
            subset[y_column] = pd.to_numeric(subset[y_column], errors="coerce")
            grouped = (
                subset.groupby(x_column, observed=True)[y_column]
                .sum()
                .dropna()
                .sort_values(ascending=False)
                .head(12)
            )
            data = [{"name": str(k), "value": round(float(v), 4)} for k, v in grouped.items()]
            used_agg = "sum"
        else:
            # Y is also categorical → fall back to frequency count of X
            counts = subset[x_column].value_counts().head(12)
            data = [{"name": str(k), "value": int(v)} for k, v in counts.items()]
            y_column = "count"
            used_agg = "count"

        return {
            "chart_type": self.chart_type,
            "title": title,
            "data": data,
            "x_label": x_column,
            "y_label": y_column,
            "aggregation": used_agg,
        }
