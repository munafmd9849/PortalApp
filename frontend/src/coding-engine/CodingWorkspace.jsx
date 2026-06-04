import React, { useCallback, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Loader2, Send, Terminal, AlertCircle, CheckCircle2, FlaskConical } from 'lucide-react';
import { CODING_LANGUAGES, DEFAULT_STARTERS, RUN_DEBOUNCE_MS } from './constants';
import { runCode, evaluateCode } from './api';
import { parseTestCases } from './testCaseUtils';

/**
 * LeetCode-style code workspace: editor, custom I/O, run, run all tests, submit.
 */
export default function CodingWorkspace({
  code,
  language,
  onCodeChange,
  onLanguageChange,
  customInput = '',
  onCustomInputChange,
  readOnly = false,
  showSubmit = false,
  onSubmit,
  testCases = [],
  showProblemHeader = true,
  questionTitle = '',
  questionDescription = '',
  lastRun = null,
  evaluation = null,
  onRunComplete,
  onEvaluateComplete,
  onTestsEmpty,
  onError,
  compact = false,
  className = '',
}) {
  const [running, setRunning] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [runResult, setRunResult] = useState(lastRun);
  const [evalResult, setEvalResult] = useState(evaluation);
  const runLockRef = useRef(false);
  const lastRunAtRef = useRef(0);

  const monacoLang = useMemo(
    () => CODING_LANGUAGES.find((l) => l.id === language)?.monaco || 'javascript',
    [language]
  );

  const parsedCases = useMemo(() => parseTestCases(testCases), [testCases]);

  const displayOutput = useMemo(() => {
    if (runResult?.error) {
      return { type: 'error', text: runResult.error };
    }
    if (runResult?.output != null && runResult.output !== '') {
      return { type: 'ok', text: runResult.output };
    }
    return { type: 'muted', text: 'Output will appear here after you run.' };
  }, [runResult]);

  const runEvaluation = useCallback(async () => {
    const cases = parseTestCases(testCases);
    if (cases.length === 0) {
      onTestsEmpty?.();
      return null;
    }
    setEvaluating(true);
    try {
      const result = await evaluateCode({ language, code, testCases: cases });
      setEvalResult(result);
      onEvaluateComplete?.(result);
      if (result.error) onError?.(result.error);
      return result;
    } catch (err) {
      const fail = { passed: 0, total: 0, score: 0, results: [], error: err.message };
      setEvalResult(fail);
      onEvaluateComplete?.(fail);
      onError?.(err.message || 'Evaluation failed');
      return fail;
    } finally {
      setEvaluating(false);
    }
  }, [language, code, testCases, onEvaluateComplete, onTestsEmpty, onError]);

  const handleRun = useCallback(async () => {
    const now = Date.now();
    if (runLockRef.current || now - lastRunAtRef.current < RUN_DEBOUNCE_MS) return;
    lastRunAtRef.current = now;
    runLockRef.current = true;
    setRunning(true);
    try {
      const result = await runCode({ language, code, input: customInput });
      setRunResult(result);
      onRunComplete?.(result);
      if (result.error) onError?.(result.error);
    } catch (err) {
      const fail = { output: '', error: err.message || 'Run failed', executionTime: 0 };
      setRunResult(fail);
      onRunComplete?.(fail);
      onError?.(err.message);
    } finally {
      setRunning(false);
      runLockRef.current = false;
    }
  }, [language, code, customInput, onRunComplete, onError]);

  const handleSubmitClick = useCallback(async () => {
    let latestEval = evalResult;
    if (parsedCases.length > 0) {
      latestEval = await runEvaluation();
    }
    onSubmit?.({
      code,
      language,
      customInput,
      lastRun: runResult,
      evaluation: latestEval,
      submittedAt: new Date().toISOString(),
    });
  }, [parsedCases.length, runEvaluation, onSubmit, code, language, customInput, runResult, evalResult]);

  const handleLanguageSwitch = (lang) => {
    if (readOnly) return;
    onLanguageChange?.(lang);
    if (!code?.trim() || Object.values(DEFAULT_STARTERS).some((s) => s === code)) {
      onCodeChange?.(DEFAULT_STARTERS[lang] || DEFAULT_STARTERS.javascript);
    }
  };

  return (
    <div className={`flex flex-col h-full min-h-0 bg-[#0d1117] ${className}`}>
      {showProblemHeader && (questionTitle || questionDescription) && (
        <div className="px-4 py-3 border-b border-white/10 bg-[#161b22] shrink-0">
          {questionTitle ? <p className="text-xs font-bold text-white">{questionTitle}</p> : null}
          {questionDescription ? (
            <p className="text-[11px] text-slate-400 mt-1 whitespace-pre-wrap line-clamp-4">
              {questionDescription}
            </p>
          ) : null}
        </div>
      )}

      {!readOnly && (
        <p className="px-3 py-1.5 text-[9px] text-slate-500 bg-[#161b22] border-b border-white/5 shrink-0">
          Use <code className="text-indigo-400">solution(input)</code> — input can be plain text or JSON (e.g.{' '}
          <code className="text-indigo-400">[2,7,11,15]</code>).
        </p>
      )}

      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between gap-2 bg-[#161b22] shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {readOnly ? 'Candidate code' : 'Editor'}
          </span>
          <select
            value={language}
            disabled={readOnly}
            onChange={(e) => handleLanguageSwitch(e.target.value)}
            className="bg-[#0d1117] border border-white/10 rounded-md px-2 py-1 text-[10px] font-bold text-indigo-300 uppercase"
          >
            {CODING_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRun}
            disabled={running || !code}
            className="h-8 px-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-1.5"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run
          </button>
          {!readOnly && parsedCases.length > 0 && (
            <button
              type="button"
              onClick={runEvaluation}
              disabled={evaluating || !code}
              className="h-8 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-1.5"
            >
              {evaluating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FlaskConical className="w-3.5 h-3.5" />
              )}
              Run tests
            </button>
          )}
          {showSubmit && !readOnly && (
            <button
              type="button"
              onClick={handleSubmitClick}
              disabled={evaluating}
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-1.5"
            >
              {evaluating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit
            </button>
          )}
        </div>
      </div>

      <div className={`flex-1 min-h-0 ${compact ? 'min-h-[200px]' : 'min-h-[240px]'}`}>
        <Editor
          theme="vs-dark"
          language={monacoLang}
          value={code}
          onChange={(v) => !readOnly && onCodeChange?.(v ?? '')}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: compact ? 12 : 14,
            lineNumbers: 'on',
            padding: { top: 12 },
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            quickSuggestions: !readOnly,
            domReadOnly: readOnly,
          }}
        />
      </div>

      <div
        className={`grid grid-cols-1 ${compact ? '' : 'md:grid-cols-2'} border-t border-white/10 shrink-0 min-h-[120px]`}
      >
        <div className="border-b md:border-b-0 md:border-r border-white/10 flex flex-col">
          <div className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-[#161b22]">
            Custom input
          </div>
          <textarea
            value={customInput}
            onChange={(e) => !readOnly && onCustomInputChange?.(e.target.value)}
            readOnly={readOnly}
            placeholder="stdin / function argument (JSON supported)"
            className="flex-1 min-h-[72px] p-3 bg-[#0d1117] text-emerald-400/90 font-mono text-xs resize-none outline-none border-0"
          />
        </div>
        <div className="flex flex-col min-h-[88px]">
          <div className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-[#161b22] flex justify-between">
            <span>Output</span>
            {runResult?.executionTime != null && (
              <span className="text-slate-600 tabular-nums">{runResult.executionTime}ms</span>
            )}
          </div>
          <pre
            className={`flex-1 p-3 m-0 overflow-auto font-mono text-xs whitespace-pre-wrap ${
              displayOutput.type === 'error'
                ? 'text-rose-400'
                : displayOutput.type === 'ok'
                  ? 'text-emerald-300'
                  : 'text-slate-500'
            }`}
          >
            {displayOutput.text}
          </pre>
        </div>
      </div>

      {evalResult && (evalResult.total > 0 || evalResult.error) && (
        <div className="px-3 py-2 border-t border-white/10 bg-[#161b22] shrink-0 max-h-40 overflow-y-auto">
          <div className="flex items-center gap-2 mb-1">
            {evalResult.passed === evalResult.total && evalResult.total > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
            <span className="text-[10px] font-bold text-white uppercase">
              Tests {evalResult.passed}/{evalResult.total}
              {evalResult.score != null ? ` · ${evalResult.score}%` : ''}
            </span>
          </div>
          {evalResult.error && <p className="text-[10px] text-rose-400">{evalResult.error}</p>}
          <ul className="space-y-1 mt-1">
            {(evalResult.results || []).map((r, i) => (
              <li key={i} className="text-[10px] text-slate-400 font-mono">
                <span className={r.passed ? 'text-emerald-400' : 'text-rose-400'}>
                  {r.passed ? '✓' : '✗'} {r.label}
                </span>
                {!r.passed && (
                  <span className="block text-slate-500 pl-3 mt-0.5">
                    {r.error
                      ? `Error: ${r.error}`
                      : `Expected: ${r.expectedOutput} · Got: ${r.actualOutput || '(empty)'}`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
