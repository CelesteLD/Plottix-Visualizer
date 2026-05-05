import React, { useState } from 'react'

export default function ChartCard({ chart, onRemove }) {
  const [loaded, setLoaded] = useState(false)
  const [error,  setError]  = useState(false)

  const isInteractive = chart.is_interactive

  return (
    <div className="chart-card-sx">
      {/* Header */}
      <div className="cc-header">
        <span className="cc-title">{chart.title}</span>
        <div className="cc-actions">
          {isInteractive ? (
            /* Interactive maps: open in new tab for full-screen experience */
            <a
              href={chart.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="cc-btn cc-btn-dl"
              title="Abrir mapa completo"
            >
              ⤢ Ampliar
            </a>
          ) : (
            /* Static charts: download PNG */
            <a
              href={chart.img_url}
              download={`${chart.title.replace(/\s+/g, '_')}.png`}
              className="cc-btn cc-btn-dl"
              title="Descargar PNG"
            >
              ↓ PNG
            </a>
          )}
          <button
            className="cc-btn cc-btn-rm"
            onClick={onRemove}
            title="Eliminar gráfico"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="cc-img-wrap" style={isInteractive ? { height: 400 } : {}}>
        {!loaded && !error && <div className="cc-skeleton" />}
        {error && (
          <div className="cc-error">⚠ No se pudo cargar el gráfico</div>
        )}

        {isInteractive ? (
          /* Folium map rendered in iframe */
          <iframe
            src={chart.html_url}
            title={chart.title}
            className="cc-iframe"
            style={{ display: loaded && !error ? 'block' : 'none' }}
            onLoad={() => setLoaded(true)}
            onError={() => { setLoaded(true); setError(true) }}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          /* Static PNG image */
          <img
            src={chart.img_url}
            alt={chart.title}
            className="cc-img"
            style={{ display: loaded && !error ? 'block' : 'none' }}
            onLoad={() => setLoaded(true)}
            onError={() => { setLoaded(true); setError(true) }}
          />
        )}
      </div>

      <style>{`
        .chart-card-sx {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          display: flex; flex-direction: column;
          transition: border-color 0.15s;
        }
        .chart-card-sx:hover { border-color: var(--border2); }

        .cc-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.7rem 1rem;
          border-bottom: 1px solid var(--border);
          background: var(--surface2);
          flex-shrink: 0;
        }
        .cc-title {
          font-family: 'Space Mono', monospace; font-size: 0.75rem;
          color: var(--text-muted); flex: 1;
          overflow-wrap: break-word; word-break: break-word;
          padding-right: 0.75rem;
        }
        .cc-actions { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }

        .cc-btn {
          font-family: 'Space Mono', monospace; font-size: 0.65rem;
          font-weight: 700; padding: 0.28rem 0.65rem;
          border-radius: 5px; cursor: pointer;
          transition: background 0.15s, color 0.15s, box-shadow 0.15s;
          text-decoration: none; line-height: 1;
          display: flex; align-items: center;
        }
        .cc-btn-dl {
          background: rgba(0,212,170,0.08); color: var(--accent2);
          border: 1px solid rgba(0,212,170,0.25);
        }
        .cc-btn-dl:hover {
          background: rgba(0,212,170,0.16);
          box-shadow: 0 0 10px rgba(0,212,170,0.2);
        }
        .cc-btn-rm {
          background: none; color: var(--text-dim);
          border: 1px solid var(--border2); font-size: 0.7rem;
        }
        .cc-btn-rm:hover {
          background: rgba(244,63,94,0.08); color: var(--error);
          border-color: rgba(244,63,94,0.3);
        }

        .cc-img-wrap {
          flex: 1; background: #080b10;
          display: flex; align-items: center; justify-content: center;
          min-height: 240px; position: relative;
        }
        .cc-img {
          width: 100%; height: auto;
          display: block; max-height: 420px;
          object-fit: contain;
        }
        .cc-iframe {
          width: 100%; height: 100%;
          border: none; display: block;
          min-height: 400px;
        }
        .cc-skeleton {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, var(--surface) 25%, var(--surface2) 50%, var(--surface) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
        .cc-error {
          font-family: 'Space Mono', monospace; font-size: 0.78rem;
          color: var(--error); padding: 2rem; text-align: center;
        }
      `}</style>
    </div>
  )
}