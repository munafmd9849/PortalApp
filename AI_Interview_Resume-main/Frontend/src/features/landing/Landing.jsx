import { Link } from "react-router";
import { useAuth } from "../auth/hooks/useAuth";
import "./landing.scss";

export default function Landing() {
  const { user } = useAuth();
  const primaryHref = user ? "/dashboard" : "/register";
  const primaryLabel = user ? "Go to dashboard" : "Start free";

  return (
    <div className="landing">
      <section className="hero container">
        <div className="hero-eyebrow mono">interview · ats · resume</div>
        <h1 className="hero-title">
          Walk into your next interview<br />
          <span className="accent">actually prepared.</span>
        </h1>
        <p className="hero-sub">
          Paste a job description, drop in your resume, and get an ATS score,
          skill gaps, tailored interview questions, and a 4-week prep plan —
          all in under 30 seconds.
        </p>
        <div className="hero-cta">
          <Link to={primaryHref} className="btn btn-primary btn-lg">{primaryLabel}</Link>
          <Link to="/ats" className="btn btn-secondary btn-lg">Check ATS score</Link>
        </div>
        <div className="hero-meta">
          <span>No credit card</span>
          <span className="dot">·</span>
          <span>Powered by Mistral</span>
          <span className="dot">·</span>
          <span>Works with any role</span>
        </div>
      </section>

      <section className="container features">
        <div className="feature-card">
          <div className="feature-num mono">01</div>
          <h3>Real ATS scoring</h3>
          <p>We check keyword density, formatting, readability, and experience alignment — the same signals Workday and Greenhouse look at. You get a score and exact fixes.</p>
        </div>
        <div className="feature-card">
          <div className="feature-num mono">02</div>
          <h3>Skill gaps, not fluff</h3>
          <p>See exactly which JD requirements you don't yet match, why each matters, and a concrete 1–2 step plan to close the gap. Named courses. Real resources.</p>
        </div>
        <div className="feature-card">
          <div className="feature-num mono">03</div>
          <h3>12 tailored questions</h3>
          <p>Technical, behavioral, situational, and role-specific — with what the interviewer is actually listening for, and a sample answer outline tied to your resume.</p>
        </div>
        <div className="feature-card">
          <div className="feature-num mono">04</div>
          <h3>ATS-friendly resume builder</h3>
          <p>Rewrite your resume for a target JD. Single column, clean bullets, quantified achievements. Export as a .docx that every ATS will parse cleanly.</p>
        </div>
      </section>

      <section className="container how">
        <div className="eyebrow">How it works</div>
        <div className="how-steps">
          <div className="how-step">
            <div className="how-step-n">1</div>
            <h4>Paste the JD</h4>
            <p>Drop in any job description — role title and company optional but help tune the output.</p>
          </div>
          <div className="how-step">
            <div className="how-step-n">2</div>
            <h4>Upload your resume</h4>
            <p>PDF, DOCX, or plain text. We extract the content, nothing is stored longer than needed.</p>
          </div>
          <div className="how-step">
            <div className="how-step-n">3</div>
            <h4>Get your report</h4>
            <p>ATS score, skill gaps, interview questions, and a week-by-week prep plan — saved to your dashboard.</p>
          </div>
        </div>
      </section>

      <section className="container cta-section">
        <div className="cta-card">
          <h2>Stop guessing. Prepare with a plan.</h2>
          <p>Every analysis is tied to the specific JD in front of you. No generic advice.</p>
          <Link to={primaryHref} className="btn btn-primary btn-lg">{primaryLabel}</Link>
        </div>
      </section>
    </div>
  );
}
