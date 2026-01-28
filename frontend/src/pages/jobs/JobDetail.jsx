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

  // Check if deadline has passed
  const isDeadlinePassed = () => {
    if (!job?.applicationDeadline && !job?.deadline) return false;
    const deadline = job.applicationDeadline || job.deadline;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    return now > deadlineDate;
  };

  const onApply = async () => {
    if (!user) return setApplyMsg('Please sign in to apply.');
    if (role !== 'student') return setApplyMsg('Only students can apply.');
    
    // Check deadline before applying (frontend check - backend is the real guard)
    if (isDeadlinePassed()) {
      const deadline = job.applicationDeadline || job.deadline;
      return setApplyMsg(`Applications closed on ${new Date(deadline).toLocaleString()}`);
    }
    
    setApplyMsg('');
    setApplyLoading(true);
    try {
      await applyToJob(user.id, jobId, {});
      setApplyMsg('Application submitted successfully!');
    } catch (error) {
      console.error('Apply error:', error);
      
      // Handle errors with precise message
      if (error.response?.data || error.message) {
        const errorData = error.response?.data || {};
        if (errorData.error === 'Applications closed' || errorData.error === 'Application deadline has passed') {
          setApplyMsg('Applications for this job are closed');
        } else if (errorData.error === 'CGPA requirement not met' || errorData.error === 'CGPA requirement check failed') {
          const message = errorData.message || 'CGPA requirement not met';
          const requirement = errorData.requirement || '';
          const fullMessage = requirement 
            ? `${message}\n\n${requirement}`
            : message;
          setApplyMsg(fullMessage);
        } else if (errorData.error === 'Already applied to this job') {
          setApplyMsg('You have already applied to this job.');
        } else {
          setApplyMsg(errorData.message || error.message || 'Failed to apply. Please try again.');
        }
      } else {
        setApplyMsg('Failed to apply. Please try again.');
      }
    } finally {
      setApplyLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error || !job) return <div className="p-6 text-red-600">{error || 'Job not found'}</div>;

  const formatCtc = (val) => {
    if (!val || (typeof val === 'string' && !val.trim())) return 'Not specified';
    const s = String(val).trim();
    if (s === 'As per industry standards') return 'As per industry standards';
    return s.replace(/\$/g, '₹');
  };

  const location = job.companyLocation || job.company?.location || job.location || job.jobLocation;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{job.jobTitle || job.title}</h1>
      <p className="text-gray-700">{job.company?.name || job.company}</p>
      <p className="mt-2">CTC: {formatCtc(job.ctc || job.salary || job.salaryRange)}</p>
      {location && <p className="mt-2">Location: {location}</p>}
      {job.workMode && <p className="mt-2">Work Mode: {job.workMode}</p>}
      {(job.gapAllowed || job.gapYears) && (
        <p className="mt-2">Year Gap: {[job.gapAllowed, job.gapYears].filter(Boolean).join(' ')}</p>
      )}
      <p className="mt-4 whitespace-pre-wrap">{job.jobDescription || job.description}</p>
      <div className="mt-6">
        <button 
          onClick={onApply} 
          disabled={applyLoading || isDeadlinePassed()} 
          className={`px-4 py-2 rounded disabled:opacity-60 ${
            isDeadlinePassed() 
              ? 'bg-gray-400 text-white cursor-not-allowed' 
              : 'bg-black text-white hover:bg-gray-800'
          }`}
          title={isDeadlinePassed() ? 'Application deadline has passed' : ''}
        >
          {applyLoading ? 'Applying...' : isDeadlinePassed() ? 'Deadline Passed' : 'Apply now'}
        </button>
        {applyMsg && <p className={`mt-2 text-sm ${isDeadlinePassed() || applyMsg.includes('deadline') ? 'text-red-600' : ''}`}>{applyMsg}</p>}
      </div>
    </div>
  );
}


