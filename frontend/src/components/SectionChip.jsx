import React, { useState } from 'react';
import { parseRequisites, matchStream } from '../utils/requisites.js';

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

function isOnlineSection(section) {
  return /online|distance/i.test(section.deliveryType || '');
}

export default function SectionChip({ section, selected, locked, streamText, onSelect, onDragStart, onDragEnd }) {
  const [expanded, setExpanded] = useState(false);

  const summary = summarizeMeetings(section.meetings);
  const isFull = /^full$/i.test((section.status || '').trim());
  const online = isOnlineSection(section);
  const req = parseRequisites(section.requisites);
  const hasDetails =
    req.restrictions.length || req.crossListed.length || req.prerequisite || req.corequisite || req.antirequisite;
  const streamHint = matchStream(req.restrictions, streamText);

  return (
    <div
      className={`section-chip ${selected ? 'section-chip-selected' : ''} ${locked ? 'section-chip-locked' : ''}`}
      draggable={!locked}
      onDragStart={(e) => {
        if (locked) return;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', section.id);
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
        {req.isOverflow && <span className="badge badge-overflow">Overflow</span>}
        {online && <span className="badge badge-online">Online</span>}
        {req.crossListed.length > 0 && <span className="badge badge-crosslist">Cross-listed</span>}
        {req.restrictions.length > 0 && <span className="badge badge-restricted">Restricted</span>}
        {selected && !locked && <span className="chip-check" aria-hidden="true">&#10003;</span>}
      </div>
      {section.instructor && <div className="chip-instructor">{section.instructor}</div>}
      <div className="chip-time">{summary}</div>

      {streamHint && (
        <div className={`stream-hint stream-hint-${streamHint}`}>
          {streamHint === 'excluded' && 'Likely excludes your stream'}
          {streamHint === 'included' && 'Matches your stream'}
          {streamHint === 'unclear' && "Restricted — can't tell if this covers your stream"}
        </div>
      )}

      {hasDetails && (
        <button
          type="button"
          className="chip-details-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? 'Hide details' : 'Show details'}
        </button>
      )}

      {expanded && (
        <div className="chip-details" onClick={(e) => e.stopPropagation()}>
          {req.restrictions.map((r, i) => (
            <p key={`r${i}`}>
              <strong>Restriction:</strong> {r}
            </p>
          ))}
          {req.prerequisite && (
            <p>
              <strong>Prerequisite:</strong> {req.prerequisite}
            </p>
          )}
          {req.corequisite && (
            <p>
              <strong>Corequisite:</strong> {req.corequisite}
            </p>
          )}
          {req.antirequisite && (
            <p>
              <strong>Antirequisite:</strong> {req.antirequisite}
            </p>
          )}
          {req.crossListed.map((c, i) => (
            <p key={`c${i}`}>
              <strong>Also offered as:</strong> {c}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
