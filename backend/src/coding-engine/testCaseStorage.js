/**
 * Normalize test cases for DB storage and evaluation.
 * Accepts array, JSON string, or double-encoded string from legacy saves.
 */
export function parseTestCasesRaw(raw) {
  if (raw == null || raw === '') return [];
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return [];
        }
      }
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];
  return data.map((tc, i) => ({
    input: tc.input ?? tc.stdin ?? '',
    expectedOutput: String(tc.expectedOutput ?? tc.output ?? tc.expected ?? '').trim(),
    label: tc.label || `Case ${i + 1}`,
    hidden: Boolean(tc.hidden ?? (tc.isPublic === false)),
  }));
}

export function serializeTestCasesForStorage(raw) {
  const cases = parseTestCasesRaw(raw);
  return JSON.stringify(cases);
}

export function parseExamplesRaw(raw) {
  if (raw == null || raw === '') return [];
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return [];
        }
      }
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];
  return data.map((ex, i) => ({
    input: ex.input ?? '',
    output: String(ex.output ?? ex.expectedOutput ?? ex.expected ?? ''),
    explanation: ex.explanation || '',
    label: ex.label || `Example ${i + 1}`,
  }));
}

export function serializeExamplesForStorage(raw) {
  return JSON.stringify(parseExamplesRaw(raw));
}

export function normalizeOutputForCompare(value) {
  const s = String(value ?? '').replace(/\r\n/g, '\n').trim();
  if (!s.includes('\n')) return s;
  return s
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

export function outputsMatch(actual, expected) {
  return normalizeOutputForCompare(actual) === normalizeOutputForCompare(expected);
}

/** Public sample cases shown in UI; hidden cases used only for evaluate/grade. */
export function splitPublicAndHidden(testCases) {
  const all = parseTestCasesRaw(testCases);
  const publicCases = all.filter((tc) => !tc.hidden);
  const hiddenCases = all.filter((tc) => tc.hidden);
  return { all, publicCases, hiddenCases };
}
