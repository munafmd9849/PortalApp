export function createCodingQuestion(overrides = {}) {
  const language = overrides.language || 'javascript';
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: '',
    description: '',
    starterCode: defaultStarterCode(language),
    language,
    ...overrides,
  };
}

export function defaultStarterCode(language = 'javascript') {
  const map = {
    javascript: '// Write your solution here\nfunction solve() {\n  \n}\n',
    python: '# Write your solution here\ndef solve():\n    pass\n',
    java: '// Write your solution here\nclass Solution {\n  public static void main(String[] args) {\n  }\n}\n',
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n  return 0;\n}\n',
  };
  return map[language] || map.javascript;
}

export function parseCodingQuestions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((q) => q?.id);
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter((q) => q?.id) : [];
  } catch {
    return [];
  }
}

export function mergeSlotQuestions(slot) {
  if (!slot) return [];
  const driveQs = parseCodingQuestions(slot.drive?.codingQuestions);
  const extra = parseCodingQuestions(slot.extraQuestions);
  const merged = slot.allCodingQuestions || [...driveQs, ...extra];
  const seen = new Set();
  return merged.filter((q) => {
    if (seen.has(q.id)) return false;
    seen.add(q.id);
    return true;
  });
}
