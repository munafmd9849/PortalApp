import React, { useState } from 'react';
import { createJob, updateJob } from '../../services/jobs';
import { useAuth } from '../../hooks/useAuth';

export default function JobForm({ job, onSaved }) {
  const { user } = useAuth();
  const [title, setTitle] = useState(job?.title || '');
  const [company, setCompany] = useState(job?.company || '');
  const [ctc, setCtc] = useState(job?.ctc || '');
  const [location, setLocation] = useState(job?.location || '');
  const [description, setDescription] = useState(job?.description || '');
  const [eligibility, setEligibility] = useState(job?.eligibility || '');
  const [deadline, setDeadline] = useState(job?.deadline || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const data = { title, company, ctc, location, description, eligibility, deadline };
    try {
      if (job?.id) {
        await updateJob(job.id, data);
      } else {
        await createJob(user.id, data);
      }
      onSaved?.();
    } catch (e) {
      setError('Failed to save job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input className="w-full border px-3 py-2 rounded" placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} />
      <input className="w-full border px-3 py-2 rounded" placeholder="Company" value={company} onChange={(e)=>setCompany(e.target.value)} />
      <input className="w-full border px-3 py-2 rounded" placeholder="CTC" value={ctc} onChange={(e)=>setCtc(e.target.value)} />
      <input className="w-full border px-3 py-2 rounded" placeholder="Location" value={location} onChange={(e)=>setLocation(e.target.value)} />
      <textarea className="w-full border px-3 py-2 rounded" placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} />
      <textarea className="w-full border px-3 py-2 rounded" placeholder="Eligibility" value={eligibility} onChange={(e)=>setEligibility(e.target.value)} />
      <input type="date" className="w-full border px-3 py-2 rounded" placeholder="Deadline" value={deadline} onChange={(e)=>setDeadline(e.target.value)} />
      <button disabled={loading} className="w-full bg-black text-white py-2 rounded disabled:opacity-60">{loading ? 'Saving...' : 'Save job'}</button>
    </form>
  );
}


