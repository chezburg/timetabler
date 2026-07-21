/**
 * Splits "NMM 2270A" into { base: "NMM 2270", suffix: "A" }. Courses with no
 * trailing letter (rare, but possible) get suffix "".
 */
export function parseCourseCode(code) {
  const m = String(code || '').trim().match(/^(.*\d)\s*([A-Za-z]{1,2})$/);
  if (!m) return { base: String(code || '').trim(), suffix: '' };
  return { base: m[1].trim(), suffix: m[2].toUpperCase() };
}

/**
 * Infers a term for a suffix among its siblings when nothing else is known.
 * "Y" is a full-year course. Otherwise siblings are sorted alphabetically and
 * alternate Fall/Winter starting with Fall — so of a pair, the earlier letter
 * (A before B, F before G, ...) is Fall. A lone suffix with no siblings at all
 * defaults to Fall here, but buildRequirements() tries the smarter global
 * lookup below before ever falling back to this.
 */
export function inferTerm(suffix, siblingSuffixes) {
  if (!suffix) return 'Unknown';
  if (suffix.toUpperCase() === 'Y') return 'FullYear';
  const sorted = [...new Set(siblingSuffixes)].sort();
  const idx = Math.max(0, sorted.indexOf(suffix));
  return idx % 2 === 0 ? 'Fall' : 'Winter';
}

/**
 * Groups a flat list of catalog courses (each a lettered variant, e.g. both
 * "NMM 2270A" and "NMM 2270B") into requirements keyed by base course code.
 * `overrides` is a { [courseId]: 'Fall' | 'Winter' } map for manual corrections.
 *
 * Term assignment happens in two passes:
 *  1. Any course family that has 2+ distinct suffix letters gives us a confident
 *     Fall/Winter reading for those specific letters (earlier letter = Fall).
 *  2. That letter -> term mapping is then reused catalog-wide, so a course that
 *     only appears once (e.g. only "ECE 2231B", no matching "2231A" in this
 *     file) still gets classified correctly as long as some *other* course in
 *     the catalog establishes what "B" means. Only a letter that never appears
 *     in a confirmed pair anywhere falls back to the naive per-family guess.
 */
export function buildRequirements(courses, overrides = {}) {
  const byBase = new Map();
  for (const course of courses) {
    const { base, suffix } = parseCourseCode(course.code);
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push({ ...course, suffix });
  }

  const globalLetterTerm = new Map();
  for (const variants of byBase.values()) {
    const suffixes = [...new Set(variants.map((v) => v.suffix))].filter(Boolean).sort();
    if (suffixes.length >= 2) {
      suffixes.forEach((suf, idx) => {
        const term = suf.toUpperCase() === 'Y' ? 'FullYear' : idx % 2 === 0 ? 'Fall' : 'Winter';
        if (!globalLetterTerm.has(suf)) globalLetterTerm.set(suf, term);
      });
    }
  }

  const requirements = [];
  for (const [base, variants] of byBase.entries()) {
    const allSuffixes = variants.map((v) => v.suffix);
    const withTerms = variants
      .map((v) => {
        let term;
        if (overrides[v.id]) term = overrides[v.id];
        else if (v.suffix.toUpperCase() === 'Y') term = 'FullYear';
        else if (globalLetterTerm.has(v.suffix)) term = globalLetterTerm.get(v.suffix);
        else term = inferTerm(v.suffix, allSuffixes);
        return { ...v, term };
      })
      .sort((a, b) => a.suffix.localeCompare(b.suffix));
    requirements.push({ base, title: variants[0].title, variants: withTerms });
  }

  requirements.sort((a, b) => a.base.localeCompare(b.base));
  return requirements;
}
