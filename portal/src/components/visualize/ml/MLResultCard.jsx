import React from 'react'

const CLUSTER_COLORS = ['#72BF78','#D97706','#5DCAA5','#A0D683','#3A8C42','#F59E0B','#1D9E75','#E67E22']
const G = { g1:'#72BF78', g2:'#A0D683', g3:'#D3EE98', ink2:'#2E4A28', ink4:'#8EAA88' }

export default function MLResultCard({ result }) {
  if (!result) return null
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, padding:16, overflowY:'auto' }}>
      <MetricsRow metrics={result.metrics} category={result.category} />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {result.category === 'classification' && <>
          {result.feature_importances?.length > 0 && <FeatureBar data={result.feature_importances} />}
          {result.confusion_matrix && <ConfusionMatrix cm={result.confusion_matrix} />}
        </>}
        {result.category === 'regression' && <>
          {result.feature_importances?.length > 0 && <FeatureBar data={result.feature_importances} />}
          {result.scatter && <ScatterActualVsPred data={result.scatter} />}
        </>}
        {result.category === 'clustering' && <>
          {result.scatter && <ClusterScatter data={result.scatter} variance={result.pca_variance} />}
          {result.cluster_sizes && <ClusterSizeBar data={result.cluster_sizes} />}
        </>}
      </div>
      <details style={{ marginTop:4 }}>
        <summary style={{ cursor:'pointer', fontSize:11, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'.08em' }}>Configuración usada</summary>
        <pre style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:7, padding:10, fontSize:11, overflow:'auto', marginTop:6, color:'var(--text-dim)' }}>{JSON.stringify(result.config, null, 2)}</pre>
      </details>
    </div>
  )
}

function MetricsRow({ metrics, category }) {
  const tiles = []
  if (category === 'classification') {
    tiles.push({ l:'Accuracy', v: metrics.accuracy, main:true })
    tiles.push({ l:'F1 weighted', v: metrics.f1_weighted, main:true })
    tiles.push({ l:'Clases', v: metrics.n_classes })
    tiles.push({ l:'Train', v: metrics.train_size })
    tiles.push({ l:'Test', v: metrics.test_size })
  } else if (category === 'regression') {
    tiles.push({ l:'R²', v: metrics.r2, main:true })
    tiles.push({ l:'RMSE', v: metrics.rmse })
    tiles.push({ l:'MAE', v: metrics.mae })
    tiles.push({ l:'Train', v: metrics.train_size })
    tiles.push({ l:'Test', v: metrics.test_size })
  } else {
    tiles.push({ l:'Silhouette', v: metrics.silhouette_score, main:true })
    tiles.push({ l:'Clusters', v: metrics.n_clusters })
    if (metrics.inertia !== undefined) tiles.push({ l:'Inercia', v: metrics.inertia })
    if (metrics.n_noise_points !== undefined) tiles.push({ l:'Ruido', v: metrics.n_noise_points })
    tiles.push({ l:'Muestras', v: metrics.n_samples })
  }
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${tiles.length}, 1fr)`, gap:8 }}>
      {tiles.map(t => (
        <div key={t.l} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 8px', textAlign:'center' }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--text-dim)', marginBottom:5 }}>{t.l}</div>
          <div style={{ fontSize: t.main ? 26 : 20, fontWeight:500, color: t.main ? G.g1 : G.ink2 }}>{t.v ?? '—'}</div>
          {t.main && typeof t.v === 'number' && t.v <= 1 && (
            <div style={{ marginTop:5, height:3, background:'var(--border)', borderRadius:2 }}>
              <div style={{ height:'100%', width:`${t.v*100}%`, background:G.g1, borderRadius:2 }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function Box({ title, children }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:14, display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-dim)', fontWeight:500 }}>{title}</div>
      {children}
    </div>
  )
}

function FeatureBar({ data }) {
  if (!data?.length) return null
  const items = [...data].slice(0, 8)
  const maxVal = Math.max(...items.map(d => d.importance))
  return (
    <Box title="Importancia de features">
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {items.map((d, i) => {
          const pct = maxVal > 0 ? (d.importance / maxVal) * 100 : 0
          const color = i === 0 ? G.g1 : i <= 2 ? G.g2 : G.g3
          return (
            <div key={d.feature} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', width:100, textAlign:'right', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.feature}</div>
              <div style={{ flex:1, height:16, background:'var(--bg)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3 }} />
              </div>
              <div style={{ fontSize:11, fontWeight:500, color:G.ink2, width:38, flexShrink:0 }}>{d.importance.toFixed(3)}</div>
            </div>
          )
        })}
      </div>
    </Box>
  )
}

function ConfusionMatrix({ cm }) {
  const { labels, matrix } = cm
  if (!matrix?.length) return null
  const maxVal = Math.max(...matrix.flat())
  const top = labels.length > 6 ? 6 : labels.length
  const topLabels = labels.slice(0, top)
  const topMatrix = matrix.slice(0, top).map(r => r.slice(0, top))
  return (
    <Box title={`Matriz de confusión${labels.length > 6 ? ` · top ${top} de ${labels.length}` : ''}`}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ borderCollapse:'collapse', fontSize:11, width:'100%' }}>
          <thead>
            <tr>
              <th style={{ padding:'4px 6px', fontSize:9, color:'var(--text-dim)', textAlign:'left' }}>Real \ Pred</th>
              {topLabels.map(l => <th key={l} style={{ padding:'4px 5px', fontSize:9, color:'var(--text-dim)', maxWidth:60, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.length > 8 ? l.slice(0,7)+'…' : l}</th>)}
            </tr>
          </thead>
          <tbody>
            {topMatrix.map((row, i) => (
              <tr key={i}>
                <th style={{ padding:'4px 6px', fontSize:9, color:'var(--text-dim)', textAlign:'right', fontWeight:500, maxWidth:60, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{topLabels[i].length > 8 ? topLabels[i].slice(0,7)+'…' : topLabels[i]}</th>
                {row.map((val, j) => {
                  const diag = i === j
                  const intensity = maxVal > 0 ? val / maxVal : 0
                  const bg = diag
                    ? `rgba(114,191,120,${0.15 + intensity * 0.65})`
                    : val > 0 ? `rgba(220,38,38,${intensity * 0.35})` : 'transparent'
                  return (
                    <td key={j} style={{ padding:'5px', textAlign:'center', background:bg, border:'1px solid var(--border)', fontWeight: diag && val > 0 ? 500 : 400, color: diag && intensity > 0.5 ? '#1A5014' : 'var(--text-muted)', fontSize:11 }}>
                      {val}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize:10, color:'var(--text-dim)', textAlign:'center' }}>Verde = predicción correcta</div>
    </Box>
  )
}

function ScatterActualVsPred({ data }) {
  if (!data?.length) return null
  const W = 280, H = 220, PAD = { top:10, right:10, bottom:28, left:42 }
  const iW = W - PAD.left - PAD.right, iH = H - PAD.top - PAD.bottom
  const allVals = data.flatMap(d => [d.actual, d.predicted])
  const minV = Math.min(...allVals), maxV = Math.max(...allVals)
  const sx = v => PAD.left + ((v - minV) / (maxV - minV || 1)) * iW
  const sy = v => PAD.top + iH - ((v - minV) / (maxV - minV || 1)) * iH
  return (
    <Box title="Predicho vs Real">
      <svg width={W} height={H} style={{ maxWidth:'100%', overflow:'visible' }}>
        <line x1={sx(minV)} y1={sy(minV)} x2={sx(maxV)} y2={sy(maxV)} stroke="#D97706" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
        {data.map((d, i) => <circle key={i} cx={sx(d.actual)} cy={sy(d.predicted)} r="2.5" fill={G.g1} fillOpacity="0.55" />)}
        <text x={W/2} y={H-2} textAnchor="middle" fontSize="9" fill={G.ink4}>Real</text>
        <text x={10} y={H/2} textAnchor="middle" fontSize="9" fill={G.ink4} transform={`rotate(-90,10,${H/2})`}>Predicho</text>
      </svg>
      <div style={{ fontSize:10, color:'var(--text-dim)', textAlign:'center' }}>Línea = predicción perfecta</div>
    </Box>
  )
}

function ClusterScatter({ data, variance }) {
  if (!data?.length) return null
  const W = 280, H = 220, PAD = { top:10, right:10, bottom:28, left:36 }
  const iW = W - PAD.left - PAD.right, iH = H - PAD.top - PAD.bottom
  const xs = data.map(d => d.x), ys = data.map(d => d.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const sx = v => PAD.left + ((v - minX) / (maxX - minX || 1)) * iW
  const sy = v => PAD.top + iH - ((v - minY) / (maxY - minY || 1)) * iH
  const pctVar = variance ? variance.map(v => `${(v*100).toFixed(1)}%`) : []
  return (
    <Box title={`Clusters (PCA 2D)${pctVar.length === 2 ? ` · PC1 ${pctVar[0]} PC2 ${pctVar[1]}` : ''}`}>
      <svg width={W} height={H} style={{ maxWidth:'100%', overflow:'visible' }}>
        {data.map((d, i) => {
          const color = d.cluster === -1 ? '#9ca3af' : CLUSTER_COLORS[d.cluster % CLUSTER_COLORS.length]
          return <circle key={i} cx={sx(d.x)} cy={sy(d.y)} r="3" fill={color} fillOpacity="0.7" />
        })}
        <text x={W/2} y={H-2} textAnchor="middle" fontSize="9" fill={G.ink4}>PC1</text>
        <text x={10} y={H/2} textAnchor="middle" fontSize="9" fill={G.ink4} transform={`rotate(-90,10,${H/2})`}>PC2</text>
      </svg>
    </Box>
  )
}

function ClusterSizeBar({ data }) {
  if (!data?.length) return null
  const items = data.map(d => ({ name: d.cluster === -1 ? 'Ruido' : `C${d.cluster}`, size: d.size, noise: d.is_noise }))
  const maxVal = Math.max(...items.map(d => d.size))
  const BAR_W = Math.max(24, Math.floor(260 / items.length) - 6)
  const W = items.length * (BAR_W + 6) + 20, H = 120, PAD_B = 22
  return (
    <Box title="Tamaño de clusters">
      <svg width={W} height={H} style={{ maxWidth:'100%', overflow:'visible' }}>
        {items.map((d, i) => {
          const barH = maxVal > 0 ? ((d.size / maxVal) * (H - PAD_B - 10)) : 0
          const x = i * (BAR_W + 6) + 10
          const color = d.noise ? '#9ca3af' : CLUSTER_COLORS[i % CLUSTER_COLORS.length]
          return (
            <g key={d.name}>
              <rect x={x} y={H - PAD_B - barH} width={BAR_W} height={barH} rx="3" fill={color} fillOpacity="0.85" />
              <text x={x + BAR_W/2} y={H-6} textAnchor="middle" fontSize="9" fill={G.ink4}>{d.name}</text>
              <text x={x + BAR_W/2} y={H - PAD_B - barH - 3} textAnchor="middle" fontSize="9" fill={G.ink4}>{d.size}</text>
            </g>
          )
        })}
      </svg>
    </Box>
  )
}
