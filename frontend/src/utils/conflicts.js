/**
 * Flattens a schedule's current selections into one entry per real (non-TBA) meeting,
 * tagged with the course/section/component it belongs to so the calendar can render it
 * and conflicts can be traced back to a human-readable description.
 */
export function flattenSelectedMeetings(courses) {
  const out = [];
  for (const course of courses) {
    const countByComponent = new Map();
    for (const s of course.sections) {
      countByComponent.set(s.component, (countByComponent.get(s.component) || 0) + 1);
    }

    for (const [component, sectionId] of Object.entries(course.selections || {})) {
      if (!sectionId) continue;
      const section = course.sections.find((s) => s.id === sectionId);
      if (!section) continue;
      const locked = (countByComponent.get(component) || 0) <= 1;
      for (const meeting of section.meetings) {
        if (meeting.isTba || meeting.startMinutes == null) continue;
        out.push({
          key: `${section.id}:${meeting.id}`,
          courseId: course.courseId,
          code: course.code,
          color: course.color,
          component,
          sectionId,
          sectionNumber: section.sectionNumber,
          instructor: section.instructor,
          locked,
          meeting,
        });
      }
    }
  }
  return out;
}

function overlaps(a, b) {
  return a.meeting.day === b.meeting.day && a.meeting.startMinutes < b.meeting.endMinutes && b.meeting.startMinutes < a.meeting.endMinutes;
}

/**
 * Returns { conflictKeys: Set<meetingKey>, pairs: [{a, b}] } describing every
 * pairwise time overlap among the given flattened meetings.
 */
export function findConflicts(flatMeetings) {
  const conflictKeys = new Set();
  const pairs = [];

  for (let i = 0; i < flatMeetings.length; i++) {
    for (let j = i + 1; j < flatMeetings.length; j++) {
      const a = flatMeetings[i];
      const b = flatMeetings[j];
      if (a.sectionId === b.sectionId) continue; // same section, not a real conflict
      if (overlaps(a, b)) {
        conflictKeys.add(a.key);
        conflictKeys.add(b.key);
        pairs.push({ a, b });
      }
    }
  }

  return { conflictKeys, pairs };
}

/** Would adding `candidateMeetings` (a section being dragged/considered) create any conflicts
 *  against `existingMeetings` (everything already placed, ideally excluding the same
 *  course+component so a like-for-like swap doesn't flag itself)? */
export function wouldConflict(candidateMeetings, existingMeetings) {
  const hits = [];
  for (const cand of candidateMeetings) {
    if (cand.isTba || cand.startMinutes == null) continue;
    for (const existing of existingMeetings) {
      if (
        existing.meeting.day === cand.day &&
        cand.startMinutes < existing.meeting.endMinutes &&
        existing.meeting.startMinutes < cand.endMinutes
      ) {
        hits.push(existing);
      }
    }
  }
  return hits;
}
