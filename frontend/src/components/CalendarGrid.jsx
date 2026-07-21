import React, { useMemo, useState } from 'react';
import { computeGridBounds, hourMarks, minutesToLabel, DAY_LABEL } from '../utils/time.js';

const PX_PER_MIN = 1.2;

export default function CalendarGrid({ flatMeetings, conflictKeys, draggingChip, onDropChip, onClearSlot }) {
  const [dragOver, setDragOver] = useState(false);

  const previewMeetings = useMemo(() => {
    if (!draggingChip) return [];
    return draggingChip.section.meetings.filter((m) => !m.isTba && m.startMinutes != null);
  }, [draggingChip]);

  const bounds = useMemo(() => {
    const raw = flatMeetings.map((fm) => fm.meeting).concat(previewMeetings);
    return computeGridBounds(raw);
  }, [flatMeetings, previewMeetings]);

  const marks = useMemo(() => hourMarks(bounds.startMinutes, bounds.endMinutes), [bounds]);
  const totalHeight = (bounds.endMinutes - bounds.startMinutes) * PX_PER_MIN;

  const otherMeetings = useMemo(() => {
    if (!draggingChip) return [];
    return flatMeetings.filter((fm) => !(fm.courseId === draggingChip.courseId && fm.component === draggingChip.component));
  }, [flatMeetings, draggingChip]);

  const previewConflictDays = useMemo(() => {
    const flagged = new Set();
    for (const cand of previewMeetings) {
      for (const existing of otherMeetings) {
        if (existing.meeting.day === cand.day && cand.startMinutes < existing.meeting.endMinutes && existing.meeting.startMinutes < cand.endMinutes) {
          flagged.add(cand.day + cand.startMinutes);
        }
      }
    }
    return flagged;
  }, [previewMeetings, otherMeetings]);

  const top = (minutes) => (minutes - bounds.startMinutes) * PX_PER_MIN;

  if (!flatMeetings.length && !draggingChip) {
    return (
      <div className="calendar-empty">
        <p>Your calendar is empty.</p>
        <p className="muted">Add a course, then drag a section chip onto this space to place it — or just click a chip to schedule it.</p>
      </div>
    );
  }

  return (
    <div className="calendar-wrap">
      <div className="calendar-header-row" style={{ gridTemplateColumns: `56px repeat(${bounds.days.length}, 1fr)` }}>
        <div className="ruler-corner" />
        {bounds.days.map((day) => (
          <div key={day} className="day-header">
            {DAY_LABEL[day]}
          </div>
        ))}
      </div>

      <div
        className={`calendar-body ${dragOver ? 'calendar-body-dragover' : ''}`}
        style={{ height: totalHeight, gridTemplateColumns: `56px repeat(${bounds.days.length}, 1fr)` }}
        onDragOver={(e) => {
          if (!draggingChip) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (draggingChip) onDropChip(draggingChip);
        }}
      >
        <div className="ruler-col">
          {marks.map((t) => (
            <span key={t} className="hour-mark" style={{ top: top(t) }}>
              {minutesToLabel(t)}
            </span>
          ))}
        </div>

        {bounds.days.map((day) => (
          <div key={day} className="day-column">
            {marks.map((t) => (
              <div key={t} className="gridline" style={{ top: top(t) }} />
            ))}

            {flatMeetings
              .filter((fm) => fm.meeting.day === day)
              .map((fm) => (
                <div
                  key={fm.key}
                  className={`event-block ${conflictKeys.has(fm.key) ? 'event-block-conflict' : ''}`}
                  style={{
                    top: top(fm.meeting.startMinutes),
                    height: Math.max(20, (fm.meeting.endMinutes - fm.meeting.startMinutes) * PX_PER_MIN),
                    '--block-color': fm.color,
                  }}
                  title={`${fm.code} ${fm.component} · ${fm.instructor || 'Staff'} · ${fm.meeting.startLabel}\u2013${fm.meeting.endLabel}${fm.meeting.location ? ` · ${fm.meeting.location}` : ''}`}
                >
                  {!fm.locked && (
                    <button
                      type="button"
                      className="event-clear"
                      title="Remove from schedule"
                      onClick={() => onClearSlot(fm.courseId, fm.component)}
                    >
                      &times;
                    </button>
                  )}
                  <div className="event-code">
                    {fm.code} <span className="event-component">{fm.component}</span>
                  </div>
                  <div className="event-time">
                    {fm.meeting.startLabel}{'\u2013'}{fm.meeting.endLabel}
                  </div>
                  {fm.meeting.location && <div className="event-location">{fm.meeting.location}</div>}
                  {conflictKeys.has(fm.key) && <div className="event-conflict-tag">Conflict</div>}
                </div>
              ))}

            {previewMeetings
              .filter((m) => m.day === day)
              .map((m, i) => (
                <div
                  key={`preview-${i}`}
                  className={`event-block event-preview ${previewConflictDays.has(m.day + m.startMinutes) ? 'event-preview-conflict' : 'event-preview-ok'}`}
                  style={{ top: top(m.startMinutes), height: Math.max(20, (m.endMinutes - m.startMinutes) * PX_PER_MIN) }}
                >
                  <div className="event-time">
                    {m.startLabel}{'\u2013'}{m.endLabel}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
