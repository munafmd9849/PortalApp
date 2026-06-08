import React, { useState } from 'react';
import {
  Terminal,
  Plus,
  Send,
  Wifi,
  WifiOff,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { createCodingQuestion, defaultStarterCode } from '../../utils/mockInterviewQuestions';
import { CodingWorkspace } from '../../coding-engine';

export default function MockInterviewTechBoard({
  isInterviewer,
  connected,
  code,
  language,
  onCodeChange,
  onLanguageChange,
  questions,
  activeQuestion,
  activeQuestionId,
  onSelectQuestion,
  onPushQuestion,
  onAddQuestion,
  readOnly,
  onResetCode,
}) {
  const [customInput, setCustomInput] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftLang, setDraftLang] = useState('javascript');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddQuestion = () => {
    if (!draftTitle.trim()) return;
    const q = createCodingQuestion({
      title: draftTitle.trim(),
      description: draftDescription.trim(),
      language: draftLang,
      starterCode: defaultStarterCode(draftLang),
    });
    onAddQuestion?.(q);
    setDraftTitle('');
    setDraftDescription('');
    setShowAddForm(false);
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-600" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            {isInterviewer ? 'Interviewer — Tech Board' : 'Your solution'}
          </span>
        </div>
        <span
          className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 px-2 py-1 rounded-md ${
            connected
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-amber-50 text-amber-700 border border-amber-100'
          }`}
        >
          {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {connected ? 'Live sync' : 'Connecting…'}
        </span>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Questions panel */}
        <div className="w-[42%] min-w-[200px] border-r border-slate-100 flex flex-col bg-white">
          <div className="p-3 border-b border-slate-50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Coding questions
            </span>
            {isInterviewer && (
              <button
                type="button"
                onClick={() => setShowAddForm((v) => !v)}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            )}
          </div>

          {isInterviewer && showAddForm && (
            <div className="p-3 border-b border-indigo-100 bg-indigo-50/40 space-y-2">
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Question title"
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg"
              />
              <textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="Problem statement..."
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg resize-none"
              />
              <select
                value={draftLang}
                onChange={(e) => setDraftLang(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-lg"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-2 bg-indigo-600 text-white text-[10px] font-bold uppercase rounded-lg"
              >
                Save question
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {questions.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">
                {isInterviewer
                  ? 'Add a coding question for the candidate.'
                  : 'Waiting for interviewer to share a question…'}
              </p>
            ) : (
              questions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`rounded-xl border p-3 transition-all ${
                    activeQuestionId === q.id
                      ? 'border-indigo-400 bg-indigo-50/60 shadow-sm'
                      : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectQuestion?.(q.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {q.title || `Question ${idx + 1}`}
                      </span>
                    </div>
                    {q.description ? (
                      <p className="text-[10px] text-slate-500 line-clamp-3 whitespace-pre-wrap">
                        {q.description}
                      </p>
                    ) : null}
                  </button>
                  {isInterviewer && (
                    <button
                      type="button"
                      onClick={() => onPushQuestion?.(q.id)}
                      className="mt-2 w-full py-1.5 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                    >
                      <Send className="w-3 h-3" /> Push to candidate
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {activeQuestion && !isInterviewer && (
            <div className="p-3 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500">
              <span className="font-bold text-slate-700 block mb-1">Active question</span>
              {activeQuestion.title}
            </div>
          )}
        </div>

        {/* Code panel — shared coding engine */}
        <div className="flex-1 flex flex-col min-w-0 min-h-[360px]">
          {isInterviewer && activeQuestionId && (
            <div className="px-2 py-1.5 border-b border-slate-100 flex justify-end bg-slate-50">
              <button
                type="button"
                onClick={() => onResetCode?.(activeQuestionId)}
                className="text-[9px] font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 uppercase"
              >
                <RotateCcw className="w-3 h-3" /> Reset to starter
              </button>
            </div>
          )}
          <CodingWorkspace
            compact
            code={code}
            language={language}
            onCodeChange={onCodeChange}
            onLanguageChange={onLanguageChange}
            customInput={customInput}
            onCustomInputChange={setCustomInput}
            readOnly={readOnly}
            questionTitle={activeQuestion?.title}
            questionDescription={activeQuestion?.description}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}
