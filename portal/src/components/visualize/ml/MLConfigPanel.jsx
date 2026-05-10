import React, { useState } from 'react'

export default function MLConfigPanel({
  session, config, onChange, hasSupervised, hasClusteringSelected,
  elbowData, elbowLoading, onComputeElbow,
}) {
  const [selectedK, setSelectedK] = useState(null)
  const columns    = session?.columns || []
  const set        = (key, value) => onChange({ ...config, [key]: value })

  const toggleFeature = col =>
    set('features', config.features.includes(col)
      ? config.features.filter(c => c !== col)
      : [...config.features, col])

  const handlePickK = k => { setSelectedK(k); set('n_clusters', k) }

  return (
    <div className="mlcp-wrap">

      {/* Features */}
      <div className="mlcp-section">
        <label className="mlcp-label">Features (variables de entrada)</label>
        <div className="mlcp-chips">
          {columns.map(col => (
            <button
              key={col}
              className={`mlcp-chip ${config.features.includes(col) ? 'active' : ''}`}
              onClick={() => toggleFeature(col)}
              title={session?.dtypes?.[col]}
            >{col}</button>
          ))}
        </div>
        <span className="mlcp-hint">
          {config.features.length === 0
            ? 'Selecciona al menos una columna como feature.'
            : `${config.features.length} feature${config.features.length > 1 ? 's' : ''} seleccionada${config.features.length > 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Target */}
      {hasSupervised && (
        <div className="mlcp-section">
          <label className="mlcp-label">Target (variable objetivo)</label>
          <select className="mlcp-select" value={config.target} onChange={e => set('target', e.target.value)}>
            <option value="">— Selecciona columna objetivo —</option>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {/* Test size */}
      {hasSupervised && (
        <div className="mlcp-section mlcp-row">
          <label className="mlcp-label">Test size</label>
          <div className="mlcp-range-row">
            <input type="range" min="0.1" max="0.5" step="0.05"
              value={config.test_size}
              onChange={e => set('test_size', parseFloat(e.target.value))} />
            <span className="mlcp-range-val">{Math.round(config.test_size * 100)}%</span>
          </div>
        </div>
      )}

      {/* N estimators */}
      {hasSupervised && (
        <div className="mlcp-section mlcp-row">
          <label className="mlcp-label">Nº árboles (RF)</label>
          <input type="number" min="10" max="500" step="10"
            className="mlcp-num" value={config.n_estimators}
            onChange={e => set('n_estimators', parseInt(e.target.value))} />
        </div>
      )}

      {/* DBSCAN params */}
      {hasClusteringSelected && (
        <div className="mlcp-section">
          <label className="mlcp-label">Parámetros DBSCAN</label>
          <div className="mlcp-row" style={{gap:12}}>
            <span className="mlcp-hint">eps</span>
            <input type="number" min="0.01" max="10" step="0.1"
              className="mlcp-num" value={config.eps}
              onChange={e => set('eps', parseFloat(e.target.value))} />
            <span className="mlcp-hint">min_samples</span>
            <input type="number" min="2" max="50" step="1"
              className="mlcp-num" value={config.min_samples}
              onChange={e => set('min_samples', parseInt(e.target.value))} />
          </div>
        </div>
      )}

      {/* Elbow method */}
      {hasClusteringSelected && (
        <div className="mlcp-elbow-box">
          <label className="mlcp-label">
            Método del codo (K-Means) — elige el número óptimo de clusters
          </label>
          <button
            className="mlcp-elbow-btn"
            onClick={onComputeElbow}
            disabled={elbowLoading || config.features.length === 0}
          >
            {elbowLoading ? 'Calculando…' : '⬡ Calcular codo'}
          </button>

          {elbowData && (
            <>
              <div className="mlcp-elbow-chart">
                <ElbowChart data={elbowData.elbow} />
              </div>
              <div className="mlcp-k-row">
                <span className="mlcp-hint">Selecciona k:</span>
                {elbowData.elbow.slice(1).map(({ k }) => (
                  <button
                    key={k}
                    className={`mlcp-chip ${config.n_clusters === k ? 'active' : ''}`}
                    onClick={() => handlePickK(k)}
                  >k={k}</button>
                ))}
              </div>
              {config.n_clusters > 0 && (
                <span className="mlcp-hint" style={{color:'var(--accent2)'}}>
                  ✓ k = <strong>{config.n_clusters}</strong> seleccionado
                </span>
              )}
            </>
          )}
        </div>
      )}

      <style>{`
        .mlcp-wrap    { display:flex; flex-direction:column; gap:16px; }
        .mlcp-section { display:flex; flex-direction:column; gap:6px; }
        .mlcp-row     { flex-direction:row !important; align-items:center; gap:10px; }
        .mlcp-label   {
          font-family:'Space Mono',monospace; font-size:0.65rem;
          text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted);
        }
        .mlcp-hint { font-size:0.74rem; color:var(--text-dim); }

        .mlcp-chips { display:flex; flex-wrap:wrap; gap:5px; }
        .mlcp-chip  {
          padding:3px 10px; border-radius:20px;
          border:1px solid var(--border2);
          font-size:0.7rem; color:var(--text-dim);
          cursor:pointer; background:var(--surface2);
          font-family:'Space Mono',monospace;
          transition:all 0.13s;
        }
        .mlcp-chip:hover  { border-color:var(--accent); color:var(--text); }
        .mlcp-chip.active { background:rgba(91,106,247,0.12); border-color:var(--accent); color:var(--accent); }

        .mlcp-select {
          background:var(--surface2); border:1px solid var(--border2);
          color:var(--text); border-radius:7px;
          padding:7px 10px; font-size:0.8rem; width:100%;
        }
        .mlcp-num {
          background:var(--surface2); border:1px solid var(--border2);
          color:var(--text); border-radius:7px;
          padding:5px 8px; font-size:0.8rem; width:80px; text-align:right;
        }
        .mlcp-range-row { display:flex; align-items:center; gap:10px; flex:1; }
        .mlcp-range-row input[type="range"] { flex:1; accent-color:var(--accent); }
        .mlcp-range-val {
          font-family:'Space Mono',monospace; font-size:0.78rem;
          color:var(--accent); min-width:32px; text-align:right;
        }

        .mlcp-elbow-box {
          background:var(--surface2); border:1px solid var(--border);
          border-radius:10px; padding:14px;
          display:flex; flex-direction:column; gap:10px;
        }
        .mlcp-elbow-btn {
          align-self:flex-start;
          background:none; border:1px solid var(--border2);
          color:var(--text-dim); font-family:'Space Mono',monospace;
          font-size:0.72rem; padding:5px 12px; border-radius:6px;
          cursor:pointer; transition:all 0.15s;
        }
        .mlcp-elbow-btn:hover:not(:disabled) { border-color:var(--accent); color:var(--accent); }
        .mlcp-elbow-btn:disabled { opacity:0.4; cursor:not-allowed; }

        .mlcp-elbow-chart { margin-top:4px; }
        .mlcp-k-row { display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
      `}</style>
    </div>
  )
}

// ── Simple SVG elbow chart (no recharts dependency needed) ─────────────────

function ElbowChart({ data }) {
  if (!data || data.length < 2) return null
  const W = 320, H = 160, PAD = { top:10, right:10, bottom:28, left:52 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top  - PAD.bottom

  const xs      = data.map(d => d.k)
  const ys      = data.map(d => d.inertia)
  const minX    = Math.min(...xs), maxX = Math.max(...xs)
  const minY    = Math.min(...ys), maxY = Math.max(...ys)
  const scaleX  = k       => PAD.left + ((k - minX) / (maxX - minX || 1)) * iW
  const scaleY  = inertia => PAD.top  + iH - ((inertia - minY) / (maxY - minY || 1)) * iH

  const pathD = data.map((d, i) =>
    `${i === 0 ? 'M' : 'L'}${scaleX(d.k).toFixed(1)},${scaleY(d.inertia).toFixed(1)}`
  ).join(' ')

  // Y axis labels (3 ticks)
  const yTicks = [minY, (minY + maxY) / 2, maxY]
  const fmt    = v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0)

  return (
    <svg width={W} height={H} style={{ overflow:'visible', maxWidth:'100%' }}>
      {/* Grid lines */}
      {yTicks.map(v => (
        <line key={v}
          x1={PAD.left} x2={W - PAD.right}
          y1={scaleY(v)} y2={scaleY(v)}
          stroke="var(--border)" strokeDasharray="3 3" />
      ))}
      {/* Y axis labels */}
      {yTicks.map(v => (
        <text key={v} x={PAD.left - 6} y={scaleY(v) + 4}
          textAnchor="end" fontSize="9" fill="var(--text-muted)"
          fontFamily="'Space Mono',monospace">{fmt(v)}</text>
      ))}
      {/* X axis labels */}
      {data.map(d => (
        <text key={d.k} x={scaleX(d.k)} y={H - 6}
          textAnchor="middle" fontSize="9" fill="var(--text-muted)"
          fontFamily="'Space Mono',monospace">{d.k}</text>
      ))}
      {/* Line */}
      <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" />
      {/* Dots */}
      {data.map(d => (
        <circle key={d.k} cx={scaleX(d.k)} cy={scaleY(d.inertia)} r="4"
          fill="var(--accent)" />
      ))}
    </svg>
  )
}
