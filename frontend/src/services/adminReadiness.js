/**
 * Admin Placement Readiness API
 * All metrics from real user activity via /api/admin/readiness
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

export async function fetchPlacementSummary(filters = {}) {
  const res = await api.get(`/admin/readiness/summary${buildQuery(filters)}`);
  return res?.data ?? res;
}

export async function fetchStudentsWithScores(params = {}) {
  const res = await api.get(`/admin/readiness/students${buildQuery(params)}`);
  return res?.data ?? res;
}

export async function fetchStudentScoreDetail(studentId) {
  const res = await api.get(`/admin/readiness/students/${studentId}`);
  return res?.data ?? res;
}
