"""
Strategy Pattern — Visualizer Interface
Every concrete visualizer must implement `generate`.
Returns plain data dicts that the frontend renders with Recharts.
"""
from abc import ABC, abstractmethod
import pandas as pd


class IVisualizer(ABC):
    """Abstract strategy for generating chart data."""

    @abstractmethod
    def generate(
        self,
        df: pd.DataFrame,
        x_column: str,
        y_column: str,
        title: str = "Chart",
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
        self, df: pd.DataFrame, x_col: str, y_col: str, max_points: int = 100
    ) -> list[dict]:
        """
        Smart helper — handles four column-type combinations:

          X categorical + Y numeric    -> group by X, mean of Y  (most common)
          X categorical + Y categorical -> group by X, count rows
          X numeric     + Y numeric    -> raw pairs (for line/scatter)
          X numeric     + Y categorical -> group by Y, mean of X
        """
        subset = df[[x_col, y_col]].copy()

        # Detect if each column is predominantly numeric (>70% parseable)
        x_numeric = pd.to_numeric(subset[x_col], errors="coerce").notna().mean() > 0.7
        y_numeric = pd.to_numeric(subset[y_col], errors="coerce").notna().mean() > 0.7

        if not x_numeric and y_numeric:
            # Categorical X, numeric Y -> group by X, compute mean Y
            subset[y_col] = pd.to_numeric(subset[y_col], errors="coerce")
            grouped = (
                subset.groupby(x_col)[y_col]
                .mean()
                .dropna()
                .sort_values(ascending=False)
                .head(max_points)
            )
            return [{"x": str(k), "y": round(float(v), 4)} for k, v in grouped.items()]

        elif not x_numeric and not y_numeric:
            # Both categorical -> count occurrences of X values
            counts = subset[x_col].value_counts().head(max_points)
            return [{"x": str(k), "y": int(v)} for k, v in counts.items()]

        elif x_numeric and not y_numeric:
            # Numeric X, categorical Y -> group by Y, compute mean X
            subset[x_col] = pd.to_numeric(subset[x_col], errors="coerce")
            grouped = (
                subset.groupby(y_col)[x_col]
                .mean()
                .dropna()
                .sort_values(ascending=False)
                .head(max_points)
            )
            return [{"x": str(k), "y": round(float(v), 4)} for k, v in grouped.items()]

        else:
            # Both numeric -> raw pairs
            subset[x_col] = pd.to_numeric(subset[x_col], errors="coerce")
            subset[y_col] = pd.to_numeric(subset[y_col], errors="coerce")
            subset = subset.dropna().head(max_points)
            return [
                {"x": float(row[x_col]), "y": float(row[y_col])}
                for _, row in subset.iterrows()
            ]