import pandas as pd
from visualizers.ivisualizer import IVisualizer


class CorrelogramVisualizer(IVisualizer):
    """Concrete strategy: correlogram (correlation heatmap).

    Computes the Pearson correlation matrix for a set of numeric columns.
    This visualizer is invoked via the /visualize-multi endpoint using
    y_columns as the selected numeric columns. x_column and y_column
    are ignored.
    """

    @property
    def chart_type(self) -> str:
        return "correlogram"

    @property
    def label(self) -> str:
        return "Correlogram"

    def generate(
        self,
        df: pd.DataFrame,
        x_column: str,
        y_column: str,
        title: str = "Chart",
        aggregation: str = "mean",
    ) -> dict:
        # Should be called via generate_multi — this single-column path
        # is only a fallback
        raise ValueError(
            "Correlogram requires multiple columns. "
            "Use the multi-column endpoint with at least 2 numeric columns."
        )

    def generate_multi(
        self,
        df: pd.DataFrame,
        columns: list[str],
        title: str = "Chart",
    ) -> dict:
        if len(columns) < 2:
            raise ValueError("Correlogram requires at least 2 numeric columns.")

        # Keep only columns that are sufficiently numeric
        numeric_cols = []
        for col in columns:
            if col not in df.columns:
                raise ValueError(f"Column '{col}' not found in dataset.")
            ratio = pd.to_numeric(df[col], errors="coerce").notna().mean()
            if ratio <= 0.7:
                raise ValueError(
                    f"Column '{col}' is not numeric enough for a correlogram."
                )
            numeric_cols.append(col)

        subset = df[numeric_cols].copy()
        for col in numeric_cols:
            subset[col] = pd.to_numeric(subset[col], errors="coerce")

        corr = subset.corr(method="pearson").round(3)

        # Flatten matrix into a list of {x, y, value} cells for the heatmap
        cells = []
        for row_col in corr.index:
            for col_col in corr.columns:
                val = corr.loc[row_col, col_col]
                cells.append({
                    "x": col_col,
                    "y": row_col,
                    "value": round(float(val), 3),
                })

        return {
            "chart_type": self.chart_type,
            "title": title,
            "data": cells,
            "columns": numeric_cols,
            "aggregation": "none",
        }