import React, { useState, useEffect } from 'react';

export default function TopBar({
  catalogs,
  catalogId,
  onSwitchCatalog,
  schedules,
  scheduleId,
  scheduleName,
  onSwitchSchedule,
  onNewSchedule,
  onRenameSchedule,
  onDeleteSchedule,
  hasCatalog,
}) {
  const [nameDraft, setNameDraft] = useState(scheduleName || '');

  useEffect(() => setNameDraft(scheduleName || ''), [scheduleName, scheduleId]);

  const commitName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== scheduleName) onRenameSchedule(trimmed);
    else setNameDraft(scheduleName || '');
  };

  return (
    <header className="top-bar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          &#9635;
        </span>
        <div>
          <h1>Drafting Table</h1>
          <p>class schedule planner</p>
        </div>
      </div>

      {hasCatalog && (
        <div className="top-bar-controls">
          {catalogs.length > 1 && (
            <label className="control">
              <span>Catalog</span>
              <select value={catalogId || ''} onChange={(e) => onSwitchCatalog(e.target.value)}>
                {catalogs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="control">
            <span>Plan</span>
            <select value={scheduleId || ''} onChange={(e) => onSwitchSchedule(e.target.value)}>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <input
            className="schedule-name-input"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label="Schedule name"
          />

          <button
            type="button"
            className="btn-ghost"
            title="Start a new blank plan"
            onClick={() => onNewSchedule(`Plan ${schedules.length + 1}`)}
          >
            + New plan
          </button>

          <button
            type="button"
            className="btn-ghost btn-danger"
            title="Delete this plan"
            disabled={schedules.length <= 1}
            onClick={() => {
              if (window.confirm(`Delete "${scheduleName}"? This can't be undone.`)) onDeleteSchedule();
            }}
          >
            Delete plan
          </button>
        </div>
      )}
    </header>
  );
}
