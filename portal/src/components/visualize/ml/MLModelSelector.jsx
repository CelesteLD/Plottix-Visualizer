import React from 'react'

const CAT = {
  classification: { label: 'Clasificación', color: '#72BF78' },
  regression:     { label: 'Regresión',     color: '#5DCAA5' },
  clustering:     { label: 'Clustering',    color: '#D97706' },
}

export default function MLModelSelector({ availableModels, selectedModels, onChange }) {
  const toggle = value =>
    onChange(selectedModels.includes(value)
      ? selectedModels.filter(v => v !== value)
      : [...selectedModels, value])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {Object.entries(availableModels).map(([category, models]) => {
        const meta = CAT[category] || { label: category, color: '#888' }
        return (
          <div key={category}>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:meta.color, flexShrink:0 }} />
              <span style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--text-dim)', fontWeight:500 }}>{meta.label}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
              {models.map(m => {
                const sel = selectedModels.includes(m.value)
                return (
                  <div key={m.value}
                    onClick={() => toggle(m.value)}
                    style={{
                      display:'flex', alignItems:'center', gap:7,
                      padding:'6px 9px', borderRadius:7, cursor:'pointer',
                      border:`1px solid ${sel ? meta.color : 'var(--border)'}`,
                      background: sel ? `${meta.color}18` : 'var(--surface)',
                      fontSize:12, color: sel ? meta.color : 'var(--text-muted)',
                      fontWeight: sel ? 500 : 400, transition:'all .13s',
                    }}>
                    <div style={{
                      width:9, height:9, borderRadius:'50%', flexShrink:0,
                      background: sel ? meta.color : 'none',
                      border: `1.5px solid ${sel ? meta.color : 'var(--border2)'}`,
                    }} />
                    {m.label}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
      {selectedModels.length > 0 && (
        <div style={{
          background:'var(--g3)', color:'#1A5014', border:'1px solid var(--border2)',
          borderRadius:20, fontSize:10, padding:'3px 10px', textAlign:'center', fontWeight:500,
        }}>
          {selectedModels.length} modelo{selectedModels.length > 1 ? 's' : ''} seleccionado{selectedModels.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
