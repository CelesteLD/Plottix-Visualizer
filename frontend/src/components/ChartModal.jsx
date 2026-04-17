import React, { useState } from 'react'

export default function ChartModal({ columns, chartTypes, loading, error, onGenerate, onClose }) {
  const [config, setConfig] = useState({ x_column: '', y_column: '', chart_type: '' })
  const set = (key) => (e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }))
  const ready = config.x_column && config.y_column && config.chart_type

  // Close on backdrop click
  const onBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div className="modal-backdrop" onClick={onBackdrop}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Configure chart</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label>X Axis — horizontal</label>
            <select value={config.x_column} onChange={set('x_column')}>
              <option value="">Select column…</option>
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Y Axis — vertical</label>
            <select value={config.y_column} onChange={set('y_column')}>
              <option value="">Select column…</option>
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="field">
            <label>Chart type</label>
            <div className="type-grid">
              {chartTypes.map((t) => (
                <button
                  key={t.value}
                  className={`type-btn ${config.chart_type === t.value ? 'active' : ''}`}
                  onClick={() => setConfig((prev) => ({ ...prev, chart_type: t.value }))}
                >
                  <span className="type-icon">{ICONS[t.value] || '▣'}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="modal-error"><span>⚠</span> {error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="btn-generate"
            onClick={() => onGenerate(config)}
            disabled={!ready || loading}
          >
            {loading ? 'Generating…' : '↗ Generate chart'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 100;
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

        .modal {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          width: 480px;
          max-width: calc(100vw - 32px);
          box-shadow: 0 24px 64px rgba(0,0,0,0.5);
          animation: slideUp 0.18s ease;
          overflow: hidden;
        }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

        .modal-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
        }
        .modal-title { font-family: var(--font-mono); font-size: 0.95rem; color: var(--text-primary); }
        .modal-close {
          background: none; color: var(--text-muted); font-size: 0.85rem;
          padding: 4px 8px; border-radius: 6px;
          transition: background 0.15s, color 0.15s;
        }
        .modal-close:hover { background: var(--bg-elevated); color: var(--text-primary); }

        .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 18px; }

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
        .field select:focus { border-color: var(--accent); }

        .type-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .type-btn {
          background: var(--bg-elevated); border: 1.5px solid var(--border);
          border-radius: 8px; padding: 10px 14px;
          display: flex; align-items: center; gap: 10px;
          font-size: 0.85rem; color: var(--text-secondary);
          transition: border-color 0.15s, color 0.15s, background 0.15s;
          cursor: pointer;
        }
        .type-btn:hover { border-color: var(--accent); color: var(--text-primary); }
        .type-btn.active {
          border-color: var(--accent); color: var(--accent);
          background: var(--accent-dim);
        }
        .type-icon { font-size: 1.1rem; line-height: 1; }

        .modal-error {
          background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.25);
          border-radius: 8px; padding: 10px 12px;
          font-size: 0.82rem; color: #ff6b6b; display: flex; gap: 8px;
        }

        .modal-footer {
          padding: 16px 24px 20px;
          border-top: 1px solid var(--border);
          display: flex; justify-content: flex-end; gap: 10px;
        }
        .btn-cancel {
          background: var(--bg-elevated); color: var(--text-secondary);
          border: 1px solid var(--border); border-radius: 8px;
          padding: 9px 18px; font-size: 0.88rem;
          transition: background 0.15s, color 0.15s;
        }
        .btn-cancel:hover { background: var(--border); color: var(--text-primary); }
        .btn-generate {
          background: var(--accent); color: #0a0a0c;
          font-weight: 700; font-size: 0.88rem;
          padding: 9px 20px; border-radius: 8px;
          transition: opacity 0.15s, transform 0.1s;
        }
        .btn-generate:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .btn-generate:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>
    </div>
  )
}

const ICONS = {
  bar: '▥',
  line: '╱',
  scatter: '⁚',
  histogram: '▦',
}