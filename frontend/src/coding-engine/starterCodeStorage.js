import { CODING_LANGUAGES, DEFAULT_STARTERS } from './constants';

export const ALL_CODING_LANGUAGE_IDS = CODING_LANGUAGES.map((l) => l.id);

/** @returns {Record<string, string>} */
export function parseStarterCodesByLang(raw) {
  const base = { ...DEFAULT_STARTERS };
  if (raw == null || raw === '') return base;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...base, ...raw };
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.startsWith('{')) {
      try {
        const parsed = JSON.parse(t);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...base, ...parsed };
        }
      } catch {
        /* legacy single blob */
      }
    }
    return { ...base, javascript: raw };
  }
  return base;
}

export function serializeStarterCodesByLang(byLang) {
  if (!byLang || typeof byLang !== 'object') return null;
  const out = {};
  for (const id of ALL_CODING_LANGUAGE_IDS) {
    if (byLang[id] != null && String(byLang[id]).trim() !== '') {
      out[id] = String(byLang[id]);
    }
  }
  return Object.keys(out).length ? JSON.stringify(out) : null;
}

export function getStarterForLanguage(byLang, lang) {
  const map = parseStarterCodesByLang(byLang);
  return map[lang] || DEFAULT_STARTERS[lang] || DEFAULT_STARTERS.javascript;
}

export function createEmptyStarterCodesByLang() {
  return { ...DEFAULT_STARTERS };
}

export function parseAllowedCodingLanguages(configRaw) {
  let cfg = configRaw;
  if (typeof configRaw === 'string') {
    try {
      cfg = JSON.parse(configRaw);
    } catch {
      cfg = {};
    }
  }
  const list = cfg?.coding?.allowedLanguages;
  if (Array.isArray(list) && list.length > 0) {
    return list.filter((id) => ALL_CODING_LANGUAGE_IDS.includes(id));
  }
  return [...ALL_CODING_LANGUAGE_IDS];
}

export function mergeCodingIntoConfig(config, { allowedLanguages }) {
  const cfg =
    config && typeof config === 'object'
      ? { ...config }
      : typeof config === 'string'
        ? (() => {
            try {
              return JSON.parse(config);
            } catch {
              return {};
            }
          })()
        : {};
  if (allowedLanguages?.length) {
    cfg.coding = {
      ...(cfg.coding || {}),
      allowedLanguages: allowedLanguages.filter((id) => ALL_CODING_LANGUAGE_IDS.includes(id)),
    };
  }
  return cfg;
}
