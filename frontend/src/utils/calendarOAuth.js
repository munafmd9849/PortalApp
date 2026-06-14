/** @typedef {'SUCCESS' | 'FAILED'} CalendarOAuthStatus */

export const CALENDAR_OAUTH_RETURN_KEY = 'calendar_oauth_return';
export const CALENDAR_OAUTH_RESULT_KEY = 'calendar_oauth_result';

/**
 * Dev-friendly origin check (localhost vs 127.0.0.1 mismatch breaks OAuth popup).
 */
export function isAllowedCalendarOAuthOrigin(origin) {
  if (!origin) return false;
  if (origin === window.location.origin) return true;

  try {
    const expected = new URL(window.location.origin);
    const incoming = new URL(origin);
    if (expected.protocol !== incoming.protocol || expected.port !== incoming.port) {
      return false;
    }
    const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
    return localHosts.has(expected.hostname) && localHosts.has(incoming.hostname);
  } catch {
    return false;
  }
}

/**
 * Origins to try when posting from the OAuth popup back to the opener.
 */
export function getCalendarOAuthTargetOrigins() {
  const origins = new Set([window.location.origin]);
  try {
    const url = new URL(window.location.href);
    if (url.hostname === 'localhost') origins.add(`${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ''}`);
    if (url.hostname === '127.0.0.1') origins.add(`${url.protocol}//localhost${url.port ? `:${url.port}` : ''}`);
  } catch {
    /* ignore */
  }
  return [...origins];
}

/**
 * OAuth runs in a popup; after Google redirects, opener is often null (COOP).
 */
export function isCalendarOAuthPopup() {
  if (typeof window === 'undefined') return false;
  if (window.opener && !window.opener.closed) return true;
  if (window.name === 'Google Calendar Authorization') return true;
  try {
    return window.innerWidth < 960 || window.innerHeight < 800;
  } catch {
    return false;
  }
}

export function saveCalendarOAuthReturnPath(path) {
  try {
    localStorage.setItem(CALENDAR_OAUTH_RETURN_KEY, path);
  } catch {
    /* ignore */
  }
}

export function getCalendarOAuthReturnPath(fallback = '/student?tab=calendar') {
  try {
    return localStorage.getItem(CALENDAR_OAUTH_RETURN_KEY) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * @param {object} result
 */
export function persistCalendarOAuthResult(result) {
  try {
    localStorage.setItem(
      CALENDAR_OAUTH_RESULT_KEY,
      JSON.stringify({ ...result, savedAt: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

/**
 * Read without removing (parent can peek while popup still open).
 * @param {number} maxAgeMs
 */
export function peekCalendarOAuthResult(maxAgeMs = 120000) {
  try {
    const raw = localStorage.getItem(CALENDAR_OAUTH_RESULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > maxAgeMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @param {number} maxAgeMs
 * @returns {object | null}
 */
export function consumeCalendarOAuthResult(maxAgeMs = 120000) {
  const parsed = peekCalendarOAuthResult(maxAgeMs);
  if (!parsed) return null;
  try {
    localStorage.removeItem(CALENDAR_OAUTH_RESULT_KEY);
  } catch {
    /* ignore */
  }
  return parsed;
}

/**
 * Notify opener + same-tab listeners + localStorage (shared across popup/parent).
 * @param {object} result
 */
export function broadcastCalendarOAuthResult(result) {
  const payload = { type: 'GOOGLE_CALENDAR_RESULT', ...result };
  persistCalendarOAuthResult(payload);

  if (window.opener && !window.opener.closed) {
    try {
      window.opener.focus();
    } catch {
      /* COOP may block focus */
    }
    for (const target of getCalendarOAuthTargetOrigins()) {
      try {
        window.opener.postMessage(payload, target);
      } catch {
        /* ignore */
      }
    }
  }

  window.dispatchEvent(new CustomEvent('calendar-oauth-complete', { detail: payload }));
}
