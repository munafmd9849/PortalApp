import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import * as interviewApi from "../services/interview.api";
import { apiError } from "../../../lib/api";
import "../interview.scss";

export default function ReportView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    (async () => {
      try {
        const data = await interviewApi.getReport(id);
        setReport(data.report);
      } catch (e) {
        setError(apiError(e, "Could not load report"));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onDelete = async () => {
    if (!confirm("Delete this report permanently?")) return;
    try {
      await interviewApi.deleteReport(id);
      navigate("/dashboard");
    } catch (e) {
      alert(apiError(e, "Failed to delete"));
    }
  };

  if (loading) return <div className="loading-page"><span className="spinner spinner-lg" /></div>;
  if (error) return <div className="container"><div className="alert alert-error">{error}</div></div>;
  if (!report) return null;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "ats", label: "ATS details" },
    { id: "gaps", label: `Skill gaps (${report.skillGaps?.length || 0})` },
    { id: "questions", label: `Interview Qs (${report.interviewQuestions?.length || 0})` },
    { id: "plan", label: "Prep plan" },
  ];

  return (
    <div className="container">
      <div className="report-header">
        <div>
          <Link to="/dashboard" className="back-link">← Back to dashboard</Link>
          <h1 className="mt-1">{report.jobTitle || "Untitled role"}</h1>
          <div className="report-meta mt-1">
            {report.company && <span>{report.company}</span>}
            {report.company && <span className="dot">·</span>}
            <span>{new Date(report.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
            {report.resumeFileName && <><span className="dot">·</span><span className="mono text-xs">{report.resumeFileName}</span></>}
          </div>
        </div>
        <button className="btn btn-danger" onClick={onDelete}>Delete</button>
      </div>

      {/* Top scorecards */}
      <div className="score-grid mt-3">
        <ScoreCircle value={report.atsScore} label="ATS score" />
        <ScoreCircle value={report.matchPercentage} label="JD match" tone="info" />
        <StatBlock label="Matched keywords" value={report.matchedKeywords?.length || 0} />
        <StatBlock label="Skill gaps" value={report.skillGaps?.length || 0} tone="warn" />
      </div>

      {/* Tabs */}
      <div className="report-tabs mt-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`report-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      <div className="mt-3">
        {tab === "overview" && <Overview report={report} />}
        {tab === "ats" && <AtsDetails report={report} />}
        {tab === "gaps" && <SkillGaps report={report} />}
        {tab === "questions" && <Questions report={report} />}
        {tab === "plan" && <PrepPlan report={report} />}
      </div>
    </div>
  );
}

/* ============ Sub-views ============ */

function Overview({ report }) {
  return (
    <div className="two-col">
      <div className="card">
        <div className="card-header"><div className="card-title">Strengths</div></div>
        <ul className="clean-list">
          {(report.strengths || []).map((s, i) => (
            <li key={i}><span className="bullet-dot bullet-success">✓</span>{s}</li>
          ))}
          {(!report.strengths || report.strengths.length === 0) && <li className="text-muted">None identified.</li>}
        </ul>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Weaknesses</div></div>
        <ul className="clean-list">
          {(report.weaknesses || []).map((w, i) => (
            <li key={i}><span className="bullet-dot bullet-warn">!</span>{w}</li>
          ))}
          {(!report.weaknesses || report.weaknesses.length === 0) && <li className="text-muted">None identified.</li>}
        </ul>
      </div>
    </div>
  );
}

function AtsDetails({ report }) {
  const b = report.atsBreakdown || {};
  const rows = [
    ["Keyword match", b.keywordMatch],
    ["Formatting", b.formatting],
    ["Section completeness", b.sectionCompleteness],
    ["Readability", b.readability],
    ["Experience alignment", b.experienceAlignment],
  ];

  return (
    <>
      <div className="card">
        <div className="card-header"><div className="card-title">ATS score breakdown</div></div>
        <div className="ats-rows">
          {rows.map(([label, value]) => (
            <div className="ats-row" key={label}>
              <div className="ats-row-label">{label}</div>
              <div className="ats-row-bar"><span className={`bar-fill ${barClass(value)}`} style={{ width: `${value}%` }} /></div>
              <div className="ats-row-value mono">{value ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="two-col mt-3">
        <div className="card">
          <div className="card-header"><div className="card-title">Matched keywords</div><div className="card-subtitle">Present in your resume.</div></div>
          <div className="kw-wrap">
            {(report.matchedKeywords || []).map((k) => (
              <span key={k} className="badge badge-success">{k}</span>
            ))}
            {(!report.matchedKeywords || report.matchedKeywords.length === 0) && <span className="text-muted">None.</span>}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Missing keywords</div><div className="card-subtitle">In the JD, but not in your resume.</div></div>
          <div className="kw-wrap">
            {(report.missingKeywords || []).map((k) => (
              <span key={k} className="badge badge-danger">{k}</span>
            ))}
            {(!report.missingKeywords || report.missingKeywords.length === 0) && <span className="text-muted">Nothing missing — great.</span>}
          </div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-header"><div className="card-title">Concrete fixes</div></div>
        <ul className="clean-list">
          {(report.atsSuggestions || []).map((s, i) => (
            <li key={i}><span className="bullet-dot bullet-info">→</span>{s}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

function SkillGaps({ report }) {
  const gaps = report.skillGaps || [];
  if (!gaps.length) return <div className="card empty-state"><p>No skill gaps detected. Nice.</p></div>;

  const toneFor = (importance) => importance === "high" ? "badge-danger" : importance === "medium" ? "badge-warning" : "badge-info";

  return (
    <div className="gap-grid">
      {gaps.map((g, i) => (
        <div className="card gap-card" key={i}>
          <div className="gap-head">
            <h4>{g.skill}</h4>
            <span className={`badge ${toneFor(g.importance)}`}>{g.importance}</span>
          </div>
          <p className="text-soft mt-1">{g.reason}</p>
          {g.howToLearn && (
            <div className="gap-learn mt-2">
              <div className="eyebrow" style={{ marginBottom: "0.25rem" }}>How to close it</div>
              <p className="text-sm">{g.howToLearn}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Questions({ report }) {
  const qs = report.interviewQuestions || [];
  const [open, setOpen] = useState({});
  const toggle = (i) => setOpen({ ...open, [i]: !open[i] });

  const categoryColor = (c) => ({
    technical: "badge-accent",
    behavioral: "badge-info",
    situational: "badge-warning",
    "role-specific": "badge-success",
  }[c] || "");

  if (!qs.length) return <div className="card empty-state"><p>No questions generated.</p></div>;

  return (
    <div className="questions-list">
      {qs.map((q, i) => (
        <div className={`question-card ${open[i] ? "open" : ""}`} key={i}>
          <button className="question-head" onClick={() => toggle(i)}>
            <div className="question-tags">
              <span className={`badge ${categoryColor(q.category)}`}>{q.category}</span>
              <span className="badge">{q.difficulty}</span>
            </div>
            <div className="question-text">{q.question}</div>
            <span className="question-chev">{open[i] ? "−" : "+"}</span>
          </button>
          {open[i] && (
            <div className="question-body">
              {q.whatTheyLookFor && (
                <>
                  <div className="eyebrow">What they're looking for</div>
                  <p className="mt-1 text-soft">{q.whatTheyLookFor}</p>
                </>
              )}
              {q.sampleAnswerOutline && (
                <>
                  <div className="eyebrow mt-2">Sample answer outline</div>
                  <ul className="clean-list mt-1">
                    {q.sampleAnswerOutline.split("|").map((p, idx) => (
                      <li key={idx}><span className="bullet-dot bullet-info">·</span>{p.trim()}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PrepPlan({ report }) {
  const plan = report.preparationPlan || {};
  const weeks = plan.weekByWeek || [];

  return (
    <>
      {plan.summary && (
        <div className="card">
          <div className="eyebrow">Overall strategy</div>
          <p className="mt-1 text-soft">{plan.summary}</p>
        </div>
      )}
      <div className="plan-grid mt-3">
        {weeks.map((w) => (
          <div className="card plan-week" key={w.week}>
            <div className="plan-week-n">Week {w.week}</div>
            <h4>{w.focus}</h4>
            {w.actions?.length > 0 && (
              <>
                <div className="eyebrow mt-2">Actions</div>
                <ul className="clean-list mt-1">
                  {w.actions.map((a, i) => <li key={i}><span className="bullet-dot bullet-accent">→</span>{a}</li>)}
                </ul>
              </>
            )}
            {w.resources?.length > 0 && (
              <>
                <div className="eyebrow mt-2">Resources</div>
                <ul className="clean-list mt-1">
                  {w.resources.map((r, i) => <li key={i}><span className="bullet-dot bullet-info">◆</span>{r}</li>)}
                </ul>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ============ small building blocks ============ */
function ScoreCircle({ value, label, tone }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const color = tone === "info" ? "#60a5fa" : safeValue >= 80 ? "var(--success)" : safeValue >= 60 ? "var(--warning)" : "var(--danger)";
  const dash = (safeValue / 100) * 283; // circumference for r=45
  return (
    <div className="score-card">
      <svg viewBox="0 0 100 100" className="score-svg">
        <circle cx="50" cy="50" r="45" stroke="var(--border)" strokeWidth="8" fill="none" />
        <circle
          cx="50" cy="50" r="45"
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${dash} 283`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text x="50" y="55" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--ink)">{safeValue}</text>
      </svg>
      <div className="score-label">{label}</div>
    </div>
  );
}

function StatBlock({ label, value, tone }) {
  return (
    <div className="stat-card">
      <div className={`stat-value ${tone === "warn" ? "warn" : ""}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
function barClass(v) {
  if (v >= 80) return "bar-high";
  if (v >= 60) return "bar-mid";
  return "bar-low";
}
