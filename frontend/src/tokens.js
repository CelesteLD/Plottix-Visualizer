// ─────────────────────────────────────────────────────────────────
// Plottix Design Tokens — single source of truth for all colours,
// typography constants and chart-specific palettes.
// Import from here; never hardcode colours in components.
// ─────────────────────────────────────────────────────────────────

// ── Brand / semantic ──────────────────────────────────────────────
export const COLOR_ACCENT        = '#0ea87e'   // primary green
export const COLOR_ACCENT_2      = '#5b50d6'   // secondary purple
export const COLOR_ACCENT_DIM    = 'rgba(14,168,126,0.10)'
export const COLOR_ACCENT_BORDER = 'rgba(14,168,126,0.35)'

// ── Surface (light theme) ─────────────────────────────────────────
export const COLOR_BG            = '#f5f5f0'   // warm off-white page
export const COLOR_BG_CARD       = '#ffffff'   // card / panel surface
export const COLOR_BG_ELEVATED   = '#f0efea'   // input, tag, badge bg
export const COLOR_BORDER        = '#ddddd5'   // default border

// ── Text ──────────────────────────────────────────────────────────
export const COLOR_TEXT_PRIMARY   = '#1a1a18'  // headings / labels
export const COLOR_TEXT_SECONDARY = '#5c5c55'  // secondary labels
export const COLOR_TEXT_MUTED     = '#9a9a90'  // placeholders / hints

// ── Semantic colours ──────────────────────────────────────────────
export const COLOR_WARNING        = '#d97706'  // amber warning
export const COLOR_WARNING_BG     = 'rgba(217,119,6,0.08)'
export const COLOR_WARNING_BORDER = 'rgba(217,119,6,0.25)'
export const COLOR_ERROR          = '#dc3545'
export const COLOR_ERROR_BG       = 'rgba(220,53,69,0.07)'
export const COLOR_ERROR_BORDER   = 'rgba(220,53,69,0.22)'
export const COLOR_SUCCESS        = '#1a9e6e'

// ── Chart primitives ──────────────────────────────────────────────
export const CHART_GRID           = '#e0dfd8'  // grid lines
export const CHART_AXIS_TEXT      = '#8a8a80'  // axis tick labels
export const CHART_TOOLTIP_BG     = '#ffffff'
export const CHART_TOOLTIP_BORDER = '#ddddd5'
export const CHART_TOOLTIP_TEXT   = '#1a1a18'

// ── Chart series palette (multi-series, pie) ──────────────────────
export const SERIES_COLORS = [
  '#0ea87e',  // green   (accent)
  '#e07b39',  // orange
  '#3a8fd4',  // blue
  '#b84590',  // pink
  '#7b5ea7',  // purple
  '#c4a020',  // gold
  '#2aabab',  // teal
  '#d44040',  // red
]

export const PIE_COLORS = [
  '#0ea87e', '#3a8fd4', '#e07b39', '#7b5ea7',
  '#b84590', '#c4a020', '#2aabab', '#d44040',
  '#1a9e6e', '#e05050', '#5b50d6', '#60a8b8',
]

// ── Recharts axis shared props ─────────────────────────────────────
export const rechartsAxis = {
  tick:      { fill: CHART_AXIS_TEXT, fontSize: 10, fontFamily: "'Space Mono', monospace" },
  axisLine:  { stroke: CHART_GRID },
  tickLine:  { stroke: CHART_GRID },
}

export const rechartsTooltip = {
  contentStyle: {
    background:   CHART_TOOLTIP_BG,
    border:       `1px solid ${CHART_TOOLTIP_BORDER}`,
    borderRadius: 8,
    color:        CHART_TOOLTIP_TEXT,
    fontSize:     12,
    boxShadow:    '0 4px 16px rgba(0,0,0,0.10)',
  },
}

// ── Chart variable constraints ────────────────────────────────────
// Defines which column types are allowed per axis per chart type.
// 'numeric'     → only numeric columns
// 'categorical' → only categorical (non-numeric) columns
// 'any'         → no restriction
// null          → axis is not used for this chart
export const CHART_AXIS_RULES = {
  bar:         { x: 'categorical', y: 'numeric'     },
  line:        { x: 'numeric',     y: 'numeric'     },
  scatter:     { x: 'numeric',     y: 'numeric'     },
  histogram:   { x: null,          y: 'numeric'     },
  pie:         { x: 'categorical', y: 'numeric'     },  // y optional
  boxplot:     { x: 'categorical', y: 'numeric'     },
  kde:         { x: null,          y: 'numeric'     },
  violin:      { x: null,          y: 'numeric'     },
  correlogram: { x: null,          y: 'numeric'     },  // multi-Y only
  geomap:      { x: 'categorical', y: 'numeric'     },
}

// Charts that support the aggregation selector
export const CHARTS_WITH_AGGREGATION = new Set(['bar', 'line', 'geomap'])

// Charts that support multi-Y series
export const CHARTS_WITH_MULTI       = new Set(['bar', 'line'])
