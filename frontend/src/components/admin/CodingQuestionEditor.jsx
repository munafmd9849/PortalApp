import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { emptyExample, emptyTestCase } from '../../coding-engine/testCaseUtils';

export default function CodingQuestionEditor({ question, onChange }) {
  const q = question || {};
  const examples = Array.isArray(q.examples) ? q.examples : [];
  const testCases = Array.isArray(q.testCases) ? q.testCases : [];

  const patch = (field, value) => onChange({ ...q, [field]: value });

  const updateExample = (idx, field, value) => {
    const next = [...examples];
    next[idx] = { ...next[idx], [field]: value };
    patch('examples', next);
  };

  const updateTestCase = (idx, field, value) => {
    const next = [...testCases];
    next[idx] = { ...next[idx], [field]: value };
    patch('testCases', next);
  };

  return (
    <div className="space-y-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
          Question title
        </label>
        <input
          value={q.text || ''}
          onChange={(e) => patch('text', e.target.value)}
          className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-sm"
          placeholder="e.g. Two Sum"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
          Problem statement
        </label>
        <textarea
          value={q.description || ''}
          onChange={(e) => patch('description', e.target.value)}
          className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium h-36 resize-none"
          placeholder="Describe the task, input format, and what to return..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
          Constraints
        </label>
        <textarea
          value={q.constraints || ''}
          onChange={(e) => patch('constraints', e.target.value)}
          className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-mono h-24 resize-none"
          placeholder={'1 <= n <= 10^5\n-10^9 <= nums[i] <= 10^9'}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Examples (shown to students)
          </label>
          <button
            type="button"
            onClick={() => patch('examples', [...examples, emptyExample()])}
            className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add example
          </button>
        </div>
        {examples.map((ex, idx) => (
          <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 relative">
            <button
              type="button"
              onClick={() => patch('examples', examples.filter((_, i) => i !== idx))}
              className="absolute top-3 right-3 text-rose-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="grid sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Input</span>
                <textarea
                  value={ex.input}
                  onChange={(e) => updateExample(idx, 'input', e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg font-mono text-xs h-16"
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Output</span>
                <textarea
                  value={ex.output}
                  onChange={(e) => updateExample(idx, 'output', e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg font-mono text-xs h-16"
                />
              </div>
            </div>
            <input
              value={ex.explanation || ''}
              onChange={(e) => updateExample(idx, 'explanation', e.target.value)}
              className="w-full p-2 border rounded-lg text-xs"
              placeholder="Explanation (optional)"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
            Starter code
          </label>
          <textarea
            value={q.starterCode || ''}
            onChange={(e) => patch('starterCode', e.target.value)}
            className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl h-52 border border-slate-800"
            placeholder={'function solution(input) {\n  // your code\n}'}
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Judge test cases
            </label>
            <button
              type="button"
              onClick={() => patch('testCases', [...testCases, emptyTestCase()])}
              className="text-[10px] font-bold text-indigo-600 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add case
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
            {testCases.map((tc, idx) => (
              <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500">Case {idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px]">
                      <input
                        type="checkbox"
                        checked={Boolean(tc.hidden)}
                        onChange={(e) => updateTestCase(idx, 'hidden', e.target.checked)}
                      />
                      Hidden
                    </label>
                    <button
                      type="button"
                      onClick={() => patch('testCases', testCases.filter((_, i) => i !== idx))}
                      className="text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={tc.input}
                  onChange={(e) => updateTestCase(idx, 'input', e.target.value)}
                  className="w-full p-2 border rounded font-mono h-12"
                  placeholder="Input"
                />
                <textarea
                  value={tc.expectedOutput}
                  onChange={(e) => updateTestCase(idx, 'expectedOutput', e.target.value)}
                  className="w-full p-2 border rounded font-mono h-12"
                  placeholder="Expected output"
                />
              </div>
            ))}
            {testCases.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">Add at least one judge test case.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
