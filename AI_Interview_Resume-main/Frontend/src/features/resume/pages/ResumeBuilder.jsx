import { useState } from "react";
import * as resumeApi from "../services/resume.api";
import { apiError } from "../../../lib/api";
import "../resume.scss";

const emptyExp = { title: "", company: "", location: "", startDate: "", endDate: "", bullets: [""] };
const emptyEdu = { degree: "", institution: "", location: "", startDate: "", endDate: "", details: "" };
const emptyProject = { name: "", tech: "", link: "", bullets: [""] };

export default function ResumeBuilder() {
  const [step, setStep] = useState("input"); // input | generating | edit
  const [candidate, setCandidate] = useState({
    fullName: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    portfolio: "",
    summary: "",
    skills: "",
    experience: [ { ...emptyExp } ],
    education: [ { ...emptyEdu } ],
    projects: [],
    certifications: "",
  });
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setField = (key, value) => setCandidate({ ...candidate, [key]: value });
  const setExp = (i, key, value) => {
    const exp = [...candidate.experience];
    exp[i] = { ...exp[i], [key]: value };
    setCandidate({ ...candidate, experience: exp });
  };
  const setExpBullet = (i, bi, value) => {
    const exp = [...candidate.experience];
    const bullets = [...exp[i].bullets];
    bullets[bi] = value;
    exp[i] = { ...exp[i], bullets };
    setCandidate({ ...candidate, experience: exp });
  };
  const addExpBullet = (i) => {
    const exp = [...candidate.experience];
    exp[i] = { ...exp[i], bullets: [...exp[i].bullets, ""] };
    setCandidate({ ...candidate, experience: exp });
  };
  const addExp = () => setCandidate({ ...candidate, experience: [...candidate.experience, { ...emptyExp }] });
  const removeExp = (i) => setCandidate({ ...candidate, experience: candidate.experience.filter((_, idx) => idx !== i) });

  const setEdu = (i, key, value) => {
    const edu = [...candidate.education];
    edu[i] = { ...edu[i], [key]: value };
    setCandidate({ ...candidate, education: edu });
  };
  const addEdu = () => setCandidate({ ...candidate, education: [...candidate.education, { ...emptyEdu }] });
  const removeEdu = (i) => setCandidate({ ...candidate, education: candidate.education.filter((_, idx) => idx !== i) });

  const onGenerate = async (e) => {
    e.preventDefault();
    setError("");
    if (!candidate.fullName.trim()) { setError("At least put your name."); return; }

    setBusy(true);
    setStep("generating");
    try {
      const data = await resumeApi.generateStructured({
        candidate,
        jobDescription,
        existingResumeText: "",
      });
      setResume(data.resume);
      setStep("edit");
    } catch (e) {
      setError(apiError(e, "Generation failed"));
      setStep("input");
    } finally {
      setBusy(false);
    }
  };

  const onExport = async () => {
    setBusy(true);
    try {
      const blob = await resumeApi.exportDocx(resume);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(resume.fullName || "resume").replace(/[^a-z0-9]+/gi, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(apiError(e, "Export failed"));
    } finally {
      setBusy(false);
    }
  };

  /* ---------- UI ---------- */

  if (step === "generating") {
    return (
      <div className="container">
        <div className="analysing-overlay">
          <div className="analysing-card">
            <span className="spinner spinner-lg" />
            <h3 className="mt-2">Writing your resume…</h3>
            <p className="text-muted text-sm mt-1">Tightening bullets, embedding keywords, formatting for ATS.</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "edit" && resume) {
    return (
      <div className="container container-narrow">
        <div className="page-header">
          <div>
            <div className="eyebrow">Edit & export</div>
            <h1>Your generated resume</h1>
            <p className="text-muted mt-1">Review, tweak anything, and export as an ATS-friendly DOCX.</p>
          </div>
          <div className="page-header-actions flex gap-1">
            <button className="btn btn-secondary" onClick={() => setStep("input")}>Edit inputs</button>
            <button className="btn btn-primary" onClick={onExport} disabled={busy}>
              {busy ? "Exporting…" : "Download .docx ↓"}
            </button>
          </div>
        </div>

        <ResumePreview resume={resume} onChange={setResume} />
      </div>
    );
  }

  return (
    <div className="container container-narrow">
      <div className="page-header">
        <div>
          <div className="eyebrow">Resume builder</div>
          <h1>Generate an ATS-friendly resume</h1>
          <p className="text-muted mt-1">Fill in what you've got. We'll rewrite bullets and tailor it to your target JD.</p>
        </div>
      </div>

      {error && <div className="alert alert-error mt-2">{error}</div>}

      <form onSubmit={onGenerate} className="mt-3 rb-form">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Basics</div>
          </div>
          <div className="grid-2">
            <Input label="Full name *" value={candidate.fullName} onChange={(v) => setField("fullName", v)} required />
            <Input label="Headline" placeholder="e.g. Full-Stack Engineer | React, Node, AWS" value={candidate.headline} onChange={(v) => setField("headline", v)} />
            <Input label="Email" type="email" value={candidate.email} onChange={(v) => setField("email", v)} />
            <Input label="Phone" value={candidate.phone} onChange={(v) => setField("phone", v)} />
            <Input label="Location" placeholder="City, Country" value={candidate.location} onChange={(v) => setField("location", v)} />
            <Input label="LinkedIn" value={candidate.linkedin} onChange={(v) => setField("linkedin", v)} />
            <Input label="GitHub" value={candidate.github} onChange={(v) => setField("github", v)} />
            <Input label="Portfolio" value={candidate.portfolio} onChange={(v) => setField("portfolio", v)} />
          </div>
          <div className="field mt-2">
            <label className="field-label">Summary</label>
            <textarea className="textarea" rows={3} value={candidate.summary} onChange={(e) => setField("summary", e.target.value)} placeholder="A line or two about who you are (optional — we can rewrite this)." />
          </div>
          <div className="field mt-2">
            <label className="field-label">Skills</label>
            <textarea className="textarea" rows={2} value={candidate.skills} onChange={(e) => setField("skills", e.target.value)} placeholder="Comma-separated: React, TypeScript, Node.js, PostgreSQL, AWS…" />
          </div>
        </div>

        <div className="card mt-2">
          <div className="card-header">
            <div className="card-title">Experience</div>
            <div className="card-subtitle">Add each role. We'll tighten the bullets.</div>
          </div>
          {candidate.experience.map((e, i) => (
            <div className="rb-block" key={i}>
              <div className="rb-block-head">
                <span className="text-muted text-xs mono">#{i + 1}</span>
                {candidate.experience.length > 1 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeExp(i)}>Remove</button>
                )}
              </div>
              <div className="grid-2">
                <Input label="Title" value={e.title} onChange={(v) => setExp(i, "title", v)} />
                <Input label="Company" value={e.company} onChange={(v) => setExp(i, "company", v)} />
                <Input label="Location" value={e.location} onChange={(v) => setExp(i, "location", v)} />
                <div className="grid-2 gap-1" style={{ gap: "0.5rem" }}>
                  <Input label="Start" placeholder="Jan 2023" value={e.startDate} onChange={(v) => setExp(i, "startDate", v)} />
                  <Input label="End" placeholder="Present" value={e.endDate} onChange={(v) => setExp(i, "endDate", v)} />
                </div>
              </div>
              <div className="field mt-2">
                <label className="field-label">Bullet points</label>
                {e.bullets.map((b, bi) => (
                  <input key={bi} className="input mt-1" value={b} onChange={(ev) => setExpBullet(i, bi, ev.target.value)} placeholder="What you did + the measurable impact" />
                ))}
                <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={() => addExpBullet(i)}>+ Add bullet</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-secondary mt-2" onClick={addExp}>+ Add another role</button>
        </div>

        <div className="card mt-2">
          <div className="card-header"><div className="card-title">Education</div></div>
          {candidate.education.map((e, i) => (
            <div className="rb-block" key={i}>
              <div className="rb-block-head">
                <span className="text-muted text-xs mono">#{i + 1}</span>
                {candidate.education.length > 1 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeEdu(i)}>Remove</button>
                )}
              </div>
              <div className="grid-2">
                <Input label="Degree" value={e.degree} onChange={(v) => setEdu(i, "degree", v)} />
                <Input label="Institution" value={e.institution} onChange={(v) => setEdu(i, "institution", v)} />
                <Input label="Location" value={e.location} onChange={(v) => setEdu(i, "location", v)} />
                <div className="grid-2" style={{ gap: "0.5rem" }}>
                  <Input label="Start" placeholder="2019" value={e.startDate} onChange={(v) => setEdu(i, "startDate", v)} />
                  <Input label="End" placeholder="2023" value={e.endDate} onChange={(v) => setEdu(i, "endDate", v)} />
                </div>
              </div>
              <Input label="Details (GPA, honors, coursework)" value={e.details} onChange={(v) => setEdu(i, "details", v)} />
            </div>
          ))}
          <button type="button" className="btn btn-secondary mt-2" onClick={addEdu}>+ Add education</button>
        </div>

        <div className="card mt-2">
          <div className="card-header"><div className="card-title">Certifications</div></div>
          <textarea className="textarea" rows={2} value={candidate.certifications} onChange={(e) => setField("certifications", e.target.value)} placeholder="One per line — e.g. AWS Solutions Architect — Amazon, 2024" />
        </div>

        <div className="card mt-2">
          <div className="card-header">
            <div className="card-title">Target job description</div>
            <div className="card-subtitle">Optional — paste a JD and we'll tailor the resume to it.</div>
          </div>
          <textarea className="textarea" rows={8} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the JD you're applying to (optional)…" />
        </div>

        <div className="mt-3 flex" style={{ justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? "Generating…" : "Generate my resume →"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ============ inline components ============ */

function Input({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} />
    </div>
  );
}

function ResumePreview({ resume, onChange }) {
  const edit = (key, value) => onChange({ ...resume, [key]: value });
  const editContact = (key, value) => onChange({ ...resume, contact: { ...resume.contact, [key]: value } });
  const editExp = (i, key, value) => {
    const exp = [...resume.experience];
    exp[i] = { ...exp[i], [key]: value };
    onChange({ ...resume, experience: exp });
  };
  const editExpBullet = (i, bi, value) => {
    const exp = [...resume.experience];
    const bullets = [...exp[i].bullets];
    bullets[bi] = value;
    exp[i] = { ...exp[i], bullets };
    onChange({ ...resume, experience: exp });
  };

  return (
    <div className="resume-preview mt-2">
      <div className="card">
        <input className="rp-name" value={resume.fullName} onChange={(e) => edit("fullName", e.target.value)} placeholder="Full Name" />
        <input className="rp-headline" value={resume.headline} onChange={(e) => edit("headline", e.target.value)} placeholder="Headline" />
        <div className="rp-contact">
          <input className="rp-contact-item" value={resume.contact?.email || ""} onChange={(e) => editContact("email", e.target.value)} placeholder="Email" />
          <input className="rp-contact-item" value={resume.contact?.phone || ""} onChange={(e) => editContact("phone", e.target.value)} placeholder="Phone" />
          <input className="rp-contact-item" value={resume.contact?.location || ""} onChange={(e) => editContact("location", e.target.value)} placeholder="Location" />
          <input className="rp-contact-item" value={resume.contact?.linkedin || ""} onChange={(e) => editContact("linkedin", e.target.value)} placeholder="LinkedIn" />
          <input className="rp-contact-item" value={resume.contact?.github || ""} onChange={(e) => editContact("github", e.target.value)} placeholder="GitHub" />
        </div>
      </div>

      <div className="card mt-2">
        <h3 className="rp-section">Professional Summary</h3>
        <textarea className="textarea" rows={3} value={resume.summary || ""} onChange={(e) => edit("summary", e.target.value)} />
      </div>

      {resume.skills && (
        <div className="card mt-2">
          <h3 className="rp-section">Skills</h3>
          <div className="grid-2">
            <div className="field">
              <label className="field-label">Technical</label>
              <textarea className="textarea" rows={2} value={(resume.skills.technical || []).join(", ")} onChange={(e) => edit("skills", { ...resume.skills, technical: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            </div>
            <div className="field">
              <label className="field-label">Tools</label>
              <textarea className="textarea" rows={2} value={(resume.skills.tools || []).join(", ")} onChange={(e) => edit("skills", { ...resume.skills, tools: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
            </div>
          </div>
        </div>
      )}

      <div className="card mt-2">
        <h3 className="rp-section">Experience</h3>
        {(resume.experience || []).map((e, i) => (
          <div className="rp-exp" key={i}>
            <div className="grid-2">
              <input className="input" value={e.title} onChange={(ev) => editExp(i, "title", ev.target.value)} placeholder="Title" />
              <input className="input" value={e.company} onChange={(ev) => editExp(i, "company", ev.target.value)} placeholder="Company" />
              <input className="input" value={e.location} onChange={(ev) => editExp(i, "location", ev.target.value)} placeholder="Location" />
              <div className="grid-2" style={{ gap: "0.5rem" }}>
                <input className="input" value={e.startDate} onChange={(ev) => editExp(i, "startDate", ev.target.value)} placeholder="Start" />
                <input className="input" value={e.endDate} onChange={(ev) => editExp(i, "endDate", ev.target.value)} placeholder="End" />
              </div>
            </div>
            <div className="field mt-1">
              {(e.bullets || []).map((b, bi) => (
                <input key={bi} className="input mt-1" value={b} onChange={(ev) => editExpBullet(i, bi, ev.target.value)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {resume.education?.length > 0 && (
        <div className="card mt-2">
          <h3 className="rp-section">Education</h3>
          {resume.education.map((e, i) => (
            <div className="rp-exp" key={i}>
              <div className="grid-2">
                <input className="input" value={e.degree} onChange={(ev) => {
                  const edu = [...resume.education]; edu[i] = { ...edu[i], degree: ev.target.value }; onChange({ ...resume, education: edu });
                }} placeholder="Degree" />
                <input className="input" value={e.institution} onChange={(ev) => {
                  const edu = [...resume.education]; edu[i] = { ...edu[i], institution: ev.target.value }; onChange({ ...resume, education: edu });
                }} placeholder="Institution" />
              </div>
            </div>
          ))}
        </div>
      )}

      {resume.keywords?.length > 0 && (
        <div className="card mt-2">
          <h3 className="rp-section">Embedded keywords <span className="text-xs text-muted">(for ATS)</span></h3>
          <div className="kw-wrap">
            {resume.keywords.map((k) => <span key={k} className="badge badge-accent">{k}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}
