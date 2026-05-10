import React from "react";
import { getResultImageUrl } from "../../services/api";

/**
 * Shows the processed image alongside timing stats.
 */
export default function ImageResultDisplay({ result, error }) {
  if (error) {
    return (
      <div className="result-box error">
        <span className="result-label">Error</span>
        <span className="result-value" style={{ fontSize: "1rem" }}>{error}</span>
      </div>
    );
  }

  if (!result) return null;

  const { operation, job_id, timing } = result;
  const imageUrl = getResultImageUrl(job_id);

  return (
    <div className="result-box success image-result">
      <span className="result-label">Resultado — {operation}</span>

      <img
        src={imageUrl}
        alt="Resultado del filtro"
        className="result-image"
      />

      <a
        href={imageUrl}
        download={`resultado_${job_id}.png`}
        className="download-btn"
      >
        ⬇ Descargar imagen
      </a>

      {timing && Object.keys(timing).length > 0 && (
        <div className="timing-stats">
          {timing.compute_sec !== undefined && (
            <div className="timing-item">
              <span className="timing-label">Cómputo</span>
              <span className="timing-value">{Number(timing.compute_sec).toFixed(3)} s</span>
            </div>
          )}
          {timing.total_sec !== undefined && (
            <div className="timing-item">
              <span className="timing-label">Total</span>
              <span className="timing-value">{Number(timing.total_sec).toFixed(3)} s</span>
            </div>
          )}
          {timing.threads !== undefined && (
            <div className="timing-item">
              <span className="timing-label">Hilos</span>
              <span className="timing-value">{timing.threads}</span>
            </div>
          )}
          {timing.processes !== undefined && (
            <div className="timing-item">
              <span className="timing-label">Procesos</span>
              <span className="timing-value">{timing.processes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
