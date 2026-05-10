"""
Regression strategies: Linear Regression, Ridge, Random Forest Regressor.
"""
import pandas as pd
import numpy as np
from ml.iml_model import IMLModel


def _regression_result(model_type, label, config, X_train, X_test, y_train, y_test, y_pred, feature_names=None, importances=None):
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    mae = float(mean_absolute_error(y_test, y_pred))
    r2 = float(r2_score(y_test, y_pred))

    # Scatter: predicted vs actual (max 200 points for performance)
    n = min(len(y_test), 200)
    idx = np.random.choice(len(y_test), n, replace=False)
    scatter = [
        {"actual": round(float(y_test[i]), 4), "predicted": round(float(y_pred[i]), 4)}
        for i in sorted(idx)
    ]

    fi = []
    if importances is not None and feature_names is not None:
        fi = [
            {"feature": f, "importance": round(float(imp), 4)}
            for f, imp in zip(feature_names, importances)
        ]
        fi.sort(key=lambda x: x["importance"], reverse=True)

    return {
        "model_type": model_type,
        "label": label,
        "category": "regression",
        "metrics": {
            "rmse": round(rmse, 4),
            "mae": round(mae, 4),
            "r2": round(r2, 4),
            "train_size": len(X_train),
            "test_size": len(X_test),
        },
        "scatter": scatter,
        "feature_importances": fi[:15],
        "config": config,
    }


class LinearRegressionModel(IMLModel):

    @property
    def model_type(self) -> str:
        return "linear_regression"

    @property
    def label(self) -> str:
        return "Regresión Lineal"

    @property
    def category(self) -> str:
        return "regression"

    def train(self, df: pd.DataFrame, config: dict) -> dict:
        from sklearn.linear_model import LinearRegression
        from sklearn.model_selection import train_test_split

        target = config["target"]
        features = config["features"]
        test_size = float(config.get("test_size", 0.2))

        sub = df[features + [target]].dropna()
        if len(sub) < 10:
            raise ValueError("Necesitas al menos 10 filas sin nulos para entrenar.")

        y_series = pd.to_numeric(sub[target], errors="coerce")
        if y_series.isna().mean() > 0.3:
            raise ValueError(f"La columna objetivo '{target}' no es suficientemente numérica para regresión.")

        X, ct = self._encode_and_scale(sub, features)
        y = y_series.values

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )

        model = LinearRegression()
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        # Coefficients as importance proxy
        importances = np.abs(model.coef_)

        return _regression_result(
            self.model_type, self.label,
            {"target": target, "features": features, "test_size": test_size},
            X_train, X_test, y_train, y_test, y_pred,
            features, importances
        )


class RidgeRegressionModel(IMLModel):

    @property
    def model_type(self) -> str:
        return "ridge_regression"

    @property
    def label(self) -> str:
        return "Regresión Ridge"

    @property
    def category(self) -> str:
        return "regression"

    def train(self, df: pd.DataFrame, config: dict) -> dict:
        from sklearn.linear_model import Ridge
        from sklearn.model_selection import train_test_split

        target = config["target"]
        features = config["features"]
        test_size = float(config.get("test_size", 0.2))
        alpha = float(config.get("alpha", 1.0))

        sub = df[features + [target]].dropna()
        if len(sub) < 10:
            raise ValueError("Necesitas al menos 10 filas sin nulos para entrenar.")

        y_series = pd.to_numeric(sub[target], errors="coerce")
        if y_series.isna().mean() > 0.3:
            raise ValueError(f"La columna objetivo '{target}' no es suficientemente numérica para regresión.")

        X, ct = self._encode_and_scale(sub, features)
        y = y_series.values

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )

        model = Ridge(alpha=alpha)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        importances = np.abs(model.coef_)

        return _regression_result(
            self.model_type, self.label,
            {"target": target, "features": features, "test_size": test_size, "alpha": alpha},
            X_train, X_test, y_train, y_test, y_pred,
            features, importances
        )


class RandomForestRegressorModel(IMLModel):

    @property
    def model_type(self) -> str:
        return "random_forest_reg"

    @property
    def label(self) -> str:
        return "Random Forest (Regresión)"

    @property
    def category(self) -> str:
        return "regression"

    def train(self, df: pd.DataFrame, config: dict) -> dict:
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.model_selection import train_test_split

        target = config["target"]
        features = config["features"]
        test_size = float(config.get("test_size", 0.2))
        n_estimators = int(config.get("n_estimators", 100))

        sub = df[features + [target]].dropna()
        if len(sub) < 10:
            raise ValueError("Necesitas al menos 10 filas sin nulos para entrenar.")

        y_series = pd.to_numeric(sub[target], errors="coerce")
        if y_series.isna().mean() > 0.3:
            raise ValueError(f"La columna objetivo '{target}' no es suficientemente numérica para regresión.")

        X, ct = self._encode_and_scale(sub, features)
        y = y_series.values

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )

        model = RandomForestRegressor(
            n_estimators=n_estimators, random_state=42, n_jobs=-1
        )
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        return _regression_result(
            self.model_type, self.label,
            {"target": target, "features": features, "test_size": test_size, "n_estimators": n_estimators},
            X_train, X_test, y_train, y_test, y_pred,
            features, model.feature_importances_
        )
