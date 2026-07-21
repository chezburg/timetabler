import React, { useMemo } from 'react';
import { parseRequisites } from '../utils/requisites.js';

function anyRestriction(variant) {
  return variant.sections.some((s) => parseRequisites(s.requisites).restrictions.length > 0);
}

export default function CoursePool({ requirements, search, onSearch, onAdd }) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requirements;
    return requirements.filter((r) => r.base.toLowerCase().includes(q) || r.title.toLowerCase().includes(q));
  }, [requirements, search]);

  return (
    <section className="panel">
      <p className="panel-label">Add courses</p>
      <input
        className="search-input"
        type="search"
        placeholder="Search by code or title…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <ul className="course-pool-list">
        {filtered.length === 0 && <li className="muted empty-note">No matching courses.</li>}
        {filtered.map((req) => {
          const restricted = req.variants.some(anyRestriction);
          return (
            <li key={req.base} className="course-pool-row">
              <div>
                <span className="course-code">
                  {req.base}
                  {restricted && (
                    <span className="badge badge-restricted pool-restricted-flag" title="At least one section of this course has a restriction — check details after adding">
                      Restricted
                    </span>
                  )}
                </span>
                <span className="course-title">{req.title}</span>
              </div>
              <div className="pool-add-buttons">
                {req.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    className="btn-add"
                    onClick={() => onAdd(variant.id)}
                    title={`${variant.code} — ${variant.term}`}
                  >
                    {req.variants.length > 1 ? `Add · ${variant.term}` : 'Add'}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
