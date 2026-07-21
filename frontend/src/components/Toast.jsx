import React from 'react';

export default function Toast({ message, onDismiss }) {
  return (
    <div className="toast" role="alert">
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss">
        &times;
      </button>
    </div>
  );
}
