import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Shield, Camera, Mic, Wifi, CheckCircle2, 
  AlertCircle, ArrowRight, Loader2, Video, Timer
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function MockInterviewPreCheck() {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, role: userRole } = useAuth();
  
  const [checks, setChecks] = useState({
    camera: 'pending', // pending, success, failed
    mic: 'pending',
    network: 'pending'
  });
  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState(null);
  const [isEarly, setIsEarly] = useState(false);
  const [timeUntilStart, setTimeUntilStart] = useState('');
  const [isTooLate, setIsTooLate] = useState(false);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    initPreCheck();
    runDiagnostics();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initPreCheck = async () => {
    try {
      setLoading(true);
      const slotData = await api.getMockInterviewSlot(slotId);
      setSlot(slotData);

      const isAdmin = userRole?.toUpperCase() === 'ADMIN' || userRole?.toUpperCase() === 'SUPER_ADMIN';
      const startTime = new Date(slotData.startTime);
      const endTime = new Date(slotData.endTime);
      const tenMinsBefore = new Date(startTime.getTime() - 10 * 60000);
      const oneHourAfter = new Date(endTime.getTime() + 60 * 60000); // 1 hour buffer after end
      const now = new Date();

      if (!isAdmin) {
        if (now < tenMinsBefore) {
          setIsEarly(true);
          startCountdown(startTime);
        } else if (now > oneHourAfter) {
          // If the drive date is before today, it's definitely too late
          const driveDate = new Date(slotData.drive?.date || slotData.startTime);
          driveDate.setHours(23, 59, 59, 999);
          if (now > driveDate) {
            setIsTooLate(true);
          }
        }
      }
    } catch (err) {
      toast.error('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = (startTime) => {
    const update = () => {
      const now = new Date();
      const diff = startTime.getTime() - now.getTime();
      const tenMinsInMs = 10 * 60000;
      
      if (diff <= tenMinsInMs) {
        setIsEarly(false);
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

  const runDiagnostics = async () => {
    // 1. Camera & Mic Check
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setChecks(prev => ({ ...prev, camera: 'success', mic: 'success' }));
    } catch (err) {
      setChecks(prev => ({ ...prev, camera: 'failed', mic: 'failed' }));
      toast.error('Camera/Microphone access denied');
    }

    // 2. Network Check
    const start = Date.now();
    try {
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
      const latency = Date.now() - start;
      setChecks(prev => ({ ...prev, network: latency < 500 ? 'success' : 'failed' }));
    } catch (err) {
      setChecks(prev => ({ ...prev, network: 'failed' }));
    }
  };

  const handleJoin = () => {
    if (Object.values(checks).some(c => c !== 'success')) {
      toast.error('Please resolve all hardware issues before joining');
      return;
    }
    if (isEarly) {
      toast.error('Room is not yet open. Please wait.');
      return;
    }
    if (isTooLate) {
      toast.error('This session has already expired.');
      return;
    }
    navigate(`/mock-interview-room/${slotId}?role=student`);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
       <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
       <p className="text-xs font-black uppercase tracking-widest text-slate-500">Preparing Pre-Check...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Left: Video Preview */}
        <div className="space-y-6">
          <div className="relative aspect-video bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl">
            {checks.camera === 'success' ? (
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover grayscale brightness-75"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-500">
                <Camera className="w-12 h-12 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Camera Feed Inactive</p>
              </div>
            )}
            
            <div className="absolute top-6 left-6 flex items-center gap-3">
               <div className="px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-full flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Live Preview</span>
               </div>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-[2rem] p-6 border border-slate-800">
             <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Hardware Diagnostics</h3>
             <div className="space-y-3">
               {[
                 { id: 'camera', label: 'High-Definition Webcam', icon: Camera },
                 { id: 'mic', label: 'Microphone Input', icon: Mic },
                 { id: 'network', label: 'Network Stability', icon: Wifi }
               ].map((item) => {
                 const Icon = item.icon;
                 const status = checks[item.id];
                 return (
                   <div key={item.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800 transition-all">
                     <div className="flex items-center gap-3">
                       <Icon className={`w-4 h-4 ${status === 'success' ? 'text-indigo-400' : status === 'failed' ? 'text-rose-400' : 'text-slate-600'}`} />
                       <span className="text-xs font-bold">{item.label}</span>
                     </div>
                     {status === 'success' ? (
                       <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                     ) : status === 'failed' ? (
                       <AlertCircle className="w-4 h-4 text-rose-500" />
                     ) : (
                       <Loader2 className="w-4 h-4 text-slate-700 animate-spin" />
                     )}
                   </div>
                 );
               })}
             </div>
          </div>
        </div>

        {/* Right: Waiting Room Info */}
        <div className="flex flex-col justify-center space-y-10">
          <div>
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-600/20">
               <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-black tracking-tight leading-tight">Ready to start your <br /> <span className="text-indigo-500">Mock Interview?</span></h1>
            <p className="text-slate-400 mt-4 text-sm font-medium leading-relaxed max-w-sm">
              Please ensure you are in a quiet environment and have your resume ready. This session will be recorded for evaluation.
            </p>
          </div>

          <div className="space-y-6">
            <div className={`p-6 border rounded-[2rem] transition-all ${isEarly || isTooLate ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
               <div className="flex items-center gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${isEarly || isTooLate ? 'bg-rose-500 shadow-rose-500/20' : 'bg-emerald-500 shadow-emerald-500/20'}`}>
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${isEarly || isTooLate ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isEarly ? 'Waiting Room' : isTooLate ? 'Session Expired' : 'Room is Open'}
                    </div>
                    <div className="text-lg font-black tabular-nums">
                      {isEarly ? `Starts in ${timeUntilStart}` : isTooLate ? 'Access Period Ended' : 'You can enter now'}
                    </div>
                  </div>
               </div>
               <p className={`text-[10px] font-medium italic leading-relaxed ${isEarly || isTooLate ? 'text-rose-300/60' : 'text-emerald-300/60'}`}>
                 {isEarly ? 'The room will unlock 10 minutes before the interview.' : isTooLate ? 'This session is no longer active. Please contact support if you missed it.' : 'All checks passed. You can proceed to the secure interview room.'}
               </p>
            </div>

            <button 
              onClick={handleJoin}
              disabled={Object.values(checks).some(c => c !== 'success') || isEarly || isTooLate}
              className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-100 transition-all shadow-xl disabled:opacity-30 active:scale-95"
            >
              {isTooLate ? 'Session Closed' : 'Enter Interview Room'} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
