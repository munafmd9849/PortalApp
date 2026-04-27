import { useState } from "react";
import * as resumeApi from "../services/resume.api";
import { apiError } from "../../../lib/api";
import "../resume.scss";

export default function AtsChecker() {
  const [resume, setResume] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [inputMode, setInputMode] = useState("file");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (inputMode === "file" && !resume) {
      setError("Upload a resume to check.");
      return;
    }
    if (inputMode === "paste" && resumeText.trim().length < 50) {
      setError("Paste at least 50 characters of resume text.");
      return;
    }

    setLoading(true);
    try {
      const data = await resumeApi.atsScore({
        resume: inputMode === "file" ? resume : null,
        resumeText: inputMode === "paste" ? resumeText : "",
        jobDescription,
      });
      setResult(data.result);
    } catch (e) {
      setError(apiError(e, "Scoring failed"));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setResume(null); setResumeText(""); };

  return (
    <div className="container container-narrow">
      <div className="page-header">
        <div>
          <div className="eyebrow">ATS checker</div>
          <h1>Is your resume ATS-ready?</h1>
          <p className="text-muted mt-1">Drop it in. Get a score in 15 seconds.</p>
        </div>
      </div>

      {!result ? (
        <form onSubmit={onSubmit} className="mt-3">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="card">
            <div className="card-header">
              <div className="card-title">1. Your resume</div>
              <div className="card-subtitle">PDF, DOCX, or plain text — up to 5 MB.</div>
            </div>

            <div className="tabs">
              <button type="button" className={`tab ${inputMode === "file" ? "active" : ""}`} onClick={() => setInputMode("file")}>Upload file</button>
              <button type="button" className={`tab ${inputMode === "paste" ? "active" : ""}`} onClick={() => setInputMode("paste")}>Paste text</button>
            </div>

            {inputMode === "file" ? (
              <label className="dropzone">
                <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setResume(e.target.files?.[0] || null)} />
                {resume ? (
                  <>
                    <div className="drop-icon">📄</div>
                    <div className="drop-file">{resume.name}</div>
                    <div className="drop-hint">Click to replace</div>
                  </>
                ) : (
                  <>
                    <div className="drop-icon">↑</div>
                    <div className="drop-file">Click to upload your resume</div>
                    <div className="drop-hint">PDF · DOCX · TXT</div>
                  </>
                )}
              </label>
            ) : (
              <textarea className="textarea" rows={10} value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste your resume text…" />
            )}
          </div>

          <div className="card mt-2">
            <div className="card-header">
              <div className="card-title">2. Target job description</div>
              <div className="card-subtitle">Optional — include it for keyword-matched scoring.</div>
            </div>
            <textarea className="textarea" rows={8} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste a JD (optional)…" />
          </div>

          <div className="mt-3 flex" style={{ justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? "Scoring…" : "Score my resume →"}
            </button>
          </div>
        </form>
      ) : (
        <AtsResult result={result} onReset={reset} />
      )}
    </div>
  );
}

function AtsResult({ result, onReset }) {
  const b = result.atsBreakdown || {};
  const rows = [
    ["Keyword match", b.keywordMatch],
    ["Formatting", b.formatting],
    ["Section completeness", b.sectionCompleteness],
    ["Readability", b.readability],
    ["Experience alignment", b.experienceAlignment],
  ];
  const scoreClass = result.atsScore >= 80 ? "score-high" : result.atsScore >= 60 ? "score-mid" : "score-low";

  return (
    <div className="mt-3">
      <div className="card ats-result-head">
        <div>
          <div className="eyebrow">ATS score</div>
          <div className="ats-big-score">
            <span className={`ats-score-num ${scoreClass}`}>{result.atsScore}</span>
            <span className="ats-score-den">/100</span>
          </div>
          {result.verdict && <p className="text-soft mt-1">{result.verdict}</p>}
        </div>
        <button className="btn btn-secondary" onClick={onReset}>Score another</button>
      </div>

      <div className="card mt-3">
        <div className="card-header"><div className="card-title">Breakdown</div></div>
        <div className="ats-rows">
          {rows.map(([label, value]) => (
            <div className="ats-row" key={label}>
              <div className="ats-row-label">{label}</div>
              <div className="ats-row-bar"><span className={`bar-fill ${value >= 80 ? "bar-high" : value >= 60 ? "bar-mid" : "bar-low"}`} style={{ width: `${value || 0}%` }} /></div>
              <div className="ats-row-value mono">{value ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      {(result.matchedKeywords?.length > 0 || result.missingKeywords?.length > 0) && (
        <div className="two-col mt-3">
          {result.matchedKeywords?.length > 0 && (
            <div className="card">
              <div className="card-header"><div className="card-title">Matched keywords</div></div>
              <div className="kw-wrap">
                {result.matchedKeywords.map((k) => <span key={k} className="badge badge-success">{k}</span>)}
              </div>
            </div>
          )}
          {result.missingKeywords?.length > 0 && (
            <div className="card">
              <div className="card-header"><div className="card-title">Missing keywords</div></div>
              <div className="kw-wrap">
                {result.missingKeywords.map((k) => <span key={k} className="badge badge-danger">{k}</span>)}
              </div>
            </div>
          )}
        </div>
      )}

      {result.atsSuggestions?.length > 0 && (
        <div className="card mt-3">
          <div className="card-header"><div className="card-title">Fixes</div></div>
          <ul className="clean-list">
            {result.atsSuggestions.map((s, i) => (
              <li key={i}><span className="bullet-dot bullet-info">→</span>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
