export const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_LABEL = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

/** Formats minutes-since-midnight as "8:30 AM". */
export function minutesToLabel(minutes) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ap = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
}

/**
 * Given all currently-visible meetings, figures out which day columns to show
 * (only days that actually have a class, defaulting to Mon-Fri if empty) and
 * a sensible hour range with half-hour padding on each side.
 */
export function computeGridBounds(meetings) {
  const daysWithClasses = new Set();
  let min = 8 * 60;
  let max = 18 * 60;
  let any = false;

  for (const m of meetings) {
    if (m.isTba || m.startMinutes == null) continue;
    any = true;
    daysWithClasses.add(m.day);
    min = Math.min(min, m.startMinutes);
    max = Math.max(max, m.endMinutes);
  }

  const days = DAY_ORDER.filter((d) => daysWithClasses.has(d));
  const visibleDays = days.length ? days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  // Round out to the hour and pad by 30 minutes so blocks don't touch the grid edge.
  const startHour = Math.floor((any ? min - 30 : min) / 60);
  const endHour = Math.ceil((any ? max + 30 : max) / 60);

  return {
    days: visibleDays,
    startMinutes: Math.max(0, startHour * 60),
    endMinutes: Math.min(24 * 60, endHour * 60),
  };
}

export function hourMarks(startMinutes, endMinutes) {
  const marks = [];
  for (let t = Math.ceil(startMinutes / 60) * 60; t <= endMinutes; t += 60) marks.push(t);
  return marks;
}
