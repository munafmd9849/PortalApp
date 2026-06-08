import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, AlertTriangle, Clock, ChevronRight, ChevronLeft, 
  CheckCircle, XCircle, Loader2, Video, Code, FileText,
  Maximize2, Terminal, AlertCircle, Save, Send, Ban
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import CodeEditor from '../../components/assessment/CodeEditor';
import ProctoringConsole from '../../components/assessment/ProctoringConsole';

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
  const [studentProfile, setStudentProfile] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // Stores MCQ options or Code snippets
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPreCheckDone, setIsPreCheckDone] = useState(false);
  const [violations, setViolations] = useState(0);
  const [lastViolationType, setLastViolationType] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  
  // Refs
  const videoRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const jitsiContainerRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const snapshotIntervalRef = useRef(null);
  const canvasRef = useRef(null);

  const [entryStatus, setEntryStatus] = useState('ALLOWED'); // ALLOWED, TOO_EARLY, TOO_LATE, WAITING

  // 1. Initialize Assessment & Session
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const details = await api.getAssessmentDetails(assessmentId);
        setAssessment(details);
        setTimeLeft(details.duration * 60);
        
        if (isInterviewer) {
          if (studentIdParam) {
            const profile = await api.getStudentProfile(studentIdParam);
            setStudentProfile(profile);
          }
          setIsPreCheckDone(true);
          setLoading(false);
        } else {
          // Check Timing logic
          if (details.startTime) {
             const now = new Date();
             const start = new Date(details.startTime);
             const diffMins = (now - start) / 1000 / 60;
             
             if (diffMins < -10) {
               setEntryStatus('TOO_EARLY');
               setLoading(false);
               return;
             }
             if (diffMins > 5) {
               setEntryStatus('TOO_LATE');
               setLoading(false);
               return;
             }
          }

          // Fetch details but DO NOT start the session if they haven't finished PreCheck
          // The session will be started in startAssessment()
          setLoading(false);
        }
      } catch (e) {
        console.error('Init failed:', e);
        toast?.error('Failed to initialize assessment');
        navigate(isInterviewer ? '/admin' : '/student');
      }
    };
    init();
  }, [assessmentId, isInterviewer, studentIdParam]);

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

  // 3. Proctoring & Snapshots
  const captureSnapshot = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !session) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    // In a real app, you'd upload this to S3/Cloudinary
    // For now, we log that a snapshot was taken
    try {
       // We can send the dataUrl to the backend if configured
       // await api.uploadMedia(session.id, { type: 'SNAPSHOT', url: dataUrl });
    } catch (e) {
       console.error('Snapshot upload failed', e);
    }
  }, [session]);

  useEffect(() => {
    if (isPreCheckDone && !isInterviewer && assessment?.type === 'MOCK_TEST') {
      snapshotIntervalRef.current = setInterval(captureSnapshot, 60000); // Every 60s
      return () => clearInterval(snapshotIntervalRef.current);
    }
  }, [isPreCheckDone, isInterviewer, captureSnapshot, assessment]);

  const logViolation = useCallback(async (type, details) => {
    if (!session || isInterviewer) return;
    try {
      await api.logProctoringViolation(session.id, { type, details });
      setViolations(v => v + 1);
      setLastViolationType(type.replace(/_/g, ' '));
      toast?.warning(`Proctoring Alert: ${type.replace(/_/g, ' ')} detected.`);
    } catch (e) {
      console.error('Violation log failed', e);
    }
  }, [session, isInterviewer]);

  useEffect(() => {
    if (isPreCheckDone && !isInterviewer) {
      const handleVisibility = () => {
        if (document.hidden) logViolation('TAB_SWITCH', 'Student switched tabs');
      };
      const handleBlur = () => logViolation('WINDOW_BLUR', 'Student left the test window');
      
      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('blur', handleBlur);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('blur', handleBlur);
      };
    }
  }, [isPreCheckDone, isInterviewer, logViolation]);

  // 4. Jitsi Integration (Modernized to meet.guifi.net)
  useEffect(() => {
    if (!loading && assessment?.type === 'MOCK_INTERVIEW_LIVE' && isPreCheckDone) {
      loadJitsiScript();
    }
  }, [loading, assessment, isPreCheckDone]);

  const loadJitsiScript = () => {
    const scriptId = 'jitsi-external-api';
    if (document.getElementById(scriptId)) {
      initJitsi();
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://meet.guifi.net/external_api.js';
    script.async = true;
    script.onload = initJitsi;
    document.head.appendChild(script);
  };

  const initJitsi = () => {
    if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) return;
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
    const apiInstance = new window.JitsiMeetExternalAPI('meet.guifi.net', options);
    return () => apiInstance.dispose();
  };

  // 5. Actions
  const startAssessment = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      
      if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();

      // Check if it's still before startTime
      if (assessment.startTime) {
         const diffMins = (new Date() - new Date(assessment.startTime)) / 1000 / 60;
         if (diffMins < 0) {
           setEntryStatus('WAITING');
           setIsPreCheckDone(true);
           return;
         }
      }

      await executeTestStart();
    } catch (e) {
      toast?.error('Camera & Mic access is required for proctoring');
    }
  };

  const executeTestStart = async () => {
    try {
      setLoading(true);
      const sess = await api.startAssessmentSession(assessmentId);
      setSession(sess);
      if (sess.responses) setAnswers(JSON.parse(sess.responses));
      setIsPreCheckDone(true);
      setEntryStatus('ALLOWED');
      
      // Re-attach stream for main UI
      setTimeout(async () => {
         try {
           const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
           if (videoRef.current) videoRef.current.srcObject = stream;
         } catch(e) {}
      }, 500);
    } catch (e) {
      if (e.response?.data?.error === 'Assessment already completed') {
         toast.error('You have already completed this assessment');
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
      // In a real app, calculate score on backend
      await api.completeAssessment(session.id, { answers: JSON.stringify(answers) });
      toast?.success('Assessment submitted successfully');
      if (document.fullscreenElement) document.exitFullscreen();
      navigate('/student/dashboard');
    } catch (e) {
      toast?.error('Submission failed');
    }
  };

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
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 border border-indigo-500/30 shadow-2xl shadow-indigo-500/20">
           <Clock className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight mb-3">You're Early</h2>
        <p className="text-slate-400 max-w-md mx-auto">The secure exam window hasn't opened yet. The Pre-Check gate opens exactly 10 minutes before the scheduled start time.</p>
        <button onClick={() => navigate('/student/dashboard')} className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all text-sm">
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (entryStatus === 'TOO_LATE') {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="w-24 h-24 bg-rose-500/20 rounded-full flex items-center justify-center mb-6 border border-rose-500/30 shadow-2xl shadow-rose-500/20">
           <Ban className="w-10 h-10 text-rose-400" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight mb-3">Entry Closed</h2>
        <p className="text-slate-400 max-w-md mx-auto">The 5-minute late entry window has expired. You are no longer permitted to start this assessment.</p>
        <button onClick={() => navigate('/student/dashboard')} className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all text-sm">
          Return to Dashboard
        </button>
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

  // PRE-CHECK UI
  if (!isPreCheckDone && !isInterviewer) {
    return (
      <div className="h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent opacity-50 pointer-events-none" />
        
        <div className="max-w-2xl w-full bg-slate-900/40 backdrop-blur-2xl rounded-[3rem] p-12 border border-slate-800 shadow-2xl relative z-10">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">{assessment.title}</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Secure Assessment Portal</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700/50">
               <Video className="w-6 h-6 text-indigo-400 mb-3" />
               <h4 className="text-sm font-black text-white uppercase mb-1">Camera Access</h4>
               <p className="text-[11px] text-slate-500 font-medium">Used for real-time video proctoring and snapshots.</p>
            </div>
            <div className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700/50">
               <Maximize2 className="w-6 h-6 text-indigo-400 mb-3" />
               <h4 className="text-sm font-black text-white uppercase mb-1">Fullscreen Mode</h4>
               <p className="text-[11px] text-slate-500 font-medium">Exiting fullscreen will be logged as a violation.</p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 mb-10 flex items-start gap-4">
             <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
             <div>
                <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1">Important Note</h4>
                <p className="text-[11px] text-amber-200/70 leading-relaxed">
                  By starting this assessment, you agree to being monitored via webcam. Multiple tab switches or leaving the frame may result in automatic disqualification.
                </p>
             </div>
          </div>

          <button 
            onClick={startAssessment}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-2xl shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-3"
          >
            Authenticate & Start Test
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // LIVE ASSESSMENT UI
  const currentQuestion = assessment?.questions?.[currentQuestionIdx];

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-200">
      {/* Premium Header */}
      <header className="h-20 bg-slate-900/50 backdrop-blur-md border-b border-slate-800/50 px-8 flex items-center justify-between z-30">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            {assessment?.type === 'MOCK_TEST' ? <FileText className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
          </div>
          <div>
            <h2 className="text-base font-black text-white tracking-tight">{assessment?.title}</h2>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{assessment?.type.replace('_', ' ')}</span>
              <div className="w-1 h-1 bg-slate-700 rounded-full" />
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live Secure Session</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {!isInterviewer && (
            <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border transition-all ${
              timeLeft < 300 ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-slate-800/50 border-slate-700/50 text-white'
            }`}>
              <Clock className={`w-4 h-4 ${timeLeft < 300 ? 'animate-pulse' : ''}`} />
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Time Remaining</span>
                <span className="text-base font-black tabular-nums">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          )}
          
          <button 
            onClick={submitAssessment}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-3"
          >
            <Send className="w-4 h-4" />
            Finish & Submit
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Navigation */}
        <aside className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-8 gap-4 overflow-y-auto z-20">
          {assessment?.questions?.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQuestionIdx(i)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                currentQuestionIdx === i 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 ring-4 ring-indigo-500/20' 
                : answers[assessment.questions[i].id] 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 flex overflow-hidden bg-slate-950 relative">
          <div className="flex-1 flex flex-col p-10 overflow-y-auto">
            <div className="max-w-4xl w-full mx-auto space-y-10">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">
                       Question {currentQuestionIdx + 1}
                    </span>
                    <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-700">
                       {currentQuestion?.type}
                    </span>
                 </div>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Points: {currentQuestion?.points}
                 </span>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-black text-white leading-tight tracking-tight">
                  {currentQuestion?.questionText}
                </h3>
                {currentQuestion?.description && (
                  <p className="text-slate-400 text-sm leading-relaxed font-medium">
                    {currentQuestion.description}
                  </p>
                )}
              </div>

              {/* Interaction Area */}
              <div className="flex-1 min-h-[400px]">
                {currentQuestion?.type === 'MCQ' ? (
                  <div className="grid gap-4">
                    {JSON.parse(currentQuestion.options || '[]').map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnswerChange(currentQuestion.id, opt)}
                        className={`group p-6 text-left rounded-3xl border-2 transition-all flex items-center gap-6 ${
                          answers[currentQuestion.id] === opt 
                          ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-xl shadow-indigo-500/5' 
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black transition-all ${
                          answers[currentQuestion.id] === opt 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700'
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className="text-sm font-bold flex-1">{opt}</span>
                        {answers[currentQuestion.id] === opt && <CheckCircle className="w-5 h-5 text-indigo-500" />}
                      </button>
                    ))}
                  </div>
                ) : currentQuestion?.type === 'CODING' ? (
                  <div className="h-[500px] flex flex-col gap-4">
                    <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-3">
                          <Terminal className="w-4 h-4 text-slate-500" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Main Workspace</span>
                       </div>
                       <div className="flex items-center gap-4">
                          <select className="bg-slate-800 border-none rounded-lg px-3 py-1 text-[10px] font-bold text-slate-300 focus:ring-0">
                             <option>JavaScript</option>
                             <option>Python</option>
                             <option>Java</option>
                          </select>
                       </div>
                    </div>
                    <CodeEditor 
                      value={answers[currentQuestion.id] || ''}
                      onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                      language="javascript"
                    />
                  </div>
                ) : (
                  <div className="h-full bg-slate-900/50 border border-slate-800 rounded-3xl flex flex-col items-center justify-center p-12 gap-8">
                     <div className="text-center">
                        <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center transition-all ${isRecording ? 'bg-rose-500 animate-pulse shadow-2xl shadow-rose-500/40' : 'bg-slate-800 border border-slate-700'}`}>
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
                       <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
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

        {/* Right Sidebar: Proctoring & Stats */}
        <aside className="w-[380px] bg-slate-900 border-l border-slate-800 flex flex-col p-8 gap-8 z-20">
           <ProctoringConsole 
              videoRef={videoRef}
              violations={violations}
              lastViolationType={lastViolationType}
           />

           <div className="bg-slate-800/30 rounded-[2rem] p-6 border border-slate-800/50 flex-1">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Test Instructions</h4>
              <div className="space-y-4">
                {assessment?.instructions?.split('\n').map((line, i) => (
                  <div key={i} className="flex gap-3">
                     <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                     <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{line}</p>
                  </div>
                )) || <p className="text-[11px] text-slate-500 italic">No specific instructions provided.</p>}
              </div>
           </div>

           <div className="flex gap-4">
              <button 
                disabled={currentQuestionIdx === 0}
                onClick={() => setCurrentQuestionIdx(v => v - 1)}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl transition-all flex items-center justify-center disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                disabled={currentQuestionIdx === assessment?.questions?.length - 1}
                onClick={() => setCurrentQuestionIdx(v => v + 1)}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl transition-all flex items-center justify-center disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
           </div>
        </aside>
      </div>
      
      {/* Hidden processing components */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
