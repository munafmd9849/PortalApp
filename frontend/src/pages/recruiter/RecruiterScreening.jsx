/**
 * Recruiter Screening Page
 * Token-based access (no login required)
 * Pre-interview screening: RESUME_SHORTLIST and QA_TEST stages
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  FileText, Download, CheckCircle, XCircle, Clock, 
  Users, Filter, Search, AlertCircle, Lock, Mail, Building2,
  Eye, ExternalLink, Calendar, Sparkles, Shield, Award, TrendingUp
} from 'lucide-react';
import api from '../../services/api';
import { API_BASE_URL } from '../../config/api';
import { showSuccess, showError, showWarning, showLoading, replaceLoadingToast, dismissToast } from '../../utils/toast';
import CustomDropdown from '../../components/common/CustomDropdown';

const RecruiterScreening = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const jobId = searchParams.get('jobId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState(null);
  const [finalized, setFinalized] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch screening session data
  useEffect(() => {
    if (!token || !jobId) {
      setError('Invalid access. Token and Job ID are required.');
      setLoading(false);
      return;
    }

    fetchScreeningData();
  }, [token, jobId]);

  const fetchScreeningData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await api.get(`/recruiter/screening/session?token=${encodeURIComponent(token)}&jobId=${jobId}`);
      
      setSession(data?.session || null);
      setJob(data?.job || null);
      setApplications(data?.applications || []);
      setSummary(data?.summary || {});

      const job = data?.job || {};
      const requiresScreening = job.requiresScreening || false;
      const requiresTest = job.requiresTest || false;
      
      const allDecided = (data?.applications || []).every(app => {
        const status = app.screeningStatus || 'APPLIED';
        
        if (requiresScreening && requiresTest) {
          return status === 'INTERVIEW_ELIGIBLE' || status === 'SCREENING_REJECTED' || status === 'TEST_REJECTED';
        }
        if (requiresScreening && !requiresTest) {
          return status === 'INTERVIEW_ELIGIBLE' || status === 'SCREENING_REJECTED';
        }
        if (!requiresScreening && requiresTest) {
          return status === 'INTERVIEW_ELIGIBLE' || status === 'TEST_REJECTED';
        }
        return true;
      });
      setFinalized(allDecided && (data?.applications || []).length > 0);
    } catch (err) {
      console.error('Error fetching screening data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load screening data');
    } finally {
      setLoading(false);
    }
  };

  const updateScreeningStatus = async (applicationId, newStatus, remarks = '') => {
    try {
      await api.patch(`/recruiter/screening/application/${applicationId}?token=${encodeURIComponent(token)}`, {
        screeningStatus: newStatus,
        screeningRemarks: remarks || null
      }, { silent: true });

      const statusMessages = {
        'SCREENING_SELECTED': 'Resume selected successfully',
        'SCREENING_REJECTED': 'Resume rejected',
        'TEST_SELECTED': 'Candidate passed the test',
        'TEST_REJECTED': 'Candidate failed the test',
        'INTERVIEW_ELIGIBLE': 'Candidate qualified for interview'
      };
      showSuccess(statusMessages[newStatus] || 'Screening decision saved');
      await fetchScreeningData();
    } catch (err) {
      console.error('Error updating screening status:', err);
      showError(err.response?.data?.error || err.response?.data?.message || 'Failed to save screening decision. Please try again.');
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Are you sure you want to finalize screening? This will lock all decisions and cannot be undone.')) {
      return;
    }

    let loadingToastId = null;
    try {
      loadingToastId = showLoading('Finalizing screening...');
      
      await api.post(`/recruiter/screening/finalize?token=${encodeURIComponent(token)}`, {
        jobId
      }, { silent: true });

      setFinalized(true);
      replaceLoadingToast(loadingToastId, 'success', 'Screening finalized successfully! All decisions are now locked.');
      await fetchScreeningData();
    } catch (err) {
      console.error('Error finalizing screening:', err);
      if (loadingToastId) {
        dismissToast(loadingToastId);
      }
      showError(err.response?.data?.error || err.response?.data?.message || 'Failed to finalize screening. Please ensure all candidates have been decided.');
    }
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    if (filterStatus && app.screeningStatus !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const student = app.student || {};
      return (
        (student.fullName || '').toLowerCase().includes(term) ||
        (student.email || '').toLowerCase().includes(term) ||
        (student.enrollmentId || '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  const requiresScreening = job?.requiresScreening || false;
  const requiresTest = job?.requiresTest || false;

  const allDecided = applications.every(app => {
    const status = app.screeningStatus || 'APPLIED';
    
    if (requiresScreening && requiresTest) {
      return status === 'INTERVIEW_ELIGIBLE' || status === 'SCREENING_REJECTED' || status === 'TEST_REJECTED';
    }
    if (requiresScreening && !requiresTest) {
      return status === 'INTERVIEW_ELIGIBLE' || status === 'SCREENING_REJECTED';
    }
    if (!requiresScreening && requiresTest) {
      return status === 'INTERVIEW_ELIGIBLE' || status === 'TEST_REJECTED';
    }
    return true;
  });

  // Status badge component
  const StatusBadge = ({ status, text }) => {
    const statusConfig = {
      'APPLIED': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: '◉' },
      'SCREENING_SELECTED': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✓' },
      'SCREENING_REJECTED': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: '✕' },
      'TEST_SELECTED': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '✓' },
      'TEST_REJECTED': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: '✕' },
      'INTERVIEW_ELIGIBLE': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: '🎯' },
    };
    const config = statusConfig[status] || statusConfig['APPLIED'];
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
        <span>{config.icon}</span>
        {text || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading screening data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
          <div className="text-red-600 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Access Error</h2>
            <p className="mb-6 text-gray-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!job || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No screening data available</p>
        </div>
      </div>
    );
  }

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'APPLIED', label: 'Applied' },
    ...(requiresScreening ? [
      { value: 'SCREENING_SELECTED', label: 'Screening Selected' },
      { value: 'SCREENING_REJECTED', label: 'Screening Rejected' }
    ] : []),
    ...(requiresTest ? [
      { value: 'TEST_SELECTED', label: 'Test Passed' },
      { value: 'TEST_REJECTED', label: 'Test Failed' }
    ] : []),
    { value: 'INTERVIEW_ELIGIBLE', label: 'Interview Eligible' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{job.jobTitle}</h1>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span className="font-medium">{job.companyName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Mail className="w-4 h-4" />
                      <span>{job.recruiterEmail}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl px-4 py-3 border border-indigo-200">
              <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wider mb-1">Token Expires</div>
              <div className="flex items-center gap-2 text-indigo-900 font-bold">
                <Calendar className="w-4 h-4" />
                {session.expiresAt ? new Date(session.expiresAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Enhanced Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border-2 border-indigo-200 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 bg-indigo-500 rounded-xl shadow-md">
                <Users className="w-6 h-6 text-white" />
              </div>
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-3xl font-black text-indigo-900 mb-1">{summary.total || 0}</div>
            <div className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">Total Applied</div>
          </div>
          
          {requiresScreening && (
            <>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border-2 border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-emerald-500 rounded-xl shadow-md">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-3xl font-black text-emerald-900 mb-1">{summary.screeningSelected || summary.resumeSelected || 0}</div>
                <div className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Screening Selected</div>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-6 border-2 border-rose-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-rose-500 rounded-xl shadow-md">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-rose-400" />
                </div>
                <div className="text-3xl font-black text-rose-900 mb-1">{summary.screeningRejected || summary.resumeRejected || 0}</div>
                <div className="text-sm font-semibold text-rose-700 uppercase tracking-wide">Screening Rejected</div>
              </div>
            </>
          )}
          
          {requiresTest && (
            <>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-blue-500 rounded-xl shadow-md">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-3xl font-black text-blue-900 mb-1">{summary.testSelected || 0}</div>
                <div className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Test Passed</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-orange-500 rounded-xl shadow-md">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-3xl font-black text-orange-900 mb-1">{summary.testRejected || 0}</div>
                <div className="text-sm font-semibold text-orange-700 uppercase tracking-wide">Test Failed</div>
              </div>
            </>
          )}
        </div>

        {/* Enhanced Filters and Actions */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 mb-6 relative z-10">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 flex-1 w-full">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or enrollment ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white text-gray-900 font-medium"
                />
              </div>
              <CustomDropdown
                options={statusOptions}
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder="All Status"
              />
            </div>
            {!finalized && allDecided && (
              <button
                onClick={handleFinalize}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all duration-200 font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <CheckCircle className="w-5 h-5" />
                Finalize Screening
              </button>
            )}
            {finalized && (
              <div className="px-6 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg font-semibold flex items-center gap-2 border-2 border-gray-300">
                <Lock className="w-5 h-5" />
                Screening Finalized
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Applications Table */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-200">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              <Users className="w-6 h-6 text-indigo-600" />
              Applications ({filteredApplications.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="border-b-2 border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Enrollment ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Resume</th>
                  {requiresScreening && (
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Resume Screening</th>
                  )}
                  {requiresTest && (
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">QA / Test Status</th>
                  )}
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Final Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplications.map((app) => {
                  const student = app.student || {};
                  const screeningStatus = app.screeningStatus || 'APPLIED';
                  const isScreeningSelected = screeningStatus === 'SCREENING_SELECTED';
                  const isScreeningRejected = screeningStatus === 'SCREENING_REJECTED';
                  const isTestSelected = screeningStatus === 'TEST_SELECTED';
                  const isTestRejected = screeningStatus === 'TEST_REJECTED';
                  const isInterviewEligible = screeningStatus === 'INTERVIEW_ELIGIBLE';

                  return (
                    <tr key={app.id} className="hover:bg-indigo-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {(student.fullName || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{student.fullName || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{student.batch || ''} • {student.center || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <a href={`mailto:${student.email}`} className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline">
                          {student.email || 'N/A'}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">{student.enrollmentId || 'N/A'}</td>
                      <td className="px-6 py-4">
                        {student.resumeUrl ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                try {
                                  const viewUrl = `${API_BASE_URL}/recruiter/screening/resume/${app.id}?token=${encodeURIComponent(token)}&jobId=${encodeURIComponent(jobId)}`;
                                  const pdfWindow = window.open(viewUrl, '_blank');
                                  if (!pdfWindow) {
                                    window.location.href = viewUrl;
                                  } else {
                                    pdfWindow.focus();
                                  }
                                } catch (error) {
                                  console.error('Error opening resume:', error);
                                  showError('Failed to open resume. Please try downloading it instead.');
                                }
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium shadow-sm"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                            <button
                              onClick={() => {
                                try {
                                  const link = document.createElement('a');
                                  link.href = student.resumeUrl;
                                  link.download = student.resumeFileName || 'resume.pdf';
                                  link.target = '_blank';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  showSuccess('Resume download started');
                                } catch (error) {
                                  console.error('Error downloading resume:', error);
                                  showError('Failed to download resume. Please try viewing it instead.');
                                }
                              }}
                              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                              title="Download resume"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm font-medium">No resume</span>
                        )}
                      </td>
                      {requiresScreening && (
                        <td className="px-6 py-4">
                          {finalized ? (
                            <StatusBadge 
                              status={screeningStatus === 'SCREENING_SELECTED' ? 'SCREENING_SELECTED' : screeningStatus === 'SCREENING_REJECTED' ? 'SCREENING_REJECTED' : 'APPLIED'}
                              text={screeningStatus === 'SCREENING_SELECTED' ? 'Selected' : screeningStatus === 'SCREENING_REJECTED' ? 'Rejected' : 'Applied'}
                            />
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateScreeningStatus(app.id, 'SCREENING_SELECTED')}
                                disabled={isScreeningSelected || isScreeningRejected || isInterviewEligible}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                  isScreeningSelected
                                    ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed border border-emerald-200'
                                    : isScreeningRejected || isInterviewEligible
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg transform hover:scale-105'
                                }`}
                              >
                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                {isScreeningSelected ? 'Selected' : 'Select'}
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Please provide rejection reason:');
                                  if (reason && reason.trim()) {
                                    updateScreeningStatus(app.id, 'SCREENING_REJECTED', reason.trim());
                                  }
                                }}
                                disabled={isScreeningSelected || isScreeningRejected || isInterviewEligible}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                  isScreeningRejected
                                    ? 'bg-rose-100 text-rose-700 cursor-not-allowed border border-rose-200'
                                    : isScreeningSelected || isInterviewEligible
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-rose-600 text-white hover:bg-rose-700 shadow-md hover:shadow-lg transform hover:scale-105'
                                }`}
                              >
                                <XCircle className="w-4 h-4 inline mr-1" />
                                {isScreeningRejected ? 'Rejected' : 'Reject'}
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                      {requiresTest && (
                        <td className="px-6 py-4">
                          {finalized ? (
                            <StatusBadge 
                              status={isInterviewEligible ? 'TEST_SELECTED' : isTestRejected ? 'TEST_REJECTED' : 'APPLIED'}
                              text={isInterviewEligible ? 'Passed' : isTestRejected ? 'Failed' : requiresScreening && isScreeningSelected ? 'Pending' : 'Not Started'}
                            />
                          ) : (requiresScreening ? isScreeningSelected : true) ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateScreeningStatus(app.id, 'TEST_SELECTED')}
                                disabled={isInterviewEligible || isTestRejected || (requiresScreening && !isScreeningSelected)}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                  isInterviewEligible
                                    ? 'bg-blue-100 text-blue-700 cursor-not-allowed border border-blue-200'
                                    : isTestRejected
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : (requiresScreening && !isScreeningSelected)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:scale-105'
                                }`}
                                title={requiresScreening && !isScreeningSelected ? 'Complete resume screening first' : 'Mark test as passed'}
                              >
                                <Award className="w-4 h-4 inline mr-1" />
                                {isInterviewEligible ? 'Passed' : 'Pass'}
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Please provide test failure reason:');
                                  if (reason && reason.trim()) {
                                    updateScreeningStatus(app.id, 'TEST_REJECTED', reason.trim());
                                  }
                                }}
                                disabled={isInterviewEligible || isTestRejected || (requiresScreening && !isScreeningSelected)}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                  isTestRejected
                                    ? 'bg-orange-100 text-orange-700 cursor-not-allowed border border-orange-200'
                                    : isInterviewEligible
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : (requiresScreening && !isScreeningSelected)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg transform hover:scale-105'
                                }`}
                                title={requiresScreening && !isScreeningSelected ? 'Complete resume screening first' : 'Mark test as failed'}
                              >
                                <XCircle className="w-4 h-4 inline mr-1" />
                                {isTestRejected ? 'Failed' : 'Fail'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm font-medium">Complete screening first</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div>
                          <StatusBadge 
                            status={
                              isInterviewEligible ? 'INTERVIEW_ELIGIBLE' :
                              isTestRejected ? 'TEST_REJECTED' :
                              isScreeningRejected ? 'SCREENING_REJECTED' :
                              isScreeningSelected && !requiresTest ? 'INTERVIEW_ELIGIBLE' :
                              isScreeningSelected ? 'SCREENING_SELECTED' :
                              'APPLIED'
                            }
                            text={
                              isInterviewEligible ? 'Qualified for Interview' :
                              isTestRejected ? 'Rejected in QA/Test' :
                              isScreeningRejected ? 'Rejected in Screening' :
                              isScreeningSelected && !requiresTest ? 'Qualified for Interview' :
                              isScreeningSelected ? 'Screening Selected' :
                              'Applied'
                            }
                          />
                          {app.screeningRemarks && (
                            <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                              <span className="font-medium">Remarks:</span> {app.screeningRemarks}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredApplications.length === 0 && (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium text-lg">No applications found</p>
                <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterScreening;
