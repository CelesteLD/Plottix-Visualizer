import React from 'react'

function isNum(dtype) {
  const t = (dtype || '').toLowerCase()
  return t.includes('int') || t.includes('float') || t.includes('number')
}

export default function DatasetInfo({ info }) {
  const { columns, dtypes } = info
  return (
    <div className="ds-info">
      <div className="ds-cols">
        {columns.map(col => (
          <span
            key={col}
            className={`ds-chip ${isNum(dtypes[col]) ? 'num' : 'cat'}`}
            title={dtypes[col]}
          >
            {col}
          </span>
        ))}
      </div>
      <style>{`
        .ds-info { margin-bottom: 0.5rem; }
        .ds-cols { display: flex; flex-wrap: wrap; gap: 5px; }
        .ds-chip {
          font-family: 'Space Mono', monospace; font-size: 0.65rem;
          padding: 2px 8px; border-radius: 4px; cursor: default;
          border-left: 2.5px solid transparent;
        }
        .ds-chip.num {
          background: rgba(0,212,170,0.07); color: var(--accent2);
          border-color: var(--accent2); border-left-color: var(--accent2);
        }
        .ds-chip.cat {
          background: rgba(91,106,247,0.07); color: var(--accent);
          border-left-color: var(--accent);
        }
      `}</style>
    </div>
  )
}
