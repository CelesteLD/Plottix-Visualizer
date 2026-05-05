import React, { useState, useCallback } from "react";
import { registerService } from "../../services/api";

const EMPTY_INPUT = () => ({
  _key:        Math.random().toString(36).slice(2),
  name:        "",
  label:       "",
  type:        "number",
  placeholder: "",
});

const INPUT_TYPES = ["number", "text", "matrix", "select"];

// ── Step 1: upload the .cpp file ──────────────────────────────────────────────
function StepFile({ file, onFile }) {
  const [drag, setDrag] = useState(false);

  const accept = (f) => {
    if (f && f.name.endsWith(".cpp")) onFile(f);
  };

  return (
    <div className="reg-step">
      <h3 className="reg-step-title">1 — Sube el fichero fuente</h3>
      <div
        className={`drop-zone reg-drop ${drag ? "drag-over" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files[0]); }}
        onClick={() => document.getElementById("reg-file-input").click()}
      >
        {file ? (
          <div className="drop-hint">
            <span className="drop-icon">✅</span>
            <span style={{ color: "var(--accent)" }}>{file.name}</span>
            <span className="drop-formats">{(file.size / 1024).toFixed(1)} KB — haz clic para cambiar</span>
          </div>
        ) : (
          <div className="drop-hint">
            <span className="drop-icon">📄</span>
            <span>Arrastra tu fichero .cpp o haz clic</span>
            <span className="drop-formats">Solo se aceptan ficheros .cpp</span>
          </div>
        )}
        <input
          id="reg-file-input"
          type="file"
          accept=".cpp"
          style={{ display: "none" }}
          onChange={(e) => accept(e.target.files[0])}
        />
      </div>
    </div>
  );
}

// ── Step 2: service metadata ──────────────────────────────────────────────────
function StepMeta({ meta, onChange }) {
  return (
    <div className="reg-step">
      <h3 className="reg-step-title">2 — Información del servicio</h3>

      <div className="reg-row">
        <div className="input-group">
          <label>Nombre del servicio *</label>
          <input
            type="text"
            placeholder="Ej: Mi Filtro Gaussiano"
            value={meta.name}
            onChange={(e) => onChange("name", e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>Categoría</label>
          <input
            type="text"
            placeholder="Ej: Procesamiento de Imagen"
            value={meta.category}
            onChange={(e) => onChange("category", e.target.value)}
          />
        </div>
      </div>

      <div className="input-group">
        <label>Descripción</label>
        <input
          type="text"
          placeholder="Breve descripción de lo que hace el servicio"
          value={meta.description}
          onChange={(e) => onChange("description", e.target.value)}
        />
      </div>

      <div className="reg-row">
        <div className="input-group">
          <label>Tipo de servicio *</label>
          <div className="radio-group">
            {["numeric", "image"].map((t) => (
              <label key={t} className={`radio-option ${meta.service_type === t ? "active" : ""}`}>
                <input type="radio" name="service_type" value={t}
                  checked={meta.service_type === t}
                  onChange={() => onChange("service_type", t)} />
                {t === "numeric" ? "📐 Numérico" : "🖼 Imagen"}
              </label>
            ))}
          </div>
        </div>

        {meta.service_type === "image" && (
          <div className="input-group">
            <label>Tecnología de paralelismo *</label>
            <div className="radio-group">
              {[
                { v: "none",   label: "Secuencial" },
                { v: "openmp", label: "OpenMP" },
                { v: "mpi",    label: "MPI" },
              ].map(({ v, label }) => (
                <label key={v} className={`radio-option ${meta.parallel_type === v ? "active" : ""}`}>
                  <input type="radio" name="parallel_type" value={v}
                    checked={meta.parallel_type === v}
                    onChange={() => onChange("parallel_type", v)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 3: define inputs ─────────────────────────────────────────────────────
function StepInputs({ inputs, onChange }) {
  function updateInput(idx, field, value) {
    const next = inputs.map((inp, i) => i === idx ? { ...inp, [field]: value } : inp);
    onChange(next);
  }

  function addInput() {
    onChange([...inputs, EMPTY_INPUT()]);
  }

  function removeInput(idx) {
    onChange(inputs.filter((_, i) => i !== idx));
  }

  // For image ops the inputs are fixed (threads/processes), no need to define them
  return (
    <div className="reg-step">
      <h3 className="reg-step-title">3 — Parámetros de entrada</h3>
      <p className="reg-hint">
        Define los argumentos que el binario espera recibir, en el mismo orden
        en que los lee desde <code>argv[]</code>.
      </p>

      {inputs.length === 0 && (
        <p className="empty-msg" style={{ marginBottom: "1rem" }}>
          Sin parámetros definidos todavía.
        </p>
      )}

      <div className="reg-inputs-list">
        {inputs.map((inp, idx) => (
          <div key={inp._key} className="reg-input-row">
            <div className="reg-input-header">
              <span className="reg-input-num">#{idx + 1}</span>
              <button
                type="button"
                className="reg-remove-btn"
                onClick={() => removeInput(idx)}
                title="Eliminar parámetro"
              >✕</button>
            </div>

            <div className="reg-row">
              <div className="input-group">
                <label>Nombre interno <span className="reg-required">*</span></label>
                <input type="text" placeholder="Ej: a"
                  value={inp.name}
                  onChange={(e) => updateInput(idx, "name", e.target.value)} />
              </div>
              <div className="input-group">
                <label>Etiqueta visible <span className="reg-required">*</span></label>
                <input type="text" placeholder="Ej: Número A"
                  value={inp.label}
                  onChange={(e) => updateInput(idx, "label", e.target.value)} />
              </div>
            </div>

            <div className="reg-row">
              <div className="input-group">
                <label>Tipo</label>
                <select
                  value={inp.type}
                  onChange={(e) => updateInput(idx, "type", e.target.value)}
                  className="reg-select"
                >
                  {INPUT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Placeholder</label>
                <input type="text" placeholder="Ej: 42"
                  value={inp.placeholder}
                  onChange={(e) => updateInput(idx, "placeholder", e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button type="button" className="reg-add-input-btn" onClick={addInput}>
        + Añadir parámetro
      </button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function RegisterServiceModal({ onClose, onRegistered }) {
  const [file,    setFile]    = useState(null);
  const [meta,    setMeta]    = useState({
    name:          "",
    description:   "",
    category:      "",
    service_type:  "numeric",
    parallel_type: "none",
  });
  const [inputs,  setInputs]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [compileError, setCompileError] = useState(null);

  const handleMetaChange = useCallback((field, value) => {
    setMeta((prev) => ({ ...prev, [field]: value }));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setCompileError(null);

    if (!file)       return setError("Debes subir un fichero .cpp");
    if (!meta.name)  return setError("El nombre del servicio es obligatorio");

    // For image services, inject a fixed parallelism input if applicable
    let finalInputs = inputs.map(({ _key, ...rest }) => rest); // strip internal key

    if (meta.service_type === "image" && meta.parallel_type !== "none") {
      const paramName  = meta.parallel_type === "openmp" ? "threads" : "processes";
      const paramLabel = meta.parallel_type === "openmp" ? "Número de hilos" : "Número de procesos";
      finalInputs = [{
        name:    paramName,
        label:   paramLabel,
        type:    "select",
        options: [2, 4],
        default: 4,
      }];
    }

    setLoading(true);
    try {
      const result = await registerService(file, { ...meta, inputs: finalInputs });
      onRegistered(result.descriptor);
    } catch (err) {
      if (err.message === "Error de compilación") {
        setCompileError(err.details || err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2>Registrar nuevo servicio</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <StepFile file={file} onFile={setFile} />
          <StepMeta meta={meta} onChange={handleMetaChange} />

          {/* Only show input definition for numeric services; image inputs are auto-generated */}
          {meta.service_type === "numeric" && (
            <StepInputs inputs={inputs} onChange={setInputs} />
          )}

          {meta.service_type === "image" && (
            <div className="reg-step">
              <h3 className="reg-step-title">3 — Parámetros de entrada</h3>
              <p className="reg-hint">
                Para servicios de imagen los parámetros se generan automáticamente
                según la tecnología seleccionada:
                {meta.parallel_type === "none"   && " el binario recibirá <input.png> <output.png>."}
                {meta.parallel_type === "openmp" && " se añadirá un selector de hilos (2 / 4)."}
                {meta.parallel_type === "mpi"    && " se añadirá un selector de procesos (2 / 4)."}
              </p>
              <p className="reg-hint" style={{ marginTop: "0.5rem" }}>
                El binario debe escribir a <code>stdout</code> un JSON con los tiempos:
                <br />
                <code>{"{ \"compute_sec\": ..., \"total_sec\": ... }"}</code>
              </p>
            </div>
          )}

          {/* Errors */}
          {error && (
            <div className="result-box error" style={{ marginTop: "0.5rem" }}>
              <span className="result-label">Error</span>
              <span className="result-value" style={{ fontSize: "0.9rem" }}>{error}</span>
            </div>
          )}

          {compileError && (
            <div className="reg-compile-error">
              <span className="result-label">Error de compilación</span>
              <pre className="compile-output">{compileError}</pre>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="reg-cancel-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="run-btn" disabled={loading}>
              {loading ? "Compilando..." : "Registrar servicio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
