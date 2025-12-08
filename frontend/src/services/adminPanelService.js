/**
 * Admin Panel Service - Mock Implementation
 * TODO: Replace with real backend API calls
 */

const MOCK_ADMINS = [
  { id: 'admin_1', name: 'Anika Sharma' },
  { id: 'admin_2', name: 'Rohit Malhotra' },
  { id: 'admin_3', name: 'Priya Verma' },
  { id: 'admin_4', name: 'Karthik Reddy' },
  { id: 'admin_5', name: 'Meera Joshi' },
];

const MONTH_LABELS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

const sleep = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

function randomWithin(base, variance = 0.08) {
  const jitter = 1 + (Math.random() * 2 - 1) * variance;
  return Math.max(0, Math.round(base * jitter));
}

function generateStats(filters = {}, dayWindow = 90) {
  const scaleFactor = Math.max(0.6, Math.min(1.2, dayWindow / 90));
  const baseStats = {
    totalStudents: 1620,
    placedStudents: 1184,
    placementRate: 73.1,
    totalJobs: 215,
    activeRecruiters: 64,
    pendingQueries: 37,
    totalApplications: 8421,
    averageApplications: 5.2,
  };

  return {
    totalStudents: randomWithin(baseStats.totalStudents * scaleFactor),
    placedStudents: randomWithin(baseStats.placedStudents * scaleFactor),
    placementRate: Number((baseStats.placementRate + (Math.random() * 6 - 3)).toFixed(1)),
    totalJobs: randomWithin(baseStats.totalJobs * scaleFactor),
    activeRecruiters: randomWithin(baseStats.activeRecruiters, 0.15),
    pendingQueries: randomWithin(baseStats.pendingQueries, 0.3),
    totalApplications: randomWithin(baseStats.totalApplications * scaleFactor),
    averageApplications: Number((baseStats.averageApplications + (Math.random() * 0.8 - 0.4)).toFixed(1)),
  };
}

function generatePlacementStatus() {
  const statuses = ['Placed', 'Shortlisted', 'Interviewing', 'Pending'];
  const totals = statuses.map((_, idx) => randomWithin(400 - idx * 70, 0.3));

  return {
    labels: statuses,
    datasets: [
      {
        label: 'Students',
        data: totals,
        backgroundColor: STATUS_COLORS,
        borderRadius: 8,
      },
    ],
  };
}

function generateMonthlyTrend() {
  const jobsPosted = MONTH_LABELS.map(() => randomWithin(40, 0.35));
  const offersMade = MONTH_LABELS.map(() => randomWithin(32, 0.3));
  const applications = MONTH_LABELS.map(() => randomWithin(720, 0.25));

  return {
    labels: MONTH_LABELS,
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
        data: applications,
        borderColor: '#a855f7',
        borderDash: [6, 6],
        tension: 0.35,
        fill: false,
      },
    ],
  };
}

function generateAdminPerformance() {
  return MOCK_ADMINS.map((admin, index) => {
    const jobsPosted = randomWithin(18 - index * 2, 0.2);
    const applications = jobsPosted * randomWithin(40, 0.3);
    const placements = Math.round(jobsPosted * (0.8 - index * 0.05));
    return {
      admin: admin.name,
      jobsPosted,
      applications,
      placements,
      successRate: Number(((placements / Math.max(1, jobsPosted)) * 100).toFixed(1)),
    };
  });
}

function buildMockAdminPanelData(filters = {}, dayWindow = 90) {
  return {
    statsData: generateStats(filters, dayWindow),
    chartData: {
      placementStatus: generatePlacementStatus(),
      monthlyTrend: generateMonthlyTrend(),
      adminPerformance: generateAdminPerformance(),
    },
  };
}

export async function getAdminPanelData(filters = {}, dayWindow = 90) {
  console.info('ℹ️ getAdminPanelData: returning mock data', { filters, dayWindow });
  await sleep();
  return buildMockAdminPanelData(filters, dayWindow);
}

export async function exportReportCSV(filters = {}, dayWindow = 90) {
  console.info('ℹ️ exportReportCSV: generating mock CSV', { filters, dayWindow });
  await sleep(250);
  return 'report-generated-mock.csv';
}

export async function downloadDataCSV(filters = {}, dataType = 'applications', dayWindow = 90) {
  console.info('ℹ️ downloadDataCSV: generating mock data download', { filters, dataType, dayWindow });
  await sleep(250);
  return `${dataType}-mock.csv`;
}

export function subscribeToAdminPanelData(callback, filters = {}, dayWindow = 90) {
  console.info('ℹ️ subscribeToAdminPanelData: using mock poller', { filters, dayWindow });
  
  let isActive = true;

  const emit = () => {
    if (!isActive) return;
    callback(buildMockAdminPanelData(filters, dayWindow));
  };

  emit();

  const intervalId = setInterval(emit, 15000); // refresh every 15s

  return () => {
    isActive = false;
    clearInterval(intervalId);
  };
}
