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
  useTheme()
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
          <span className="ph-breadcrumb">
            <span className="crumb-active">Portal de Servicios</span>
          </span>
        ) : (
          <>
            <button className="ph-back" onClick={goHome}>← Inicio</button>
            <span className="ph-breadcrumb" style={{ marginLeft: '1rem' }}>
              <span>Portal</span>
              <span className="crumb-sep"> / </span>
              <span className="crumb-active">{meta.crumb}</span>
            </span>
          </>
        )}
        <span className="ph-pill" style={{ marginLeft: 'auto' }}>PROYECTO FINAL · ADM </span>
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
