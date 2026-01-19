/**
 * Admin Panel Service
 * Computes analytics from real API data only.
 */
import api from './api.js';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(v) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildPlacementStatusChart(applications = []) {
  const statusCounts = new Map();
  for (const a of applications) {
    const raw = String(a?.status || a?.finalStatus || a?.interviewStatus || 'PENDING').toUpperCase();
    const key =
      raw === 'SELECTED' || raw === 'OFFERED' || raw === 'ACCEPTED' ? 'Placed' :
      raw.includes('SHORT') ? 'Shortlisted' :
      raw.includes('INTERVIEW') ? 'Interviewing' :
      'Pending';
    statusCounts.set(key, (statusCounts.get(key) || 0) + 1);
  }

  const labels = ['Placed', 'Shortlisted', 'Interviewing', 'Pending'];
  const data = labels.map(l => statusCounts.get(l) || 0);

  return {
    labels,
    datasets: [
      {
        label: 'Applications',
        data,
        backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444'],
        borderRadius: 8,
      },
    ],
  };
}

function buildMonthlyTrendChart(jobs = [], applications = [], monthCount = 6) {
  const now = new Date();
  const months = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-US', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }

  const countByMonth = (items, dateGetter) => {
    const map = new Map(months.map(m => [m.key, 0]));
    for (const it of items) {
      const dtRaw = dateGetter(it);
      if (!dtRaw) continue;
      const dt = new Date(dtRaw);
      if (Number.isNaN(dt.getTime())) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    }
    return months.map(m => map.get(m.key) || 0);
  };

  const jobsPosted = countByMonth(jobs.filter(j => j?.isPosted === true || String(j?.status || '').toUpperCase() === 'POSTED'), j => j.postedAt || j.createdAt);
  const offersMade = countByMonth(applications.filter(a => {
    const s = String(a?.status || a?.finalStatus || a?.interviewStatus || '').toUpperCase();
    return s === 'SELECTED' || s === 'OFFERED' || s === 'ACCEPTED';
  }), a => a.updatedAt || a.appliedDate || a.createdAt);
  const appsCount = countByMonth(applications, a => a.appliedDate || a.createdAt);

  return {
    labels: months.map(m => m.label),
    datasets: [
      {
        label: 'Jobs Posted',
        data: jobsPosted,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Offers Made',
        data: offersMade,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Applications',
        data: appsCount,
        borderColor: '#a855f7',
        borderDash: [6, 6],
        tension: 0.35,
        fill: false,
      },
    ],
  };
}

export async function getAdminPanelData(filters = {}, dayWindow = 90) {
  const [jobsRes, applicationsRes, studentsRes, recruitersRes, queriesRes] = await Promise.allSettled([
    api.getJobs({ limit: 1000 }),
    api.getAllApplications({ limit: 1000 }),
    api.getAllStudents({ limit: 1000 }),
    api.getRecruiterDirectory(),
    api.getAdminQueries(),
  ]);

  const jobsPayload = jobsRes.status === 'fulfilled' ? jobsRes.value : null;
  const jobs = safeArray(jobsPayload?.jobs).length ? safeArray(jobsPayload?.jobs) : safeArray(jobsPayload);

  const applicationsPayload = applicationsRes.status === 'fulfilled' ? applicationsRes.value : null;
  const applications = safeArray(applicationsPayload?.applications).length ? safeArray(applicationsPayload?.applications) : safeArray(applicationsPayload);

  const studentsPayload = studentsRes.status === 'fulfilled' ? studentsRes.value : null;
  const students = safeArray(studentsPayload?.students).length ? safeArray(studentsPayload?.students) : safeArray(studentsPayload);

  const recruitersPayload = recruitersRes.status === 'fulfilled' ? recruitersRes.value : null;
  const recruiters = safeArray(recruitersPayload?.recruiters).length ? safeArray(recruitersPayload?.recruiters) : safeArray(recruitersPayload);

  const queriesPayload = queriesRes.status === 'fulfilled' ? queriesRes.value : null;
  const queries = safeArray(queriesPayload?.queries).length ? safeArray(queriesPayload?.queries) : safeArray(queriesPayload?.data).length ? safeArray(queriesPayload?.data) : safeArray(queriesPayload);

  const placedStudentIds = new Set(
    applications
      .filter(a => {
        const s = String(a?.status || a?.finalStatus || a?.interviewStatus || '').toUpperCase();
        return s === 'SELECTED' || s === 'OFFERED' || s === 'ACCEPTED';
      })
      .map(a => a?.studentId)
      .filter(Boolean)
  );

  const pendingQueries = queries.filter(q => {
    const s = String(q?.status || '').toLowerCase();
    return s === 'pending' || s === 'open' || s === 'unresolved';
  }).length;

  const totalStudents = students.length;
  const activeStudents = students.filter(s => {
    const status = String(s?.user?.status || s?.status || 'ACTIVE').toUpperCase();
    return status === 'ACTIVE';
  }).length;
  const blockedStudents = students.filter(s => {
    const status = String(s?.user?.status || s?.status || 'ACTIVE').toUpperCase();
    return status === 'BLOCKED';
  }).length;
  const pendingStudents = students.filter(s => {
    const status = String(s?.user?.status || s?.status || 'ACTIVE').toUpperCase();
    return status === 'PENDING';
  }).length;
  const rejectedStudents = students.filter(s => {
    const status = String(s?.user?.status || s?.status || 'ACTIVE').toUpperCase();
    return status === 'REJECTED';
  }).length;
  
  const totalApplications = applications.length;
  const placedStudents = placedStudentIds.size;
  const placementRate = activeStudents > 0 ? (placedStudents / activeStudents) * 100 : 0;
  const averageApplications = activeStudents > 0 ? totalApplications / activeStudents : 0;

  return {
    statsData: {
      totalStudents,
      activeStudents,
      blockedStudents,
      pendingStudents,
      rejectedStudents,
      placedStudents,
      placementRate,
      totalJobs: jobs.length,
      activeRecruiters: recruiters.length,
      pendingQueries,
      totalApplications,
      averageApplications,
    },
    chartData: {
      placementStatus: buildPlacementStatusChart(applications),
      monthlyTrend: buildMonthlyTrendChart(jobs, applications),
      adminPerformance: [], // Not available without backend support
    },
  };
}

export async function exportReportCSV(filters = {}, dayWindow = 90) {
  throw new Error('Export is not available yet (backend support required).');
}

export async function downloadDataCSV(filters = {}, dataType = 'applications', dayWindow = 90) {
  throw new Error('Download is not available yet (backend support required).');
}

export function subscribeToAdminPanelData(callback, filters = {}, dayWindow = 90) {
  let active = true;

  const emit = async () => {
    if (!active) return;
    try {
      const data = await getAdminPanelData(filters, dayWindow);
      if (active) callback(data);
    } catch (e) {
      // Let the caller handle error state; do not fabricate data.
      if (active) callback(null);
    }
  };

  emit();
  const intervalId = setInterval(emit, 15000);

  return () => {
    active = false;
    clearInterval(intervalId);
  };
}
