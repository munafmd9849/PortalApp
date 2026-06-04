import { DEFAULT_STARTERS } from './constants';

export function parseCodingAnswer(raw, defaultLanguage = 'javascript') {
  if (!raw) {
    return {
      code: DEFAULT_STARTERS[defaultLanguage] || DEFAULT_STARTERS.javascript,
      language: defaultLanguage,
      customInput: '',
      lastRun: null,
      evaluation: null,
    };
  }
  if (typeof raw === 'object') {
    return {
      code: raw.code ?? DEFAULT_STARTERS[raw.language || defaultLanguage],
      language: raw.language || defaultLanguage,
      customInput: raw.customInput || '',
      lastRun: raw.lastRun || null,
      evaluation: raw.evaluation || null,
    };
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && ('code' in parsed || 'language' in parsed)) {
        return parseCodingAnswer(parsed, defaultLanguage);
      }
    } catch {
      return {
        code: raw,
        language: defaultLanguage,
        customInput: '',
        lastRun: null,
        evaluation: null,
      };
    }
    return {
      code: raw,
      language: defaultLanguage,
      customInput: '',
      lastRun: null,
      evaluation: null,
    };
  }
  return parseCodingAnswer(null, defaultLanguage);
}

export function serializeCodingAnswer(payload) {
  return JSON.stringify({
    code: payload.code,
    language: payload.language,
    customInput: payload.customInput || '',
    lastRun: payload.lastRun || null,
    evaluation: payload.evaluation || null,
    submittedAt: payload.submittedAt || null,
  });
}

export { parseTestCases, parseExamples, getPublicTestCases, emptyTestCase, emptyExample } from './testCaseUtils.js';
