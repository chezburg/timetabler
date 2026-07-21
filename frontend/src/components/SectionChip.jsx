import React from 'react';

const DAY_SHORT = { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' };

function summarizeMeetings(meetings) {
  if (!meetings.length || meetings.every((m) => m.isTba)) return 'Time TBA';

  const groups = new Map();
  for (const m of meetings) {
    if (m.isTba) continue;
    const key = `${m.startLabel}|${m.endLabel}|${m.location}`;
    if (!groups.has(key)) groups.set(key, { days: [], startLabel: m.startLabel, endLabel: m.endLabel, location: m.location });
    groups.get(key).days.push(DAY_SHORT[m.day] || m.day);
  }

  return [...groups.values()]
    .map((g) => `${g.days.join('/')} ${g.startLabel}\u2013${g.endLabel}${g.location ? ` @ ${g.location}` : ''}`)
    .join('; ');
}

export default function SectionChip({ section, selected, locked, onSelect, onDragStart, onDragEnd }) {
  const summary = summarizeMeetings(section.meetings);
  const isFull = /full/i.test(section.status) && !/not\s*full/i.test(section.status);

  return (
    <div
      className={`section-chip ${selected ? 'section-chip-selected' : ''} ${locked ? 'section-chip-locked' : ''}`}
      draggable={!locked}
      onDragStart={(e) => {
        if (locked) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', section.id); // for browsers that require data to permit dragging
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={() => !locked && onSelect()}
      role={locked ? undefined : 'button'}
      tabIndex={locked ? undefined : 0}
      onKeyDown={(e) => {
        if (!locked && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect();
        }
      }}
      title={locked ? 'Only one option — already scheduled' : selected ? 'Currently scheduled — drag another option to swap' : 'Drag onto the calendar, or click to schedule'}
    >
      <div className="chip-top">
        <span className="chip-section-number">Sec {section.sectionNumber || '—'}</span>
        {isFull && <span className="badge badge-warn">Full</span>}
        {selected && !locked && <span className="chip-check" aria-hidden="true">&#10003;</span>}
      </div>
      {section.instructor && <div className="chip-instructor">{section.instructor}</div>}
      <div className="chip-time">{summary}</div>
    </div>
  );
}
