import React, { useState, useEffect, useCallback } from 'react'
import OperationSelector    from './OperationSelector'
import OperationForm        from './OperationForm'
import ResultDisplay        from './ResultDisplay'
import RegisterServiceModal from './RegisterServiceModal'
import { fetchOperations, runOperation, deleteOperation } from '../../services/api'

const NUMERIC_TYPES = ['numeric', undefined, null]
const isNumeric = op => !op.type || op.type === 'numeric'

export default function OperationsView() {
  const [operations,   setOperations]   = useState([])
  const [selected,     setSelected]     = useState(null)
  const [result,       setResult]       = useState(null)
  const [error,        setError]        = useState(null)
  const [warning,      setWarning]      = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [loadingOps,   setLoadingOps]   = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [deleteConfirm,setDeleteConfirm]= useState(null)

  const loadOps = useCallback(() => {
    setLoadingOps(true)
    fetchOperations()
      .then(ops => {
        const num = ops.filter(isNumeric)
        setOperations(num)
        setSelected(prev => {
          if (!prev) return num[0] ?? null
          return num.find(o => o.id === prev.id) ?? num[0] ?? null
        })
      })
      .catch(() => setError('No se pudo conectar con el backend de ServiceX'))
      .finally(() => setLoadingOps(false))
  }, [])

  useEffect(() => { loadOps() }, [loadOps])

  async function handleRun(inputs, validationWarning) {
    setResult(null); setError(null); setWarning(null)
    if (validationWarning) { setWarning(validationWarning); return }
    setLoading(true)
    try   { setResult(await runOperation(selected.id, inputs)) }
    catch (e) { setError(e.message) }
    finally   { setLoading(false) }
  }

  async function handleDeleteConfirmed() {
    if (!deleteConfirm) return
    try   { await deleteOperation(deleteConfirm.id); setDeleteConfirm(null); loadOps() }
    catch (e) { setError(e.message); setDeleteConfirm(null) }
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

  return (
    <div className="app-main">
      <aside className="sidebar">
        <div className="sidebar-top">
          <h3>Operaciones numéricas</h3>
          <button className="register-btn" onClick={() => setShowRegister(true)}>
            + Añadir servicio
          </button>
        </div>
        <div className="sidebar-scroll">
          {loadingOps
            ? <p className="empty-msg">Cargando…</p>
            : <OperationSelector
                operations={operations}
                selected={selected}
                onSelect={op => { setSelected(op); setResult(null); setError(null); setWarning(null) }}
                onDelete={op => setDeleteConfirm(op)}
              />
          }
        </div>
      </aside>

      <section className="content">
        {selected
          ? <>
              <OperationForm operation={selected} onSubmit={handleRun} loading={loading} />
              <ResultDisplay result={result} error={error} warning={warning} />
            </>
          : !loadingOps && <p className="empty-msg">Selecciona una operación</p>
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
            <h3>¿Eliminar servicio?</h3>
            <p>Se eliminará <strong>{deleteConfirm.name}</strong> y su binario. Esta acción no se puede deshacer.</p>
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
