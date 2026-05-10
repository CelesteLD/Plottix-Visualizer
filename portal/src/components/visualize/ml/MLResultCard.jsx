import React from 'react'

const CLUSTER_COLORS = [
  '#6366f1','#f59e0b','#10b981','#ef4444','#3b82f6',
  '#a855f7','#14b8a6','#f97316','#ec4899','#84cc16',
]

export default function MLResultCard({ result }) {
  if (!result) return null
  return (
    <div className="mlrc-wrap">
      <MetricsRow metrics={result.metrics} category={result.category} />

      <div className="mlrc-charts">
        {result.category === 'classification' && <>
          {result.confusion_matrix && <ConfusionMatrix cm={result.confusion_matrix} />}
          {result.feature_importances?.length > 0 && <FeatureBar data={result.feature_importances} title="Importancia de features" />}
        </>}
        {result.category === 'regression' && <>
          {result.scatter       && <ScatterActualVsPred data={result.scatter} />}
          {result.feature_importances?.length > 0 && <FeatureBar data={result.feature_importances} title="Importancia de features" />}
        </>}
        {result.category === 'clustering' && <>
          {result.scatter       && <ClusterScatter data={result.scatter} variance={result.pca_variance} />}
          {result.cluster_sizes && <ClusterSizeBar  data={result.cluster_sizes} />}
        </>}
      </div>

      <details className="mlrc-details">
        <summary>Configuración usada</summary>
        <pre className="mlrc-pre">{JSON.stringify(result.config, null, 2)}</pre>
      </details>

      <style>{`
        .mlrc-wrap   { display:flex; flex-direction:column; gap:18px; padding:18px; overflow-y:auto; }
        .mlrc-charts { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:14px; }
        .mlrc-details summary {
          cursor:pointer; color:var(--text-muted);
          font-family:'Space Mono',monospace; font-size:0.65rem;
          text-transform:uppercase; letter-spacing:0.1em;
        }
        .mlrc-pre {
          background:var(--surface2); border:1px solid var(--border);
          border-radius:7px; padding:10px; font-size:0.74rem;
          overflow-x:auto; margin-top:8px; color:var(--text-dim);
        }
      `}</style>
    </div>
  )
}

// ── Metric tiles ────────────────────────────────────────────────────────────

function MetricsRow({ metrics, category }) {
  const tiles = []
  if (category === 'classification') {
    tiles.push({ l:'Accuracy',    v: metrics.accuracy })
    tiles.push({ l:'F1 weighted', v: metrics.f1_weighted })
    tiles.push({ l:'Clases',      v: metrics.n_classes })
    tiles.push({ l:'Train',       v: metrics.train_size })
    tiles.push({ l:'Test',        v: metrics.test_size })
  } else if (category === 'regression') {
    tiles.push({ l:'R²',   v: metrics.r2 })
    tiles.push({ l:'RMSE', v: metrics.rmse })
    tiles.push({ l:'MAE',  v: metrics.mae })
    tiles.push({ l:'Train',v: metrics.train_size })
    tiles.push({ l:'Test', v: metrics.test_size })
  } else {
    tiles.push({ l:'Silhouette', v: metrics.silhouette_score })
    tiles.push({ l:'Clusters',   v: metrics.n_clusters })
    if (metrics.inertia         !== undefined) tiles.push({ l:'Inercia',  v: metrics.inertia })
    if (metrics.n_noise_points  !== undefined) tiles.push({ l:'Ruido',    v: metrics.n_noise_points })
    tiles.push({ l:'Muestras',   v: metrics.n_samples })
  }
  return (
    <div className="mlrc-metrics">
      {tiles.map(t => (
        <div key={t.l} className="mlrc-tile">
          <div className="mlrc-tile-val">{t.v ?? '—'}</div>
          <div className="mlrc-tile-lbl">{t.l}</div>
        </div>
      ))}
      <style>{`
        .mlrc-metrics { display:flex; gap:8px; flex-wrap:wrap; }
        .mlrc-tile {
          flex:1; min-width:80px;
          background:var(--surface2); border:1px solid var(--border);
          border-radius:9px; padding:10px 12px; text-align:center;
        }
        .mlrc-tile-val {
          font-size:1.15rem; font-weight:700;
          color:var(--accent2); font-family:'Space Mono',monospace;
        }
        .mlrc-tile-lbl {
          font-size:0.6rem; color:var(--text-muted);
          text-transform:uppercase; letter-spacing:0.08em; margin-top:2px;
          font-family:'Space Mono',monospace;
        }
      `}</style>
    </div>
  )
}

// ── Confusion Matrix ────────────────────────────────────────────────────────

function ConfusionMatrix({ cm }) {
  const { labels, matrix } = cm
  if (!matrix?.length) return null
  const maxVal = Math.max(...matrix.flat())
  return (
    <div className="mlrc-box">
      <div className="mlrc-box-title">Matriz de confusión</div>
      <div style={{ overflowX:'auto' }}>
        <table className="mlrc-cm">
          <thead><tr>
            <th />
            {labels.map(l => <th key={l} className="mlrc-cm-lbl">{l}</th>)}
          </tr></thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <th className="mlrc-cm-lbl">{labels[i]}</th>
                {row.map((val, j) => {
                  const intensity = maxVal > 0 ? val / maxVal : 0
                  const bg = i === j
                    ? `rgba(99,102,241,${0.15 + intensity * 0.65})`
                    : `rgba(239,68,68,${intensity * 0.45})`
                  return (
                    <td key={j} className="mlrc-cm-cell"
                      style={{ background: bg, color: intensity > 0.5 ? '#fff' : 'var(--text)' }}>
                      {val}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        .mlrc-cm { border-collapse:collapse; font-size:0.78rem; width:100%; }
        .mlrc-cm-lbl { padding:5px 8px; font-size:0.68rem; color:var(--text-muted); font-weight:600; max-width:70px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .mlrc-cm-cell { padding:7px 10px; text-align:center; font-family:'Space Mono',monospace; font-weight:600; border:1px solid var(--border); }
      `}</style>
    </div>
  )
}

// ── Feature Importance Bar (SVG) ────────────────────────────────────────────

function FeatureBar({ data, title }) {
  if (!data?.length) return null
  const items  = [...data].slice(0, 10)
  const maxVal = Math.max(...items.map(d => d.importance))
  const BAR_H  = 20, GAP = 5, PAD_L = 110, PAD_R = 44, W = 320
  const H      = items.length * (BAR_H + GAP) + 10

  return (
    <div className="mlrc-box">
      <div className="mlrc-box-title">{title}</div>
      <svg width={W} height={H} style={{ maxWidth:'100%', overflow:'visible' }}>
        {items.map((d, i) => {
          const y    = i * (BAR_H + GAP)
          const barW = maxVal > 0 ? ((d.importance / maxVal) * (W - PAD_L - PAD_R)) : 0
          return (
            <g key={d.feature}>
              <text x={PAD_L - 6} y={y + BAR_H * 0.72}
                textAnchor="end" fontSize="10" fill="var(--text-dim)"
                fontFamily="'Space Mono',monospace"
                style={{ overflow:'hidden' }}>
                {d.feature.length > 14 ? d.feature.slice(0, 13) + '…' : d.feature}
              </text>
              <rect x={PAD_L} y={y} width={Math.max(barW, 2)} height={BAR_H}
                rx="3" fill="var(--accent)" fillOpacity="0.8" />
              <text x={PAD_L + barW + 4} y={y + BAR_H * 0.72}
                fontSize="9" fill="var(--text-muted)"
                fontFamily="'Space Mono',monospace">
                {d.importance.toFixed(3)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Predicted vs Actual (SVG scatter) ──────────────────────────────────────

function ScatterActualVsPred({ data }) {
  if (!data?.length) return null
  const W = 280, H = 220, PAD = { top:10, right:10, bottom:28, left:42 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top  - PAD.bottom

  const allVals = data.flatMap(d => [d.actual, d.predicted])
  const minV = Math.min(...allVals), maxV = Math.max(...allVals)
  const sx = v => PAD.left + ((v - minV) / (maxV - minV || 1)) * iW
  const sy = v => PAD.top  + iH - ((v - minV) / (maxV - minV || 1)) * iH
  const fmt = v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(1)

  return (
    <div className="mlrc-box">
      <div className="mlrc-box-title">Predicho vs Real</div>
      <svg width={W} height={H} style={{ maxWidth:'100%', overflow:'visible' }}>
        {/* Reference line */}
        <line x1={sx(minV)} y1={sy(minV)} x2={sx(maxV)} y2={sy(maxV)}
          stroke="var(--error)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
        {/* Points */}
        {data.map((d, i) => (
          <circle key={i} cx={sx(d.actual)} cy={sy(d.predicted)} r="2.5"
            fill="var(--accent)" fillOpacity="0.55" />
        ))}
        {/* Axis labels */}
        <text x={W/2} y={H - 2} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="'Space Mono',monospace">Real</text>
        <text x={10} y={H/2} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="'Space Mono',monospace"
          transform={`rotate(-90,10,${H/2})`}>Predicho</text>
      </svg>
      <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', textAlign:'center', marginTop:2 }}>
        Línea punteada = predicción perfecta
      </div>
    </div>
  )
}

// ── Cluster Scatter (SVG PCA 2D) ────────────────────────────────────────────

function ClusterScatter({ data, variance }) {
  if (!data?.length) return null
  const W = 280, H = 220, PAD = { top:10, right:10, bottom:28, left:36 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top  - PAD.bottom

  const xs = data.map(d => d.x), ys = data.map(d => d.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const sx = v => PAD.left + ((v - minX) / (maxX - minX || 1)) * iW
  const sy = v => PAD.top  + iH - ((v - minY) / (maxY - minY || 1)) * iH

  const pctVar = variance ? variance.map(v => `${(v*100).toFixed(1)}%`) : []

  return (
    <div className="mlrc-box">
      <div className="mlrc-box-title">
        Clusters (PCA 2D)
        {pctVar.length === 2 && <span style={{ fontWeight:400, marginLeft:6, fontSize:'0.62rem' }}>
          PC1 {pctVar[0]} · PC2 {pctVar[1]}
        </span>}
      </div>
      <svg width={W} height={H} style={{ maxWidth:'100%', overflow:'visible' }}>
        {data.map((d, i) => {
          const k     = d.cluster
          const color = k === -1 ? '#9ca3af' : CLUSTER_COLORS[k % CLUSTER_COLORS.length]
          return (
            <circle key={i} cx={sx(d.x)} cy={sy(d.y)} r="3"
              fill={color} fillOpacity="0.7" />
          )
        })}
        <text x={W/2} y={H - 2} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="'Space Mono',monospace">PC1</text>
        <text x={10}  y={H/2}  textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="'Space Mono',monospace"
          transform={`rotate(-90,10,${H/2})`}>PC2</text>
      </svg>
    </div>
  )
}

// ── Cluster size bar (SVG) ──────────────────────────────────────────────────

function ClusterSizeBar({ data }) {
  if (!data?.length) return null
  const items  = data.map(d => ({ name: d.cluster === -1 ? 'Ruido' : `C${d.cluster}`, size: d.size, noise: d.is_noise }))
  const maxVal = Math.max(...items.map(d => d.size))
  const BAR_W  = Math.max(24, Math.floor(260 / items.length) - 6)
  const W      = items.length * (BAR_W + 6) + 20
  const H      = 120, PAD_B = 22

  return (
    <div className="mlrc-box">
      <div className="mlrc-box-title">Tamaño de clusters</div>
      <svg width={W} height={H} style={{ maxWidth:'100%', overflow:'visible' }}>
        {items.map((d, i) => {
          const barH  = maxVal > 0 ? ((d.size / maxVal) * (H - PAD_B - 10)) : 0
          const x     = i * (BAR_W + 6) + 10
          const color = d.noise ? '#9ca3af' : CLUSTER_COLORS[i % CLUSTER_COLORS.length]
          return (
            <g key={d.name}>
              <rect x={x} y={H - PAD_B - barH} width={BAR_W} height={barH}
                rx="3" fill={color} fillOpacity="0.8" />
              <text x={x + BAR_W/2} y={H - 6} textAnchor="middle"
                fontSize="9" fill="var(--text-muted)" fontFamily="'Space Mono',monospace">{d.name}</text>
              <text x={x + BAR_W/2} y={H - PAD_B - barH - 3} textAnchor="middle"
                fontSize="9" fill="var(--text-dim)" fontFamily="'Space Mono',monospace">{d.size}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Shared box style ────────────────────────────────────────────────────────

const boxStyle = `
  .mlrc-box { background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:14px; }
  .mlrc-box-title { font-family:'Space Mono',monospace; font-size:0.63rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); margin-bottom:10px; }
`

// Inject shared styles once
if (typeof document !== 'undefined' && !document.getElementById('mlrc-shared')) {
  const s = document.createElement('style'); s.id = 'mlrc-shared'; s.textContent = boxStyle
  document.head.appendChild(s)
}
