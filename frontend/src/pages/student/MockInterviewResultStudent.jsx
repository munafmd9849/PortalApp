import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import MockInterviewResultBody from '../../components/mockInterview/MockInterviewResultBody';

const MOCK_INTERVIEWS_HOME = '/student?tab=mockInterviews';
const CONTENT_WIDTH = 'w-full lg:w-[75%] max-w-full mx-auto px-4 sm:px-6';

function MockInterviewResultStudentComponent() {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getMockInterviewSlotResults(slotId);
      setResult(data);
    } catch (error) {
      setErrorMsg(error.message || 'Failed to load feedback');
      toast?.error('Could not retrieve mock interview feedback');
    } finally {
      setLoading(false);
    }
  }, [slotId, toast]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  if (loading) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
          Loading interviewer feedback
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center p-8">
        <AlertTriangle className="w-8 h-8 text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Feedback unavailable</h2>
        <p className="text-slate-500 text-sm mb-6 text-center max-w-md">{errorMsg}</p>
        <button
          type="button"
          onClick={() => navigate(MOCK_INTERVIEWS_HOME)}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95"
        >
          Back to Mock Interviews
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
              onClick={() => navigate(MOCK_INTERVIEWS_HOME)}
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg border border-slate-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-slate-900">
              Mock Interview Review:{' '}
              <span className="text-indigo-600">{result?.drive?.title}</span>
            </h1>
          </div>
        </div>
      </div>

      <div className={`${CONTENT_WIDTH} mt-8`}>
        <MockInterviewResultBody
          scorePercent={result?.scorePercent}
          feedback={result?.feedback}
          durationSeconds={result?.durationSeconds}
          driveCategory={result?.drive?.category}
        />
      </div>
    </div>
  );
}

export default function MockInterviewResultStudent() {
  return (
    <ErrorBoundary>
      <MockInterviewResultStudentComponent />
    </ErrorBoundary>
  );
}
