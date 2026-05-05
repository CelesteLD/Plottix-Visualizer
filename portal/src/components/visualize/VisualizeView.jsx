import React, { useState, useEffect } from 'react'
import {
  plottixUpload, plottixHandleMissings,
  plottixGetChartTypes, plottixVisualize, plottixResultUrl, plottixResultHtmlUrl
} from '../../services/api'
import MissingValuesModal from './MissingValuesModal'
import ChartModal         from './ChartModal'
import ChartCard          from './ChartCard'

const STEP = { IDLE:'idle', MISSING:'missing', READY:'ready' }

export default function VisualizeView() {
  const [step,          setStep]          = useState(STEP.IDLE)
  const [session,       setSession]       = useState(null)
  const [chartTypes,    setChartTypes]    = useState([])
  const [charts,        setCharts]        = useState([])
  const [uploadLoading, setUploadLoading] = useState(false)
  const [missingLoad,   setMissingLoad]   = useState(false)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [modalLoading,  setModalLoading]  = useState(false)
  const [modalError,    setModalError]    = useState(null)
  const [globalError,   setGlobalError]   = useState(null)
  const [showInfo,      setShowInfo]      = useState(false)
  const [dragging,      setDragging]      = useState(false)
  const [filename,      setFilename]      = useState(null)

  useEffect(() => { plottixGetChartTypes().then(setChartTypes).catch(()=>{}) }, [])

  async function handleUpload(file) {
    if (!file) return
    setGlobalError(null); setSession(null); setCharts([])
    setStep(STEP.IDLE); setUploadLoading(true); setFilename(file.name)
    try {
      const info = await plottixUpload(file)
      setSession(info); setStep(STEP.MISSING)
    } catch(e) {
      setGlobalError(e.message)
    } finally { setUploadLoading(false) }
  }

  async function handleApplyMissings(strategies) {
    setMissingLoad(true)
    try {
      const r = await plottixHandleMissings(session.session_id, strategies)
      setSession(p => ({...p, rows:r.rows, missing_info:r.missing_info}))
      setStep(STEP.READY)
    } catch(e) {
      setGlobalError(e.message); setStep(STEP.READY)
    } finally { setMissingLoad(false) }
  }

  async function handleGenerate(config) {
    setModalError(null); setModalLoading(true)
    const xHidden = ['histogram','kde','violin','correlogram'].includes(config.chart_type)
    const defaultTitle = xHidden
      ? `Distribución de ${config.y_column || config.y_columns?.join(', ')}`
      : config.use_multi
        ? `${config.y_columns.join(', ')} por ${config.x_column}`
        : `${config.y_column} por ${config.x_column}`
    const title      = config.custom_title?.trim() || defaultTitle
    const chart_type = config.use_multi ? `multi_${config.chart_type}` : config.chart_type
    try {
      const result = await plottixVisualize({
        session_id:  session.session_id,
        chart_type,
        x_column:    config.x_column  || null,
        y_column:    config.y_column  || null,
        y_columns:   config.y_columns || [],
        aggregation: config.aggregation || 'mean',
        title,
      })
      const isInteractive = result.is_interactive
      setCharts(prev => [...prev, {
        id:             Date.now(),
        job_id:         result.job_id,
        title:          result.title,
        is_interactive: isInteractive,
        img_url:        isInteractive ? null : plottixResultUrl(result.job_id),
        html_url:       isInteractive ? plottixResultHtmlUrl(result.job_id) : null,
      }])
      setModalOpen(false)
    } catch(e) {
      setModalError(e.message)
    } finally { setModalLoading(false) }
  }

  const removeChart = id => setCharts(prev => prev.filter(c => c.id !== id))
  const totalMissing = session?.missing_info?.reduce((s,c) => s+c.missing_count,0) ?? 0

  // Classify columns for DatasetInfo chips
  const isNum = dtype => { const t=(dtype||'').toLowerCase(); return t.includes('int')||t.includes('float')||t.includes('number') }

  return (
    <div className="app-main">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <h3>Dataset</h3>
          {/* Upload drop zone */}
          <div
            className={`vz-upload ${dragging?'drag':''} ${uploadLoading?'busy':''} ${filename?'has-file':''}`}
            onClick={() => !uploadLoading && document.getElementById('vz-file-input').click()}
            onDragOver={e=>{e.preventDefault();setDragging(true)}}
            onDragLeave={()=>setDragging(false)}
            onDrop={e=>{e.preventDefault();setDragging(false);handleUpload(e.dataTransfer.files[0])}}
          >
            <input id="vz-file-input" type="file" accept=".csv,.tsv,.txt,.xlsx,.xls"
              style={{display:'none'}} onChange={e=>handleUpload(e.target.files[0])} />
            {uploadLoading
              ? <div className="vz-upload-inner"><div className="vz-spinner"/><span>Procesando…</span></div>
              : <div className="vz-upload-inner">
                  <span className="vz-up-icon">⬆</span>
                  <span className="vz-up-main">{filename || 'Arrastra o haz clic'}</span>
                  <span className="vz-up-sub">CSV · TSV · Excel</span>
                </div>
            }
          </div>
        </div>

        <div className="sidebar-scroll">
          {globalError && <div className="vz-error">⚠ {globalError}</div>}

          {session && (
            <>
              <div className="vz-stats">
                <div className="vz-stat">
                  <span className="vz-stat-val">{session.rows.toLocaleString()}</span>
                  <span className="vz-stat-lbl">filas</span>
                </div>
                <div className="vz-stat">
                  <span className="vz-stat-val">{session.columns.length}</span>
                  <span className="vz-stat-lbl">columnas</span>
                </div>
                {totalMissing > 0 && (
                  <div className="vz-stat warn">
                    <span className="vz-stat-val">{totalMissing}</span>
                    <span className="vz-stat-lbl">faltantes</span>
                  </div>
                )}
              </div>

              <button className="vz-info-toggle" onClick={()=>setShowInfo(v=>!v)}>
                {showInfo ? '▾ Ocultar columnas' : '▸ Ver columnas'}
              </button>

              {showInfo && (
                <div className="vz-cols">
                  {session.columns.map(col => (
                    <span key={col} className={`vz-chip ${isNum(session.dtypes[col])?'num':'cat'}`} title={session.dtypes[col]}>
                      {col}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {step === STEP.READY && (
            <div className="vz-count-row">
              <span className="vz-count-lbl">Gráficos activos</span>
              <span className="vz-count-badge">{charts.length}</span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <section className="content" style={{padding:'1.5rem 1.75rem', alignItems:'stretch'}}>
        {step === STEP.IDLE && (
          <div className="vz-empty">
            <div className="vz-empty-logo">◈</div>
            <h2>Plottix Visualizer</h2>
            <p>Sube un dataset CSV o Excel para explorar patrones.</p>
          </div>
        )}

        {step === STEP.READY && (
          <>
            <div className="vz-toolbar">
              <span className="vz-toolbar-title">
                {charts.length === 0 ? 'Añade un gráfico para comenzar' : `${charts.length} gráfico${charts.length>1?'s':''}`}
              </span>
              <button className="register-btn" style={{width:'auto',padding:'0.48rem 1.2rem'}}
                onClick={()=>{setModalError(null);setModalOpen(true)}}>
                + Añadir gráfico
              </button>
            </div>

            {charts.length > 0 && (
              <div className={`vz-grid layout-${Math.min(charts.length,2)}`}>
                {charts.map(chart => (
                  <ChartCard key={chart.id} chart={chart} onRemove={()=>removeChart(chart.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Modals ── */}
      {step === STEP.MISSING && session && (
        <MissingValuesModal
          missingInfo={session.missing_info}
          onApply={handleApplyMissings}
          onSkip={()=>setStep(STEP.READY)}
          loading={missingLoad}
        />
      )}
      {modalOpen && (
        <ChartModal
          columns={session.columns}
          dtypes={session.dtypes}
          chartTypes={chartTypes}
          loading={modalLoading}
          error={modalError}
          onGenerate={handleGenerate}
          onClose={()=>setModalOpen(false)}
        />
      )}

      <style>{`
        .vz-upload {
          border: 1.5px dashed var(--border2); border-radius: 8px; padding: 1rem 0.75rem;
          cursor: pointer; text-align: center; transition: border-color 0.15s, background 0.15s;
        }
        .vz-upload:hover,.vz-upload.drag { border-color: var(--accent); background: rgba(91,106,247,0.04); }
        .vz-upload.has-file { border-color: var(--accent2); border-style: solid; }
        .vz-upload.busy { cursor: not-allowed; opacity: 0.6; }
        .vz-upload-inner { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
        .vz-up-icon { font-size: 1.2rem; color: var(--accent); }
        .vz-up-main { font-family: 'Space Mono',monospace; font-size: 0.7rem; color: var(--text); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .vz-up-sub  { font-family: 'Space Mono',monospace; font-size: 0.6rem; color: var(--text-dim); }
        .vz-spinner { width: 24px; height: 24px; border: 2px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.75s linear infinite; }

        .vz-error { font-size: 0.78rem; color: var(--error); background: rgba(244,63,94,0.06); border: 1px solid rgba(244,63,94,0.2); border-radius: 8px; padding: 0.65rem 0.9rem; margin-bottom: 0.75rem; }

        .vz-stats { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
        .vz-stat { display: flex; flex-direction: column; align-items: center; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem 0.8rem; flex: 1; }
        .vz-stat.warn { border-color: rgba(245,158,11,0.3); }
        .vz-stat-val { font-family: 'Space Mono',monospace; font-size: 0.95rem; font-weight: 700; color: var(--accent2); }
        .vz-stat.warn .vz-stat-val { color: var(--warn); }
        .vz-stat-lbl { font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); font-family: 'Space Mono',monospace; }

        .vz-info-toggle { background: none; border: 1px solid var(--border2); border-radius: 6px; color: var(--text-muted); font-family: 'Space Mono',monospace; font-size: 0.68rem; padding: 0.4rem 0.75rem; cursor: pointer; width: 100%; text-align: left; margin-bottom: 0.75rem; transition: border-color 0.15s,color 0.15s; }
        .vz-info-toggle:hover { border-color: var(--accent); color: var(--accent); }

        .vz-cols { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 0.75rem; }
        .vz-chip { font-family: 'Space Mono',monospace; font-size: 0.62rem; padding: 2px 8px; border-radius: 4px; border-left: 2.5px solid transparent; }
        .vz-chip.num { background: rgba(0,212,170,0.07); color: var(--accent2); border-left-color: var(--accent2); }
        .vz-chip.cat { background: rgba(91,106,247,0.07); color: var(--accent); border-left-color: var(--accent); }

        .vz-count-row { display: flex; align-items: center; justify-content: space-between; padding: 0.55rem 0.75rem; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; margin-top: 0.5rem; }
        .vz-count-lbl { font-family: 'Space Mono',monospace; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); }
        .vz-count-badge { background: rgba(91,106,247,0.12); color: var(--accent); border: 1px solid rgba(91,106,247,0.3); border-radius: 20px; font-family: 'Space Mono',monospace; font-size: 0.7rem; font-weight: 700; padding: 0.12rem 0.6rem; }

        .vz-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 1rem; color: var(--text-muted); text-align: center; }
        .vz-empty-logo { width: 60px; height: 60px; background: linear-gradient(135deg,#a78bfa,#5b6af7); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #fff; }
        .vz-empty h2 { font-size: 1.3rem; font-weight: 700; color: var(--text); }
        .vz-empty p { font-size: 0.8rem; font-family: 'Space Mono',monospace; max-width: 300px; line-height: 1.7; }

        .vz-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.1rem; }
        .vz-toolbar-title { font-family: 'Space Mono',monospace; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); }

        .vz-grid { display: grid; gap: 1rem; align-items: start; }
        .vz-grid.layout-1 { grid-template-columns: 1fr; }
        .vz-grid.layout-2 { grid-template-columns: repeat(2,1fr); }
      `}</style>
    </div>
  )
}