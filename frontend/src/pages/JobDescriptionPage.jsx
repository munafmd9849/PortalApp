/**
 * Job Description Page
 * Separate page for viewing job descriptions (converted from modal)
 */

import React, { useState, useCallback, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, FileText, FilePlus, X, CheckCircle } from 'lucide-react';
import { useJobDetails } from '../hooks/useJobDetails';
import { useAuth } from '../hooks/useAuth';
import { applyToJob } from '../services/applications';
import { getStudentProfile } from '../services/students';
import api from '../services/api';
import { showSuccess, showError } from '../utils/toast';
import JobDescriptionSkeleton from '../components/dashboard/student/JobDescriptionSkeleton';
import { FaRedo } from 'react-icons/fa';

// Lazy load JobContent for code splitting
const JobContent = lazy(() => import('../components/dashboard/student/JobContent'));

const isDeadlinePassed = (job) => {
  if (!job) return false;
  const deadline = job.applicationDeadline || job.deadline || job.driveDate;
  if (!deadline) return false;
  return new Date() > new Date(deadline);
};

const meetsCgpaRequirement = (job, cgpa) => {
  const jobMinCgpa = job?.minCgpa || job?.cgpaRequirement;
  if (!jobMinCgpa || !cgpa) return true;

  const studentCgpa = parseFloat(String(cgpa).trim());
  if (isNaN(studentCgpa)) return true;

  const requirementStr = String(jobMinCgpa).trim();
  let requiredCgpa = null;
  if (requirementStr.endsWith('%')) {
    const percentage = parseFloat(requirementStr.slice(0, -1));
    if (!isNaN(percentage)) requiredCgpa = percentage / 10;
  } else {
    requiredCgpa = parseFloat(requirementStr);
  }
  if (isNaN(requiredCgpa)) return true;
  return studentCgpa >= requiredCgpa;
};

const meetsYopRequirement = (job, batch) => {
  const jobYop = job?.yop;
  if (!jobYop || !batch) return true;

  const jobYopInt = parseInt(String(jobYop).trim(), 10);
  if (Number.isNaN(jobYopInt)) return true;

  const parts = String(batch).split('-').map((p) => p.trim()).filter(Boolean);
  const endPart = parts.length > 1 ? parts[1] : parts[0];
  const endNum = endPart ? parseInt(endPart, 10) : NaN;
  if (Number.isNaN(endNum)) return true;

  const studentYop = endNum < 100 ? 2000 + endNum : endNum;
  return studentYop <= jobYopInt;
};

const JobDescriptionPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [pendingJob, setPendingJob] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [applying, setApplying] = useState(false);

  // Fetch job details
  const { job: jobDetails, loading, error, refetch } = useJobDetails(
    jobId || null,
    null,
    !!jobId
  );

  const displayJob = jobDetails;

  const loadResumes = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingResumes(true);
      const data = await api.getResumes();
      setResumes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading resumes:', err);
      setResumes([]);
    } finally {
      setLoadingResumes(false);
    }
  }, [user?.id]);

  const handleApply = useCallback(async (job) => {
    if (!job?.id) return;

    if (!user) {
      navigate(`/login?redirect=/job/${job.id}`);
      return;
    }

    const roleLower = (role || '').toLowerCase();
    if (roleLower !== 'student') {
      showError('Only students can apply to jobs. Please log in with a student account.');
      return;
    }

    if (isDeadlinePassed(job)) {
      const deadline = job.applicationDeadline || job.deadline || job.driveDate;
      showError(`Application deadline has passed. The deadline was ${deadline ? new Date(deadline).toLocaleString() : 'the deadline'}.`);
      return;
    }

    // Validate eligibility (CGPA, YOP)
    try {
      const profile = await getStudentProfile(user.id);
      const cgpa = profile?.cgpa != null ? String(profile.cgpa).trim() : '';
      const batch = profile?.batch || '';

      if (!meetsCgpaRequirement(job, cgpa) || !meetsYopRequirement(job, batch)) {
        showError('Eligibility criteria not met', 'E');
        return;
      }
    } catch (err) {
      console.error('Error checking eligibility:', err);
      // On profile fetch error, allow proceed (backend will validate)
    }

    setPendingJob(job);
    await loadResumes();
    setIsResumeModalOpen(true);
  }, [user, role, navigate, loadResumes]);

  const handleResumeSelection = useCallback(async (resumeId = null) => {
    if (!pendingJob || !user?.id) return;

    setIsResumeModalOpen(false);
    setApplying(true);

    try {
      const companyId = pendingJob.companyId || pendingJob.company?.id || null;
      await applyToJob(user.id, pendingJob.id, { companyId, resumeId });
      showSuccess(`Successfully applied to ${pendingJob.jobTitle} at ${pendingJob.company?.name || pendingJob.companyName || 'the company'}!`);
      setPendingJob(null);
      navigate('/student?tab=applications', { replace: true });
    } catch (err) {
      const errData = err.response?.data || {};
      const errMsg = errData.error || errData.message || err.message;
      if (errMsg === 'Already applied to this job') {
        showError('You have already applied to this job.');
        navigate('/student?tab=applications', { replace: true });
      } else if (
        errMsg === 'CGPA requirement not met' || errMsg === 'CGPA requirement check failed' ||
        String(errMsg || '').toLowerCase().includes('eligibility') ||
        String(errData.error || '').toLowerCase().includes('eligibility')
      ) {
        showError('Eligibility criteria not met', 'E');
      } else {
        showError(errMsg || 'Failed to apply. Please try again.');
      }
    } finally {
      setApplying(false);
    }
  }, [pendingJob, user?.id, navigate]);

  const handleCreateResume = useCallback(() => {
    setIsResumeModalOpen(false);
    setPendingJob(null);
    navigate('/student?tab=resume', { replace: true });
  }, [navigate]);

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  if (!jobId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Job Selected</h2>
          <p className="text-gray-600 mb-6">Please select a job to view its description.</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header with Back Button */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Job Description</h1>
              {displayJob && (
                <p className="text-sm text-gray-600 mt-1">
                  {displayJob.jobTitle} • {displayJob.company?.name || displayJob.companyName}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <JobDescriptionSkeleton />
          </div>
        )}

        {/* Error State */}
        {error && !loading && !displayJob && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500 via-pink-500 to-red-600 flex items-center justify-center shadow-2xl">
                <span className="text-white text-4xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Error Loading Job</h3>
              <p className="text-red-600 mb-8 text-sm font-medium">
                {error.message || 'Failed to load job details'}
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={refetch}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg flex items-center gap-2 font-semibold"
                >
                  <FaRedo className="w-4 h-4" />
                  Retry
                </button>
                <button
                  onClick={handleBack}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all shadow-lg font-semibold"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Job Content */}
        {!loading && displayJob && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <Suspense fallback={<JobDescriptionSkeleton />}>
              <JobContent
                job={displayJob}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                showFooter={true}
                hideHeader={true}
                onClose={handleBack}
                onApply={handleApply}
                onShare={null}
                onPrint={null}
              />
            </Suspense>
          </div>
        )}

        {/* Error with cached data */}
        {error && displayJob && !loading && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Error Banner */}
            <div className="bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 border-b border-yellow-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
                  <span className="text-yellow-900 text-lg">⚠️</span>
                </div>
                <p className="text-sm text-yellow-800 font-semibold">
                  Using cached data. Some details may be outdated.
                </p>
              </div>
              <button
                onClick={refetch}
                className="text-yellow-800 hover:text-yellow-900 flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-yellow-100 transition-all duration-200"
              >
                <FaRedo className="w-4 h-4" />
                Refresh
              </button>
            </div>
            <Suspense fallback={<JobDescriptionSkeleton />}>
              <JobContent
                job={displayJob}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                showFooter={true}
                hideHeader={true}
                onClose={handleBack}
                onApply={handleApply}
                onShare={null}
                onPrint={null}
              />
            </Suspense>
          </div>
        )}
      </div>

      {/* Resume Selection Modal */}
      {isResumeModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => { setIsResumeModalOpen(false); setPendingJob(null); }}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Select Resume</h2>
              <button
                onClick={() => { setIsResumeModalOpen(false); setPendingJob(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {pendingJob && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs font-medium text-blue-800 mb-1">Applying to:</p>
                <p className="text-sm font-semibold text-gray-900">{pendingJob.jobTitle}</p>
                <p className="text-xs text-gray-600">{pendingJob.company?.name || pendingJob.companyName}</p>
              </div>
            )}

            <p className="text-sm text-gray-600 mb-6">
              Choose how you want to submit your resume for this application.
            </p>

            {loadingResumes ? (
              <div className="flex justify-center items-center py-8">
                <Loader className="animate-spin text-blue-600" size={24} />
                <span className="ml-2 text-gray-600">Loading resumes...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {resumes.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Use Existing Resume
                    </h3>
                    <div className="space-y-2">
                      {resumes.map((resume) => (
                        <button
                          key={resume.id || resume.fileName}
                          onClick={() => handleResumeSelection(resume.id || resume.fileName)}
                          disabled={applying}
                          className="w-full text-left px-4 py-3 border border-blue-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-between bg-white shadow-sm group disabled:opacity-60"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-md">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-700 block">
                                {resume.title || resume.fileName || resume.name || 'Resume'}
                              </span>
                              {resume.uploadedAt && (
                                <span className="text-xs text-gray-500">
                                  Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <CheckCircle className="h-5 w-5 text-green-500 opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCreateResume}
                  disabled={applying}
                  className="w-full px-4 py-4 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all flex items-center justify-center gap-3 text-blue-600 font-semibold bg-white shadow-sm disabled:opacity-60"
                >
                  <FilePlus className="h-5 w-5" />
                  Create New Resume
                </button>

                {resumes.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-2 italic">
                    No resumes uploaded yet. Create a new one to proceed.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDescriptionPage;
