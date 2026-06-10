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
  title = 'Active Monitoring',
  mirrored = false,
  onVideoMount,
}) {
  const setVideoNode = (node) => {
    if (typeof videoRef === 'function') videoRef(node);
    else if (videoRef) videoRef.current = node;
    onVideoMount?.(node);
  };
  const shellBorder = borderless ? '' : 'border border-slate-800';
  const videoBorder = borderless ? '' : 'border border-slate-800';
  const feedBadgeBorder = borderless ? '' : 'border';
  const alertBorder = borderless ? '' : 'border border-rose-500/20';
  const violationOverlayBorder = borderless ? '' : 'border-2 border-rose-500/50';

  const flush = compact && borderless;

  return (
    <div className={`${flush ? 'flex-1 min-h-0 h-full flex flex-col p-3' : 'shrink-0'} ${!flush && (compact ? 'bg-slate-900/50 backdrop-blur-xl rounded-xl p-3' : `bg-slate-900/50 backdrop-blur-xl rounded-[2rem] p-6 shadow-2xl ${shellBorder}`)}`}>
      <div className={`flex items-center justify-between shrink-0 ${flush ? 'mb-2' : compact ? 'mb-2' : 'mb-6'}`}>
        <p className={`font-bold text-slate-500 uppercase tracking-tight ${compact ? 'text-[8px]' : 'text-[10px]'}`}>
          {title}
        </p>
        <div className={`rounded-full flex items-center ${feedBadgeBorder} ${compact ? 'px-2 py-0.5 gap-1.5' : 'px-3 py-1 gap-2'} ${
          cameraLive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-amber-950/80 border-amber-500/30 text-amber-400'
        }`}>
          <div className={`rounded-full animate-pulse ${cameraLive ? 'bg-emerald-500' : 'bg-amber-400'} ${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
          <span className={`font-black uppercase tracking-widest ${compact ? 'text-[8px]' : 'text-[10px]'}`}>
            {cameraLive ? 'Live Feed' : 'No Signal'}
          </span>
        </div>
      </div>

      <div className={`relative overflow-hidden bg-black shadow-inner w-full min-h-0 ${videoBorder} ${flush ? 'flex-1 rounded-lg' : compact ? 'h-44 shrink-0 rounded-lg' : 'aspect-video rounded-2xl'}`}>
        <video
          ref={setVideoNode}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
        />
        {!cameraLive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 pointer-events-none">
            <Camera className="w-8 h-8 text-slate-600" />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Camera reconnecting…</span>
          </div>
        )}
        
        {violations > 0 && (
          <div className={`absolute inset-0 bg-rose-500/10 pointer-events-none animate-pulse ${violationOverlayBorder}`} />
        )}
      </div>

      {lastViolationType && (
        <div className={`shrink-0 w-full bg-rose-500/10 flex items-center gap-2 ${alertBorder} ${flush ? 'mt-2 p-2.5 rounded-lg' : compact ? 'mt-2 p-2 rounded-lg' : 'mt-4 p-3 rounded-xl gap-3'}`}>
          <AlertCircle className={`text-rose-500 shrink-0 ${flush ? 'w-3.5 h-3.5' : compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
          <div className="flex-1 min-w-0">
            <p className={`font-black text-rose-500 uppercase tracking-widest ${flush ? 'text-[9px]' : compact ? 'text-[8px]' : 'text-[9px]'}`}>Recent Alert</p>
            <p className={`text-rose-200 font-medium truncate ${flush ? 'text-[11px]' : compact ? 'text-[10px]' : 'text-[11px]'}`}>{lastViolationType}</p>
          </div>
        </div>
      )}
    </div>
  );
}
