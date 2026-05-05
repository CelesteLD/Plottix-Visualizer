import React from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  COLOR_ACCENT, COLOR_ACCENT_DIM,
  CHART_GRID, CHART_AXIS_TEXT,
  CHART_TOOLTIP_BG, CHART_TOOLTIP_BORDER, CHART_TOOLTIP_TEXT,
  SERIES_COLORS, PIE_COLORS,
  rechartsAxis, rechartsTooltip,
} from '../tokens.js'
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts'

// Aliases used in SVG charts
const ACCENT = COLOR_ACCENT
const ORANGE = '#e07b39'
const BLUE   = '#3a8fd4'
const GRID   = CHART_GRID
const TEXT   = CHART_AXIS_TEXT

// ── Leaflet map — light tile layer ────────────────────────────────
function GeoMapLeaflet({ geojson, geoStyle, onEachFeature }) {
  const key = React.useMemo(() => JSON.stringify(geojson).length, [geojson])
  return (
    <MapContainer
      key={key}
      center={[20, 0]} zoom={2}
      style={{ height: 340, borderRadius: 0, background: '#e8e4dc' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="© OpenStreetMap © CARTO"
        subdomains="abcd"
      />
      <GeoJSON data={geojson} style={geoStyle} onEachFeature={onEachFeature} />
    </MapContainer>
  )
}

// ── BoxPlot — pure SVG ────────────────────────────────────────────
function BoxPlotSVG({ data, xLabel, yLabel }) {
  const W = 560, H = 280
  const margin = { top: 14, right: 110, bottom: 52, left: 52 }
  const innerW = W - margin.left - margin.right
  const innerH = H - margin.top - margin.bottom

  if (!data?.length) return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', maxHeight: 280 }}>
      <text x={W/2} y={H/2} fill={TEXT} textAnchor="middle">Sin datos</text>
    </svg>
  )

  const boxVals = data.flatMap(d => [d.min, d.max])
  const yMin = Math.min(...boxVals)
  const yMax = Math.max(...boxVals)
  const pad  = (yMax - yMin) * 0.12 || 1
  const yLo  = yMin - pad
  const yHi  = yMax + pad
  const scaleY = v => margin.top + innerH - ((Math.min(Math.max(v, yLo), yHi) - yLo) / (yHi - yLo)) * innerH

  const n = data.length
  const bandW = innerW / n
  const boxW  = Math.max(Math.min(bandW * 0.45, 36), 10)
  const cx    = i => margin.left + bandW * i + bandW / 2

  const yTickVals = Array.from({ length: 6 }, (_, i) => yLo + (yHi - yLo) * i / 5)
  const jitter = (oi, hw) => {
    const slots = Math.max(Math.floor(hw / 4), 1)
    const col   = oi % (slots * 2 + 1) - slots
    return col * 4
  }

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', maxHeight: 300 }}>
      {/* Grid lines */}
      {yTickVals.map((v, i) => (
        <line key={i} x1={margin.left} x2={margin.left + innerW}
          y1={scaleY(v)} y2={scaleY(v)}
          stroke={GRID} strokeDasharray="3 3" />
      ))}
      {/* Y axis ticks */}
      {yTickVals.map((v, i) => (
        <text key={i} x={margin.left - 6} y={scaleY(v) + 4}
          fill={TEXT} fontSize={9} textAnchor="end" fontFamily="monospace">
          {v.toFixed(1)}
        </text>
      ))}
      {/* Y axis label */}
      <text x={-(margin.top + innerH / 2)} y={14}
        fill={TEXT} fontSize={9} textAnchor="middle"
        transform="rotate(-90)" fontFamily="monospace">
        {yLabel}
      </text>
      {/* X axis label */}
      <text x={margin.left + innerW / 2} y={H - 2}
        fill={TEXT} fontSize={9} textAnchor="middle" fontFamily="monospace">
        {xLabel}
      </text>
      {/* Boxes */}
      {data.map((d, i) => {
        const x = cx(i)
        const pQ1  = scaleY(d.q1)
        const pQ3  = scaleY(d.q3)
        const pMed = scaleY(d.median)
        const pMea = scaleY(d.mean)
        const pMin = scaleY(d.min)
        const pMax = scaleY(d.max)
        const hw   = boxW / 2
        const capW = hw * 0.6
        return (
          <g key={d.group}>
            <line x1={x} x2={x} y1={pQ3} y2={pMax} stroke={TEXT} strokeWidth={1} strokeDasharray="3 2" />
            <line x1={x - capW} x2={x + capW} y1={pMax} y2={pMax} stroke={TEXT} strokeWidth={1.5} />
            <line x1={x} x2={x} y1={pQ1} y2={pMin} stroke={TEXT} strokeWidth={1} strokeDasharray="3 2" />
            <line x1={x - capW} x2={x + capW} y1={pMin} y2={pMin} stroke={TEXT} strokeWidth={1.5} />
            <rect x={x - hw} y={pQ3} width={boxW} height={Math.abs(pQ1 - pQ3)}
              fill={`rgba(14,168,126,0.12)`} stroke={ACCENT} strokeWidth={1.5} />
            <line x1={x - hw} x2={x + hw} y1={pMed} y2={pMed} stroke={ACCENT} strokeWidth={2} />
            <circle cx={x} cy={pMea} r={2.5} fill={ORANGE} />
            {(d.outliers || []).slice(0, 20).map((v, oi) => (
              <circle key={oi}
                cx={x + jitter(oi, hw)} cy={scaleY(v)} r={2}
                fill="none" stroke="#d44040" strokeWidth={1} opacity={0.7} />
            ))}
            <text
              x={x} y={margin.top + innerH + 12}
              fill={TEXT} fontSize={8.5} textAnchor="end"
              transform={`rotate(-35, ${x}, ${margin.top + innerH + 12})`}
              fontFamily="monospace">
              {d.group.length > 11 ? d.group.slice(0, 10) + '…' : d.group}
            </text>
          </g>
        )
      })}
      {/* Legend */}
      <g transform={`translate(${W - margin.right + 10}, ${margin.top + 10})`}>
        <rect x={-6} y={-6} width={94} height={54} rx={5}
          fill="white" stroke={GRID} strokeWidth={1} />
        <line x1={0} x2={14} y1={6} y2={6} stroke={ACCENT} strokeWidth={2} />
        <text x={18} y={10} fill={TEXT} fontSize={9} fontFamily="monospace">Mediana</text>
        <circle cx={7} cy={22} r={2.5} fill={ORANGE} />
        <text x={18} y={26} fill={TEXT} fontSize={9} fontFamily="monospace">Media</text>
        <circle cx={7} cy={38} r={2} fill="none" stroke="#d44040" strokeWidth={1} />
        <text x={18} y={42} fill={TEXT} fontSize={9} fontFamily="monospace">Outlier</text>
      </g>
    </svg>
  )
}

const AGG_LABELS = { mean: 'avg', sum: 'sum', count: 'count', min: 'min', max: 'max' }

// ── Main renderer ─────────────────────────────────────────────────
export default function ChartRenderer({ chartData }) {
  const { chart_type, title, data, x_label, y_label, y_columns, aggregation } = chartData
  const showAggBadge = aggregation && aggregation !== 'none' && chart_type !== 'pie'

  const renderChart = () => {
    switch (chart_type) {

      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" {...rechartsAxis} angle={-35} textAnchor="end" interval={0}
              label={{ value: x_label, position: 'insideBottom', offset: -32, fill: TEXT, fontSize: 10 }} />
            <YAxis {...rechartsAxis} label={{ value: y_label, angle: -90, position: 'insideLeft', fill: TEXT, fontSize: 10 }} />
            <Tooltip {...rechartsTooltip} />
            <Bar dataKey="y" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        )

      case 'multi_bar':
        return (
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" {...rechartsAxis} angle={-35} textAnchor="end" interval={0}
              label={{ value: x_label, position: 'insideBottom', offset: -32, fill: TEXT, fontSize: 10 }} />
            <YAxis {...rechartsAxis} />
            <Tooltip {...rechartsTooltip} />
            <Legend wrapperStyle={{ fontSize: 11, color: TEXT, paddingTop: 8 }} />
            {(y_columns || []).map((col, i) => (
              <Bar key={col} dataKey={col} fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                radius={[3, 3, 0, 0]} maxBarSize={32} />
            ))}
          </BarChart>
        )

      case 'line':
        return (
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" {...rechartsAxis}
              label={{ value: x_label, position: 'insideBottom', offset: -10, fill: TEXT, fontSize: 10 }} />
            <YAxis {...rechartsAxis} label={{ value: y_label, angle: -90, position: 'insideLeft', fill: TEXT, fontSize: 10 }} />
            <Tooltip {...rechartsTooltip} />
            <Line type="monotone" dataKey="y" stroke={ORANGE} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        )

      case 'multi_line':
        return (
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" {...rechartsAxis}
              label={{ value: x_label, position: 'insideBottom', offset: -10, fill: TEXT, fontSize: 10 }} />
            <YAxis {...rechartsAxis} />
            <Tooltip {...rechartsTooltip} />
            <Legend wrapperStyle={{ fontSize: 11, color: TEXT, paddingTop: 8 }} />
            {(y_columns || []).map((col, i) => (
              <Line key={col} type="monotone" dataKey={col}
                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        )

      case 'scatter':
        return (
          <ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" name={x_label} {...rechartsAxis}
              label={{ value: x_label, position: 'insideBottom', offset: -10, fill: TEXT, fontSize: 10 }} />
            <YAxis dataKey="y" name={y_label} {...rechartsAxis}
              label={{ value: y_label, angle: -90, position: 'insideLeft', fill: TEXT, fontSize: 10 }} />
            <Tooltip {...rechartsTooltip} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={data} fill={BLUE} fillOpacity={0.65} />
          </ScatterChart>
        )

      case 'histogram':
        return (
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" {...rechartsAxis} angle={-35} textAnchor="end" interval={0} />
            <YAxis {...rechartsAxis} label={{ value: 'Frecuencia', angle: -90, position: 'insideLeft', fill: TEXT, fontSize: 10 }} />
            <Tooltip {...rechartsTooltip} />
            <Bar dataKey="y" fill="#7b5ea7" radius={[2, 2, 0, 0]} />
          </BarChart>
        )

      case 'pie':
        return (
          <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <Pie data={data} dataKey="value" nameKey="name"
              cx="50%" cy="50%" outerRadius="72%"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
              labelLine={{ stroke: TEXT, strokeWidth: 0.5 }}>
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...rechartsTooltip} formatter={(v) => [v, 'Valor']} />
          </PieChart>
        )

      case 'boxplot':
        return <BoxPlotSVG data={data} xLabel={x_label} yLabel={y_label} />

      case 'kde':
        return (
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" {...rechartsAxis}
              label={{ value: x_label, position: 'insideBottom', offset: -10, fill: TEXT, fontSize: 10 }} />
            <YAxis {...rechartsAxis}
              label={{ value: 'Densidad', angle: -90, position: 'insideLeft', fill: TEXT, fontSize: 10 }} />
            <Tooltip {...rechartsTooltip} formatter={(v) => [v.toFixed(5), 'Densidad']} />
            <Line type="monotone" dataKey="y" stroke={BLUE} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
          </LineChart>
        )

      case 'violin': {
        const { kde_points = [], stats = {} } = chartData
        const W = 420, H = 280
        const margin = { top: 20, right: 120, bottom: 40, left: 52 }
        const innerH = H - margin.top - margin.bottom
        const cx = margin.left + (W - margin.left - margin.right) / 2
        const halfW = 70

        const allVals = kde_points.map(p => p.value)
        const vMin = Math.min(...allVals)
        const vMax = Math.max(...allVals)
        const scaleY = v => margin.top + innerH - ((v - vMin) / (vMax - vMin || 1)) * innerH

        const right = kde_points.map((p, i) => {
          const x = cx + p.density * halfW
          const y = scaleY(p.value)
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
        }).join(' ')
        const left = [...kde_points].reverse().map(p => {
          const x = cx - p.density * halfW
          const y = scaleY(p.value)
          return `L${x.toFixed(1)},${y.toFixed(1)}`
        }).join(' ')
        const path = right + ' ' + left + ' Z'

        const ticks = Array.from({ length: 5 }, (_, i) => vMin + (vMax - vMin) * i / 4)

        return (
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', maxHeight: 300 }}>
            {ticks.map((v, i) => (
              <line key={i} x1={margin.left} x2={W - margin.right}
                y1={scaleY(v)} y2={scaleY(v)} stroke={GRID} strokeDasharray="3 3" />
            ))}
            {ticks.map((v, i) => (
              <text key={i} x={margin.left - 6} y={scaleY(v) + 4}
                fill={TEXT} fontSize={9} textAnchor="end" fontFamily="monospace">
                {v.toFixed(2)}
              </text>
            ))}
            <text x={cx} y={H - 6} fill={TEXT} fontSize={9} textAnchor="middle" fontFamily="monospace">
              {x_label}
            </text>
            <path d={path} fill={`rgba(58,143,212,0.15)`} stroke={BLUE} strokeWidth={1.5} />
            <rect x={cx - 10} y={scaleY(stats.q3)} width={20}
              height={Math.abs(scaleY(stats.q1) - scaleY(stats.q3))}
              fill={`rgba(14,168,126,0.18)`} stroke={ACCENT} strokeWidth={1.5} />
            <line x1={cx} x2={cx} y1={scaleY(stats.q3)} y2={scaleY(stats.max)} stroke={TEXT} strokeWidth={1} strokeDasharray="3 2" />
            <line x1={cx} x2={cx} y1={scaleY(stats.q1)} y2={scaleY(stats.min)} stroke={TEXT} strokeWidth={1} strokeDasharray="3 2" />
            <line x1={cx - 8} x2={cx + 8} y1={scaleY(stats.max)} y2={scaleY(stats.max)} stroke={TEXT} strokeWidth={1.5} />
            <line x1={cx - 8} x2={cx + 8} y1={scaleY(stats.min)} y2={scaleY(stats.min)} stroke={TEXT} strokeWidth={1.5} />
            <line x1={cx - 10} x2={cx + 10} y1={scaleY(stats.median)} y2={scaleY(stats.median)} stroke={ACCENT} strokeWidth={2.5} />
            <circle cx={cx} cy={scaleY(stats.mean)} r={3} fill={ORANGE} />
            <g transform={`translate(${W - margin.right + 10}, ${margin.top})`}>
              <rect x={-6} y={-6} width={94} height={54} rx={5}
                fill="white" stroke={GRID} strokeWidth={1} />
              <line x1={0} x2={14} y1={6} y2={6} stroke={ACCENT} strokeWidth={2.5} />
              <text x={18} y={10} fill={TEXT} fontSize={9} fontFamily="monospace">Mediana</text>
              <circle cx={7} cy={22} r={3} fill={ORANGE} />
              <text x={18} y={26} fill={TEXT} fontSize={9} fontFamily="monospace">Media</text>
              <text x={2} y={42} fill={TEXT} fontSize={9} fontFamily="monospace">n={stats.n}</text>
            </g>
          </svg>
        )
      }

      case 'correlogram': {
        const cols = chartData.columns || []
        const n = cols.length
        const CELL = Math.min(Math.floor(460 / n), 72)
        const W = CELL * n + 90
        const H = CELL * n + 70

        // RdBu diverging — red(-1) → white(0) → blue(+1), legible on light bg
        const getColor = (v) => {
          const t = Math.max(-1, Math.min(1, v))
          if (t >= 0) {
            const r = Math.round(255 * (1 - t) + 33  * t)
            const g = Math.round(255 * (1 - t) + 102 * t)
            const b = Math.round(255 * (1 - t) + 172 * t)
            return `rgb(${r},${g},${b})`
          } else {
            const s = -t
            const r = Math.round(255 * (1 - s) + 178 * s)
            const g = Math.round(255 * (1 - s) + 24  * s)
            const b = Math.round(255 * (1 - s) + 43  * s)
            return `rgb(${r},${g},${b})`
          }
        }
        // Text colour for cell: dark if background is light, light if dark
        const cellTextColor = (v) => {
          if (v === 1) return '#ffffff'
          return Math.abs(v) > 0.55 ? '#ffffff' : '#2a2a28'
        }

        return (
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', maxHeight: 420 }}>
            {cols.map((col, i) => (
              <text key={col} x={90 + i * CELL + CELL / 2} y={14}
                fill={TEXT} fontSize={Math.min(9, CELL * 0.18)} textAnchor="middle"
                transform={`rotate(-35, ${90 + i * CELL + CELL / 2}, 14)`}
                fontFamily="monospace">
                {col.length > 9 ? col.slice(0, 8) + '…' : col}
              </text>
            ))}
            {cols.map((col, i) => (
              <text key={col} x={86} y={32 + i * CELL + CELL / 2 + 4}
                fill={TEXT} fontSize={Math.min(9, CELL * 0.18)} textAnchor="end"
                fontFamily="monospace">
                {col.length > 9 ? col.slice(0, 8) + '…' : col}
              </text>
            ))}
            {data.map((cell, idx) => {
              const ci = cols.indexOf(cell.x)
              const ri = cols.indexOf(cell.y)
              if (ci < 0 || ri < 0) return null
              const cx2 = 90 + ci * CELL
              const cy2 = 32 + ri * CELL
              const isDiag = cell.x === cell.y
              return (
                <g key={idx}>
                  <rect x={cx2} y={cy2} width={CELL} height={CELL}
                    fill={isDiag ? '#e8e4dc' : getColor(cell.value)}
                    stroke="#ddddd5" strokeWidth={0.5} />
                  <text x={cx2 + CELL / 2} y={cy2 + CELL / 2 + 4}
                    fill={isDiag ? TEXT : cellTextColor(cell.value)}
                    fontSize={Math.min(10, CELL * 0.22)} textAnchor="middle"
                    fontFamily="monospace" fontWeight={isDiag ? 'normal' : '600'}>
                    {isDiag ? '—' : cell.value.toFixed(2)}
                  </text>
                </g>
              )
            })}
          </svg>
        )
      }

      case 'geomap': {
        const { geojson, min: vMin, max: vMax, value_column, matched, total_countries } = chartData

        // YlOrRd palette — works well on light background
        const palette = [
          [255,255,204],[255,237,160],[254,217,118],[254,178,76],
          [253,141,60],[252,78,42],[227,26,28],[177,0,38]
        ]
        const getColor = (val) => {
          if (val === null || val === undefined) return '#e0dfd8'
          const t = Math.max(0, Math.min(1, (val - vMin) / (vMax - vMin || 1)))
          const idx = Math.min(Math.floor(t * (palette.length - 1)), palette.length - 2)
          const frac = t * (palette.length - 1) - idx
          const [r1,g1,b1] = palette[idx]
          const [r2,g2,b2] = palette[idx + 1]
          return `rgb(${Math.round(r1+(r2-r1)*frac)},${Math.round(g1+(g2-g1)*frac)},${Math.round(b1+(b2-b1)*frac)})`
        }

        const geoStyle = (feature) => ({
          fillColor:   getColor(feature.properties.value),
          fillOpacity: feature.properties.value !== null ? 0.78 : 0.2,
          color: '#ccc', weight: 0.5,
        })

        const onEachFeature = (feature, layer) => {
          const { name, value } = feature.properties
          layer.bindTooltip(
            value !== null
              ? `<b>${name}</b><br/>${value_column}: <b>${value}</b>`
              : `<b>${name}</b><br/><i>Sin datos</i>`,
            { sticky: true }
          )
          layer.on({
            mouseover: (e) => e.target.setStyle({ weight: 1.5, color: '#0ea87e' }),
            mouseout:  (e) => e.target.setStyle({ weight: 0.5, color: '#ccc' }),
          })
        }

        const legendSteps = Array.from({ length: 6 }, (_, i) => {
          const v = vMin + (vMax - vMin) * i / 5
          return { v, color: getColor(v) }
        })

        return (
          <div>
            <div style={{ margin: '0 -18px' }}>
              <GeoMapLeaflet geojson={geojson} geoStyle={geoStyle} onEachFeature={onEachFeature} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: TEXT, marginRight: 4 }}>
                {value_column}:
              </span>
              {legendSteps.map(({ v, color }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ display: 'inline-block', width: 12, height: 12, background: color, borderRadius: 2, border: '1px solid #ddd' }} />
                  <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: TEXT }}>{v.toFixed(2)}</span>
                </div>
              ))}
              <span style={{ fontSize: '0.68rem', color: TEXT, fontFamily: 'monospace', marginLeft: 'auto' }}>
                {matched} / {total_countries} países con datos
              </span>
            </div>
          </div>
        )
      }

      default:
        return <p style={{ color: 'var(--text-secondary)' }}>Tipo de gráfico desconocido: {chart_type}</p>
    }
  }

  const isSvgChart = ['boxplot', 'violin'].includes(chart_type)

  return (
    <div className="chart-wrap">
      <div className="chart-header">
        <p className="chart-title">{title}</p>
        {showAggBadge && (
          <span className="chart-agg-badge">{AGG_LABELS[aggregation] || aggregation}</span>
        )}
      </div>
      {isSvgChart
        ? <div style={{ width: '100%', overflow: 'hidden' }}>{renderChart()}</div>
        : <ResponsiveContainer width="100%" height={300}>{renderChart()}</ResponsiveContainer>
      }
      <style>{`
        .chart-wrap { display: flex; flex-direction: column; gap: 10px; }
        .chart-header { display: flex; align-items: center; gap: 8px; }
        .chart-title {
          font-family: var(--font-mono); font-size: 0.78rem;
          color: var(--text-secondary); flex: 1;
          overflow-wrap: break-word; word-break: break-word;
        }
        .chart-agg-badge {
          font-family: var(--font-mono); font-size: 0.63rem;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: var(--accent); background: var(--accent-dim);
          border: 1px solid var(--accent-border); border-radius: 20px;
          padding: 2px 8px; flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}
