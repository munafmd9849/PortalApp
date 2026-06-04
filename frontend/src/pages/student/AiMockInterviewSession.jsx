import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Shield, AlertTriangle, Clock, ChevronRight, CheckCircle, XCircle, Loader2,
  Video, Maximize2, Send, RotateCcw, Volume2, Mic,
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
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-6 h-6 text-indigo-500 animate-pulse" />
          </div>
        </div>
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs animate-pulse">
          Initializing Secure Environment
        </p>
      </div>
    );
  }

  if (phase === PHASE.DONE) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
        <div className="max-w-xl w-full bg-slate-900/40 backdrop-blur-2xl rounded-[3rem] p-12 border border-slate-800 shadow-2xl relative z-10">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-3">Interview Submitted</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            Your video responses are saved securely. Reviewers will evaluate your performance; AI insights assist the review process.
          </p>
          <button
            type="button"
            onClick={() => navigate('/student?tab=mockInterviews')}
            className="mt-8 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (phase === PHASE.PRECHECK) {
    return (
      <div className="h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />

        <div className="max-w-2xl w-full bg-slate-900/40 backdrop-blur-2xl rounded-[3rem] p-12 border border-slate-800 shadow-2xl relative z-10">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">{session?.title}</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">
              AI Video Mock Interview · Secure Portal
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700/50">
              <Video className="w-6 h-6 text-indigo-400 mb-3" />
              <h4 className="text-sm font-black text-white uppercase mb-1">Camera & Mic</h4>
              <p className="text-[11px] text-slate-500 font-medium">Required for proctoring and recorded answers.</p>
            </div>
            <div className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700/50">
              <Maximize2 className="w-6 h-6 text-indigo-400 mb-3" />
              <h4 className="text-sm font-black text-white uppercase mb-1">Fullscreen</h4>
              <p className="text-[11px] text-slate-500 font-medium">Exiting fullscreen logs a violation.</p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-10 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">Important</h4>
              <p className="text-[11px] text-amber-200/70 leading-relaxed">
                Questions are read aloud automatically. You cannot go back or edit answers after submit.
                {session?.instructions ? ` ${session.instructions}` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Camera Preview</p>
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              </div>
              {precheck.error && <p className="text-xs text-rose-300 mt-2">{precheck.error}</p>}
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={startCameraPrecheck}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-black uppercase tracking-widest"
                >
                  Enable Camera
                </button>
                <button
                  type="button"
                  onClick={enterFullscreenPrecheck}
                  className="flex-1 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-black uppercase tracking-widest"
                >
                  Fullscreen
                </button>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Validation</p>
              <div className="space-y-3">
                {[
                  ['Camera active', precheck.cameraReady],
                  ['Microphone active', precheck.micReady],
                  ['Fullscreen enabled', precheck.fullscreen],
                ].map(([label, ok]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-3"
                  >
                    <span className="text-xs font-bold text-slate-200">{label}</span>
                    {ok ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-4">{totalQ} questions · AI voice interviewer</p>
            </div>
          </div>

          <button
            type="button"
            onClick={startInterview}
            disabled={starting || !(precheck.cameraReady && precheck.micReady && precheck.fullscreen)}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 ${
              starting || !(precheck.cameraReady && precheck.micReady && precheck.fullscreen)
                ? 'bg-slate-700/60 text-slate-300 cursor-not-allowed border border-slate-600'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
            }`}
          >
            {starting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Starting Secure Session
              </>
            ) : (
              <>
                Start Secure Interview <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-200">
      <header className="h-20 bg-slate-900/50 backdrop-blur-md border-b border-slate-800/50 px-8 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Video className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight">{session?.title}</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                  Live Secure Session
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div
            className={`flex items-center gap-4 px-6 py-3 rounded-2xl border ${
              phaseStep === 'answer'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : 'bg-slate-800/50 border-slate-700/50 text-white'
            }`}
          >
            <Clock className={`w-4 h-4 ${phaseStep === 'answer' ? 'animate-pulse' : ''}`} />
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-50">
                {phaseStep === 'prep' ? 'Preparation' : phaseStep === 'answer' ? 'Recording' : phaseStep === 'uploading' ? 'Uploading' : speaking ? 'AI Voice' : 'Standby'}
              </span>
              <span className="text-base font-black tabular-nums">
                {phaseStep === 'prep'
                  ? `${prepLeft}s`
                  : phaseStep === 'answer'
                    ? `${answerLeft}s`
                    : `${progressPct}%`}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-8 gap-4 overflow-y-auto z-20 shrink-0">
          {questions.map((q, i) => {
            const done = answeredIds.has(q.id);
            const current = i === qIndex;
            return (
              <div
                key={q.id}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black ${
                  current
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 ring-4 ring-indigo-500/20'
                    : done
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
                title={q.mandatory ? 'Mandatory' : 'Optional'}
              >
                {i + 1}
              </div>
            );
          })}
        </aside>

        <main className="flex-1 flex overflow-hidden bg-slate-950 relative">
          <div className="flex-1 flex flex-col p-10 overflow-y-auto">
            <div className="max-w-4xl w-full mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                    Question {qIndex + 1} of {totalQ}
                  </span>
                  {speaking && (
                    <span className="px-3 py-1 bg-violet-500/10 text-violet-300 rounded-lg text-[10px] font-black uppercase border border-violet-500/20">
                      AI reading…
                    </span>
                  )}
                </div>
                <div className="h-2 w-32 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              <h3 className="text-2xl font-black text-white leading-tight tracking-tight">
                {currentQ?.questionText}
              </h3>
              {currentQ?.notes && (
                <p className="text-slate-400 text-sm leading-relaxed font-medium">{currentQ.notes}</p>
              )}

              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl flex flex-col items-center justify-center p-10 gap-6">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    phaseStep === 'answer'
                      ? 'bg-rose-500 animate-pulse shadow-2xl shadow-rose-500/40'
                      : 'bg-slate-800 border border-slate-700'
                  }`}
                >
                  <Mic className={`w-10 h-10 ${phaseStep === 'answer' ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <h4 className="text-white font-black uppercase tracking-widest text-sm">Video Response</h4>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  {phaseStep === 'prep' && `Preparation ${prepLeft}s`}
                  {phaseStep === 'answer' && `Recording ${answerLeft}s remaining`}
                  {phaseStep === 'uploading' && 'Saving answer…'}
                  {phaseStep === 'speak' && 'Listen to the question'}
                  {phaseStep === 'idle' && 'Preparing next step…'}
                </p>

                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => currentQ && speak(currentQ.questionText)}
                    disabled={speaking || !speechSupported}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
                  >
                    <RotateCcw className="w-4 h-4" /> Replay
                  </button>
                  <select
                    value={voiceRate}
                    onChange={(e) => setVoiceRate(Number(e.target.value))}
                    className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-[10px] font-black uppercase text-slate-300"
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
                    className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" /> Submit answer
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>

        <aside className="w-[380px] bg-slate-900 border-l border-slate-800 flex flex-col p-8 gap-6 z-20 shrink-0 overflow-y-auto">
          <ProctoringConsole videoRef={videoRef} violations={violations} cameraLive={cameraLive} />
          <div className="bg-slate-800/30 rounded-[2rem] p-6 border border-slate-800/50">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Progress</h4>
            <p className="text-2xl font-black text-white tabular-nums">{progressPct}%</p>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              {answeredIds.size} of {totalQ} answers submitted
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
