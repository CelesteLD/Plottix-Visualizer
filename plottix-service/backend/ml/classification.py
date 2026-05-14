"""
Classification strategy: Random Forest Classifier.
"""
import pandas as pd
import numpy as np
from ml.iml_model import IMLModel


class RandomForestClassifierModel(IMLModel):

    @property
    def model_type(self) -> str:
        return "random_forest_clf"

    @property
    def label(self) -> str:
        return "Random Forest (Clasificación)"

    @property
    def category(self) -> str:
        return "classification"

    def train(self, df: pd.DataFrame, config: dict) -> dict:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import (
            accuracy_score, f1_score, classification_report,
            confusion_matrix
        )
        from sklearn.preprocessing import LabelEncoder

        target = config["target"]
        features = config["features"]
        test_size = float(config.get("test_size", 0.2))
        n_estimators = int(config.get("n_estimators", 100))

        sub = df[features + [target]].dropna()
        if len(sub) < 10:
            raise ValueError("Necesitas al menos 10 filas sin nulos para entrenar.")

        X, ct = self._encode_and_scale(sub, features)

        le = LabelEncoder()
        y = le.fit_transform(sub[target].astype(str))
        classes = le.classes_.tolist()

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y if len(classes) < 20 else None
        )

        model = RandomForestClassifier(
            n_estimators=n_estimators, random_state=42, n_jobs=-1
        )
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        acc = float(accuracy_score(y_test, y_pred))
        f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
        cm = confusion_matrix(y_test, y_pred).tolist()

        # Feature importances
        importances = [
            {"feature": f, "importance": round(float(imp), 4)}
            for f, imp in zip(features, model.feature_importances_)
        ]
        importances.sort(key=lambda x: x["importance"], reverse=True)

        # Confusion matrix labels
        cm_labels = [str(c) for c in classes]

        return {
            "model_type": self.model_type,
            "label": self.label,
            "category": self.category,
            "metrics": {
                "accuracy": round(acc, 4),
                "f1_weighted": round(f1, 4),
                "train_size": len(X_train),
                "test_size": len(X_test),
                "n_classes": len(classes),
            },
            "confusion_matrix": {"labels": cm_labels, "matrix": cm},
            "feature_importances": importances[:15],  # top 15
            "classes": classes,
            "config": {
                "target": target,
                "features": features,
                "n_estimators": n_estimators,
                "test_size": test_size,
            },
        }


class SVMClassifierModel(IMLModel):

    @property
    def model_type(self) -> str:
        return "svm_clf"

    @property
    def label(self) -> str:
        return "SVM (Clasificación)"

    @property
    def category(self) -> str:
        return "classification"

    def train(self, df: pd.DataFrame, config: dict) -> dict:
        from sklearn.svm import SVC
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
        from sklearn.preprocessing import LabelEncoder

        target = config["target"]
        features = config["features"]
        test_size = float(config.get("test_size", 0.2))

        sub = df[features + [target]].dropna()
        if len(sub) < 10:
            raise ValueError("Necesitas al menos 10 filas sin nulos para entrenar.")

        X, ct = self._encode_and_scale(sub, features)

        le = LabelEncoder()
        y = le.fit_transform(sub[target].astype(str))
        classes = le.classes_.tolist()

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42,
            stratify=y if len(classes) < 20 else None
        )

        model = SVC(kernel="rbf", random_state=42, probability=False)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        acc = float(accuracy_score(y_test, y_pred))
        f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
        cm = confusion_matrix(y_test, y_pred).tolist()

        return {
            "model_type": self.model_type,
            "label": self.label,
            "category": self.category,
            "metrics": {
                "accuracy": round(acc, 4),
                "f1_weighted": round(f1, 4),
                "train_size": len(X_train),
                "test_size": len(X_test),
                "n_classes": len(classes),
            },
            "confusion_matrix": {"labels": [str(c) for c in classes], "matrix": cm},
            "feature_importances": [],  # SVM doesn't provide native importances
            "classes": classes,
            "config": {
                "target": target,
                "features": features,
                "test_size": test_size,
            },
        }


class KNNClassifierModel(IMLModel):

    @property
    def model_type(self) -> str:
        return "knn_clf"

    @property
    def label(self) -> str:
        return "K-Nearest Neighbors (Clasificación)"

    @property
    def category(self) -> str:
        return "classification"

    def train(self, df: pd.DataFrame, config: dict) -> dict:
        from sklearn.neighbors import KNeighborsClassifier
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score, f1_score, confusion_matrix
        from sklearn.preprocessing import LabelEncoder

        target = config["target"]
        features = config["features"]
        test_size = float(config.get("test_size", 0.2))
        n_neighbors = int(config.get("n_neighbors", 5))

        sub = df[features + [target]].dropna()
        if len(sub) < 10:
            raise ValueError("Necesitas al menos 10 filas sin nulos para entrenar.")

        X, ct = self._encode_and_scale(sub, features)

        le = LabelEncoder()
        y = le.fit_transform(sub[target].astype(str))
        classes = le.classes_.tolist()

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42,
            stratify=y if len(classes) < 20 else None
        )

        model = KNeighborsClassifier(n_neighbors=n_neighbors)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)

        acc = float(accuracy_score(y_test, y_pred))
        f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
        cm = confusion_matrix(y_test, y_pred).tolist()

        return {
            "model_type": self.model_type,
            "label": self.label,
            "category": self.category,
            "metrics": {
                "accuracy": round(acc, 4),
                "f1_weighted": round(f1, 4),
                "train_size": len(X_train),
                "test_size": len(X_test),
                "n_classes": len(classes),
            },
            "confusion_matrix": {"labels": [str(c) for c in classes], "matrix": cm},
            "feature_importances": [],
            "classes": classes,
            "config": {
                "target": target,
                "features": features,
                "n_neighbors": n_neighbors,
                "test_size": test_size,
            },
        }
