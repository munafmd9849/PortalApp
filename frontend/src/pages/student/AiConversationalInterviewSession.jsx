import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Shield, AlertTriangle, Clock, ChevronRight, CheckCircle, XCircle, Loader2,
  Video, Maximize2, Send, RotateCcw, Volume2, Mic, Bot,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useInterviewSpeech } from '../../hooks/useInterviewSpeech';
import { ProctoringEngine } from '../../proctoring-engine/ProctoringEngine';
import { defaultProctoringConfig } from '../../proctoring-engine/constants';
import ProctoringConsole from '../../components/assessment/ProctoringConsole';

const PHASE = { LOAD: 'load', PRECHECK: 'precheck', LIVE: 'live', DONE: 'done' };

const RECORDER_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
];

function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  return RECORDER_MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

function formatInterviewType(t) {
  return String(t || 'GUIDED').replace(/_/g, ' ');
}

export default function AiConversationalInterviewSession() {
  const { id: interviewId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [phase, setPhase] = useState(PHASE.LOAD);
  const [session, setSession] = useState(null);
  const [enrollmentId, setEnrollmentId] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [maxTurns, setMaxTurns] = useState(8);
  const [completedTurns, setCompletedTurns] = useState(0);
  const [prepLeft, setPrepLeft] = useState(0);
  const [answerLeft, setAnswerLeft] = useState(0);
  const [phaseStep, setPhaseStep] = useState('idle');
  const [voiceRate, setVoiceRate] = useState(1); // multiplier on professional base rate (0.95)
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
  const recordedMimeRef = useRef('video/webm');
  const proctorRef = useRef(null);
  const recordStartRef = useRef(null);

  const {
    speak,
    speakWelcome,
    speakCompletion,
    speakInstructions,
    stop: stopSpeech,
    speaking,
    supported: speechSupported,
    voiceName,
  } = useInterviewSpeech({ rateMultiplier: voiceRate });

  const currentQ = activeQuestion;
  const totalQ = maxTurns;
  const progressPct = session?.progressPercent ?? Math.round((completedTurns / Math.max(1, maxTurns)) * 100);

  const loadSession = useCallback(async () => {
    try {
      const data = await api.getStudentConversationalSession(interviewId);
      setSession(data);
      setEnrollmentId(data.enrollmentId);
      setMaxTurns(data.maxTurns || 8);
      setCompletedTurns(data.completedTurns || 0);
      setActiveQuestion(data.activeQuestion || null);
      if (data.isComplete) setPhase(PHASE.DONE);
      else setPhase(PHASE.PRECHECK);
    } catch (err) {
      toast.error(err.message || 'Failed to load interview');
      navigate('/student?tab=conversationalAiInterviews');
    }
  }, [interviewId, navigate, toast]);

  useEffect(() => {
    loadSession();
    return () => {
      proctorRef.current?.destroy?.();
      proctorRef.current = null;
      streamRef.current = null;
      stopSpeech();
    };
  }, [loadSession, stopSpeech]);

  const ensureProctorEngine = useCallback(() => {
    if (proctorRef.current) return proctorRef.current;
    const cfg = { ...defaultProctoringConfig, ...(session?.proctoringConfig || {}) };
    const engine = new ProctoringEngine({
      getVideoEl: () => videoRef.current,
      getSessionId: () => enrollmentId,
      config: cfg,
      logViolation: async (type, details, meta) => {
        await api.logConversationalViolation(enrollmentId, { type, details, meta });
        setViolations((v) => v + 1);
      },
      uploadScreenshot: async (blob, meta) => api.uploadConversationalScreenshot(enrollmentId, blob, meta),
      onWarning: (payload) => {
        const msg = typeof payload === 'string' ? payload : payload?.message;
        if (msg) toast.error(msg);
      },
    });
    proctorRef.current = engine;
    return engine;
  }, [enrollmentId, session?.proctoringConfig, toast]);

  const syncCameraFromEngine = useCallback(() => {
    const engine = proctorRef.current;
    if (!engine) return;
    engine.reattachVideo();
    streamRef.current = engine.getStream();
    setCameraLive(engine.isCameraActive());
  }, []);

  const startCameraPrecheck = async () => {
    setPrecheck((p) => ({ ...p, error: '' }));
    try {
      const engine = ensureProctorEngine();
      await engine.initCamera({ withAudio: true });
      syncCameraFromEngine();
      const active = engine.isCameraActive();
      setPrecheck((p) => ({
        ...p,
        cameraReady: active,
        micReady: Boolean(engine.getStream()?.getAudioTracks?.().length),
      }));
    } catch (e) {
      const msg =
        e?.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow access in browser settings.'
          : 'Camera and microphone permission required.';
      setPrecheck((p) => ({
        ...p,
        error: msg,
        cameraReady: false,
        micReady: false,
      }));
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

  useEffect(() => {
    if (phase !== PHASE.PRECHECK) return;
    const onFsChange = () => {
      setPrecheck((p) => ({ ...p, fullscreen: !!document.fullscreenElement }));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [phase]);

  // Re-attach stream when <video> remounts (pre-check → live UI).
  useEffect(() => {
    if (phase !== PHASE.PRECHECK && phase !== PHASE.LIVE) return;
    syncCameraFromEngine();
    const timers = [50, 150, 500, 1200].map((ms) => setTimeout(syncCameraFromEngine, ms));
    return () => timers.forEach(clearTimeout);
  }, [phase, syncCameraFromEngine]);

  useEffect(() => {
    if (phase !== PHASE.LIVE) return;
    const tick = () => setCameraLive(proctorRef.current?.isCameraActive() ?? false);
    tick();
    const id = setInterval(tick, 800);
    return () => clearInterval(id);
  }, [phase]);

  const startInterview = async () => {
    if (!(precheck.cameraReady && precheck.fullscreen && precheck.micReady)) return;
    setStarting(true);
    try {
      const startRes = await api.startConversationalSession(enrollmentId);
      if (startRes.activeQuestion) setActiveQuestion(startRes.activeQuestion);
      const engine = ensureProctorEngine();
      if (!engine.getStream()) {
        await engine.initCamera({ withAudio: true });
      }
      syncCameraFromEngine();
      await engine.start();
      await speakWelcome();
      if (session?.instructions?.trim()) {
        await speakInstructions(session.instructions);
      }
      setPhase(PHASE.LIVE);
      setPhaseStep('idle');
    } catch (err) {
      toast.error(err.message || 'Could not start');
    } finally {
      setStarting(false);
    }
  };

  const startRecording = () => {
    const stream = proctorRef.current?.getStream() || streamRef.current;
    if (!stream) return false;
    chunksRef.current = [];
    const mimeType = pickRecorderMimeType();
    if (!mimeType) return false;

    try {
      const options = { mimeType };
      const rec = new MediaRecorder(stream, options);
      recordedMimeRef.current = mimeType;
      recorderRef.current = rec;
      recordStartRef.current = Date.now();
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start(250);
      return true;
    } catch {
      return false;
    }
  };

  const stopRecording = () =>
    new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        resolve(null);
        return;
      }
      const mime = recordedMimeRef.current || 'video/webm';
      rec.onstop = () => {
        // Final dataavailable can arrive after onstop in some browsers.
        window.setTimeout(() => {
          const blob = new Blob(chunksRef.current, { type: mime });
          resolve({
            blob,
            duration: Math.round((Date.now() - (recordStartRef.current || Date.now())) / 1000),
          });
        }, 250);
      };
      try {
        if (rec.state === 'recording') rec.requestData();
      } catch {
        // ignore — not supported everywhere
      }
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
  }, [phase, currentQ?.id, phaseStep, runQuestionFlow]);

  useEffect(() => {
    if (phaseStep !== 'prep' || prepLeft <= 0) return;
    const t = setInterval(() => {
      setPrepLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setPhaseStep('answer');
          setAnswerLeft(currentQ?.answerTimeSeconds ?? 120);
          if (!startRecording()) {
            toast.error('Recording is not supported in this browser. Try Chrome or Edge.');
            setPhaseStep('prep');
            setPrepLeft(5);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phaseStep, prepLeft, currentQ?.answerTimeSeconds]);

  const playAcknowledgementFlow = useCallback(
    async (acknowledgement, transition) => {
      setPhaseStep('acknowledging');
      await speak(acknowledgement);
      setPhaseStep('transitioning');
      await speak(transition);
    },
    [speak]
  );

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
      const res = await api.submitConversationalAnswer(enrollmentId, result.blob, {
        questionId: currentQ.id,
        durationSeconds: result.duration,
      });

      setCompletedTurns(res.completedTurns ?? completedTurns + 1);

      await playAcknowledgementFlow(
        res.acknowledgement || 'Thank you for your response.',
        res.transition || "Let's continue."
      );

      if (res.isComplete || !res.nextQuestion) {
        proctorRef.current?.destroy?.();
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        await speakCompletion();
        setPhase(PHASE.DONE);
      } else {
        setActiveQuestion(res.nextQuestion);
        setPhaseStep('idle');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit');
      setPhaseStep('answer');
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    currentQ,
    enrollmentId,
    completedTurns,
    toast,
    playAcknowledgementFlow,
    speakCompletion,
  ]);

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

  const phaseLabel = useMemo(() => {
    switch (phaseStep) {
      case 'speak':
        return 'AI asking question';
      case 'prep':
        return 'Preparation';
      case 'answer':
        return 'Recording your answer';
      case 'uploading':
        return 'Saving response';
      case 'acknowledging':
        return 'AI responding';
      case 'transitioning':
        return 'Moving to next question';
      default:
        return speaking ? 'AI speaking' : 'Standby';
    }
  }, [phaseStep, speaking]);

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
          Initializing Conversational Interview
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
          <h2 className="text-3xl font-black text-white tracking-tight mb-3">Interview Complete</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            Your responses are saved securely. AI analysis and reviewer feedback will be available to your placement team.
          </p>
          <button
            type="button"
            onClick={() => navigate('/student?tab=conversationalAiInterviews')}
            className="mt-8 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (phase === PHASE.PRECHECK) {
    const allChecksPass = precheck.cameraReady && precheck.micReady && precheck.fullscreen;
    const passedCount = [precheck.cameraReady, precheck.micReady, precheck.fullscreen].filter(Boolean).length;
    const validationChecks = [
      {
        key: 'camera',
        label: 'Camera active',
        hint: 'Webcam feed is live',
        icon: Video,
        pass: precheck.cameraReady,
      },
      {
        key: 'mic',
        label: 'Microphone active',
        hint: 'Mic input is available',
        icon: Mic,
        pass: precheck.micReady,
      },
      {
        key: 'fullscreen',
        label: 'Fullscreen enabled',
        hint: 'Interview runs in fullscreen',
        icon: Maximize2,
        pass: precheck.fullscreen,
      },
    ];

    return (
      <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />

        <header className="relative z-10 shrink-0 px-5 sm:px-8 py-4 flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight truncate">
              {session?.title}
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.18em] text-[10px] mt-0.5">
              Conversational AI Interview · {formatInterviewType(session?.interviewType)}
            </p>
          </div>
          <button
            type="button"
            onClick={startInterview}
            disabled={starting || !allChecksPass}
            className={`shrink-0 px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wide transition-all flex items-center gap-1.5 ${
              starting || !allChecksPass
                ? 'bg-slate-700/60 text-slate-400 cursor-not-allowed border border-slate-600'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
            }`}
          >
            {starting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Starting…</span>
              </>
            ) : (
              <>
                <span>Start Interview</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </header>

        <main className="relative z-10 flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1.6fr_1fr] overflow-hidden">
          <section className="flex flex-col min-h-0 p-5 sm:p-6 lg:p-8 overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 shrink-0">Camera Preview</p>
            <div className="flex-1 min-h-[220px] sm:min-h-[300px] w-full rounded-2xl overflow-hidden border border-slate-800 bg-black relative">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              {precheck.cameraReady && (
                <div className="absolute top-4 left-4 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-full flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Live Preview</span>
                </div>
              )}
            </div>
            {precheck.error && <p className="text-xs text-rose-300 mt-2">{precheck.error}</p>}
          </section>

          <section className="flex flex-col min-h-0 p-5 sm:p-6 md:justify-center md:items-center overflow-y-auto">
            <div className="w-full max-w-md space-y-4">
              <div className="rounded-2xl bg-slate-800/25 border border-slate-700/35 p-5 space-y-5">
                <div className="flex items-start gap-3 pb-3.5 border-b border-slate-700/40">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-widest mb-1">Important Note</h4>
                    <p className="text-xs text-amber-200/70 leading-snug">
                      Webcam and microphone are required. The AI will ask questions aloud and record your answers.
                      Tab switches or leaving fullscreen may be logged as violations.
                    </p>
                  </div>
                </div>

                {session?.instructions?.trim() && (
                  <div className="flex items-start gap-3 pb-3.5 border-b border-slate-700/40">
                    <Volume2 className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-1">Instructions</h4>
                      <p className="text-xs text-indigo-200/70 leading-snug">{session.instructions}</p>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Validation Checks</p>
                    <span
                      className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        allChecksPass ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/60 text-slate-400'
                      }`}
                    >
                      {passedCount}/3
                    </span>
                  </div>

                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mb-3.5">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${(passedCount / 3) * 100}%` }}
                    />
                  </div>

                  <div className="rounded-xl bg-slate-900/40 overflow-hidden divide-y divide-slate-700/35">
                    {validationChecks.map((check) => {
                      const Icon = check.icon;
                      return (
                        <div key={check.key} className="flex items-center gap-3 px-3.5 py-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              check.pass ? 'bg-emerald-500/15' : 'bg-slate-700/40'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${check.pass ? 'text-emerald-400' : 'text-slate-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-200">{check.label}</p>
                            <p className="text-[10px] text-slate-500 truncate">{check.hint}</p>
                          </div>
                          <div
                            className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase ${
                              check.pass ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {check.pass ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-700/40 space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Setup</p>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={startCameraPrecheck}
                      className="flex-1 px-3.5 py-3 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 border border-indigo-500/40 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <Video className="w-4 h-4" />
                      Enable Camera
                    </button>
                    <button
                      type="button"
                      onClick={enterFullscreenPrecheck}
                      className="flex-1 px-3.5 py-3 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 border border-indigo-500/40 text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <Maximize2 className="w-4 h-4" />
                      Fullscreen
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 text-center leading-snug px-1">
                Start only after all checks pass. Up to {totalQ} conversational exchanges.
                {voiceName ? ` Interviewer voice: ${voiceName}.` : ''}
              </p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-200">
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Center — question & recording */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 gap-4 p-5 sm:p-6 lg:p-8 w-full">
              <div className="shrink-0 w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-black text-white tracking-tight truncate">{session?.title}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Live · Proctored</span>
                    </div>
                  </div>
                </div>
                <div
                  className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border shrink-0 ${
                    phaseStep === 'answer'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-slate-800/50 border-slate-700/50 text-white'
                  }`}
                >
                  <Clock className={`w-4 h-4 ${phaseStep === 'answer' ? 'animate-pulse' : ''}`} />
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-60">{phaseLabel}</p>
                    <p className="text-sm font-black tabular-nums">
                      {phaseStep === 'prep' ? `${prepLeft}s` : phaseStep === 'answer' ? `${answerLeft}s` : `${progressPct}%`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="shrink-0 w-full flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                  Exchange {Math.min(completedTurns + 1, totalQ)} of {totalQ}
                </span>
                {speaking && (
                  <span className="px-3 py-1 bg-violet-500/10 text-violet-300 rounded-lg text-[10px] font-black uppercase border border-violet-500/20 animate-pulse">
                    AI speaking
                  </span>
                )}
              </div>

              <div className="shrink-0 w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-3">AI is asking</p>
                <h3 className="text-xl lg:text-2xl xl:text-3xl font-black text-white leading-snug">{currentQ?.questionText}</h3>
                {currentQ?.notes && (
                  <p className="text-slate-400 text-sm mt-4 leading-relaxed">{currentQ.notes}</p>
                )}
              </div>

              <div className="flex-1 min-h-0 w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center gap-5">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    phaseStep === 'answer'
                      ? 'bg-rose-500 animate-pulse shadow-2xl shadow-rose-500/40'
                      : phaseStep === 'acknowledging' || phaseStep === 'transitioning'
                        ? 'bg-violet-600 shadow-lg shadow-violet-500/30'
                        : 'bg-slate-800 border border-slate-700'
                  }`}
                >
                  {phaseStep === 'acknowledging' || phaseStep === 'transitioning' ? (
                    <Volume2 className="w-9 h-9 text-white animate-pulse" />
                  ) : (
                    <Mic className={`w-9 h-9 ${phaseStep === 'answer' ? 'text-white' : 'text-slate-500'}`} />
                  )}
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{phaseLabel}</p>

                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => currentQ && speak(currentQ.questionText)}
                    disabled={speaking || !speechSupported}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Replay question
                  </button>
                  <select
                    value={voiceRate}
                    onChange={(e) => setVoiceRate(Number(e.target.value))}
                    className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-300"
                    title="Slight speed adjustment — same professional interviewer voice"
                  >
                    <option value={0.92}>Slightly slower</option>
                    <option value={1}>Professional pace</option>
                    <option value={1.05}>Slightly faster</option>
                  </select>
                </div>

                {phaseStep === 'answer' && (
                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={submitting}
                    className="px-10 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" /> Submit answer
                  </button>
                )}
              </div>
          </div>
        </main>

        {/* Right — session info + camera */}
        <aside className="w-[min(300px,28vw)] bg-slate-900 border-l border-slate-800 flex flex-col p-4 gap-4 shrink-0 overflow-hidden min-h-0">
          <div className="shrink-0 space-y-3">
            <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center mb-2.5">
                <Bot className="w-5 h-5 text-indigo-300" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">AI Interviewer</p>
              <p className="text-sm font-bold text-white mt-0.5">Conversational</p>
              <p className="text-[10px] text-slate-500 mt-1">{formatInterviewType(session?.interviewType)}</p>
              {voiceName && (
                <p className="text-[9px] text-indigo-400/80 mt-2 leading-tight truncate" title={voiceName}>
                  Voice: {voiceName}
                </p>
              )}
            </div>

            <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-800">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Progress</p>
              <p className="text-2xl font-black text-white tabular-nums">{progressPct}%</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Exchange {Math.min(completedTurns + 1, totalQ)} of {totalQ}
              </p>
              <div className="h-1.5 bg-slate-700 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ProctoringConsole
              videoRef={videoRef}
              violations={violations}
              cameraLive={cameraLive}
              compact
              borderless
              title="Your Camera"
              mirrored
              onVideoMount={() => syncCameraFromEngine()}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
