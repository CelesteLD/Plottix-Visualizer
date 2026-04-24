import React, { useCallback } from 'react'
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  ScatterChart, Scatter,
  ComposedChart, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie,
} from 'recharts'

const ACCENT  = '#00e5a0'
const ORANGE  = '#ff9500'
const BLUE    = '#00aaff'
const PURPLE  = '#7c6af5'
const GRID    = '#2a2a35'
const TEXT    = '#8888a0'

const SERIES_COLORS = [
  '#00e5a0', '#ff9500', '#00aaff', '#ff4d8d',
  '#c882ff', '#ffdd00', '#00e5e5', '#ff6b6b',
]
const PIE_COLORS = [
  '#00e5a0', '#00aaff', '#ff9500', '#c882ff',
  '#ff4d8d', '#ffdd00', '#7c6af5', '#00e5e5',
  '#ff6b6b', '#4caf7d', '#f5a623', '#64c8ff',
]
const AGG_LABELS = { mean: 'avg', sum: 'sum', count: 'count', min: 'min', max: 'max' }

const axis = {
  tick: { fill: TEXT, fontSize: 10, fontFamily: "'Space Mono', monospace" },
  axisLine: { stroke: GRID },
  tickLine: { stroke: GRID },
}
const tooltipStyle = {
  contentStyle: { background: '#1c1c22', border: `1px solid ${GRID}`, borderRadius: 8, color: '#f0f0f5', fontSize: 12 },
}

// ── BoxPlot — pure SVG implementation ────────────────────────────────────────
function BoxPlotSVG({ data, xLabel, yLabel }) {
  // Fixed pixel dimensions — same visual footprint as other charts
  const W = 560, H = 280
  const margin = { top: 12, right: 110, bottom: 52, left: 48 }
  const innerW = W - margin.left - margin.right
  const innerH = H - margin.top - margin.bottom

  if (!data?.length) return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', maxHeight: 280 }}>
      <text x={W/2} y={H/2} fill={TEXT} textAnchor="middle">No data</text>
    </svg>
  )

  // Y domain — exclude outliers from domain to avoid squashing the boxes
  const boxVals = data.flatMap(d => [d.min, d.max])
  const yMin = Math.min(...boxVals)
  const yMax = Math.max(...boxVals)
  const pad  = (yMax - yMin) * 0.12 || 1
  const yLo  = yMin - pad
  const yHi  = yMax + pad
  // Clamp outliers to domain so they don't escape the plot area
  const scaleY = v => margin.top + innerH - ((Math.min(Math.max(v, yLo), yHi) - yLo) / (yHi - yLo)) * innerH

  // X scale — band
  const n = data.length
  const bandW = innerW / n
  const boxW  = Math.max(Math.min(bandW * 0.45, 36), 10)
  const cx = i => margin.left + bandW * i + bandW / 2

  // Y axis ticks
  const yTickVals = Array.from({ length: 6 }, (_, i) => yLo + (yHi - yLo) * i / 5)

  // Spread outliers horizontally within the band to avoid stacking
  const jitter = (oi, hw) => {
    const slots = Math.max(Math.floor(hw / 4), 1)
    const col   = oi % (slots * 2 + 1) - slots
    return col * 4
  }

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', maxHeight: 300 }}>
      {/* Grid lines */}
      {yTickVals.map((v, i) => (
        <line key={i}
          x1={margin.left} x2={margin.left + innerW}
          y1={scaleY(v)}   y2={scaleY(v)}
          stroke={GRID} strokeDasharray="3 3" />
      ))}

      {/* Y axis ticks + labels */}
      {yTickVals.map((v, i) => (
        <text key={i} x={margin.left - 6} y={scaleY(v) + 4}
          fill={TEXT} fontSize={9} textAnchor="end" fontFamily="monospace">
          {v.toFixed(1)}
        </text>
      ))}

      {/* Y axis label */}
      <text
        x={-(margin.top + innerH / 2)} y={13}
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
            {/* Whisker — upper */}
            <line x1={x} x2={x} y1={pQ3} y2={pMax} stroke={TEXT} strokeWidth={1} strokeDasharray="3 2" />
            <line x1={x - capW} x2={x + capW} y1={pMax} y2={pMax} stroke={TEXT} strokeWidth={1.5} />

            {/* Whisker — lower */}
            <line x1={x} x2={x} y1={pQ1} y2={pMin} stroke={TEXT} strokeWidth={1} strokeDasharray="3 2" />
            <line x1={x - capW} x2={x + capW} y1={pMin} y2={pMin} stroke={TEXT} strokeWidth={1.5} />

            {/* IQR box */}
            <rect x={x - hw} y={pQ3} width={boxW} height={Math.abs(pQ1 - pQ3)}
              fill="rgba(0,229,160,0.12)" stroke={ACCENT} strokeWidth={1.5} />

            {/* Median line */}
            <line x1={x - hw} x2={x + hw} y1={pMed} y2={pMed}
              stroke={ACCENT} strokeWidth={2} />

            {/* Mean dot */}
            <circle cx={x} cy={pMea} r={2.5} fill={ORANGE} />

            {/* Outliers — jittered horizontally, capped at 20 visible */}
            {(d.outliers || []).slice(0, 20).map((v, oi) => (
              <circle key={oi}
                cx={x + jitter(oi, hw)} cy={scaleY(v)} r={2}
                fill="none" stroke="#ff6b6b" strokeWidth={1} opacity={0.7} />
            ))}

            {/* X tick label */}
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

      {/* Legend — placed in right margin, never overlaps plot */}
      <g transform={`translate(${W - margin.right + 10}, ${margin.top + 10})`}>
        <rect x={-6} y={-6} width={94} height={54} rx={5}
          fill="#1c1c22" stroke={GRID} strokeWidth={1} />
        <line x1={0} x2={14} y1={6} y2={6} stroke={ACCENT} strokeWidth={2} />
        <text x={18} y={10} fill={TEXT} fontSize={9} fontFamily="monospace">Median</text>
        <circle cx={7} cy={22} r={2.5} fill={ORANGE} />
        <text x={18} y={26} fill={TEXT} fontSize={9} fontFamily="monospace">Mean</text>
        <circle cx={7} cy={38} r={2} fill="none" stroke="#ff6b6b" strokeWidth={1} />
        <text x={18} y={42} fill={TEXT} fontSize={9} fontFamily="monospace">Outlier</text>
      </g>
    </svg>
  )
}

// Custom boxplot tooltip
function BoxTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{ background: '#1c1c22', border: `1px solid ${GRID}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#f0f0f5', lineHeight: 1.9, pointerEvents: 'none' }}>
      <p style={{ fontWeight: 700, marginBottom: 4, color: ACCENT }}>{d.group}</p>
      <p>Max:    <b>{d.max}</b></p>
      <p>Q3:     <b>{d.q3}</b></p>
      <p>Median: <b style={{ color: ACCENT }}>{d.median}</b></p>
      <p>Mean:   <b style={{ color: ORANGE }}>{d.mean}</b></p>
      <p>Q1:     <b>{d.q1}</b></p>
      <p>Min:    <b>{d.min}</b></p>
      {d.outliers?.length > 0 && <p style={{ color: '#ff6b6b' }}>Outliers: {d.outliers.length}</p>}
    </div>
  )
}

// ── Main renderer ─────────────────────────────────────────────────────────────
export default function ChartRenderer({ chartData }) {
  const { chart_type, title, data, x_label, y_label, y_columns, aggregation } = chartData
  const showAggBadge = aggregation && aggregation !== 'none'

  const renderChart = () => {
    switch (chart_type) {

      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" {...axis} angle={-35} textAnchor="end" interval={0}
              label={{ value: x_label, position: 'insideBottom', offset: -32, fill: TEXT, fontSize: 10 }} />
            <YAxis {...axis} label={{ value: y_label, angle: -90, position: 'insideLeft', fill: TEXT, fontSize: 10 }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="y" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        )

      case 'multi_bar':
        return (
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" {...axis} angle={-35} textAnchor="end" interval={0}
              label={{ value: x_label, position: 'insideBottom', offset: -32, fill: TEXT, fontSize: 10 }} />
            <YAxis {...axis} />
            <Tooltip {...tooltipStyle} />
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
            <XAxis dataKey="x" {...axis}
              label={{ value: x_label, position: 'insideBottom', offset: -10, fill: TEXT, fontSize: 10 }} />
            <YAxis {...axis} label={{ value: y_label, angle: -90, position: 'insideLeft', fill: TEXT, fontSize: 10 }} />
            <Tooltip {...tooltipStyle} />
            <Line type="monotone" dataKey="y" stroke={ORANGE} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        )

      case 'multi_line':
        return (
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" {...axis}
              label={{ value: x_label, position: 'insideBottom', offset: -10, fill: TEXT, fontSize: 10 }} />
            <YAxis {...axis} />
            <Tooltip {...tooltipStyle} />
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
            <XAxis dataKey="x" name={x_label} {...axis}
              label={{ value: x_label, position: 'insideBottom', offset: -10, fill: TEXT, fontSize: 10 }} />
            <YAxis dataKey="y" name={y_label} {...axis}
              label={{ value: y_label, angle: -90, position: 'insideLeft', fill: TEXT, fontSize: 10 }} />
            <Tooltip {...tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={data} fill={BLUE} fillOpacity={0.7} />
          </ScatterChart>
        )

      case 'histogram':
        return (
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" {...axis} angle={-35} textAnchor="end" interval={0} />
            <YAxis {...axis} label={{ value: 'Frequency', angle: -90, position: 'insideLeft', fill: TEXT, fontSize: 10 }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="y" fill={PURPLE} radius={[2, 2, 0, 0]} />
          </BarChart>
        )

      case 'pie':
        return (
          <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <Pie data={data} dataKey="value" nameKey="name"
              cx="50%" cy="50%" outerRadius="75%"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
              labelLine={{ stroke: TEXT, strokeWidth: 0.5 }}>
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v) => [v, 'Value']} />
          </PieChart>
        )

      // BoxPlot uses pure SVG — no ResponsiveContainer child needed
      case 'boxplot':
        return <BoxPlotSVG data={data} xLabel={x_label} yLabel={y_label} />

      default:
        return <p style={{ color: 'var(--text-secondary)' }}>Unknown chart type: {chart_type}</p>
    }
  }

  // BoxPlot uses its own SVG — wrap in fixed div instead of ResponsiveContainer
  const isBoxplot = chart_type === 'boxplot'

  return (
    <div className="chart-wrap">
      <div className="chart-header">
        <p className="chart-title">{title}</p>
        {showAggBadge && (
          <span className="chart-agg-badge">{AGG_LABELS[aggregation] || aggregation}</span>
        )}
      </div>
      {isBoxplot
        ? <div style={{ width: '100%', height: 300, overflow: 'hidden' }}>{renderChart()}</div>
        : <ResponsiveContainer width="100%" height={300}>{renderChart()}</ResponsiveContainer>
      }
      <style>{`
        .chart-wrap { display: flex; flex-direction: column; gap: 10px; }
        .chart-header { display: flex; align-items: center; gap: 8px; }
        .chart-title {
          font-family: var(--font-mono); font-size: 0.8rem;
          color: var(--text-secondary); flex: 1;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .chart-agg-badge {
          font-family: var(--font-mono); font-size: 0.65rem;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: var(--accent); background: var(--accent-dim);
          border: 1px solid var(--accent); border-radius: 20px;
          padding: 2px 8px; flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}