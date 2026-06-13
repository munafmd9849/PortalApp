import React, { useState, useEffect, useMemo } from 'react';

import { JobOpportunitiesSection } from './JobOpportunitiesDashboard';
import CrManagerCard from './CrManagerCard';
import FunnelStatCard from './FunnelStatCard';
import { fetchCrManagers } from '../../../services/jobOpportunities';
// import useRef removed - unused
import { PieChart } from 'react-minimal-pie-chart';
import { ChevronDown, Filter, TrendingUp, Users, Briefcase, MessageSquare, Bell, Target, DollarSign, X, Loader2 } from 'lucide-react';
import { FaChevronDown, FaTimes, FaMapMarkerAlt, FaGraduationCap, FaUsers, FaUserShield } from 'react-icons/fa';
import CustomDropdown from '../../common/CustomDropdown';
import { Chart as ChartJS, CategoryScale, LinearScale, RadialLinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Title, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { adminDashboardService } from '../../../services/adminDashboard';
import { useAuth } from '../../../hooks/useAuth';
import {
  getAdminDisplayName,
  getAdminWelcomePrefix,
  getDashboardWelcomeSubtitle,
} from '../../../utils/adminScopeDisplay';
// import api from '../../../services/api'; // Unused import removed
// TODO: Replace Firebase operations with API calls
// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Title, Tooltip, Legend);

export default function AdminHome() {
  const { user, role } = useAuth();
  const userRole = (role || user?.role || '').toUpperCase();
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdminUser = userRole === 'ADMIN' || isSuperAdmin;
  
  const [filters, setFilters] = useState({ campus: '', school: '', batch: '', admin: '' });
  const [selectedSchool, setSelectedSchool] = useState('');


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
  const [academicData, setAcademicData] = useState({ schools: [], centers: [], batches: [] });
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [adminOverview, setAdminOverview] = useState({ jdsPunched: 0, managers: [] });
  const [loadingAdminOverview, setLoadingAdminOverview] = useState(true);

  const adminDisplayName = getAdminDisplayName(user);
  const welcomePrefix = useMemo(() => getAdminWelcomePrefix(user?.id), [user?.id]);
  const welcomeSubtitle = useMemo(
    () => getDashboardWelcomeSubtitle(user, userRole, academicData),
    [user, userRole, academicData]
  );

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        setLoadingFilters(true);
        const { fetchAcademicOptions, buildStandardFilterOptions } = await import(
          '../../../utils/academicOptions'
        );
        const raw = await fetchAcademicOptions();
        const academic = buildStandardFilterOptions(raw);
        setAcademicData(raw);
        setFilterOptions({
          campuses: academic.centers,
          schools: academic.schools,
          batches: academic.batches,
          admins: [{ id: 'all', name: 'All Admins' }],
        });
      } catch (error) {
        console.error('Error loading AdminHome filter options:', error);
        setFilterOptions({ campuses: [], schools: [], batches: [], admins: [{ id: 'all', name: 'All Admins' }] });
      } finally {
        setLoadingFilters(false);
      }
    };

    loadFilterOptions();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadAdminOverview = async () => {
      setLoadingAdminOverview(true);
      try {
        const data = await fetchCrManagers({});
        if (!cancelled) setAdminOverview(data || { jdsPunched: 0, managers: [] });
      } catch (error) {
        console.error('Error loading admin overview:', error);
        if (!cancelled) setAdminOverview({ jdsPunched: 0, managers: [] });
      } finally {
        if (!cancelled) setLoadingAdminOverview(false);
      }
    };
    loadAdminOverview();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const ids = filterOptions.schools.map((s) => s.id).filter(Boolean);
    if (!ids.length) return;
    if (!selectedSchool || !ids.includes(selectedSchool)) {
      setSelectedSchool(ids[0]);
    }
  }, [filterOptions.schools, selectedSchool]);

  const mapFiltersForService = (uiFilters) => {
    return {
      center: uiFilters.campus ? [uiFilters.campus] : [],
      school: uiFilters.school ? [uiFilters.school] : [],
      batch: uiFilters.batch ? [uiFilters.batch] : [],
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
        const safeData = data && typeof data === 'object' ? data : {};
        console.log('📊 Dashboard data received:', {
          stats: safeData.stats,
          chartDataKeys: Object.keys(safeData.chartData || {}),
          filters: mappedFilters
        });
        setDashboardData(safeData);
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
  const s = dashboardData?.stats;
  const stats = dashboardData && s ? [
    { 
      title: 'Job Postings', 
      value: s.totalJobsPosted ?? 0, 
      borderColor: 'border-blue-200', 
      icon: <Briefcase className="w-5 h-5" style={{ color: chartColors.blue }} />, 
      chartData: [ 
        { title: 'Posted', value: s.totalJobsPosted ?? 0, color: chartColors.blue },
        { title: 'Total', value: Math.max(s.totalJobsPosted ?? 0, 1), color: '#dbeafe' } 
      ] 
    },
    { 
      title: 'Active Students', 
      value: s.activeStudents ?? 0, 
      borderColor: 'border-green-200', 
      icon: <Users className="w-5 h-5" style={{ color: chartColors.green }} />, 
      chartData: [ 
        { title: 'Active', value: s.activeStudents ?? 0, color: chartColors.green },
        { title: 'Total', value: Math.max(s.totalStudents ?? s.activeStudents ?? 0, 1), color: '#dcfce7' } 
      ] 
    },
    { 
      title: 'Pending Queries', 
      value: s.pendingQueries ?? 0, 
      borderColor: 'border-purple-200', 
      icon: <MessageSquare className="w-5 h-5" style={{ color: chartColors.purple }} />, 
      chartData: [ 
        { title: 'Pending', value: s.pendingQueries ?? 0, color: chartColors.purple },
        { title: 'Total', value: Math.max(s.pendingQueries ?? 0, 1), color: '#f3e8ff' } 
      ] 
    },
    { 
      title: 'Applications', 
      value: s.totalApplications ?? 0, 
      borderColor: 'border-red-200', 
      icon: <TrendingUp className="w-5 h-5" style={{ color: chartColors.red }} />, 
      chartData: [ 
        { title: 'Placed', value: s.placedStudents ?? 0, color: chartColors.red },
        { title: 'Applied', value: Math.max((s.totalApplications ?? 0) - (s.placedStudents ?? 0), 0), color: '#fecaca' } 
      ] 
    }
  ] : [];

  const scopeFunnel = dashboardData?.myStats;
  const funnelStages = scopeFunnel?.stages || [];
  const funnelEligible = scopeFunnel?.eligible ?? 0;

  const activeDrives = dashboardData?.activeDrives || [];

  const formatDriveDate = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const driveStatusLabel = (status) => {
    const map = {
      ACTIVE: 'Active',
      IN_PROCESS: 'In Process',
      HOLD: 'On Hold',
      YET_TO_START: 'Yet to Start',
      CLOSED: 'Closed',
      NOT_DELIVERABLE: 'Not Deliverable',
    };
    return map[status] || status || '—';
  };

  const renderStatCards = (items, loading) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {loading ? (
        Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))
      ) : (
        items.map((stat, idx) => (
          <div key={idx} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-all duration-300 ${stat.borderColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 flex items-center">
                  {stat.icon}
                  <span className="ml-2">{stat.title}</span>
                </p>
                <h3 className="text-2xl font-bold text-gray-800 mt-2">{stat.value}</h3>
              </div>
              {stat.chartData && (
                <div className="w-16 h-16">
                  <PieChart
                    data={stat.chartData}
                    lineWidth={20}
                    radius={40}
                    label={() => ''}
                    labelStyle={{ fontSize: '0px', fill: '#000' }}
                  />
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // School data with real-time performance and application metrics
  // Ensure we always have a valid structure with all schools
  const emptySchoolChart = {
    performance: { labels: [], values: [] },
    applications: { labels: [], values: [] },
  };

  const incomingSchoolData = dashboardData?.chartData?.schoolPerformance || {};
  const schoolTabIds = filterOptions.schools.map((s) => s.id).filter(Boolean);
  const schoolData = {};
  schoolTabIds.forEach((id) => {
    schoolData[id] = incomingSchoolData[id] || emptySchoolChart;
  });
  Object.keys(incomingSchoolData).forEach((key) => {
    if (!schoolData[key]) schoolData[key] = incomingSchoolData[key];
  });

  const schoolChartColors = [
    { main: chartColors.blue, light: chartColors.blueLight },
    { main: chartColors.purple, light: chartColors.purpleLight },
    { main: chartColors.green, light: chartColors.greenLight },
    { main: chartColors.red, light: chartColors.redLight },
  ];
  const getSchoolColor = (schoolId, type = 'main') => {
    const idx = Math.max(0, schoolTabIds.indexOf(schoolId));
    const palette = schoolChartColors[idx % schoolChartColors.length];
    return palette[type];
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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-blue-50/30 min-h-screen overflow-x-hidden">
      {/* Header */}
      <div className="mb-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
          {welcomePrefix}, {adminDisplayName}!
        </h1>
        {welcomeSubtitle && (
          <p className="text-sm sm:text-base text-gray-600 mt-1.5 max-w-3xl">
            {welcomeSubtitle}
          </p>
        )}
      </div>

      {/* Filter Section with consistent colors - Only visible to SuperAdmin */}
      {isSuperAdmin && (
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
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

      {/* Overall Campus Stats */}
      <div className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Overall Campus Stats</h2>
        {renderStatCards(stats, isLoading)}
      </div>

      {/* My Stats — overview-style funnel cards */}
      <section className="bg-white rounded-md border border-[#b0c9db] shadow-sm overflow-visible">
        <div className="bg-[#c5d9e8] px-4 py-2 rounded-t-md border border-[#b0c9db] border-b-0">
          <h2 className="text-sm font-semibold text-gray-800">My Stats</h2>
          {!isLoading && (
            <p className="text-xs text-gray-600 mt-0.5 tabular-nums">
              {funnelEligible.toLocaleString()} eligible students in your assigned scope
            </p>
          )}
        </div>
        <div className="relative p-3 bg-[#eef4fa] border border-[#b0c9db] border-t-0 rounded-b-md min-h-[120px]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {funnelStages.map((stage, i) => (
                <FunnelStatCard
                  key={stage.key}
                  stageKey={stage.key}
                  label={stage.label}
                  count={stage.count}
                  pctOfEligible={stage.pctOfEligible}
                  drop={stage.drop}
                  popoverAlign={i >= funnelStages.length - 2 ? 'end' : 'start'}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Currently active drives */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Currently Active Drives</h2>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-700">
                  {['Company', 'Role', 'Applications', 'Shortlisted', 'Interview Date', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold border-b border-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeDrives.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">No active drives in your campus scope</td>
                  </tr>
                ) : (
                  activeDrives.map((drive) => (
                    <tr key={drive.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3 border-b border-gray-100 font-medium text-gray-900">{drive.company}</td>
                      <td className="px-4 py-3 border-b border-gray-100 text-gray-700">{drive.role}</td>
                      <td className="px-4 py-3 border-b border-gray-100 tabular-nums">{drive.applications}</td>
                      <td className="px-4 py-3 border-b border-gray-100 tabular-nums">{drive.shortlisted}</td>
                      <td className="px-4 py-3 border-b border-gray-100 whitespace-nowrap">{formatDriveDate(drive.interviewDate)}</td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {driveStatusLabel(drive.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Admins overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Admins Overview</h2>
        </div>
        <div className="p-4 sm:p-5 bg-[#eef4fa]">
          {loadingAdminOverview ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto my-6 text-blue-600" />
          ) : (
            <div className="flex flex-wrap gap-2.5">
              <CrManagerCard name="JDs Punched" value={adminOverview?.jdsPunched ?? 0} variant="jds" />
              {(adminOverview?.managers || []).map((m, i) => (
                <CrManagerCard
                  key={m.id}
                  name={m.name}
                  value={m.count}
                  breakdown={m.breakdown || []}
                  adminStatusLabel={m.adminStatusLabel}
                  popoverAlign={i >= (adminOverview.managers.length - 2) ? 'end' : 'start'}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Job Opportunities */}
      {isAdminUser && <JobOpportunitiesSection embedded showAdminOverview={false} />}

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
            <div className="flex gap-2 flex-wrap">
              {filterOptions.schools.map((school) => (
                <button
                  key={school.id}
                  onClick={() => setSelectedSchool(school.id)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${
                    selectedSchool === school.id
                      ? 'text-white shadow-sm'
                      : 'text-gray-700 bg-white border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {selectedSchool === school.id && (
                    <div
                      className="absolute inset-0 rounded-xl p-[1.5px] animate-pulse"
                      style={{
                        background: `linear-gradient(to right, ${getSchoolColor(school.id)}, ${getSchoolColor(school.id, 'light')})`,
                      }}
                    >
                      <div
                        className="w-full h-full rounded-lg"
                        style={{ background: getSchoolColor(school.id) }}
                      />
                    </div>
                  )}

                  <span className="relative z-10">{school.code || school.name}</span>

                  {selectedSchool !== school.id && (
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 border"
                      style={{
                        background: getSchoolColor(school.id, 'light'),
                        borderColor: getSchoolColor(school.id),
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