import React, { useState, useCallback } from "react";

/**
 * Form for image-type operations.
 * Handles file upload (drag & drop + click) and the parallel param selector.
 */
export default function ImageOperationForm({ operation, onSubmit, loading }) {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Find the parallelism param (threads / processes)
  const parallelInput = operation.inputs[0];
  const defaultVal    = parallelInput?.default ?? 4;
  const [paramValue, setParamValue] = useState(defaultVal);

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    const params = { [parallelInput.name]: paramValue };
    onSubmit(file, params);
  }

  return (
    <form className="operation-form" onSubmit={handleSubmit}>
      <h2 className="form-title">{operation.name}</h2>
      <p className="form-desc">{operation.description}</p>

      {/* ── Drop zone ── */}
      <div
        className={`drop-zone ${dragOver ? "drag-over" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById(`file-input-${operation.id}`).click()}
      >
        {preview ? (
          <img src={preview} alt="preview" className="drop-preview" />
        ) : (
          <div className="drop-hint">
            <span className="drop-icon">📂</span>
            <span>Arrastra una imagen o haz clic para seleccionar</span>
            <span className="drop-formats">PNG, JPG, BMP</span>
          </div>
        )}
        <input
          id={`file-input-${operation.id}`}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {file && (
        <p className="file-info">
          📎 <strong>{file.name}</strong> — {(file.size / 1024).toFixed(1)} KB
        </p>
      )}

      {/* ── Parallelism param ── */}
      {parallelInput && (
        <div className="input-group" style={{ marginTop: "1.25rem" }}>
          <label>{parallelInput.label}</label>
          <div className="radio-group">
            {parallelInput.options.map((opt) => (
              <label key={opt} className={`radio-option ${paramValue === opt ? "active" : ""}`}>
                <input
                  type="radio"
                  name={parallelInput.name}
                  value={opt}
                  checked={paramValue === opt}
                  onChange={() => setParamValue(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        className="run-btn"
        disabled={loading || !file}
        style={{ marginTop: "1.5rem" }}
      >
        {loading ? "Procesando..." : "Aplicar filtro"}
      </button>
    </form>
  );
}
