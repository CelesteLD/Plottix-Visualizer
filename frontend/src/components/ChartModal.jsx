import React, { useState, useMemo } from 'react'
import {
  SERIES_COLORS,
  CHART_AXIS_RULES,
  CHARTS_WITH_AGGREGATION,
  CHARTS_WITH_MULTI,
  COLOR_ACCENT,
  COLOR_ACCENT_DIM,
} from '../tokens.js'

const AGGREGATIONS = [
  { value: 'mean',  label: 'Mean',  icon: 'x̄' },
  { value: 'sum',   label: 'Sum',   icon: 'Σ' },
  { value: 'count', label: 'Count', icon: '#' },
  { value: 'min',   label: 'Min',   icon: '↓' },
  { value: 'max',   label: 'Max',   icon: '↑' },
]

const ICONS = {
  bar: '▥', line: '╱', scatter: '⁚', histogram: '▦',
  pie: '◔', boxplot: '⊟', kde: '∿', violin: '♫', correlogram: '⊞', geomap: '🌍',
}

// ── Helper: classify columns from dtypes ──────────────────────────
function classifyColumns(columns, dtypes) {
  const numeric = []
  const categorical = []
  for (const col of columns) {
    const t = (dtypes[col] || '').toLowerCase()
    const isNum = t.includes('int') || t.includes('float') || t.includes('number')
    if (isNum) numeric.push(col)
    else categorical.push(col)
  }
  return { numeric, categorical }
}

// ── Helper: get allowed columns for an axis ────────────────────────
function getAllowedColumns(axisType, numeric, categorical, allColumns) {
  if (!axisType) return []
  if (axisType === 'numeric')     return numeric
  if (axisType === 'categorical') return categorical
  return allColumns
}

export default function ChartModal({ columns, dtypes = {}, chartTypes, loading, error, onGenerate, onClose }) {
  const { numeric, categorical } = useMemo(
    () => classifyColumns(columns, dtypes),
    [columns, dtypes]
  )

  const [config, setConfig] = useState({
    x_column:     '',
    y_column:     '',
    y_columns:    [],
    chart_type:   '',
    aggregation:  'mean',
    custom_title: '',
  })
  const [multiMode, setMultiMode] = useState(false)

  const rules          = CHART_AXIS_RULES[config.chart_type] || {}
  const xAllowed       = getAllowedColumns(rules.x, numeric, categorical, columns)
  const yAllowed       = getAllowedColumns(rules.y, numeric, categorical, columns)

  const xHidden        = rules.x === null
  const isCorrelogram  = config.chart_type === 'correlogram'
  const isPie          = config.chart_type === 'pie'
  const showAgg        = CHARTS_WITH_AGGREGATION.has(config.chart_type)
  const canMulti       = CHARTS_WITH_MULTI.has(config.chart_type)
  const useMulti       = canMulti && multiMode

  // ── Ready condition ───────────────────────────────────────────────
  const ready = (() => {
    if (!config.chart_type) return false
    if (isCorrelogram)  return config.y_columns.length >= 2
    if (xHidden)        return !!config.y_column
    if (useMulti)       return !!config.x_column && config.y_columns.length >= 2
    if (isPie)          return !!config.x_column
    return !!config.x_column && !!config.y_column
  })()

  // ── Handlers ─────────────────────────────────────────────────────
  const set = (key) => (e) => setConfig((p) => ({ ...p, [key]: e.target.value }))

  const handleChartTypeChange = (value) => {
    setConfig((p) => ({ ...p, chart_type: value, x_column: '', y_column: '', y_columns: [] }))
    if (!CHARTS_WITH_MULTI.has(value)) setMultiMode(false)
  }

  const toggleYColumn = (col) =>
    setConfig((p) => ({
      ...p,
      y_columns: p.y_columns.includes(col)
        ? p.y_columns.filter((c) => c !== col)
        : [...p.y_columns, col],
    }))

  const handleGenerate = () => onGenerate({ ...config, use_multi: useMulti })
  const onBackdrop     = (e) => { if (e.target === e.currentTarget) onClose() }

  // ── Column type badge ─────────────────────────────────────────────
  const TypeTag = ({ col }) => {
    const isNum = numeric.includes(col)
    return (
      <span style={{
        fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
        padding: '1px 5px', borderRadius: 4, marginLeft: 4,
        background: isNum ? 'rgba(14,168,126,0.10)' : 'rgba(91,80,214,0.10)',
        color: isNum ? 'var(--accent)' : 'var(--accent-2)',
        border: `1px solid ${isNum ? 'rgba(14,168,126,0.25)' : 'rgba(91,80,214,0.25)'}`,
      }}>
        {isNum ? 'num' : 'cat'}
      </span>
    )
  }

  return (
    <div className="modal-backdrop" onClick={onBackdrop}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Configure chart</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* 1 — Chart type */}
          <div className="field">
            <label>Chart type</label>
            <div className="type-grid">
              {chartTypes.map((t) => (
                <button
                  key={t.value}
                  className={`type-btn ${config.chart_type === t.value ? 'active' : ''}`}
                  onClick={() => handleChartTypeChange(t.value)}
                >
                  <span className="type-icon">{ICONS[t.value] || '▣'}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Show axis info when chart is selected */}
          {config.chart_type && (
            <div className="axis-info">
              {rules.x === 'numeric'     && <span className="axis-tag num">X: numérica</span>}
              {rules.x === 'categorical' && <span className="axis-tag cat">X: categórica</span>}
              {rules.x === null          && <span className="axis-tag none">Sin eje X</span>}
              {rules.y === 'numeric'     && <span className="axis-tag num">Y: numérica</span>}
              {rules.y === 'categorical' && <span className="axis-tag cat">Y: categórica</span>}
              {!isCorrelogram && numeric.length > 0 && (
                <span className="axis-info-count">{numeric.length} numéricas · {categorical.length} categóricas disponibles</span>
              )}
            </div>
          )}

          {/* 2 — Multi-series toggle */}
          {canMulti && (
            <div className="multi-toggle-row">
              <span className="multi-toggle-label">Comparar múltiples columnas Y</span>
              <button
                className={`toggle-btn ${multiMode ? 'on' : 'off'}`}
                onClick={() => { setMultiMode((v) => !v); setConfig((p) => ({ ...p, y_column: '', y_columns: [] })) }}
              >
                {multiMode ? 'Sí' : 'No'}
              </button>
            </div>
          )}

          {/* 3 — X axis */}
          {!xHidden && (
            <div className="field">
              <label>
                {config.chart_type === 'geomap' ? 'Columna de país' : 'Eje X'}
                {rules.x && <span className="field-type-hint"> — {rules.x === 'numeric' ? 'solo numéricas' : 'solo categóricas'}</span>}
              </label>
              {xAllowed.length === 0 ? (
                <div className="no-columns-warning">
                  ⚠ No hay columnas {rules.x === 'numeric' ? 'numéricas' : 'categóricas'} en el dataset para este eje.
                </div>
              ) : (
                <select value={config.x_column} onChange={set('x_column')}>
                  <option value="">Selecciona columna…</option>
                  {xAllowed.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          )}

          {/* 4a — Single Y */}
          {!useMulti && !isCorrelogram && (
            <div className="field">
              <label>
                {xHidden
                  ? (config.chart_type === 'kde' ? 'Columna a analizar'
                    : config.chart_type === 'violin' ? 'Columna a analizar'
                    : 'Columna a distribuir')
                  : isPie ? 'Valor (opcional)'
                  : config.chart_type === 'geomap' ? 'Columna de valor'
                  : 'Eje Y'}
                {rules.y && <span className="field-type-hint"> — {rules.y === 'numeric' ? 'solo numéricas' : 'solo categóricas'}</span>}
              </label>
              {yAllowed.length === 0 ? (
                <div className="no-columns-warning">
                  ⚠ No hay columnas {rules.y === 'numeric' ? 'numéricas' : 'categóricas'} disponibles.
                </div>
              ) : (
                <select value={config.y_column} onChange={set('y_column')}>
                  <option value="">{isPie ? 'Frecuencia de categoría (por defecto)…' : 'Selecciona columna…'}</option>
                  {yAllowed.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {isPie && <span className="field-hint">ℹ Si se deja vacío, el tamaño de cada sector es el conteo de filas de la categoría.</span>}
              {config.chart_type === 'kde' && <span className="field-hint">ℹ Muestra la densidad de probabilidad (KDE) suavizada de la columna seleccionada.</span>}
              {config.chart_type === 'violin' && <span className="field-hint">ℹ Combina la forma KDE con estadísticas de box plot.</span>}
              {config.chart_type === 'histogram' && <span className="field-hint">ℹ Muestra la distribución en 20 bins.</span>}
            </div>
          )}

          {/* 4b — Multi Y / Correlogram */}
          {(useMulti || isCorrelogram) && (
            <div className="field">
              <label>
                {isCorrelogram ? 'Columnas — selecciona 2 o más numéricas' : 'Columnas Y — selecciona 2 o más para comparar'}
              </label>
              <div className="multi-y-grid">
                {(isCorrelogram ? numeric : yAllowed).map((col) => {
                  const selected  = config.y_columns.includes(col)
                  const colorIdx  = config.y_columns.indexOf(col)
                  return (
                    <button
                      key={col}
                      className={`multi-y-btn ${selected ? 'active' : ''}`}
                      style={selected ? {
                        borderColor: SERIES_COLORS[colorIdx % SERIES_COLORS.length],
                        color:       SERIES_COLORS[colorIdx % SERIES_COLORS.length],
                      } : {}}
                      onClick={() => toggleYColumn(col)}
                    >
                      {selected && (
                        <span className="multi-y-dot"
                          style={{ background: SERIES_COLORS[colorIdx % SERIES_COLORS.length] }} />
                      )}
                      {col}
                      <TypeTag col={col} />
                    </button>
                  )
                })}
              </div>
              {config.y_columns.length > 0 && (
                <div className="multi-y-selected">
                  {config.y_columns.map((col, i) => (
                    <span key={col} className="multi-y-tag"
                      style={{ borderColor: SERIES_COLORS[i % SERIES_COLORS.length], color: SERIES_COLORS[i % SERIES_COLORS.length] }}>
                      {col}
                      <button onClick={() => toggleYColumn(col)}>✕</button>
                    </span>
                  ))}
                </div>
              )}
              {config.y_columns.length < 2 && (
                <span className="field-hint">
                  {isCorrelogram
                    ? 'ℹ Selecciona al menos 2 columnas numéricas para la matriz de correlación.'
                    : 'ℹ Selecciona al menos 2 columnas para activar el modo multi-serie.'}
                </span>
              )}
            </div>
          )}

          {/* 5 — Aggregation (only for bar, line, geomap) */}
          {showAgg && (
            <div className="field">
              <label>Agregación — cómo combinar los valores Y por grupo X</label>
              <div className="agg-grid">
                {AGGREGATIONS.map((a) => (
                  <button
                    key={a.value}
                    className={`agg-btn ${config.aggregation === a.value ? 'active' : ''}`}
                    onClick={() => setConfig((p) => ({ ...p, aggregation: a.value }))}
                  >
                    <span className="agg-icon">{a.icon}</span>
                    <span>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 6 — Custom title */}
          <div className="field">
            <label>Título del gráfico (opcional)</label>
            <input
              type="text"
              className="title-input"
              placeholder={
                xHidden
                  ? `Distribución de ${config.y_column || 'columna'}`
                  : useMulti
                    ? `${config.y_columns.join(', ') || 'Y cols'} por ${config.x_column || 'X'}`
                    : isCorrelogram
                      ? `Correlograma de ${config.y_columns.join(', ') || 'columnas'}`
                      : `${config.y_column || 'Y'} por ${config.x_column || 'X'}`
              }
              value={config.custom_title}
              onChange={set('custom_title')}
            />
          </div>

          {error && <div className="modal-error"><span>⚠</span> {error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="btn-generate" onClick={handleGenerate} disabled={!ready || loading}>
            {loading ? 'Generando…' : '↗ Generar gráfico'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(26,26,24,0.35);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1100; animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }

        .modal {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px; width: 540px;
          max-width: calc(100vw - 32px); max-height: calc(100vh - 64px);
          display: flex; flex-direction: column;
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.18s ease; overflow: hidden;
        }
        @keyframes slideUp { from { transform:translateY(14px); opacity:0 } to { transform:translateY(0); opacity:1 } }

        .modal-header {
          padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
          background: var(--bg-card);
        }
        .modal-title { font-family: var(--font-mono); font-size: 0.9rem; color: var(--text-primary); font-weight: 700; }
        .modal-close {
          background: none; color: var(--text-muted); font-size: 0.85rem;
          padding: 4px 8px; border-radius: 6px; transition: background 0.15s, color 0.15s;
        }
        .modal-close:hover { background: var(--bg-elevated); color: var(--text-primary); }

        .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; }

        .field { display: flex; flex-direction: column; gap: 7px; }
        .field label {
          font-size: 0.71rem; font-family: var(--font-mono);
          text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary);
          display: flex; align-items: center; gap: 4px;
        }
        .field-type-hint { color: var(--text-muted); text-transform: none; letter-spacing: 0; font-size: 0.68rem; }

        .field select {
          background: var(--bg-elevated); border: 1px solid var(--border);
          border-radius: 8px; color: var(--text-primary);
          padding: 9px 32px 9px 12px; font-size: 0.88rem;
          transition: border-color 0.15s; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9a90' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center; cursor: pointer;
        }
        .field select:focus { border-color: var(--accent); outline: none; }

        .field-hint {
          font-size: 0.75rem; color: var(--text-muted);
          background: var(--bg-elevated); border: 1px solid var(--border);
          border-radius: 6px; padding: 7px 10px; line-height: 1.5;
        }

        /* Axis info bar */
        .axis-info {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
          padding: 8px 10px; border-radius: 8px;
          background: var(--bg-elevated); border: 1px solid var(--border);
        }
        .axis-tag {
          font-family: var(--font-mono); font-size: 0.67rem;
          padding: 2px 8px; border-radius: 20px;
        }
        .axis-tag.num  { background: rgba(14,168,126,0.10); color: var(--accent);   border: 1px solid rgba(14,168,126,0.25); }
        .axis-tag.cat  { background: rgba(91,80,214,0.10);  color: var(--accent-2); border: 1px solid rgba(91,80,214,0.25); }
        .axis-tag.none { background: var(--bg-card); color: var(--text-muted); border: 1px solid var(--border); }
        .axis-info-count { font-size: 0.7rem; color: var(--text-muted); margin-left: auto; }

        /* No columns warning */
        .no-columns-warning {
          font-size: 0.8rem; color: var(--warning);
          background: var(--warning-bg); border: 1px solid var(--warning-border);
          border-radius: 8px; padding: 9px 12px;
        }

        .title-input {
          background: var(--bg-elevated); border: 1px solid var(--border);
          border-radius: 8px; color: var(--text-primary);
          padding: 9px 12px; font-size: 0.88rem; width: 100%;
          font-family: inherit; transition: border-color 0.15s;
        }
        .title-input:focus { border-color: var(--accent); outline: none; }
        .title-input::placeholder { color: var(--text-muted); }

        /* Multi toggle */
        .multi-toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--bg-elevated); border: 1px solid var(--border);
          border-radius: 8px; padding: 10px 14px;
        }
        .multi-toggle-label { font-size: 0.82rem; color: var(--text-secondary); }
        .toggle-btn {
          font-family: var(--font-mono); font-size: 0.7rem; font-weight: 700;
          padding: 4px 14px; border-radius: 20px; transition: all 0.15s;
        }
        .toggle-btn.on  { background: var(--accent-dim); border: 1px solid var(--accent); color: var(--accent); }
        .toggle-btn.off { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted); }

        /* Multi-Y column picker */
        .multi-y-grid {
          display: flex; flex-wrap: wrap; gap: 6px;
          max-height: 160px; overflow-y: auto; padding: 4px 0;
        }
        .multi-y-btn {
          background: var(--bg-elevated); border: 1.5px solid var(--border);
          border-radius: 6px; padding: 5px 10px;
          font-size: 0.78rem; color: var(--text-secondary);
          display: flex; align-items: center; gap: 5px;
          transition: border-color 0.15s, color 0.15s; cursor: pointer;
          font-family: var(--font-mono);
        }
        .multi-y-btn:hover { border-color: var(--text-secondary); color: var(--text-primary); }
        .multi-y-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        .multi-y-selected { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
        .multi-y-tag {
          display: flex; align-items: center; gap: 5px;
          border: 1px solid; border-radius: 20px;
          padding: 3px 8px 3px 10px; font-size: 0.75rem; font-family: var(--font-mono);
        }
        .multi-y-tag button { background: none; font-size: 0.65rem; opacity: 0.7; padding: 0 2px; }
        .multi-y-tag button:hover { opacity: 1; }

        /* Chart types */
        .type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
        .type-btn {
          background: var(--bg-elevated); border: 1.5px solid var(--border);
          border-radius: 8px; padding: 10px 10px;
          display: flex; align-items: center; gap: 8px;
          font-size: 0.81rem; color: var(--text-secondary);
          transition: border-color 0.15s, color 0.15s, background 0.15s; cursor: pointer;
        }
        .type-btn:hover { border-color: var(--accent); color: var(--text-primary); background: var(--accent-dim); }
        .type-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
        .type-icon { font-size: 1rem; line-height: 1; }

        /* Aggregation */
        .agg-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
        .agg-btn {
          background: var(--bg-elevated); border: 1.5px solid var(--border);
          border-radius: 8px; padding: 8px 6px;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          font-size: 0.74rem; color: var(--text-secondary);
          transition: border-color 0.15s, color 0.15s, background 0.15s; cursor: pointer;
        }
        .agg-btn:hover { border-color: var(--accent); color: var(--text-primary); }
        .agg-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
        .agg-icon { font-size: 1rem; font-weight: 700; line-height: 1; }

        .modal-error {
          background: var(--error-bg); border: 1px solid var(--error-border);
          border-radius: 8px; padding: 10px 12px;
          font-size: 0.82rem; color: var(--error); display: flex; gap: 8px;
        }

        .modal-footer {
          padding: 16px 24px 20px; border-top: 1px solid var(--border);
          display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0;
          background: var(--bg-card);
        }
        .btn-cancel {
          background: var(--bg-elevated); color: var(--text-secondary);
          border: 1px solid var(--border); border-radius: 8px;
          padding: 9px 18px; font-size: 0.88rem; transition: background 0.15s, color 0.15s;
        }
        .btn-cancel:hover { background: var(--border); color: var(--text-primary); }
        .btn-generate {
          background: var(--accent); color: #fff;
          font-weight: 600; font-size: 0.88rem;
          padding: 9px 20px; border-radius: 8px; transition: opacity 0.15s, transform 0.1s;
        }
        .btn-generate:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .btn-generate:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
