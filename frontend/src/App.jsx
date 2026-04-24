import React, { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import DatasetInfo from './components/DatasetInfo'
import ChartRenderer from './components/ChartRenderer'
import ChartModal from './components/ChartModal'
import MissingValuesModal from './components/MissingValuesModal'
import { uploadFile, handleMissings, getChartTypes, visualize } from './services/api'

// Flow: idle → uploaded (missing modal) → ready (can add charts)
const STEP = { IDLE: 'idle', MISSING: 'missing', READY: 'ready' }

export default function App() {
  const [step, setStep] = useState(STEP.IDLE)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [missingLoading, setMissingLoading] = useState(false)
  const [error, setError] = useState(null)
  const [session, setSession] = useState(null)      // { session_id, columns, rows, dtypes, missing_info }
  const [chartTypes, setChartTypes] = useState([])
  const [charts, setCharts] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [showColumns, setShowColumns] = useState(false)

  useEffect(() => {
    getChartTypes().then(setChartTypes).catch(() => {})
  }, [])

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleUpload = async (file) => {
    setError(null)
    setSession(null)
    setCharts([])
    setShowColumns(false)
    setStep(STEP.IDLE)
    setUploadLoading(true)
    try {
      const info = await uploadFile(file)
      setSession(info)
      setStep(STEP.MISSING)   // always show missing modal after upload
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed.')
    } finally {
      setUploadLoading(false)
    }
  }

  // ── Missing values ──────────────────────────────────────────────────────────
  const handleApplyMissings = async (strategies) => {
    setMissingLoading(true)
    try {
      const result = await handleMissings(session.session_id, strategies)
      // Update session with cleaned row count and fresh missing_info
      setSession((prev) => ({ ...prev, rows: result.rows, missing_info: result.missing_info }))
      setStep(STEP.READY)
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not apply missing-value strategies.')
      setStep(STEP.READY)    // proceed anyway
    } finally {
      setMissingLoading(false)
    }
  }

  const handleSkipMissings = () => {
    setStep(STEP.READY)
  }

  // ── Chart generation ────────────────────────────────────────────────────────
  const handleGenerate = async (config) => {
    setModalError(null)
    setModalLoading(true)
    try {
      const result = await visualize({
        session_id: session.session_id,
        ...config,
        title: config.custom_title?.trim() || (config.chart_type === 'histogram' ? `Distribution of ${config.y_column}` : `${config.y_column} by ${config.x_column}`),
      })
      setCharts((prev) => [...prev, { id: Date.now(), ...result }])
      setModalOpen(false)
    } catch (e) {
      setModalError(e.response?.data?.detail || 'Visualization failed.')
    } finally {
      setModalLoading(false)
    }
  }

  const removeChart = (id) => setCharts((prev) => prev.filter((c) => c.id !== id))

  // ── Derived ─────────────────────────────────────────────────────────────────
  const totalMissing = session?.missing_info?.reduce((s, c) => s + c.missing_count, 0) ?? 0

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="logo-mark">◈</span>
          <span className="logo-text">Plottix</span>
          {session && (
            <span className="session-badge">
              {session.rows.toLocaleString()} rows · {session.columns.length} cols
            </span>
          )}
          {step === STEP.READY && totalMissing > 0 && (
            <span className="missing-badge" title="Remaining missing values">
              ⚠ {totalMissing.toLocaleString()} missing
            </span>
          )}
        </div>

        <div className="header-right">
          {step === STEP.READY && (
            <>
              <button className="btn-ghost" onClick={() => setShowColumns((v) => !v)}>
                {showColumns ? 'Hide columns' : 'Show columns'}
              </button>
              <button
                className="btn-primary"
                onClick={() => { setModalError(null); setModalOpen(true) }}
              >
                + Add chart
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Columns drawer ── */}
      {session && showColumns && (
        <div className="columns-drawer">
          <DatasetInfo info={session} />
        </div>
      )}

      {/* ── Body ── */}
      <div className="app-body">
        <aside className="panel-left">
          <h2 className="section-title">Dataset</h2>
          <FileUpload onUpload={handleUpload} loading={uploadLoading} />
          {error && <div className="error-box"><span>⚠</span> {error}</div>}

          {/* Mini missing summary in sidebar once ready */}
          {step === STEP.READY && session?.missing_info && (
            <div className="missing-summary">
              <p className="missing-summary-title">Missing values</p>
              {session.missing_info.filter((c) => c.missing_count > 0).length === 0 ? (
                <p className="missing-summary-clean">✓ Dataset is clean</p>
              ) : (
                session.missing_info
                  .filter((c) => c.missing_count > 0)
                  .map((c) => (
                    <div key={c.column} className="missing-row">
                      <span className="missing-col">{c.column}</span>
                      <span className="missing-cnt">{c.missing_pct}%</span>
                    </div>
                  ))
              )}
            </div>
          )}
        </aside>

        <main className="panel-right">
          {step === STEP.IDLE && (
            <div className="empty-state">
              <div className="empty-icon">◈</div>
              <p>Upload a dataset to get started.</p>
            </div>
          )}

          {step === STEP.MISSING && (
            <div className="empty-state">
              <div className="empty-icon" style={{ color: '#f5a623' }}>⚠</div>
              <p>Reviewing missing values…</p>
            </div>
          )}

          {step === STEP.READY && charts.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">◈</div>
              <p>Press &quot;+ Add chart&quot; to visualize.</p>
            </div>
          )}

          {step === STEP.READY && charts.length > 0 && (
            <div className={`charts-grid layout-${Math.min(charts.length, 2)}`}>
              {charts.map((chart) => (
                <div key={chart.id} className="chart-card">
                  <button className="chart-close" onClick={() => removeChart(chart.id)}>✕</button>
                  <ChartRenderer chartData={chart} />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ── Missing values modal (step: MISSING) ── */}
      {step === STEP.MISSING && session && (
        <MissingValuesModal
          missingInfo={session.missing_info}
          onApply={handleApplyMissings}
          onSkip={handleSkipMissings}
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
        .app { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

        .app-header {
          padding: 0 24px; height: 54px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          background: var(--bg-card); flex-shrink: 0;
        }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .logo-mark { font-size: 1.2rem; color: var(--accent); }
        .logo-text { font-family: var(--font-mono); font-weight: 700; font-size: 0.95rem; }
        .session-badge {
          font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);
          background: var(--bg-elevated); border: 1px solid var(--border);
          padding: 3px 9px; border-radius: 20px;
        }
        .missing-badge {
          font-family: var(--font-mono); font-size: 0.7rem; color: #f5a623;
          background: rgba(245,166,35,0.1); border: 1px solid rgba(245,166,35,0.25);
          padding: 3px 9px; border-radius: 20px;
        }
        .header-right { display: flex; align-items: center; gap: 8px; }

        .btn-ghost {
          background: none; border: 1px solid var(--border);
          color: var(--text-secondary); font-size: 0.82rem;
          padding: 6px 14px; border-radius: 8px;
          transition: border-color 0.15s, color 0.15s;
        }
        .btn-ghost:hover { border-color: var(--text-secondary); color: var(--text-primary); }

        .btn-primary {
          background: var(--accent); color: #0a0a0c;
          font-weight: 700; font-size: 0.85rem;
          padding: 7px 16px; border-radius: 8px;
          transition: opacity 0.15s, transform 0.1s;
        }
        .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }

        .columns-drawer {
          background: var(--bg-card); border-bottom: 1px solid var(--border);
          padding: 14px 24px; flex-shrink: 0;
          animation: slideDown 0.15s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px) }
          to   { opacity: 1; transform: translateY(0) }
        }

        .app-body { flex: 1; display: flex; overflow: hidden; }

        .panel-left {
          width: 260px; flex-shrink: 0;
          background: var(--bg-card); border-right: 1px solid var(--border);
          padding: 20px 16px;
          display: flex; flex-direction: column; gap: 14px;
          overflow-y: auto;
        }
        .section-title {
          font-family: var(--font-mono); font-size: 0.68rem;
          letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted);
        }

        .error-box {
          background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.25);
          border-radius: 8px; padding: 10px 12px;
          font-size: 0.82rem; color: #ff6b6b; display: flex; gap: 8px;
        }

        /* Missing summary sidebar */
        .missing-summary {
          border: 1px solid var(--border); border-radius: 8px;
          padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;
        }
        .missing-summary-title {
          font-family: var(--font-mono); font-size: 0.68rem;
          text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted);
        }
        .missing-summary-clean { font-size: 0.8rem; color: #4caf7d; }
        .missing-row {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 0.78rem;
        }
        .missing-col { color: var(--text-secondary); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
        .missing-cnt { color: #f5a623; font-weight: 600; flex-shrink: 0; }

        .panel-right { flex: 1; overflow-y: auto; padding: 20px; background: var(--bg); }
        .empty-state {
          height: 100%; min-height: 300px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 12px; color: var(--text-muted); font-size: 0.88rem; text-align: center;
        }
        .empty-icon { font-size: 2rem; color: var(--border); }

        .charts-grid { display: grid; gap: 18px; align-items: start; }
        .charts-grid.layout-1 { grid-template-columns: 1fr; }
        .charts-grid.layout-2 { grid-template-columns: repeat(2, 1fr); }

        .chart-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: 10px; padding: 18px 18px 14px;
          position: relative;
        }
        .chart-close {
          position: absolute; top: 10px; right: 10px;
          background: none; color: var(--text-muted); font-size: 0.72rem;
          padding: 2px 6px; border-radius: 4px;
          transition: background 0.15s, color 0.15s;
        }
        .chart-close:hover { background: rgba(255,80,80,0.12); color: #ff6b6b; }

      `}</style>
    </div>
  )
}