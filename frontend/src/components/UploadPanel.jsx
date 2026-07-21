import React, { useRef, useState } from 'react';

export default function UploadPanel({ onUpload, busy, catalogs, onPickExisting, compact }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files) => {
    if (files && files[0]) onUpload(files[0]);
  };

  const dropZone = (
    <div
      className={`drop-zone ${dragOver ? 'drop-zone-active' : ''} ${compact ? 'drop-zone-compact' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="drop-zone-title">{busy ? 'Reading spreadsheet…' : compact ? 'Upload another catalog' : 'Drop your course catalog here'}</p>
      {!compact && <p className="drop-zone-hint">.xlsx, .xls, or .csv — drag a file in, or click to browse</p>}
    </div>
  );

  return (
    <section className={`panel ${compact ? 'panel-compact' : ''}`}>
      {dropZone}
      {!compact && catalogs.length > 0 && (
        <div className="previous-uploads">
          <p className="panel-label">Or continue with a previous upload</p>
          <ul>
            {catalogs.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onPickExisting(c.id)}>
                  {c.label} <span className="muted">· {c.rowCount} sections</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
