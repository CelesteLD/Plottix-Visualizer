"""
Strategy Pattern — ML Model Interface
Every concrete ML model must implement `train` and expose metadata.
Mirrors the IVisualizer pattern used in visualizers/.
"""
from abc import ABC, abstractmethod
import pandas as pd


class IMLModel(ABC):
    """Abstract strategy for ML models."""

    @property
    @abstractmethod
    def model_type(self) -> str:
        """Unique key, e.g. 'random_forest_clf'."""
        ...

    @property
    @abstractmethod
    def label(self) -> str:
        """Human-readable name shown in the UI."""
        ...

    @property
    @abstractmethod
    def category(self) -> str:
        """One of: 'classification', 'regression', 'clustering'."""
        ...

    @abstractmethod
    def train(self, df: pd.DataFrame, config: dict) -> dict:
        """
        Train the model and return a result dict.

        For classification / regression config keys:
            target      : str   — target column
            features    : list[str] — feature columns
            test_size   : float — fraction held out (default 0.2)

        For clustering config keys:
            features    : list[str]
            n_clusters  : int  (k-means)

        Returns a dict consumed directly by the frontend.
        """
        ...

    # ── Shared helpers ────────────────────────────────────────────────────────

    def _encode_and_scale(self, df: pd.DataFrame, feature_cols: list[str]):
        """
        Encode categoricals with OrdinalEncoder and scale numerics with
        StandardScaler. Returns the transformed numpy array.
        """
        from sklearn.preprocessing import OrdinalEncoder, StandardScaler
        from sklearn.pipeline import Pipeline
        from sklearn.compose import ColumnTransformer
        import numpy as np

        numeric_cols = [c for c in feature_cols
                        if pd.api.types.is_numeric_dtype(df[c])]
        cat_cols = [c for c in feature_cols
                    if not pd.api.types.is_numeric_dtype(df[c])]

        transformers = []
        if numeric_cols:
            transformers.append(("num", StandardScaler(), numeric_cols))
        if cat_cols:
            transformers.append(("cat", OrdinalEncoder(
                handle_unknown="use_encoded_value", unknown_value=-1), cat_cols))

        ct = ColumnTransformer(transformers, remainder="drop")
        X = ct.fit_transform(df[feature_cols])
        return X, ct
