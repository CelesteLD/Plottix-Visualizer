import React, { useState, useEffect } from "react";

function MatrixInput({ value, onChange }) {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(2);
  const [cells, setCells] = useState(() => Array(2).fill(null).map(() => Array(2).fill("")));

  useEffect(() => {
    setCells(prev => {
      const newCells = Array(rows).fill(null).map((_, r) =>
        Array(cols).fill(null).map((_, c) => (prev[r] && prev[r][c] !== undefined ? prev[r][c] : ""))
      );
      notifyChange(rows, cols, newCells);
      return newCells;
    });
  }, [rows, cols]); // notifyChange is stable (defined outside effect)

  function notifyChange(r, c, data) {
    const flat = data.flat().join(" ");
    onChange(`${r} ${c} ${flat}`);
  }

  function handleCell(r, c, val) {
    const next = cells.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? val : cell)));
    setCells(next);
    notifyChange(rows, cols, next);
  }

  return (
    <div className="matrix-input">
      <div className="matrix-dims">
        <label>Filas</label>
        <input type="number" min={1} max={6} value={rows}
          onChange={e => setRows(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))} />
        <label>Columnas</label>
        <input type="number" min={1} max={6} value={cols}
          onChange={e => setCols(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))} />
      </div>
      <div className="matrix-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cells.map((row, r) =>
          row.map((cell, c) => (
            <input
              key={`${r}-${c}`}
              type="number"
              step="any"
              placeholder="0"
              value={cell}
              onChange={e => handleCell(r, c, e.target.value)}
              className="matrix-cell"
            />
          ))
        )}
      </div>
    </div>
  );
}

/*
 * Renders a dynamic form based on the operation descriptor's inputs array.
 * Supports input types: number, text, matrix.
 */
export default function OperationForm({ operation, onSubmit, loading }) {
  const [values, setValues] = useState({});

  useEffect(() => {
    const initial = {};
    operation.inputs.forEach((inp) => (initial[inp.name] = ""));
    setValues(initial);
  }, [operation]);

  function handleChange(name, val) {
    setValues((prev) => ({ ...prev, [name]: val }));
  }

  function parseMatrixDims(encoded) {
    // format: "rows cols v00 v01 ..."
    const parts = encoded.trim().split(/\s+/);
    return { rows: parseInt(parts[0]), cols: parseInt(parts[1]) };
  }

  function validateMatrixOp(values) {
    if (operation.id === "matrix_multiply") {
      const A = parseMatrixDims(values.a || "2 2");
      const B = parseMatrixDims(values.b || "2 2");
      if (A.cols !== B.rows) {
        return `Dimensiones incompatibles: A es ${A.rows}×${A.cols} pero B es ${B.rows}×${B.cols}. Para multiplicar, las columnas de A (${A.cols}) deben coincidir con las filas de B (${B.rows}).`;
      }
    }
    if (operation.id === "matrix_add") {
      const A = parseMatrixDims(values.a || "2 2");
      const B = parseMatrixDims(values.b || "2 2");
      if (A.rows !== B.rows || A.cols !== B.cols) {
        return `Dimensiones incompatibles: A es ${A.rows}×${A.cols} y B es ${B.rows}×${B.cols}. Para sumar, ambas matrices deben tener el mismo tamaño.`;
      }
    }
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const warning = validateMatrixOp(values);
    if (warning) {
      onSubmit(values, warning);
      return;
    }
    onSubmit(values, null);
  }

  return (
    <form className="operation-form" onSubmit={handleSubmit}>
      <h2 className="form-title">{operation.name}</h2>
      <p className="form-desc">{operation.description}</p>

      <div className="form-inputs">
        {operation.inputs.map((inp) => (
          <div className="input-group" key={inp.name}>
            <label>{inp.label}</label>
            {inp.type === "matrix" ? (
              <MatrixInput
                value={values[inp.name] || ""}
                onChange={(val) => handleChange(inp.name, val)}
              />
            ) : (
              <input
                id={inp.name}
                name={inp.name}
                type={inp.type === "number" ? "number" : "text"}
                placeholder={inp.placeholder || ""}
                value={values[inp.name] || ""}
                onChange={(e) => handleChange(inp.name, e.target.value)}
                required
                step="any"
              />
            )}
          </div>
        ))}
      </div>

      <button type="submit" className="run-btn" disabled={loading}>
        {loading ? "Ejecutando..." : "Ejecutar"}
      </button>
    </form>
  );
}