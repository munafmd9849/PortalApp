import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getJob } from '../../services/jobs';
import { applyToJob } from '../../services/applications';
import { useAuth } from '../../hooks/useAuth';

export default function JobDetail() {
  const { jobId } = useParams();
  const { user, role } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getJob(jobId);
        setJob(data);
      } catch (e) {
        setError('Failed to load job');
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  const onApply = async () => {
    if (!user) return setApplyMsg('Please sign in to apply.');
    if (role !== 'student') return setApplyMsg('Only students can apply.');
    setApplyMsg('');
    setApplyLoading(true);
    try {
      await applyToJob(user.id, jobId, {});
      setApplyMsg('Application submitted successfully!');
    } catch (error) {
      console.error('Apply error:', error);
      setApplyMsg(error.message || 'Failed to apply. Please try again.');
    } finally {
      setApplyLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error || !job) return <div className="p-6 text-red-600">{error || 'Job not found'}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{job.jobTitle || job.title}</h1>
      <p className="text-gray-700">{job.company?.name || job.company}</p>
      <p className="mt-2">CTC: {job.ctc || job.salaryRange}</p>
      <p className="mt-2">Location: {job.location || job.jobLocation}</p>
      <p className="mt-4 whitespace-pre-wrap">{job.jobDescription || job.description}</p>
      <div className="mt-6">
        <button onClick={onApply} disabled={applyLoading} className="bg-black text-white px-4 py-2 rounded disabled:opacity-60">
          {applyLoading ? 'Applying...' : 'Apply now'}
        </button>
        {applyMsg && <p className="mt-2 text-sm">{applyMsg}</p>}
      </div>
    </div>
  );
}


