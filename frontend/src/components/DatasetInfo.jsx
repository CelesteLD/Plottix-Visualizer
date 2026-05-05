import React from 'react'

function isNumericDtype(dtype) {
  const t = (dtype || '').toLowerCase()
  return t.includes('int') || t.includes('float') || t.includes('number')
}

export default function DatasetInfo({ info }) {
  const { columns, rows, dtypes } = info
  const numCount = columns.filter(c => isNumericDtype(dtypes[c])).length
  const catCount = columns.length - numCount

  return (
    <div className="dataset-info">
      <div className="info-header">
        <span className="info-stat"><span className="mono">{rows.toLocaleString()}</span> filas</span>
        <span className="info-divider">·</span>
        <span className="info-stat"><span className="mono">{columns.length}</span> columnas</span>
        <span className="info-divider">·</span>
        <span className="type-pill num">{numCount} numéricas</span>
        <span className="type-pill cat">{catCount} categóricas</span>
      </div>

      <div className="columns-grid">
        {columns.map((col) => {
          const num = isNumericDtype(dtypes[col])
          return (
            <div key={col} className={`col-chip ${num ? 'col-num' : 'col-cat'}`}>
              <span className="col-name">{col}</span>
              <span className="col-type">{dtypes[col]}</span>
            </div>
          )
        })}
      </div>

      <style>{`
        .dataset-info { display: flex; flex-direction: column; gap: 14px; }
        .info-header {
          display: flex; align-items: center; gap: 10px;
          font-size: 0.85rem; color: var(--text-secondary); flex-wrap: wrap;
        }
        .info-header .mono { color: var(--accent); font-size: 0.92rem; }
        .info-divider { color: var(--text-muted); }
        .type-pill {
          font-family: var(--font-mono); font-size: 0.67rem;
          padding: 2px 8px; border-radius: 20px;
        }
        .type-pill.num { background: rgba(14,168,126,0.10); color: var(--accent);   border: 1px solid rgba(14,168,126,0.25); }
        .type-pill.cat { background: rgba(91,80,214,0.10);  color: var(--accent-2); border: 1px solid rgba(91,80,214,0.25); }
        .columns-grid { display: flex; flex-wrap: wrap; gap: 7px; }
        .col-chip {
          display: flex; align-items: center; gap: 6px;
          background: var(--bg-elevated); border: 1px solid var(--border);
          border-radius: 6px; padding: 4px 10px; font-size: 0.8rem;
        }
        .col-chip.col-num { border-left: 2.5px solid var(--accent); }
        .col-chip.col-cat { border-left: 2.5px solid var(--accent-2); }
        .col-name { color: var(--text-primary); font-weight: 500; }
        .col-type { color: var(--text-muted); font-family: var(--font-mono); font-size: 0.68rem; }
      `}</style>
    </div>
  )
}
