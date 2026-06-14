import api from './api.js';

function toQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && String(v).trim() !== '') q.append(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function fetchJobOpportunitiesOverview(filters = {}) {
  const res = await api.get(`/admin/job-opportunities/overview${toQuery(filters)}`);
  return res?.data ?? res;
}

export async function fetchCardBreakdown(cardKey, filters = {}) {
  const res = await api.get(`/admin/job-opportunities/breakdown/${cardKey}${toQuery(filters)}`);
  return res?.data ?? res;
}

export async function fetchCrManagers(filters = {}) {
  const res = await api.get(`/admin/job-opportunities/cr-managers${toQuery(filters)}`);
  return res?.data ?? res;
}

export async function fetchMomTable(filters = {}) {
  const res = await api.get(`/admin/job-opportunities/mom-table${toQuery(filters)}`);
  return res?.data ?? res;
}

export async function fetchJobOpportunitiesFilterOptions() {
  const res = await api.get('/admin/job-opportunities/filter-options');
  return res?.data ?? res;
}
