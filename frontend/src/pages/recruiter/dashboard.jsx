import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
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
  FaFileAlt, FaCheckCircle, FaTimesCircle,
  FaCalendar, FaHourglassHalf,
  FaBriefcase, FaChartLine
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

const RecruiterDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobsCount, setJobsCount] = useState(0);
  const [selectionRate, setSelectionRate] = useState(null);
  const [aggregateStats, setAggregateStats] = useState({
    total: 0,
    shortlisted: 0,
    selected: 0,
    rejected: 0,
    interviewing: 0,
  });
  const [schoolCounts, setSchoolCounts] = useState({});

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getRecruiterDashboardStats();
      const stats = data?.stats || {};

      setJobsCount(data?.jobsPosted ?? 0);
      setSelectionRate(data?.selectionRate ?? null);
      setAggregateStats({
        total: stats.total ?? 0,
        shortlisted: stats.shortlisted ?? 0,
        selected: stats.selected ?? 0,
        rejected: stats.rejected ?? 0,
        interviewing: stats.interviewing ?? 0,
      });
      setSchoolCounts(data?.schoolCounts || {});
    } catch (err) {
      console.error('Recruiter dashboard load error:', err);
      setError(err?.message || 'Failed to load dashboard data');
      setJobsCount(0);
      setSelectionRate(null);
      setAggregateStats({ total: 0, shortlisted: 0, selected: 0, rejected: 0, interviewing: 0 });
      setSchoolCounts({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const statsData = useMemo(() => [
    { label: 'Jobs Posted', value: jobsCount, color: 'from-violet-300 to-violet-400', icon: <FaBriefcase className="text-white" /> },
    { label: 'Applications Received', value: aggregateStats.total, color: 'from-cyan-300 to-cyan-400', icon: <FaFileAlt className="text-white" /> },
    { label: 'Shortlisted (Hired)', value: aggregateStats.selected, color: 'from-emerald-300 to-emerald-400', icon: <FaCheckCircle className="text-white" /> },
  ], [aggregateStats, jobsCount]);

  const totalForPct = aggregateStats.total || 1;
  const pendingCount = useMemo(() => Math.max(0,
    aggregateStats.total - aggregateStats.selected - aggregateStats.rejected - aggregateStats.interviewing - aggregateStats.shortlisted
  ), [aggregateStats]);
  const pipelineData = useMemo(() => {
    const pct = (n) => ((n / totalForPct) * 100).toFixed(1);
    return {
      labels: ['Shortlisted (Hired)', 'Interviewing', 'Pending', 'Rejected'],
      data: [aggregateStats.selected, aggregateStats.interviewing, pendingCount + aggregateStats.shortlisted, aggregateStats.rejected],
      percentages: [
        pct(aggregateStats.selected),
        pct(aggregateStats.interviewing),
        pct(pendingCount + aggregateStats.shortlisted),
        pct(aggregateStats.rejected),
      ],
      colors: [
        'bg-gradient-to-r from-emerald-300 to-emerald-400',
        'bg-gradient-to-r from-amber-300 to-amber-400',
        'bg-gradient-to-r from-cyan-300 to-cyan-400',
        'bg-gradient-to-r from-rose-300 to-rose-400',
      ],
    };
  }, [aggregateStats, totalForPct, pendingCount]);

  const pipelineChartData = useMemo(() => {
    const pending = Math.max(0, aggregateStats.total - aggregateStats.selected - aggregateStats.rejected - aggregateStats.interviewing - aggregateStats.shortlisted);
    return {
      labels: ['Shortlisted (Hired)', 'Interviewing', 'Pending', 'Rejected'],
      datasets: [
        {
          label: 'Count',
          data: [aggregateStats.selected, aggregateStats.interviewing, pending + aggregateStats.shortlisted, aggregateStats.rejected],
          borderColor: 'rgb(167, 139, 250)',
          backgroundColor: 'rgba(167, 139, 250, 0.2)',
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }, [aggregateStats]);

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
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
          Selection rate across your posted jobs:{' '}
          <span className="italic px-1 rounded-xs bg-gradient-to-t from-yellow-400 to-yellow-400 bg-no-repeat [background-size:100%_25%] [background-position:0_100%] transition-all duration-300 ease-in-out hover:[background-size:100%_100%] hover:[background-position:100%_100%] underline decoration-yellow-400 decoration-2 underline-offset-2">
            {selectionRate !== null ? `${selectionRate}%` : '—'}
          </span>
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Based on {aggregateStats.total} application{aggregateStats.total === 1 ? '' : 's'} across {jobsCount} posted job{jobsCount === 1 ? '' : 's'}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statsData.map((stat, index) => (
              <div key={index} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-600 font-medium text-sm">{stat.label}</h3>
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
                  />
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

        <div className="bg-white bg-gradient-to-r from-cyan-400 via-green-100 to-green-500 p-5 rounded-lg shadow-sm border border-gray-100 md:col-span-2 lg:col-span-3 xl:col-span-4">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Track Applications</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Shortlisted (Hired)', value: aggregateStats.selected, color: 'from-emerald-300 to-emerald-400', icon: <FaCheckCircle className="text-white" /> },
              { label: 'Interviewing', value: aggregateStats.interviewing, color: 'from-amber-300 to-amber-400', icon: <FaCalendar className="text-white" /> },
              { label: 'Pending', value: pendingCount + aggregateStats.shortlisted, color: 'from-cyan-300 to-cyan-400', icon: <FaHourglassHalf className="text-white" /> },
              { label: 'Rejected', value: aggregateStats.rejected, color: 'from-rose-300 to-rose-400', icon: <FaTimesCircle className="text-white" /> },
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

      </div>
    </div>
  );
};

export default RecruiterDashboard;
