import React, { useState, useEffect } from 'react'
import useTheme from './hooks/useTheme'
import FileUpload        from './components/FileUpload'
import MissingValuesModal from './components/MissingValuesModal'
import ChartModal        from './components/ChartModal'
import ChartCard         from './components/ChartCard'
import DatasetInfo       from './components/DatasetInfo'
import {
  uploadFile, handleMissings, getChartTypes, visualize, getResultUrl
} from './services/api'
import './App.css'

const STEP = { IDLE: 'idle', MISSING: 'missing', READY: 'ready' }

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme()
  const [step,           setStep]           = useState(STEP.IDLE)
  const [session,        setSession]        = useState(null)
  const [chartTypes,     setChartTypes]     = useState([])
  const [charts,         setCharts]         = useState([])
  const [uploadLoading,  setUploadLoading]  = useState(false)
  const [missingLoading, setMissingLoading] = useState(false)
  const [modalOpen,      setModalOpen]      = useState(false)
  const [modalLoading,   setModalLoading]   = useState(false)
  const [modalError,     setModalError]     = useState(null)
  const [globalError,    setGlobalError]    = useState(null)
  const [showInfo,       setShowInfo]       = useState(false)

  useEffect(() => { getChartTypes().then(setChartTypes).catch(() => {}) }, [])

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleUpload(file) {
    setGlobalError(null); setSession(null); setCharts([])
    setStep(STEP.IDLE); setUploadLoading(true)
    try {
      const info = await uploadFile(file)
      setSession(info)
      setStep(STEP.MISSING)
    } catch (e) {
      setGlobalError(e.message)
    } finally {
      setUploadLoading(false)
    }
  }

  // ── Missings ──────────────────────────────────────────────────────────────
  async function handleApplyMissings(strategies) {
    setMissingLoading(true)
    try {
      const result = await handleMissings(session.session_id, strategies)
      setSession(p => ({ ...p, rows: result.rows, missing_info: result.missing_info }))
      setStep(STEP.READY)
    } catch (e) {
      setGlobalError(e.message)
      setStep(STEP.READY)
    } finally {
      setMissingLoading(false)
    }
  }

  // ── Generate chart ────────────────────────────────────────────────────────
  async function handleGenerate(config) {
    setModalError(null); setModalLoading(true)
    const xHidden = ['histogram', 'kde', 'violin', 'correlogram'].includes(config.chart_type)
    const defaultTitle = xHidden
      ? `Distribución de ${config.y_column || config.y_columns?.join(', ')}`
      : config.use_multi
        ? `${config.y_columns.join(', ')} por ${config.x_column}`
        : `${config.y_column} por ${config.x_column}`
    const title = config.custom_title?.trim() || defaultTitle

    // Build payload — multi-bar/line uses chart_type 'multi_bar'/'multi_line'
    const chart_type = config.use_multi
      ? `multi_${config.chart_type}`
      : config.chart_type

    try {
      const result = await visualize({
        session_id:  session.session_id,
        chart_type,
        x_column:    config.x_column   || null,
        y_column:    config.y_column   || null,
        y_columns:   config.y_columns  || [],
        aggregation: config.aggregation || 'mean',
        title,
      })
      setCharts(prev => [...prev, {
        id:       Date.now(),
        job_id:   result.job_id,
        title:    result.title,
        img_url:  getResultUrl(result.job_id),
      }])
      setModalOpen(false)
    } catch (e) {
      setModalError(e.message)
    } finally {
      setModalLoading(false)
    }
  }

  const removeChart = id => setCharts(prev => prev.filter(c => c.id !== id))
  const totalMissing = session?.missing_info?.reduce((s, c) => s + c.missing_count, 0) ?? 0

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo">PX</div>
          <span className="header-name">Plottix<span>X</span></span>
        </div>
        <div className="header-divider" />
        <span className="header-subtitle">Visualización de datos · Servicio cloud</span>
        <span className="header-pill">lab-06 · ULL</span>
      </header>

      <main className="app-main">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-top">
            <h3>Dataset</h3>
            <FileUpload onUpload={handleUpload} loading={uploadLoading} />
          </div>

          <div className="sidebar-scroll">
            {globalError && (
              <div className="side-error">⚠ {globalError}</div>
            )}

            {session && (
              <>
                <div className="side-stat-row">
                  <span className="side-stat">
                    <span className="side-stat-val">{session.rows.toLocaleString()}</span>
                    <span className="side-stat-lbl">filas</span>
                  </span>
                  <span className="side-stat">
                    <span className="side-stat-val">{session.columns.length}</span>
                    <span className="side-stat-lbl">columnas</span>
                  </span>
                  {totalMissing > 0 && (
                    <span className="side-stat warn">
                      <span className="side-stat-val">{totalMissing}</span>
                      <span className="side-stat-lbl">faltantes</span>
                    </span>
                  )}
                </div>

                <button
                  className="info-toggle"
                  onClick={() => setShowInfo(v => !v)}
                >
                  {showInfo ? '▾ Ocultar columnas' : '▸ Ver columnas'}
                </button>

                {showInfo && <DatasetInfo info={session} />}
              </>
            )}

            {step === STEP.READY && (
              <div className="chart-count-row">
                <span className="chart-count-label">Gráficos activos</span>
                <span className="chart-count-badge">{charts.length}</span>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main content ── */}
        <section className="content" style={{ padding: '1.5rem 1.75rem' }}>
          {step === STEP.IDLE && (
            <div className="empty-state-dashboard">
              <div className="empty-logo">PX</div>
              <h2>Plottix Visualizer</h2>
              <p>Sube un dataset CSV o Excel para comenzar a explorar patrones.</p>
            </div>
          )}

          {step === STEP.MISSING && (
            <div className="empty-state-dashboard">
              <div className="empty-spinner" />
              <p>Analizando valores faltantes…</p>
            </div>
          )}

          {step === STEP.READY && (
            <>
              {/* Add chart button */}
              <div className="dashboard-toolbar">
                <span className="toolbar-title">
                  {charts.length === 0
                    ? 'Sin gráficos — añade uno para empezar'
                    : `${charts.length} gráfico${charts.length > 1 ? 's' : ''}`}
                </span>
                <button
                  className="register-btn"
                  style={{ width: 'auto', padding: '0.5rem 1.25rem' }}
                  onClick={() => { setModalError(null); setModalOpen(true) }}
                >
                  + Añadir gráfico
                </button>
              </div>

              {/* Chart grid */}
              {charts.length > 0 && (
                <div className={`charts-grid layout-${Math.min(charts.length, 2)}`}>
                  {charts.map(chart => (
                    <ChartCard
                      key={chart.id}
                      chart={chart}
                      onRemove={() => removeChart(chart.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* ── Missing values modal ── */}
      {step === STEP.MISSING && session && (
        <MissingValuesModal
          missingInfo={session.missing_info}
          onApply={handleApplyMissings}
          onSkip={() => setStep(STEP.READY)}
          loading={missingLoading}
        />
      )}

      {/* ── Chart config modal ── */}
      {modalOpen && (
        <ChartModal
          columns={session.columns}
          dtypes={session.dtypes}
          chartTypes={chartTypes}
          loading={modalLoading}
          error={modalError}
          onGenerate={handleGenerate}
          onClose={() => setModalOpen(false)}
        />
      )}

      <style>{`
        /* ── Empty state ── */
        .empty-state-dashboard {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; height: 100%; gap: 1rem;
          color: var(--text-muted); text-align: center;
        }
        .empty-logo {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          border-radius: 16px; display: flex; align-items: center;
          justify-content: center; font-family: 'Space Mono', monospace;
          font-size: 1.1rem; font-weight: 700; color: #fff;
        }
        .empty-state-dashboard h2 {
          font-size: 1.4rem; font-weight: 700; color: var(--text);
        }
        .empty-state-dashboard p {
          font-size: 0.82rem; font-family: 'Space Mono', monospace;
          max-width: 340px; line-height: 1.7;
        }
        .empty-spinner {
          width: 36px; height: 36px;
          border: 2px solid var(--border2);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Sidebar extras ── */
        .side-error {
          font-size: 0.78rem; color: var(--error);
          background: rgba(244,63,94,0.06);
          border: 1px solid rgba(244,63,94,0.2);
          border-radius: 8px; padding: 0.7rem 0.9rem;
          margin-bottom: 0.75rem; line-height: 1.5;
        }
        .side-stat-row {
          display: flex; gap: 0.5rem; flex-wrap: wrap;
          margin-bottom: 0.75rem;
        }
        .side-stat {
          display: flex; flex-direction: column; align-items: center;
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; padding: 0.5rem 0.9rem; flex: 1;
        }
        .side-stat.warn { border-color: rgba(245,158,11,0.3); }
        .side-stat-val {
          font-family: 'Space Mono', monospace; font-size: 1rem;
          font-weight: 700; color: var(--accent2);
        }
        .side-stat.warn .side-stat-val { color: var(--warn); }
        .side-stat-lbl {
          font-size: 0.6rem; text-transform: uppercase;
          letter-spacing: 0.1em; color: var(--text-muted);
          font-family: 'Space Mono', monospace;
        }
        .info-toggle {
          background: none; border: 1px solid var(--border2);
          border-radius: 6px; color: var(--text-muted);
          font-family: 'Space Mono', monospace; font-size: 0.7rem;
          padding: 0.42rem 0.75rem; cursor: pointer; width: 100%;
          text-align: left; margin-bottom: 0.75rem;
          transition: border-color 0.15s, color 0.15s;
        }
        .info-toggle:hover { border-color: var(--accent); color: var(--accent); }
        .chart-count-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.6rem 0.75rem;
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; margin-top: 0.5rem;
        }
        .chart-count-label {
          font-family: 'Space Mono', monospace; font-size: 0.68rem;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: var(--text-muted);
        }
        .chart-count-badge {
          background: rgba(91,106,247,0.12); color: var(--accent);
          border: 1px solid rgba(91,106,247,0.3); border-radius: 20px;
          font-family: 'Space Mono', monospace; font-size: 0.72rem;
          font-weight: 700; padding: 0.15rem 0.65rem;
        }

        /* ── Dashboard toolbar ── */
        .dashboard-toolbar {
          display: flex; align-items: center;
          justify-content: space-between; margin-bottom: 1.25rem;
        }
        .toolbar-title {
          font-family: 'Space Mono', monospace; font-size: 0.72rem;
          text-transform: uppercase; letter-spacing: 0.12em;
          color: var(--text-muted);
        }

        /* ── Chart grid ── */
        .charts-grid { display: grid; gap: 1.1rem; align-items: start; }
        .charts-grid.layout-1 { grid-template-columns: 1fr; }
        .charts-grid.layout-2 { grid-template-columns: repeat(2, 1fr); }
      `}</style>
    </div>
  )
}