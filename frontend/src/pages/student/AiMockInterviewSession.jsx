import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, Clock, ChevronRight, CheckCircle, XCircle, Loader2,
  Video, Maximize2, Send, RotateCcw, Mic,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useInterviewSpeech } from '../../hooks/useInterviewSpeech';
import { ProctoringEngine } from '../../proctoring-engine/ProctoringEngine';
import { defaultProctoringConfig } from '../../proctoring-engine/constants';
import ProctoringConsole from '../../components/assessment/ProctoringConsole';

const PHASE = { LOAD: 'load', PRECHECK: 'precheck', LIVE: 'live', DONE: 'done' };

export default function AiMockInterviewSession() {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [phase, setPhase] = useState(PHASE.LOAD);
  const [session, setSession] = useState(null);
  const [enrollmentId, setEnrollmentId] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [answeredIds, setAnsweredIds] = useState(new Set());
  const [prepLeft, setPrepLeft] = useState(0);
  const [answerLeft, setAnswerLeft] = useState(0);
  const [phaseStep, setPhaseStep] = useState('idle');
  const [voiceRate, setVoiceRate] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [violations, setViolations] = useState(0);
  const [cameraLive, setCameraLive] = useState(false);
  const [precheck, setPrecheck] = useState({
    cameraReady: false,
    fullscreen: false,
    micReady: false,
    error: '',
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const proctorRef = useRef(null);
  const recordStartRef = useRef(null);

  const { speak, stop: stopSpeech, speaking, supported: speechSupported } = useInterviewSpeech({
    rate: voiceRate,
  });

  const questions = session?.questions || [];
  const currentQ = questions[qIndex];
  const totalQ = questions.length;
  const progressPct = session?.progressPercent ?? Math.round((answeredIds.size / Math.max(1, totalQ)) * 100);

  const loadSession = useCallback(async () => {
    try {
      const data = await api.getStudentAiInterviewSession(interviewId);
      setSession(data);
      setEnrollmentId(data.enrollmentId);
      setQIndex(data.currentQuestionIndex || 0);
      setAnsweredIds(new Set(data.questions.filter((q) => q.answered).map((q) => q.id)));
      setPhase(PHASE.PRECHECK);
    } catch (err) {
      toast.error(err.message || 'Failed to load interview');
      navigate('/student?tab=mockInterviews');
    }
  }, [interviewId, navigate, toast]);

  useEffect(() => {
    loadSession();
    return () => {
      proctorRef.current?.stop?.();
      streamRef.current?.getTracks?.().forEach((t) => t.stop());
      stopSpeech();
    };
  }, [loadSession, stopSpeech]);

  const attachStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 },
      audio: true,
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => videoRef.current?.play?.();
    }
    setCameraLive(true);
    return stream;
  };

  const startCameraPrecheck = async () => {
    setPrecheck((p) => ({ ...p, error: '' }));
    try {
      await attachStream();
      setPrecheck((p) => ({ ...p, cameraReady: true, micReady: true }));
    } catch {
      setPrecheck((p) => ({ ...p, error: 'Camera and microphone permission required.', cameraReady: false, micReady: false }));
      setCameraLive(false);
    }
  };

  const enterFullscreenPrecheck = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setPrecheck((p) => ({ ...p, fullscreen: true }));
    } catch {
      setPrecheck((p) => ({ ...p, error: 'Fullscreen is required for this interview.' }));
    }
  };

  useEffect(() => {
    if (phase !== PHASE.PRECHECK) return;
    startCameraPrecheck();
  }, [phase]);

  const startProctoring = useCallback(() => {
    if (!enrollmentId || proctorRef.current) return;
    const cfg = { ...defaultProctoringConfig, ...(session?.proctoringConfig || {}) };
    const engine = new ProctoringEngine({
      getVideoEl: () => videoRef.current,
      getSessionId: () => enrollmentId,
      config: cfg,
      logViolation: async (type, details, meta) => {
        await api.logAiInterviewViolation(enrollmentId, { type, details, meta });
        setViolations((v) => v + 1);
      },
      uploadScreenshot: async (blob, meta) => api.uploadAiInterviewScreenshot(enrollmentId, blob, meta),
      onWarning: (msg) => toast.error(msg),
    });
    proctorRef.current = engine;
    engine.start().then(() => engine.enableMonitoring());
  }, [enrollmentId, session, toast]);

  const startInterview = async () => {
    if (!(precheck.cameraReady && precheck.fullscreen && precheck.micReady)) return;
    setStarting(true);
    try {
      await api.startAiInterviewSession(enrollmentId);
      await attachStream();
      startProctoring();
      setPhase(PHASE.LIVE);
      setPhaseStep('idle');
    } catch (err) {
      toast.error(err.message || 'Could not start');
    } finally {
      setStarting(false);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const rec = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp8,opus' });
    recorderRef.current = rec;
    recordStartRef.current = Date.now();
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.start(1000);
  };

  const stopRecording = () =>
    new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        resolve(null);
        return;
      }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        resolve({
          blob,
          duration: Math.round((Date.now() - (recordStartRef.current || Date.now())) / 1000),
        });
      };
      rec.stop();
    });

  const runQuestionFlow = useCallback(async () => {
    if (!currentQ || phaseStep !== 'idle') return;
    setPhaseStep('speak');
    await speak(currentQ.questionText);
    setPhaseStep('prep');
    setPrepLeft(currentQ.prepTimeSeconds);
  }, [currentQ, phaseStep, speak]);

  useEffect(() => {
    if (phase !== PHASE.LIVE || !currentQ || phaseStep !== 'idle') return;
    runQuestionFlow();
  }, [phase, qIndex, currentQ?.id, phaseStep, runQuestionFlow]);

  useEffect(() => {
    if (phaseStep !== 'prep' || prepLeft <= 0) return;
    const t = setInterval(() => {
      setPrepLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setPhaseStep('answer');
          setAnswerLeft(currentQ?.answerTimeSeconds ?? 120);
          startRecording();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phaseStep, prepLeft, currentQ?.answerTimeSeconds]);

  const handleSubmitAnswer = useCallback(async () => {
    if (submitting || !currentQ) return;
    setSubmitting(true);
    setPhaseStep('uploading');
    try {
      const result = await stopRecording();
      if (!result?.blob?.size) {
        toast.error('Recording failed — try again');
        setPhaseStep('answer');
        return;
      }
      await api.submitAiInterviewAnswer(enrollmentId, result.blob, {
        questionId: currentQ.id,
        durationSeconds: result.duration,
      });
      const nextAnswered = new Set(answeredIds);
      nextAnswered.add(currentQ.id);
      setAnsweredIds(nextAnswered);
      const next = qIndex + 1;
      if (next >= totalQ) {
        await api.completeAiInterview(enrollmentId);
        proctorRef.current?.stop?.();
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        setPhase(PHASE.DONE);
      } else {
        setQIndex(next);
        await api.updateAiInterviewProgress(enrollmentId, {
          currentQuestionIndex: next,
          progressPercent: Math.round((nextAnswered.size / totalQ) * 100),
        });
        setPhaseStep('idle');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit');
      setPhaseStep('answer');
    } finally {
      setSubmitting(false);
    }
  }, [submitting, currentQ, enrollmentId, qIndex, totalQ, answeredIds, toast]);

  useEffect(() => {
    if (phaseStep !== 'answer' || answerLeft <= 0) return;
    const t = setInterval(() => {
      setAnswerLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          handleSubmitAnswer();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phaseStep, answerLeft, handleSubmitAnswer]);

  if (phase === PHASE.LOAD) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">Loading interview...</p>
      </div>
    );
  }

  if (phase === PHASE.DONE) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-lg p-8 border border-gray-200 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Interview submitted</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your responses have been saved. Your institution will review them and share feedback when ready.
          </p>
          <button
            type="button"
            onClick={() => navigate('/student?tab=mockInterviews')}
            className="mt-6 px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-md text-sm font-medium"
          >
            Back to mock interviews
          </button>
        </div>
      </div>
    );
  }

  if (phase === PHASE.PRECHECK) {
    const readyToStart = precheck.cameraReady && precheck.micReady && precheck.fullscreen;

    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4 overflow-y-auto">
        <div className="max-w-5xl w-full bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-5 my-4">
          <div className="grid lg:grid-cols-5 gap-4 lg:gap-5">
            <div className="lg:col-span-2 space-y-3">
              <div>
                <h1 className="text-lg font-semibold text-gray-900 leading-snug">{session?.title}</h1>
                <p className="text-xs text-gray-500 mt-1">Video mock interview setup</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                  <Video className="w-4 h-4 text-blue-600 mb-1.5" />
                  <p className="text-xs font-medium text-gray-900">Camera & mic</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">Required for recording your answers.</p>
                </div>
                <div className="rounded-md border border-gray-200 p-3 bg-gray-50">
                  <Maximize2 className="w-4 h-4 text-blue-600 mb-1.5" />
                  <p className="text-xs font-medium text-gray-900">Fullscreen</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">Stay in fullscreen during the interview.</p>
                </div>
              </div>

              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-800">Before you begin</p>
                  <p className="text-[11px] text-amber-700/90 mt-0.5 leading-relaxed">
                    Questions are read aloud. You cannot change an answer after submitting.
                    {session?.instructions ? ` ${session.instructions}` : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 grid sm:grid-cols-2 gap-3">
              <div className="rounded-md border border-gray-200 p-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Camera preview</p>
                <div className="rounded-md overflow-hidden border border-gray-200 bg-gray-100 h-32 sm:h-36">
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                </div>
                {precheck.error && <p className="text-xs text-red-600 mt-1.5">{precheck.error}</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={startCameraPrecheck}
                    className="flex-1 px-2 py-1.5 rounded-md bg-white hover:bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700"
                  >
                    Enable camera
                  </button>
                  <button
                    type="button"
                    onClick={enterFullscreenPrecheck}
                    className="flex-1 px-2 py-1.5 rounded-md bg-white hover:bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700"
                  >
                    Go fullscreen
                  </button>
                </div>
              </div>

              <div className="rounded-md border border-gray-200 p-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Setup checklist</p>
                <div className="space-y-1.5">
                  {[
                    ['Camera enabled', precheck.cameraReady],
                    ['Microphone enabled', precheck.micReady],
                    ['Fullscreen on', precheck.fullscreen],
                  ].map(([label, ok]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between px-2.5 py-2 bg-gray-50 rounded-md border border-gray-100"
                    >
                      <span className="text-xs text-gray-700">{label}</span>
                      {ok ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-gray-300" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">{totalQ} questions</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={startInterview}
            disabled={starting || !readyToStart}
            className={`w-full mt-4 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              starting || !readyToStart
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : 'bg-gray-900 hover:bg-black text-white'
            }`}
          >
            {starting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Starting...
              </>
            ) : (
              <>
                Start interview <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const phaseStepLabel = {
    prep: 'Preparation',
    answer: 'Recording',
    uploading: 'Uploading',
    speak: 'Listening',
    idle: 'Standby',
  }[phaseStep] || 'Standby';

  const phaseStepDetail = {
    prep: `${prepLeft}s remaining`,
    answer: `${answerLeft}s remaining`,
    uploading: 'Saving your answer…',
    speak: 'Question is being read',
    idle: 'Getting ready…',
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden text-gray-900">
      <header className="h-14 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
            <Video className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate">{session?.title}</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-[11px] text-emerald-700 font-medium">In progress</span>
            </div>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md border flex-shrink-0 ${
            phaseStep === 'answer'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-gray-50 border-gray-200 text-gray-900'
          }`}
        >
          <Clock className={`w-3.5 h-3.5 ${phaseStep === 'answer' ? 'animate-pulse' : ''}`} />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 leading-none">{phaseStepLabel}</span>
            <span className="text-sm font-semibold tabular-nums leading-tight">
              {phaseStep === 'prep'
                ? `${prepLeft}s`
                : phaseStep === 'answer'
                  ? `${answerLeft}s`
                  : `${progressPct}%`}
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <aside className="w-14 sm:w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-2 overflow-y-auto shrink-0">
          {questions.map((q, i) => {
            const done = answeredIds.has(q.id);
            const current = i === qIndex;
            return (
              <div
                key={q.id}
                className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-medium ${
                  current
                    ? 'bg-blue-600 text-white'
                    : done
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-gray-50 text-gray-400 border border-gray-200'
                }`}
                title={q.mandatory ? 'Required' : 'Optional'}
              >
                {i + 1}
              </div>
            );
          })}
        </aside>

        <main className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto min-h-0">
            <div className="max-w-3xl w-full mx-auto space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-100">
                    Question {qIndex + 1} of {totalQ}
                  </span>
                  {speaking && (
                    <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-md text-xs font-medium border border-violet-100">
                      Reading question…
                    </span>
                  )}
                </div>
                <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                  <div className="h-full bg-blue-600 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug">
                {currentQ?.questionText}
              </h3>
              {currentQ?.notes && (
                <p className="text-sm text-gray-500 leading-relaxed">{currentQ.notes}</p>
              )}

              <div className="bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center p-6 sm:p-8 gap-4">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    phaseStep === 'answer'
                      ? 'bg-red-500 animate-pulse'
                      : 'bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Mic className={`w-7 h-7 ${phaseStep === 'answer' ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">Video response</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {phaseStepDetail[phaseStep] || phaseStepDetail.idle}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => currentQ && speak(currentQ.questionText)}
                    disabled={speaking || !speechSupported}
                    className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-md text-xs font-medium flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Replay
                  </button>
                  <select
                    value={voiceRate}
                    onChange={(e) => setVoiceRate(Number(e.target.value))}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700"
                  >
                    <option value={0.85}>Slow voice</option>
                    <option value={1}>Normal voice</option>
                    <option value={1.15}>Fast voice</option>
                  </select>
                </div>

                {phaseStep === 'answer' && (
                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={submitting}
                    className="px-5 py-2 bg-gray-900 hover:bg-black text-white rounded-md text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" /> Submit answer
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>

        <aside className="w-64 sm:w-72 bg-white border-l border-gray-200 flex flex-col p-4 gap-3 shrink-0 overflow-y-auto min-h-0">
          <ProctoringConsole videoRef={videoRef} violations={violations} cameraLive={cameraLive} variant="light" />
          <div className="rounded-lg p-4 border border-gray-200 bg-gray-50">
            <h4 className="text-xs font-medium text-gray-500 mb-2">Progress</h4>
            <p className="text-xl font-semibold text-gray-900 tabular-nums">{progressPct}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {answeredIds.size} of {totalQ} answers submitted
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
