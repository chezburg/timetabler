import * as XLSX from 'xlsx';

// Maps a normalized header name -> canonical field name.
// Normalization strips everything except a-z0-9, so "Days/Times/Location",
// "Days / Times / Location", and "day time location" all collapse to the same key.
const HEADER_MAP = {
  coursename: 'courseName',
  course: 'courseName',
  component: 'component',
  section: 'section',
  classnbr: 'classNbr',
  classnumber: 'classNbr',
  classno: 'classNbr',
  instructor: 'instructor',
  instructors: 'instructor',
  requisitesandconstraints: 'requisites',
  requisites: 'requisites',
  restrictions: 'requisites',
  daystimeslocation: 'daysTimesLocation',
  daystimelocation: 'daysTimesLocation',
  dayandtime: 'daysTimesLocation',
  meetinginformation: 'daysTimesLocation',
  creditunits: 'creditUnits',
  units: 'creditUnits',
  credits: 'creditUnits',
  status: 'status',
  waitlist: 'waitlist',
  waitlisted: 'waitlist',
  campus: 'campus',
  deliverytype: 'deliveryType',
  delivery: 'deliveryType',
  instructionmode: 'deliveryType',
};

const TWO_LETTER_DAYS = { su: 'Sun', sa: 'Sat', mo: 'Mon', tu: 'Tue', we: 'Wed', th: 'Thu', fr: 'Fri' };
const ONE_LETTER_DAYS = { m: 'Mon', t: 'Tue', w: 'Wed', r: 'Thu', f: 'Fri', s: 'Sat', u: 'Sun' };
const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function normalizeHeader(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Tokenizes a day-code string like "MWF" or "TuTh" or "MTWRF" into day names. */
function parseDayTokens(dayStr) {
  const s = String(dayStr || '').trim();
  const days = [];
  let i = 0;
  while (i < s.length) {
    const two = s.slice(i, i + 2).toLowerCase();
    if (TWO_LETTER_DAYS[two]) {
      days.push(TWO_LETTER_DAYS[two]);
      i += 2;
      continue;
    }
    const one = s[i].toLowerCase();
    if (ONE_LETTER_DAYS[one]) {
      days.push(ONE_LETTER_DAYS[one]);
      i += 1;
      continue;
    }
    i += 1; // skip whitespace / unrecognized separators
  }
  return days;
}

/** Parses "8:30 AM - 9:30 AM" into { startMinutes, endMinutes, startLabel, endLabel }. */
function parseTimeRange(timeStr) {
  const m = String(timeStr || '').match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i
  );
  if (!m) return null;
  const to24 = (h, mins, ap) => {
    let hour = parseInt(h, 10) % 12;
    if (ap.toUpperCase() === 'PM') hour += 12;
    return hour * 60 + parseInt(mins, 10);
  };
  const startMinutes = to24(m[1], m[2], m[3]);
  const endMinutes = to24(m[4], m[5], m[6]);
  const label = (h, mins, ap) => `${parseInt(h, 10)}:${mins} ${ap.toUpperCase()}`;
  return {
    startMinutes,
    endMinutes,
    startLabel: label(m[1], m[2], m[3]),
    endLabel: label(m[4], m[5], m[6]),
  };
}

/**
 * Parses a "Days/Times/Location" cell into one or more meeting records.
 * Handles multiple meeting patterns separated by ";" and day-groups like "MWF".
 * Returns [] input as a single TBA meeting so the section is still selectable.
 */
export function parseMeetingCell(cell) {
  const raw = String(cell || '').trim();
  if (!raw) {
    return [{ day: null, startMinutes: null, endMinutes: null, startLabel: null, endLabel: null, location: '', isTba: true }];
  }

  const groups = raw.split(';').map((g) => g.trim()).filter(Boolean);
  const meetings = [];

  for (const group of groups) {
    const parts = group.split('|').map((p) => p.trim());
    const [dayPart, timePart, locationPart] = [parts[0] || '', parts[1] || '', parts[2] || ''];

    const timeRange = parseTimeRange(timePart);
    const days = parseDayTokens(dayPart);

    if (!timeRange || days.length === 0) {
      meetings.push({
        day: null,
        startMinutes: null,
        endMinutes: null,
        startLabel: null,
        endLabel: null,
        location: locationPart,
        isTba: true,
      });
      continue;
    }

    for (const day of days) {
      meetings.push({
        day,
        startMinutes: timeRange.startMinutes,
        endMinutes: timeRange.endMinutes,
        startLabel: timeRange.startLabel,
        endLabel: timeRange.endLabel,
        location: locationPart,
        isTba: false,
      });
    }
  }

  return meetings.length ? meetings : [{ day: null, startMinutes: null, endMinutes: null, startLabel: null, endLabel: null, location: '', isTba: true }];
}

/** Splits "NMM 2270A - APPLIED MATH FOR ENGINEER II" into { code, title }. */
function splitCourseName(fullName) {
  const idx = fullName.indexOf(' - ');
  if (idx === -1) return { code: fullName.trim(), title: fullName.trim() };
  return { code: fullName.slice(0, idx).trim(), title: fullName.slice(idx + 3).trim() };
}

/**
 * Parses a workbook buffer into a list of course groups, each with its sections and meetings.
 * Throws a descriptive error if no recognizable header row is found in any sheet.
 */
export function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });

  let best = null;
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
    if (!rows.length) continue;

    const headerKeys = Object.keys(rows[0]);
    const mapped = {};
    for (const h of headerKeys) {
      const norm = normalizeHeader(h);
      if (HEADER_MAP[norm]) mapped[h] = HEADER_MAP[norm];
    }
    const score = Object.keys(mapped).length;
    if (!best || score > best.score) {
      best = { sheetName, rows, mapped, score };
    }
  }

  if (!best || best.score < 3) {
    throw new Error(
      'Could not find a recognizable header row (expected columns like "Course Name", "Component", "Days/Times/Location"). Check the file matches the registrar export format.'
    );
  }

  const courseOrder = [];
  const courseMap = new Map(); // full_name -> { code, title, fullName, sections: [] }

  for (const row of best.rows) {
    const record = {};
    for (const [origHeader, canonical] of Object.entries(best.mapped)) {
      record[canonical] = row[origHeader];
    }
    const fullName = String(record.courseName || '').trim();
    if (!fullName) continue; // skip blank/separator rows

    if (!courseMap.has(fullName)) {
      const { code, title } = splitCourseName(fullName);
      courseMap.set(fullName, { code, title, fullName, sections: [] });
      courseOrder.push(fullName);
    }

    const meetings = parseMeetingCell(record.daysTimesLocation);

    courseMap.get(fullName).sections.push({
      component: String(record.component || '').trim() || 'CLASS',
      sectionNumber: String(record.section || '').trim(),
      classNbr: String(record.classNbr || '').trim(),
      instructor: String(record.instructor || '').trim(),
      requisites: String(record.requisites || '').trim(),
      creditUnits: String(record.creditUnits || '').trim(),
      status: String(record.status || '').trim(),
      waitlist: String(record.waitlist || '').trim(),
      campus: String(record.campus || '').trim(),
      deliveryType: String(record.deliveryType || '').trim(),
      meetings,
    });
  }

  return courseOrder.map((name) => courseMap.get(name));
}

export { DAY_ORDER };
