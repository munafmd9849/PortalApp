/** @typedef {{ id: string, title: string, description?: string, starterCode?: string, language?: string }} CodingQuestion */

export function parseCodingQuestions(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((q) => q && q.id);
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter((q) => q && q.id) : [];
  } catch {
    return [];
  }
}

export function serializeCodingQuestions(questions) {
  return JSON.stringify(Array.isArray(questions) ? questions : []);
}

export function defaultStarterCode(language = 'javascript') {
  const map = {
    javascript: '// Write your solution here\nfunction solve() {\n  \n}\n',
    python: '# Write your solution here\ndef solve():\n    pass\n',
    java: '// Write your solution here\nclass Solution {\n  \n}\n',
    cpp: '// Write your solution here\n#include <iostream>\nusing namespace std;\n\nint main() {\n  return 0;\n}\n',
  };
  return map[language] || map.javascript;
}

export function hydrateDrive(drive) {
  if (!drive) return drive;
  return {
    ...drive,
    codingQuestions: parseCodingQuestions(drive.codingQuestions),
  };
}

export function hydrateSlot(slot) {
  if (!slot) return slot;
  const drive = slot.drive ? hydrateDrive(slot.drive) : slot.drive;
  const extra = parseCodingQuestions(slot.extraQuestions);
  const driveQs = drive?.codingQuestions || [];
  return {
    ...slot,
    drive,
    allCodingQuestions: [...driveQs, ...extra],
  };
}
