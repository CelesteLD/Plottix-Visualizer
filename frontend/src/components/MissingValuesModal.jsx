import React, { useState } from 'react'

const STRATEGIES = [
  { value: 'none',       label: 'Keep as-is',   desc: 'Leave missing values untouched' },
  { value: 'drop',       label: 'Drop rows',    desc: 'Remove rows where this column is missing' },
  { value: 'mean',       label: 'Fill mean',    desc: 'Replace with column mean (numeric only)' },
  { value: 'median',     label: 'Fill median',  desc: 'Replace with column median (numeric only)' },
  { value: 'mode',       label: 'Fill mode',    desc: 'Replace with most frequent value' },
  { value: 'fill_empty', label: 'Fill default', desc: 'Fill with 0 (numeric) or "N/A" (text)' },
]

export default function MissingValuesModal({ missingInfo, onApply, onSkip, loading }) {
  // Only show columns that actually have missings
  const columnsWithMissings = missingInfo.filter((c) => c.missing_count > 0)

  // Build initial strategy map: default to 'none' for all
  const [strategies, setStrategies] = useState(() =>
    Object.fromEntries(columnsWithMissings.map((c) => [c.column, 'none']))
  )

  const setStrategy = (col, val) =>
    setStrategies((prev) => ({ ...prev, [col]: val }))

  const handleApply = () => {
    const payload = Object.entries(strategies).map(([column, strategy]) => ({
      column,
      strategy,
    }))
    onApply(payload)
  }

  const hasMissings = columnsWithMissings.length > 0

  return (
    <div className="mv-backdrop">
      <div className="mv-modal">

        {/* Header */}
        <div className="mv-header">
          <div className="mv-header-left">
            <span className="mv-icon">⚠</span>
            <div>
              <h2 className="mv-title">Missing values detected</h2>
              <p className="mv-subtitle">
                {hasMissings
                  ? `${columnsWithMissings.length} column${columnsWithMissings.length > 1 ? 's have' : ' has'} missing data. Choose how to handle each one.`
                  : 'No missing values found. Your dataset is clean!'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mv-body">
          {hasMissings ? (
            <table className="mv-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Type</th>
                  <th>Missing</th>
                  <th>%</th>
                  <th>Strategy</th>
                </tr>
              </thead>
              <tbody>
                {columnsWithMissings.map((col) => (
                  <tr key={col.column}>
                    <td className="col-name">{col.column}</td>
                    <td>
                      <span className={`badge ${col.is_numeric ? 'badge-num' : 'badge-cat'}`}>
                        {col.is_numeric ? 'numeric' : 'categorical'}
                      </span>
                    </td>
                    <td className="col-count">{col.missing_count.toLocaleString()}</td>
                    <td className="col-pct">
                      <div className="pct-bar-wrap">
                        <div
                          className="pct-bar"
                          style={{ width: `${Math.min(col.missing_pct, 100)}%`,
                                   background: col.missing_pct > 30 ? 'var(--warn-high)' : 'var(--warn-low)' }}
                        />
                        <span>{col.missing_pct}%</span>
                      </div>
                    </td>
                    <td>
                      <select
                        value={strategies[col.column]}
                        onChange={(e) => setStrategy(col.column, e.target.value)}
                        className="mv-select"
                      >
                        {STRATEGIES.filter((s) =>
                          // hide mean/median for non-numeric columns
                          col.is_numeric || !['mean', 'median'].includes(s.value)
                        ).map((s) => (
                          <option key={s.value} value={s.value} title={s.desc}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="mv-clean">
              <span className="mv-clean-icon">✓</span>
              <p>All columns are complete. You can proceed to visualize.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mv-footer">
          <button className="btn-skip" onClick={onSkip} disabled={loading}>
            Skip — keep all missings
          </button>
          <button className="btn-apply" onClick={handleApply} disabled={loading}>
            {loading ? 'Applying…' : hasMissings ? '↗ Apply & continue' : '↗ Continue'}
          </button>
        </div>

      </div>

      <style>{`
        .mv-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 200;
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

        .mv-modal {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 14px;
          width: 720px;
          max-width: calc(100vw - 32px);
          max-height: calc(100vh - 64px);
          display: flex; flex-direction: column;
          box-shadow: 0 24px 64px rgba(0,0,0,0.55);
          animation: slideUp 0.18s ease;
          overflow: hidden;
        }
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0 }
          to   { transform: translateY(0);    opacity: 1 }
        }

        /* Header */
        .mv-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: flex-start; gap: 14px;
          flex-shrink: 0;
        }
        .mv-header-left { display: flex; align-items: flex-start; gap: 14px; }
        .mv-icon {
          font-size: 1.3rem; color: #f5a623;
          line-height: 1.4; flex-shrink: 0;
        }
        .mv-title {
          font-family: var(--font-mono); font-size: 0.95rem;
          color: var(--text-primary); margin-bottom: 4px;
        }
        .mv-subtitle { font-size: 0.82rem; color: var(--text-muted); }

        /* Body */
        .mv-body {
          flex: 1; overflow-y: auto;
          padding: 20px 24px;
        }

        .mv-table {
          width: 100%; border-collapse: collapse;
          font-size: 0.84rem;
        }
        .mv-table th {
          font-family: var(--font-mono); font-size: 0.68rem;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: var(--text-muted); text-align: left;
          padding: 0 10px 10px 0; border-bottom: 1px solid var(--border);
        }
        .mv-table td {
          padding: 10px 10px 10px 0;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        .mv-table tr:last-child td { border-bottom: none; }

        .col-name { font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-primary); }
        .col-count { color: var(--text-primary); font-weight: 600; }
        .col-pct { min-width: 100px; }

        .badge {
          font-family: var(--font-mono); font-size: 0.68rem;
          padding: 2px 7px; border-radius: 20px;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .badge-num { background: rgba(100,200,255,0.12); color: #64c8ff; border: 1px solid rgba(100,200,255,0.2); }
        .badge-cat { background: rgba(200,130,255,0.12); color: #c882ff; border: 1px solid rgba(200,130,255,0.2); }

        .pct-bar-wrap {
          display: flex; align-items: center; gap: 8px;
        }
        .pct-bar {
          height: 4px; border-radius: 2px; flex-shrink: 0;
          min-width: 2px;
        }
        --warn-high: #ff6b6b;
        --warn-low: #f5a623;
        .pct-bar-wrap span { font-size: 0.78rem; color: var(--text-secondary); white-space: nowrap; }

        .mv-select {
          background: var(--bg-elevated); border: 1px solid var(--border);
          border-radius: 7px; color: var(--text-primary);
          padding: 6px 28px 6px 10px; font-size: 0.82rem;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238888a0' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 8px center;
          cursor: pointer; transition: border-color 0.15s;
        }
        .mv-select:focus { border-color: var(--accent); outline: none; }

        /* Clean state */
        .mv-clean {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 12px; padding: 40px;
          color: var(--text-muted); text-align: center; font-size: 0.88rem;
        }
        .mv-clean-icon { font-size: 2rem; color: #4caf7d; }

        /* Footer */
        .mv-footer {
          padding: 16px 24px 20px;
          border-top: 1px solid var(--border);
          display: flex; justify-content: flex-end; gap: 10px;
          flex-shrink: 0;
        }
        .btn-skip {
          background: var(--bg-elevated); color: var(--text-muted);
          border: 1px solid var(--border); border-radius: 8px;
          padding: 9px 18px; font-size: 0.85rem;
          transition: background 0.15s, color 0.15s;
        }
        .btn-skip:hover:not(:disabled) { color: var(--text-primary); border-color: var(--text-muted); }
        .btn-skip:disabled { opacity: 0.4; cursor: not-allowed; }

        .btn-apply {
          background: var(--accent); color: #0a0a0c;
          font-weight: 700; font-size: 0.88rem;
          padding: 9px 20px; border-radius: 8px;
          transition: opacity 0.15s, transform 0.1s;
        }
        .btn-apply:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .btn-apply:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>
    </div>
  )
}