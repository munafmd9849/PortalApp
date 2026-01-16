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

      const response = await api.get(`/recruiter/screening/session?token=${encodeURIComponent(token)}&jobId=${jobId}`);
      
      setSession(response.session);
      setJob(response.job);
      setApplications(response.applications || []);
      setSummary(response.summary || {});

      // Check if screening is finalized (all applications decided)
      const allDecided = (response.applications || []).every(app => {
        const status = app.screeningStatus || 'APPLIED';
        return status !== 'APPLIED' && status !== 'RESUME_SELECTED';
      });
      setFinalized(allDecided && response.applications.length > 0);
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
      });

      // Refresh data
      await fetchScreeningData();
    } catch (err) {
      console.error('Error updating screening status:', err);
      alert(err.response?.data?.error || 'Failed to update screening status');
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Are you sure you want to finalize screening? This will lock all decisions and cannot be undone.')) {
      return;
    }

    try {
      await api.post(`/recruiter/screening/finalize?token=${encodeURIComponent(token)}`, {
        jobId
      });

      setFinalized(true);
      alert('Screening finalized successfully!');
      await fetchScreeningData();
    } catch (err) {
      console.error('Error finalizing screening:', err);
      alert(err.response?.data?.error || 'Failed to finalize screening');
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

  // Check if all applications are decided
  const allDecided = applications.every(app => {
    const status = app.screeningStatus || 'APPLIED';
    return status !== 'APPLIED' && status !== 'RESUME_SELECTED';
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
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.resumeSelected || 0}</div>
            <div className="text-sm text-gray-600">Resume Selected</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{summary.resumeRejected || 0}</div>
            <div className="text-sm text-gray-600">Resume Rejected</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{summary.testSelected || 0}</div>
            <div className="text-sm text-gray-600">Test Selected</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{summary.testRejected || 0}</div>
            <div className="text-sm text-gray-600">Test Rejected</div>
          </div>
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
                <option value="RESUME_SELECTED">Resume Selected</option>
                <option value="RESUME_REJECTED">Resume Rejected</option>
                <option value="TEST_SELECTED">Test Selected</option>
                <option value="TEST_REJECTED">Test Rejected</option>
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Resume Screening</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Test Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Final Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredApplications.map((app) => {
                  const student = app.student || {};
                  const screeningStatus = app.screeningStatus || 'APPLIED';
                  const isResumeSelected = screeningStatus === 'RESUME_SELECTED';
                  const isResumeRejected = screeningStatus === 'RESUME_REJECTED';
                  const isTestSelected = screeningStatus === 'TEST_SELECTED';
                  const isTestRejected = screeningStatus === 'TEST_REJECTED';

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
                          <a
                            href={student.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors text-sm"
                          >
                            <FileText className="w-4 h-4" />
                            View
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">No resume</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {finalized ? (
                          <span className={`px-3 py-1 rounded text-xs font-semibold ${
                            isResumeSelected ? 'bg-green-100 text-green-800' :
                            isResumeRejected ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {screeningStatus === 'RESUME_SELECTED' ? 'Selected' :
                             screeningStatus === 'RESUME_REJECTED' ? 'Rejected' :
                             'Applied'}
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateScreeningStatus(app.id, 'RESUME_SELECTED')}
                              disabled={isResumeSelected || isResumeRejected || isTestSelected || isTestRejected}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                isResumeSelected
                                  ? 'bg-green-100 text-green-800 cursor-not-allowed'
                                  : isResumeRejected || isTestSelected || isTestRejected
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {isResumeSelected ? 'Selected' : 'Select'}
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Please provide rejection reason:');
                                if (reason && reason.trim()) {
                                  updateScreeningStatus(app.id, 'RESUME_REJECTED', reason.trim());
                                }
                              }}
                              disabled={isResumeSelected || isResumeRejected || isTestSelected || isTestRejected}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                isResumeRejected
                                  ? 'bg-red-100 text-red-800 cursor-not-allowed'
                                  : isResumeSelected || isTestSelected || isTestRejected
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-red-600 text-white hover:bg-red-700'
                              }`}
                            >
                              {isResumeRejected ? 'Rejected' : 'Reject'}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {finalized ? (
                          <span className={`px-3 py-1 rounded text-xs font-semibold ${
                            isTestSelected ? 'bg-blue-100 text-blue-800' :
                            isTestRejected ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {screeningStatus === 'TEST_SELECTED' ? 'Passed' :
                             screeningStatus === 'TEST_REJECTED' ? 'Failed' :
                             isResumeSelected ? 'Not Started' : 'N/A'}
                          </span>
                        ) : isResumeSelected ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateScreeningStatus(app.id, 'TEST_SELECTED')}
                              disabled={isTestSelected || isTestRejected}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                isTestSelected
                                  ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
                                  : isTestRejected
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {isTestSelected ? 'Passed' : 'Pass'}
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Please provide test failure reason:');
                                if (reason && reason.trim()) {
                                  updateScreeningStatus(app.id, 'TEST_REJECTED', reason.trim());
                                }
                              }}
                              disabled={isTestSelected || isTestRejected}
                              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                isTestRejected
                                  ? 'bg-orange-100 text-orange-800 cursor-not-allowed'
                                  : isTestSelected
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-orange-600 text-white hover:bg-orange-700'
                              }`}
                            >
                              {isTestRejected ? 'Failed' : 'Fail'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${
                          isTestSelected ? 'bg-green-100 text-green-800' :
                          isTestRejected || isResumeRejected ? 'bg-red-100 text-red-800' :
                          isResumeSelected ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {isTestSelected ? 'Qualified for Interview' :
                           isTestRejected ? 'Rejected in Test' :
                           isResumeRejected ? 'Rejected in Resume Screening' :
                           isResumeSelected ? 'Resume Selected' :
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
