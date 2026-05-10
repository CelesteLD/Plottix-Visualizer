import React from 'react'

const CATEGORY_META = {
  classification: { label: 'Clasificación', color: '#5B4FE8', bg: '#EEEAFF' },
  regression:     { label: 'Regresión',     color: '#059669', bg: '#E8F8F2' },
  clustering:     { label: 'Clustering',    color: '#D97706', bg: '#FFFBEB' },
}

export default function MLModelSelector({ availableModels, selectedModels, onChange }) {
  const toggle = value =>
    onChange(selectedModels.includes(value)
      ? selectedModels.filter(v => v !== value)
      : [...selectedModels, value])

  return (
    <div className="mls-wrap">
      {Object.entries(availableModels).map(([category, models]) => {
        const meta = CATEGORY_META[category] || { label: category, color: '#888', bg: '#F7F6F2' }
        return (
          <div key={category} className="mls-group">
            <div className="mls-group-header">
              <span className="mls-group-dot" style={{ background: meta.color }} />
              <span className="mls-group-label">{meta.label}</span>
            </div>
            {models.map(m => (
              <label key={m.value}
                className={`mls-option ${selectedModels.includes(m.value) ? 'selected' : ''}`}
                style={selectedModels.includes(m.value) ? { background: meta.bg, borderColor: meta.color } : {}}>
                <input type="checkbox"
                  checked={selectedModels.includes(m.value)}
                  onChange={() => toggle(m.value)} />
                <span style={selectedModels.includes(m.value) ? { color: meta.color } : {}}>{m.label}</span>
              </label>
            ))}
          </div>
        )
      })}

      {selectedModels.length > 0 && (
        <div className="mls-count">
          {selectedModels.length} modelo{selectedModels.length > 1 ? 's' : ''} seleccionado{selectedModels.length > 1 ? 's' : ''}
        </div>
      )}

      <style>{`
        .mls-wrap { display:flex; flex-direction:column; gap:14px; }
        .mls-group { display:flex; flex-direction:column; gap:4px; }
        .mls-group-header { display:flex; align-items:center; gap:6px; margin-bottom:4px; }
        .mls-group-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .mls-group-label { font-family:var(--font-mono); font-size:10px; text-transform:uppercase; letter-spacing:0.12em; color:var(--text-dim); }
        .mls-option {
          display:flex; align-items:center; gap:8px;
          padding:7px 10px; border-radius:8px;
          border:0.5px solid var(--border); cursor:pointer;
          font-size:12px; font-weight:500; color:var(--text-muted);
          transition:all 0.13s; user-select:none; background:var(--surface);
        }
        .mls-option:hover { border-color:var(--border2); background:var(--surface2); color:var(--text); }
        .mls-option input[type="checkbox"] { accent-color:var(--accent); width:13px; height:13px; flex-shrink:0; }
        .mls-count {
          font-family:var(--font-mono); font-size:11px; font-weight:500;
          color:var(--accent); background:var(--accent-light);
          border:0.5px solid var(--accent-mid);
          border-radius:20px; padding:4px 12px; text-align:center;
        }
      `}</style>
    </div>
  )
}
