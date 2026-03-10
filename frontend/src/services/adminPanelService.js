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
  // Format filters for API calls (convert arrays to comma-separated strings)
  const apiFilters = { limit: 1000 };
  if (filters?.campus?.length) apiFilters.center = filters.campus.join(',');
  if (filters?.school?.length) apiFilters.school = filters.school.join(',');
  if (filters?.batch?.length) apiFilters.batch = filters.batch.join(',');

  const [jobsRes, applicationsRes, studentsRes, recruitersRes, queriesRes, summaryRes] = await Promise.allSettled([
    api.getJobs(apiFilters),
    api.getAllApplications(apiFilters),
    api.getAllStudents(apiFilters),
    api.getRecruiterDirectory(),
    api.getAdminQueries(),
    api.getStatsSummary()
  ]);

  const summary = summaryRes.status === 'fulfilled' ? summaryRes.value : null;

  const jobsPayload = jobsRes.status === 'fulfilled' ? jobsRes.value : null;
  const jobs = safeArray(jobsPayload?.jobs).length ? safeArray(jobsPayload?.jobs) : safeArray(jobsPayload);

  let applicationsPayload = applicationsRes.status === 'fulfilled' ? applicationsRes.value : null;
  let applications = safeArray(applicationsPayload?.applications).length ? safeArray(applicationsPayload?.applications) : safeArray(applicationsPayload);

  let studentsPayload = studentsRes.status === 'fulfilled' ? studentsRes.value : null;
  let students = safeArray(studentsPayload?.students).length ? safeArray(studentsPayload?.students) : safeArray(studentsPayload);

  const recruitersPayload = recruitersRes.status === 'fulfilled' ? recruitersRes.value : null;
  const recruiters = safeArray(recruitersPayload?.recruiters).length ? safeArray(recruitersPayload?.recruiters) : safeArray(recruitersPayload);
  const activeRecruiters = recruiters.filter(r => {
    const status = String(r?.status || '').toUpperCase();
    return status === 'ACTIVE' || status === 'PENDING' || !status;
  }).length;

  let queriesPayload = queriesRes.status === 'fulfilled' ? queriesRes.value : null;
  let queries = safeArray(queriesPayload?.queries).length ? safeArray(queriesPayload?.queries) : safeArray(queriesPayload?.data).length ? safeArray(queriesPayload?.data) : safeArray(queriesPayload);

  // If filters are applied, filter queries in-memory (assuming generic queries don't have endpoints with student attributes yet)
  if (filters && (filters.campus?.length > 0 || filters.school?.length > 0 || filters.batch?.length > 0)) {
    if (students.length > 0 && queries.length > 0) {
      const filteredStudentIds = new Set(students.map(s => s.id));
      const filteredUserIds = new Set(students.map(s => s.userId));

      queries = queries.filter(q => {
        const queryUserId = q?.userId || q?.studentId || q?.student?.userId || q?.student?.id;
        return filteredStudentIds.has(queryUserId) || filteredUserIds.has(queryUserId);
      });
    } else if (students.length === 0) {
      queries = [];
    }
  }

  // Dashboard counters
  const totalStudents = studentsPayload?.pagination?.total ?? students.length;
  const totalJobs = jobsPayload?.pagination?.total ?? jobs.length;
  const totalApplications = applicationsPayload?.pagination?.total ?? applications.length;

  // Calculate placed students from fetched applications (we need to fetch all to count unique studentIds)
  // Note: This might not be 100% accurate if there are more than 1000 applications, but it's the best we can do without a backend count endpoint
  const placedStudentIds = new Set(
    applications
      .filter(a => {
        const s = String(a?.status || a?.finalStatus || a?.interviewStatus || '').toUpperCase();
        return s === 'SELECTED' || s === 'OFFERED' || s === 'ACCEPTED';
      })
      .map(a => a?.studentId)
      .filter(Boolean)
  );
  const placedStudents = placedStudentIds.size;

  const pendingQueries = queries.filter(q => {
    const s = String(q?.status || '').toLowerCase();
    return s === 'pending' || s === 'open' || s === 'unresolved';
  }).length;

  // Calculate student statistics
  const activeStudents = students.filter(s => {
    const status = String(s?.user?.status || s?.status || '').toUpperCase();
    return status === 'ACTIVE';
  }).length;
  const blockedStudents = students.filter(s => {
    const status = String(s?.user?.status || s?.status || '').toUpperCase();
    return status === 'BLOCKED';
  }).length;
  const pendingStudents = students.filter(s => {
    const status = String(s?.user?.status || s?.status || '').toUpperCase();
    return status === 'PENDING';
  }).length;
  const rejectedStudents = students.filter(s => {
    const status = String(s?.user?.status || s?.status || '').toUpperCase();
    return status === 'REJECTED';
  }).length;

  const placementRate = totalStudents > 0 ? (placedStudents / totalStudents) * 100 : 0;
  const averageApplications = totalStudents > 0 ? totalApplications / totalStudents : 0;

  // Use pre-computed stats from summary if available and no filters are applied
  const finalStats = (summary && (!filters || Object.keys(filters).length === 0))
    ? {
      ...summary.summary,
      // Calculate extras not in summary
      placementRate: summary.summary.placementRate,
      averageApplications: summary.summary.totalStudents > 0 ? summary.summary.totalApplications / summary.summary.totalStudents : 0,
      // Map backend names to frontend names
      activeStudents: students.filter(s => String(s?.user?.status || s?.status || '').toUpperCase() === 'ACTIVE').length,
    }
    : {
      totalStudents,
      activeStudents,
      blockedStudents,
      pendingStudents,
      rejectedStudents,
      placedStudents,
      placementRate,
      totalJobs,
      activeRecruiters,
      pendingQueries,
      totalApplications,
      averageApplications,
    };

  return {
    statsData: finalStats,
    chartData: {
      placementStatus: buildPlacementStatusChart(applications),
      monthlyTrend: buildMonthlyTrendChart(jobs, applications),
      adminPerformance: [],
    },
  };
}

export async function exportReportCSV(filters = {}, dayWindow = 90) {
  throw new Error('Export is not available yet (backend support required).');
}

export async function downloadDataCSV(filters = {}, dataType = 'applications', dayWindow = 90) {
  if (dataType !== 'applications') {
    throw new Error(`Export for ${dataType} is not supported yet.`);
  }

  // Format filters for API calls similar to getAdminPanelData
  const apiFilters = {};
  if (filters?.campus?.length) apiFilters.center = filters.campus.join(',');
  if (filters?.school?.length) apiFilters.school = filters.school.join(',');
  if (filters?.batch?.length) apiFilters.batch = filters.batch.join(',');

  try {
    // 1. Trigger the background export job
    const startRes = await api.exportApplications(apiFilters);
    if (!startRes || !startRes.jobId) {
      throw new Error('Failed to start export job');
    }

    const { jobId } = startRes;

    // 2. Poll the status every 2 seconds
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await api.getExportStatus(jobId);

          if (statusRes.status === 'completed' && statusRes.result?.url) {
            clearInterval(pollInterval);

            // Trigger actual download via the browser
            const link = document.createElement('a');
            link.href = statusRes.result.url;
            // Best effort generic naming since it's an external Cloudinary raw link
            link.setAttribute('download', `export_${dataType}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            resolve(true);
          } else if (statusRes.status === 'failed') {
            clearInterval(pollInterval);
            reject(new Error(statusRes.error || 'Export job failed on the server'));
          }
          // If active/waiting/delayed, just let it poll again
        } catch (pollError) {
          clearInterval(pollInterval);
          reject(new Error('Export polling interrupted: ' + pollError.message));
        }
      }, 2000); // 2 second polling interval

      // Safety timeout (e.g., 2 minutes)
      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error('Export timed out after 2 minutes'));
      }, 120000);
    });

  } catch (error) {
    console.error('Download CSV Error:', error);
    throw error;
  }
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
