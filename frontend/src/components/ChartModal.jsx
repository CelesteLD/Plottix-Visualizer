import React, { useState } from 'react'

const AGG_CHART_TYPES  = ['bar', 'line', 'pie']           // show aggregation selector
const MULTI_CHART_TYPES = ['bar', 'line']           // support multiple Y columns
const SINGLE_Y_ONLY    = ['scatter', 'histogram', 'boxplot', 'pie']  // only one Y
const X_NOT_NEEDED     = ['histogram']              // X axis not shown

const AGGREGATIONS = [
  { value: 'mean',  label: 'Mean',    icon: 'x̄' },
  { value: 'sum',   label: 'Sum',     icon: 'Σ' },
  { value: 'count', label: 'Count',   icon: '#' },
  { value: 'min',   label: 'Min',     icon: '↓' },
  { value: 'max',   label: 'Max',     icon: '↑' },
]

const ICONS = {
  bar: '▥', line: '╱', scatter: '⁚', histogram: '▦',
  pie: '◔', boxplot: '⊟',
}

// Palette for multi-series badges
const SERIES_COLORS = [
  '#00e5a0', '#ff9500', '#00aaff', '#ff4d8d',
  '#c882ff', '#ffdd00', '#00e5e5', '#ff6b6b',
]

export default function ChartModal({ columns, chartTypes, loading, error, onGenerate, onClose }) {
  const [config, setConfig] = useState({
    x_column:    '',
    y_column:    '',        // single-Y mode
    y_columns:   [],        // multi-Y mode
    chart_type:  '',
    aggregation: 'mean',
    custom_title: '',
  })

  const set = (key) => (e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }))

  const isHistogram  = config.chart_type === 'histogram'
  const isMultiMode  = MULTI_CHART_TYPES.includes(config.chart_type) && config.y_columns.length >= 1
  const showMultiToggle = MULTI_CHART_TYPES.includes(config.chart_type)
  const showAggregation = AGG_CHART_TYPES.includes(config.chart_type)
  const [multiMode, setMultiMode] = useState(false)

  const useMulti = showMultiToggle && multiMode

  // Ready condition
  const ready = isHistogram
    ? config.y_column && config.chart_type
    : useMulti
      ? config.x_column && config.y_columns.length >= 2 && config.chart_type
      : config.x_column && config.y_column && config.chart_type

  const handleChartTypeChange = (value) => {
    setConfig((prev) => ({
      ...prev,
      chart_type:  value,
      x_column:    value === 'histogram' ? '' : prev.x_column,
      y_column:    '',
      y_columns:   [],
    }))
    if (SINGLE_Y_ONLY.includes(value)) setMultiMode(false)
  }

  const toggleYColumn = (col) => {
    setConfig((prev) => {
      const already = prev.y_columns.includes(col)
      return {
        ...prev,
        y_columns: already
          ? prev.y_columns.filter((c) => c !== col)
          : [...prev.y_columns, col],
      }
    })
  }

  const handleGenerate = () => {
    onGenerate({ ...config, use_multi: useMulti })
  }

  const onBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

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

          {/* 2 — Multi-series toggle (bar & line only) */}
          {showMultiToggle && (
            <div className="multi-toggle-row">
              <span className="multi-toggle-label">Compare multiple Y columns</span>
              <button
                className={`toggle-btn ${multiMode ? 'on' : 'off'}`}
                onClick={() => { setMultiMode((v) => !v); setConfig((p) => ({ ...p, y_column: '', y_columns: [] })) }}
              >
                {multiMode ? 'On' : 'Off'}
              </button>
            </div>
          )}

          {/* 3 — X axis (hidden for histogram) */}
          {!isHistogram && (
            <div className="field">
              <label>X Axis — horizontal</label>
              <select value={config.x_column} onChange={set('x_column')}>
                <option value="">Select column…</option>
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* 4a — Single Y axis */}
          {!useMulti && (
            <div className="field">
              <label>{isHistogram ? 'Column to distribute (numeric)' : 'Y Axis — vertical'}</label>
              <select value={config.y_column} onChange={set('y_column')}>
                <option value="">Select column…</option>
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {isHistogram && (
                <span className="field-hint">
                  ℹ The histogram shows the distribution of this column across 20 bins.
                </span>
              )}
            </div>
          )}

          {/* 4b — Multi Y selector */}
          {useMulti && (
            <div className="field">
              <label>Y Columns — select 2 or more to compare</label>
              <div className="multi-y-grid">
                {columns.map((col, i) => {
                  const selected = config.y_columns.includes(col)
                  const colorIdx = config.y_columns.indexOf(col)
                  return (
                    <button
                      key={col}
                      className={`multi-y-btn ${selected ? 'active' : ''}`}
                      style={selected ? { borderColor: SERIES_COLORS[colorIdx % SERIES_COLORS.length], color: SERIES_COLORS[colorIdx % SERIES_COLORS.length] } : {}}
                      onClick={() => toggleYColumn(col)}
                    >
                      {selected && <span className="multi-y-dot" style={{ background: SERIES_COLORS[colorIdx % SERIES_COLORS.length] }} />}
                      {col}
                    </button>
                  )
                })}
              </div>
              {config.y_columns.length > 0 && (
                <div className="multi-y-selected">
                  {config.y_columns.map((col, i) => (
                    <span key={col} className="multi-y-tag" style={{ borderColor: SERIES_COLORS[i % SERIES_COLORS.length], color: SERIES_COLORS[i % SERIES_COLORS.length] }}>
                      {col}
                      <button onClick={() => toggleYColumn(col)}>✕</button>
                    </span>
                  ))}
                </div>
              )}
              {config.y_columns.length < 2 && (
                <span className="field-hint">ℹ Select at least 2 columns to enable multi-series.</span>
              )}
            </div>
          )}

          {/* 5 — Aggregation */}
          {showAggregation && (
            <div className="field">
              <label>Aggregation — how to combine Y values per X group</label>
              <div className="agg-grid">
                {AGGREGATIONS.map((a) => (
                  <button
                    key={a.value}
                    className={`agg-btn ${config.aggregation === a.value ? 'active' : ''}`}
                    onClick={() => setConfig((prev) => ({ ...prev, aggregation: a.value }))}
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
            <label>Chart title (optional)</label>
            <input
              type="text"
              className="title-input"
              placeholder={
                isHistogram
                  ? `Distribution of ${config.y_column || 'column'}`
                  : useMulti
                    ? `${config.y_columns.join(', ') || 'Y cols'} by ${config.x_column || 'X'}`
                    : `${config.y_column || 'Y'} by ${config.x_column || 'X'}`
              }
              value={config.custom_title}
              onChange={set('custom_title')}
            />
          </div>

          {error && <div className="modal-error"><span>⚠</span> {error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-generate" onClick={handleGenerate} disabled={!ready || loading}>
            {loading ? 'Generating…' : '↗ Generate chart'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 100; animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }

        .modal {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 14px; width: 520px;
          max-width: calc(100vw - 32px); max-height: calc(100vh - 64px);
          display: flex; flex-direction: column;
          box-shadow: 0 24px 64px rgba(0,0,0,0.5);
          animation: slideUp 0.18s ease; overflow: hidden;
        }
        @keyframes slideUp { from { transform:translateY(16px); opacity:0 } to { transform:translateY(0); opacity:1 } }

        .modal-header {
          padding: 20px 24px 16px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
        }
        .modal-title { font-family: var(--font-mono); font-size: 0.95rem; color: var(--text-primary); }
        .modal-close {
          background: none; color: var(--text-muted); font-size: 0.85rem;
          padding: 4px 8px; border-radius: 6px; transition: background 0.15s, color 0.15s;
        }
        .modal-close:hover { background: var(--bg-elevated); color: var(--text-primary); }

        .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; }

        .field { display: flex; flex-direction: column; gap: 7px; }
        .field label {
          font-size: 0.72rem; font-family: var(--font-mono);
          text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary);
        }
        .field select {
          background: var(--bg-elevated); border: 1px solid var(--border);
          border-radius: 8px; color: var(--text-primary);
          padding: 9px 32px 9px 12px; font-size: 0.88rem;
          transition: border-color 0.15s; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888a0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 10px center; cursor: pointer;
        }
        .field select:focus { border-color: var(--accent); outline: none; }
        .field-hint {
          font-size: 0.76rem; color: var(--text-muted);
          background: var(--bg-elevated); border: 1px solid var(--border);
          border-radius: 6px; padding: 7px 10px; line-height: 1.4;
        }
        .title-input {
          background: var(--bg-elevated); border: 1px solid var(--border);
          border-radius: 8px; color: var(--text-primary);
          padding: 9px 12px; font-size: 0.88rem; width: 100%;
          font-family: inherit; transition: border-color 0.15s; box-sizing: border-box;
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
          font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700;
          padding: 4px 14px; border-radius: 20px; transition: all 0.15s;
        }
        .toggle-btn.on  { background: var(--accent-dim); border: 1px solid var(--accent); color: var(--accent); }
        .toggle-btn.off { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-muted); }

        /* Multi-Y column picker */
        .multi-y-grid {
          display: flex; flex-wrap: wrap; gap: 6px;
          max-height: 160px; overflow-y: auto;
          padding: 4px 0;
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
        .multi-y-tag button {
          background: none; font-size: 0.65rem; opacity: 0.7;
          transition: opacity 0.15s; padding: 0 2px;
        }
        .multi-y-tag button:hover { opacity: 1; }

        /* Chart types */
        .type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .type-btn {
          background: var(--bg-elevated); border: 1.5px solid var(--border);
          border-radius: 8px; padding: 10px 10px;
          display: flex; align-items: center; gap: 8px;
          font-size: 0.82rem; color: var(--text-secondary);
          transition: border-color 0.15s, color 0.15s, background 0.15s; cursor: pointer;
        }
        .type-btn:hover { border-color: var(--accent); color: var(--text-primary); }
        .type-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
        .type-icon { font-size: 1rem; line-height: 1; }

        /* Aggregation */
        .agg-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
        .agg-btn {
          background: var(--bg-elevated); border: 1.5px solid var(--border);
          border-radius: 8px; padding: 8px 6px;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          font-size: 0.75rem; color: var(--text-secondary);
          transition: border-color 0.15s, color 0.15s, background 0.15s; cursor: pointer;
        }
        .agg-btn:hover { border-color: var(--accent); color: var(--text-primary); }
        .agg-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
        .agg-icon { font-size: 1rem; font-weight: 700; line-height: 1; }

        .modal-error {
          background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.25);
          border-radius: 8px; padding: 10px 12px;
          font-size: 0.82rem; color: #ff6b6b; display: flex; gap: 8px;
        }

        .modal-footer {
          padding: 16px 24px 20px; border-top: 1px solid var(--border);
          display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0;
        }
        .btn-cancel {
          background: var(--bg-elevated); color: var(--text-secondary);
          border: 1px solid var(--border); border-radius: 8px;
          padding: 9px 18px; font-size: 0.88rem; transition: background 0.15s, color 0.15s;
        }
        .btn-cancel:hover { background: var(--border); color: var(--text-primary); }
        .btn-generate {
          background: var(--accent); color: #0a0a0c;
          font-weight: 700; font-size: 0.88rem;
          padding: 9px 20px; border-radius: 8px; transition: opacity 0.15s, transform 0.1s;
        }
        .btn-generate:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .btn-generate:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>
    </div>
  )
}