const API = process.env.REACT_APP_API_URL || 'http://localhost:5002'

export async function uploadFile(file) {
  const fd = new FormData()
  fd.append('file', file)
  const res  = await fetch(`${API}/api/upload`, { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error al subir el fichero')
  return data   // { session_id, columns, rows, dtypes, missing_info }
}

export async function handleMissings(session_id, strategies) {
  const res  = await fetch(`${API}/api/handle-missings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, strategies }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error procesando valores faltantes')
  return data
}

export async function getChartTypes() {
  const res  = await fetch(`${API}/api/chart-types`)
  const data = await res.json()
  if (!res.ok) throw new Error('Error cargando tipos de gráfico')
  return data.chart_types
}

export async function visualize(params) {
  const res  = await fetch(`${API}/api/visualize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Error generando gráfico')
  return data   // { job_id, chart_type, title }
}

export function getResultUrl(jobId) {
  return `${API}/api/result/${jobId}`
}