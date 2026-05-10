"""
Clustering strategies: K-Means, DBSCAN.
Includes elbow-method endpoint support for K-Means.
"""
import pandas as pd
import numpy as np
from ml.iml_model import IMLModel


class KMeansModel(IMLModel):

    @property
    def model_type(self) -> str:
        return "kmeans"

    @property
    def label(self) -> str:
        return "K-Means Clustering"

    @property
    def category(self) -> str:
        return "clustering"

    def elbow(self, df: pd.DataFrame, config: dict) -> dict:
        """
        Compute inertia for k = 1..max_k. 
        Returns a list of {k, inertia} to render the elbow chart.
        """
        from sklearn.cluster import KMeans

        features = config["features"]
        max_k = int(config.get("max_k", 10))

        sub = df[features].dropna()
        if len(sub) < max_k + 1:
            max_k = max(2, len(sub) - 1)

        X, _ = self._encode_and_scale(sub, features)

        elbow_data = []
        for k in range(1, max_k + 1):
            km = KMeans(n_clusters=k, random_state=42, n_init=10)
            km.fit(X)
            elbow_data.append({"k": k, "inertia": round(float(km.inertia_), 2)})

        return {"elbow": elbow_data, "features": features}

    def train(self, df: pd.DataFrame, config: dict) -> dict:
        from sklearn.cluster import KMeans
        from sklearn.metrics import silhouette_score
        from sklearn.decomposition import PCA

        features = config["features"]
        n_clusters = int(config.get("n_clusters", 3))

        sub = df[features].dropna().reset_index(drop=True)
        if len(sub) < n_clusters + 1:
            raise ValueError(f"Necesitas al menos {n_clusters + 1} filas para {n_clusters} clusters.")

        X, _ = self._encode_and_scale(sub, features)

        model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = model.fit_predict(X)

        sil = float(silhouette_score(X, labels)) if n_clusters > 1 and len(set(labels)) > 1 else 0.0
        inertia = float(model.inertia_)

        # Cluster sizes
        unique, counts = np.unique(labels, return_counts=True)
        cluster_sizes = [
            {"cluster": int(k), "size": int(c)}
            for k, c in zip(unique, counts)
        ]

        # 2D PCA projection for scatter plot
        pca = PCA(n_components=2, random_state=42)
        X_2d = pca.fit_transform(X)
        scatter = [
            {
                "x": round(float(X_2d[i, 0]), 4),
                "y": round(float(X_2d[i, 1]), 4),
                "cluster": int(labels[i]),
            }
            for i in range(min(len(X_2d), 500))  # cap at 500 points
        ]

        return {
            "model_type": self.model_type,
            "label": self.label,
            "category": self.category,
            "metrics": {
                "silhouette_score": round(sil, 4),
                "inertia": round(inertia, 2),
                "n_clusters": n_clusters,
                "n_samples": len(sub),
            },
            "cluster_sizes": cluster_sizes,
            "scatter": scatter,
            "pca_variance": [round(float(v), 4) for v in pca.explained_variance_ratio_],
            "feature_importances": [],
            "config": {
                "features": features,
                "n_clusters": n_clusters,
            },
        }


class DBSCANModel(IMLModel):

    @property
    def model_type(self) -> str:
        return "dbscan"

    @property
    def label(self) -> str:
        return "DBSCAN Clustering"

    @property
    def category(self) -> str:
        return "clustering"

    def train(self, df: pd.DataFrame, config: dict) -> dict:
        from sklearn.cluster import DBSCAN
        from sklearn.metrics import silhouette_score
        from sklearn.decomposition import PCA

        features = config["features"]
        eps = float(config.get("eps", 0.5))
        min_samples = int(config.get("min_samples", 5))

        sub = df[features].dropna().reset_index(drop=True)
        if len(sub) < 10:
            raise ValueError("Necesitas al menos 10 filas sin nulos para DBSCAN.")

        X, _ = self._encode_and_scale(sub, features)

        model = DBSCAN(eps=eps, min_samples=min_samples)
        labels = model.fit_predict(X)

        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        n_noise = int(np.sum(labels == -1))

        sil = 0.0
        if n_clusters > 1:
            # Silhouette only on non-noise points
            mask = labels != -1
            if mask.sum() > n_clusters:
                sil = float(silhouette_score(X[mask], labels[mask]))

        # Cluster sizes (include noise as cluster -1)
        unique, counts = np.unique(labels, return_counts=True)
        cluster_sizes = [
            {"cluster": int(k), "size": int(c), "is_noise": bool(k == -1)}
            for k, c in zip(unique, counts)
        ]

        # 2D PCA projection
        pca = PCA(n_components=2, random_state=42)
        X_2d = pca.fit_transform(X)
        scatter = [
            {
                "x": round(float(X_2d[i, 0]), 4),
                "y": round(float(X_2d[i, 1]), 4),
                "cluster": int(labels[i]),
            }
            for i in range(min(len(X_2d), 500))
        ]

        return {
            "model_type": self.model_type,
            "label": self.label,
            "category": self.category,
            "metrics": {
                "silhouette_score": round(sil, 4),
                "n_clusters": n_clusters,
                "n_noise_points": n_noise,
                "n_samples": len(sub),
            },
            "cluster_sizes": cluster_sizes,
            "scatter": scatter,
            "pca_variance": [round(float(v), 4) for v in pca.explained_variance_ratio_],
            "feature_importances": [],
            "config": {
                "features": features,
                "eps": eps,
                "min_samples": min_samples,
            },
        }
