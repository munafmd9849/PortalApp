import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../../services/api';
import {
  ArrowLeft,
  Building2,
  Briefcase,
  User,
  Mail,
  Phone,
  GraduationCap,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Layers,
  FileText,
  AlertCircle,
} from 'lucide-react';

function StatusPill({ value }) {
  const v = String(value || '').toUpperCase();
  const styles = {
    SELECTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
    ONGOING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    PASSED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    NOT_REQUIRED: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  const label = v === 'NOT_REQUIRED' ? 'N/A' : v;
  return (
    <span className={`inline-flex px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border ${styles[v] || styles.ONGOING}`}>
      {label}
    </span>
  );
}

function InfoRow({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}

function ScreeningStageCard({ title, stage }) {
  if (!stage?.enabled) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 opacity-70">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-xs font-semibold text-slate-500 mt-2">Not required for this job</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <StatusPill value={stage.status} />
      </div>
      <p className="text-sm font-semibold text-slate-800 mt-2">{stage.label}</p>
    </div>
  );
}

function RoundCard({ round }) {
  const evalStatus = round.evaluation?.status?.toUpperCase();
  const isSelected = evalStatus === 'SELECTED' || evalStatus === 'PASS' || evalStatus === 'PASSED';
  const isRejected = evalStatus === 'REJECTED' || evalStatus === 'FAIL' || evalStatus === 'FAILED';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
            Round {round.roundNumber}
          </p>
          <h3 className="text-base font-bold text-slate-900 mt-1">{round.name || `Round ${round.roundNumber}`}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Session status: <span className="font-semibold">{round.roundStatus || '—'}</span>
          </p>
        </div>
        {round.evaluation ? (
          <StatusPill value={isSelected ? 'SELECTED' : isRejected ? 'REJECTED' : evalStatus || 'ONGOING'} />
        ) : (
          <StatusPill value="PENDING" />
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {round.startedAt && (
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="w-3.5 h-3.5" />
            Started: {new Date(round.startedAt).toLocaleString()}
          </div>
        )}
        {round.endedAt && (
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ended: {new Date(round.endedAt).toLocaleString()}
          </div>
        )}
      </div>

      {round.evaluation && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <InfoRow label="Interviewer" value={round.evaluation.interviewerEmail} />
          <InfoRow
            label="Evaluated at"
            value={round.evaluation.evaluatedAt ? new Date(round.evaluation.evaluatedAt).toLocaleString() : null}
          />
          {round.evaluation.remarks && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Feedback &amp; Notes
              </p>
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap bg-slate-50 rounded-xl p-3 border border-slate-100">
                {round.evaluation.remarks}
              </p>
            </div>
          )}
        </div>
      )}

      {!round.evaluation && round.roundStatus === 'ENDED' && (
        <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          Round ended with no evaluation recorded for this candidate.
        </p>
      )}
    </div>
  );
}

export default function AdminJobApplicationDetail() {
  const { jobId, applicationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/super-admin') ? '/super-admin' : '/admin';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      if (!jobId || !applicationId) return;
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/admin/jobs/${jobId}/applications/${applicationId}`, { noCache: true });
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to load application details');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId, applicationId]);

  const job = data?.job || {};
  const application = data?.application || {};
  const student = data?.student || {};
  const interviewRounds = data?.interviewRounds || [];
  const session = data?.session;
  const pipeline = application.screeningPipeline || {};

  if (loading) {
    return (
      <div className="p-8 min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="animate-pulse text-slate-500 font-semibold">Loading candidate history…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 min-h-screen bg-[#f8fafc]">
        <button
          onClick={() => navigate(`${basePath}/jobs/${jobId}/applications`)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to applications
        </button>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 font-semibold">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8 bg-[#f8fafc] min-h-screen font-outfit">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(`${basePath}/jobs/${jobId}/applications`)}
            className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 shadow-sm transition-all shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {student.name || 'Candidate'} <span className="text-indigo-600">History</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                <Building2 className="w-3.5 h-3.5" />
                {job.companyName}
              </span>
              <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block" />
              <span className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                <Briefcase className="w-3.5 h-3.5" />
                {job.title}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusPill value={application.finalStatus} />
          <span className="inline-flex px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border bg-white border-slate-200 text-slate-700">
            {application.currentStage}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-indigo-500" />
              Candidate Information
            </h2>
            <div className="space-y-4">
              <InfoRow label="Name" value={student.name} />
              <InfoRow label="Email" value={student.email} />
              <InfoRow label="Enrollment ID" value={student.enrollmentId} />
              <InfoRow label="Phone" value={student.phone} />
              <InfoRow label="School" value={student.school} />
              <InfoRow label="Batch" value={student.batch} />
              <InfoRow label="Center" value={student.center} />
            </div>
          </section>

          <section className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-indigo-500" />
              Application Details
            </h2>
            <div className="space-y-4">
              <InfoRow
                label="Applied on"
                value={application.appliedAt ? new Date(application.appliedAt).toLocaleString() : null}
              />
              <InfoRow label="Application ID" value={application.applicationId} />
              <InfoRow label="Legacy status" value={application.status} />
              <InfoRow label="Interview status" value={application.interviewStatus} />
              <InfoRow label="Last round reached" value={String(application.lastRoundReached ?? 0)} />
              {application.rejectedIn && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Rejected in</p>
                  <p className="text-sm font-semibold text-rose-800 mt-1">{application.rejectedIn}</p>
                </div>
              )}
              {application.screeningRemarks && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rejection / screening remarks</p>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{application.screeningRemarks}</p>
                </div>
              )}
              {application.notes && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin notes</p>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{application.notes}</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-indigo-500" />
              Screening &amp; Eligibility
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Current screening status: <span className="font-bold text-slate-800">{application.screeningStatusText}</span>
              {application.screeningCompletedAt && (
                <> · Completed {new Date(application.screeningCompletedAt).toLocaleString()}</>
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ScreeningStageCard title="Resume Screening" stage={pipeline.resume} />
              <ScreeningStageCard title="Recruiter Screening" stage={pipeline.recruiter} />
              <ScreeningStageCard title="QA Test" stage={pipeline.qaTest} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {application.interviewEligible ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Interview eligible
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold">
                  <Clock className="w-4 h-4" />
                  Not yet interview eligible
                </span>
              )}
              {pipeline.finalizedAt && (
                <span className="text-xs text-slate-500">
                  Recruiter screening finalized {new Date(pipeline.finalizedAt).toLocaleString()}
                </span>
              )}
            </div>
          </section>

          <section className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Interview Progression
              </h2>
              {session && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Session: {session.status}
                </span>
              )}
            </div>

            {!session && interviewRounds.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500 text-sm">
                No interview session has been scheduled for this job yet.
              </div>
            )}

            {session && interviewRounds.length === 0 && (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-amber-800 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                Interview session exists but no rounds are configured yet.
              </div>
            )}

            <div className="space-y-4">
              {interviewRounds.map((round) => (
                <RoundCard key={round.roundId || round.roundNumber} round={round} />
              ))}
            </div>

            {application.finalStatus === 'SELECTED' && (
              <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4 flex items-center gap-2 text-emerald-800 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Final outcome: Selected
              </div>
            )}
            {application.finalStatus === 'REJECTED' && application.rejectedIn && (
              <div className="mt-4 rounded-xl bg-rose-50 border border-rose-100 p-4 flex items-center gap-2 text-rose-800 text-sm font-semibold">
                <XCircle className="w-5 h-5" />
                Final outcome: Rejected ({application.rejectedIn})
              </div>
            )}
          </section>

          {student.education?.length > 0 && (
            <section className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                Education
              </h2>
              <div className="space-y-3">
                {student.education.map((edu, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-sm">
                    <p className="font-semibold text-slate-800">{edu.degree || 'Degree'}</p>
                    <p className="text-slate-600 text-xs mt-1">{edu.description || edu.institution}</p>
                    {edu.endYear && <p className="text-slate-400 text-xs mt-1">Class of {edu.endYear}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
