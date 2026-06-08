import React from 'react';
import { Shield, AlertCircle, Camera, CheckCircle2 } from 'lucide-react';

export default function ProctoringConsole({ 
  videoRef, 
  violations = 0, 
  status = 'active', 
  lastViolationType = null 
}) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-widest">Security Console</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Active Monitoring</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full flex items-center gap-2 border ${
          status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
        </div>
      </div>

      <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner group">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline 
          className="w-full h-full object-cover grayscale brightness-75 contrast-125 transition-all group-hover:grayscale-0 group-hover:brightness-100" 
        />
        <div className="absolute top-3 right-3 flex items-center gap-2">
           <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-white/10 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black text-white tracking-widest">LIVE FEED</span>
           </div>
        </div>
        
        {violations > 0 && (
          <div className="absolute inset-0 bg-rose-500/10 border-2 border-rose-500/50 pointer-events-none animate-pulse" />
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Violations</span>
          <div className="flex items-center gap-2">
            <AlertCircle className={`w-4 h-4 ${violations > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
            <span className={`text-xl font-black ${violations > 0 ? 'text-rose-500' : 'text-white'}`}>
              {violations.toString().padStart(2, '0')}
            </span>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Integrity Score</span>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xl font-black text-white">
              {Math.max(0, 100 - (violations * 10))}%
            </span>
          </div>
        </div>
      </div>

      {lastViolationType && (
        <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <div className="flex-1">
            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Recent Alert</p>
            <p className="text-[11px] text-rose-200 font-medium">{lastViolationType}</p>
          </div>
        </div>
      )}
    </div>
  );
}
