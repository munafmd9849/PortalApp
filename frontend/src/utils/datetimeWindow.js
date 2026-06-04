/** Combine HTML date (YYYY-MM-DD) and time (HH:mm) into an ISO string. */
export function combineDateAndTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const d = new Date(`${dateStr}T${timeStr}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatDateTimeWindow(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

export function formatDateTimeRange(startIso, endIso) {
  const start = formatDateTimeWindow(startIso);
  const end = formatDateTimeWindow(endIso);
  if (start === '—' && end === '—') return '—';
  return `${start} – ${end}`;
}
