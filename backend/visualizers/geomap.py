"""
Choropleth world map visualizer using GeoPandas.

World country geometries are fetched from Natural Earth on first use
and cached locally at /app/data/ne_countries.geojson to avoid
re-downloading on every request.
"""
import os
import json
import hashlib
import pandas as pd
from visualizers.ivisualizer import IVisualizer

# ── Local cache path ──────────────────────────────────────────────────────────
_CACHE_DIR  = os.path.join(os.path.dirname(__file__), "..", "data")
_CACHE_FILE = os.path.join(_CACHE_DIR, "ne_countries.geojson")

# ── Natural Earth source URLs (tried in order) ────────────────────────────────
_NE_URLS = [
    # GitHub API (raw content served via api.github.com — reliable in Docker)
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
    # Mirror via GitHub API
    "https://github.com/nvkelso/natural-earth-vector/raw/master/geojson/ne_110m_admin_0_countries.geojson",
]

# ── Country name normalization ────────────────────────────────────────────────
NAME_FIXES = {
    "United States":                "United States of America",
    "USA":                          "United States of America",
    "US":                           "United States of America",
    "UK":                           "United Kingdom",
    "Czech Republic":               "Czechia",
    "Ivory Coast":                  "Côte d'Ivoire",
    "Cote d'Ivoire":                "Côte d'Ivoire",
    "Democratic Republic of Congo": "Dem. Rep. Congo",
    "Congo (Kinshasa)":             "Dem. Rep. Congo",
    "Congo (Brazzaville)":          "Congo",
    "Tanzania":                     "United Republic of Tanzania",
    "Taiwan Province of China":     "Taiwan",
    "Hong Kong S.A.R. of China":    "Hong Kong",
    "Palestinian Territories":      "West Bank",
    "Eswatini":                     "eSwatini",
    "Somaliland region":            "Somalia",
    "North Cyprus":                 "Cyprus",
    "Kosovo":                       "Kosovo",
}


def _load_world_gdf():
    """Return a GeoDataFrame of world countries, using local cache when available."""
    import geopandas as gpd

    # Use cache if available
    if os.path.exists(_CACHE_FILE):
        return gpd.read_file(_CACHE_FILE)

    # Fetch from network
    import urllib.request
    os.makedirs(_CACHE_DIR, exist_ok=True)

    last_error = None
    for url in _NE_URLS:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Plottix/1.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                raw = resp.read()
            # Save to cache
            with open(_CACHE_FILE, "wb") as f:
                f.write(raw)
            return gpd.read_file(_CACHE_FILE)
        except Exception as e:
            last_error = e
            continue

    raise RuntimeError(
        f"Could not download world country geometries. "
        f"Last error: {last_error}. "
        f"Place ne_110m_admin_0_countries.geojson in /app/data/ manually."
    )


class GeomapVisualizer(IVisualizer):
    """Concrete strategy: choropleth world map.

    x_column : column with country names (string)
    y_column : numeric column to represent as color intensity
    """

    @property
    def chart_type(self) -> str:
        return "geomap"

    @property
    def label(self) -> str:
        return "World Map"

    def generate(
        self,
        df: pd.DataFrame,
        x_column: str,
        y_column: str,
        title: str = "Chart",
        aggregation: str = "mean",
    ) -> dict:
        import geopandas as gpd
        from visualizers.ivisualizer import VALID_AGGS

        # Validate y_column is numeric
        y_series = pd.to_numeric(df[y_column], errors="coerce")
        if y_series.notna().mean() <= 0.5:
            raise ValueError(
                f"Column '{y_column}' does not have enough numeric values. "
                "Choose a numeric column for the map color."
            )

        agg = aggregation if aggregation in VALID_AGGS else "mean"

        # Aggregate by country
        subset = df[[x_column, y_column]].copy()
        subset[y_column] = pd.to_numeric(subset[y_column], errors="coerce")
        grouped = (
            subset.groupby(x_column, observed=True)[y_column]
            .agg(agg)
            .dropna()
            .reset_index()
        )
        grouped.columns = ["country", "value"]
        grouped["country_norm"] = grouped["country"].map(
            lambda c: NAME_FIXES.get(str(c), str(c))
        )

        # Load world geometries
        world = _load_world_gdf()

        # Natural Earth uses "NAME" or "ADMIN" for country names
        name_col = "NAME" if "NAME" in world.columns else "ADMIN"

        # Merge data onto geometries
        merged = world.merge(
            grouped[["country_norm", "value", "country"]],
            left_on=name_col,
            right_on="country_norm",
            how="left",
        )

        # Simplify geometries for faster transfer (tolerance in degrees)
        merged["geometry"] = merged["geometry"].simplify(0.2, preserve_topology=True)

        # Color scale bounds
        vals = merged["value"].dropna()
        v_min = float(vals.min()) if len(vals) else 0.0
        v_max = float(vals.max()) if len(vals) else 1.0

        # Build compact GeoJSON
        features = []
        for _, row in merged.iterrows():
            if row.geometry is None or row.geometry.is_empty:
                continue
            try:
                geom = row.geometry.__geo_interface__
            except Exception:
                continue
            val = row.get("value")
            features.append({
                "type": "Feature",
                "geometry": geom,
                "properties": {
                    "name":    str(row.get(name_col, "")),
                    "value":   round(float(val), 4) if pd.notna(val) else None,
                },
            })

        return {
            "chart_type":     self.chart_type,
            "title":          title,
            "geojson":        {"type": "FeatureCollection", "features": features},
            "value_column":   y_column,
            "country_column": x_column,
            "min":            round(v_min, 4),
            "max":            round(v_max, 4),
            "aggregation":    agg,
            "matched":        int(merged["value"].notna().sum()),
            "total_countries": len(grouped),
        }