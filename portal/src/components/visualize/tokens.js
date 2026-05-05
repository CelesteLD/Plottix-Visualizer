// ── Plottix-Service design tokens (ServiceX dark palette) ──────────────────
export const BG          = '#080b10'
export const SURFACE     = '#0e1219'
export const SURFACE2    = '#131820'
export const BORDER      = '#1e2535'
export const BORDER2     = '#2a3347'
export const ACCENT      = '#5b6af7'
export const ACCENT_GLOW = 'rgba(91,106,247,0.25)'
export const ACCENT2     = '#00d4aa'
export const ACCENT2_GLOW= 'rgba(0,212,170,0.2)'
export const WARN        = '#f59e0b'
export const ERROR       = '#f43f5e'
export const TEXT        = '#e2e8f4'
export const TEXT_MUTED  = '#7a869e'
export const TEXT_DIM    = '#3d4a60'

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