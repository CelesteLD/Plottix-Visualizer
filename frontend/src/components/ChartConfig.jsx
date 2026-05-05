import React from 'react'

export default function ChartConfig({ columns, chartTypes, config, onChange, onVisualize, loading }) {
  const set = (key) => (e) => onChange({ ...config, [key]: e.target.value })

  return (
    <div className="chart-config">
      <div className="config-row">
        <div className="config-field">
          <label>X Axis</label>
          <select value={config.x_column} onChange={set('x_column')}>
            <option value="">— select column —</option>
            {columns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="config-field">
          <label>Y Axis</label>
          <select value={config.y_column} onChange={set('y_column')}>
            <option value="">— select column —</option>
            {columns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="config-field">
          <label>Chart Type</label>
          <select value={config.chart_type} onChange={set('chart_type')}>
            <option value="">— select type —</option>
            {chartTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <button
        className="btn-visualize"
        onClick={onVisualize}
        disabled={loading || !config.x_column || !config.y_column || !config.chart_type}
      >
        {loading ? 'Generating…' : '↗ Visualize'}
      </button>

      <style>{`
        .chart-config { display: flex; flex-direction: column; gap: 16px; }
        .config-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }
        .config-field { display: flex; flex-direction: column; gap: 6px; }
        .config-field label {
          font-size: 0.75rem;
          font-family: var(--font-mono);
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .config-field select {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text-primary);
          padding: 8px 12px;
          font-size: 0.88rem;
          transition: border-color 0.15s;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888a0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          padding-right: 30px;
          cursor: pointer;
        }
        .config-field select:focus { border-color: var(--accent); }
        .btn-visualize {
          align-self: flex-start;
          background: var(--accent);
          color: #fff;
          font-weight: 600;
          font-size: 0.9rem;
          padding: 10px 24px;
          border-radius: var(--radius);
          transition: opacity 0.15s, transform 0.1s;
        }
        .btn-visualize:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .btn-visualize:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
