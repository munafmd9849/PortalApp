import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import AiInterviewResultBody from '../../components/mockInterview/AiInterviewResultBody';

const CONTENT_WIDTH = 'w-full lg:w-[75%] max-w-full mx-auto px-4 sm:px-6';

function AiInterviewResultStudentComponent() {
  const { enrollmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const backPath =
    location.state?.from === 'conversational'
      ? '/student/conversational-ai-interviews'
      : '/student/guided-ai-interviews';

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await api.getStudentAiInterviewResults(enrollmentId);
      setResult(data);
    } catch (error) {
      setErrorMsg(error.message || 'Failed to load report');
      toast?.error('Could not retrieve AI interview report');
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, toast]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    if (result?.aiInsight?.status !== 'PENDING') return undefined;
    const timer = setInterval(fetchResults, 8000);
    return () => clearInterval(timer);
  }, [result?.aiInsight?.status, fetchResults]);

  if (loading && !result) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
          Loading AI interview report
        </p>
      </div>
    );
  }

  if (errorMsg && !result) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center p-8">
        <AlertTriangle className="w-8 h-8 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Report unavailable</h2>
        <p className="text-slate-500 text-sm mb-6 text-center max-w-md">{errorMsg}</p>
        <button
          type="button"
          onClick={() => navigate(backPath)}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95"
        >
          Back to interviews
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 animate-in fade-in duration-700">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className={`${CONTENT_WIDTH} h-16 flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg border border-slate-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-slate-900">
              AI Interview Report:{' '}
              <span className="text-indigo-600">{result?.interview?.title}</span>
            </h1>
          </div>
          {result?.aiInsight?.status === 'PENDING' && (
            <button
              type="button"
              onClick={fetchResults}
              className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          )}
        </div>
      </div>

      <div className={`${CONTENT_WIDTH} mt-8`}>
        <AiInterviewResultBody
          aiInsight={result?.aiInsight}
          durationSeconds={result?.enrollment?.totalDurationSeconds}
          sessionMode={result?.interview?.sessionMode}
          title={result?.interview?.title}
          completedAt={result?.enrollment?.completedAt}
        />

        {result?.humanReview?.comments && (
          <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">
              Placement team review
            </h3>
            {result.humanReview.overallRating != null && (
              <p className="text-sm font-bold text-indigo-600 mb-2">
                Rating: {result.humanReview.overallRating}/10
              </p>
            )}
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {result.humanReview.comments}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiInterviewResultStudent() {
  return (
    <ErrorBoundary>
      <AiInterviewResultStudentComponent />
    </ErrorBoundary>
  );
}
