import React, { useRef, useState } from 'react'

export default function FileUpload({ onUpload, loading }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)
  const [filename, setFilename] = useState(null)

  const handleFile = (file) => {
    if (!file) return
    setFilename(file.name)
    onUpload(file)
  }

  return (
    <div
      className={`sx-upload ${dragging ? 'drag' : ''} ${loading ? 'busy' : ''} ${filename ? 'has-file' : ''}`}
      onClick={() => !loading && inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
    >
      <input
        ref={inputRef} type="file" style={{ display: 'none' }}
        accept=".csv,.tsv,.txt,.xlsx,.xls"
        onChange={e => handleFile(e.target.files[0])}
      />
      {loading ? (
        <div className="sx-upload-inner">
          <div className="upload-spinner" />
          <span>Procesando…</span>
        </div>
      ) : (
        <div className="sx-upload-inner">
          <span className="upload-icon">⬆</span>
          <span className="upload-main">
            {filename ? filename : 'Arrastra o haz clic'}
          </span>
          <span className="upload-sub">CSV · TSV · Excel</span>
        </div>
      )}

      <style>{`
        .sx-upload {
          border: 1.5px dashed var(--border2);
          border-radius: 8px; padding: 1rem 0.75rem;
          cursor: pointer; text-align: center;
          transition: border-color 0.15s, background 0.15s;
        }
        .sx-upload:hover, .sx-upload.drag {
          border-color: var(--accent);
          background: rgba(91,106,247,0.04);
        }
        .sx-upload.has-file { border-color: var(--accent2); border-style: solid; }
        .sx-upload.busy { cursor: not-allowed; opacity: 0.6; }
        .sx-upload-inner {
          display: flex; flex-direction: column;
          align-items: center; gap: 0.35rem;
        }
        .upload-icon { font-size: 1.3rem; color: var(--accent); }
        .upload-main {
          font-family: 'Space Mono', monospace; font-size: 0.72rem;
          color: var(--text); max-width: 180px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .upload-sub {
          font-family: 'Space Mono', monospace; font-size: 0.62rem;
          color: var(--text-dim);
        }
        .upload-spinner {
          width: 28px; height: 28px;
          border: 2px solid var(--border2);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
