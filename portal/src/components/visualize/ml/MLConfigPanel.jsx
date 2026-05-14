import React, { useState } from 'react'

export default function MLConfigPanel({
  session, config, onChange, hasSupervised, hasClusteringSelected,
  elbowData, elbowLoading, onComputeElbow,
}) {
  const [selectedK, setSelectedK] = useState(null)
  const columns = session?.columns || []
  const set = (key, value) => onChange({ ...config, [key]: value })

  const toggleFeature = col =>
    set('features', config.features.includes(col)
      ? config.features.filter(c => c !== col)
      : [...config.features, col])

  const handlePickK = k => { setSelectedK(k); set('n_clusters', k) }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Features */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--ink4,var(--text-dim))', fontWeight:500, marginBottom:8 }}>
          Features — variables de entrada
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {columns.map(col => {
            const active = config.features.includes(col)
            return (
              <div key={col}
                onClick={() => toggleFeature(col)}
                style={{
                  display:'flex', alignItems:'center', gap:4,
                  fontSize:11, padding:'3px 9px', borderRadius:20, cursor:'pointer',
                  background: active ? 'var(--g3,#D3EE98)' : '#F0F0F0',
                  color: active ? '#1A5014' : '#999',
                  border: `1px solid ${active ? 'var(--border2,#A0D683)' : '#ddd'}`,
                  transition:'all .13s',
                }}>
                <span style={{ fontSize:10 }}>{active ? '×' : '+'}</span>
                {col}
              </div>
            )
          })}
        </div>
        {config.features.length === 0
          ? <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:6 }}>Selecciona al menos una columna.</div>
          : <div style={{ fontSize:11, color:'var(--accent2,#3A8C42)', marginTop:6 }}>{config.features.length} feature{config.features.length > 1 ? 's' : ''} seleccionada{config.features.length > 1 ? 's' : ''}</div>
        }
      </div>

      {/* Target + N estimators side by side */}
      {hasSupervised && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-dim)', fontWeight:500, marginBottom:7 }}>Target — variable objetivo</div>
            <select
              style={{ width:'100%', border:'1px solid var(--border2,#A0D683)', borderRadius:7, padding:'7px 10px', background:'var(--bg,#F2F8ED)', fontSize:12, color:'var(--text)', outline:'none' }}
              value={config.target}
              onChange={e => set('target', e.target.value)}>
              <option value="">— Selecciona columna —</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-dim)', fontWeight:500, marginBottom:7 }}>Nº árboles (Random Forest)</div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ flex:1, height:5, background:'var(--border2,#A0D683)', borderRadius:3, position:'relative' }}>
                <div style={{ height:'100%', background:'var(--g1,#72BF78)', borderRadius:3, width:`${((config.n_estimators - 10) / 490) * 100}%` }} />
              </div>
              <input type="number" min="10" max="500" step="10"
                value={config.n_estimators}
                onChange={e => set('n_estimators', parseInt(e.target.value))}
                style={{ width:60, border:'1px solid var(--border2)', borderRadius:6, padding:'4px 7px', fontSize:12, textAlign:'center', background:'var(--bg)', color:'var(--text)' }} />
            </div>
          </div>
        </div>
      )}

      {/* Test size */}
      {hasSupervised && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-dim)', fontWeight:500 }}>Test size</div>
            <div style={{ fontSize:13, fontWeight:500, color:'var(--accent2,#3A8C42)' }}>{Math.round(config.test_size * 100)}%</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, color:'var(--text-dim)' }}>10%</span>
            <input type="range" min="0.1" max="0.5" step="0.05"
              value={config.test_size}
              onChange={e => set('test_size', parseFloat(e.target.value))}
              style={{ flex:1, accentColor:'var(--g1,#72BF78)' }} />
            <span style={{ fontSize:11, color:'var(--text-dim)' }}>50%</span>
          </div>
        </div>
      )}

      {/* DBSCAN */}
      {hasClusteringSelected && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-dim)', fontWeight:500, marginBottom:8 }}>Parámetros DBSCAN</div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:10, color:'var(--text-dim)', marginBottom:4 }}>eps</div>
              <input type="number" min="0.01" max="10" step="0.1"
                value={config.eps}
                onChange={e => set('eps', parseFloat(e.target.value))}
                style={{ width:72, border:'1px solid var(--border2)', borderRadius:6, padding:'5px 7px', fontSize:12, background:'var(--bg)', color:'var(--text)' }} />
            </div>
            <div>
              <div style={{ fontSize:10, color:'var(--text-dim)', marginBottom:4 }}>min_samples</div>
              <input type="number" min="2" max="50" step="1"
                value={config.min_samples}
                onChange={e => set('min_samples', parseInt(e.target.value))}
                style={{ width:72, border:'1px solid var(--border2)', borderRadius:6, padding:'5px 7px', fontSize:12, background:'var(--bg)', color:'var(--text)' }} />
            </div>
          </div>
        </div>
      )}

      {/* Elbow */}
      {hasClusteringSelected && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:14, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-dim)', fontWeight:500 }}>Método del codo — K-Means</div>
          <button
            onClick={onComputeElbow}
            disabled={elbowLoading || config.features.length === 0}
            style={{
              alignSelf:'flex-start', background:'none',
              border:'1px solid var(--border2)', borderRadius:7,
              color:'var(--text-muted)', fontSize:12, padding:'5px 12px',
              cursor:'pointer', opacity: (elbowLoading || config.features.length === 0) ? .4 : 1,
            }}>
            {elbowLoading ? 'Calculando…' : '⬡ Calcular codo'}
          </button>
          {elbowData && (
            <>
              <ElbowChart data={elbowData.elbow} />
              <div style={{ display:'flex', flexWrap:'wrap', gap:5, alignItems:'center' }}>
                <span style={{ fontSize:11, color:'var(--text-dim)' }}>Selecciona k:</span>
                {elbowData.elbow.slice(1).map(({ k }) => (
                  <div key={k}
                    onClick={() => handlePickK(k)}
                    style={{
                      padding:'2px 9px', borderRadius:20, cursor:'pointer', fontSize:11,
                      background: config.n_clusters === k ? 'var(--g3)' : 'var(--bg)',
                      color: config.n_clusters === k ? '#1A5014' : 'var(--text-dim)',
                      border: `1px solid ${config.n_clusters === k ? 'var(--border2)' : 'var(--border)'}`,
                    }}>k={k}</div>
                ))}
              </div>
              {config.n_clusters > 0 && (
                <span style={{ fontSize:11, color:'var(--accent2,#3A8C42)' }}>✓ k = <strong>{config.n_clusters}</strong> seleccionado</span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ElbowChart({ data }) {
  if (!data || data.length < 2) return null
  const W = 320, H = 160, PAD = { top:10, right:10, bottom:28, left:52 }
  const iW = W - PAD.left - PAD.right
  const iH = H - PAD.top - PAD.bottom
  const xs = data.map(d => d.k), ys = data.map(d => d.inertia)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const scaleX = k => PAD.left + ((k - minX) / (maxX - minX || 1)) * iW
  const scaleY = v => PAD.top + iH - ((v - minY) / (maxY - minY || 1)) * iH
  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(d.k).toFixed(1)},${scaleY(d.inertia).toFixed(1)}`).join(' ')
  const yTicks = [minY, (minY + maxY) / 2, maxY]
  const fmt = v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)
  return (
    <svg width={W} height={H} style={{ overflow:'visible', maxWidth:'100%' }}>
      {yTicks.map(v => <line key={v} x1={PAD.left} x2={W - PAD.right} y1={scaleY(v)} y2={scaleY(v)} stroke="var(--border)" strokeDasharray="3 3" />)}
      {yTicks.map(v => <text key={v} x={PAD.left - 6} y={scaleY(v) + 4} textAnchor="end" fontSize="9" fill="var(--text-dim)">{fmt(v)}</text>)}
      {data.map(d => <text key={d.k} x={scaleX(d.k)} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--text-dim)">{d.k}</text>)}
      <path d={pathD} fill="none" stroke="var(--g1,#72BF78)" strokeWidth="2" />
      {data.map(d => <circle key={d.k} cx={scaleX(d.k)} cy={scaleY(d.inertia)} r="4" fill="var(--g1,#72BF78)" />)}
    </svg>
  )
}
