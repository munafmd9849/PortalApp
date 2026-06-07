const MAX_CODE_LENGTH = 80_000;
const BLOCKED_PATTERNS = [
  /require\s*\(\s*['"]child_process['"]/i,
  /require\s*\(\s*['"]fs['"]/i,
  /import\s+os\b/i,
  /import\s+subprocess\b/i,
  /process\.env/i,
  /Deno\./i,
  /eval\s*\(/i,
  /Function\s*\(/i,
  /__proto__/i,
  /child_process/i,
  /execSync/i,
  /spawnSync/i,
];

export function sanitizeCode(code) {
  if (typeof code !== 'string') {
    throw new Error('Code must be a string');
  }
  if (code.length > MAX_CODE_LENGTH) {
    throw new Error('Code exceeds maximum length');
  }
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      throw new Error('Code contains disallowed operations');
    }
  }
  return code;
}

export function sanitizeInput(input) {
  if (input == null) return '';
  const s = String(input);
  if (s.length > 10_000) {
    throw new Error('Input exceeds maximum length');
  }
  return s;
}

export function parseInputValue(input) {
  const raw = sanitizeInput(input);
  if (!raw.trim()) return '';
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
