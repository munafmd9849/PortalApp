import { DEFAULT_STARTERS } from './constants';

export function parseCodingAnswer(raw, defaultLanguage = 'javascript') {
  if (!raw) {
    return {
      code: DEFAULT_STARTERS[defaultLanguage] || DEFAULT_STARTERS.javascript,
      language: defaultLanguage,
      codesByLang: {},
      customInput: '',
      lastRun: null,
      evaluation: null,
    };
  }
  if (typeof raw === 'object') {
    const lang = raw.language || defaultLanguage;
    const codesByLang =
      raw.codesByLang && typeof raw.codesByLang === 'object' ? { ...raw.codesByLang } : {};
    if (raw.code != null && lang) codesByLang[lang] = raw.code;
    return {
      code:
        codesByLang[lang] ??
        raw.code ??
        DEFAULT_STARTERS[lang] ??
        DEFAULT_STARTERS.javascript,
      language: lang,
      codesByLang,
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
  const lang = payload.language;
  const codesByLang = { ...(payload.codesByLang || {}) };
  if (lang && payload.code != null) codesByLang[lang] = payload.code;
  return JSON.stringify({
    code: payload.code,
    language: lang,
    codesByLang,
    customInput: payload.customInput || '',
    lastRun: payload.lastRun || null,
    evaluation: payload.evaluation || null,
    submittedAt: payload.submittedAt || null,
  });
}

export { parseTestCases, parseExamples, getPublicTestCases, emptyTestCase, emptyExample } from './testCaseUtils.js';
