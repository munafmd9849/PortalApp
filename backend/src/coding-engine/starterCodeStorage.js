const ALL_LANGS = ['javascript', 'python', 'java', 'cpp'];

const DEFAULT_STARTERS = {
  javascript: `function solution(input) {
  return input;
}
`,
  python: `def solution(input):
    return input
`,
  java: `public static Object solution(Object input) {
    return input;
}
`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    return 0;
}
`,
};

export function parseStarterCodesByLang(raw) {
  const base = { ...DEFAULT_STARTERS };
  if (raw == null || raw === '') return base;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.startsWith('{')) {
      try {
        const parsed = JSON.parse(t);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return { ...base, ...parsed };
        }
      } catch {
        /* fall through */
      }
    }
    return { ...base, javascript: raw };
  }
  return base;
}

export function serializeStarterCodesForStorage(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.startsWith('{')) return t;
    return JSON.stringify({ javascript: raw });
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const out = {};
    for (const id of ALL_LANGS) {
      if (raw[id] != null && String(raw[id]).trim() !== '') {
        out[id] = String(raw[id]);
      }
    }
    return Object.keys(out).length ? JSON.stringify(out) : null;
  }
  return null;
}

export function mergeCodingIntoConfig(config, allowedLanguages) {
  const cfg =
    typeof config === 'string'
      ? (() => {
          try {
            return JSON.parse(config);
          } catch {
            return {};
          }
        })()
      : { ...(config || {}) };
  if (Array.isArray(allowedLanguages) && allowedLanguages.length) {
    cfg.coding = {
      ...(cfg.coding || {}),
      allowedLanguages: allowedLanguages.filter((id) => ALL_LANGS.includes(id)),
    };
  }
  return cfg;
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
  if (Array.isArray(list) && list.length) {
    return list.filter((id) => ALL_LANGS.includes(id));
  }
  return [...ALL_LANGS];
}
