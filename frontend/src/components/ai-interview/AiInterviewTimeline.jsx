import React from 'react';
import { Bot, User, MessageSquare, ArrowRight } from 'lucide-react';

function TimelineItem({ event }) {
  if (event.type === 'question') {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1 min-w-0 pb-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-1">AI Interviewer</p>
          <p className="text-sm text-slate-200 leading-relaxed font-medium">{event.text}</p>
        </div>
      </div>
    );
  }

  if (event.type === 'answer') {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0 pb-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">Your Response</p>
          <p className="text-xs text-slate-400">
            Video recorded
            {event.durationSeconds ? ` · ${event.durationSeconds}s` : ''}
          </p>
        </div>
      </div>
    );
  }

  if (event.type === 'acknowledgement') {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
          <MessageSquare className="w-4 h-4 text-violet-300" />
        </div>
        <div className="flex-1 min-w-0 pb-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-violet-300 mb-1">AI Interviewer</p>
          <p className="text-sm text-slate-300 leading-relaxed italic">{event.text}</p>
        </div>
      </div>
    );
  }

  if (event.type === 'transition') {
    return (
      <div className="flex gap-3 pl-11 pb-4">
        <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 font-medium">{event.text}</p>
      </div>
    );
  }

  return null;
}

export default function AiInterviewTimeline({ events = [], upcomingQuestions = [] }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 shrink-0">
        Interview Timeline
      </h4>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-0">
        {events.length === 0 ? (
          <p className="text-xs text-slate-500 leading-relaxed">
            The conversation will appear here as the interview progresses.
          </p>
        ) : (
          events.map((ev, i) => <TimelineItem key={`${ev.type}-${ev.questionId}-${i}`} event={ev} />)
        )}
      </div>
      {upcomingQuestions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800 shrink-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Upcoming</p>
          <ul className="space-y-2">
            {upcomingQuestions.slice(0, 3).map((q, i) => (
              <li key={q.id} className="text-[11px] text-slate-500 line-clamp-2">
                <span className="text-slate-600 font-bold mr-1">Q{q.orderIndex + 1}.</span>
                {q.questionText}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
