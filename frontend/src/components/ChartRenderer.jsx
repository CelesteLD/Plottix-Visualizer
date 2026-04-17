import React from 'react'
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

const ACCENT  = '#00e5a0'  // verde   — bar chart
const ORANGE  = '#ff9500'  // naranja — line chart
const BLUE    = '#00aaff'  // azul    — scatter plot
const ACCENT2 = '#7c6af5'  // morado  — histogram

const GRID = '#2a2a35'
const TEXT = '#8888a0'

const axis = {
  tick: { fill: TEXT, fontSize: 10, fontFamily: "'Space Mono', monospace" },
  axisLine: { stroke: GRID },
  tickLine: { stroke: GRID },
}
const tooltip = {
  contentStyle: { background: '#1c1c22', border: `1px solid ${GRID}`, borderRadius: 8, color: '#f0f0f5', fontSize: 12 },
}

export default function ChartRenderer({ chartData }) {
  const { chart_type, title, data, x_label, y_label } = chartData

  const renderChart = () => {
    switch (chart_type) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" {...axis} angle={-35} textAnchor="end" interval={0} label={{ value: x_label, position: 'insideBottom', offset: -32, fill: TEXT, fontSize: 10 }} />
            <YAxis {...axis} label={{ value: y_label, angle: -90, position: 'insideLeft', fill: TEXT, fontSize: 10 }} />
            <Tooltip {...tooltip} />
            <Bar dataKey="y" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        )
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" {...axis} label={{ value: x_label, position: 'insideBottom', offset: -10, fill: TEXT, fontSize: 10 }} />
            <YAxis {...axis} label={{ value: y_label, angle: -90, position: 'insideLeft', fill: TEXT, fontSize: 10 }} />
            <Tooltip {...tooltip} />
            <Line type="monotone" dataKey="y" stroke={ORANGE} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        )
      case 'scatter':
        return (
          <ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" name={x_label} {...axis} label={{ value: x_label, position: 'insideBottom', offset: -10, fill: TEXT, fontSize: 10 }} />
            <YAxis dataKey="y" name={y_label} {...axis} label={{ value: y_label, angle: -90, position: 'insideLeft', fill: TEXT, fontSize: 10 }} />
            <Tooltip {...tooltip} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={data} fill={BLUE} fillOpacity={0.7} />
          </ScatterChart>
        )
      case 'histogram':
        return (
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="x" {...axis} angle={-35} textAnchor="end" interval={0} />
            <YAxis {...axis} label={{ value: 'Frequency', angle: -90, position: 'insideLeft', fill: TEXT, fontSize: 10 }} />
            <Tooltip {...tooltip} />
            <Bar dataKey="y" fill={ACCENT2} radius={[2, 2, 0, 0]} />
          </BarChart>
        )
      default:
        return <p style={{ color: 'var(--text-secondary)' }}>Unknown: {chart_type}</p>
    }
  }

  return (
    <div className="chart-wrap">
      <p className="chart-title">{title}</p>
      <ResponsiveContainer width="100%" height={300}>
        {renderChart()}
      </ResponsiveContainer>
      <style>{`
        .chart-wrap { display: flex; flex-direction: column; gap: 12px; }
        .chart-title { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-secondary); }
      `}</style>
    </div>
  )
}