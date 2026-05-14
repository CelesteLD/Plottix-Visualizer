import React, { useState } from 'react'

const PLOTTIX_URL = process.env.REACT_APP_PLOTTIX_URL || 'http://localhost:5002'

async function fetchNarrative(chart) {
  const res = await fetch(`${PLOTTIX_URL}/api/llm/interpret/${chart.job_id}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chart_type: chart.chart_type || '',
      title:      chart.title      || '',
      x_column:   chart.x_column   || null,
      y_column:   chart.y_column   || null,
    }),
  })
  if (!res.ok) throw new Error('Error del servidor LLM')
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.narrative
}

export default function ChartCard({ chart, onRemove, onNarrative }) {
  const [loaded,     setLoaded]     = useState(false)
  const [imgError,   setImgError]   = useState(false)
  const [narrative,  setNarrative]  = useState(null)
  const [narLoading, setNarLoading] = useState(false)
  const [narError,   setNarError]   = useState(null)

  const isInteractive = chart.is_interactive

  async function handleNarrative() {
    setNarLoading(true)
    setNarError(null)
    try {
      const text = await fetchNarrative(chart)
      setNarrative(text)
      if (onNarrative) onNarrative(text)
    } catch (e) {
      setNarError(e.message)
    } finally {
      setNarLoading(false)
    }
  }

  return (
    <div className="cc-card">

      <div className="cc-header">
        <span className="cc-title">{chart.title}</span>
        <div className="cc-actions">
          {isInteractive ? (
            <a href={chart.html_url} target="_blank" rel="noopener noreferrer"
               className="cc-btn cc-btn-dl" title="Abrir mapa completo">
              ⤢ Ampliar
            </a>
          ) : (
            <a href={chart.img_url} download={`${chart.title.replace(/\s+/g, '_')}.png`}
               className="cc-btn cc-btn-dl" title="Descargar PNG">
              ↓ PNG
            </a>
          )}
          <button className="cc-btn cc-btn-rm" onClick={onRemove} title="Eliminar gráfico">✕</button>
        </div>
      </div>

      <div className="cc-img-wrap" style={isInteractive ? { height: 400 } : {}}>
        {!loaded && !imgError && <div className="cc-skeleton" />}
        {imgError && <div className="cc-img-error">⚠ No se pudo cargar el gráfico</div>}
        {isInteractive ? (
          <iframe src={chart.html_url} title={chart.title} className="cc-iframe"
            style={{ display: loaded && !imgError ? 'block' : 'none' }}
            onLoad={() => setLoaded(true)}
            onError={() => { setLoaded(true); setImgError(true) }}
            sandbox="allow-scripts allow-same-origin" />
        ) : (
          <img src={chart.img_url} alt={chart.title} className="cc-img"
            style={{ display: loaded && !imgError ? 'block' : 'none' }}
            onLoad={() => setLoaded(true)}
            onError={() => { setLoaded(true); setImgError(true) }} />
        )}
      </div>

      {!isInteractive && (
        <div className="cc-narrative">
          {narrative ? (
            <>
              <div className="cc-nar-label"><span className="cc-spark">✦</span> Análisis IA</div>
              <p className="cc-nar-text">{narrative}</p>
              <button className="cc-nar-refresh" onClick={handleNarrative} disabled={narLoading}>
                {narLoading ? 'Generando…' : '↻ Regenerar'}
              </button>
            </>
          ) : narLoading ? (
            <div className="cc-nar-loading">
              <div className="cc-nar-spinner" /><span>Analizando gráfico…</span>
            </div>
          ) : (
            <button className="cc-nar-btn" onClick={handleNarrative}>
              <span className="cc-spark">✦</span> Explicar con IA
            </button>
          )}
          {narError && <div className="cc-nar-error">⚠ {narError}</div>}
        </div>
      )}

      <style>{`
        .cc-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
          display: flex; flex-direction: column;
          transition: border-color .15s, box-shadow .15s;
          box-shadow: 0 1px 4px rgba(60,120,50,.07);
        }
        .cc-card:hover { border-color: var(--border2); box-shadow: 0 4px 16px rgba(60,120,50,.10); }

        .cc-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          background: var(--surface2);
          flex-shrink: 0;
        }
        .cc-title { font-family: var(--font-mono); font-size: 12px; font-weight: 500; color: var(--text-muted); flex: 1; overflow-wrap: break-word; word-break: break-word; padding-right: 10px; }
        .cc-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .cc-btn { font-family: var(--font-mono); font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: background .15s, color .15s; text-decoration: none; line-height: 1; display: flex; align-items: center; gap: 4px; }
        .cc-btn-dl { background: var(--accent2-light); color: var(--accent2); border: 1px solid var(--border2); }
        .cc-btn-dl:hover { background: var(--border2); color: #1A5A20; }
        .cc-btn-rm { background: none; color: var(--text-dim); border: 1px solid var(--border); font-size: 12px; }
        .cc-btn-rm:hover { background: var(--error-light); color: var(--error); border-color: var(--error-border); }

        .cc-img-wrap { flex: 1; background: #F7FDF2; display: flex; align-items: center; justify-content: center; min-height: 240px; position: relative; }
        .cc-img { width: 100%; height: auto; display: block; max-height: 420px; object-fit: contain; }
        .cc-iframe { width: 100%; height: 100%; border: none; display: block; min-height: 400px; }
        .cc-skeleton { position: absolute; inset: 0; background: linear-gradient(90deg,#EEF7E4 25%,#D3EE98 50%,#EEF7E4 75%); background-size: 200% 100%; animation: cc-shimmer 1.4s infinite; }
        @keyframes cc-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .cc-img-error { font-family: var(--font-mono); font-size: 12px; color: var(--error); padding: 2rem; text-align: center; }

        .cc-narrative { border-top: 1px solid var(--border); background: #FAFFF5; padding: 10px 14px; display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
        .cc-spark { color: var(--p1); font-size: 11px; }
        .cc-nar-label { font-size: 10px; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: .08em; color: var(--text-dim); display: flex; align-items: center; gap: 5px; }
        .cc-nar-text { font-size: 12px; color: var(--text-muted); line-height: 1.6; }
        .cc-nar-btn { display: flex; align-items: center; justify-content: center; gap: 6px; background: none; border: 1px dashed var(--border2); border-radius: 7px; padding: 7px 12px; font-size: 12px; font-family: var(--font-mono); color: var(--text-dim); cursor: pointer; transition: border-color .15s, color .15s, background .15s; width: 100%; }
        .cc-nar-btn:hover { border-color: var(--p1); color: var(--accent2); background: var(--accent-light); }
        .cc-nar-refresh { align-self: flex-start; background: none; border: none; font-size: 11px; font-family: var(--font-mono); color: var(--text-dim); cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: color .15s; }
        .cc-nar-refresh:hover:not(:disabled) { color: var(--accent2); }
        .cc-nar-refresh:disabled { opacity: .5; cursor: not-allowed; }
        .cc-nar-loading { display: flex; align-items: center; gap: 8px; font-size: 12px; font-family: var(--font-mono); color: var(--text-dim); }
        .cc-nar-spinner { width: 14px; height: 14px; border: 2px solid var(--border2); border-top-color: var(--p1); border-radius: 50%; animation: cc-spin .7s linear infinite; flex-shrink: 0; }
        @keyframes cc-spin { to { transform: rotate(360deg); } }
        .cc-nar-error { font-size: 11px; color: var(--error); font-family: var(--font-mono); }
      `}</style>
    </div>
  )
}
