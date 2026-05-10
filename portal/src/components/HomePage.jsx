import React from 'react'

const SERVICES = [
  {
    id:    'operations',
    icon:  '⚙',
    name:  'Operaciones Numéricas',
    desc:  'Aritmética, álgebra matricial y operaciones personalizadas compiladas en tiempo real desde código C++.',
    tags:  ['C++', 'g++', 'Aritmética', 'Matrices'],
    color: '#5b6af7',
    glow:  'rgba(91,106,247,0.18)',
  },
  {
    id:    'images',
    icon:  '⬡',
    name:  'Procesamiento de Imagen',
    desc:  'Filtros y transformaciones sobre imágenes PNG con paralelismo OpenMP y MPI. Sube tu propio filtro .cpp.',
    tags:  ['C++', 'OpenMP', 'MPI', 'PNG'],
    color: '#00d4aa',
    glow:  'rgba(0,212,170,0.18)',
  },
  {
    id:    'visualize',
    icon:  '◈',
    name:  'Visualización de Datos',
    desc:  'Dashboard exploratorio de datasets CSV/Excel. Genera múltiples gráficos en el servidor y descárgalos en PNG.',
    tags:  ['Python', 'matplotlib', 'CSV', 'Excel'],
    color: '#a78bfa',
    glow:  'rgba(167,139,250,0.18)',
  },
]

export default function HomePage({ onSelect }) {
  return (
    <div className="home-wrap">
      <div className="home-hero">
        <div className="home-logo-big">SX</div>
        <h1 className="home-title">ServiceX Portal</h1>
        <p className="home-subtitle">
          Computación en la Nube · Universidad de La Laguna
        </p>
        <p className="home-desc">
          Selecciona un servicio para comenzar.
        </p>
      </div>

      <div className="home-grid">
        {SERVICES.map(svc => (
          <button
            key={svc.id}
            className="svc-card"
            style={{ '--svc-color': svc.color, '--svc-glow': svc.glow }}
            onClick={() => onSelect(svc.id)}
          >
            <div className="svc-icon-wrap">
              <span className="svc-icon">{svc.icon}</span>
            </div>
            <div className="svc-body">
              <h2 className="svc-name">{svc.name}</h2>
              <p className="svc-desc">{svc.desc}</p>
              <div className="svc-tags">
                {svc.tags.map(t => (
                  <span key={t} className="svc-tag">{t}</span>
                ))}
              </div>
            </div>
            <div className="svc-arrow">→</div>
          </button>
        ))}
      </div>

      <style>{`
        .home-wrap {
          width: 100%; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 3rem 2rem; gap: 3rem; overflow-y: auto;
        }
        .home-hero { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
        .home-logo-big {
          width: 72px; height: 72px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          border-radius: 18px; display: flex; align-items: center; justify-content: center;
          font-family: 'Space Mono', monospace; font-size: 1.3rem; font-weight: 700; color: #fff;
          box-shadow: 0 0 40px rgba(91,106,247,0.3);
          margin-bottom: 0.5rem;
        }
        .home-title {
          font-size: 2.4rem; font-weight: 800; letter-spacing: -0.03em;
          background: linear-gradient(135deg, #e2e8f4 30%, #7a869e);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .home-subtitle {
          font-family: 'Space Mono', monospace; font-size: 0.72rem;
          color: var(--accent); letter-spacing: 0.1em; text-transform: uppercase;
        }
        .home-desc { font-size: 0.9rem; color: var(--text-muted); margin-top: 0.25rem; }

        .home-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem; width: 100%; max-width: 960px;
        }

        .svc-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; padding: 1.75rem 1.5rem;
          display: flex; flex-direction: column; gap: 1.2rem;
          text-align: left; cursor: pointer;
          transition: border-color 0.2s, background 0.2s, transform 0.18s, box-shadow 0.2s;
          position: relative; overflow: hidden;
        }
        .svc-card::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 0%, var(--svc-glow) 0%, transparent 65%);
          opacity: 0; transition: opacity 0.25s;
          pointer-events: none;
        }
        .svc-card:hover { border-color: var(--svc-color); transform: translateY(-4px); box-shadow: 0 12px 40px var(--svc-glow); }
        .svc-card:hover::before { opacity: 1; }

        .svc-icon-wrap {
          width: 48px; height: 48px; border-radius: 12px;
          background: color-mix(in srgb, var(--svc-color) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--svc-color) 30%, transparent);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; flex-shrink: 0;
        }
        .svc-body { display: flex; flex-direction: column; gap: 0.6rem; flex: 1; }
        .svc-name { font-size: 1rem; font-weight: 700; color: var(--text); line-height: 1.3; }
        .svc-desc { font-size: 0.78rem; color: var(--text-muted); line-height: 1.65; }
        .svc-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 0.25rem; }
        .svc-tag {
          font-family: 'Space Mono', monospace; font-size: 0.6rem;
          padding: 2px 8px; border-radius: 20px;
          background: color-mix(in srgb, var(--svc-color) 10%, transparent);
          color: var(--svc-color);
          border: 1px solid color-mix(in srgb, var(--svc-color) 25%, transparent);
        }
        .svc-arrow {
          font-size: 1.1rem; color: var(--svc-color);
          opacity: 0; transform: translateX(-6px);
          transition: opacity 0.18s, transform 0.18s;
          align-self: flex-end;
        }
        .svc-card:hover .svc-arrow { opacity: 1; transform: translateX(0); }

        @media (max-width: 768px) {
          .home-grid { grid-template-columns: 1fr; max-width: 420px; }
          .home-title { font-size: 1.8rem; }
        }
      `}</style>
    </div>
  )
}
