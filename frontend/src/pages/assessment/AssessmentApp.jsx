import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, AlertTriangle, Clock, ChevronRight, ChevronLeft, 
  CheckCircle, XCircle, Loader2, Video, Code, FileText,
  Maximize2, Terminal, AlertCircle, Save, Send, Ban, ScanFace
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import {
  CodingWorkspace,
  parseCodingAnswer,
  serializeCodingAnswer,
  parseTestCases,
  parseExamples,
  parseStarterCodesByLang,
  getStarterForLanguage,
  parseAllowedCodingLanguages,
} from '../../coding-engine';
import CodingProblemPanel from '../../components/coding/CodingProblemPanel';
import ProctoringConsole from '../../components/assessment/ProctoringConsole';
import { ProctoringEngine } from '../../proctoring-engine/ProctoringEngine';
import { defaultProctoringConfig } from '../../proctoring-engine/constants';
import {
  getAssessmentEntryStatus,
  formatAssessmentWindow,
} from '../../utils/assessmentEntryWindow';
import { getJitsiDomain } from '../../utils/jitsiMeet';
import { normalizeMcqAnswer } from '../../utils/mcqAnswers';
import {
  getRemainingSecondsFromSession,
  resolveSessionRemainingSeconds,
} from '../../utils/assessmentTimer';
import { initSocket } from '../../services/socket';
import { ProctoringBroadcaster } from '../../proctoring-engine/liveProctoringRtc';

function MetaSegment({ label, highlight = false }) {
  return (
    <div className="flex items-center px-4 py-3 border-l border-slate-200 first:border-l-0">
      <span
        className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${
          highlight ? 'text-indigo-600' : 'text-slate-600'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function QuestionMetaBar({ question, questionIndex }) {
  const metaSegments = [
    { label: question?.type },
    ...(question?.difficulty ? [{ label: question.difficulty }] : []),
    ...(question?.points != null ? [{ label: `${question.points} pts`, highlight: true }] : []),
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden shrink-0">
      <div className="flex items-stretch justify-between">
        <MetaSegment label={`Question ${questionIndex + 1}`} />
        <div className="flex items-stretch border-l border-slate-200">
          {metaSegments.map((seg) => (
            <MetaSegment key={seg.label} label={seg.label} highlight={seg.highlight} />
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionPanelShell({ question, questionIndex, children, layout = 'default' }) {
  const isCardLayout = layout === 'mcq' || layout === 'descriptive';

  if (isCardLayout) {
    return (
      <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto text-slate-900">
        <QuestionMetaBar question={question} questionIndex={questionIndex} />
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-sm flex-1 min-h-0">
          <div className="space-y-3 pb-5 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {question?.questionText || 'Question'}
            </h2>
            {question?.description ? (
              <p className="text-slate-600 text-sm leading-relaxed font-medium whitespace-pre-wrap">
                {question.description}
              </p>
            ) : null}
          </div>
          {children}
        </section>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden border border-slate-800">
      <div className="flex flex-col h-full min-h-0 overflow-y-auto bg-[#f8f9fb] text-slate-900">
        <div className="px-5 py-4 border-b border-slate-200 bg-white sticky top-0 z-10 shrink-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              Question {questionIndex + 1}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              {question?.type}
            </span>
            {question?.difficulty && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                {question.difficulty}
              </span>
            )}
            {question?.points != null && (
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                {question.points} pts
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-900 leading-snug">
            {question?.questionText || 'Question'}
          </h2>
        </div>
        <div className="flex-1 min-h-0 flex flex-col px-5 py-5 gap-6">
          {question?.description ? (
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                Description
              </h3>
              <div className="text-slate-700 whitespace-pre-wrap font-medium text-sm leading-relaxed">
                {question.description}
              </div>
            </section>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AssessmentApp() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  
  // Role & Session Detection
  const searchParams = new URLSearchParams(location.search);
  const role = searchParams.get('role') || 'student';
  const studentIdParam = searchParams.get('studentId');
  const isInterviewer = role === 'interviewer';

  // Core State
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState(null);
  const [session, setSession] = useState(null);
  const sessionRef = useRef(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // Stores MCQ options or Code snippets
  const [cameraLive, setCameraLive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPreCheckDone, setIsPreCheckDone] = useState(false);
  const [violations, setViolations] = useState(0);
  const [lastViolationType, setLastViolationType] = useState(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const submittingRef = useRef(false);
  
  // Refs
  const videoRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const canvasRef = useRef(null);

  const proctorRef = useRef(null);
  const proctorRtcRef = useRef(null);
  const [precheck, setPrecheck] = useState({
    cameraReady: false,
    fullscreen: false,
    faceOk: false,
    faceLoading: false,
    faceDetectorFailed: false,
    faceHint: '',
    error: '',
  });
  const [starting, setStarting] = useState(false);
  const precheckIntervalRef = useRef(null);

  const [entryStatus, setEntryStatus] = useState('ALLOWED'); // ALLOWED, TOO_EARLY, TOO_LATE, WAITING

  // 1. Initialize Assessment & Session
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const details = await api.getAssessmentDetails(assessmentId);
        const allowedCodingLanguages = parseAllowedCodingLanguages(details.config);
        const questions = (details.questions || []).map((q) => ({
          ...q,
          testCases: parseTestCases(q.testCases),
          starterCodesByLang: parseStarterCodesByLang(q.starterCode),
        }));
        setAssessment({ ...details, questions, allowedCodingLanguages });
        // Student timer is set from session.startTime when the exam starts / resumes
        setTimeLeft(isInterviewer ? details.duration * 60 : 0);

        if (isInterviewer) {
          if (studentIdParam) {
            const profile = await api.getStudentProfile(studentIdParam);
            setStudentProfile(profile);
          }
          setIsPreCheckDone(true);
          setLoading(false);
        } else {
          const entry = getAssessmentEntryStatus(details);
          setEntryStatus(entry.status);

          // Fetch details but DO NOT start the session if they haven't finished PreCheck
          // The session will be started in startAssessment()
          setLoading(false);
          if (entry.status !== 'ALLOWED') return;
        }
      } catch (e) {
        console.error('Init failed:', e);
        toast?.error('Failed to initialize assessment');
        navigate(isInterviewer ? '/admin' : '/student');
      }
    };
    init();
  }, [assessmentId, isInterviewer, studentIdParam]);

  useEffect(() => {
    if (isInterviewer || loading) return;
    if (entryStatus !== 'TOO_EARLY' && entryStatus !== 'TOO_LATE') return;

    const tick = async () => {
      try {
        const fresh = await api.getAssessmentDetails(assessmentId);
        setAssessment(fresh);
        const entry = getAssessmentEntryStatus(fresh);
        setEntryStatus(entry.status);
      } catch {
        /* ignore poll errors */
      }
    };

    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [assessmentId, entryStatus, isInterviewer, loading]);

  // 2. Timer Logic
  useEffect(() => {
    if (!loading && isPreCheckDone && timeLeft > 0 && !isInterviewer) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            submitAssessment();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerIntervalRef.current);
    }
  }, [loading, isPreCheckDone, isInterviewer]);

  // Re-sync countdown from session start (tab return, background throttling)
  useEffect(() => {
    if (!isPreCheckDone || isInterviewer || !session?.startTime || !assessment?.duration) return;

    const syncTimer = () => {
      const remaining = getRemainingSecondsFromSession(session, assessment.duration);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timerIntervalRef.current);
        submitAssessment();
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') syncTimer();
    };

    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(syncTimer, 30000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(id);
    };
  }, [isPreCheckDone, isInterviewer, session?.id, session?.startTime, assessment?.duration]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const logViolation = useCallback(async (type, details, meta) => {
    const sess = sessionRef.current;
    if (!sess || isInterviewer) return;
    try {
      await api.logProctoringViolation(sess.id, { type, details, meta });
      setViolations(v => v + 1);
      setLastViolationType(type.replace(/_/g, ' '));
      toast?.warning(`Proctoring Alert: ${type.replace(/_/g, ' ')} detected.`);
    } catch (e) {
      console.error('Violation log failed', e);
    }
  }, [isInterviewer, toast]);

  // 4. Jitsi Integration (Configurable and robust)
  useEffect(() => {
    if (!loading && assessment?.type === 'MOCK_INTERVIEW_LIVE' && isPreCheckDone) {
      loadJitsiScript();
    }
    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [loading, assessment, isPreCheckDone]);

  const loadJitsiScript = () => {
    const jitsiDomain = getJitsiDomain();
    const scriptId = 'jitsi-external-api';
    
    const onScriptLoad = () => {
      if (window.temp_define) {
        window.define = window.temp_define;
        delete window.temp_define;
      }
      initJitsi(jitsiDomain);
    };

    if (window.JitsiMeetExternalAPI) {
      onScriptLoad();
      return;
    }

    let script = document.getElementById(scriptId);
    if (script) {
      const interval = setInterval(() => {
        if (window.JitsiMeetExternalAPI) {
          clearInterval(interval);
          onScriptLoad();
        }
      }, 100);
      return;
    }

    if (window.define && window.define.amd) {
      window.temp_define = window.define;
      window.define = undefined;
    }

    script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://${jitsiDomain}/external_api.js`;
    script.async = true;
    script.onload = onScriptLoad;
    script.onerror = () => {
      if (window.temp_define) {
        window.define = window.temp_define;
        delete window.temp_define;
      }
    };
    document.head.appendChild(script);
  };

  const initJitsi = (domain) => {
    if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) return;
    
    jitsiContainerRef.current.innerHTML = '';
    
    const roomName = `PWIOI_Assessment_${assessmentId}_${isInterviewer ? studentIdParam : session?.studentId}`;
    const options = {
      roomName,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: { displayName: isInterviewer ? 'Interviewer' : (studentProfile?.fullName || 'Candidate') },
      configOverwrite: { prejoinPageEnabled: false, disableDeepLinking: true, enableWelcomePage: false },
      interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false, SHOW_WATERMARK_FOR_GUESTS: false }
    };
    const apiInstance = new window.JitsiMeetExternalAPI(domain, options);
    jitsiApiRef.current = apiInstance;
  };

  // 5. Actions
  const getProctoringConfig = useCallback(() => {
    try {
      const cfg = assessment?.config ? (typeof assessment.config === 'string' ? JSON.parse(assessment.config) : assessment.config) : {};
      const p = cfg?.proctoring || {};
      return {
        ...defaultProctoringConfig,
        enabled: true,
        cameraRequired: p.webcam !== false,
        micRequired: p.mic === true,
        tabSwitch: p.tabSwitch !== false,
        windowBlur: true,
        fullscreenRequired: p.fullscreen !== false,
        periodicSnapshotBaseMs: Math.max(25000, (Number(p.snapshotInterval) || 45) * 1000),
        periodicSnapshotJitterMs: Math.min(15000, Math.max(5000, Math.round((Number(p.snapshotInterval) || 60) * 1000 * 0.15))),
        screenshotDebounceMs: 8000,
        liveFrameToAdmin: false,
        faceMonitoring: true,
        autoSubmit: { enabled: false, threshold: 10 },
      };
    } catch {
      return { ...defaultProctoringConfig };
    }
  }, [assessment]);

  const ensureProctorEngine = useCallback(async () => {
    if (proctorRef.current) return proctorRef.current;
    if (!videoRef.current) throw new Error('Video element not ready');

    const cfg = getProctoringConfig();

    const engine = new ProctoringEngine({
      getVideoEl: () => videoRef.current,
      getSessionId: async () => sessionRef.current?.id,
      logViolation: async (type, details, meta) => logViolation(type, details, meta),
      uploadScreenshot: async (blob, meta) => {
        const sess = sessionRef.current;
        if (!sess?.id) return;
        await api.uploadProctoringScreenshot(sess.id, blob, meta);
      },
      onWarning: ({ level, message }) => {
        if (level === 'error') toast?.error(message);
        else if (level === 'warn') toast?.warning(message);
      },
      onAutoSubmit: ({ reason }) => {
        toast?.warning(
          reason
            ? `${reason}. Your attempt was not submitted — finish manually when ready.`
            : 'Proctoring alert recorded. Finish manually when ready.'
        );
      },
      config: cfg,
    });
    proctorRef.current = engine;
    return engine;
  }, [getProctoringConfig, logViolation, session, toast, assessmentId]);

  const runPrecheckValidation = useCallback(async () => {
    const e = proctorRef.current;
    if (!e) return;
    const streamActive = e.isCameraActive();
    const detector = e.getFaceDetectorStatus();
    const faceCount = e.cfg.faceMonitoring && detector.state === 'ready'
      ? await e.detectFacesOnce()
      : e.cfg.faceMonitoring
        ? 0
        : 1;

    let faceHint = '';
    if (e.cfg.faceMonitoring && detector.state === 'ready') {
      if (faceCount === 0) faceHint = 'No face detected — center yourself in the frame with good lighting.';
      else if (faceCount > 1) faceHint = 'Multiple faces detected — only you should be visible on camera.';
    }

    setPrecheck((p) => ({
      ...p,
      cameraReady: streamActive,
      fullscreen: e.cfg.fullscreenRequired ? e.isFullscreen : true,
      faceLoading: e.cfg.faceMonitoring && detector.state === 'loading' && streamActive,
      faceDetectorFailed: detector.state === 'failed',
      faceOk: e.cfg.faceMonitoring ? faceCount === 1 : true,
      faceHint,
      error:
        detector.state === 'failed'
          ? detector.error || 'Face detection could not load. Check your internet and click Retry below.'
          : streamActive
            ? ''
            : p.error,
    }));
  }, []);

  const retryFaceDetection = async () => {
    const e = proctorRef.current;
    if (!e) return;
    setPrecheck((p) => ({ ...p, faceLoading: true, faceDetectorFailed: false, error: '', faceHint: '' }));
    await e.retryFaceDetector();
    await runPrecheckValidation();
  };

  const startCameraPrecheck = async () => {
    try {
      setPrecheck((p) => ({ ...p, error: '', faceLoading: true }));
      const engine = await ensureProctorEngine();
      await engine.initCamera({ withAudio: engine.cfg.micRequired || engine.cfg.audioMonitoring });
      await runPrecheckValidation();

      if (precheckIntervalRef.current) clearInterval(precheckIntervalRef.current);
      precheckIntervalRef.current = setInterval(() => {
        runPrecheckValidation().catch(() => {});
      }, 1500);
    } catch (e) {
      const msg =
        e?.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access in browser settings and try again.'
          : e?.message || 'Failed to start camera';
      setPrecheck((p) => ({ ...p, error: msg, cameraReady: false, faceLoading: false }));
      toast?.error('Camera access is required for proctoring');
    }
  };

  useEffect(() => {
    if (isPreCheckDone || isInterviewer || loading) return;
    import('../../proctoring-engine/mediapipeFaceDetector')
      .then((m) => m.ensureFaceDetector())
      .catch(() => {});
  }, [isPreCheckDone, isInterviewer, loading]);

  // Re-attach camera stream when exam UI mounts (new <video> DOM node after pre-check)
  useEffect(() => {
    if (!isPreCheckDone || isInterviewer || loading || !session) return;
    const attach = () => proctorRef.current?.reattachVideo();
    attach();
    const t = setTimeout(attach, 100);
    const t2 = setTimeout(attach, 500);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [isPreCheckDone, isInterviewer, loading, session?.id]);

  useEffect(() => {
    if (!isPreCheckDone || isInterviewer) return;
    const tick = () => setCameraLive(proctorRef.current?.isCameraActive() ?? false);
    tick();
    const id = setInterval(tick, 800);
    return () => clearInterval(id);
  }, [isPreCheckDone, isInterviewer, session?.id]);

  useEffect(() => {
    if (isPreCheckDone || isInterviewer) return;
    const onFsChange = () => runPrecheckValidation().catch(() => {});
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [isPreCheckDone, isInterviewer, runPrecheckValidation]);

  const enterFullscreenPrecheck = async () => {
    const engine = proctorRef.current;
    if (!engine) return;
    const ok = await engine.requestFullscreen();
    setPrecheck((p) => ({ ...p, fullscreen: ok || engine.isFullscreen }));
    runPrecheckValidation().catch(() => {});
  };

  const startAssessment = async () => {
    try {
      setStarting(true);
      const engine = await ensureProctorEngine();
      if (!precheck.cameraReady) {
        await startCameraPrecheck();
      }
      if (engine.cfg.fullscreenRequired && !engine.isFullscreen) {
        await engine.requestFullscreen();
      }

      const gate = await engine.precheck();
      if (!gate.ok) {
        const msg =
          gate.reason === 'FULLSCREEN_REQUIRED' ? 'Fullscreen is required to start.' :
            gate.reason === 'CAMERA_REQUIRED' ? 'Camera is not active. Click Enable Camera and allow permission.' :
              gate.reason === 'NO_FACE_DETECTED' ? 'Face not detected. Sit in front of the camera with good lighting.' :
                gate.reason === 'MULTIPLE_FACES' ? 'Multiple faces detected. Only one person should be visible.' :
                  'Pre-check failed. Please allow camera and stay in fullscreen.';
        toast?.error(msg);
        return;
      }

      const fresh = await api.getAssessmentDetails(assessmentId);
      setAssessment(fresh);
      const entry = getAssessmentEntryStatus(fresh);
      if (entry.status === 'TOO_EARLY') {
        setEntryStatus('WAITING');
        setIsPreCheckDone(true);
        return;
      }
      if (entry.status === 'TOO_LATE') {
        setEntryStatus('TOO_LATE');
        toast?.error('The assessment entry window has closed.');
        return;
      }

      await executeTestStart();
      initSocket();
      await engine.start();

      if (proctorRtcRef.current) {
        proctorRtcRef.current.stop();
      }
      const sess = sessionRef.current;
      if (sess?.id) {
        proctorRtcRef.current = new ProctoringBroadcaster({
          sessionId: sess.id,
          assessmentId,
          getStream: () => proctorRef.current?.getStream?.() ?? null,
        });
        await proctorRtcRef.current.start();
      }
    } finally {
      setStarting(false);
    }
  };

  const executeTestStart = async () => {
    try {
      setLoading(true);
      const sess = await api.startAssessmentSession(assessmentId, { silent: true });
      const remaining = resolveSessionRemainingSeconds(sess, assessment?.duration ?? sess.durationMinutes);

      if (remaining <= 0) {
        toast?.error('Assessment time has expired');
        navigate('/student/dashboard');
        return;
      }

      sessionRef.current = sess;
      setSession(sess);
      setTimeLeft(remaining);
      if (sess.responses) setAnswers(JSON.parse(sess.responses));
      setIsPreCheckDone(true);
      setEntryStatus('ALLOWED');
    } catch (e) {
      if (e.response?.data?.code === 'TIME_EXPIRED') {
        toast?.error('Assessment time has expired');
        navigate('/student/dashboard');
        return;
      }
      if (e.response?.data?.error === 'Assessment already completed') {
        toast?.error('You have already completed this assessment');
        navigate('/student/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // Video Recording for VIDEO questions
  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(videoRef.current.srcObject);
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      // In a real app, upload blob to Cloudinary/S3
      handleAnswerChange(currentQuestion.id, URL.createObjectURL(blob));
      toast?.success('Video answer recorded successfully');
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  const submitAssessment = async () => {
    try {
      if (submittingRef.current) return;
      const sess = sessionRef.current;
      if (!sess?.id) return;
      submittingRef.current = true;
      await api.completeAssessment(sess.id, { answers: JSON.stringify(answers) });
      toast?.success('Assessment submitted successfully');
      if (document.fullscreenElement) document.exitFullscreen();
      try {
        proctorRtcRef.current?.stop();
        proctorRef.current?.destroy?.();
      } catch {}
      navigate('/student/dashboard');
    } catch (e) {
      toast?.error('Submission failed');
    } finally {
      submittingRef.current = false;
    }
  };

  useEffect(() => {
    return () => {
      try {
        if (precheckIntervalRef.current) clearInterval(precheckIntervalRef.current);
      } catch {}
      try {
        proctorRtcRef.current?.stop();
        proctorRef.current?.destroy?.();
      } catch {}
    };
  }, []);

  const recheckEntryWindow = useCallback(async () => {
    try {
      setLoading(true);
      const fresh = await api.getAssessmentDetails(assessmentId);
      setAssessment(fresh);
      const entry = getAssessmentEntryStatus(fresh);
      setEntryStatus(entry.status);
      if (entry.status === 'ALLOWED') {
        toast?.success('You can enter the assessment now.');
      }
    } catch {
      toast?.error('Could not refresh assessment schedule');
    } finally {
      setLoading(false);
    }
  }, [assessmentId, toast]);

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Shield className="w-6 h-6 text-indigo-500 animate-pulse" />
        </div>
      </div>
      <p className="text-slate-400 font-black uppercase tracking-widest text-xs animate-pulse">Initializing Secure Environment</p>
    </div>
  );

  if (entryStatus === 'TOO_EARLY') {
    const entry = assessment ? getAssessmentEntryStatus(assessment) : null;
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 border border-indigo-500/30 shadow-2xl shadow-indigo-500/20">
           <Clock className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight mb-3">You're Early</h2>
        <p className="text-slate-400 max-w-md mx-auto">
          Entry opens at{' '}
          <span className="text-white font-bold">{formatAssessmentWindow(entry?.entryOpensAt)}</span>.
          {entry?.joinWindow && (
            <> ( {entry.joinWindow.opensMinutesBeforeStart} minutes before the scheduled start).</>
          )}
        </p>
        {assessment?.startTime && (
          <p className="text-slate-500 text-xs mt-3">Scheduled start: {formatAssessmentWindow(assessment.startTime)}</p>
        )}
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <button type="button" onClick={recheckEntryWindow} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all text-sm">
            Check again
          </button>
          <button onClick={() => navigate('/student')} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all text-sm">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (entryStatus === 'TOO_LATE') {
    const entry = assessment ? getAssessmentEntryStatus(assessment) : null;
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="w-24 h-24 bg-rose-500/20 rounded-full flex items-center justify-center mb-6 border border-rose-500/30 shadow-2xl shadow-rose-500/20">
           <Ban className="w-10 h-10 text-rose-400" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight mb-3">Entry Closed</h2>
        <p className="text-slate-400 max-w-md mx-auto">
          The last time to join was{' '}
          <span className="text-white font-bold">{formatAssessmentWindow(entry?.entryClosesAt)}</span>.
          {entry?.joinWindow && (
            <> ({entry.joinWindow.closesMinutesAfterStart} minutes after scheduled start).</>
          )}
        </p>
        {assessment?.startTime && (
          <p className="text-slate-500 text-xs mt-3 max-w-md">
            Scheduled start: {formatAssessmentWindow(assessment.startTime)}
            {assessment.endTime ? ` · Overall end: ${formatAssessmentWindow(assessment.endTime)}` : ''}
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={recheckEntryWindow}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all text-sm"
          >
            Check again
          </button>
          <button onClick={() => navigate('/student/dashboard')} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all text-sm">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (entryStatus === 'WAITING' && isPreCheckDone) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
        
        <div className="max-w-2xl w-full bg-slate-900/40 backdrop-blur-2xl rounded-[3rem] p-12 border border-slate-800 shadow-2xl relative z-10 flex flex-col items-center">
           <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 border border-amber-500/20">
              <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
           </div>
           <h2 className="text-3xl font-black text-white tracking-tight mb-4">Holding Room</h2>
           <p className="text-slate-400 max-w-md mx-auto mb-8 font-medium leading-relaxed">
             You have successfully completed the hardware pre-check. Please wait here. The exam questions will automatically load exactly at the scheduled start time.
           </p>
           
           <div className="bg-slate-800/50 px-8 py-6 rounded-3xl border border-slate-700 w-full mb-8">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Scheduled Start Time</p>
              <p className="text-2xl font-black text-white">{new Date(assessment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
           </div>
           
           <button 
             onClick={executeTestStart}
             className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20"
           >
             Start Exam Now
           </button>
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4">Only click if it is past the start time.</p>
        </div>
      </div>
    );
  }

  // PRE-CHECK UI — full viewport layout (no centered card)
  if (!isPreCheckDone && !isInterviewer) {
    const allChecksPass = precheck.cameraReady && precheck.faceOk && precheck.fullscreen;
    const passedCount = [precheck.cameraReady, precheck.faceOk, precheck.fullscreen].filter(Boolean).length;

    const validationChecks = [
      {
        key: 'camera',
        label: 'Camera active',
        hint: 'Webcam feed is live',
        icon: Video,
        pass: precheck.cameraReady,
        loading: false,
      },
      {
        key: 'face',
        label: 'Face detectable',
        hint: precheck.faceLoading ? 'Detecting face…' : 'Face visible in frame',
        icon: ScanFace,
        pass: precheck.faceOk,
        loading: precheck.faceLoading,
      },
      {
        key: 'fullscreen',
        label: 'Fullscreen enabled',
        hint: 'Exam runs in fullscreen',
        icon: Maximize2,
        pass: precheck.fullscreen,
        loading: false,
      },
    ];

    return (
      <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />

        {/* Header — same background as page (no separate strip) */}
        <header className="relative z-10 shrink-0 px-5 sm:px-8 py-4 flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight truncate">
              {assessment.title}
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.18em] text-[10px] mt-0.5">
              Secure Assessment Portal
            </p>
          </div>
          <button
            onClick={startAssessment}
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
                <span>Start Test</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </header>

        {/* Main — camera wider; right panel compact & centered */}
        <main className="relative z-10 flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1.6fr_1fr] overflow-hidden">
          {/* Left: camera preview — fills column height */}
          <section className="flex flex-col min-h-0 p-5 sm:p-6 lg:p-8 overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 shrink-0">Camera Preview</p>
            <div className="flex-1 min-h-[220px] sm:min-h-[300px] w-full rounded-2xl overflow-hidden border border-slate-800 bg-black">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
            {precheck.error && (
              <p className="text-xs text-rose-300 mt-2">{precheck.error}</p>
            )}
          </section>

          {/* Right: single compact panel, vertically centered */}
          <section className="flex flex-col min-h-0 p-5 sm:p-6 md:justify-center md:items-center overflow-y-auto">
            <div className="w-full max-w-md space-y-4">
              <div className="rounded-2xl bg-slate-800/25 border border-slate-700/35 p-5 space-y-5">
                <div className="flex items-start gap-3 pb-3.5 border-b border-slate-700/40">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-widest mb-1">Important Note</h4>
                    <p className="text-xs text-amber-200/70 leading-snug">
                      Webcam monitoring is required. Tab switches or leaving the frame may result in disqualification.
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Validation Checks</p>
                    <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      allChecksPass ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/60 text-slate-400'
                    }`}>
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
                      const statusPass = check.pass;
                      const statusLoading = check.loading;

                      return (
                        <div key={check.key} className="flex items-center gap-3 px-3.5 py-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            statusPass
                              ? 'bg-emerald-500/15'
                              : statusLoading
                                ? 'bg-indigo-500/15'
                                : 'bg-slate-700/40'
                          }`}>
                            <Icon className={`w-4 h-4 ${
                              statusPass ? 'text-emerald-400' : statusLoading ? 'text-indigo-400' : 'text-slate-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-200">{check.label}</p>
                            <p className="text-[10px] text-slate-500 truncate">{check.hint}</p>
                          </div>
                          <div className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase ${
                            statusPass
                              ? 'text-emerald-400'
                              : statusLoading
                                ? 'text-indigo-400'
                                : 'text-rose-400'
                          }`}>
                            {statusLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : statusPass ? (
                              <CheckCircle className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {precheck.faceDetectorFailed && (
                    <button
                      type="button"
                      onClick={retryFaceDetection}
                      className="w-full mt-2.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
                    >
                      <ScanFace className="w-3.5 h-3.5" />
                      Retry face detection
                    </button>
                  )}
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
                Start only after all checks pass.
                {precheck.faceLoading ? ' Face detection may take up to 20s.' : ''}
                {precheck.faceHint ? ` ${precheck.faceHint}` : ''}
              </p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // LIVE ASSESSMENT UI
  const currentQuestion = assessment?.questions?.[currentQuestionIdx];

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-200">
      {/* Header — same background as page (no separate strip) */}
      <div className="shrink-0 px-5 sm:px-8 py-3 z-30">
        <header className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 shrink-0 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            {assessment?.type === 'MOCK_TEST' ? <FileText className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-white tracking-tight truncate">{assessment?.title}</h2>
            <div className="flex items-center gap-2.5 mt-0.5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{assessment?.type.replace('_', ' ')}</span>
              <div className="w-1 h-1 bg-slate-700 rounded-full shrink-0" />
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Secure Session</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isInterviewer && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              timeLeft < 300 ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-800/50 text-white'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${timeLeft < 300 ? 'animate-pulse' : ''}`} />
              <div className="flex flex-col">
                <span className="text-[7px] font-black uppercase tracking-widest opacity-50 leading-none">Time Remaining</span>
                <span className="text-sm font-black tabular-nums leading-tight">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          )}
          
          <button 
            onClick={submitAssessment}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-md shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            Finish & Submit
          </button>
        </div>
        </header>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Main Workspace */}
        <main className="flex-1 flex overflow-hidden bg-slate-950 relative min-w-0">
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 p-4">
            <div className="w-full flex-1 flex flex-col min-h-0">
              {/* Interaction Area */}
              <div className="flex-1 min-h-0 flex flex-col">
                {currentQuestion?.type === 'MCQ' ? (
                  <QuestionPanelShell
                    question={currentQuestion}
                    questionIndex={currentQuestionIdx}
                    layout="mcq"
                  >
                    <div className="grid gap-3">
                        {JSON.parse(currentQuestion.options || '[]').map((opt, i) => {
                          const opts = currentQuestion.options;
                          const selected =
                            normalizeMcqAnswer(answers[currentQuestion.id], opts) === String(i);
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleAnswerChange(currentQuestion.id, String(i))}
                              className={`group p-4 text-left rounded-xl transition-all flex items-center gap-4 border ${
                                selected
                                  ? 'bg-indigo-50 border-indigo-400 text-slate-900 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${
                                  selected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                                }`}
                              >
                                {String.fromCharCode(65 + i)}
                              </div>
                              <span className="text-sm font-semibold flex-1">{opt}</span>
                              {selected && <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0" />}
                            </button>
                          );
                        })}
                    </div>
                  </QuestionPanelShell>
                ) : currentQuestion?.type === 'CODING' ? (
                  <div className="flex-1 min-h-0 flex flex-col rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                    <div className="flex flex-col h-full min-h-0 bg-[#f8f9fb] p-5 gap-4">
                    <QuestionMetaBar question={currentQuestion} questionIndex={currentQuestionIdx} />
                    <div className="flex-1 min-h-0 flex flex-col lg:flex-row rounded-2xl overflow-hidden bg-[#0d1117]">
                    <div className="lg:hidden max-h-[40vh] shrink-0 border-b border-slate-700/50 overflow-hidden">
                      <CodingProblemPanel
                        title={currentQuestion.questionText}
                        problem={currentQuestion.description}
                        constraints={currentQuestion.constraints}
                        examples={parseExamples(currentQuestion.examples)}
                        hideHeaderMeta
                      />
                    </div>
                    <div className="hidden lg:block w-[42%] min-w-[280px] max-w-[480px] shrink-0 border-r border-slate-700/50">
                      <CodingProblemPanel
                        title={currentQuestion.questionText}
                        problem={currentQuestion.description}
                        constraints={currentQuestion.constraints}
                        examples={parseExamples(currentQuestion.examples)}
                        hideHeaderMeta
                        className="h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0 min-h-[360px]">
                    {(() => {
                      const allowed =
                        assessment?.allowedCodingLanguages?.length > 0
                          ? assessment.allowedCodingLanguages
                          : ['javascript'];
                      const defaultLang = allowed[0];
                      const parsed = parseCodingAnswer(
                        answers[currentQuestion.id],
                        defaultLang
                      );
                      let lang = parsed.language || defaultLang;
                      if (!allowed.includes(lang)) lang = defaultLang;
                      const starters = currentQuestion.starterCodesByLang;
                      const codeVal = answers[currentQuestion.id]
                        ? parsed.code
                        : parsed.codesByLang?.[lang] ?? getStarterForLanguage(starters, lang);
                      return (
                        <CodingWorkspace
                          code={codeVal}
                          language={lang}
                          allowedLanguages={allowed}
                          showProblemHeader={false}
                          onCodeChange={(newCode) => {
                            const cur = parseCodingAnswer(answers[currentQuestion.id], lang);
                            const codesByLang = { ...cur.codesByLang, [lang]: newCode };
                            handleAnswerChange(
                              currentQuestion.id,
                              serializeCodingAnswer({
                                ...cur,
                                code: newCode,
                                language: lang,
                                codesByLang,
                              })
                            );
                          }}
                          onLanguageChange={(newLang) => {
                            const cur = parseCodingAnswer(answers[currentQuestion.id], lang);
                            const codesByLang = { ...cur.codesByLang, [lang]: cur.code };
                            const nextCode =
                              codesByLang[newLang] ?? getStarterForLanguage(starters, newLang);
                            handleAnswerChange(
                              currentQuestion.id,
                              serializeCodingAnswer({
                                ...cur,
                                code: nextCode,
                                language: newLang,
                                codesByLang,
                              })
                            );
                          }}
                          customInput={parsed.customInput}
                          onCustomInputChange={(input) => {
                            handleAnswerChange(
                              currentQuestion.id,
                              serializeCodingAnswer({ ...parsed, customInput: input })
                            );
                          }}
                          showSubmit
                          testCases={currentQuestion.testCases}
                          onTestsEmpty={() =>
                            toast?.error('No judge test cases configured for this question.')
                          }
                          onError={(msg) => toast?.error(msg)}
                          onSubmit={(payload) => {
                            handleAnswerChange(
                              currentQuestion.id,
                              serializeCodingAnswer(payload)
                            );
                            const ev = payload.evaluation;
                            if (ev?.total > 0) {
                              toast?.success(
                                `Saved · Tests ${ev.passed}/${ev.total}${ev.score != null ? ` (${ev.score}%)` : ''}`
                              );
                            } else {
                              toast?.success('Coding answer saved');
                            }
                          }}
                          onRunComplete={(run) => {
                            handleAnswerChange(
                              currentQuestion.id,
                              serializeCodingAnswer({ ...parsed, code: codeVal, language: lang, lastRun: run })
                            );
                          }}
                          onEvaluateComplete={(ev) => {
                            handleAnswerChange(
                              currentQuestion.id,
                              serializeCodingAnswer({
                                ...parsed,
                                code: codeVal,
                                language: lang,
                                evaluation: ev,
                              })
                            );
                          }}
                        />
                      );
                    })()}
                    </div>
                    </div>
                    </div>
                  </div>
                ) : currentQuestion?.type === 'DESCRIPTIVE' ? (
                  <QuestionPanelShell
                    question={currentQuestion}
                    questionIndex={currentQuestionIdx}
                    layout="descriptive"
                  >
                    <textarea
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Type your answer here..."
                      className="flex-1 min-h-[280px] w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm leading-relaxed resize-y focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none font-medium"
                    />
                  </QuestionPanelShell>
                ) : (
                  <div className="h-full bg-slate-900/50 rounded-3xl flex flex-col items-center justify-center p-12 gap-8">
                     <div className="text-center">
                        <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 animate-pulse shadow-2xl shadow-rose-500/40' : 'bg-slate-800'}`}>
                           <Video className={`w-10 h-10 ${isRecording ? 'text-white' : 'text-slate-500'}`} />
                        </div>
                        <h4 className="text-white font-black uppercase tracking-widest mb-2">Video Response</h4>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Question {currentQuestionIdx + 1}</p>
                     </div>

                     <div className="flex gap-4">
                        {!isRecording ? (
                          <button 
                            onClick={startRecording}
                            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20"
                          >
                            Start Recording
                          </button>
                        ) : (
                          <button 
                            onClick={stopRecording}
                            className="px-10 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-rose-500/20 animate-pulse"
                          >
                            Stop Recording
                          </button>
                        )}
                     </div>

                     {answers[currentQuestion.id] && !isRecording && (
                       <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-xl">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Answer Recorded</span>
                       </div>
                     )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Right panel collapse toggle */}
        <button
          type="button"
          onClick={() => setRightPanelOpen((open) => !open)}
          className={`absolute top-1/2 -translate-y-1/2 z-30 w-6 h-14 bg-[#0d1117] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-300 ${
            rightPanelOpen ? 'right-[316px] rounded-l-lg border-r-0' : 'right-0 rounded-l-lg'
          }`}
          title={rightPanelOpen ? 'Collapse panel' : 'Expand panel'}
          aria-expanded={rightPanelOpen}
          aria-label={rightPanelOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {rightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Right Sidebar: Questions & Proctoring — collapsible, fixed size all question types */}
        <aside
          className={`shrink-0 h-full flex flex-col min-h-0 z-20 overflow-hidden transition-[width,padding] duration-300 ease-in-out py-4 ${
            rightPanelOpen ? 'w-[316px] pr-4' : 'w-0 pr-0'
          }`}
        >
          <div className="w-[300px] h-full min-h-0 flex flex-col rounded-2xl border border-slate-800 bg-[#0d1117] overflow-hidden">
            {/* Top half — camera & monitoring */}
            <div className="flex-1 basis-0 min-h-0 flex flex-col overflow-hidden border-b border-slate-800">
              <ProctoringConsole
                videoRef={videoRef}
                violations={violations}
                lastViolationType={lastViolationType}
                cameraLive={cameraLive}
                borderless
                compact
              />
            </div>

            {/* Bottom half — questions */}
            <div className="flex-1 basis-0 min-h-0 flex flex-col p-3 overflow-hidden">
              <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 shrink-0">Questions</h4>
              <div className="flex-1 min-h-0 flex flex-wrap content-start gap-2 overflow-y-auto">
                {assessment?.questions?.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentQuestionIdx(i)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
                      currentQuestionIdx === i
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                        : answers[q.id]
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 shrink-0 pt-3">
                <button
                  type="button"
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx((v) => v - 1)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all flex items-center justify-center disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentQuestionIdx === assessment?.questions?.length - 1}
                  onClick={() => setCurrentQuestionIdx((v) => v + 1)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all flex items-center justify-center disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
      
      {/* Hidden processing components */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
