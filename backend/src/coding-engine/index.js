import { sanitizeCode } from './sanitize.js';
import { runJavaScript } from './runners/javascript.js';
import { runPython } from './runners/python.js';
import { runJava } from './runners/java.js';
import { runCpp } from './runners/cpp.js';

const DEFAULT_TIMEOUT_MS = 3000;
const SUPPORTED = new Set(['javascript', 'python', 'java', 'cpp']);

const RUNNERS = {
  javascript: runJavaScript,
  python: runPython,
  java: runJava,
  cpp: runCpp,
};

export function normalizeLanguage(lang) {
  const l = String(lang || 'javascript').toLowerCase();
  if (l === 'js' || l === 'node') return 'javascript';
  if (l === 'c++') return 'cpp';
  return l;
}

export async function runCode({ language, code, input = '' }, options = {}) {
  const lang = normalizeLanguage(language);
  if (!SUPPORTED.has(lang)) {
    return { output: '', error: `Unsupported language: ${language}`, executionTime: 0 };
  }
  const safeCode = sanitizeCode(code);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const runner = RUNNERS[lang];
  return runner(safeCode, input, timeoutMs);
}

export function normalizeTestCases(raw) {
  let cases = raw;
  if (typeof raw === 'string') {
    try {
      cases = JSON.parse(raw);
    } catch {
      cases = [];
    }
  }
  if (!Array.isArray(cases)) return [];
  return cases.map((tc, i) => ({
    input: tc.input ?? tc.stdin ?? '',
    expectedOutput: String(tc.expectedOutput ?? tc.output ?? tc.expected ?? '').trim(),
    label: tc.label || `Case ${i + 1}`,
    hidden: Boolean(tc.hidden),
  }));
}

function outputsMatch(actual, expected) {
  return String(actual ?? '').trim() === String(expected ?? '').trim();
}

export async function evaluateTestCases({ language, code, testCases }, options = {}) {
  const cases = normalizeTestCases(testCases);
  if (cases.length === 0) {
    return {
      passed: 0,
      total: 0,
      score: 0,
      results: [],
      error: 'No test cases configured',
    };
  }

  const results = [];
  let passed = 0;

  for (const tc of cases) {
    const run = await runCode({ language, code, input: tc.input }, options);
    const actual = run.error ? '' : run.output;
    const ok = !run.error && outputsMatch(actual, tc.expectedOutput);
    if (ok) passed += 1;
    results.push({
      label: tc.label,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: actual,
      passed: ok,
      error: run.error,
      executionTime: run.executionTime,
      hidden: tc.hidden,
    });
  }

  return {
    passed,
    total: cases.length,
    score: cases.length ? Math.round((passed / cases.length) * 100) : 0,
    results,
    error: null,
  };
}

/** Extract code string from assessment answer (plain string or JSON blob). */
export function extractCodeFromAnswer(answer) {
  if (!answer) return { code: '', language: 'javascript' };
  if (typeof answer === 'string') {
    try {
      const parsed = JSON.parse(answer);
      if (parsed && typeof parsed === 'object' && parsed.code != null) {
        return {
          code: String(parsed.code),
          language: normalizeLanguage(parsed.language),
        };
      }
    } catch {
      return { code: answer, language: 'javascript' };
    }
    return { code: answer, language: 'javascript' };
  }
  if (typeof answer === 'object') {
    return {
      code: String(answer.code || ''),
      language: normalizeLanguage(answer.language),
    };
  }
  return { code: '', language: 'javascript' };
}

export async function gradeCodingAnswer(question, studentAnswer) {
  const { code, language } = extractCodeFromAnswer(studentAnswer);
  if (!code.trim()) {
    return { pointsEarned: 0, passed: 0, total: 0, results: [], logs: [] };
  }
  const evaluation = await evaluateTestCases({
    language,
    code,
    testCases: question.testCases,
  });
  const pointsEarned =
    evaluation.total > 0
      ? Math.floor((evaluation.passed / evaluation.total) * (question.points || 1))
      : 0;
  return {
    pointsEarned,
    passed: evaluation.passed,
    total: evaluation.total,
    results: evaluation.results,
    logs: evaluation.results,
    language,
  };
}
