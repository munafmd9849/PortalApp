export function parseMcqOptions(options) {
  if (!options) return [];
  try {
    return typeof options === 'string' ? JSON.parse(options) : options;
  } catch {
    return [];
  }
}

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
