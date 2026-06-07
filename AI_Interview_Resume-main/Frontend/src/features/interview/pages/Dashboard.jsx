import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import * as interviewApi from "../services/interview.api";
import { apiError } from "../../../lib/api";
import "../interview.scss";

export default function Dashboard() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await interviewApi.listReports();
        setReports(data.reports || []);
      } catch (e) {
        setError(apiError(e, "Could not load reports"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this report?")) return;
    try {
      await interviewApi.deleteReport(id);
      setReports(reports.filter((r) => r.id !== id));
    } catch (e) {
      alert(apiError(e, "Failed to delete"));
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h1>Your analyses</h1>
          <p className="text-muted mt-1">Every report you've generated, in one place.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/analyze" className="btn btn-primary">+ New analysis</Link>
        </div>
      </div>

      <div className="quick-actions mt-3">
        <Link to="/analyze" className="qa-card">
          <div className="qa-icon">◆</div>
          <div>
            <h4>Analyze a new JD</h4>
            <p>Upload resume + paste JD → full report</p>
          </div>
        </Link>
        <Link to="/ats" className="qa-card">
          <div className="qa-icon">◇</div>
          <div>
            <h4>Check ATS score</h4>
            <p>Quick resume health-check</p>
          </div>
        </Link>
        <Link to="/resume-builder" className="qa-card">
          <div className="qa-icon">◈</div>
          <div>
            <h4>Build an ATS resume</h4>
            <p>Tailor a resume to a specific role</p>
          </div>
        </Link>
      </div>

      <div className="mt-4">
        <h3 style={{ marginBottom: "1rem" }}>Recent reports</h3>

        {error && <div className="alert alert-error">{error}</div>}
        {loading && (
          <div className="empty"><span className="spinner spinner-lg" /></div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="card empty-state">
            <p>You haven't analysed any job descriptions yet.</p>
            <Link to="/analyze" className="btn btn-primary mt-2">Run your first analysis</Link>
          </div>
        )}

        {!loading && reports.length > 0 && (
          <div className="report-grid">
            {reports.map((r) => (
              <div
                className="report-card"
                key={r.id}
                onClick={() => navigate(`/reports/${r.id}`)}
                role="button"
                tabIndex={0}
              >
                <div className="report-card-head">
                  <span className={`score-pill ${scoreClass(r.atsScore)}`}>
                    {r.atsScore}<span className="score-suffix">/100</span>
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => onDelete(r.id, e)}
                    aria-label="Delete report"
                    title="Delete"
                  >✕</button>
                </div>
                <h4 className="report-title">{r.jobTitle || "Untitled role"}</h4>
                <div className="report-meta">
                  {r.company && <span>{r.company}</span>}
                  <span className="dot">·</span>
                  <span>{formatDate(r.createdAt)}</span>
                </div>
                <div className="report-match mt-2">
                  <span className="text-xs text-muted">Match</span>
                  <div className="match-bar"><span style={{ width: `${r.matchPercentage || 0}%` }} /></div>
                  <span className="mono text-xs">{r.matchPercentage || 0}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function scoreClass(s) {
  if (s >= 80) return "score-high";
  if (s >= 60) return "score-mid";
  return "score-low";
}
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
