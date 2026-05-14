// ── Plottix design tokens — green palette ──────────────────────────
export const BG           = '#F4FAF0'
export const SURFACE      = '#FFFFFF'
export const SURFACE2     = '#EEF7E4'
export const BORDER       = '#C8E6A0'
export const BORDER2      = '#A0D683'
export const ACCENT       = '#72BF78'
export const ACCENT_LIGHT = '#EEF7E4'
export const ACCENT_MID   = '#A0D683'
export const ACCENT2      = '#3A8C42'
export const ACCENT2_LIGHT= '#D3EE98'
export const WARN         = '#D97706'
export const ERROR        = '#DC2626'
export const TEXT         = '#1A2E14'
export const TEXT_MUTED   = '#3A5A2A'
export const TEXT_DIM     = '#6B9A55'
export const FONT_MONO    = "'JetBrains Mono', monospace"

export const CHART_AXIS_RULES = {
  bar:         { x: 'categorical', y: 'numeric'  },
  line:        { x: 'numeric',     y: 'numeric'  },
  scatter:     { x: 'numeric',     y: 'numeric'  },
  histogram:   { x: null,          y: 'numeric'  },
  pie:         { x: 'categorical', y: 'numeric'  },
  boxplot:     { x: 'categorical', y: 'numeric'  },
  kde:         { x: null,          y: 'numeric'  },
  violin:      { x: null,          y: 'numeric'  },
  correlogram: { x: null,          y: 'numeric'  },
  geomap:      { x: 'categorical', y: 'numeric'  },
}

export const CHARTS_WITH_AGGREGATION = new Set(['bar', 'line', 'geomap'])
export const CHARTS_WITH_MULTI       = new Set(['bar', 'line'])
