/** Format CGPA for display (avoids 9.199999999999999 → "9.20"). */
export function formatCgpaForDisplay(val) {
  if (val === undefined || val === null || val === '') return '';
  const n = parseFloat(val);
  if (Number.isNaN(n)) return String(val).trim();
  const clamped = Math.max(0, Math.min(10, n));
  return clamped.toFixed(2);
}

/** Limit numeric score input to at most 2 decimal places (CGPA or percentage). */
export function sanitizeScoreInput(raw, scoreType = 'CGPA') {
  if (raw === '' || raw === '.') return raw;

  let cleaned = String(raw).replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }

  const [whole = '', frac = ''] = cleaned.split('.');
  let result = whole;
  if (cleaned.includes('.')) {
    result = `${whole}.${frac.slice(0, 2)}`;
  }

  const max = scoreType === 'CGPA' ? 10 : 100;
  const num = parseFloat(result);
  if (!Number.isNaN(num) && num > max) {
    return String(max);
  }

  return result;
}

export function hasAtMostTwoDecimals(value) {
  if (value === '' || value == null) return true;
  const str = String(value).trim();
  if (!str.includes('.')) return true;
  const [, frac = ''] = str.split('.');
  return frac.length <= 2;
}
