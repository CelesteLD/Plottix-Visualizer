const SX = process.env.REACT_APP_SERVICEX_URL || 'http://localhost:5001'
const PX = process.env.REACT_APP_PLOTTIX_URL  || 'http://localhost:5002'

// ── ServiceX ──────────────────────────────────────────────────────
export async function fetchOperations() {
  const res = await fetch(`${SX}/api/operations`)
  if (!res.ok) throw new Error('No se pudo conectar con ServiceX')
  return (await res.json()).operations
}
export async function runOperation(id, inputs) {
  const res  = await fetch(`${SX}/api/run/${id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(inputs) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error ejecutando operación')
  return data
}
export async function runImageOperation(id, imageFile, params={}) {
  const fd = new FormData(); fd.append('image',imageFile); Object.entries(params).forEach(([k,v])=>fd.append(k,v))
  const res  = await fetch(`${SX}/api/run-image/${id}`, { method:'POST', body:fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error procesando imagen')
  return data
}
export function getResultImageUrl(jobId) { return `${SX}/api/result/${jobId}` }
export async function registerService(cppFile, meta) {
  const fd = new FormData(); fd.append('file',cppFile); fd.append('meta',JSON.stringify(meta))
  const res  = await fetch(`${SX}/api/register`, { method:'POST', body:fd })
  const data = await res.json()
  if (!res.ok) { const e=new Error(data.error||'Error registrando'); e.details=data.details||null; throw e }
  return data
}
export async function deleteOperation(id) {
  const res  = await fetch(`${SX}/api/operations/${id}`, { method:'DELETE' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error eliminando')
  return data
}

// ── Plottix ───────────────────────────────────────────────────────
export async function plottixUpload(file) {
  const fd = new FormData(); fd.append('file',file)
  const res  = await fetch(`${PX}/api/upload`, { method:'POST', body:fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error subiendo fichero')
  return data
}
export async function plottixHandleMissings(session_id, strategies) {
  const res  = await fetch(`${PX}/api/handle-missings`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({session_id,strategies}) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error con valores faltantes')
  return data
}
export async function plottixGetChartTypes() {
  const res  = await fetch(`${PX}/api/chart-types`)
  const data = await res.json()
  if (!res.ok) throw new Error('Error cargando tipos de gráfico')
  return data.chart_types
}
export async function plottixVisualize(params) {
  const res  = await fetch(`${PX}/api/visualize`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(params) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error generando gráfico')
  return data
}
export function plottixResultUrl(jobId)     { return `${PX}/api/result/${jobId}` }
export function plottixResultHtmlUrl(jobId) { return `${PX}/api/result-html/${jobId}` }

// ── Plottix ML ────────────────────────────────────────────────────
// Añade estas funciones al final de portal/src/services/api.js

export async function plottixGetMLModels() {
  const res  = await fetch(`${PX}/api/ml/models`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error cargando modelos ML')
  return data // { classification: [...], regression: [...], clustering: [...] }
}

export async function plottixMLElbow({ session_id, features, max_k = 10 }) {
  const res  = await fetch(`${PX}/api/ml/elbow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, features, max_k }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error calculando codo')
  return data // { elbow: [{k, inertia}], features }
}

export async function plottixMLTrain({
  session_id, model_types, target, features,
  test_size = 0.2, n_estimators = 100, n_neighbors = 5,
  alpha = 1.0, n_clusters = 3, eps = 0.5, min_samples = 5,
}) {
  const res  = await fetch(`${PX}/api/ml/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id, model_types, target, features,
      test_size, n_estimators, n_neighbors,
      alpha, n_clusters, eps, min_samples,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error entrenando modelos')
  return data // { results: [...], errors: [...] }
}
