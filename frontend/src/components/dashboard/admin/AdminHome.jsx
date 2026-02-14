import React, { useState, useEffect } from 'react';
// import useRef removed - unused
import { PieChart } from 'react-minimal-pie-chart';
import { ChevronDown, Filter, TrendingUp, Users, Briefcase, MessageSquare, Bell, BarChart3, Target, DollarSign, X, Loader2 } from 'lucide-react';
import { FaChevronDown, FaTimes, FaMapMarkerAlt, FaGraduationCap, FaUsers, FaUserShield } from 'react-icons/fa';
import CustomDropdown from '../../common/CustomDropdown';
import { Chart as ChartJS, CategoryScale, LinearScale, RadialLinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Title, Tooltip, Legend } from 'chart.js';
import { Radar, PolarArea, Bar, Doughnut, Line } from 'react-chartjs-2';
import { adminDashboardService } from '../../../services/adminDashboard';
import { useAuth } from '../../../hooks/useAuth';
// import api from '../../../services/api'; // Unused import removed
// TODO: Replace Firebase operations with API calls
// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Title, Tooltip, Legend);

export default function AdminHome() {
  const { user, role } = useAuth();
  const userRole = (role || user?.role || '').toUpperCase();
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  
  const [filters, setFilters] = useState({ campus: '', school: '', batch: '', admin: '' });
  const [selectedSchool, setSelectedSchool] = useState('SOT');


  // Chart.js color palette
  const chartColors = {
    blue: 'rgb(59, 130, 246)',
    purple: 'rgb(147, 51, 234)',
    green: 'rgb(34, 197, 94)',
    red: 'rgb(239, 68, 68)',
    blueLight: 'rgba(59, 130, 246, 0.1)',
    purpleLight: 'rgba(147, 51, 234, 0.1)',
    greenLight: 'rgba(34, 197, 94, 0.1)',
    redLight: 'rgba(239, 68, 68, 0.1)'
  };

  // Real-time dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({
    campuses: [],
    schools: [],
    batches: [],
    admins: []
  });
  const [loadingFilters, setLoadingFilters] = useState(true);

  // Load predefined filter options (no database fetching to avoid duplicates)
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setLoadingFilters(true);
        
        // TODO: Replace with API call: admin API to get admin users
        // For now, use placeholder
        const admins = [];
        // Placeholder - will be replaced with actual API call
        // const admins = await api.getAdmins();
        
        // Use only predefined options for schools, batches, centers
        setFilterOptions({
          campuses: [
            { id: 'BANGALORE', name: 'Bangalore' },
            { id: 'NOIDA', name: 'Noida' },
            { id: 'LUCKNOW', name: 'Lucknow' },
            { id: 'PUNE', name: 'Pune' },
            { id: 'PATNA', name: 'Patna' },
            { id: 'INDORE', name: 'Indore' }
          ],
          schools: [
            { id: 'SOT', name: 'School of Technology' },
            { id: 'SOM', name: 'School of Management' },
            { id: 'SOH', name: 'School of Healthcare' }
          ],
          batches: [
            { id: '23-27', name: '2023-2027' },
            { id: '24-28', name: '2024-2028' },
            { id: '25-29', name: '2025-2029' },
            { id: '26-30', name: '2026-2030' }
          ],
          admins: [
            { id: 'all', name: 'All Admins' },
            ...admins
          ]
        });
        
        console.log('✅ AdminHome filter options loaded (predefined only)');
      } catch (error) {
        console.error('❌ Error loading AdminHome filter options:', error);
        
        // Fallback to hardcoded options
        setFilterOptions({
          campuses: [
            { id: 'BANGALORE', name: 'Bangalore' },
            { id: 'NOIDA', name: 'Noida' },
            { id: 'LUCKNOW', name: 'Lucknow' },
            { id: 'PUNE', name: 'Pune' },
            { id: 'PATNA', name: 'Patna' },
            { id: 'INDORE', name: 'Indore' }
          ],
          schools: [
            { id: 'SOT', name: 'School of Technology' },
            { id: 'SOM', name: 'School of Management' },
            { id: 'SOH', name: 'School of Healthcare' }
          ],
          batches: [
            { id: '23-27', name: '2023-2027' },
            { id: '24-28', name: '2024-2028' },
            { id: '25-29', name: '2025-2029' },
            { id: '26-30', name: '2026-2030' }
          ],
          admins: [
            { id: 'all', name: 'All Admins' }
          ]
        });
      } finally {
        setLoadingFilters(false);
      }
    };

    loadFilterOptions();
  }, []);

  // Map AdminHome filters to service expectations
  const mapFiltersForService = (uiFilters) => {
    return {
      center: uiFilters.campus ? [uiFilters.campus] : [], // campus -> center (convert single value to array)
      school: uiFilters.school ? [uiFilters.school] : [],
      quarter: uiFilters.batch ? [(() => {
        // Map batch years to quarters
        switch(uiFilters.batch) {
          case '25-29': return 'Q1 (Pre-Placement)';
          case '24-28': return 'Q2 (Placement Drive)';
          case '23-27': return 'Q3 (Internship)';
          default: return 'Q4 (Final Placements)';
        }
      })()] : []
    };
  };


  // Subscribe to real-time dashboard data
  useEffect(() => {
    setIsLoading(true);
    const mappedFilters = mapFiltersForService(filters);
    console.log('🔄 Setting up dashboard data subscription with filters:', {
      uiFilters: filters,
      serviceFilters: mappedFilters
    });
    
    const unsubscribe = adminDashboardService.subscribeToDashboardData(
      (data) => {
        console.log('📊 Dashboard data received:', {
          stats: data.stats,
          chartDataKeys: Object.keys(data.chartData),
          filters: mappedFilters
        });
        setDashboardData(data);
        setIsLoading(false);
      },
      mappedFilters // Pass mapped filters to service
    );

    return () => {
      console.log('🧹 Cleaning up dashboard subscription');
      unsubscribe();
    };
  }, [filters]); // Re-subscribe when filters change

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      adminDashboardService.cleanup();
    };
  }, []);

  // Handle filter changes (AdminPanel style)
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearAllFilters = () => setFilters({ campus: '', school: '', batch: '', admin: '' });

  const queryVolumeData = dashboardData?.chartData?.queryVolume || [];

  // Stats with real-time data and consistent Chart.js colors
  const stats = dashboardData ? [
    { 
      title: 'Job Postings', 
      value: dashboardData.stats.totalJobsPosted, 
      borderColor: 'border-blue-200', 
      icon: <Briefcase className="w-5 h-5" style={{ color: chartColors.blue }} />, 
      chartData: [ 
        { title: 'Posted', value: dashboardData.stats.totalJobsPosted, color: chartColors.blue },
        { title: 'Total', value: Math.max(dashboardData.stats.totalJobsPosted, 1), color: '#dbeafe' } 
      ] 
    },
    { 
      title: 'Active Students', 
      value: dashboardData.stats.activeStudents, 
      borderColor: 'border-green-200', 
      icon: <Users className="w-5 h-5" style={{ color: chartColors.green }} />, 
      chartData: [ 
        { title: 'Active', value: dashboardData.stats.activeStudents, color: chartColors.green },
        { title: 'Total', value: Math.max(dashboardData.stats.totalStudents || dashboardData.stats.activeStudents, 1), color: '#dcfce7' } 
      ] 
    },
    { 
      title: 'Pending Queries', 
      value: dashboardData.stats.pendingQueries, 
      borderColor: 'border-purple-200', 
      icon: <MessageSquare className="w-5 h-5" style={{ color: chartColors.purple }} />, 
      chartData: [ 
        { title: 'Pending', value: dashboardData.stats.pendingQueries, color: chartColors.purple },
        { title: 'Total', value: Math.max(dashboardData.stats.pendingQueries, 1), color: '#f3e8ff' } 
      ] 
    },
    { 
      title: 'Applications', 
      value: dashboardData.stats.totalApplications, 
      borderColor: 'border-red-200', 
      icon: <TrendingUp className="w-5 h-5" style={{ color: chartColors.red }} />, 
      chartData: [ 
        { title: 'Placed', value: dashboardData.stats.placedStudents, color: chartColors.red },
        { title: 'Applied', value: Math.max(dashboardData.stats.totalApplications - dashboardData.stats.placedStudents, 0), color: '#fecaca' } 
      ] 
    }
  ] : [];

  // School data with real-time performance and application metrics
  // Ensure we always have a valid structure with all schools
  const defaultSchoolData = {
    SOT: {
      performance: { labels: [], values: [] },
      applications: { labels: [], values: [] }
    },
    SOM: {
      performance: { labels: [], values: [] },
      applications: { labels: [], values: [] }
    },
    SOH: {
      performance: { labels: [], values: [] },
      applications: { labels: [], values: [] }
    }
  };
  
  const incomingSchoolData = dashboardData?.chartData?.schoolPerformance || {};
  const schoolData = {
    SOT: incomingSchoolData.SOT || defaultSchoolData.SOT,
    SOM: incomingSchoolData.SOM || defaultSchoolData.SOM,
    SOH: incomingSchoolData.SOH || defaultSchoolData.SOH,
  };

  // Build unified radar chart data with consistent colors
  const buildSchoolRadarData = (schoolKey) => {
    const school = schoolData[schoolKey];
    
    // Safety check: if school data doesn't exist or is incomplete, return empty data
    if (!school || !school.performance || !school.applications) {
      return {
        labels: [],
        datasets: [
          {
            label: 'Performance Metrics',
            data: [],
            backgroundColor: chartColors.blueLight,
            borderColor: chartColors.blue,
            borderWidth: 2,
            pointBackgroundColor: chartColors.blue,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: chartColors.blue
          },
          {
            label: 'Application Metrics',
            data: [],
            backgroundColor: chartColors.greenLight,
            borderColor: chartColors.green,
            borderWidth: 2,
            pointBackgroundColor: chartColors.green,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: chartColors.green
          }
        ]
      };
    }
    
    const labels = school.performance.labels || [];
    const performanceValues = school.performance.values || [];
    const applicationValues = school.applications.values || [];
    
    return {
      labels,
      datasets: [
        {
          label: 'Performance Metrics',
          data: performanceValues,
          backgroundColor: chartColors.blueLight,
          borderColor: chartColors.blue,
          borderWidth: 2,
          pointBackgroundColor: chartColors.blue,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: chartColors.blue
        },
        {
          label: 'Application Metrics',
          data: applicationValues.map((val, index) => {
            const maxVal = index === 0 ? 4000 : index === 1 ? 1000 : index === 2 ? 600 : 100;
            return maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;
          }),
          backgroundColor: chartColors.greenLight,
          borderColor: chartColors.green,
          borderWidth: 2,
          pointBackgroundColor: chartColors.green,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: chartColors.green
        }
      ]
    };
  };

  const schoolRadarData = buildSchoolRadarData(selectedSchool);

  return (
    <div className="space-y-6 p-4 bg-gradient-to-br from-gray-50 to-blue-50/30 min-h-screen">
      {/* Header with consistent colors */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <h1 className="text-3xl font-bold" style={{ background: `linear-gradient(to right, ${chartColors.blue}, ${chartColors.purple})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Admin Dashboard
          </h1>
          <div className="absolute -bottom-1 left-0 w-1/2 h-0.5" style={{ background: `linear-gradient(to right, ${chartColors.blue}, transparent)` }}></div>
        </div>
      </div>

      {/* Filter Section with consistent colors - Only visible to SuperAdmin */}
      {isSuperAdmin && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Filter className="w-5 h-5 mr-2" style={{ color: chartColors.blue }} />
            Filter Dashboard
          </h2>

        {(filters.campus || filters.school || filters.batch || filters.admin) && (
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            {filters.campus && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: chartColors.blueLight, borderColor: chartColors.blue, color: chartColors.blue }}>
                Campus: {filterOptions.campuses.find(opt => opt.id === filters.campus)?.name || filters.campus}
                <button onClick={() => handleFilterChange('campus', '')} className="ml-1 hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.school && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: chartColors.greenLight, borderColor: chartColors.green, color: chartColors.green }}>
                School: {filterOptions.schools.find(opt => opt.id === filters.school)?.name || filters.school}
                <button onClick={() => handleFilterChange('school', '')} className="ml-1 hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.batch && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: chartColors.purpleLight, borderColor: chartColors.purple, color: chartColors.purple }}>
                Batch: {filterOptions.batches.find(opt => opt.id === filters.batch)?.name || filters.batch}
                <button onClick={() => handleFilterChange('batch', '')} className="ml-1 hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.admin && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: chartColors.redLight, borderColor: chartColors.red, color: chartColors.red }}>
                Admin: {filterOptions.admins.find(opt => opt.id === filters.admin)?.name || filters.admin}
                <button onClick={() => handleFilterChange('admin', '')} className="ml-1 hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-gray-700 underline">Clear all</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CustomDropdown
            label="Campus"
            icon={FaMapMarkerAlt}
            iconColor="text-blue-600"
            options={[
              { value: '', label: 'Select Campus' },
              ...filterOptions.campuses.map(opt => ({ value: opt.id, label: opt.name }))
            ]}
            value={filters.campus}
            onChange={(value) => handleFilterChange('campus', value)}
            placeholder="Select Campus"
          />
          
          <CustomDropdown
            label="School"
            icon={FaGraduationCap}
            iconColor="text-purple-600"
            options={[
              { value: '', label: 'Select School' },
              ...filterOptions.schools.map(opt => ({ value: opt.id, label: opt.name }))
            ]}
            value={filters.school}
            onChange={(value) => handleFilterChange('school', value)}
            placeholder="Select School"
          />
          
          <CustomDropdown
            label="Batch"
            icon={FaUsers}
            iconColor="text-indigo-600"
            options={[
              { value: '', label: 'Select Batch' },
              ...filterOptions.batches.map(opt => ({ value: opt.id, label: opt.name }))
            ]}
            value={filters.batch}
            onChange={(value) => handleFilterChange('batch', value)}
            placeholder="Select Batch"
          />
          
          <CustomDropdown
            label="Admin"
            icon={FaUserShield}
            iconColor="text-red-600"
            options={[
              { value: '', label: 'Select Admin' },
              ...filterOptions.admins.map(opt => ({ value: opt.id, label: opt.name }))
            ]}
            value={filters.admin}
            onChange={(value) => handleFilterChange('admin', value)}
            placeholder="Select Admin"
          />
        </div>
        </div>
      )}

      {/* Info message for regular admins */}
      {!isSuperAdmin && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Filter className="w-5 h-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Viewing your data:</strong> You are viewing data for your assigned center/school only.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards with consistent colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-gray-200 animate-pulse">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          ))
        ) : (
          stats.map((stat, idx) => (
            <div key={idx} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-all duration-300 ${stat.borderColor}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 flex items-center">
                    {stat.icon}
                    <span className="ml-2">{stat.title}</span>
                  </p>
                  <h3 className="text-2xl font-bold text-gray-800 mt-2">{stat.value}</h3>
                </div>
                <div className="w-16 h-16">
                  <PieChart 
                    data={stat.chartData} 
                    lineWidth={20} 
                    radius={40} 
                    label={({ dataEntry }) => `${dataEntry.value}`}
                    labelStyle={{ fontSize: '0px', fill: '#000' }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Overall Insights and Metrics */}
      {!isLoading && dashboardData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" style={{ color: chartColors.blue }} />
              Key Insights & Metrics
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ backgroundColor: chartColors.blueLight }}>
                  <Users className="w-6 h-6" style={{ color: chartColors.blue }} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">{dashboardData.stats.activeRecruiters}</h3>
                <p className="text-sm text-gray-600">Active Recruiters</p>
                <p className="text-xs text-gray-500 mt-1">Verified companies</p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ backgroundColor: chartColors.greenLight }}>
                  <Target className="w-6 h-6" style={{ color: chartColors.green }} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                  {dashboardData.stats.totalApplications > 0 
                    ? Math.round((dashboardData.stats.placedStudents / dashboardData.stats.totalApplications) * 100)
                    : 0}%
                </h3>
                <p className="text-sm text-gray-600">Placement Rate</p>
                <p className="text-xs text-gray-500 mt-1">Success ratio</p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ backgroundColor: chartColors.purpleLight }}>
                  <MessageSquare className="w-6 h-6" style={{ color: chartColors.purple }} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                  {dashboardData.stats.pendingQueries === 0 ? '✅' : dashboardData.stats.pendingQueries}
                </h3>
                <p className="text-sm text-gray-600">Support Queue</p>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboardData.stats.pendingQueries === 0 ? 'All caught up!' : 'Queries pending'}
                </p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3" style={{ backgroundColor: chartColors.redLight }}>
                  <TrendingUp className="w-6 h-6" style={{ color: chartColors.red }} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-1">
                  {dashboardData.stats.activeStudents > 0 
                    ? Math.round((dashboardData.stats.totalApplications / dashboardData.stats.activeStudents) * 10) / 10
                    : 0}
                </h3>
                <p className="text-sm text-gray-600">Avg Applications</p>
                <p className="text-xs text-gray-500 mt-1">Per student</p>
              </div>
            </div>
            
            {/* Student Statistics Breakdown */}
            {dashboardData.stats.totalStudents !== undefined && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" style={{ color: chartColors.blue }} />
                  Student Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-700">{dashboardData.stats.totalStudents || 0}</div>
                    <div className="text-sm text-blue-600 mt-1">Total Students</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">{dashboardData.stats.activeStudents || 0}</div>
                    <div className="text-sm text-green-600 mt-1">Active</div>
                  </div>
                  {dashboardData.stats.blockedStudents > 0 && (
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-700">{dashboardData.stats.blockedStudents || 0}</div>
                      <div className="text-sm text-red-600 mt-1">Blocked</div>
                    </div>
                  )}
                  {dashboardData.stats.pendingStudents > 0 && (
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-700">{dashboardData.stats.pendingStudents || 0}</div>
                      <div className="text-sm text-yellow-600 mt-1">Pending</div>
                    </div>
                  )}
                  {dashboardData.stats.rejectedStudents > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-700">{dashboardData.stats.rejectedStudents || 0}</div>
                      <div className="text-sm text-gray-600 mt-1">Rejected</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Additional Summary Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center text-blue-700 mb-2">
                    <Briefcase className="w-4 h-4 mr-2" />
                    <span className="font-semibold">Job Market</span>
                  </div>
                  <p className="text-blue-600">
                    {dashboardData.stats.totalJobsPosted} active positions from {dashboardData.stats.activeRecruiters} companies
                  </p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center text-green-700 mb-2">
                    <Users className="w-4 h-4 mr-2" />
                    <span className="font-semibold">Student Activity</span>
                  </div>
                  <p className="text-green-600">
                    {dashboardData.stats.activeStudents || 0} active out of {dashboardData.stats.totalStudents || 0} total students
                  </p>
                  {dashboardData.stats.blockedStudents > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      {dashboardData.stats.blockedStudents} blocked, {dashboardData.stats.pendingStudents || 0} pending
                    </p>
                  )}
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center text-purple-700 mb-2">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span className="font-semibold">Support Status</span>
                  </div>
                  <p className="text-purple-600">
                    {dashboardData.stats.pendingQueries === 0 
                      ? 'All queries resolved ✨' 
                      : `${dashboardData.stats.pendingQueries} queries need attention`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Placement Trends and Analytics Charts */}
      {!isLoading && dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Placement Trend Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" style={{ color: chartColors.blue }} />
                Placement Trends (Last 6 Months)
              </h2>
            </div>
            <div className="p-6">
              <div className="h-80">
                {dashboardData.chartData.placementTrend && dashboardData.chartData.placementTrend.labels ? (
                  <Line 
                    data={dashboardData.chartData.placementTrend}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: {
                            usePointStyle: true,
                            padding: 15
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          titleColor: '#1f2937',
                          bodyColor: '#374151',
                          borderColor: '#e5e7eb',
                          borderWidth: 1
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            color: '#6b7280'
                          },
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                          }
                        },
                        x: {
                          ticks: {
                            color: '#6b7280'
                          },
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No placement data available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Query Volume and Recruiter Activity */}
          <div className="space-y-6">
            {/* Query Volume Pie Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <MessageSquare className="w-4 h-4 mr-2" style={{ color: chartColors.purple }} />
                  Query Volume by Type
                </h2>
              </div>
              <div className="p-4">
                <div className="h-48">
                  {dashboardData.chartData.queryVolume && dashboardData.chartData.queryVolume.length > 0 ? (
                    <PieChart 
                      data={dashboardData.chartData.queryVolume}
                      lineWidth={60}
                      radius={40}
                      label={({ dataEntry }) => dataEntry.title}
                      labelStyle={{
                        fontSize: '8px',
                        fill: '#fff',
                        fontWeight: 'bold'
                      }}
                      labelPosition={70}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No query data</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Top Recruiters Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Users className="w-4 h-4 mr-2" style={{ color: chartColors.green }} />
                  Top Active Recruiters
                </h2>
              </div>
              <div className="p-4">
                <div className="h-48">
                  {dashboardData.chartData.recruiterActivity && dashboardData.chartData.recruiterActivity.labels ? (
                    <Bar 
                      data={dashboardData.chartData.recruiterActivity}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              color: '#6b7280',
                              stepSize: 1
                            },
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)'
                            }
                          },
                          x: {
                            ticks: {
                              color: '#6b7280'
                            },
                            grid: {
                              display: false
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No recruiter data</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* School Performance Radar Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Target className="w-5 h-5 mr-2" style={{ color: chartColors.blue }} />
                School Performance & Applications
              </h2>
            </div>
            {/* School selector with consistent Chart.js colors */}
            <div className="flex gap-2">
              {['SOT', 'SOM', 'SOH'].map((school) => (
                <button
                  key={school}
                  onClick={() => setSelectedSchool(school)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${
                    selectedSchool === school
                      ? 'text-white shadow-sm'
                      : 'text-gray-700 bg-white border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Animated gradient border using Chart.js colors */}
                  {selectedSchool === school && (
                    <div 
                      className="absolute inset-0 rounded-xl p-[1.5px] animate-pulse"
                      style={{
                        background: school === 'SOT' 
                          ? `linear-gradient(to right, ${chartColors.blue}, ${chartColors.purple})`
                          : school === 'SOM'
                          ? `linear-gradient(to right, ${chartColors.purple}, ${chartColors.green})`
                          : `linear-gradient(to right, ${chartColors.green}, ${chartColors.blue})`
                      }}
                    >
                      <div 
                        className="w-full h-full rounded-lg"
                        style={{
                          background: school === 'SOT' 
                            ? chartColors.blue
                            : school === 'SOM'
                            ? chartColors.purple
                            : chartColors.green
                        }}
                      />
                    </div>
                  )}
                  
                  <span className="relative z-10">{school}</span>
                  
                  {/* Hover effect with Chart.js background colors */}
                  {selectedSchool !== school && (
                    <div 
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 border"
                      style={{
                        background: school === 'SOT' 
                          ? chartColors.blueLight
                          : school === 'SOM'
                          ? chartColors.purpleLight
                          : chartColors.greenLight,
                        borderColor: school === 'SOT' 
                          ? chartColors.blue
                          : school === 'SOM'
                          ? chartColors.purple
                          : chartColors.green
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
                  <p className="text-gray-500 text-lg">Loading school performance data...</p>
                </div>
              </div>
            ) : schoolData[selectedSchool] && schoolData[selectedSchool].performance.labels.length > 0 ? (
              <Radar 
                data={schoolRadarData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    r: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        display: false
                      },
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                      },
                      angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                      },
                      pointLabels: {
                        font: {
                          size: 11,
                          weight: '500'
                        },
                        color: '#374151'
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                          size: 12
                        }
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      titleColor: '#1f2937',
                      bodyColor: '#374151',
                      borderColor: '#e5e7eb',
                      borderWidth: 1,
                      padding: 12,
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: ${context.raw}%`;
                        }
                      }
                    }
                  }
                }} 
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Target className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No school performance data available</p>
                  <p className="text-sm mt-1">Data will appear once students and applications are available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}