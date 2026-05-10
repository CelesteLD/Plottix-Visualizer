import React, { useState } from 'react'
import MLResultCard from './MLResultCard'

const CATEGORY_COLOR = {
  classification: '#5B4FE8',
  regression:     '#059669',
  clustering:     '#D97706',
}

export default function MLResultsPanel({ results, errors, config, selectedModels, onReset }) {
  const [activeTab, setActiveTab] = useState('comparison')
  const [selected,  setSelected]  = useState(null)

  const bestOf = (category, metric, higher = true) => {
    const f = results.filter(r => r.category === category)
    if (!f.length) return null
    return f.reduce((best, r) => {
      const v  = r.metrics[metric] ?? (higher ? -Infinity : Infinity)
      const bv = best.metrics[metric] ?? (higher ? -Infinity : Infinity)
      return (higher ? v > bv : v < bv) ? r : best
    })
  }

  const bestClf  = bestOf('classification', 'accuracy')
  const bestReg  = bestOf('regression',     'r2')
  const bestClus = bestOf('clustering',     'silhouette_score')

  const hasCls = results.some(r => r.category === 'classification')
  const hasReg = results.some(r => r.category === 'regression')
  const hasClu = results.some(r => r.category === 'clustering')

  const primaryMetric = r => {
    if (r.category === 'classification') return { key: 'accuracy',         label: 'Accuracy' }
    if (r.category === 'regression')     return { key: 'r2',               label: 'R²' }
    return                                      { key: 'silhouette_score', label: 'Silhouette' }
  }

  return (
    <div className="mlrp-wrap">
      {/* Tab bar */}
      <div className="mlrp-tabbar">
        <div className="mlrp-tabs">
          <button className={`mlrp-tab ${activeTab === 'comparison' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparison')}>
            📊 Comparación
          </button>
          {results.map(r => (
            <button key={r.model_type}
              className={`mlrp-tab ${activeTab === r.model_type ? 'active' : ''}`}
              style={activeTab === r.model_type ? { borderColor: CATEGORY_COLOR[r.category], color: CATEGORY_COLOR[r.category], background: `${CATEGORY_COLOR[r.category]}12` } : {}}
              onClick={() => { setActiveTab(r.model_type); setSelected(r) }}>
              {r.label}
            </button>
          ))}
        </div>
        <button className="mlrp-reset" onClick={onReset}>
          ↩ Nuevo experimento
        </button>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ padding: '8px 16px', flexShrink: 0 }}>
          {errors.map(e => (
            <div key={e.model_type} className="mlrp-err">
              ⚠ <strong>{e.model_type}</strong>: {e.error}
            </div>
          ))}
        </div>
      )}

      {/* Comparison view */}
      {activeTab === 'comparison' && (
        <div className="mlrp-comparison">

          {/* Best model banners */}
          <div className="mlrp-bests">
            {bestClf  && <BestBadge title="Mejor clasificación" model={bestClf}  metric="accuracy"         label="Accuracy"   color={CATEGORY_COLOR.classification} />}
            {bestReg  && <BestBadge title="Mejor regresión"     model={bestReg}  metric="r2"               label="R²"         color={CATEGORY_COLOR.regression} />}
            {bestClus && <BestBadge title="Mejor clustering"    model={bestClus} metric="silhouette_score" label="Silhouette" color={CATEGORY_COLOR.clustering} />}
          </div>

          {/* Visual metric comparison */}
          {results.length > 1 && (
            <div className="mlrp-chart-box">
              <div className="mlrp-box-title">Comparación visual por métrica primaria</div>
              <MetricBarChart results={results} primaryMetric={primaryMetric} />
            </div>
          )}

          {/* Comparison tables */}
          {hasCls && <CompareTable title="Clasificación" color={CATEGORY_COLOR.classification}
            rows={results.filter(r => r.category === 'classification')}
            cols={[
              { key: 'label',       header: 'Modelo' },
              { key: 'accuracy',    header: 'Accuracy',    src: 'metrics' },
              { key: 'f1_weighted', header: 'F1',          src: 'metrics' },
              { key: 'train_size',  header: 'Train',       src: 'metrics' },
              { key: 'test_size',   header: 'Test',        src: 'metrics' },
            ]}
            best={bestClf}
            onSelect={r => { setSelected(r); setActiveTab(r.model_type) }} />}

          {hasReg && <CompareTable title="Regresión" color={CATEGORY_COLOR.regression}
            rows={results.filter(r => r.category === 'regression')}
            cols={[
              { key: 'label',      header: 'Modelo' },
              { key: 'r2',         header: 'R²',    src: 'metrics' },
              { key: 'rmse',       header: 'RMSE',  src: 'metrics' },
              { key: 'mae',        header: 'MAE',   src: 'metrics' },
              { key: 'train_size', header: 'Train', src: 'metrics' },
            ]}
            best={bestReg}
            onSelect={r => { setSelected(r); setActiveTab(r.model_type) }} />}

          {hasClu && <CompareTable title="Clustering" color={CATEGORY_COLOR.clustering}
            rows={results.filter(r => r.category === 'clustering')}
            cols={[
              { key: 'label',            header: 'Modelo' },
              { key: 'silhouette_score', header: 'Silhouette', src: 'metrics' },
              { key: 'n_clusters',       header: 'Clusters',   src: 'metrics' },
              { key: 'n_samples',        header: 'Muestras',   src: 'metrics' },
            ]}
            best={bestClus}
            onSelect={r => { setSelected(r); setActiveTab(r.model_type) }} />}

          {/* Experiment config summary */}
          <div className="mlrp-config-summary">
            <div className="mlrp-box-title">Configuración del experimento</div>
            <div className="mlrp-config-grid">
              {config.target && <div className="mlrp-config-item"><span>Target</span><code>{config.target}</code></div>}
              <div className="mlrp-config-item"><span>Features</span><code>{config.features.join(', ')}</code></div>
              <div className="mlrp-config-item"><span>Test size</span><code>{Math.round(config.test_size * 100)}%</code></div>
              <div className="mlrp-config-item"><span>Modelos</span><code>{results.length} entrenados</code></div>
            </div>
          </div>
        </div>
      )}

      {/* Individual model detail */}
      {activeTab !== 'comparison' && selected && (
        <MLResultCard result={selected} />
      )}

      <style>{`
        .mlrp-wrap { display:flex; flex-direction:column; flex:1; overflow:hidden; }

        .mlrp-tabbar {
          display:flex; align-items:center; justify-content:space-between;
          padding:0 16px; border-bottom:0.5px solid var(--border);
          background:var(--surface); flex-shrink:0; height:46px;
          gap:8px; flex-wrap:wrap;
        }
        .mlrp-tabs { display:flex; gap:4px; flex-wrap:wrap; align-items:center; }
        .mlrp-tab {
          padding:5px 13px; border-radius:7px; font-size:12px; font-weight:500;
          color:var(--text-muted); background:none; border:0.5px solid transparent;
          cursor:pointer; transition:all 0.15s;
        }
        .mlrp-tab:hover { background:var(--surface2); color:var(--text); }
        .mlrp-tab.active { background:var(--accent-light); border-color:var(--accent-mid); color:var(--accent); }

        .mlrp-reset {
          background:none; border:0.5px solid var(--border2);
          color:var(--text-muted); font-family:var(--font-mono); font-size:11px;
          padding:5px 12px; border-radius:7px; cursor:pointer; transition:all 0.15s;
          white-space:nowrap;
        }
        .mlrp-reset:hover { border-color:var(--accent); color:var(--accent); background:var(--accent-light); }

        .mlrp-err {
          background:var(--error-light); border:0.5px solid var(--error-border);
          color:var(--error); border-radius:7px; padding:8px 12px;
          font-size:12px; margin-bottom:4px;
        }

        .mlrp-comparison {
          flex:1; overflow-y:auto; padding:18px;
          display:flex; flex-direction:column; gap:18px;
        }
        .mlrp-bests { display:flex; gap:10px; flex-wrap:wrap; }

        .mlrp-chart-box, .mlrp-config-summary {
          background:var(--surface); border:0.5px solid var(--border);
          border-radius:12px; padding:16px;
        }
        .mlrp-box-title {
          font-family:var(--font-mono); font-size:10px; text-transform:uppercase;
          letter-spacing:0.12em; color:var(--text-dim); margin-bottom:12px;
        }

        .mlrp-config-grid { display:flex; flex-wrap:wrap; gap:10px; }
        .mlrp-config-item { display:flex; flex-direction:column; gap:3px; min-width:140px; }
        .mlrp-config-item span { font-size:10px; font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.1em; color:var(--text-dim); }
        .mlrp-config-item code { font-family:var(--font-mono); font-size:12px; color:var(--text); background:var(--surface2); padding:3px 8px; border-radius:5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px; display:block; }
      `}</style>
    </div>
  )
}

function BestBadge({ title, model, metric, label, color }) {
  const val = model.metrics[metric]
  return (
    <div className="mlrp-best" style={{ borderColor: color }}>
      <div className="mlrp-best-top" style={{ color }}>🏆 {title}</div>
      <div className="mlrp-best-model">{model.label}</div>
      <div className="mlrp-best-metric" style={{ color }}>{label}: <strong>{val}</strong></div>
      <style>{`
        .mlrp-best {
          flex:1; min-width:160px;
          background:var(--surface); border:1px solid;
          border-radius:11px; padding:12px 14px;
          display:flex; flex-direction:column; gap:3px;
        }
        .mlrp-best-top { font-size:11px; font-weight:500; font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.08em; }
        .mlrp-best-model { font-size:13px; font-weight:600; color:var(--text); letter-spacing:-0.2px; margin-top:1px; }
        .mlrp-best-metric { font-size:12px; }
        .mlrp-best-metric strong { font-weight:600; }
      `}</style>
    </div>
  )
}

function MetricBarChart({ results, primaryMetric }) {
  const maxH = 80
  const maxVal = Math.max(...results.map(r => Math.abs(r.metrics[primaryMetric(r).key] ?? 0)), 0.01)

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: maxH + 32, paddingBottom: 0 }}>
      {results.map((r, i) => {
        const pm    = primaryMetric(r)
        const val   = r.metrics[pm.key] ?? 0
        const color = CATEGORY_COLOR[r.category]
        const barH  = Math.max(4, (Math.abs(val) / maxVal) * maxH)
        const isNeg = val < 0
        return (
          <div key={r.model_type} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: isNeg ? 'var(--error)' : color, fontWeight: 500 }}>
              {typeof val === 'number' ? val.toFixed(3) : val}
            </span>
            <div style={{ width: '60%', background: isNeg ? 'var(--error)' : color, borderRadius: '4px 4px 0 0', height: barH, opacity: 0.85, minWidth: 24 }} />
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.3, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.label.length > 12 ? r.label.slice(0, 11) + '…' : r.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function CompareTable({ title, color, rows, cols, best, onSelect }) {
  return (
    <div className="mlrp-tbl-wrap">
      <div className="mlrp-tbl-title" style={{ color }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', marginRight: 6 }} />
        {title}
      </div>
      <table className="mlrp-tbl">
        <thead>
          <tr>{cols.map(c => <th key={c.key}>{c.header}</th>)}<th /></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.model_type} className={best?.model_type === r.model_type ? 'best' : ''}>
              {cols.map(c => (
                <td key={c.key} className={c.src === 'metrics' ? 'mono' : ''}>
                  {c.src === 'metrics' ? (r.metrics[c.key] ?? '—') : r[c.key]}
                  {best?.model_type === r.model_type && c.key === 'label' && (
                    <span className="mlrp-best-tag" style={{ background: `${color}18`, color, borderColor: `${color}40` }}>🏆</span>
                  )}
                </td>
              ))}
              <td>
                <button className="mlrp-view-btn" style={{ color }} onClick={() => onSelect(r)}>Ver →</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <style>{`
        .mlrp-tbl-wrap { display:flex; flex-direction:column; gap:8px; }
        .mlrp-tbl-title { font-family:var(--font-mono); font-size:11px; font-weight:500; text-transform:uppercase; letter-spacing:0.1em; display:flex; align-items:center; }
        .mlrp-tbl { width:100%; border-collapse:collapse; font-size:12px; background:var(--surface); border:0.5px solid var(--border); border-radius:10px; overflow:hidden; }
        .mlrp-tbl th { text-align:left; padding:9px 12px; border-bottom:0.5px solid var(--border); font-family:var(--font-mono); font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:var(--text-dim); font-weight:500; background:var(--surface2); }
        .mlrp-tbl td { padding:9px 12px; border-bottom:0.5px solid var(--border); color:var(--text-muted); }
        .mlrp-tbl td.mono { font-family:var(--font-mono); }
        .mlrp-tbl tr:last-child td { border-bottom:none; }
        .mlrp-tbl tr:hover td { background:var(--surface2); }
        .mlrp-tbl tr.best td { background:#EEEAFF; color:var(--accent); }
        .mlrp-best-tag { font-size:10px; margin-left:6px; padding:1px 6px; border-radius:4px; border:0.5px solid; }
        .mlrp-view-btn { background:none; border:none; font-size:12px; font-weight:500; cursor:pointer; padding:2px 6px; border-radius:5px; transition:background 0.13s; }
        .mlrp-view-btn:hover { background:var(--surface2); }
      `}</style>
    </div>
  )
}
