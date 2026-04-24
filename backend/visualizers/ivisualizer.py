"""
Strategy Pattern — Visualizer Interface
Every concrete visualizer must implement `generate`.
Returns plain data dicts that the frontend renders with Recharts.
"""
from abc import ABC, abstractmethod
import pandas as pd


VALID_AGGS = {"mean", "sum", "count", "min", "max"}


class IVisualizer(ABC):
    """Abstract strategy for generating chart data."""

    @abstractmethod
    def generate(
        self,
        df: pd.DataFrame,
        x_column: str,
        y_column: str,
        title: str = "Chart",
        aggregation: str = "mean",
    ) -> dict:
        """
        Build chart-ready data from the dataframe.

        Returns:
            dict with keys:
              - chart_type: str
              - title: str
              - data: list of {x, y} dicts
              - x_label: str
              - y_label: str
              - aggregation: str
        """
        ...

    @property
    @abstractmethod
    def chart_type(self) -> str:
        """Unique identifier for this chart type, e.g. 'bar'."""
        ...

    @property
    @abstractmethod
    def label(self) -> str:
        """Human-readable name shown in the UI, e.g. 'Bar Chart'."""
        ...

    def _prepare_data(
        self,
        df: pd.DataFrame,
        x_col: str,
        y_col: str,
        aggregation: str = "mean",
        max_points: int = 100,
    ) -> list[dict]:
        """
        Smart helper — handles four column-type combinations.

          X categorical + Y numeric    -> group by X, apply aggregation on Y
          X categorical + Y categorical -> group by X, count rows
          X numeric     + Y numeric    -> raw pairs (for line/scatter)
          X numeric     + Y categorical -> group by Y, apply aggregation on X
        """
        subset = df[[x_col, y_col]].copy()

        # Detect if each column is predominantly numeric (>70% parseable)
        x_numeric = pd.to_numeric(subset[x_col], errors="coerce").notna().mean() > 0.7
        y_numeric = pd.to_numeric(subset[y_col], errors="coerce").notna().mean() > 0.7

        # Sanitise aggregation — default to mean if invalid
        agg = aggregation if aggregation in VALID_AGGS else "mean"

        if not x_numeric and y_numeric:
            # Categorical X, numeric Y -> group by X, aggregate Y
            subset[y_col] = pd.to_numeric(subset[y_col], errors="coerce")
            grouped = (
                subset.groupby(x_col, observed=True)[y_col]
                .agg(agg)
                .dropna()
                .sort_values(ascending=False)
                .head(max_points)
            )
            return [{"x": str(k), "y": round(float(v), 4)} for k, v in grouped.items()]

        elif not x_numeric and not y_numeric:
            # Both categorical -> count X values (aggregation not applicable)
            counts = subset[x_col].value_counts().head(max_points)
            return [{"x": str(k), "y": int(v)} for k, v in counts.items()]

        elif x_numeric and not y_numeric:
            # Numeric X, categorical Y -> group by Y, aggregate X
            subset[x_col] = pd.to_numeric(subset[x_col], errors="coerce")
            grouped = (
                subset.groupby(y_col, observed=True)[x_col]
                .agg(agg)
                .dropna()
                .sort_values(ascending=False)
                .head(max_points)
            )
            return [{"x": str(k), "y": round(float(v), 4)} for k, v in grouped.items()]

        else:
            # Both numeric -> raw pairs (aggregation not applicable)
            subset[x_col] = pd.to_numeric(subset[x_col], errors="coerce")
            subset[y_col] = pd.to_numeric(subset[y_col], errors="coerce")
            subset = subset.dropna().head(max_points)
            return [
                {"x": float(row[x_col]), "y": float(row[y_col])}
                for _, row in subset.iterrows()
            ]