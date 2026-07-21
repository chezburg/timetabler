function splitSentences(text) {
  return String(text || '')
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function stripTrailingPeriod(s) {
  return s.replace(/\.\s*$/, '').trim();
}

function extractAfterLabel(sentence, label) {
  const re = new RegExp(`${label}\\(s\\):\\s*(.*)`, 'i');
  const m = sentence.match(re);
  return m ? stripTrailingPeriod(m[1]) : null;
}

/**
 * Parses one section's raw "Requisites and Constraints" cell.
 * Returns null fields/empty arrays when nothing of that kind was found.
 */
export function parseRequisites(rawText) {
  const result = {
    restrictions: [],
    crossListed: [],
    prerequisite: null,
    corequisite: null,
    antirequisite: null,
    isOverflow: false,
    onlineNote: false,
    notes: [],
  };

  const text = String(rawText || '').trim();
  if (!text) return result;

  for (const sentence of splitSentences(text)) {
    const upper = sentence.toUpperCase();

    if (upper.startsWith('RESTRICTED TO') || upper.startsWith('RESERVED FOR')) {
      result.restrictions.push(stripTrailingPeriod(sentence));
    } else if (upper.startsWith('CROSS-LISTED WITH')) {
      result.crossListed.push(stripTrailingPeriod(sentence.replace(/^cross-listed with\s*/i, '')));
    } else if (/^OPEN WHEN ALL OTHER .* ARE FULL/i.test(sentence)) {
      result.isOverflow = true;
    } else if (upper.startsWith('ONLINE COURSE')) {
      result.onlineNote = true;
      result.notes.push(stripTrailingPeriod(sentence));
    } else if (/PREREQUISITE\(s\):/i.test(sentence)) {
      result.prerequisite = extractAfterLabel(sentence, 'Prerequisite');
    } else if (/ANTIREQUISITE\(s\):/i.test(sentence)) {
      result.antirequisite = extractAfterLabel(sentence, 'Antirequisite');
    } else if (/COREQUISITE\(s\):/i.test(sentence)) {
      result.corequisite = extractAfterLabel(sentence, 'Corequisite');
    } else if (upper === 'REQUISITES:') {
      // bare label with nothing else on this "sentence" — ignore
    } else {
      result.notes.push(stripTrailingPeriod(sentence));
    }
  }

  return result;
}

/**
 * Lightweight, best-effort comparison between a restriction's free text and a
 * student's self-reported program/stream. Not a guarantee — engineering-stream
 * naming varies a lot ("Electrical", "Electrical and Computer", "ECE", ...) — so
 * this only ever returns a hint, never a hard block.
 * Returns 'excluded' | 'included' | 'unclear' | null (null = nothing to compare).
 */
export function matchStream(restrictions, streamText) {
  const stream = String(streamText || '').trim().toLowerCase();
  if (!stream || !restrictions.length) return null;

  const combined = restrictions.join(' ').toLowerCase();

  const excludeMatch = combined.match(/excluding ([a-z, ]+)\)/);
  if (excludeMatch && excludeMatch[1].includes(stream)) return 'excluded';

  if (combined.includes(stream)) return 'included';

  return 'unclear';
}
