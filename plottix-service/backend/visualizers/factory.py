"""
ChartFactory — generates matplotlib/seaborn chart PNGs.
Each chart type is a method that receives a prepared DataFrame
and returns a BytesIO PNG buffer.
"""
import io
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # non-interactive backend — safe for server use
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns
from scipy import stats as scipy_stats

# ── World dataset cache (loaded once at startup) ──────────────────────────────
_WORLD_GDF = None

def _get_world():
    """Load and cache the Natural Earth countries GeoDataFrame."""
    global _WORLD_GDF
    if _WORLD_GDF is not None:
        return _WORLD_GDF
    import geopandas as gpd
    import warnings
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            _WORLD_GDF = gpd.read_file(gpd.datasets.get_path("naturalearth_lowres"))
    except Exception:
        import geodatasets
        _WORLD_GDF = gpd.read_file(geodatasets.get_path("naturalearth.land"))
    _WORLD_GDF["name_lower"] = _WORLD_GDF["name"].str.lower().str.strip()
    return _WORLD_GDF

# ── Design tokens (ServiceX dark palette) ────────────────────────────────────
BG_FIGURE   = "#FFFFFF"
BG_AXES     = "#F7F6F2"
COLOR_GRID  = "#E2E0D8"
COLOR_TEXT  = "#1A1A2E"
COLOR_MUTED = "#6B7280"
COLOR_ACCENT  = "#5b6af7"
COLOR_ACCENT2 = "#00d4aa"
COLOR_WARN    = "#f59e0b"
COLOR_ERROR   = "#f43f5e"

SERIES_PALETTE = [
    "#5B4FE8", "#059669", "#D97706", "#DC2626",
    "#7C3AED", "#0891B2", "#EA580C", "#0284C7",
]

def _apply_theme(fig, ax):
    """Apply ServiceX dark theme to a figure/axes pair."""
    fig.patch.set_facecolor(BG_FIGURE)
    ax.set_facecolor(BG_AXES)
    ax.tick_params(colors=COLOR_MUTED, labelsize=8)
    ax.xaxis.label.set_color(COLOR_MUTED)
    ax.yaxis.label.set_color(COLOR_MUTED)
    ax.title.set_color(COLOR_TEXT)
    for spine in ax.spines.values():
        spine.set_edgecolor(COLOR_GRID)
    ax.grid(color=COLOR_GRID, linewidth=0.5, linestyle="--", alpha=0.6)

def _apply_theme_multi(fig, axes_flat):
    fig.patch.set_facecolor(BG_FIGURE)
    for ax in axes_flat:
        _apply_theme(fig, ax)

def _to_png(fig) -> io.BytesIO:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight",
                facecolor=fig.get_facecolor(), dpi=150)
    plt.close(fig)
    buf.seek(0)
    return buf

VALID_AGGS = {"mean", "sum", "count", "min", "max"}

# ── Factory ───────────────────────────────────────────────────────────────────

class ChartFactory:

    def generate_png(
        self,
        df: pd.DataFrame,
        chart_type: str,
        x_column: str | None,
        y_column: str | None,
        y_columns: list[str],
        aggregation: str,
        title: str,
    ) -> io.BytesIO:
        agg = aggregation if aggregation in VALID_AGGS else "mean"
        method = getattr(self, f"_chart_{chart_type}", None)
        if method is None:
            raise ValueError(f"Tipo de gráfico no soportado: '{chart_type}'")
        return method(df, x_column, y_column, y_columns, agg, title)

    # ── Bar ───────────────────────────────────────────────────────────────────
    def _chart_bar(self, df, x_col, y_col, y_cols, agg, title):
        self._require_numeric_y(df, y_col)
        data = self._agg_cat_num(df, x_col, y_col, agg)

        fig, ax = plt.subplots(figsize=(9, 4.5))
        _apply_theme(fig, ax)
        bars = ax.bar(range(len(data)), data["y"], color=COLOR_ACCENT,
                      edgecolor=BG_FIGURE, linewidth=0.4)
        ax.set_xticks(range(len(data)))
        ax.set_xticklabels(data["x"], rotation=35, ha="right", fontsize=7.5)
        ax.set_xlabel(x_col, fontsize=9)
        ax.set_ylabel(f"{y_col} ({agg})", fontsize=9)
        ax.set_title(title, fontsize=11, fontweight="bold", pad=12)
        # Value labels on bars
        for bar in bars:
            h = bar.get_height()
            ax.annotate(f"{h:.2g}", xy=(bar.get_x() + bar.get_width()/2, h),
                        xytext=(0, 3), textcoords="offset points",
                        ha="center", va="bottom", fontsize=6.5, color=COLOR_MUTED)
        return _to_png(fig)

    # ── Multi-bar ─────────────────────────────────────────────────────────────
    def _chart_multi_bar(self, df, x_col, y_col, y_cols, agg, title):
        merged = self._agg_multi(df, x_col, y_cols, agg)
        x_vals = merged["x"].tolist()
        n_groups = len(x_vals)
        n_series = len(y_cols)
        width    = 0.8 / n_series

        fig, ax = plt.subplots(figsize=(10, 4.5))
        _apply_theme(fig, ax)
        for i, col in enumerate(y_cols):
            offsets = np.arange(n_groups) + i * width - (n_series - 1) * width / 2
            ax.bar(offsets, merged[col].fillna(0), width=width * 0.9,
                   color=SERIES_PALETTE[i % len(SERIES_PALETTE)], label=col,
                   edgecolor=BG_FIGURE, linewidth=0.3)
        ax.set_xticks(range(n_groups))
        ax.set_xticklabels(x_vals, rotation=35, ha="right", fontsize=7.5)
        ax.set_xlabel(x_col, fontsize=9)
        ax.set_ylabel(f"({agg})", fontsize=9)
        ax.set_title(title, fontsize=11, fontweight="bold", pad=12)
        legend = ax.legend(fontsize=8, facecolor=BG_AXES, edgecolor=COLOR_GRID,
                           labelcolor=COLOR_TEXT)
        return _to_png(fig)

    # ── Line ──────────────────────────────────────────────────────────────────
    def _chart_line(self, df, x_col, y_col, y_cols, agg, title):
        self._require_numeric_x(df, x_col)
        self._require_numeric_y(df, y_col)
        subset = df[[x_col, y_col]].copy()
        subset[x_col] = pd.to_numeric(subset[x_col], errors="coerce")
        subset[y_col] = pd.to_numeric(subset[y_col], errors="coerce")
        subset = subset.dropna().sort_values(x_col).head(500)

        fig, ax = plt.subplots(figsize=(9, 4.5))
        _apply_theme(fig, ax)
        ax.plot(subset[x_col], subset[y_col], color=COLOR_ACCENT2,
                linewidth=1.8, alpha=0.9)
        ax.fill_between(subset[x_col], subset[y_col],
                        alpha=0.08, color=COLOR_ACCENT2)
        ax.set_xlabel(x_col, fontsize=9)
        ax.set_ylabel(y_col, fontsize=9)
        ax.set_title(title, fontsize=11, fontweight="bold", pad=12)
        return _to_png(fig)

    # ── Multi-line ────────────────────────────────────────────────────────────
    def _chart_multi_line(self, df, x_col, y_col, y_cols, agg, title):
        merged = self._agg_multi(df, x_col, y_cols, agg)
        fig, ax = plt.subplots(figsize=(9, 4.5))
        _apply_theme(fig, ax)
        for i, col in enumerate(y_cols):
            ax.plot(merged["x"], merged[col].fillna(np.nan),
                    color=SERIES_PALETTE[i % len(SERIES_PALETTE)],
                    linewidth=1.8, label=col, marker="o", markersize=3)
        ax.set_xlabel(x_col, fontsize=9)
        ax.set_title(title, fontsize=11, fontweight="bold", pad=12)
        ax.legend(fontsize=8, facecolor=BG_AXES, edgecolor=COLOR_GRID,
                  labelcolor=COLOR_TEXT)
        return _to_png(fig)

    # ── Scatter ───────────────────────────────────────────────────────────────
    def _chart_scatter(self, df, x_col, y_col, y_cols, agg, title):
        self._require_numeric_x(df, x_col)
        self._require_numeric_y(df, y_col)
        subset = df[[x_col, y_col]].copy()
        subset[x_col] = pd.to_numeric(subset[x_col], errors="coerce")
        subset[y_col] = pd.to_numeric(subset[y_col], errors="coerce")
        subset = subset.dropna().head(500)

        fig, ax = plt.subplots(figsize=(7, 5))
        _apply_theme(fig, ax)
        ax.scatter(subset[x_col], subset[y_col],
                   color=COLOR_ACCENT, alpha=0.55, s=18, edgecolors="none")
        # Regression line
        if len(subset) > 2:
            m, b, r, p, _ = scipy_stats.linregress(subset[x_col], subset[y_col])
            xs = np.linspace(subset[x_col].min(), subset[x_col].max(), 100)
            ax.plot(xs, m * xs + b, color=COLOR_ACCENT2, linewidth=1.4,
                    alpha=0.8, linestyle="--", label=f"r={r:.2f}")
            ax.legend(fontsize=8, facecolor=BG_AXES, edgecolor=COLOR_GRID,
                      labelcolor=COLOR_TEXT)
        ax.set_xlabel(x_col, fontsize=9)
        ax.set_ylabel(y_col, fontsize=9)
        ax.set_title(title, fontsize=11, fontweight="bold", pad=12)
        return _to_png(fig)

    # ── Histogram ─────────────────────────────────────────────────────────────
    def _chart_histogram(self, df, x_col, y_col, y_cols, agg, title):
        self._require_numeric_y(df, y_col)
        series = pd.to_numeric(df[y_col], errors="coerce").dropna()

        fig, ax = plt.subplots(figsize=(7, 4.5))
        _apply_theme(fig, ax)
        ax.hist(series, bins=20, color=COLOR_ACCENT,
                edgecolor=BG_FIGURE, linewidth=0.4, alpha=0.85)
        ax.set_xlabel(y_col, fontsize=9)
        ax.set_ylabel("Frecuencia", fontsize=9)
        ax.set_title(title, fontsize=11, fontweight="bold", pad=12)
        # Mean & median lines
        ax.axvline(series.mean(),   color=COLOR_ACCENT2, linestyle="--",
                   linewidth=1.4, label=f"Media: {series.mean():.2f}")
        ax.axvline(series.median(), color=COLOR_WARN,    linestyle=":",
                   linewidth=1.4, label=f"Mediana: {series.median():.2f}")
        ax.legend(fontsize=8, facecolor=BG_AXES, edgecolor=COLOR_GRID,
                  labelcolor=COLOR_TEXT)
        return _to_png(fig)

    # ── Pie ───────────────────────────────────────────────────────────────────
    def _chart_pie(self, df, x_col, y_col, y_cols, agg, title):
        if y_col and pd.to_numeric(df[y_col], errors="coerce").notna().mean() > 0.7:
            subset = df[[x_col, y_col]].copy()
            subset[y_col] = pd.to_numeric(subset[y_col], errors="coerce")
            grouped = subset.groupby(x_col, observed=True)[y_col].sum().dropna()
            grouped = grouped.nlargest(10)
        else:
            grouped = df[x_col].value_counts().head(10)

        fig, ax = plt.subplots(figsize=(7, 6))
        fig.patch.set_facecolor(BG_FIGURE)
        ax.set_facecolor(BG_FIGURE)
        wedges, texts, autotexts = ax.pie(
            grouped.values,
            labels=grouped.index,
            autopct="%1.1f%%",
            colors=SERIES_PALETTE[:len(grouped)],
            startangle=90,
            pctdistance=0.82,
            wedgeprops={"edgecolor": BG_FIGURE, "linewidth": 1.5},
        )
        for t in texts:
            t.set_color(COLOR_MUTED)
            t.set_fontsize(8)
        for at in autotexts:
            at.set_color(COLOR_TEXT)
            at.set_fontsize(7.5)
            at.set_fontweight("bold")
        ax.set_title(title, fontsize=11, fontweight="bold", color=COLOR_TEXT, pad=12)
        return _to_png(fig)

    # ── Boxplot ───────────────────────────────────────────────────────────────
    def _chart_boxplot(self, df, x_col, y_col, y_cols, agg, title):
        self._require_numeric_y(df, y_col)
        subset = df[[x_col, y_col]].copy()
        subset[y_col] = pd.to_numeric(subset[y_col], errors="coerce")
        subset = subset.dropna()
        groups = subset[x_col].value_counts().head(12).index
        data_list = [subset.loc[subset[x_col] == g, y_col].values for g in groups]

        fig, ax = plt.subplots(figsize=(9, 4.5))
        _apply_theme(fig, ax)
        bp = ax.boxplot(
            data_list,
            patch_artist=True,
            medianprops={"color": COLOR_ACCENT2, "linewidth": 2},
            boxprops={"facecolor": COLOR_ACCENT, "edgecolor": COLOR_ACCENT, "alpha": 0.15},
            whiskerprops={"color": COLOR_MUTED},
            capprops={"color": COLOR_MUTED},
            flierprops={"marker": "o", "markerfacecolor": COLOR_ERROR,
                        "markersize": 3, "alpha": 0.6, "markeredgewidth": 0},
        )
        # Set box alpha separately — matplotlib does not support 8-digit hex colors
        for patch in bp["boxes"]:
            patch.set_alpha(0.18)
        ax.set_xticks(range(1, len(groups) + 1))
        ax.set_xticklabels(groups, rotation=35, ha="right", fontsize=7.5)
        ax.set_xlabel(x_col, fontsize=9)
        ax.set_ylabel(y_col, fontsize=9)
        ax.set_title(title, fontsize=11, fontweight="bold", pad=12)
        return _to_png(fig)

    # ── KDE ───────────────────────────────────────────────────────────────────
    def _chart_kde(self, df, x_col, y_col, y_cols, agg, title):
        self._require_numeric_y(df, y_col)
        series = pd.to_numeric(df[y_col], errors="coerce").dropna()

        fig, ax = plt.subplots(figsize=(7, 4.5))
        _apply_theme(fig, ax)
        kde = scipy_stats.gaussian_kde(series)
        pad = (series.max() - series.min()) * 0.1 or 1
        xs  = np.linspace(series.min() - pad, series.max() + pad, 300)
        ys  = kde(xs)
        ax.plot(xs, ys, color=COLOR_ACCENT, linewidth=2)
        ax.fill_between(xs, ys, alpha=0.12, color=COLOR_ACCENT)
        ax.axvline(series.mean(), color=COLOR_ACCENT2, linestyle="--",
                   linewidth=1.4, label=f"Media: {series.mean():.2f}")
        ax.set_xlabel(y_col, fontsize=9)
        ax.set_ylabel("Densidad", fontsize=9)
        ax.set_title(title, fontsize=11, fontweight="bold", pad=12)
        ax.legend(fontsize=8, facecolor=BG_AXES, edgecolor=COLOR_GRID,
                  labelcolor=COLOR_TEXT)
        return _to_png(fig)

    # ── Violin ────────────────────────────────────────────────────────────────
    def _chart_violin(self, df, x_col, y_col, y_cols, agg, title):
        self._require_numeric_y(df, y_col)
        series = pd.to_numeric(df[y_col], errors="coerce").dropna()
        if len(series) < 4:
            raise ValueError("El violin plot requiere al menos 4 valores numéricos.")

        fig, ax = plt.subplots(figsize=(5, 5.5))
        _apply_theme(fig, ax)
        parts = ax.violinplot([series], positions=[0], showmedians=True,
                              showextrema=True)
        for pc in parts["bodies"]:
            pc.set_facecolor(f"{COLOR_ACCENT}40")
            pc.set_edgecolor(COLOR_ACCENT)
            pc.set_linewidth(1.5)
        parts["cmedians"].set_color(COLOR_ACCENT2)
        parts["cmedians"].set_linewidth(2)
        for key in ("cmaxes", "cmins", "cbars"):
            parts[key].set_color(COLOR_MUTED)
            parts[key].set_linewidth(1)
        ax.scatter([0], [series.mean()], color=COLOR_WARN, zorder=5,
                   s=40, label=f"Media: {series.mean():.2f}")
        ax.set_xticks([0])
        ax.set_xticklabels([y_col], fontsize=9)
        ax.set_ylabel("Valor", fontsize=9)
        ax.set_title(title, fontsize=11, fontweight="bold", pad=12)
        ax.legend(fontsize=8, facecolor=BG_AXES, edgecolor=COLOR_GRID,
                  labelcolor=COLOR_TEXT)
        # Stats annotation
        q1, med, q3 = series.quantile([0.25, 0.5, 0.75])
        ax.text(0.98, 0.97,
                f"n={len(series)}\nQ1={q1:.2f}\nMed={med:.2f}\nQ3={q3:.2f}",
                transform=ax.transAxes, va="top", ha="right",
                fontsize=7.5, color=COLOR_MUTED,
                bbox={"boxstyle": "round,pad=0.4", "facecolor": BG_AXES,
                      "edgecolor": COLOR_GRID, "alpha": 0.8})
        return _to_png(fig)

    # ── Correlogram ───────────────────────────────────────────────────────────
    def _chart_correlogram(self, df, x_col, y_col, y_cols, agg, title):
        if len(y_cols) < 2:
            raise ValueError("El correlograma requiere al menos 2 columnas numéricas.")
        subset = df[y_cols].copy()
        for col in y_cols:
            subset[col] = pd.to_numeric(subset[col], errors="coerce")
        corr = subset.corr(method="pearson")

        n    = len(y_cols)
        size = max(5, min(n * 1.1, 11))
        fig, ax = plt.subplots(figsize=(size, size * 0.85))
        _apply_theme(fig, ax)

        import matplotlib.colors as mcolors
        # Custom RdBu diverging cmap
        cmap = plt.cm.RdBu_r

        im = ax.imshow(corr.values, cmap=cmap, vmin=-1, vmax=1, aspect="auto")
        ax.set_xticks(range(n))
        ax.set_yticks(range(n))
        ax.set_xticklabels(y_cols, rotation=40, ha="right", fontsize=8.5)
        ax.set_yticklabels(y_cols, fontsize=8.5)

        # Annotate cells
        for i in range(n):
            for j in range(n):
                val  = corr.values[i, j]
                col  = "#ffffff" if abs(val) > 0.5 else COLOR_TEXT
                diag = (i == j)
                ax.text(j, i, "—" if diag else f"{val:.2f}",
                        ha="center", va="center",
                        fontsize=8.5, color=col,
                        fontweight="bold" if not diag else "normal")

        cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
        cbar.ax.tick_params(colors=COLOR_MUTED, labelsize=8)
        cbar.outline.set_edgecolor(COLOR_GRID)

        ax.set_title(title, fontsize=11, fontweight="bold", pad=14)
        return _to_png(fig)

    # ── Geomap (interactive Folium choropleth) ──────────────────────────────
    def _chart_geomap(self, df, x_col, y_col, y_cols, agg, title):
        """
        Returns a Folium choropleth as an HTML string instead of a PNG.
        The caller must save this as .html and serve it separately.
        Signal: returns a dict {'html': str, 'is_interactive': True, ...}
        instead of a BytesIO buffer.
        """
        import folium

        self._require_numeric_y(df, y_col)

        # ── Aggregate by country ──────────────────────────────────────────────
        subset = df[[x_col, y_col]].copy()
        subset[y_col] = pd.to_numeric(subset[y_col], errors="coerce")
        grouped = (
            subset.groupby(x_col, observed=True)[y_col]
            .agg(agg).dropna().reset_index()
        )
        grouped.columns = ["country", "value"]

        # ── Load world geometries (cached after first call) ───────────────────
        world = _get_world().copy()

        # ── Merge by normalised country name ──────────────────────────────────
        grouped["name_lower"] = grouped["country"].str.lower().str.strip()
        merged = world.merge(grouped[["name_lower", "value"]], on="name_lower", how="left")
        merged["value_str"] = merged["value"].apply(
            lambda v: f"{v:.4g}" if pd.notna(v) else "Sin datos"
        )
        n_matched = int(merged["value"].notna().sum())

        # ── Build Folium map ──────────────────────────────────────────────────
        vmin = float(grouped["value"].min())
        vmax = float(grouped["value"].max())

        m = folium.Map(
            location=[20, 0], zoom_start=2,
            tiles="CartoDB dark_matter",
            prefer_canvas=True,
        )

        # Choropleth layer
        geojson_data = merged.__geo_interface__

        folium.Choropleth(
            geo_data=geojson_data,
            data=grouped,
            columns=["country", "value"],
            key_on="feature.properties.name",
            fill_color="YlOrRd",
            fill_opacity=0.78,
            line_opacity=0.25,
            nan_fill_color="#1a2233",
            nan_fill_opacity=0.4,
            legend_name=f"{y_col} ({agg})",
            highlight=True,
        ).add_to(m)

        # Tooltip layer — hover to see country + value
        tooltip_style = (
            "font-family: 'Space Mono', monospace; font-size: 12px; "
            "background: #0e1219; color: #e2e8f4; "
            "border: 1px solid #2a3347; border-radius: 6px; padding: 6px 10px;"
        )
        folium.GeoJson(
            geojson_data,
            style_function=lambda f: {
                "fillOpacity": 0,
                "color":       "transparent",
                "weight":      0,
            },
            tooltip=folium.GeoJsonTooltip(
                fields=["name", "value_str"],
                aliases=["País", y_col],
                style=tooltip_style,
                sticky=True,
            ),
        ).add_to(m)

        # Title + stats overlay
        title_html = f"""
        <div style="
            position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
            z-index: 1000; pointer-events: none;
            background: rgba(8,11,16,0.88); border: 1px solid #2a3347;
            border-radius: 8px; padding: 7px 18px;
            font-family: \'Space Mono\', monospace; font-size: 13px;
            color: #e2e8f4; white-space: nowrap;
        ">
            {title}
            <span style="margin-left:14px; font-size:11px; color:#7a869e;">
                {n_matched} / {len(world)} países con datos
            </span>
        </div>
        """
        m.get_root().html.add_child(folium.Element(title_html))

        html_str = m._repr_html_()
        return {"html": html_str, "is_interactive": True, "n_matched": n_matched}


    # ── Helpers ───────────────────────────────────────────────────────────────

    def _require_numeric_y(self, df, col):
        if not col or pd.to_numeric(df[col], errors="coerce").notna().mean() <= 0.7:
            raise ValueError(f"La columna '{col}' no es numérica.")

    def _require_numeric_x(self, df, col):
        if not col or pd.to_numeric(df[col], errors="coerce").notna().mean() <= 0.7:
            raise ValueError(f"La columna X '{col}' no es numérica. Usa un gráfico de barras para ejes categóricos.")

    def _agg_cat_num(self, df, x_col, y_col, agg, max_pts=40) -> pd.DataFrame:
        subset = df[[x_col, y_col]].copy()
        subset[y_col] = pd.to_numeric(subset[y_col], errors="coerce")
        grouped = (
            subset.groupby(x_col, observed=True)[y_col]
            .agg(agg).dropna()
            .sort_values(ascending=False).head(max_pts)
        )
        return pd.DataFrame({"x": grouped.index.astype(str), "y": grouped.values})

    def _agg_multi(self, df, x_col, y_cols, agg, max_pts=40) -> pd.DataFrame:
        subset = df[[x_col] + y_cols].copy()
        for col in y_cols:
            subset[col] = pd.to_numeric(subset[col], errors="coerce")
        grouped = (
            subset.groupby(x_col, observed=True)[y_cols]
            .agg(agg).dropna(how="all").head(max_pts)
        )
        grouped.index = grouped.index.astype(str)
        grouped.insert(0, "x", grouped.index)
        return grouped.reset_index(drop=True)