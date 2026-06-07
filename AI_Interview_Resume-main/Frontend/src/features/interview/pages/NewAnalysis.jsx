import { useState } from "react";
import { useNavigate } from "react-router";
import * as interviewApi from "../services/interview.api";
import { apiError } from "../../../lib/api";
import "../interview.scss";

export default function NewAnalysis() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    jobTitle: "",
    company: "",
    jobDescription: "",
  });
  const [resume, setResume] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [inputMode, setInputMode] = useState("file"); // "file" | "paste"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.jobDescription.trim().length < 30) {
      setError("Please paste a full job description (at least 30 characters).");
      return;
    }
    if (inputMode === "file" && !resume) {
      setError("Please upload your resume.");
      return;
    }
    if (inputMode === "paste" && resumeText.trim().length < 50) {
      setError("Please paste your resume text (at least 50 characters).");
      return;
    }

    setLoading(true);
    try {
      const data = await interviewApi.analyze({
        resume: inputMode === "file" ? resume : null,
        resumeText: inputMode === "paste" ? resumeText : "",
        jobDescription: form.jobDescription,
        jobTitle: form.jobTitle,
        company: form.company,
      });
      navigate(`/reports/${data.report.id}`);
    } catch (e) {
      setError(apiError(e, "Analysis failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container container-narrow">
      <div className="page-header">
        <div>
          <div className="eyebrow">New analysis</div>
          <h1>Run a new report</h1>
          <p className="text-muted mt-1">Paste the JD, drop in your resume. We'll handle the rest.</p>
        </div>
      </div>

      {loading && (
        <div className="analysing-overlay">
          <div className="analysing-card">
            <span className="spinner spinner-lg" />
            <h3 className="mt-2">Analysing your fit…</h3>
            <p className="text-muted text-sm mt-1">Scoring, extracting keywords, drafting questions. About 15–25 seconds.</p>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="analyze-form mt-3">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <div className="card-header">
            <div className="card-title">1. The role</div>
            <div className="card-subtitle">Optional but improves accuracy.</div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label className="field-label" htmlFor="jobTitle">Job title</label>
              <input name="jobTitle" id="jobTitle" className="input" value={form.jobTitle} onChange={onChange} placeholder="e.g. Senior Frontend Engineer" />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="company">Company</label>
              <input name="company" id="company" className="input" value={form.company} onChange={onChange} placeholder="e.g. Stripe" />
            </div>
          </div>

          <div className="field mt-2">
            <label className="field-label" htmlFor="jobDescription">Job description *</label>
            <textarea
              name="jobDescription"
              id="jobDescription"
              className="textarea"
              rows={10}
              value={form.jobDescription}
              onChange={onChange}
              placeholder="Paste the full JD here — requirements, responsibilities, qualifications…"
              required
            />
            <div className="field-hint">{form.jobDescription.length} characters</div>
          </div>
        </div>

        <div className="card mt-2">
          <div className="card-header">
            <div className="card-title">2. Your resume</div>
            <div className="card-subtitle">PDF, DOCX or plain text. Max 5 MB.</div>
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
                  <div className="drop-hint">PDF · DOCX · TXT · up to 5 MB</div>
                </>
              )}
            </label>
          ) : (
            <textarea
              className="textarea"
              rows={10}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume text here…"
            />
          )}
        </div>

        <div className="mt-3 flex gap-1" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-secondary" onClick={() => history.back()}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? "Analysing…" : "Run analysis →"}
          </button>
        </div>
      </form>
    </div>
  );
}
