import React, { useRef, useState } from 'react'

const ACCEPTED = '.csv,.txt,.tsv,.xlsx,.xls'

export default function FileUpload({ onUpload, loading }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    onUpload(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  return (
    <div
      className={`upload-zone ${dragging ? 'dragging' : ''} ${loading ? 'loading' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !loading && inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <div className="upload-icon">
        {loading ? (
          <div className="spinner" />
        ) : (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        )}
      </div>
      <p className="upload-title">{loading ? 'Parsing dataset…' : 'Drop your dataset here'}</p>
      <p className="upload-sub">CSV, TXT, TSV, Excel · Click to browse</p>

      <style>{`
        .upload-zone {
          border: 1.5px dashed var(--border);
          border-radius: var(--radius);
          padding: 48px 32px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .upload-zone:hover, .upload-zone.dragging {
          border-color: var(--accent);
          background: var(--accent-dim);
        }
        .upload-zone.loading { cursor: not-allowed; opacity: 0.7; }
        .upload-icon { color: var(--accent); margin-bottom: 4px; }
        .upload-title { font-size: 1.05rem; font-weight: 500; color: var(--text-primary); }
        .upload-sub { font-size: 0.82rem; color: var(--text-secondary); font-family: var(--font-mono); }
        .spinner {
          width: 36px; height: 36px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
