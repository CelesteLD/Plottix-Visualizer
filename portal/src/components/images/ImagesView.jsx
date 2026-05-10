import React, { useState, useEffect, useCallback } from 'react'
import ImageOperationForm   from './ImageOperationForm'
import ImageResultDisplay   from './ImageResultDisplay'
import RegisterServiceModal from './RegisterServiceModal'
import { fetchOperations, runImageOperation, deleteOperation } from '../../services/api'

const isImage = op => op.type === 'image'

export default function ImagesView() {
  const [operations,   setOperations]   = useState([])
  const [selected,     setSelected]     = useState(null)
  const [result,       setResult]       = useState(null)
  const [error,        setError]        = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [loadingOps,   setLoadingOps]   = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [deleteConfirm,setDeleteConfirm]= useState(null)

  const loadOps = useCallback(() => {
    setLoadingOps(true)
    fetchOperations()
      .then(ops => {
        const img = ops.filter(isImage)
        setOperations(img)
        setSelected(prev => {
          if (!prev) return img[0] ?? null
          return img.find(o => o.id === prev.id) ?? img[0] ?? null
        })
      })
      .catch(() => setError('No se pudo conectar con el backend de ServiceX'))
      .finally(() => setLoadingOps(false))
  }, [])

  useEffect(() => { loadOps() }, [loadOps])

  async function handleImageRun(imageFile, params) {
    setResult(null); setError(null); setLoading(true)
    try   { setResult(await runImageOperation(selected.id, imageFile, params)) }
    catch (e) { setError(e.message) }
    finally   { setLoading(false) }
  }

  function handleRegistered(descriptor) {
    setShowRegister(false); loadOps()
    setTimeout(() => {
      setOperations(prev => {
        const found = prev.find(o => o.id === descriptor.id)
        if (found) { setSelected(found); setResult(null); setError(null) }
        return prev
      })
    }, 300)
  }

  async function handleDeleteConfirmed() {
    if (!deleteConfirm) return
    try   { await deleteOperation(deleteConfirm.id); setDeleteConfirm(null); loadOps() }
    catch (e) { setError(e.message); setDeleteConfirm(null) }
  }

  // ── Sidebar operation list ──────────────────────────────────────
  const OpList = () => {
    if (loadingOps) return <p className="empty-msg">Cargando…</p>
    if (!operations.length) return <p className="empty-msg">Sin operaciones de imagen</p>
    return (
      <div>
        {operations.map(op => (
          <div key={op.id} className={`op-card-wrapper ${selected?.id === op.id ? 'active' : ''}`}>
            <button className="op-card" onClick={() => { setSelected(op); setResult(null); setError(null) }}>
              <span className="op-name">
                {op.name}
                {op.category === undefined || op.id.startsWith('sharpen') ? null : ''}
                {!['sharpen_omp','sharpen_mpi'].includes(op.id) && (
                  <span className="op-user-badge">custom</span>
                )}
              </span>
              <span className="op-desc">{op.description}</span>
            </button>
            {!['sharpen_omp','sharpen_mpi'].includes(op.id) && (
              <button className="op-delete-btn" onClick={() => setDeleteConfirm(op)} title="Eliminar">✕</button>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="app-main">
      <aside className="sidebar">
        <div className="sidebar-top">
          <h3>Procesamiento de imagen</h3>
          <button className="register-btn" onClick={() => setShowRegister(true)}>
            + Añadir filtro
          </button>
        </div>
        <div className="sidebar-scroll">
          <OpList />
        </div>
      </aside>

      <section className="content">
        {selected
          ? <>
              <ImageOperationForm operation={selected} onSubmit={handleImageRun} loading={loading} />
              <ImageResultDisplay result={result} error={error} />
            </>
          : !loadingOps && <p className="empty-msg">Selecciona un filtro</p>
        }
      </section>

      {showRegister && (
        <RegisterServiceModal
          onClose={() => setShowRegister(false)}
          onRegistered={handleRegistered}
        />
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-box modal-confirm">
            <h3>¿Eliminar filtro?</h3>
            <p>Se eliminará <strong>{deleteConfirm.name}</strong>. Esta acción no se puede deshacer.</p>
            <div className="modal-footer">
              <button className="reg-cancel-btn" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="delete-confirm-btn" onClick={handleDeleteConfirmed}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
