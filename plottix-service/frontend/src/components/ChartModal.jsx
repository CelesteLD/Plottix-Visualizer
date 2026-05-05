import React, { useState, useMemo } from 'react'
import { CHART_AXIS_RULES, CHARTS_WITH_AGGREGATION, CHARTS_WITH_MULTI } from '../tokens.js'

const AGGREGATIONS = [
  { value: 'mean',  label: 'Media',   icon: 'x̄' },
  { value: 'sum',   label: 'Suma',    icon: 'Σ' },
  { value: 'count', label: 'Conteo',  icon: '#' },
  { value: 'min',   label: 'Mínimo',  icon: '↓' },
  { value: 'max',   label: 'Máximo',  icon: '↑' },
]
const SERIES_COLORS = ['#5b6af7','#00d4aa','#f59e0b','#f43f5e','#a78bfa','#34d399','#fb923c','#60a5fa']
const ICONS = {
  bar:'▥', line:'╱', scatter:'⁚', histogram:'▦',
  pie:'◔', boxplot:'⊟', kde:'∿', violin:'♫', correlogram:'⊞', geomap:'🌍',
}

function isNumDtype(dtype) {
  const t = (dtype || '').toLowerCase()
  return t.includes('int') || t.includes('float') || t.includes('number')
}

function getColsByType(columns, dtypes, type) {
  if (!type) return []
  return columns.filter(c => type === 'numeric' ? isNumDtype(dtypes[c]) : !isNumDtype(dtypes[c]))
}

export default function ChartModal({ columns, dtypes = {}, chartTypes, loading, error, onGenerate, onClose }) {
  const numeric     = useMemo(() => columns.filter(c => isNumDtype(dtypes[c])),     [columns, dtypes])
  const categorical = useMemo(() => columns.filter(c => !isNumDtype(dtypes[c])),    [columns, dtypes])

  const [config, setConfig] = useState({
    x_column: '', y_column: '', y_columns: [],
    chart_type: '', aggregation: 'mean', custom_title: '',
  })
  const [multiMode, setMultiMode] = useState(false)

  const rules       = CHART_AXIS_RULES[config.chart_type] || {}
  const xAllowed    = getColsByType(columns, dtypes, rules.x)
  const yAllowed    = getColsByType(columns, dtypes, rules.y)
  const xHidden     = rules.x === null
  const isCorr      = config.chart_type === 'correlogram'
  const isPie       = config.chart_type === 'pie'
  const showAgg     = CHARTS_WITH_AGGREGATION.has(config.chart_type)
  const canMulti    = CHARTS_WITH_MULTI.has(config.chart_type)
  const useMulti    = canMulti && multiMode

  const ready = (() => {
    if (!config.chart_type) return false
    if (isCorr)    return config.y_columns.length >= 2
    if (xHidden)   return !!config.y_column
    if (useMulti)  return !!config.x_column && config.y_columns.length >= 2
    if (isPie)     return !!config.x_column
    return !!config.x_column && !!config.y_column
  })()

  const set = k => e => setConfig(p => ({ ...p, [k]: e.target.value }))
  const toggleY = col => setConfig(p => ({
    ...p,
    y_columns: p.y_columns.includes(col)
      ? p.y_columns.filter(c => c !== col)
      : [...p.y_columns, col]
  }))
  const handleTypeChange = v => {
    setConfig(p => ({ ...p, chart_type: v, x_column: '', y_column: '', y_columns: [] }))
    if (!CHARTS_WITH_MULTI.has(v)) setMultiMode(false)
  }
  const handleGenerate = () => onGenerate({ ...config, use_multi: useMulti })
  const onBackdrop = e => { if (e.target === e.currentTarget) onClose() }

  return (
    <div className="modal-overlay" onClick={onBackdrop}>
      <div className="modal-box">
        <div className="modal-header">
          <h2>Configurar gráfico</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* Chart type grid */}
          <div className="cm-field">
            <label className="cm-label">Tipo de gráfico</label>
            <div className="cm-type-grid">
              {chartTypes.map(t => (
                <button
                  key={t.value}
                  className={`cm-type-btn ${config.chart_type === t.value ? 'active' : ''}`}
                  onClick={() => handleTypeChange(t.value)}
                >
                  <span className="cm-type-icon">{ICONS[t.value] || '▣'}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Axis info */}
          {config.chart_type && (
            <div className="cm-axis-info">
              {rules.x === 'numeric'     && <span className="cm-tag num">X: numérica</span>}
              {rules.x === 'categorical' && <span className="cm-tag cat">X: categórica</span>}
              {rules.x === null          && <span className="cm-tag none">Sin eje X</span>}
              {rules.y === 'numeric'     && <span className="cm-tag num">Y: numérica</span>}
              <span className="cm-tag-info">{numeric.length} num · {categorical.length} cat</span>
            </div>
          )}

          {/* Multi-series toggle */}
          {canMulti && (
            <div className="cm-toggle-row">
              <span>Múltiples columnas Y</span>
              <button
                className={`cm-toggle ${multiMode ? 'on' : 'off'}`}
                onClick={() => { setMultiMode(v => !v); setConfig(p => ({ ...p, y_column: '', y_columns: [] })) }}
              >
                {multiMode ? 'Sí' : 'No'}
              </button>
            </div>
          )}

          {/* X axis */}
          {!xHidden && (
            <div className="cm-field">
              <label className="cm-label">
                {config.chart_type === 'geomap' ? 'Columna de país' : 'Eje X'}
                {rules.x && <span className="cm-type-hint"> — {rules.x === 'numeric' ? 'solo numéricas' : 'solo categóricas'}</span>}
              </label>
              {xAllowed.length === 0 ? (
                <div className="cm-no-cols">⚠ Sin columnas {rules.x === 'numeric' ? 'numéricas' : 'categóricas'} disponibles.</div>
              ) : (
                <select className="reg-select" value={config.x_column} onChange={set('x_column')}>
                  <option value="">Selecciona columna…</option>
                  {xAllowed.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          )}

          {/* Y axis single */}
          {!useMulti && !isCorr && (
            <div className="cm-field">
              <label className="cm-label">
                {xHidden ? 'Columna a analizar' : isPie ? 'Valor (opcional)' : 'Eje Y'}
                {rules.y && <span className="cm-type-hint"> — solo numéricas</span>}
              </label>
              {yAllowed.length === 0 ? (
                <div className="cm-no-cols">⚠ Sin columnas numéricas disponibles.</div>
              ) : (
                <select className="reg-select" value={config.y_column} onChange={set('y_column')}>
                  <option value="">{isPie ? 'Frecuencia por defecto…' : 'Selecciona columna…'}</option>
                  {yAllowed.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          )}

          {/* Multi Y / correlogram */}
          {(useMulti || isCorr) && (
            <div className="cm-field">
              <label className="cm-label">
                {isCorr ? 'Columnas numéricas (≥2)' : 'Columnas Y (≥2)'}
              </label>
              <div className="cm-multi-grid">
                {(isCorr ? numeric : yAllowed).map(col => {
                  const sel = config.y_columns.includes(col)
                  const idx = config.y_columns.indexOf(col)
                  return (
                    <button
                      key={col}
                      className={`cm-multi-btn ${sel ? 'active' : ''}`}
                      style={sel ? { borderColor: SERIES_COLORS[idx % SERIES_COLORS.length], color: SERIES_COLORS[idx % SERIES_COLORS.length] } : {}}
                      onClick={() => toggleY(col)}
                    >
                      {sel && <span className="cm-dot" style={{ background: SERIES_COLORS[idx % SERIES_COLORS.length] }} />}
                      {col}
                    </button>
                  )
                })}
              </div>
              {config.y_columns.length > 0 && (
                <div className="cm-tags">
                  {config.y_columns.map((col, i) => (
                    <span key={col} className="cm-y-tag"
                      style={{ borderColor: SERIES_COLORS[i % SERIES_COLORS.length], color: SERIES_COLORS[i % SERIES_COLORS.length] }}>
                      {col}
                      <button onClick={() => toggleY(col)}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aggregation */}
          {showAgg && (
            <div className="cm-field">
              <label className="cm-label">Agregación</label>
              <div className="cm-agg-grid">
                {AGGREGATIONS.map(a => (
                  <button
                    key={a.value}
                    className={`cm-agg-btn ${config.aggregation === a.value ? 'active' : ''}`}
                    onClick={() => setConfig(p => ({ ...p, aggregation: a.value }))}
                  >
                    <span className="cm-agg-icon">{a.icon}</span>
                    <span>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div className="cm-field">
            <label className="cm-label">Título (opcional)</label>
            <input
              className="input-group input"
              style={{ background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, padding: '0.65rem 1rem', color: 'var(--text)', fontFamily: "'Space Mono',monospace", fontSize: '0.88rem', width: '100%' }}
              placeholder="Título automático si se deja vacío"
              value={config.custom_title}
              onChange={set('custom_title')}
            />
          </div>

          {error && (
            <div className="reg-compile-error">
              <span style={{ fontSize: '0.8rem', color: 'var(--error)' }}>⚠ {error}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="reg-cancel-btn" onClick={onClose}>Cancelar</button>
          <button className="run-btn" onClick={handleGenerate} disabled={!ready || loading}
            style={{ padding: '0.65rem 1.6rem', fontSize: '0.82rem' }}>
            {loading ? 'Generando…' : '↗ Generar gráfico'}
          </button>
        </div>
      </div>

      <style>{`
        .cm-field { display: flex; flex-direction: column; gap: 7px; }
        .cm-label {
          font-size: 0.65rem; font-family: 'Space Mono', monospace;
          text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted);
        }
        .cm-type-hint { color: var(--text-dim); text-transform: none; letter-spacing: 0; font-size: 0.62rem; }

        .cm-type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
        .cm-type-btn {
          background: var(--surface2); border: 1.5px solid var(--border2);
          border-radius: 8px; padding: 0.6rem 0.5rem;
          display: flex; align-items: center; gap: 7px;
          font-size: 0.78rem; color: var(--text-muted); cursor: pointer;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
          font-family: 'Outfit', sans-serif;
        }
        .cm-type-btn:hover { border-color: var(--accent); color: var(--text); background: rgba(91,106,247,0.06); }
        .cm-type-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(91,106,247,0.1); }
        .cm-type-icon { font-size: 0.95rem; }

        .cm-axis-info {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
          padding: 7px 10px; border-radius: 7px;
          background: var(--surface2); border: 1px solid var(--border);
        }
        .cm-tag {
          font-family: 'Space Mono', monospace; font-size: 0.62rem;
          padding: 2px 8px; border-radius: 20px;
        }
        .cm-tag.num  { background: rgba(0,212,170,0.08); color: var(--accent2); border: 1px solid rgba(0,212,170,0.2); }
        .cm-tag.cat  { background: rgba(91,106,247,0.08); color: var(--accent); border: 1px solid rgba(91,106,247,0.2); }
        .cm-tag.none { background: var(--surface); color: var(--text-muted); border: 1px solid var(--border); }
        .cm-tag-info { font-size: 0.62rem; color: var(--text-dim); margin-left: auto; font-family: 'Space Mono', monospace; }

        .cm-toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; padding: 0.65rem 1rem;
          font-size: 0.8rem; color: var(--text-muted);
        }
        .cm-toggle {
          font-family: 'Space Mono', monospace; font-size: 0.68rem; font-weight: 700;
          padding: 3px 14px; border-radius: 20px;
        }
        .cm-toggle.on  { background: rgba(91,106,247,0.12); border: 1px solid var(--accent); color: var(--accent); }
        .cm-toggle.off { background: var(--surface); border: 1px solid var(--border2); color: var(--text-muted); }

        .cm-no-cols {
          font-size: 0.78rem; color: var(--warn);
          background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.2);
          border-radius: 7px; padding: 0.6rem 0.9rem;
          font-family: 'Space Mono', monospace;
        }

        .cm-multi-grid {
          display: flex; flex-wrap: wrap; gap: 6px;
          max-height: 140px; overflow-y: auto;
        }
        .cm-multi-btn {
          background: var(--surface2); border: 1.5px solid var(--border2);
          border-radius: 6px; padding: 4px 10px;
          font-size: 0.72rem; color: var(--text-muted);
          display: flex; align-items: center; gap: 5px;
          cursor: pointer; font-family: 'Space Mono', monospace;
          transition: border-color 0.15s, color 0.15s;
        }
        .cm-multi-btn:hover { border-color: var(--accent); color: var(--text); }
        .cm-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        .cm-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
        .cm-y-tag {
          display: flex; align-items: center; gap: 5px;
          border: 1px solid; border-radius: 20px;
          padding: 2px 8px 2px 10px; font-size: 0.7rem; font-family: 'Space Mono', monospace;
        }
        .cm-y-tag button { background: none; font-size: 0.6rem; opacity: 0.6; padding: 0 2px; cursor: pointer; }
        .cm-y-tag button:hover { opacity: 1; }

        .cm-agg-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
        .cm-agg-btn {
          background: var(--surface2); border: 1.5px solid var(--border2);
          border-radius: 7px; padding: 7px 4px;
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          font-size: 0.7rem; color: var(--text-muted); cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .cm-agg-btn:hover { border-color: var(--accent); color: var(--text); }
        .cm-agg-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(91,106,247,0.1); }
        .cm-agg-icon { font-size: 0.95rem; font-weight: 700; }
      `}</style>
    </div>
  )
}