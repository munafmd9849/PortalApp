import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Colors,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { 
  FaFilter, FaSync, FaChartBar, FaChartLine, FaChartPie,
  FaUsers, FaUserTie, FaBuilding, FaBriefcase, FaHandshake
} from 'react-icons/fa';
import CustomDropdown from '../../common/CustomDropdown';
import { CENTER_OPTIONS, SCHOOL_OPTIONS } from '../../../constants/academics';
import api from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Colors,
  Filler
);

const RecruiterAnalytics = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    center: [],
    school: []
  });
  const [chartData, setChartData] = useState({});
  const [statsData, setStatsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    centers: CENTER_OPTIONS,
    schools: SCHOOL_OPTIONS
  });
  
  // Debounce timer for filter changes
  const debounceTimer = useRef(null);

  // Load analytics data
  const loadAnalyticsData = useCallback(async (currentFilters) => {
    try {
      setLoading(true);
      setError(null);

      // Get current user's company
      const me = await api.getCurrentUser();
      const recruiterId = me?.user?.recruiter?.id;
      const companyId = me?.user?.recruiter?.companyId;
      const companyName = me?.user?.recruiter?.companyName || me?.user?.recruiter?.company?.name;
      
      if (!recruiterId) {
        setStatsData({});
        setChartData({});
        setLoading(false);
        return;
      }

      // Get all jobs from current recruiter
      const jobsResponse = await api.getJobs({ recruiterId, limit: 1000 });
      const companyJobs = Array.isArray(jobsResponse) ? jobsResponse : (jobsResponse.jobs || []);

      // Calculate stats (based on current recruiter's activity)
      const totalHRs = 1; // Current recruiter
      const totalManagers = me?.user?.displayName?.toLowerCase().includes('manager') ? 1 : 0;
      const totalDrives = companyJobs.filter(job => 
        job.status === 'POSTED' || job.isPosted
      ).length;
      const jobPostingFrequency = companyJobs.length;

      // HR Distribution by Center (based on job locations)
      const hrByCenter = {};
      companyJobs.forEach(job => {
        const center = job.companyLocation || job.location || 'Unknown';
        hrByCenter[center] = (hrByCenter[center] || 0) + 1;
      });
      if (Object.keys(hrByCenter).length === 0) {
        hrByCenter['All Locations'] = totalHRs;
      }

      // Manager Distribution by Center (same as HR for single recruiter)
      const managerByCenter = totalManagers > 0 ? hrByCenter : {};

      // Drive Participation Over Time (last 12 months)
      const driveByMonth = {};
      const last12Months = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        last12Months.push(monthKey);
        driveByMonth[monthKey] = 0;
      }

      companyJobs.filter(job => job.status === 'POSTED' || job.isPosted).forEach(job => {
        const jobDate = job.postedAt || job.createdAt;
        if (jobDate) {
          const date = new Date(jobDate);
          const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          if (driveByMonth.hasOwnProperty(monthKey)) {
            driveByMonth[monthKey]++;
          }
        }
      });

      // Job Posting Frequency by School (if targeting data available)
      const jobsBySchool = {};
      companyJobs.forEach(job => {
        let schools = job.targetSchools || [];
        // Parse if it's a JSON string
        if (typeof schools === 'string') {
          try {
            schools = JSON.parse(schools);
          } catch (e) {
            schools = [];
          }
        }
        if (Array.isArray(schools) && schools.length > 0) {
          schools.forEach(school => {
            jobsBySchool[school] = (jobsBySchool[school] || 0) + 1;
          });
        }
      });

      setStatsData({
        totalHRs,
        totalManagers,
        totalDrives,
        jobPostingFrequency,
      });

      setChartData({
        hrDistribution: {
          labels: Object.keys(hrByCenter),
          data: Object.values(hrByCenter),
        },
        managerDistribution: {
          labels: Object.keys(managerByCenter),
          data: Object.values(managerByCenter),
        },
        driveParticipation: {
          labels: last12Months,
          data: last12Months.map(month => driveByMonth[month] || 0),
        },
        jobPostingFrequency: {
          labels: Object.keys(jobsBySchool).length > 0 ? Object.keys(jobsBySchool) : ['All Schools'],
          data: Object.keys(jobsBySchool).length > 0 ? Object.values(jobsBySchool) : [jobPostingFrequency],
        },
      });

      setLoading(false);
    } catch (err) {
      console.error('❌ Failed to load RecruiterAnalytics data:', err);
      setError(err.message || 'Failed to load analytics');
      setLoading(false);
    }
  }, [user]);

  // Handle filter changes
  const handleFilterChange = (filterType, values) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: values
    }));
  };

  // Debounced effect for filter changes
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      loadAnalyticsData(filters);
    }, 300);
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [filters, loadAnalyticsData]);

  // Initial load
  useEffect(() => {
    loadAnalyticsData(filters);
  }, []);

  const resetFilters = () => {
    setFilters({
      center: [],
      school: []
    });
  };

  // Chart options
  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      }
    },
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        }
      }
    },
  };

  // Prepare chart data
  const hrDistributionData = {
    labels: chartData.hrDistribution?.labels || [],
    datasets: [{
      label: 'Number of HRs',
      data: chartData.hrDistribution?.data || [],
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1
    }]
  };

  const managerDistributionData = {
    labels: chartData.managerDistribution?.labels || [],
    datasets: [{
      label: 'Number of Managers',
      data: chartData.managerDistribution?.data || [],
      backgroundColor: 'rgba(147, 51, 234, 0.6)',
      borderColor: 'rgba(147, 51, 234, 1)',
      borderWidth: 1
    }]
  };

  const driveParticipationData = {
    labels: chartData.driveParticipation?.labels || [],
    datasets: [{
      label: 'Drive Participation',
      data: chartData.driveParticipation?.data || [],
      borderColor: 'rgba(34, 197, 94, 1)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      tension: 0.3,
      fill: true
    }]
  };

  const jobPostingFrequencyData = {
    labels: chartData.jobPostingFrequency?.labels || [],
    datasets: [{
      data: chartData.jobPostingFrequency?.data || [],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(147, 51, 234, 0.8)',
        'rgba(34, 197, 94, 0.8)'
      ],
      borderWidth: 0
    }]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <FaChartBar className="text-blue-600" />
              HR Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Analytics for HRs, managers, drives, and job postings</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <span className="font-medium">Error loading data:</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <FaFilter className="text-blue-600 text-xl" />
            <h2 className="text-xl font-semibold text-gray-800">Filters & Controls</h2>
            {loading && (
              <div className="flex items-center gap-2 text-blue-600">
                <FaSync className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CustomDropdown
              label="Center"
              options={filterOptions.centers}
              selectedValues={filters.center}
              onSelectionChange={(values) => handleFilterChange('center', values)}
              multiple={true}
              placeholder="Select Center"
            />
            
            <CustomDropdown
              label="School"
              options={filterOptions.schools}
              selectedValues={filters.school}
              onSelectionChange={(values) => handleFilterChange('school', values)}
              multiple={true}
              placeholder="Select School"
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-400/20 to-blue-500/25 backdrop-blur-xl border border-blue-300/30 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-700 text-sm font-medium">Total HRs</p>
                <p className="text-3xl font-bold text-blue-800">{loading ? '...' : (statsData.totalHRs || 0)}</p>
              </div>
              <FaUsers className="text-4xl text-blue-500/70" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-400/20 to-purple-500/25 backdrop-blur-xl border border-purple-300/30 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-700 text-sm font-medium">Total Managers</p>
                <p className="text-3xl font-bold text-purple-800">{loading ? '...' : (statsData.totalManagers || 0)}</p>
              </div>
              <FaUserTie className="text-4xl text-purple-500/70" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-400/20 to-green-500/25 backdrop-blur-xl border border-green-300/30 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 text-sm font-medium">Drive Participation</p>
                <p className="text-3xl font-bold text-green-800">{loading ? '...' : (statsData.totalDrives || 0)}</p>
              </div>
              <FaHandshake className="text-4xl text-green-500/70" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-400/20 to-orange-500/25 backdrop-blur-xl border border-orange-300/30 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-700 text-sm font-medium">Job Posting Frequency</p>
                <p className="text-3xl font-bold text-orange-800">{loading ? '...' : (statsData.jobPostingFrequency || 0)}</p>
              </div>
              <FaBriefcase className="text-4xl text-orange-500/70" />
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* HR Distribution Chart */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaUsers className="text-blue-600" />
              HR Distribution by Center
            </h3>
            <div className="h-64">
              <Bar data={hrDistributionData} options={barOptions} />
            </div>
          </div>

          {/* Manager Distribution Chart */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaUserTie className="text-purple-600" />
              Manager Distribution by Center
            </h3>
            <div className="h-64">
              <Bar data={managerDistributionData} options={barOptions} />
            </div>
          </div>

          {/* Drive Participation Chart */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaChartLine className="text-green-600" />
              Drive Participation Over Time
            </h3>
            <div className="h-64">
              <Line data={driveParticipationData} options={lineOptions} />
            </div>
          </div>

          {/* Job Posting Frequency Chart */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaChartPie className="text-orange-600" />
              Job Posting Frequency by School
            </h3>
            <div className="h-64">
              <Doughnut 
                data={jobPostingFrequencyData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterAnalytics;

