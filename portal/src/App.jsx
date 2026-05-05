import React, { useState } from 'react'
import useTheme        from './hooks/useTheme'
import HomePage        from './components/HomePage'
import OperationsView  from './components/operations/OperationsView'
import ImagesView      from './components/images/ImagesView'
import VisualizeView   from './components/visualize/VisualizeView'

const VIEW_META = {
  operations: { crumb: 'Operaciones' },
  images:     { crumb: 'Imágenes' },
  visualize:  { crumb: 'Plottix' },
}

export default function App() {
  const [view, setView] = useState('home')
  const { theme, toggle: toggleTheme } = useTheme()
  const goHome = () => setView('home')
  const meta   = VIEW_META[view]

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="ph-brand">
          <div className="ph-logo">SX</div>
          <span className="ph-name">Service<span>X</span></span>
        </div>
        <div className="ph-divider" />
        {view === 'home' ? (
          <span className="ph-breadcrumb"><span className="crumb-active">Portal de Servicios</span></span>
        ) : (
          <>
            <button className="ph-back" onClick={goHome}>← Inicio</button>
            <span className="ph-breadcrumb" style={{marginLeft:'1rem'}}>
              <span>Portal</span><span className="crumb-sep"> / </span>
              <span className="crumb-active">{meta.crumb}</span>
            </span>
          </>
        )}
        <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'0.75rem'}}>
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: '1px solid var(--border2)',
              borderRadius: 20,
              padding: '0.22rem 0.75rem',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontFamily: "'Space Mono', monospace",
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {theme === 'dark' ? '☀ Claro' : '☾ Oscuro'}
          </button>
          <span className="ph-pill">lab-06 · ULL</span>
        </div>
      </header>

      <div className="portal-body">
        {view === 'home'       && <HomePage       onSelect={setView} />}
        {view === 'operations' && <OperationsView />}
        {view === 'images'     && <ImagesView     />}
        {view === 'visualize'  && <VisualizeView  />}
      </div>
    </div>
  )
}