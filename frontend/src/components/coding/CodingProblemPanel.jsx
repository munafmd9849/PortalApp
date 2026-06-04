import React from 'react';

/**
 * LeetCode-style problem statement (left panel in split layout).
 */
export default function CodingProblemPanel({
  title,
  problem,
  constraints,
  examples = [],
  difficulty,
  points,
  className = '',
}) {
  return (
    <div className={`flex flex-col h-full min-h-0 overflow-y-auto bg-[#f8f9fb] text-slate-900 ${className}`}>
      <div className="px-5 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {difficulty && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              {difficulty}
            </span>
          )}
          {points != null && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
              {points} pts
            </span>
          )}
        </div>
        <h2 className="text-lg font-bold text-slate-900 leading-snug">{title || 'Coding problem'}</h2>
      </div>

      <div className="px-5 py-5 space-y-6 text-sm leading-relaxed">
        {problem ? (
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Problem</h3>
            <div className="text-slate-700 whitespace-pre-wrap font-medium">{problem}</div>
          </section>
        ) : (
          <p className="text-slate-400 italic">No problem statement provided.</p>
        )}

        {constraints ? (
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Constraints</h3>
            <div className="text-slate-600 whitespace-pre-wrap text-[13px] bg-white border border-slate-200 rounded-xl p-4 font-mono">
              {constraints}
            </div>
          </section>
        ) : null}

        {examples.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Examples</h3>
            {examples.map((ex, i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
              >
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {ex.label || `Example ${i + 1}`}
                </div>
                <div className="px-4 py-3 space-y-3 font-mono text-[13px]">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">Input</span>
                    <pre className="text-slate-800 whitespace-pre-wrap m-0 bg-emerald-50/50 rounded-lg p-2 border border-emerald-100">
                      {ex.input || ' '}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase block mb-1">Output</span>
                    <pre className="text-slate-800 whitespace-pre-wrap m-0 bg-indigo-50/50 rounded-lg p-2 border border-indigo-100">
                      {ex.output || ' '}
                    </pre>
                  </div>
                  {ex.explanation ? (
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Explanation</span>
                      <p className="text-slate-600 font-sans text-xs m-0 whitespace-pre-wrap">{ex.explanation}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="pb-6">
          <p className="text-[11px] text-slate-500 bg-white border border-slate-200 rounded-lg p-3">
            Implement <code className="text-indigo-600 font-bold">solution(input)</code> (JS/Python) or{' '}
            <code className="text-indigo-600 font-bold">public static Object solution(Object input)</code> (Java).
            Return the value that matches the expected output for each test.
          </p>
        </section>
      </div>
    </div>
  );
}
