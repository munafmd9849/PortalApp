/** Mirror of backend testCaseStorage for client-side parsing. */

export function parseTestCases(raw) {
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
    expectedOutput: String(tc.expectedOutput ?? tc.output ?? tc.expected ?? ''),
    label: tc.label || `Case ${i + 1}`,
    hidden: Boolean(tc.hidden ?? tc.isPublic === false),
  }));
}

export function parseExamples(raw) {
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

export function getPublicTestCases(testCases) {
  return parseTestCases(testCases).filter((tc) => !tc.hidden);
}

export const emptyTestCase = () => ({
  input: '',
  expectedOutput: '',
  hidden: false,
  label: '',
});

export const emptyExample = () => ({
  input: '',
  output: '',
  explanation: '',
});
