import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Video, Code, FileText, Save, Star, 
  Loader2, User, Play, Timer, X, ChevronRight,
  Maximize2, Minimize2, Settings, MessageSquare,
  ShieldCheck, Layout, ExternalLink, RefreshCcw,
  Info, ArrowLeft, MoreHorizontal, UserCheck, 
  Terminal, BarChart3, AlertCircle
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';

export default function MockInterviewRoom() {
  const { assessmentId: slotId } = useParams(); 
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user, role: userRole } = useAuth();

  // Role Detection
  const searchParams = new URLSearchParams(location.search);
  const queryRole = searchParams.get('role') || 'student';
  const isInterviewer = queryRole === 'interviewer';

  // State
  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('profile'); 
  const [showTechnicalBoard, setShowTechnicalBoard] = useState(false);
  const [isEarly, setIsEarly] = useState(false);
  const [timeUntilStart, setTimeUntilStart] = useState('');
  const [jitsiApi, setJitsiApi] = useState(null);
  const jitsiContainerRef = useRef(null);

  // Evaluation State
  const [evaluation, setEvaluation] = useState({
    communication: 0,
    confidence: 0,
    technicalSkills: 0,
    problemSolving: 0,
    bodyLanguage: 0,
    resumeKnowledge: 0,
    overallPerformance: 0,
    result: 'GOOD',
    detailedRemarks: ''
  });
  const [savingFeedback, setSavingFeedback] = useState(false);

  // Technical Mode State
  const [code, setCode] = useState('// Write your solution here\nfunction solve() {\n  console.log("Hello World");\n}');
  const [language, setLanguage] = useState('javascript');

  const initRoom = useCallback(async () => {
    try {
      setLoading(true);
      const slotData = await api.getMockInterviewSlot(slotId);
      setSlot(slotData);

      const isAdmin = userRole?.toUpperCase() === 'ADMIN' || userRole?.toUpperCase() === 'SUPER_ADMIN';
      const startTime = new Date(slotData.startTime);
      const tenMinsBefore = new Date(startTime.getTime() - 10 * 60000);
      const now = new Date();

      if (!isAdmin && now < tenMinsBefore) {
        setIsEarly(true);
        startCountdown(startTime);
        setLoading(false);
        return;
      }

      const isTechRound = slotData.drive?.category === 'TECHNICAL';
      setShowTechnicalBoard(isTechRound);
      setActiveTab(isTechRound ? 'technical' : 'profile');

      if (slotData.student) {
        setStudentProfile(slotData.student);
      }

      setLoading(false);
      setTimeout(() => loadJitsiScript(), 100);
    } catch (err) {
      console.error('Room Init Error:', err);
      toast.error('Failed to initialize interview room');
      navigate(-1);
    }
  }, [slotId, userRole, toast, navigate]);

  useEffect(() => {
    initRoom();
    return () => jitsiApi?.dispose();
  }, [initRoom]);

  const startCountdown = (startTime) => {
    const update = () => {
      const now = new Date();
      const diff = startTime.getTime() - now.getTime();
      if (diff <= 0) {
        window.location.reload();
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeUntilStart(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  };

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
    script.onload = () => initJitsi();
    script.onerror = () => {
      toast.error('Failed to load video service');
    };
    document.head.appendChild(script);
  };

  const initJitsi = () => {
    if (!window.JitsiMeetExternalAPI || !jitsiContainerRef.current) return;
    
    const roomName = `PWIOI_Mock_Session_Final_${slotId.replace(/-/g, '_')}`;
    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: { 
        displayName: isInterviewer ? 'Interviewer' : (studentProfile?.fullName || 'Candidate')
      },
      configOverwrite: { 
        prejoinPageEnabled: false, 
        disableDeepLinking: true,
        disableModeratorIndicator: true,
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        enableLobby: false,
        lockRoomTimer: 0,
        toolbarButtons: [
          'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
          'fodeviceselection', 'hangup', 'profile', 'chat', 'settings', 'raisehand',
          'videoquality', 'filmstrip', 'tileview', 'mute-everyone', 'security'
        ]
      },
      interfaceConfigOverwrite: { 
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_REMOTE_DISPLAY_NAME: 'Participant'
      }
    };
    const apiInstance = new window.JitsiMeetExternalAPI('meet.guifi.net', options);
    
    apiInstance.on('videoConferenceJoined', () => {
       if (isInterviewer) {
          apiInstance.executeCommand('toggleLobby', false);
       }
    });

    setJitsiApi(apiInstance);
  };

  const handleSaveFeedback = async () => {
    setSavingFeedback(true);
    try {
      await api.submitMockFeedback({
        slotId: slotId,
        ...evaluation
      });
      toast.success('Evaluation submitted successfully');
    } catch (err) {
      toast.error('Failed to save evaluation');
    } finally {
      setSavingFeedback(false);
    }
  };

  if (loading) return (
    <div className="h-screen bg-white flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
        <Video className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-indigo-600" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-slate-900 uppercase tracking-widest animate-pulse">Initializing Secure Room</p>
        <p className="text-[10px] text-slate-500 mt-2 font-medium">Please wait while we connect your video feed...</p>
      </div>
    </div>
  );

  if (isEarly) return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-6 sm:p-10">
       <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-indigo-600/10">
          <Timer className="w-10 h-10 text-white animate-pulse" />
       </div>
       <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-center text-slate-900">Room is <span className="text-indigo-600">Not Yet Open</span></h1>
       <p className="text-slate-500 mt-4 text-sm font-medium text-center max-w-md leading-relaxed">
         This room will automatically unlock 10 minutes before your scheduled slot. 
       </p>
       <div className="mt-10 p-8 bg-white border border-slate-200 rounded-3xl flex flex-col items-center shadow-xl shadow-slate-200/50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Starts In</p>
          <p className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tighter text-indigo-600">{timeUntilStart}</p>
       </div>
       <button 
         onClick={() => navigate(-1)}
         className="mt-12 text-slate-400 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-widest flex items-center gap-2"
       >
         <ArrowLeft className="w-4 h-4" /> Back to Dashboard
       </button>
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden text-slate-900 font-sans">
      {/* Header - Clean White */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-900">
                {slot?.drive?.title || 'Mock Interview Room'}
              </h2>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded uppercase tracking-wider border border-emerald-100 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Live Now
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
                 {slot?.drive?.category} Round • {isInterviewer ? 'Interviewer Console' : 'Student Mode'}
               </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           {isInterviewer && (
             <button 
               onClick={() => {
                 const newVal = !showTechnicalBoard;
                 setShowTechnicalBoard(newVal);
                 if (newVal) setActiveTab('technical');
                 else if (activeTab === 'technical') setActiveTab('profile');
               }}
               className={`h-9 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center gap-2 ${
                 showTechnicalBoard 
                 ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                 : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
               }`}
             >
               <Code className="w-3.5 h-3.5" /> {showTechnicalBoard ? 'Hide' : 'Show'} Tech Board
             </button>
           )}
           <button 
             onClick={() => {
                if (window.confirm('Are you sure you want to end this session?')) navigate(-1);
             }}
             className="h-9 px-4 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border border-rose-100 active:scale-95"
           >
             End Session
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Video Area - Full height for controls visibility */}
        <div className="flex-1 bg-slate-950 relative">
           <div className="w-full h-full relative">
              <div ref={jitsiContainerRef} className="w-full h-full" />
              
              {/* Refined Video Overlay - Moved up slightly */}
              <div className="absolute bottom-20 left-6 pointer-events-none z-10">
                 <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-white/90">Encrypted P2P Connection</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Right: Interaction Area - Pure White & Clean */}
        <div className={`flex flex-col bg-white border-l border-slate-200 transition-all duration-500 ease-in-out shadow-[-10px_0_30px_rgba(0,0,0,0.02)] ${showTechnicalBoard ? 'w-[750px]' : 'w-[420px]'}`}>
           {/* Tab Bar - Refined Pill Style */}
           <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1">
                 {[
                   { id: 'technical', label: 'Tech Board', icon: Terminal, hidden: !showTechnicalBoard },
                   { id: 'profile', label: 'Profile', icon: User },
                   { id: 'evaluation', label: 'Evaluation', icon: BarChart3, hidden: !isInterviewer }
                 ].filter(t => !t.hidden).map((tab) => (
                   <button
                     key={tab.id}
                     onClick={() => setActiveTab(tab.id)}
                     className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                       activeTab === tab.id 
                       ? 'bg-white text-indigo-600 shadow-md border border-slate-100' 
                       : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                     }`}
                   >
                     <tab.icon className="w-3.5 h-3.5" /> {tab.label}
                   </button>
                 ))}
              </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'technical' && showTechnicalBoard && (
                <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                   <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between px-6">
                      <div className="flex items-center gap-3">
                         <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400">Environment:</span>
                            <select 
                               value={language}
                               onChange={(e) => setLanguage(e.target.value)}
                               className="bg-transparent text-[10px] font-bold text-indigo-600 outline-none uppercase cursor-pointer"
                            >
                               <option value="javascript">JavaScript</option>
                               <option value="python">Python</option>
                               <option value="java">Java</option>
                               <option value="cpp">C++</option>
                            </select>
                         </div>
                      </div>
                      <button className="h-8 px-4 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-2 transition-all shadow-md shadow-slate-200">
                         <Play className="w-3.5 h-3.5" /> Execute
                      </button>
                   </div>
                   <div className="flex-1 relative bg-[#1e1e1e]">
                      <Editor
                        theme="vs-dark"
                        language={language}
                        value={code}
                        onChange={setCode}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: 'on',
                          padding: { top: 20 },
                          fontFamily: 'JetBrains Mono, monospace',
                          scrollBeyondLastLine: false,
                          smoothScrolling: true,
                          cursorBlinking: 'smooth',
                          cursorSmoothCaretAnimation: 'on',
                          backgroundColor: '#1e1e1e'
                        }}
                      />
                   </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="p-6 sm:p-8 space-y-8 animate-in fade-in duration-300">
                   <div className="flex items-center gap-5">
                      <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl font-bold text-indigo-600 border border-indigo-100 shadow-inner uppercase">
                        {studentProfile?.fullName?.[0] || 'C'}
                      </div>
                      <div>
                         <h3 className="text-xl font-bold text-slate-900">{studentProfile?.fullName || 'Candidate'}</h3>
                         <p className="text-xs text-slate-500 font-medium mt-0.5">{studentProfile?.email}</p>
                         <div className="flex items-center gap-2 mt-3">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md border border-slate-200 uppercase tracking-wider">
                               {studentProfile?.batch || 'Batch 2026'}
                            </span>
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md border border-indigo-100 uppercase tracking-wider">
                               CS Engineering
                            </span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="p-5 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                         <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Portfolio</h4>
                            <Layout className="w-3.5 h-3.5 text-slate-300" />
                         </div>
                         <div className="space-y-3">
                            <button className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between hover:bg-white hover:border-indigo-400 transition-all group">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100 group-hover:border-indigo-100 transition-all">
                                    <FileText className="w-4 h-4 text-indigo-500" />
                                  </div>
                                  <div className="text-left">
                                     <p className="text-xs font-bold text-slate-700">Resume_v2.pdf</p>
                                     <p className="text-[10px] text-slate-400 mt-0.5 uppercase">Updated 2 days ago</p>
                                  </div>
                               </div>
                               <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                            </button>
                            <button className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between hover:bg-white hover:border-amber-400 transition-all group">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-100 group-hover:border-amber-100 transition-all">
                                    <Star className="w-4 h-4 text-amber-500" />
                                  </div>
                                  <div className="text-left">
                                     <p className="text-xs font-bold text-slate-700">Mock Performance</p>
                                     <p className="text-[10px] text-slate-400 mt-0.5 uppercase">Avg. Rating: 4.2/5</p>
                                  </div>
                               </div>
                               <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-500 transition-colors" />
                            </button>
                         </div>
                      </div>

                      <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-4">
                         <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-indigo-100 shrink-0 shadow-sm">
                            <AlertCircle className="w-4 h-4 text-indigo-600" />
                         </div>
                         <div className="space-y-1">
                            <h4 className="text-xs font-bold text-indigo-900 leading-none mt-1">Interviewer Tip</h4>
                            <p className="text-[10px] text-indigo-700/70 font-medium leading-relaxed">
                               Focus on "Communication" and "Technical Skills" as per the drive requirements. Marks are saved automatically.
                            </p>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'evaluation' && isInterviewer && (
                <div className="p-6 sm:p-8 space-y-8 animate-in fade-in duration-300">
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Skill Rubric</h4>
                         <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Grading Active</span>
                      </div>
                      
                      {[
                        { id: 'communication', label: 'Communication' },
                        { id: 'confidence', label: 'Confidence & Poise' },
                        { id: 'technicalSkills', label: 'Technical Depth' },
                        { id: 'problemSolving', label: 'Problem Solving' },
                        { id: 'bodyLanguage', label: 'Body Language' },
                        { id: 'resumeKnowledge', label: 'Resume Knowledge' },
                        { id: 'overallPerformance', label: 'Overall Readiness' }
                      ].map((item) => (
                        <div key={item.id} className="space-y-2.5">
                           <div className="flex items-center justify-between px-1">
                              <label className="text-[11px] font-semibold text-slate-700">{item.label}</label>
                              <span className="text-[11px] font-bold text-indigo-600 tabular-nums">{evaluation[item.id]} <span className="text-slate-300 font-medium">/ 5</span></span>
                           </div>
                           <div className="flex gap-1.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => setEvaluation({...evaluation, [item.id]: star})}
                                  className={`flex-1 h-9 rounded-lg transition-all flex items-center justify-center border text-[11px] font-bold ${
                                    evaluation[item.id] >= star 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' 
                                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white hover:border-slate-400'
                                  }`}
                                >
                                  {star}
                                </button>
                              ))}
                           </div>
                        </div>
                      ))}
                   </div>

                   <div className="h-px bg-slate-100" />

                   <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Final Status</label>
                      <div className="grid grid-cols-2 gap-2">
                         {[
                           { id: 'EXCELLENT', color: 'emerald' },
                           { id: 'GOOD', color: 'indigo' },
                           { id: 'AVERAGE', color: 'slate' },
                           { id: 'NEEDS_IMPROVEMENT', color: 'rose' }
                         ].map(res => (
                           <button
                             key={res.id}
                             onClick={() => setEvaluation({...evaluation, result: res.id})}
                             className={`py-3 px-2 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all ${
                               evaluation.result === res.id 
                               ? `bg-${res.color}-600 border-${res.color}-600 text-white shadow-lg` 
                               : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                             }`}
                           >
                             {res.id.replace('_', ' ')}
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interviewer Notes</label>
                      <textarea 
                        rows={5}
                        value={evaluation.detailedRemarks}
                        onChange={(e) => setEvaluation({...evaluation, detailedRemarks: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none shadow-inner placeholder:text-slate-300"
                        placeholder="Provide detailed feedback for candidate growth..."
                      />
                   </div>

                   <button 
                     onClick={handleSaveFeedback}
                     disabled={savingFeedback}
                     className="w-full py-4.5 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-widest rounded-xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                   >
                     {savingFeedback ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                     Finalize & Submit
                   </button>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
