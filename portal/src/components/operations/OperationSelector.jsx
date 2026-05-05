import React from "react";

/*
 * Displays the list of available operations for the user to select.
 */
export default function OperationSelector({ operations, selected, onSelect }) {
  if (!operations.length) {
    return <p className="empty-msg">No hay operaciones disponibles.</p>;
  }

  return (
    <div className="operation-selector">
      {operations.map((op) => (
        <button
          key={op.id}
          className={`op-card ${selected?.id === op.id ? "active" : ""}`}
          onClick={() => onSelect(op)}
        >
          <span className="op-category">{op.category}</span>
          <span className="op-name">{op.name}</span>
          <span className="op-desc">{op.description}</span>
        </button>
      ))}
    </div>
  );
}