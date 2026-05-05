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
        Aggregation helper for charts that accept categorical X + numeric Y
        (bar chart) or numeric X + numeric Y (line chart raw pairs).

        The frontend is responsible for sending only valid column-type
        combinations per chart. This method does NOT silently coerce
        categorical columns to numeric or vice-versa. If the column types
        do not match what is expected, a clear ValueError is raised.

        Supported combinations:
          X categorical + Y numeric  → group by X, apply aggregation on Y
          X numeric     + Y numeric  → sorted raw pairs (line / scatter use-case)
        """
        agg = aggregation if aggregation in VALID_AGGS else "mean"

        # Classify each column
        x_numeric = pd.to_numeric(df[x_col], errors="coerce").notna().mean() > 0.7
        y_numeric = pd.to_numeric(df[y_col], errors="coerce").notna().mean() > 0.7

        if not y_numeric:
            raise ValueError(
                f"La columna Y '{y_col}' no es numérica. "
                "Este tipo de gráfico requiere una columna numérica en el eje Y."
            )

        subset = df[[x_col, y_col]].copy()
        subset[y_col] = pd.to_numeric(subset[y_col], errors="coerce")

        if not x_numeric:
            # Categorical X + numeric Y → group and aggregate
            grouped = (
                subset.groupby(x_col, observed=True)[y_col]
                .agg(agg)
                .dropna()
                .sort_values(ascending=False)
                .head(max_points)
            )
            return [{"x": str(k), "y": round(float(v), 4)} for k, v in grouped.items()]

        else:
            # Both numeric → raw pairs sorted by X
            subset[x_col] = pd.to_numeric(subset[x_col], errors="coerce")
            subset = subset.dropna().sort_values(x_col).head(max_points)
            return [
                {"x": float(row[x_col]), "y": float(row[y_col])}
                for _, row in subset.iterrows()
            ]
