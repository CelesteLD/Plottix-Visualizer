import React from "react";

function MatrixResult({ raw }) {
  const rows = raw.trim().split("\n").map(row => row.trim().split(/\s+/));
  return (
    <table className="matrix-result">
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((val, j) => <td key={j}>{val}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function isMatrixResult(raw) {
  // A matrix result has at least one newline OR multiple space-separated numbers on one line
  const lines = raw.trim().split("\n");
  if (lines.length > 1) return true;
  // Single line with multiple numbers separated by spaces (matrix row)
  const parts = lines[0].trim().split(/\s+/);
  return parts.length > 1 && parts.every(p => !isNaN(parseFloat(p)));
}

/*
 * Displays the result returned by the backend after executing an operation.
 */
export default function ResultDisplay({ result, error, warning }) {
  if (error) {
    return (
      <div className="result-box error">
        <span className="result-label">Error</span>
        <span className="result-value">{error}</span>
      </div>
    );
  }

  if (warning) {
    return (
      <div className="result-box warning">
        <span className="result-label">Advertencia</span>
        <span className="result-value">{warning}</span>
      </div>
    );
  }

  if (!result) return null;

  const isMatrix = isMatrixResult(result.result);

  return (
    <div className="result-box success">
      <span className="result-label">Resultado de {result.operation}</span>
      {isMatrix
        ? <MatrixResult raw={result.result} />
        : <span className="result-value">{result.result}</span>
      }
    </div>
  );
}