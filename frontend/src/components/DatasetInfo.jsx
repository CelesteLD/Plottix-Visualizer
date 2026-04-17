import React from 'react'

export default function DatasetInfo({ info }) {
  const { columns, rows, dtypes } = info

  return (
    <div className="dataset-info">
      <div className="info-header">
        <span className="info-stat"><span className="mono">{rows.toLocaleString()}</span> rows</span>
        <span className="info-divider">·</span>
        <span className="info-stat"><span className="mono">{columns.length}</span> columns</span>
      </div>

      <div className="columns-grid">
        {columns.map((col) => (
          <div key={col} className="col-chip">
            <span className="col-name">{col}</span>
            <span className="col-type">{dtypes[col]}</span>
          </div>
        ))}
      </div>

      <style>{`
        .dataset-info {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .info-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.88rem;
          color: var(--text-secondary);
        }
        .info-header .mono { color: var(--accent); font-size: 0.95rem; }
        .info-divider { color: var(--text-muted); }
        .columns-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .col-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 0.8rem;
        }
        .col-name { color: var(--text-primary); font-weight: 500; }
        .col-type {
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 0.7rem;
        }
      `}</style>
    </div>
  )
}
