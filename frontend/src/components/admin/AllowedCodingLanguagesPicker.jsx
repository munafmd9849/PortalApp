import React from 'react';
import { Code2 } from 'lucide-react';
import { CODING_LANGUAGES } from '../../coding-engine/constants';

export default function AllowedCodingLanguagesPicker({
  selected = [],
  onChange,
  minCount = 1,
}) {
  const toggle = (id) => {
    if (selected.includes(id)) {
      if (selected.length <= minCount) return;
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
          <Code2 className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-900">Allowed coding languages</h4>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Students will only see these languages in the editor. Provide starter code for each
            selected language on every coding question.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {CODING_LANGUAGES.map((l) => {
          const active = selected.includes(l.id);
          const isLast = active && selected.length <= minCount;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => toggle(l.id)}
              disabled={isLast}
              title={isLast ? 'At least one language is required' : undefined}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                active
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white'
              } ${isLast ? 'opacity-90 cursor-not-allowed' : ''}`}
            >
              {l.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {selected.length} selected · shown to students on publish
      </p>
    </div>
  );
}
