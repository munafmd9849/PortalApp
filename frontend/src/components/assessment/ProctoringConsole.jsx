import React from 'react';
import { AlertCircle, Camera } from 'lucide-react';

export default function ProctoringConsole({ 
  videoRef, 
  violations = 0, 
  status = 'active', 
  lastViolationType = null,
  cameraLive = false,
  borderless = false,
  compact = false,
  variant = 'dark',
}) {
  const isLight = variant === 'light';
  const shellBorder = borderless ? '' : isLight ? 'border border-gray-200' : 'border border-slate-800';
  const videoBorder = borderless ? '' : isLight ? 'border border-gray-200' : 'border border-slate-800';
  const feedBadgeBorder = borderless ? '' : 'border';
  const alertBorder = borderless ? '' : isLight ? 'border border-red-200' : 'border border-rose-500/20';
  const violationOverlayBorder = borderless ? '' : isLight ? 'border-2 border-red-300' : 'border-2 border-rose-500/50';

  const flush = compact && borderless;
  const shellBg = isLight
    ? 'bg-white'
    : compact
      ? 'bg-slate-900/50 backdrop-blur-xl'
      : 'bg-slate-900/50 backdrop-blur-xl';
  const labelClass = isLight ? 'text-gray-500' : 'text-slate-500';

  return (
    <div className={`${flush ? 'flex-1 min-h-0 h-full flex flex-col p-3' : 'shrink-0'} ${!flush && (compact ? `${shellBg} rounded-lg p-3` : `${shellBg} rounded-lg p-4 shadow-sm ${shellBorder}`)}`}>
      <div className={`flex items-center justify-between shrink-0 ${flush ? 'mb-2' : compact ? 'mb-2' : 'mb-3'}`}>
        <p className={`font-medium ${labelClass} ${compact ? 'text-[8px]' : 'text-xs'}`}>
          {isLight ? 'Camera feed' : 'Active Monitoring'}
        </p>
        <div className={`rounded-md flex items-center ${feedBadgeBorder} ${compact ? 'px-2 py-0.5 gap-1.5' : 'px-2 py-0.5 gap-1.5'} ${
          cameraLive
            ? isLight
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
            : isLight
              ? 'bg-amber-50 border-amber-100 text-amber-700'
              : 'bg-amber-950/80 border-amber-500/30 text-amber-400'
        }`}>
          <div className={`rounded-full animate-pulse ${cameraLive ? 'bg-emerald-500' : 'bg-amber-400'} ${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
          <span className={`font-medium ${compact ? 'text-[8px]' : 'text-[10px]'}`}>
            {cameraLive ? (isLight ? 'Live' : 'Live Feed') : (isLight ? 'Offline' : 'No Signal')}
          </span>
        </div>
      </div>

      <div className={`relative overflow-hidden bg-gray-100 shadow-inner w-full min-h-0 ${videoBorder} ${flush ? 'flex-1 rounded-md' : compact ? 'h-44 shrink-0 rounded-md' : isLight ? 'h-36 rounded-md' : 'aspect-video rounded-2xl'}`}>
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className="w-full h-full object-cover" 
        />
        {!cameraLive && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none ${isLight ? 'bg-gray-200/90' : 'bg-black/80'}`}>
            <Camera className={`w-8 h-8 ${isLight ? 'text-gray-400' : 'text-slate-600'}`} />
            <span className={`text-[10px] font-medium ${isLight ? 'text-gray-500' : 'text-slate-500'}`}>Camera reconnecting…</span>
          </div>
        )}
        
        {violations > 0 && (
          <div className={`absolute inset-0 pointer-events-none animate-pulse ${isLight ? 'bg-red-50' : 'bg-rose-500/10'} ${violationOverlayBorder}`} />
        )}
      </div>

      {lastViolationType && (
        <div className={`shrink-0 w-full flex items-center gap-2 ${isLight ? 'bg-red-50' : 'bg-rose-500/10'} ${alertBorder} ${flush ? 'mt-2 p-2.5 rounded-md' : compact ? 'mt-2 p-2 rounded-md' : 'mt-3 p-2.5 rounded-md gap-3'}`}>
          <AlertCircle className={`shrink-0 ${isLight ? 'text-red-500' : 'text-rose-500'} ${flush ? 'w-3.5 h-3.5' : compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${isLight ? 'text-red-700' : 'text-rose-500'} ${flush ? 'text-[9px]' : compact ? 'text-[8px]' : 'text-[10px]'}`}>Recent alert</p>
            <p className={`font-medium truncate ${isLight ? 'text-red-600 text-xs' : 'text-rose-200 text-[11px]'}`}>{lastViolationType}</p>
          </div>
        </div>
      )}
    </div>
  );
}
