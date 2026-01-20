/**
 * Recruiter Screening Page
 * Token-based access (no login required)
 * Pre-interview screening: RESUME_SHORTLIST and QA_TEST stages
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  FileText, Download, CheckCircle, XCircle, Clock, 
  Users, Filter, Search, AlertCircle, Lock, Mail, Building2
} from 'lucide-react';
import api from '../../services/api';
import { showSuccess, showError, showWarning, showLoading, replaceLoadingToast, dismissToast } from '../../utils/toast';

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

      // NOTE: our API client returns `{ data }` for `api.get`
      const { data } = await api.get(`/recruiter/screening/session?token=${encodeURIComponent(token)}&jobId=${jobId}`);
      
      setSession(data?.session || null);
      setJob(data?.job || null);
      setApplications(data?.applications || []);
      setSummary(data?.summary || {});

      // Check if screening is finalized (all applications decided based on requirements)
      const job = data?.job || {};
      const requiresScreening = job.requiresScreening || false;
      const requiresTest = job.requiresTest || false;
      
      const allDecided = (data?.applications || []).every(app => {
        const status = app.screeningStatus || 'APPLIED';
        
        // If both required: must reach INTERVIEW_ELIGIBLE or be rejected
        if (requiresScreening && requiresTest) {
          return status === 'INTERVIEW_ELIGIBLE' || status === 'SCREENING_REJECTED' || status === 'TEST_REJECTED';
        }
        // If only screening required: must be SCREENING_SELECTED/INTERVIEW_ELIGIBLE or rejected
        if (requiresScreening && !requiresTest) {
          return status === 'INTERVIEW_ELIGIBLE' || status === 'SCREENING_REJECTED';
        }
        // If only test required: must reach INTERVIEW_ELIGIBLE or be rejected
        if (!requiresScreening && requiresTest) {
          return status === 'INTERVIEW_ELIGIBLE' || status === 'TEST_REJECTED';
        }
        // If neither required: all are eligible
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
      }, { silent: true }); // Silent to show custom message

      // Show success message based on action
      const statusMessages = {
        'SCREENING_SELECTED': 'Resume selected successfully',
        'SCREENING_REJECTED': 'Resume rejected',
        'TEST_SELECTED': 'Candidate passed the test',
        'TEST_REJECTED': 'Candidate failed the test',
        'INTERVIEW_ELIGIBLE': 'Candidate qualified for interview'
      };
      showSuccess(statusMessages[newStatus] || 'Screening decision saved');

      // Refresh data
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
      }, { silent: true }); // Silent to show custom message

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

  // Check if all applications are decided based on requirements
  const allDecided = applications.every(app => {
    const status = app.screeningStatus || 'APPLIED';
    
    // If both required: must reach INTERVIEW_ELIGIBLE or be rejected
    if (requiresScreening && requiresTest) {
      return status === 'INTERVIEW_ELIGIBLE' || status === 'SCREENING_REJECTED' || status === 'TEST_REJECTED';
    }
    // If only screening required: must be INTERVIEW_ELIGIBLE or rejected
    if (requiresScreening && !requiresTest) {
      return status === 'INTERVIEW_ELIGIBLE' || status === 'SCREENING_REJECTED';
    }
    // If only test required: must reach INTERVIEW_ELIGIBLE or be rejected
    if (!requiresScreening && requiresTest) {
      return status === 'INTERVIEW_ELIGIBLE' || status === 'TEST_REJECTED';
    }
    // If neither required: all are eligible
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading screening data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-red-600 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Error</h2>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No screening data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{job.jobTitle}</h1>
              <p className="text-gray-600 flex items-center gap-2 mt-1">
                <Building2 className="w-4 h-4" />
                {job.companyName}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {job.recruiterEmail}
              </div>
              {session.expiresAt && (
                <div className="mt-1 text-xs">
                  Token expires: {new Date(session.expiresAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{summary.total || 0}</div>
            <div className="text-sm text-gray-600">Total Applied</div>
          </div>
          {requiresScreening && (
            <>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{summary.screeningSelected || summary.resumeSelected || 0}</div>
                <div className="text-sm text-gray-600">Screening Selected</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{summary.screeningRejected || summary.resumeRejected || 0}</div>
                <div className="text-sm text-gray-600">Screening Rejected</div>
              </div>
            </>
          )}
          {requiresTest && (
            <>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.testSelected || 0}</div>
                <div className="text-sm text-gray-600">Test Passed</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{summary.testRejected || 0}</div>
                <div className="text-sm text-gray-600">Test Failed</div>
              </div>
            </>
          )}
          {(requiresScreening && requiresTest) && (
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{summary.interviewEligible || 0}</div>
              <div className="text-sm text-gray-600">Interview Eligible</div>
            </div>
          )}
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or enrollment ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="APPLIED">Applied</option>
                {requiresScreening && (
                  <>
                    <option value="SCREENING_SELECTED">Screening Selected</option>
                    <option value="SCREENING_REJECTED">Screening Rejected</option>
                  </>
                )}
                {requiresTest && (
                  <>
                    <option value="TEST_SELECTED">Test Passed</option>
                    <option value="TEST_REJECTED">Test Failed</option>
                  </>
                )}
                <option value="INTERVIEW_ELIGIBLE">Interview Eligible</option>
              </select>
            </div>
            {!finalized && allDecided && (
              <button
                onClick={handleFinalize}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Finalize Screening
              </button>
            )}
            {finalized && (
              <div className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Screening Finalized
              </div>
            )}
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Applications ({filteredApplications.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Enrollment ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Resume</th>
                  {requiresScreening && (
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Resume Screening</th>
                  )}
                  {requiresTest && (
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">QA / Test Status</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Final Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredApplications.map((app) => {
                  const student = app.student || {};
                  const screeningStatus = app.screeningStatus || 'APPLIED';
                  const isScreeningSelected = screeningStatus === 'SCREENING_SELECTED';
                  const isScreeningRejected = screeningStatus === 'SCREENING_REJECTED';
                  const isTestSelected = screeningStatus === 'TEST_SELECTED';
                  const isTestRejected = screeningStatus === 'TEST_REJECTED';
                  const isInterviewEligible = screeningStatus === 'INTERVIEW_ELIGIBLE';

                  return (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{student.fullName || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{student.batch || ''} • {student.center || ''}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{student.email || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{student.enrollmentId || 'N/A'}</td>
                      <td className="px-6 py-4">
                        {student.resumeUrl ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                try {
                                  // Open PDF in new window/tab for inline viewing
                                  const pdfWindow = window.open(student.resumeUrl, '_blank');
                                  if (!pdfWindow) {
                                    // Popup blocked - fallback to direct navigation
                                    window.location.href = student.resumeUrl;
                                  } else {
                                    pdfWindow.focus();
                                  }
                                } catch (error) {
                                  console.error('Error opening resume:', error);
                                  showError('Failed to open resume. Please try downloading it instead.');
                                }
                              }}
                              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors text-sm"
                            >
                              <FileText className="w-4 h-4" />
                              View
                            </button>
                            <button
                              onClick={() => {
                                try {
                                  // Download resume file
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
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-xs"
                              title="Download resume"
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No resume</span>
                        )}
                      </td>
                      {requiresScreening && (
                        <td className="px-6 py-4">
                          {finalized ? (
                            <span className={`px-3 py-1 rounded text-xs font-semibold ${
                              isScreeningSelected ? 'bg-green-100 text-green-800' :
                              isScreeningRejected ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {screeningStatus === 'SCREENING_SELECTED' ? 'Selected' :
                               screeningStatus === 'SCREENING_REJECTED' ? 'Rejected' :
                               'Applied'}
                            </span>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateScreeningStatus(app.id, 'SCREENING_SELECTED')}
                                disabled={isScreeningSelected || isScreeningRejected || isInterviewEligible}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  isScreeningSelected
                                    ? 'bg-green-100 text-green-800 cursor-not-allowed'
                                    : isScreeningRejected || isInterviewEligible
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              >
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
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  isScreeningRejected
                                    ? 'bg-red-100 text-red-800 cursor-not-allowed'
                                    : isScreeningSelected || isInterviewEligible
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                              >
                                {isScreeningRejected ? 'Rejected' : 'Reject'}
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                      {requiresTest && (
                        <td className="px-6 py-4">
                          {finalized ? (
                            <span className={`px-3 py-1 rounded text-xs font-semibold ${
                              isInterviewEligible ? 'bg-purple-100 text-purple-800' :
                              isTestRejected ? 'bg-orange-100 text-orange-800' :
                              isScreeningSelected ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {isInterviewEligible ? 'Passed' :
                               isTestRejected ? 'Failed' :
                               requiresScreening && isScreeningSelected ? 'Pending' :
                               'Not Started'}
                            </span>
                          ) : (requiresScreening ? isScreeningSelected : true) ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateScreeningStatus(app.id, 'TEST_SELECTED')}
                                disabled={isInterviewEligible || isTestRejected || (requiresScreening && !isScreeningSelected)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  isInterviewEligible
                                    ? 'bg-purple-100 text-purple-800 cursor-not-allowed'
                                    : isTestRejected
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : (requiresScreening && !isScreeningSelected)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                                title={requiresScreening && !isScreeningSelected ? 'Complete resume screening first' : 'Mark test as passed'}
                              >
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
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  isTestRejected
                                    ? 'bg-orange-100 text-orange-800 cursor-not-allowed'
                                    : isInterviewEligible
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : (requiresScreening && !isScreeningSelected)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-orange-600 text-white hover:bg-orange-700'
                                }`}
                                title={requiresScreening && !isScreeningSelected ? 'Complete resume screening first' : 'Mark test as failed'}
                              >
                                {isTestRejected ? 'Failed' : 'Fail'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Complete screening first</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${
                          isInterviewEligible ? 'bg-green-100 text-green-800' :
                          isTestRejected || isScreeningRejected ? 'bg-red-100 text-red-800' :
                          isScreeningSelected && !requiresTest ? 'bg-green-100 text-green-800' :
                          isScreeningSelected ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {isInterviewEligible ? 'Qualified for Interview' :
                           isTestRejected ? 'Rejected in QA/Test' :
                           isScreeningRejected ? 'Rejected in Screening' :
                           isScreeningSelected && !requiresTest ? 'Qualified for Interview' :
                           isScreeningSelected ? 'Screening Selected' :
                           'Applied'}
                        </span>
                        {app.screeningRemarks && (
                          <div className="mt-1 text-xs text-gray-500">
                            {app.screeningRemarks}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredApplications.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No applications found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterScreening;
