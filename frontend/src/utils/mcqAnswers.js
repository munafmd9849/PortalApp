export function parseMcqOptions(options) {
  if (!options) return [];
  try {
    return typeof options === 'string' ? JSON.parse(options) : options;
  } catch {
    return [];
  }
}

/** Display label for stored answer (index string or legacy option text). */
export function resolveMcqOptionLabel(options, value) {
  if (value == null || value === '') return null;
  const opts = parseMcqOptions(options);
  const idx = parseInt(String(value), 10);
  if (!Number.isNaN(idx) && opts[idx] != null) return opts[idx];
  return String(value);
}

/** Normalize to option index string for comparison. */
export function normalizeMcqAnswer(value, options) {
  if (value == null || value === '') return '';
  const opts = parseMcqOptions(options);
  const s = String(value);
  const idx = parseInt(s, 10);
  if (!Number.isNaN(idx) && opts[idx] != null) return String(idx);
  const byText = opts.findIndex((o) => String(o) === s);
  return byText >= 0 ? String(byText) : s;
}

export function mcqAnswersMatch(studentAnswer, correctAnswer, options) {
  return (
    normalizeMcqAnswer(studentAnswer, options) ===
    normalizeMcqAnswer(correctAnswer, options)
  );
}
