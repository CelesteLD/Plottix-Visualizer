// ── Plottix design tokens — light theme ────────────────────────────
export const BG           = '#F7F6F2'
export const SURFACE      = '#FFFFFF'
export const SURFACE2     = '#F2F1ED'
export const BORDER       = '#E2E0D8'
export const BORDER2      = '#D0CEC6'
export const ACCENT       = '#5B4FE8'
export const ACCENT_LIGHT = '#EEEAFF'
export const ACCENT_MID   = '#A5B4FC'
export const ACCENT2      = '#059669'
export const ACCENT2_LIGHT= '#E8F8F2'
export const WARN         = '#D97706'
export const ERROR        = '#DC2626'
export const TEXT         = '#1A1A2E'
export const TEXT_MUTED   = '#6B7280'
export const TEXT_DIM     = '#9CA3AF'
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
