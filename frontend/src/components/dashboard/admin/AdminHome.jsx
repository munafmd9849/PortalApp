import React, { useState, useRef, useEffect } from 'react';
import { PieChart } from 'react-minimal-pie-chart';
import { ChevronDown, Filter, TrendingUp, Users, Briefcase, MessageSquare, Bell, BarChart3, Target, DollarSign, X, Loader2 } from 'lucide-react';
import { FaChevronDown, FaTimes } from 'react-icons/fa';
import { Chart as ChartJS, CategoryScale, LinearScale, RadialLinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Title, Tooltip, Legend } from 'chart.js';
import { Radar, PolarArea, Bar, Doughnut, Line } from 'react-chartjs-2';
import { adminDashboardService } from '../../../services/adminDashboard';
import api from '../../../services/api';
// TODO: Replace Firebase operations with API calls
// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, BarElement, LineElement, PointElement, ArcElement, Filler, Title, Tooltip, Legend);

const CustomDropdown = ({ 
  label, 
  options, 
  selectedValues, 
  onSelectionChange, 
  multiple = false,
  placeholder = "Select options"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (option) => {
    if (multiple) {
      const newSelected = selectedValues.includes(option.id)
        ? selectedValues.filter(id => id !== option.id)
        : [...selectedValues, option.id];
      onSelectionChange(newSelected);
    } else {
      onSelectionChange([option.id]);
      setIsOpen(false);
    }
  };

  const removeOption = (optionId, e) => {
    e.stopPropagation();
    const newSelected = selectedValues.filter(id => id !== optionId);
    onSelectionChange(newSelected);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (!multiple) {
      const selected = options.find(opt => opt.id === selectedValues[0]);
      return selected ? selected.name : placeholder;
    }
    if (selectedValues.length === 1) {
      const selected = options.find(opt => opt.id === selectedValues[0]);
      return selected ? selected.name : placeholder;
    }
    return `${selectedValues.length} selected`;
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-gray-700 font-medium">{label}:</label>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-left flex items-center justify-between transition-all duration-200 ${
            selectedValues.length > 0 
              ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-300' 
              : 'bg-gray-50 border-gray-300'
          } hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
          onClick={() => setIsOpen(prev => !prev)}
        >
          <span className="truncate flex-1">
            {getDisplayText()}
          </span>
          <div className="flex items-center gap-1">
            {multiple && selectedValues.length > 0 && (
              <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {selectedValues.length}
              </span>
            )}
            <FaChevronDown className={`w-3 h-3 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
        
        {isOpen && (
          <div className="absolute z-20 w-full bg-white border-2 border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-left transition-colors duration-150 ${
                    isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                  onClick={() => handleOptionClick(option)}
                >
                  <span>{option.name}</span>
                  {isSelected && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {multiple && selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedValues.map(value => {
            const option = options.find(opt => opt.id === value);
            return option ? (
              <span 
                key={value}
                className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
              >
                {option.name}
                <button
                  type="button"
                  onClick={(e) => removeOption(value, e)}
                  className="hover:text-blue-900 focus:outline-none"
                >
                  <FaTimes className="w-3 h-3" />
                </button>
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};

export default function AdminHome() {
  const [filters, setFilters] = useState({ campus: [], school: [], batch: [], admin: [] });
  const [showCampusDropdown, setShowCampusDropdown] = useState(false);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState('SOT');

  const campusDropdownRef = useRef(null);
  const schoolDropdownRef = useRef(null);
  const batchDropdownRef = useRef(null);
  const adminDropdownRef = useRef(null);

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
      center: uiFilters.campus || [], // campus -> center
      school: uiFilters.school || [],
      quarter: uiFilters.batch?.map(batch => {
        // Map batch years to quarters
        switch(batch) {
          case '25-29': return 'Q1 (Pre-Placement)';
          case '24-28': return 'Q2 (Placement Drive)';
          case '23-27': return 'Q3 (Internship)';
          default: return 'Q4 (Final Placements)';
        }
      }) || []
    };
  };

  // Handle dropdown clicks outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (campusDropdownRef.current && !campusDropdownRef.current.contains(event.target)) setShowCampusDropdown(false);
      if (schoolDropdownRef.current && !schoolDropdownRef.current.contains(event.target)) setShowSchoolDropdown(false);
      if (batchDropdownRef.current && !batchDropdownRef.current.contains(event.target)) setShowBatchDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  const handleFilterChange = (filterType, values) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: values
    }));
  };

  const removeFilter = (filterType, value) => setFilters(prev => ({ ...prev, [filterType]: prev[filterType].filter(i => i !== value) }));
  const clearAllFilters = () => setFilters({ campus: [], school: [], batch: [] });

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
        { title: 'Total', value: Math.max(dashboardData.stats.activeStudents, 1), color: '#dcfce7' } 
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
        <div className="flex items-center bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300">
          <div className="relative">
            <Filter className="w-5 h-5 mr-2" style={{ color: chartColors.blue }} />
          </div>
          <span className="text-sm font-semibold" style={{ background: `linear-gradient(to right, ${chartColors.blue}, ${chartColors.purple})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Filters Applied: {Object.values(filters).flat().length}
          </span>
        </div>
        
      </div>

      {/* Filter Section with consistent colors */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Filter className="w-5 h-5 mr-2" style={{ color: chartColors.blue }} />
          Filter Dashboard
        </h2>

        {(filters.campus.length > 0 || filters.school.length > 0 || filters.batch.length > 0 || filters.admin.length > 0) && (
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.campus.map(c => {
              const campusOption = filterOptions.campuses.find(option => option.id === c);
              return (
                <span key={c} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: chartColors.blueLight, borderColor: chartColors.blue, color: chartColors.blue }}>
                  Campus: {campusOption?.name || c}
                  <button onClick={() => removeFilter('campus', c)} className="ml-1 hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {filters.school.map(s => {
              const schoolOption = filterOptions.schools.find(option => option.id === s);
              return (
                <span key={s} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: chartColors.greenLight, borderColor: chartColors.green, color: chartColors.green }}>
                  School: {schoolOption?.name || s}
                  <button onClick={() => removeFilter('school', s)} className="ml-1 hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {filters.batch.map(b => {
              const batchOption = filterOptions.batches.find(option => option.id === b);
              return (
                <span key={b} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: chartColors.purpleLight, borderColor: chartColors.purple, color: chartColors.purple }}>
                  Batch: {batchOption?.name || b}
                  <button onClick={() => removeFilter('batch', b)} className="ml-1 hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {filters.admin.map(a => {
              const adminOption = filterOptions.admins.find(option => option.id === a);
              return (
                <span key={a} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: chartColors.redLight, borderColor: chartColors.red, color: chartColors.red }}>
                  Admin: {adminOption?.name || a}
                  <button onClick={() => removeFilter('admin', a)} className="ml-1 hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            <button onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-gray-700 underline">Clear all</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['campus', 'school', 'batch', 'admin'].map((type, index) => (
            <div key={type} className="flex flex-col gap-1">
              <label className="text-sm text-gray-700 font-medium capitalize">{type}:</label>
              <div className="relative" ref={[campusDropdownRef, schoolDropdownRef, batchDropdownRef, adminDropdownRef][index]}>
                <button 
                  type="button" 
                  className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-left flex items-center justify-between bg-white hover:bg-gray-50 transition-colors ${
                    filters[type].length > 0 ? 'border-blue-300 bg-blue-50' : ''
                  }`}
                  onClick={() => [setShowCampusDropdown, setShowSchoolDropdown, setShowBatchDropdown, setShowAdminDropdown][index](p => !p)}
                >
                  <span className="truncate">
                    {filters[type].length > 0 ? `${filters[type].length} selected` : `Select ${type}s`}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                </button>
                {[showCampusDropdown, showSchoolDropdown, showBatchDropdown, showAdminDropdown][index] && (
                  <div className="absolute z-10 overflow-y-auto max-h-60 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                    {(type === 'campus' ? filterOptions.campuses : type === 'school' ? filterOptions.schools : type === 'batch' ? filterOptions.batches : filterOptions.admins).map((option, i) => (
                      <button
                        key={i}
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 cursor-pointer text-left border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          const currentValues = filters[type] || [];
                          const newValues = currentValues.includes(option.id)
                            ? currentValues.filter(id => id !== option.id)
                            : [...currentValues, option.id];
                          handleFilterChange(type, newValues);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={filters[type].includes(option.id)}
                          onChange={() => {}}
                          className="rounded"
                          style={{ color: chartColors.blue }}
                        />
                        <span className="text-gray-700">{option.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

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
                    {dashboardData.stats.activeStudents} active students, {dashboardData.stats.totalApplications} applications
                  </p>
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