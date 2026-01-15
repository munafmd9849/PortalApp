import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import CreateJob from '../../components/dashboard/admin/CreateJob.jsx';
import api from '../../services/api';

export default function JobPostings() {
  const [activeView, setActiveView] = useState('active'); // active | drafts | new
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleJobCreated = () => {
    setActiveView('active');
    // reload so we display only real DB state
    window.location.reload();
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
                        {job.driveDate ? new Date(job.driveDate).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
