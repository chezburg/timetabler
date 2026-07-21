import React from 'react';

export default function ConflictBanner({ pairs }) {
  if (!pairs.length) return null;

  return (
    <div className="conflict-banner" role="alert">
      <div className="conflict-banner-title">
        {pairs.length} time {pairs.length === 1 ? 'conflict' : 'conflicts'} in this plan
      </div>
      <ul>
        {pairs.map((p, i) => (
          <li key={i}>
            <strong>
              {p.a.code} {p.a.component} (Sec {p.a.sectionNumber})
            </strong>{' '}
            overlaps <strong>
              {p.b.code} {p.b.component} (Sec {p.b.sectionNumber})
            </strong>{' '}
            on {p.a.meeting.day} {p.a.meeting.startLabel}
            {'\u2013'}
            {p.a.meeting.endLabel}
          </li>
        ))}
      </ul>
    </div>
  );
}
