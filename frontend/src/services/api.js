import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

export async function uploadFile(file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data // { session_id, columns, rows, dtypes }
}

export async function getChartTypes() {
  const { data } = await api.get('/chart-types')
  return data.chart_types // [{ value, label }]
}

export async function visualize({ session_id, x_column, y_column, chart_type, title }) {
  const { data } = await api.post('/visualize', {
    session_id,
    x_column,
    y_column,
    chart_type,
    title,
  })
  return data // { chart_type, title, data, x_label, y_label }
}
