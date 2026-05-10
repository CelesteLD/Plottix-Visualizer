import React, { useState, useEffect } from 'react'
import {
  plottixUpload, plottixHandleMissings,
  plottixGetChartTypes, plottixVisualize, plottixResultUrl, plottixResultHtmlUrl,
  plottixGetMLModels, plottixMLElbow, plottixMLTrain,
} from '../../services/api'
import MissingValuesModal from './MissingValuesModal'
import ChartModal         from './ChartModal'
import ChartCard          from './ChartCard'
import MLModelSelector    from './ml/MLModelSelector'
import MLConfigPanel      from './ml/MLConfigPanel'
import MLResultsPanel     from './ml/MLResultsPanel'

const STEP    = { IDLE: 'idle', MISSING: 'missing', READY: 'ready' }
const TAB     = { CHARTS: 'charts', ML: 'ml' }
const ML_STEP = { CONFIG: 'config', TRAINING: 'training', RESULTS: 'results' }

export default function VisualizeView() {
  const [step,          setStep]          = useState(STEP.IDLE)
  const [activeTab,     setActiveTab]     = useState(TAB.CHARTS)
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

  const [mlStep,          setMlStep]          = useState(ML_STEP.CONFIG)
  const [availableModels, setAvailableModels] = useState(null)
  const [selectedModels,  setSelectedModels]  = useState([])
  const [mlConfig,        setMlConfig]        = useState({
    target: '', features: [], test_size: 0.2,
    n_estimators: 100, n_neighbors: 5, alpha: 1.0,
    n_clusters: 3, eps: 0.5, min_samples: 5,
  })
  const [elbowData,       setElbowData]       = useState(null)
  const [elbowLoading,    setElbowLoading]    = useState(false)
  const [trainingResults, setTrainingResults] = useState(null)
  const [trainingErrors,  setTrainingErrors]  = useState([])
  const [mlError,         setMlError]         = useState(null)
  const [mlExperimentLog, setMlExperimentLog] = useState([])

  useEffect(() => { plottixGetChartTypes().then(setChartTypes).catch(() => {}) }, [])
  useEffect(() => { plottixGetMLModels().then(setAvailableModels).catch(() => {}) }, [])

  async function handleUpload(file) {
    if (!file) return
    setGlobalError(null); setSession(null); setCharts([])
    setStep(STEP.IDLE); setUploadLoading(true); setFilename(file.name)
    setMlStep(ML_STEP.CONFIG); setTrainingResults(null)
    setElbowData(null); setSelectedModels([]); setMlError(null)
    try {
      const info = await plottixUpload(file)
      setSession(info); setStep(STEP.MISSING)
    } catch (e) { setGlobalError(e.message) }
    finally { setUploadLoading(false) }
  }

  async function handleApplyMissings(strategies) {
    setMissingLoad(true)
    try {
      const r = await plottixHandleMissings(session.session_id, strategies)
      setSession(p => ({ ...p, rows: r.rows, missing_info: r.missing_info }))
      setStep(STEP.READY)
    } catch (e) { setGlobalError(e.message); setStep(STEP.READY) }
    finally { setMissingLoad(false) }
  }

  async function handleGenerate(config) {
    setModalError(null); setModalLoading(true)
    const xHidden    = ['histogram', 'kde', 'violin', 'correlogram'].includes(config.chart_type)
    const defaultTitle = xHidden
      ? `Distribución de ${config.y_column || config.y_columns?.join(', ')}`
      : config.use_multi
        ? `${config.y_columns.join(', ')} por ${config.x_column}`
        : `${config.y_column} por ${config.x_column}`
    const title      = config.custom_title?.trim() || defaultTitle
    const chart_type = config.use_multi ? `multi_${config.chart_type}` : config.chart_type
    try {
      const result = await plottixVisualize({
        session_id: session.session_id, chart_type,
        x_column: config.x_column || null, y_column: config.y_column || null,
        y_columns: config.y_columns || [], aggregation: config.aggregation || 'mean', title,
      })
      setCharts(prev => [...prev, {
        id: Date.now(), job_id: result.job_id, title: result.title,
        is_interactive: result.is_interactive,
        img_url:  result.is_interactive ? null : plottixResultUrl(result.job_id),
        html_url: result.is_interactive ? plottixResultHtmlUrl(result.job_id) : null,
      }])
      setModalOpen(false)
    } catch (e) { setModalError(e.message) }
    finally { setModalLoading(false) }
  }

  const hasClusteringSelected = selectedModels.some(mt => ['kmeans', 'dbscan'].includes(mt))
  const hasSupervised         = selectedModels.some(mt => !['kmeans', 'dbscan'].includes(mt))

  async function handleComputeElbow() {
    if (mlConfig.features.length < 1) { setMlError('Selecciona al menos una feature.'); return }
    setMlError(null); setElbowLoading(true)
    try {
      const result = await plottixMLElbow({ session_id: session.session_id, features: mlConfig.features, max_k: 10 })
      setElbowData(result)
    } catch (e) { setMlError(e.message) }
    finally { setElbowLoading(false) }
  }

  async function handleTrain() {
    setMlError(null)
    if (!selectedModels.length)            { setMlError('Selecciona al menos un modelo.'); return }
    if (hasSupervised && !mlConfig.target) { setMlError('Los modelos supervisados requieren una columna objetivo.'); return }
    if (!mlConfig.features.length)         { setMlError('Selecciona al menos una feature.'); return }
    setMlStep(ML_STEP.TRAINING)
    try {
      const result = await plottixMLTrain({ session_id: session.session_id, model_types: selectedModels, ...mlConfig })
      setTrainingResults(result.results)
      setTrainingErrors(result.errors)
      setMlExperimentLog(prev => [...prev, {
        id: Date.now(),
        models: selectedModels,
        target: mlConfig.target,
        features: mlConfig.features,
        results: result.results,
        ts: new Date().toLocaleTimeString(),
      }])
      setMlStep(ML_STEP.RESULTS)
    } catch (e) { setMlError(e.message); setMlStep(ML_STEP.CONFIG) }
  }

  function handleMLReset() {
    setMlStep(ML_STEP.CONFIG); setTrainingResults(null)
    setTrainingErrors([]); setElbowData(null); setMlError(null)
  }

  const removeChart  = id => setCharts(prev => prev.filter(c => c.id !== id))
  const totalMissing = session?.missing_info?.reduce((s, c) => s + c.missing_count, 0) ?? 0
  const isNum        = dtype => { const t = (dtype || '').toLowerCase(); return t.includes('int') || t.includes('float') || t.includes('number') }

  return (
    <div className="app-main">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <h3>Dataset</h3>
          <div
            className={`vz-upload ${dragging ? 'drag' : ''} ${uploadLoading ? 'busy' : ''} ${filename ? 'has-file' : ''}`}
            onClick={() => !uploadLoading && document.getElementById('vz-file-input').click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); handleUpload(e.dataTransfer.files[0]) }}
          >
            <input id="vz-file-input" type="file" accept=".csv,.tsv,.txt,.xlsx,.xls"
              style={{ display: 'none' }} onChange={e => handleUpload(e.target.files[0])} />
            {uploadLoading
              ? <div className="vz-upload-inner"><div className="vz-spinner" /><span>Procesando…</span></div>
              : <div className="vz-upload-inner">
                  <span className="vz-up-icon">⬆</span>
                  <span className="vz-up-name">{filename || 'Arrastra o haz clic'}</span>
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
                  <div className="vz-stat-val" style={{ color: 'var(--accent)' }}>{session.rows.toLocaleString()}</div>
                  <div className="vz-stat-lbl">filas</div>
                </div>
                <div className="vz-stat">
                  <div className="vz-stat-val" style={{ color: 'var(--accent2)' }}>{session.columns.length}</div>
                  <div className="vz-stat-lbl">columnas</div>
                </div>
              </div>

              <button className="vz-info-toggle" onClick={() => setShowInfo(v => !v)}>
                {showInfo ? '▾ Ocultar columnas' : '▸ Ver columnas'}
              </button>

              {showInfo && (
                <div className="vz-cols">
                  {session.columns.map(col => (
                    <span key={col}
                      className={`vz-chip ${isNum(session.dtypes[col]) ? 'num' : 'cat'}`}
                      title={session.dtypes[col]}>
                      {col}
                    </span>
                  ))}
                  <div className="vz-chip-legend">
                    <span><span className="dot num-dot" />numérica</span>
                    <span><span className="dot cat-dot" />categórica</span>
                  </div>
                </div>
              )}

              {totalMissing > 0 && (
                <div className="vz-missing-box">
                  <div className="vz-missing-header">
                    <span>⚠ Valores faltantes</span>
                    <span className="vz-missing-total">{totalMissing}</span>
                  </div>
                  {session.missing_info.filter(c => c.missing_count > 0).map(c => (
                    <div key={c.column} className="vz-missing-row">
                      <span className="vz-missing-col">{c.column}</span>
                      <span className="vz-missing-pct">{c.missing_pct}%</span>
                    </div>
                  ))}
                </div>
              )}

              {step === STEP.READY && (
                <div className="vz-count-row">
                  <span>Gráficos activos</span>
                  <span className="vz-count-badge">{charts.length}</span>
                </div>
              )}

              {mlExperimentLog.length > 0 && activeTab === TAB.ML && (
                <div className="vz-exp-log">
                  <span className="sidebar-label">Historial ML</span>
                  {mlExperimentLog.slice(-3).reverse().map(e => (
                    <div key={e.id} className="vz-exp-entry">
                      <span className="vz-exp-time">{e.ts}</span>
                      <span className="vz-exp-models">{e.models.length} modelo{e.models.length > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <section className="vz-main-panel">

        {/* Tab bar */}
        {step === STEP.READY && (
          <div className="vz-tab-bar">
            <div className="vz-tabs">
              <button
                className={`vz-tab ${activeTab === TAB.CHARTS ? 'active' : ''}`}
                onClick={() => setActiveTab(TAB.CHARTS)}>
                📊 Visualización
              </button>
              <button
                className={`vz-tab ${activeTab === TAB.ML ? 'active' : ''}`}
                onClick={() => setActiveTab(TAB.ML)}>
                ⚙ Machine Learning
              </button>
            </div>
            {activeTab === TAB.CHARTS && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn-ghost" onClick={() => setShowInfo(v => !v)}>
                  {showInfo ? 'Ocultar cols' : 'Ver cols'}
                </button>
                <button className="register-btn" style={{ width: 'auto', padding: '7px 16px' }}
                  onClick={() => { setModalError(null); setModalOpen(true) }}>
                  + Añadir gráfico
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Visualization tab ───────────────────────────── */}
        {(step !== STEP.READY || activeTab === TAB.CHARTS) && activeTab !== TAB.ML && (
          <div className="vz-charts-area">
            {step === STEP.IDLE && (
              <div className="vz-empty">
                <div className="vz-empty-logo">◈</div>
                <h2>Plottix Visualizer</h2>
                <p>Sube un dataset CSV o Excel para explorar patrones.</p>
              </div>
            )}
            {step === STEP.READY && charts.length === 0 && (
              <div className="vz-empty">
                <div className="vz-empty-logo">◈</div>
                <p>Pulsa «+ Añadir gráfico» para comenzar.</p>
              </div>
            )}
            {step === STEP.READY && charts.length > 0 && (
              <div className={`vz-grid layout-${Math.min(charts.length, 2)}`}>
                {charts.map(chart => (
                  <ChartCard key={chart.id} chart={chart} onRemove={() => removeChart(chart.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ML tab ─────────────────────────────────────── */}
        {step === STEP.READY && activeTab === TAB.ML && (
          <div className="ml-tab-wrap">

            {/* Stepper */}
            <div className="ml-stepper">
              {['Selección', 'Configuración', 'Resultados'].map((label, i) => {
                const stepIdx = mlStep === ML_STEP.CONFIG ? 0 : mlStep === ML_STEP.TRAINING ? 1 : 2
                const isDone   = i < stepIdx
                const isActive = i === stepIdx
                return (
                  <React.Fragment key={label}>
                    <div className={`ml-step ${isDone ? 'done' : isActive ? 'active' : 'todo'}`}>
                      <div className="ml-step-num">{isDone ? '✓' : i + 1}</div>
                      <span className="ml-step-label">{label}</span>
                    </div>
                    {i < 2 && <div className={`ml-step-line ${isDone ? 'done' : ''}`} />}
                  </React.Fragment>
                )
              })}
            </div>

            {/* Config phase */}
            {mlStep === ML_STEP.CONFIG && (
              <div className="ml-config-layout">
                <div className="ml-config-sidebar">
                  <p className="sidebar-label">Modelos</p>
                  {availableModels
                    ? <MLModelSelector availableModels={availableModels} selectedModels={selectedModels} onChange={setSelectedModels} />
                    : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cargando…</span>
                  }
                </div>
                <div className="ml-config-main">
                  <MLConfigPanel
                    session={session} config={mlConfig} onChange={setMlConfig}
                    hasSupervised={hasSupervised} hasClusteringSelected={hasClusteringSelected}
                    elbowData={elbowData} elbowLoading={elbowLoading}
                    onComputeElbow={handleComputeElbow}
                  />
                  {mlError && <div className="vz-error">{mlError}</div>}
                  <div className="ml-train-bar">
                    <button className="register-btn"
                      style={{ width: 'auto', padding: '8px 24px', opacity: selectedModels.length === 0 ? 0.4 : 1 }}
                      disabled={selectedModels.length === 0}
                      onClick={handleTrain}>
                      ▶ Entrenar {selectedModels.length > 1 ? `${selectedModels.length} modelos` : 'modelo'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Training spinner */}
            {mlStep === ML_STEP.TRAINING && (
              <div className="vz-empty" style={{ flex: 1 }}>
                <div className="ml-spinner-lg" />
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Entrenando modelos…</p>
                <p style={{ color: 'var(--text-dim)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>Esto puede tardar unos segundos.</p>
              </div>
            )}

            {/* Results phase */}
            {mlStep === ML_STEP.RESULTS && trainingResults && (
              <MLResultsPanel
                results={trainingResults}
                errors={trainingErrors}
                config={mlConfig}
                selectedModels={selectedModels}
                onReset={handleMLReset}
              />
            )}
          </div>
        )}
      </section>

      {/* ── Modals ──────────────────────────────────────────── */}
      {step === STEP.MISSING && session && (
        <MissingValuesModal
          missingInfo={session.missing_info}
          onApply={handleApplyMissings}
          onSkip={() => setStep(STEP.READY)}
          loading={missingLoad}
        />
      )}
      {modalOpen && (
        <ChartModal
          columns={session.columns} dtypes={session.dtypes}
          chartTypes={chartTypes} loading={modalLoading}
          error={modalError} onGenerate={handleGenerate}
          onClose={() => setModalOpen(false)}
        />
      )}

      <style>{`
        .vz-main-panel { flex:1; display:flex; flex-direction:column; overflow:hidden; background:var(--bg); }

        /* Upload */
        .vz-upload { border:1.5px dashed var(--border2); border-radius:10px; padding:14px; cursor:pointer; text-align:center; transition:all 0.15s; background:var(--surface2); }
        .vz-upload:hover,.vz-upload.drag { border-color:var(--accent); background:var(--accent-light); }
        .vz-upload.has-file { border-color:var(--accent2); border-style:solid; }
        .vz-upload.busy { cursor:not-allowed; opacity:0.6; }
        .vz-upload-inner { display:flex; flex-direction:column; align-items:center; gap:4px; }
        .vz-up-icon { font-size:20px; color:var(--accent); }
        .vz-up-name { font-family:var(--font-mono); font-size:11px; color:var(--text); font-weight:500; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .vz-up-sub { font-size:11px; color:var(--text-dim); }
        .vz-spinner { width:22px; height:22px; border:2px solid var(--border2); border-top-color:var(--accent); border-radius:50%; animation:spin 0.75s linear infinite; }

        /* Stats */
        .vz-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .vz-stat { background:var(--surface2); border-radius:10px; padding:10px; text-align:center; }
        .vz-stat-val { font-family:var(--font-mono); font-size:20px; font-weight:600; letter-spacing:-0.5px; }
        .vz-stat-lbl { font-family:var(--font-mono); font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-dim); margin-top:1px; }

        /* Info toggle */
        .vz-info-toggle { background:none; border:0.5px solid var(--border2); border-radius:7px; color:var(--text-muted); font-family:var(--font-mono); font-size:11px; padding:6px 10px; cursor:pointer; width:100%; text-align:left; transition:all 0.15s; }
        .vz-info-toggle:hover { border-color:var(--accent); color:var(--accent); background:var(--accent-light); }

        /* Column chips */
        .vz-cols { display:flex; flex-wrap:wrap; gap:5px; }
        .vz-chip { font-family:var(--font-mono); font-size:11px; padding:3px 8px; border-radius:5px; border-left:2px solid transparent; }
        .vz-chip.num { background:#EEEAFF; color:#3730A3; border-left-color:var(--accent); }
        .vz-chip.cat { background:#E8F8F2; color:#065F46; border-left-color:var(--accent2); }
        .vz-chip-legend { display:flex; gap:12px; width:100%; margin-top:4px; }
        .vz-chip-legend span { font-size:10px; color:var(--text-dim); display:flex; align-items:center; gap:4px; }
        .dot { width:8px; height:8px; border-radius:2px; display:inline-block; flex-shrink:0; }
        .num-dot { background:var(--accent); }
        .cat-dot { background:var(--accent2); }

        /* Missing box */
        .vz-missing-box { background:#FFFBEB; border:0.5px solid #FCD34D; border-radius:9px; padding:10px 12px; display:flex; flex-direction:column; gap:5px; }
        .vz-missing-header { display:flex; justify-content:space-between; align-items:center; font-family:var(--font-mono); font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:#92400E; }
        .vz-missing-total { font-weight:600; }
        .vz-missing-row { display:flex; justify-content:space-between; font-size:11px; font-family:var(--font-mono); color:#78350F; }
        .vz-missing-pct { font-weight:500; color:#D97706; }

        /* Count row */
        .vz-count-row { display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:var(--surface2); border:0.5px solid var(--border); border-radius:9px; font-family:var(--font-mono); font-size:11px; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-muted); }
        .vz-count-badge { background:var(--accent-light); color:var(--accent); border:0.5px solid var(--accent-mid); border-radius:20px; font-family:var(--font-mono); font-size:11px; font-weight:500; padding:2px 10px; }

        /* Error */
        .vz-error { font-size:12px; color:var(--error); background:var(--error-light); border:0.5px solid var(--error-border); border-radius:8px; padding:9px 12px; }

        /* Tab bar */
        .vz-tab-bar { display:flex; align-items:center; justify-content:space-between; padding:0 20px; border-bottom:0.5px solid var(--border); background:var(--surface); flex-shrink:0; height:48px; }
        .vz-tabs { display:flex; gap:2px; }
        .vz-tab { font-size:13px; font-weight:500; padding:6px 16px; border-radius:8px; border:0.5px solid transparent; cursor:pointer; background:none; color:var(--text-muted); transition:all 0.15s; }
        .vz-tab:hover { background:var(--surface2); color:var(--text); }
        .vz-tab.active { background:var(--accent-light); border-color:var(--accent-mid); color:var(--accent); }

        /* Charts area */
        .vz-charts-area { flex:1; overflow-y:auto; padding:20px; }
        .vz-empty { height:100%; min-height:260px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; color:var(--text-muted); font-size:13px; text-align:center; }
        .vz-empty-logo { width:56px; height:56px; background:var(--accent); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:22px; color:#fff; }
        .vz-empty h2 { font-size:18px; font-weight:600; color:var(--text); letter-spacing:-0.3px; }
        .vz-empty p { font-size:13px; color:var(--text-muted); font-family:var(--font-mono); max-width:280px; line-height:1.6; }
        .vz-grid { display:grid; gap:14px; align-items:start; }
        .vz-grid.layout-1 { grid-template-columns:1fr; }
        .vz-grid.layout-2 { grid-template-columns:repeat(2,1fr); }

        /* ML wrapper */
        .ml-tab-wrap { flex:1; display:flex; flex-direction:column; overflow:hidden; }

        /* Stepper */
        .ml-stepper { display:flex; align-items:center; gap:0; padding:12px 20px; border-bottom:0.5px solid var(--border); background:var(--surface); flex-shrink:0; }
        .ml-step { display:flex; align-items:center; gap:7px; }
        .ml-step-num { width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-family:var(--font-mono); flex-shrink:0; }
        .ml-step.done .ml-step-num { background:var(--accent); color:#fff; font-size:10px; }
        .ml-step.active .ml-step-num { background:var(--accent-light); color:var(--accent); border:1.5px solid var(--accent); }
        .ml-step.todo .ml-step-num { background:var(--surface2); color:var(--text-dim); border:0.5px solid var(--border2); }
        .ml-step-label { font-size:12px; font-weight:500; }
        .ml-step.done .ml-step-label { color:var(--text-muted); }
        .ml-step.active .ml-step-label { color:var(--accent); }
        .ml-step.todo .ml-step-label { color:var(--text-dim); }
        .ml-step-line { flex:1; min-width:24px; height:1px; background:var(--border2); margin:0 8px; }
        .ml-step-line.done { background:var(--accent); }

        /* ML Config layout */
        .ml-config-layout { flex:1; display:flex; overflow:hidden; }
        .ml-config-sidebar { width:220px; flex-shrink:0; border-right:0.5px solid var(--border); padding:16px 14px; overflow-y:auto; background:var(--surface); display:flex; flex-direction:column; gap:10px; }
        .ml-config-main { flex:1; overflow-y:auto; padding:16px 20px; display:flex; flex-direction:column; gap:16px; }
        .ml-train-bar { display:flex; justify-content:flex-end; padding-top:12px; border-top:0.5px solid var(--border); }

        /* Experiment log */
        .vz-exp-log { display:flex; flex-direction:column; gap:5px; }
        .vz-exp-entry { display:flex; justify-content:space-between; font-size:11px; font-family:var(--font-mono); color:var(--text-muted); padding:5px 8px; background:var(--surface2); border-radius:6px; }
        .vz-exp-time { color:var(--text-dim); }
        .vz-exp-models { color:var(--accent); }

        /* Spinner */
        .ml-spinner-lg { width:36px; height:36px; border:3px solid var(--border2); border-top-color:var(--accent); border-radius:50%; animation:spin 0.7s linear infinite; }

        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  )
}
