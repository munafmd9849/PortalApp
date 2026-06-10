/**
 * Admin Student Directory API — metrics computed server-side
 */

import api from './api.js';

function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && String(value).trim() !== '') {
      q.append(key, value);
    }
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function fetchStudentDirectory(params = {}) {
  const res = await api.get(`/admin/student-directory${buildQuery(params)}`);
  return res?.data ?? res;
}

export async function exportStudentDirectory(params = {}) {
  const res = await api.get(`/admin/student-directory/export${buildQuery(params)}`);
  return res?.data ?? res;
}

export async function exportStudentDirectoryToGoogleSheets(params = {}) {
  const res = await api.post(
    `/admin/student-directory/export/google-sheets${buildQuery(params)}`,
    undefined,
    { silent: true },
  );
  return res?.data ?? res;
}

export async function fetchStudentPanelExtras(studentId) {
  const res = await api.get(`/admin/student-directory/${studentId}/panel`, { noCache: true });
  const data = res?.data ?? res;
  return data;
}
