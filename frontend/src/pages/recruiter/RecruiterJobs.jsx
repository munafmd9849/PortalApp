import React, { useEffect, useState } from 'react';
import { listJobs, deleteJob } from '../../services/jobs';
import JobForm from './JobForm';
import { useAuth } from '../../hooks/useAuth';

export default function RecruiterJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listJobs({ recruiterId: user.id });
      setJobs(data);
    } catch {
      setError('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const onDelete = async (id) => {
    if (!confirm('Delete this job?')) return;
    try {
      await deleteJob(id);
      await refresh();
    } catch {}
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Jobs</h1>
        <button onClick={() => setShowForm((s)=>!s)} className="bg-black text-white px-4 py-2 rounded">{showForm ? 'Close' : 'New Job'}</button>
      </div>
      {showForm && <div className="mt-4"><JobForm onSaved={() => { setShowForm(false); refresh(); }} /></div>}
      {loading ? (
        <div className="mt-4">Loading...</div>
      ) : error ? (
        <div className="mt-4 text-red-600">{error}</div>
      ) : (
        <ul className="mt-4 divide-y">
          {jobs.map((j)=> (
            <li key={j.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold">{j.title}</div>
                <div className="text-sm text-gray-600">{j.company}</div>
              </div>
              <button onClick={() => onDelete(j.id)} className="text-red-600">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


