import React, { useState } from 'react'

const STRATEGIES = [
  { value: 'none',       label: 'Mantener'         },
  { value: 'drop',       label: 'Eliminar filas'   },
  { value: 'mean',       label: 'Rellenar media'   },
  { value: 'median',     label: 'Rellenar mediana' },
  { value: 'mode',       label: 'Rellenar moda'    },
  { value: 'fill_empty', label: 'Valor por defecto'},
]

export default function MissingValuesModal({ missingInfo, onApply, onSkip, loading }) {
  const cols = missingInfo.filter(c => c.missing_count > 0)
  const [strategies, setStrategies] = useState(
    () => Object.fromEntries(cols.map(c => [c.column, 'none']))
  )

  const handleApply = () =>
    onApply(Object.entries(strategies).map(([column, strategy]) => ({ column, strategy })))

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h2>⚠ Valores faltantes detectados</h2>
          <button className="modal-close" onClick={onSkip}>✕</button>
        </div>

        <div className="modal-body">
          {cols.length === 0 ? (
            <p style={{ color: 'var(--accent2)', fontFamily: "'Space Mono',monospace", fontSize: '0.85rem' }}>
              ✓ Dataset limpio. Sin valores faltantes.
            </p>
          ) : (
            <table className="mv-table">
              <thead>
                <tr>
                  <th>Columna</th>
                  <th>Tipo</th>
                  <th>Faltantes</th>
                  <th>%</th>
                  <th>Estrategia</th>
                </tr>
              </thead>
              <tbody>
                {cols.map(col => (
                  <tr key={col.column}>
                    <td className="mv-col-name">{col.column}</td>
                    <td>
                      <span className={`mv-badge ${col.is_numeric ? 'num' : 'cat'}`}>
                        {col.is_numeric ? 'num' : 'cat'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text)', fontFamily: "'Space Mono',monospace" }}>
                      {col.missing_count.toLocaleString()}
                    </td>
                    <td>
                      <div className="mv-pct-wrap">
                        <div className="mv-pct-bar" style={{
                          width: `${Math.min(col.missing_pct, 100)}%`,
                          background: col.missing_pct > 30 ? 'var(--error)' : 'var(--warn)'
                        }} />
                        <span>{col.missing_pct}%</span>
                      </div>
                    </td>
                    <td>
                      <select
                        className="reg-select"
                        value={strategies[col.column]}
                        onChange={e => setStrategies(p => ({ ...p, [col.column]: e.target.value }))}
                      >
                        {STRATEGIES.filter(s =>
                          col.is_numeric || !['mean', 'median'].includes(s.value)
                        ).map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-footer">
          <button className="reg-cancel-btn" onClick={onSkip} disabled={loading}>
            Omitir
          </button>
          <button className="run-btn" onClick={handleApply} disabled={loading}
            style={{ padding: '0.62rem 1.5rem', fontSize: '0.8rem' }}>
            {loading ? 'Aplicando…' : cols.length > 0 ? '↗ Aplicar y continuar' : '↗ Continuar'}
          </button>
        </div>
      </div>

      <style>{`
        .mv-table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
        .mv-table th {
          font-family: 'Space Mono', monospace; font-size: 0.62rem;
          text-transform: uppercase; letter-spacing: 0.12em;
          color: var(--text-muted); text-align: left;
          padding: 0 10px 10px 0; border-bottom: 1px solid var(--border);
        }
        .mv-table td {
          padding: 9px 10px 9px 0; border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }
        .mv-table tr:last-child td { border-bottom: none; }
        .mv-col-name { font-family: 'Space Mono', monospace; font-size: 0.8rem; color: var(--text); }
        .mv-badge {
          font-family: 'Space Mono', monospace; font-size: 0.62rem;
          padding: 2px 6px; border-radius: 3px; text-transform: uppercase;
        }
        .mv-badge.num { background: rgba(0,212,170,0.1); color: var(--accent2); }
        .mv-badge.cat { background: rgba(91,106,247,0.1); color: var(--accent); }
        .mv-pct-wrap { display: flex; align-items: center; gap: 6px; }
        .mv-pct-bar { height: 4px; border-radius: 2px; min-width: 2px; flex-shrink: 0; }
        .mv-pct-wrap span {
          font-size: 0.75rem; color: var(--text-muted);
          font-family: 'Space Mono', monospace; white-space: nowrap;
        }
      `}</style>
    </div>
  )
}
