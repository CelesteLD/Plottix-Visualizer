"""
Visualizer Factory — registers all IVisualizer implementations.
To add a new chart: create a class extending IVisualizer and add it here.
"""
from visualizers.ivisualizer import IVisualizer
from visualizers.bar_chart import BarChartVisualizer
from visualizers.line_chart import LineChartVisualizer
from visualizers.scatter_plot import ScatterPlotVisualizer
from visualizers.histogram import HistogramVisualizer


class VisualizerFactory:
    _registry: dict[str, IVisualizer] = {}

    @classmethod
    def _build_registry(cls):
        if cls._registry:
            return
        for viz in [
            BarChartVisualizer(),
            LineChartVisualizer(),
            ScatterPlotVisualizer(),
            HistogramVisualizer(),
        ]:
            cls._registry[viz.chart_type] = viz

    @classmethod
    def get_visualizer(cls, chart_type: str) -> IVisualizer:
        cls._build_registry()
        viz = cls._registry.get(chart_type)
        if not viz:
            raise ValueError(
                f"No visualizer for chart type '{chart_type}'. "
                f"Available: {list(cls._registry.keys())}"
            )
        return viz

    @classmethod
    def available(cls) -> list[dict]:
        cls._build_registry()
        return [
            {"value": v.chart_type, "label": v.label}
            for v in cls._registry.values()
        ]
