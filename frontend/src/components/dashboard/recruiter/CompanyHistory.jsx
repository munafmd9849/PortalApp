/**
 * Company History / Job Track
 * Lists recruiter's jobs grouped by company. Recruiter can add/edit post-drive notes
 * (like endorsement section). Opens from thank-you email link with addNote=jobId.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FaHistory,
  FaBriefcase,
  FaStickyNote,
  FaPencilAlt,
  FaCheck,
  FaUsers,
  FaFileAlt,
  FaExternalLinkAlt,
} from 'react-icons/fa';
import api from '../../../services/api';

function groupJobsByCompany(jobs) {
  const map = new Map();
  for (const job of jobs) {
    const name = (job?.companyName || job?.company?.name || 'Unknown Company').trim() || 'Unknown Company';
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(job);
  }
  return Array.from(map.entries()).map(([companyName, companyJobs]) => ({
    companyName,
    jobs: companyJobs,
  }));
}

const CompanyHistory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const addNoteJobId = searchParams.get('addNote');

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingNoteJobId, setEditingNoteJobId] = useState(null);
  const [editingNoteValue, setEditingNoteValue] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setLoading(true);
        setError(null);
        const me = await api.getCurrentUser();
        const recruiterId = me?.user?.recruiter?.id;
        if (!recruiterId) {
          setJobs([]);
          return;
        }
        const response = await api.getJobs({
          recruiterId,
          isPosted: true,
          status: 'POSTED',
          limit: 1000,
        });
        const list = Array.isArray(response) ? response : response?.jobs || [];
        setJobs(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Error loading company history:', err);
        setError(err?.message || 'Failed to load company history');
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, []);

  const companies = useMemo(() => groupJobsByCompany(jobs), [jobs]);

  useEffect(() => {
    if (!addNoteJobId || loading || jobs.length === 0) return;
    const job = jobs.find((j) => (j?.id || j?.jobId) === addNoteJobId);
    if (!job) return;
    setEditingNoteJobId(addNoteJobId);
    setEditingNoteValue(job?.recruiterNote || '');
    setSearchParams((prev) => {
      prev.delete('addNote');
      return prev;
    }, { replace: true });
  }, [addNoteJobId, loading, jobs, setSearchParams]);

  const handleSaveNote = async (jobId) => {
    setSavingNote(true);
    try {
      await api.patch(`/jobs/${jobId}/recruiter-note`, { note: editingNoteValue });
      setJobs((prev) =>
        prev.map((j) =>
          (j?.id || j?.jobId) === jobId ? { ...j, recruiterNote: editingNoteValue || null } : j
        )
      );
      setEditingNoteJobId(null);
      setEditingNoteValue('');
    } catch (e) {
      console.error('Failed to save recruiter note:', e);
      alert(e?.response?.data?.message || e?.message || 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500 flex items-center gap-2">
          <span className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" />
          Loading company history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center py-12">
          <FaHistory className="mx-auto text-4xl text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Company History</h3>
          <p className="text-gray-500">
            Jobs you post will appear here. After you conduct a placement drive and end the session,
            you can add notes for each job.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <FaHistory className="text-indigo-600 text-2xl" />
          <h2 className="text-2xl font-bold text-gray-900">Company History / Job Track</h2>
        </div>
        <p className="text-gray-600 text-sm">
          Jobs you have posted, grouped by company. Add or edit notes after each placement drive.
        </p>
      </div>

      {companies.map(({ companyName, jobs: companyJobs }) => (
        <div key={companyName} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-sky-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FaBriefcase className="text-indigo-500" />
              {companyName}
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">{companyJobs.length} job(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    View JD
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {companyJobs.map((job) => {
                  const jobId = job?.id || job?.jobId;
                  const title = job?.jobTitle || job?.title || 'Job';
                  const recruiterNote = job?.recruiterNote ?? null;
                  const applicationCount = job?.applicationCount ?? job?.totalApplications ?? 0;
                  const isEditingThis = editingNoteJobId === jobId;

                  return (
                    <tr key={jobId} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">{title}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <FaUsers className="w-4 h-4 text-gray-400" />
                          {applicationCount} applicant{applicationCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a
                          href={`/admin/job/${jobId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium"
                        >
                          <FaFileAlt className="w-4 h-4" />
                          View JD
                          <FaExternalLinkAlt className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        {isEditingThis ? (
                          <div className="space-y-2 max-w-md">
                            <textarea
                              value={editingNoteValue}
                              onChange={(e) => setEditingNoteValue(e.target.value)}
                              placeholder="Add a note about this drive..."
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[70px]"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveNote(jobId)}
                                disabled={savingNote}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
                              >
                                <FaCheck className="w-3.5 h-3.5" />
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingNoteJobId(null);
                                  setEditingNoteValue('');
                                }}
                                disabled={savingNote}
                                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 max-w-md">
                            <p className="text-gray-700 text-sm flex-1 line-clamp-2 py-1">
                              {recruiterNote || '—'}
                            </p>
                            <button
                              onClick={() => {
                                setEditingNoteJobId(jobId);
                                setEditingNoteValue(recruiterNote || '');
                              }}
                              className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700 text-sm"
                              title="Add or edit note"
                            >
                              <FaStickyNote className="w-3.5 h-3.5" />
                              <FaPencilAlt className="w-3.5 h-3.5" />
                              {recruiterNote ? 'Edit' : 'Add'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CompanyHistory;
