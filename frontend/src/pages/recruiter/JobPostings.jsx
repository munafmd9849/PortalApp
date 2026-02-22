import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Edit, XCircle, Loader } from 'lucide-react';
import CreateJob from '../../components/dashboard/admin/CreateJob.jsx';
import api from '../../services/api';
import { updateJob } from '../../services/jobs';
import { useToast } from '../../components/ui/Toast';

export default function JobPostings() {
  const toast = useToast();
  const [activeView, setActiveView] = useState('active'); // active | drafts | new
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit dates modal state (for POSTED jobs)
  const [editingDatesJobId, setEditingDatesJobId] = useState(null);
  const [editDatesForm, setEditDatesForm] = useState({
    applicationDeadline: null,
    driveDate: null
  });
  const [savingDates, setSavingDates] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const me = await api.getCurrentUser();
        const recruiterId = me?.user?.recruiter?.id;
        if (!recruiterId) {
          if (!cancelled) setJobs([]);
          if (!cancelled) setError('Recruiter profile not found.');
          return;
        }

        const res = await api.getJobs({ recruiterId, limit: 1000 });
        const list = Array.isArray(res?.jobs) ? res.jobs : [];
        if (!cancelled) setJobs(list);
      } catch (e) {
        console.error('Failed to load recruiter jobs:', e);
        if (!cancelled) setJobs([]);
        if (!cancelled) setError(e?.message || 'Failed to load jobs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const { activeJobs, draftJobs } = useMemo(() => {
    const list = Array.isArray(jobs) ? jobs : [];
    const drafts = list.filter(j => String(j?.status || '').toUpperCase() === 'DRAFT');
    const active = list.filter(j => String(j?.status || '').toUpperCase() !== 'DRAFT');
    return { activeJobs: active, draftJobs: drafts };
  }, [jobs]);

  const rows = activeView === 'drafts' ? draftJobs : activeJobs;

  const isJobPosted = (job) => {
    if (job.isPosted === true) return true;
    if (job.posted === true) return true;
    const status = (job.status || '').toUpperCase();
    return status === 'POSTED' || status === 'ACTIVE';
  };

  const handleJobCreated = () => {
    setActiveView('active');
    // reload so we display only real DB state
    window.location.reload();
  };

  const handleSaveDates = async () => {
    if (!editingDatesJobId) return;
    
    // Validate
    if (!editDatesForm.applicationDeadline || !editDatesForm.driveDate) {
      toast?.error('Both dates are required');
      return;
    }

    if (editDatesForm.driveDate <= editDatesForm.applicationDeadline) {
      toast?.error('Drive date must be after the application deadline');
      return;
    }

    try {
      setSavingDates(true);
      await updateJob(editingDatesJobId, {
        applicationDeadline: editDatesForm.applicationDeadline.toISOString(),
        driveDate: editDatesForm.driveDate.toISOString()
      });
      
      // Reload jobs
      const me = await api.getCurrentUser();
      const recruiterId = me?.user?.recruiter?.id;
      if (recruiterId) {
        const res = await api.getJobs({ recruiterId, limit: 1000 });
        const list = Array.isArray(res?.jobs) ? res.jobs : [];
        setJobs(list);
      }
      
      toast?.success('Dates updated successfully');
      setEditingDatesJobId(null);
      setEditDatesForm({ applicationDeadline: null, driveDate: null });
    } catch (error) {
      console.error('Failed to update dates:', error);
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to update dates';
      toast?.error(errorMessage);
    } finally {
      setSavingDates(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Job Postings</h1>
        <button
          onClick={() => setActiveView('new')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Post a New Job
        </button>
      </div>

      <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200 inline-flex mb-8">
        <button
          onClick={() => setActiveView('active')}
          className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
            activeView === 'active' ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Postings
        </button>
        <button
          onClick={() => setActiveView('drafts')}
          className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
            activeView === 'drafts' ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Drafts
        </button>
        <button
          onClick={() => setActiveView('new')}
          className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
            activeView === 'new' ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          + New Job
        </button>
      </div>

      {activeView === 'new' ? (
        <CreateJob onCreated={handleJobCreated} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading...
            </div>
          ) : error ? (
            <div className="p-6 text-red-700 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-gray-600">
              <p className="font-medium">No data available</p>
              <p className="text-sm mt-1">
                {activeView === 'drafts' ? 'No drafts yet.' : 'No job postings yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drive Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{job.jobTitle || job.title || 'Untitled'}</div>
                        <div className="text-sm text-gray-500">{job.company?.name || job.companyName || 'Company'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {String(job.status || '').toUpperCase() || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {job.driveDate ? new Date(job.driveDate).toLocaleDateString() : 'TBD'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isJobPosted(job) && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const deadlineDate = job.applicationDeadline 
                                ? (typeof job.applicationDeadline === 'object' && job.applicationDeadline.toMillis
                                    ? new Date(job.applicationDeadline.toMillis())
                                    : new Date(job.applicationDeadline))
                                : null;
                              const driveDateValue = job.driveDate
                                ? (typeof job.driveDate === 'object' && job.driveDate.toMillis
                                    ? new Date(job.driveDate.toMillis())
                                    : new Date(job.driveDate))
                                : null;
                              
                              setEditDatesForm({
                                applicationDeadline: deadlineDate,
                                driveDate: driveDateValue
                              });
                              setEditingDatesJobId(job.id);
                            }}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            title="Edit Interview Dates"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Dates Modal - For POSTED jobs only */}
      {editingDatesJobId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-green-600" />
                  Edit Interview Dates
                </h2>
                <button
                  onClick={() => {
                    setEditingDatesJobId(null);
                    setEditDatesForm({ applicationDeadline: null, driveDate: null });
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Application Deadline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={editDatesForm.applicationDeadline ? new Date(editDatesForm.applicationDeadline.getTime() - editDatesForm.applicationDeadline.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditDatesForm(prev => ({ ...prev, applicationDeadline: e.target.value ? new Date(e.target.value) : null }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Drive Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drive Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={editDatesForm.driveDate ? new Date(editDatesForm.driveDate.getTime() - editDatesForm.driveDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setEditDatesForm(prev => ({ ...prev, driveDate: e.target.value ? new Date(e.target.value) : null }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Validation message */}
              {editDatesForm.applicationDeadline && editDatesForm.driveDate && 
               editDatesForm.driveDate <= editDatesForm.applicationDeadline && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">
                    <strong>Error:</strong> Drive date must be after the application deadline.
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setEditingDatesJobId(null);
                    setEditDatesForm({ applicationDeadline: null, driveDate: null });
                  }}
                  disabled={savingDates}
                  className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDates}
                  disabled={savingDates || !editDatesForm.applicationDeadline || !editDatesForm.driveDate || 
                           (editDatesForm.driveDate <= editDatesForm.applicationDeadline)}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {savingDates ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Dates'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
