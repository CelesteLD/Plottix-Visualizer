import React, { useState } from 'react'
import MLResultCard from './MLResultCard'

const CAT_COLOR = {
  classification: '#72BF78',
  regression:     '#5DCAA5',
  clustering:     '#D97706',
}
const G = { g1:'#72BF78', g2:'#A0D683', g3:'#D3EE98', ink2:'#2E4A28', ink4:'#8EAA88' }

export default function MLResultsPanel({ results, errors, config, selectedModels, onReset, filename, elbowData }) {
  const [activeModel, setActiveModel] = useState(null)
  const [pdfLoading,  setPdfLoading]  = useState(false)

  const PLOTTIX_URL = process.env.REACT_APP_PLOTTIX_URL || 'http://localhost:5002'

  async function handleExportPdf() {
    if (pdfLoading) return
    setPdfLoading(true)
    try {
      const payload = {
        filename:   filename || 'dataset',
        results:    results,
        elbow_data: elbowData || null,
        elbow_k:    config.n_clusters || null,
      }
      const res = await fetch(`${PLOTTIX_URL}/api/export-ml-pdf`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Error generando PDF')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${(filename || 'report').replace(/\.[^.]+$/, '')}_ml_report.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setPdfLoading(false)
    }
  }

  const bestOf = (category, metric, higher = true) => {
    const f = results.filter(r => r.category === category)
    if (!f.length) return null
    return f.reduce((best, r) => {
      const v  = r.metrics[metric] ?? (higher ? -Infinity : Infinity)
      const bv = best.metrics[metric] ?? (higher ? -Infinity : Infinity)
      return (higher ? v > bv : v < bv) ? r : best
    })
  }

  const bestClf  = bestOf('classification', 'accuracy')
  const bestReg  = bestOf('regression', 'r2')
  const bestClus = bestOf('clustering', 'silhouette_score')

  const primaryMetric = r => {
    if (r.category === 'classification') return { key: 'accuracy', label: 'Accuracy' }
    if (r.category === 'regression')     return { key: 'r2',       label: 'R²' }
    return                                      { key: 'silhouette_score', label: 'Silhouette' }
  }

  const selected = activeModel ? results.find(r => r.model_type === activeModel) : null

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>

      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', padding:'0 16px', borderBottom:'1px solid var(--border)', background:'var(--surface)', flexShrink:0, height:44, gap:6, flexWrap:'wrap' }}>
        <button
          onClick={() => setActiveModel(null)}
          style={{ padding:'4px 12px', borderRadius:7, fontSize:12, fontWeight:500, border:'1px solid transparent', cursor:'pointer', background: !activeModel ? 'var(--g3)' : 'none', color: !activeModel ? '#1A4A14' : 'var(--text-muted)', borderColor: !activeModel ? 'var(--border2)' : 'transparent' }}>
          Comparación
        </button>
        {results.map(r => (
          <button key={r.model_type}
            onClick={() => setActiveModel(r.model_type)}
            style={{ padding:'4px 12px', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer', border:`1px solid ${activeModel === r.model_type ? CAT_COLOR[r.category] : 'transparent'}`, background: activeModel === r.model_type ? `${CAT_COLOR[r.category]}14` : 'none', color: activeModel === r.model_type ? CAT_COLOR[r.category] : 'var(--text-muted)' }}>
            {r.label}
          </button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center' }}>
          <button
            onClick={handleExportPdf}
            disabled={pdfLoading}
            style={{ background:'none', border:'1px solid var(--border2)', borderRadius:7, color:'var(--accent2,#3A8C42)', fontSize:11, padding:'4px 11px', cursor:'pointer', display:'flex', alignItems:'center', gap:4, opacity: pdfLoading ? 0.5 : 1 }}>
            {pdfLoading ? '⏳ Generando…' : '↓ Exportar PDF'}
          </button>
          <button onClick={onReset} style={{ background:'none', border:'1px solid var(--border)', borderRadius:7, color:'var(--text-muted)', fontSize:11, padding:'4px 11px', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ fontSize:13 }}>↩</span> Nuevo experimento
          </button>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ padding:'8px 16px', flexShrink:0 }}>
          {errors.map(e => (
            <div key={e.model_type} style={{ background:'var(--error-light)', border:'1px solid var(--error-border)', color:'var(--error)', borderRadius:7, padding:'7px 12px', fontSize:12, marginBottom:4 }}>
              ⚠ {e.model_type}: {e.error}
            </div>
          ))}
        </div>
      )}

      {/* Detail view */}
      {selected && <MLResultCard result={selected} />}

      {/* Comparison view */}
      {!selected && (
        <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:14 }}>

          {/* Metric cards */}
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(results.length * 2, 4)}, 1fr)`, gap:10 }}>
            {results.map(r => {
              const pm = primaryMetric(r)
              const val = r.metrics[pm.key]
              const color = CAT_COLOR[r.category]
              return (
                <div key={r.model_type}
                  onClick={() => setActiveModel(r.model_type)}
                  style={{ background:'var(--surface)', border:`1px solid var(--border)`, borderRadius:10, padding:14, textAlign:'center', cursor:'pointer', transition:'border-color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:G.ink4, marginBottom:5 }}>{r.label}</div>
                  <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.06em', color:G.ink4, marginBottom:3 }}>{pm.label}</div>
                  <div style={{ fontSize:26, fontWeight:500, color }}>{typeof val === 'number' ? val.toFixed(3) : val ?? '—'}</div>
                  {typeof val === 'number' && val >= 0 && val <= 1 && (
                    <div style={{ marginTop:6, height:3, background:'var(--border)', borderRadius:2 }}>
                      <div style={{ height:'100%', width:`${val*100}%`, background:color, borderRadius:2 }} />
                    </div>
                  )}
                  <div style={{ fontSize:10, color:G.ink4, marginTop:4 }}>Ver detalle →</div>
                </div>
              )
            })}
          </div>

          {/* Feature importance side by side if available */}
          {results.some(r => r.feature_importances?.length > 0) && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
              <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:G.ink4, fontWeight:500, marginBottom:12 }}>Importancia de features</div>
              <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(results.filter(r => r.feature_importances?.length > 0).length, 2)}, 1fr)`, gap:16 }}>
                {results.filter(r => r.feature_importances?.length > 0).map(r => {
                  const items = r.feature_importances.slice(0, 7)
                  const maxVal = Math.max(...items.map(d => d.importance))
                  const color = CAT_COLOR[r.category]
                  return (
                    <div key={r.model_type}>
                      <div style={{ fontSize:11, fontWeight:500, color, marginBottom:8 }}>{r.label}</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                        {items.map((d, i) => (
                          <div key={d.feature} style={{ display:'flex', alignItems:'center', gap:7 }}>
                            <div style={{ fontSize:11, color:'var(--text-muted)', width:90, textAlign:'right', flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.feature}</div>
                            <div style={{ flex:1, height:14, background:'var(--bg)', borderRadius:2, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${maxVal > 0 ? (d.importance/maxVal)*100 : 0}%`, background: i===0 ? color : G.g2, borderRadius:2 }} />
                            </div>
                            <div style={{ fontSize:10, color:G.ink2, width:34, flexShrink:0 }}>{d.importance.toFixed(3)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Config summary */}
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:14 }}>
            <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.08em', color:G.ink4, fontWeight:500, marginBottom:10 }}>Configuración del experimento</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
              {config.target && (
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  <span style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:G.ink4 }}>Target</span>
                  <code style={{ fontSize:12, background:'var(--g3)', color:'#1A5014', padding:'2px 8px', borderRadius:5 }}>{config.target}</code>
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                <span style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:G.ink4 }}>Test size</span>
                <code style={{ fontSize:12, background:'var(--g3)', color:'#1A5014', padding:'2px 8px', borderRadius:5 }}>{Math.round(config.test_size * 100)}%</code>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                <span style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:G.ink4 }}>Modelos</span>
                <code style={{ fontSize:12, background:'var(--g3)', color:'#1A5014', padding:'2px 8px', borderRadius:5 }}>{results.length} entrenados</code>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:2, flex:1 }}>
                <span style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:G.ink4 }}>Features</span>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {config.features.map(f => (
                    <span key={f} style={{ fontSize:11, background:'var(--bg)', color:'var(--text-muted)', padding:'2px 7px', borderRadius:4, border:'1px solid var(--border)' }}>{f}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
