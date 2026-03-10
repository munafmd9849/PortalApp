import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { 
  FaFileAlt, FaCheckCircle, FaBullseye, FaPauseCircle, FaTimesCircle,
  FaEye, FaBookmark, FaRegBookmark, FaCalendar, FaHourglassHalf, FaCheck,
  FaGraduationCap, FaBriefcase, FaProjectDiagram, FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaUser, FaChartLine, FaBell, FaSearch, FaFilter, FaCog, FaQuestionCircle
} from 'react-icons/fa';
import api from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function formatTimeAgo(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const sec = Math.floor((now - d) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} days ago`;
  return d.toLocaleDateString();
}

const RecruiterDashboard = () => {
  const [timeFilter, setTimeFilter] = useState('Y-23');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [bookmarkedCandidates, setBookmarkedCandidates] = useState(new Set());
  
  // Actual data from API
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aggregateStats, setAggregateStats] = useState({
    total: 0,
    shortlisted: 0,
    selected: 0,
    rejected: 0,
    interviewing: 0,
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [schoolCounts, setSchoolCounts] = useState({});
  const [jobTitles, setJobTitles] = useState({});

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const me = await api.getCurrentUser();
      const recruiterId = me?.user?.recruiter?.id;
      if (!recruiterId) {
        setAggregateStats({ total: 0, shortlisted: 0, selected: 0, rejected: 0, interviewing: 0 });
        setRecentApplications([]);
        setSchoolCounts({});
        setLoading(false);
        return;
      }

      const jobsRes = await api.getJobs({ recruiterId, limit: 100 });
      const jobs = Array.isArray(jobsRes) ? jobsRes : (jobsRes?.jobs || []);
      const jobMap = {};
      jobs.forEach((j) => { jobMap[j.id] = j.jobTitle || j.title || 'Job'; });
      setJobTitles(jobMap);

      let total = 0;
      let shortlisted = 0;
      let selected = 0;
      let rejected = 0;
      let interviewing = 0;
      const allApplications = [];
      const schoolMap = {};

      await Promise.all(
        jobs.slice(0, 15).map(async (job) => {
          try {
            const res = await api.get(`/admin/jobs/${job.id}/applications`, {
              params: { limit: 1, page: 1 },
            });
            const data = res?.data || res;
            const stats = data.stats || {};
            total += stats.totalApplications || 0;
            shortlisted += stats.shortlisted || 0;
            selected += stats.selected || 0;
            rejected += stats.rejected || 0;
            interviewing += stats.interviewing || 0;

            const appRes = await api.get(`/admin/jobs/${job.id}/applications`, {
              params: { limit: 25, page: 1, sortBy: 'appliedAt', order: 'desc' },
            });
            const appData = appRes?.data || appRes;
            const apps = appData.applications || [];
            apps.forEach((a) => {
              allApplications.push({ ...a, jobId: job.id, jobTitle: jobMap[job.id] });
              const school = a.student?.school || 'Other';
              schoolMap[school] = (schoolMap[school] || 0) + 1;
            });
          } catch (_) {
            // Skip job if no access or error
          }
        })
      );

      setAggregateStats({ total, shortlisted, selected, rejected, interviewing });
      setSchoolCounts(schoolMap);
      allApplications.sort((a, b) => new Date(b.appliedAt || 0) - new Date(a.appliedAt || 0));
      setRecentApplications(allApplications.slice(0, 30));
    } catch (err) {
      console.error('Recruiter dashboard load error:', err);
      setError(err?.message || 'Failed to load dashboard data');
      setAggregateStats({ total: 0, shortlisted: 0, selected: 0, rejected: 0, interviewing: 0 });
      setRecentApplications([]);
      setSchoolCounts({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Stats data from actual API
  const statsData = useMemo(() => [
    { label: 'Applications', value: aggregateStats.total, trend: 0, color: 'from-violet-300 to-violet-400', icon: <FaFileAlt className="text-white" /> },
    { label: 'Shortlisted', value: aggregateStats.shortlisted, trend: 0, color: 'from-cyan-300 to-cyan-400', icon: <FaCheckCircle className="text-white" /> },
    { label: 'Offers Rolled', value: aggregateStats.selected, trend: 0, color: 'from-amber-300 to-amber-400', icon: <FaBullseye className="text-white" /> },
    { label: 'Interviewing', value: aggregateStats.interviewing, trend: 0, color: 'from-orange-300 to-orange-400', icon: <FaPauseCircle className="text-white" /> },
    { label: 'Rejected', value: aggregateStats.rejected, trend: 0, color: 'from-rose-300 to-rose-400', icon: <FaTimesCircle className="text-white" /> },
  ], [aggregateStats]);

  const totalForPct = aggregateStats.total || 1;
  const pipelineData = useMemo(() => {
    const pct = (n) => ((n / totalForPct) * 100).toFixed(1);
    return {
      labels: ['Applications', 'Shortlisted', 'Interviewing', 'Rejected'],
      data: [aggregateStats.total, aggregateStats.shortlisted, aggregateStats.interviewing, aggregateStats.rejected],
      percentages: [
        pct(aggregateStats.total),
        pct(aggregateStats.shortlisted),
        pct(aggregateStats.interviewing),
        pct(aggregateStats.rejected),
      ],
      colors: [
        'bg-gradient-to-r from-violet-300 to-violet-400',
        'bg-gradient-to-r from-cyan-300 to-cyan-400',
        'bg-gradient-to-r from-orange-300 to-orange-400',
        'bg-gradient-to-r from-rose-300 to-rose-400',
      ],
    };
  }, [aggregateStats, totalForPct]);

  // Candidates from recent applications (actual data)
  const candidates = useMemo(() =>
    recentApplications.map((app, index) => ({
      id: app.applicationId || app.student?.id || index,
      name: app.student?.name || app.student?.email || 'Applicant',
      school: app.student?.school || '—',
      skills: [],
      experience: '—',
      status: app.currentStage || app.finalStatus || 'Applied',
      profile: {
        email: app.student?.email || '',
        phone: '',
        location: [app.student?.center].filter(Boolean).join(', ') || '—',
        education: '—',
        experience: [],
        projects: [],
      },
      applicationId: app.applicationId,
      jobTitle: app.jobTitle,
      appliedAt: app.appliedAt,
      profileLink: app.student?.profileLink,
    })),
    [recentApplications]
  );

  // Notifications from recent application activity (actual data)
  const notifications = useMemo(() =>
    recentApplications.slice(0, 8).map((app, index) => ({
      id: app.applicationId || index,
      type: 'application_update',
      title: 'Application Update',
      text: `${app.student?.name || 'Applicant'} applied for ${app.jobTitle || 'your job'}.`,
      time: formatTimeAgo(app.appliedAt),
      status: (app.finalStatus || app.currentStage || 'applied').toLowerCase().replace(/\s+/g, '_'),
    })),
    [recentApplications]
  );

  // Pipeline chart from actual stats (current snapshot)
  const pipelineChartData = useMemo(() => ({
    labels: ['Applications', 'Shortlisted', 'Interviewing', 'Rejected'],
    datasets: [
      {
        label: 'Count',
        data: [aggregateStats.total, aggregateStats.shortlisted, aggregateStats.interviewing, aggregateStats.rejected],
        borderColor: 'rgb(167, 139, 250)',
        backgroundColor: 'rgba(167, 139, 250, 0.2)',
        tension: 0.3,
        fill: true,
      },
    ],
  }), [aggregateStats]);

  // Doughnut chart from actual school distribution
  const doughnutData = useMemo(() => {
    const labels = Object.keys(schoolCounts);
    const data = Object.values(schoolCounts);
    const colors = ['rgba(167, 139, 250, 0.8)', 'rgba(103, 232, 249, 0.8)', 'rgba(253, 230, 138, 0.8)', 'rgba(52, 211, 153, 0.8)', 'rgba(251, 146, 60, 0.8)'];
    return {
      labels: labels.length ? labels : ['No data yet'],
      datasets: [
        {
          data: data.length ? data : [1],
          backgroundColor: data.length ? colors.slice(0, data.length) : ['rgba(200, 200, 200, 0.5)'],
          borderWidth: 0,
        },
      ],
    };
  }, [schoolCounts]);

  // Function to view candidate profile
  const viewProfile = (candidate) => {
    setSelectedCandidate(candidate);
    setShowProfileModal(true);
  };

  // Function to toggle bookmark
  const toggleBookmark = (candidateId) => {
    const newBookmarks = new Set(bookmarkedCandidates);
    if (newBookmarks.has(candidateId)) {
      newBookmarks.delete(candidateId);
    } else {
      newBookmarks.add(candidateId);
    }
    setBookmarkedCandidates(newBookmarks);
  };

  // Function to get status badge color
  const getStatusBadgeColor = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('rejected')) return 'bg-rose-50 text-rose-600';
    if (s.includes('selected')) return 'bg-emerald-50 text-emerald-600';
    if (s.includes('shortlist') || s.includes('qualified')) return 'bg-cyan-50 text-cyan-600';
    if (s.includes('interview')) return 'bg-amber-50 text-amber-600';
    return 'bg-gray-50 text-gray-600';
  };

  // Function to get status text
  const getStatusText = (status) => {
    const s = String(status || '').replace(/_/g, ' ');
    return s || 'Applied';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
        <p className="text-rose-700">{error}</p>
        <button
          type="button"
          onClick={loadDashboardData}
          className="mt-2 px-3 py-1.5 bg-rose-100 text-rose-800 rounded-lg text-sm font-medium hover:bg-rose-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
 
      {/* Masonry Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        
        {/* Stats Cards with Icons */}
        <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statsData.map((stat, index) => (
              <div key={index} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-600 font-medium text-sm">{stat.label}</h3>
                  <span className={`text-xs font-semibold ${stat.trend > 0 ? 'text-green-500' : 'text-rose-500'}`}>
                    {stat.trend > 0 ? '+' : ''}{stat.trend}%
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-gray-800">{stat.value}</span>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Graph - Actual data */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 md:col-span-2 lg:col-span-3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <FaChartLine className="mr-2 text-violet-500" />
              Applications Pipeline
            </h2>
          </div>
          <div className="h-80">
            <Bar
              data={pipelineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { drawBorder: false },
                  },
                  x: {
                    grid: { display: false },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Acquisition Breakdown */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Acquisition Breakdown</h2>
          <div className="space-y-5">
            {pipelineData.labels.map((label, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>{label}</span>
                  <span>{pipelineData.data[index]} ({pipelineData.percentages[index]}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${pipelineData.colors[index]}`}
                    style={{ width: `${pipelineData.percentages[index]}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">By School</h3>
            <div className="h-40">
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                  cutout: '60%',
                }}
              />
            </div>
          </div>
        </div>

        {/* Track Applications Section - Actual data */}
        <div className="bg-white bg-gradient-to-r from-cyan-400 via-green-100 to-green-500  p-3 rounded-lg shadow-sm border border-gray-100 md:col-span-2 lg:col-span-3 xl:col-span-4">
          <h2 className="text-lg font-bold text-gray-800 mb-6 ">Track Applications</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Applications', value: aggregateStats.total, color: 'from-blue-300 to-blue-400', icon: <FaFileAlt className="text-white" /> },
              { label: 'Pending Review', value: aggregateStats.shortlisted, color: 'from-amber-300 to-amber-400', icon: <FaHourglassHalf className="text-white" /> },
              { label: 'Interviewing', value: aggregateStats.interviewing, color: 'from-emerald-300 to-emerald-400', icon: <FaCalendar className="text-white" /> },
            ].map((item, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{item.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${item.color}`}>
                    {item.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Candidates Section - Made larger */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 md:col-span-2 lg:col-span-3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">Recommended Candidates</h2>
            <button className="flex items-center text-sm text-gray-500">
              <FaFilter className="mr-1" /> Filter
            </button>
          </div>
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <div key={candidate.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800">{candidate.name}</h3>
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <span className="bg-violet-100 text-violet-600 px-2 py-0.5 rounded-lg mr-2">
                        {candidate.school}
                      </span>
                      <span>{candidate.experience}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="bg-emerald-100 text-emerald-600 text-xs px-2 py-1 rounded-lg mr-2">
                      {candidate.status}
                    </span>
                    <button 
                      className="text-gray-500 hover:text-violet-600 ml-2"
                      onClick={() => viewProfile(candidate)}
                    >
                      <FaEye className="h-5 w-5" />
                    </button>
                    <button 
                      className="text-gray-500 hover:text-amber-500 ml-2"
                      onClick={() => toggleBookmark(candidate.id)}
                    >
                      {bookmarkedCandidates.has(candidate.id) ? (
                        <FaBookmark className="h-5 w-5 text-amber-500" />
                      ) : (
                        <FaRegBookmark className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                {(candidate.skills?.length > 0) && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {candidate.skills.map((skill, i) => (
                      <span
                        key={i}
                        className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-lg"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  {candidate.profileLink && (
                    <a
                      href={candidate.profileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-gradient-to-r from-violet-500 to-violet-600 text-white px-3 py-1.5 rounded-lg"
                    >
                      View profile
                    </a>
                  )}
                  <span className="text-xs text-gray-500 py-1.5">{candidate.jobTitle && `Applied to ${candidate.jobTitle}`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications & Updates */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center">
              <FaBell className="mr-2 text-violet-500" />
              Application Updates
            </h2>
            <FaQuestionCircle className="text-gray-400" />
          </div>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-gray-800 text-sm">{notification.title}</h3>
                  <span className="text-xs text-gray-500">{notification.time}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">{notification.text}</p>
                {notification.status && (
                  <span className={`text-xs px-2 py-1 rounded-lg mt-2 inline-block ${getStatusBadgeColor(notification.status)}`}>
                    {getStatusText(notification.status)}
                  </span>
                )}
              </div>
            ))}
          </div>
          <button className="w-full mt-4 text-center text-violet-600 text-sm font-medium py-2">
            View All Notifications
          </button>
        </div>

        {/* Interview Tracking - Actual data */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Interview Tracking</h2>
          <div className="space-y-4">
            {[
              { label: 'Interviewing', value: aggregateStats.interviewing, color: 'from-amber-300 to-amber-400', icon: <FaCalendar className="text-white" /> },
              { label: 'Shortlisted', value: aggregateStats.shortlisted, color: 'from-orange-300 to-orange-400', icon: <FaHourglassHalf className="text-white" /> },
              { label: 'Selected / Rejected', value: aggregateStats.selected + aggregateStats.rejected, color: 'from-emerald-300 to-emerald-400', icon: <FaCheck className="text-white" /> },
            ].map((item, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${item.color} mr-3`}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm text-gray-600">{item.label}</p>
                  <p className="font-bold text-gray-800">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recruiter Insights */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Your Company Insights</h2>
          <div className="p-4 bg-gradient-to-r from-cyan-50 to-cyan-100 rounded-lg mb-4">
            <p className="text-sm text-gray-600">Retention rate of PW IOI alumni</p>
            <p className="text-2xl font-bold text-cyan-600">92%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Top skills your company prefers:</p>
            <div className="flex flex-wrap gap-2">
              {['Data Science', 'Java', 'Finance'].map((skill, index) => (
                <span
                  key={index}
                  className="bg-violet-100 text-violet-600 text-xs px-2 py-1 rounded-lg"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Profile Modal */}
      {showProfileModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">{selectedCandidate.name}'s Profile</h2>
              <button 
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setShowProfileModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Contact Information</h3>
                <div className="space-y-2">
                  <p className="text-gray-600 flex items-center">
                    <FaEnvelope className="mr-2 text-violet-500" />
                    {selectedCandidate.profile.email}
                  </p>
                  <p className="text-gray-600 flex items-center">
                    <FaPhone className="mr-2 text-violet-500" />
                    {selectedCandidate.profile.phone}
                  </p>
                  <p className="text-gray-600 flex items-center">
                    <FaMapMarkerAlt className="mr-2 text-violet-500" />
                    {selectedCandidate.profile.location}
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                  <FaGraduationCap className="mr-2 text-violet-500" />
                  Education
                </h3>
                <p className="text-gray-600">{selectedCandidate.profile.education}</p>
              </div>
              
              {(selectedCandidate.profile.experience?.length > 0) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                    <FaBriefcase className="mr-2 text-violet-500" />
                    Experience
                  </h3>
                  {selectedCandidate.profile.experience.map((exp, index) => (
                    <div key={index} className="mb-2">
                      <p className="font-medium">{exp.role}</p>
                      <p className="text-gray-600">{exp.company}, {exp.duration}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {(selectedCandidate.profile.projects?.length > 0) && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                    <FaProjectDiagram className="mr-2 text-violet-500" />
                    Projects
                  </h3>
                  {selectedCandidate.profile.projects.map((project, index) => (
                    <div key={index} className="mb-2">
                      <p className="font-medium">{project.name}</p>
                      <p className="text-gray-600">{project.description}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.skills.map((skill, index) => (
                    <span key={index} className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg">
                Download CV
              </button>
              <button 
                className="px-4 py-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-lg"
                onClick={() => setShowProfileModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterDashboard;