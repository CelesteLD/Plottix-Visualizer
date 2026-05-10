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
          border: 0.5px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          display: flex; flex-direction: column;
          transition: border-color 0.15s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .chart-card-sx:hover { border-color: var(--border2); }

        .cc-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 0.5px solid var(--border);
          background: var(--surface2);
          flex-shrink: 0;
        }
        .cc-title {
          font-family: var(--font-mono); font-size: 12px;
          color: var(--text-muted); flex: 1;
          overflow-wrap: break-word; word-break: break-word;
          padding-right: 10px;
        }
        .cc-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

        .cc-btn {
          font-family: var(--font-mono); font-size: 11px;
          font-weight: 500; padding: 4px 10px;
          border-radius: 6px; cursor: pointer;
          transition: background 0.15s, color 0.15s;
          text-decoration: none; line-height: 1;
          display: flex; align-items: center;
        }
        .cc-btn-dl {
          background: var(--accent2-light); color: var(--accent2);
          border: 0.5px solid rgba(5,150,105,0.3);
        }
        .cc-btn-dl:hover { background: rgba(5,150,105,0.2); }
        .cc-btn-rm {
          background: none; color: var(--text-dim);
          border: 0.5px solid var(--border2); font-size: 12px;
        }
        .cc-btn-rm:hover {
          background: var(--error-light); color: var(--error);
          border-color: var(--error-border);
        }

        .cc-img-wrap {
          flex: 1; background: var(--surface);
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
          font-family: var(--font-mono); font-size: 12px;
          color: var(--error); padding: 2rem; text-align: center;
        }
      `}</style>
    </div>
  )
}