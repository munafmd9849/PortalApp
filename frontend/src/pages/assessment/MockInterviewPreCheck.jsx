import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Camera, Mic, Wifi, CheckCircle2,
  AlertCircle, ArrowRight, Loader2, Clock,
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function MockInterviewPreCheck() {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { role: userRole } = useAuth();

  const [checks, setChecks] = useState({
    camera: 'pending',
    mic: 'pending',
    network: 'pending',
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
        streamRef.current.getTracks().forEach((track) => track.stop());
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
      const oneHourAfter = new Date(endTime.getTime() + 60 * 60000);
      const now = new Date();

      if (!isAdmin) {
        if (now < tenMinsBefore) {
          setIsEarly(true);
          startCountdown(startTime);
        } else if (now > oneHourAfter) {
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setChecks((prev) => ({ ...prev, camera: 'success', mic: 'success' }));
    } catch (err) {
      setChecks((prev) => ({ ...prev, camera: 'failed', mic: 'failed' }));
      toast.error('Camera or microphone access was denied');
    }

    const start = Date.now();
    try {
      await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
      const latency = Date.now() - start;
      setChecks((prev) => ({ ...prev, network: latency < 500 ? 'success' : 'failed' }));
    } catch (err) {
      setChecks((prev) => ({ ...prev, network: 'failed' }));
    }
  };

  const handleJoin = () => {
    if (Object.values(checks).some((c) => c !== 'success')) {
      toast.error('Please fix the device checks before joining');
      return;
    }
    if (isEarly) {
      toast.error('The room opens 10 minutes before your scheduled time');
      return;
    }
    if (isTooLate) {
      toast.error('This session is no longer available');
      return;
    }
    navigate(`/mock-interview-room/${slotId}?role=student`);
  };

  const sessionTitle = slot?.drive?.title || 'Mock Interview';
  const allChecksPassed = Object.values(checks).every((c) => c === 'success');
  const canEnter = allChecksPassed && !isEarly && !isTooLate;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm text-gray-500">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-5xl w-full bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6">
        <div className="mb-4 pb-4 border-b border-gray-100">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900">{sessionTitle}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Check your camera and microphone, then join when the room is open.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div className="relative aspect-video max-h-44 sm:max-h-52 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
              {checks.camera === 'success' ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                  <Camera className="w-8 h-8" />
                  <p className="text-xs">Camera not detected</p>
                </div>
              )}
              {checks.camera === 'success' && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 border border-gray-200 rounded text-[10px] font-medium text-gray-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Preview
                </div>
              )}
            </div>

            <div className="rounded-md border border-gray-200 p-3">
              <h3 className="text-xs font-medium text-gray-500 mb-2">Device checks</h3>
              <div className="space-y-2">
                {[
                  { id: 'camera', label: 'Camera', icon: Camera },
                  { id: 'mic', label: 'Microphone', icon: Mic },
                  { id: 'network', label: 'Internet connection', icon: Wifi },
                ].map((item) => {
                  const Icon = item.icon;
                  const status = checks[item.id];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md border border-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 ${status === 'success' ? 'text-blue-600' : status === 'failed' ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className="text-xs font-medium text-gray-700">{item.label}</span>
                      </div>
                      {status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : status === 'failed' ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div
              className={`p-4 rounded-md border ${
                isEarly || isTooLate
                  ? 'bg-red-50 border-red-200'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                    isEarly || isTooLate ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className={`text-xs font-medium ${isEarly || isTooLate ? 'text-red-700' : 'text-emerald-700'}`}>
                    {isEarly ? 'Not open yet' : isTooLate ? 'Session closed' : 'Room is open'}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 tabular-nums">
                    {isEarly
                      ? `Opens in ${timeUntilStart}`
                      : isTooLate
                        ? 'This session has ended'
                        : 'You may enter now'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                    {isEarly
                      ? 'You can join 10 minutes before the scheduled start time.'
                      : isTooLate
                        ? 'Contact your placement office if you missed this session.'
                        : 'Use a quiet space and keep your resume handy. This session is recorded.'}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleJoin}
              disabled={!canEnter}
              className="w-full py-2.5 bg-gray-900 hover:bg-black text-white rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isTooLate ? 'Session closed' : 'Enter interview room'}
              {!isTooLate && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
