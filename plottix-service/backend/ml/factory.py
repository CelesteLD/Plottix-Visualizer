"""
ML Model Factory — registers all IMLModel implementations.
To add a new model: create a class extending IMLModel and add it here.
Mirrors the VisualizerFactory pattern.
"""
from ml.iml_model import IMLModel
from ml.classification import RandomForestClassifierModel, SVMClassifierModel, KNNClassifierModel
from ml.regression import LinearRegressionModel, RidgeRegressionModel, RandomForestRegressorModel
from ml.clustering import KMeansModel, DBSCANModel


class MLModelFactory:
    _registry: dict[str, IMLModel] = {}

    @classmethod
    def _build_registry(cls):
        if cls._registry:
            return
        for model in [
            RandomForestClassifierModel(),
            SVMClassifierModel(),
            KNNClassifierModel(),
            LinearRegressionModel(),
            RidgeRegressionModel(),
            RandomForestRegressorModel(),
            KMeansModel(),
            DBSCANModel(),
        ]:
            cls._registry[model.model_type] = model

    @classmethod
    def get_model(cls, model_type: str) -> IMLModel:
        cls._build_registry()
        model = cls._registry.get(model_type)
        if not model:
            raise ValueError(
                f"No model for type '{model_type}'. "
                f"Available: {list(cls._registry.keys())}"
            )
        return model

    @classmethod
    def available(cls) -> list[dict]:
        cls._build_registry()
        return [
            {
                "value": m.model_type,
                "label": m.label,
                "category": m.category,
            }
            for m in cls._registry.values()
        ]
