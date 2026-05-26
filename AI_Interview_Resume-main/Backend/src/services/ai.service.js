const { Mistral } = require("@mistralai/mistralai");

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY,
  timeoutMs: 180000
 });

const MODEL = process.env.MISTRAL_MODEL || "mistral-large-latest";

/**
 * Basic text completion wrapper.
 */
async function generateContent(prompt, { temperature = 0.4 } = {}) {
  const response = await client.chat.complete({
    model: MODEL,
    temperature,
    messages: [{ role: "user", content: prompt }],
  },{
    timeoutMs: 180000,
    retries: {strategy: "backoff", backoff: {initialInterval: 1000, maxInterval: 5000, exponent: 1.5, maxElapsedTime: 30000}, retryConnectionErrors: true}
  });
  return response.choices[0].message.content;
}

/**
 * Ask Mistral to return strict JSON. Parses and re-attempts once if the model
 * wraps the JSON in prose or fences.
 */
async function generateJSON(systemPrompt, userPrompt, { temperature = 0.3 } = {}) {
  const response = await client.chat.complete({
    model: MODEL,
    temperature,
    responseFormat: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  },{
    timeoutMs: 180000,
    retries: {strategy: "backoff", backoff: {initialInterval: 1000, maxInterval: 5000, exponent: 1.5, maxElapsedTime: 30000}, retryConnectionErrors: true}
  });

  const raw = response.choices[0].message.content;
  try {
    return { json: JSON.parse(raw), raw };
  } catch {
    // Try to extract the first {...} block
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return { json: JSON.parse(match[0]), raw };
      } catch {
        // fall through
      }
    }
    throw new Error("Model did not return valid JSON");
  }
}

/**
 * ============================================================
 *  1. FULL INTERVIEW ANALYSIS
 *  Takes resume text + JD, returns:
 *    - ATS score + breakdown + keywords
 *    - match %, strengths, weaknesses
 *    - skill gaps
 *    - categorised interview questions
 *    - week-by-week prep plan
 * ============================================================
 */
async function analyzeInterview({ resumeText, jobDescription, jobTitle = "", company = "" }) {
  const system = `You are a senior technical recruiter and career coach with 15+ years of experience hiring at FAANG-level companies and reviewing thousands of resumes. You give brutally honest, specific, actionable feedback — never generic advice.

You always return a single valid JSON object. No prose outside JSON. No markdown fences.`;

  const user = `Analyse this candidate for the role below.

=== JOB TITLE ===
${jobTitle || "Not specified"}

=== COMPANY ===
${company || "Not specified"}

=== JOB DESCRIPTION ===
${jobDescription}

=== CANDIDATE RESUME (extracted text) ===
${resumeText}

Return a JSON object with this EXACT schema. Every field is required. Do NOT invent facts that aren't in the resume. Use concrete, specific language tied to the actual resume and JD — never generic filler like "good communication skills".

{
  "atsScore": <integer 0-100>,
  "atsBreakdown": {
    "keywordMatch": <0-100, how well resume keywords match the JD>,
    "formatting": <0-100, 100 if resume looks clean, parseable, no tables/images/graphics. Deduct for multi-column layouts, tables, headers/footers, images>,
    "sectionCompleteness": <0-100, has contact, summary, experience, education, skills sections>,
    "readability": <0-100, strong action verbs, quantified achievements, no walls of text>,
    "experienceAlignment": <0-100, years and type of experience vs what JD asks for>
  },
  "matchedKeywords": [<up to 20 hard skills/tools/keywords from the JD that also appear in the resume>],
  "missingKeywords": [<up to 15 keywords from the JD that are NOT in the resume — order by importance>],
  "atsSuggestions": [<5-8 concrete, specific fixes to raise the ATS score. Each under 25 words. Example: "Add 'Docker' and 'Kubernetes' to your Skills section — both appear 3x in the JD but are missing from your resume.">],

  "matchPercentage": <0-100 overall fit>,
  "strengths": [<4-6 specific strengths. Tie each to a real line in the resume. Example: "3 years of React experience at XYZ Corp directly maps to the 'Senior Frontend Engineer' requirement.">],
  "weaknesses": [<3-5 specific gaps. Example: "No backend experience shown — JD requires Node.js/Express for full-stack responsibilities.">],

  "skillGaps": [
    {
      "skill": "<exact skill name from JD>",
      "importance": "high" | "medium" | "low",
      "reason": "<why this matters for the role, under 30 words>",
      "howToLearn": "<concrete 1-2 step plan. Name real resources: specific courses, docs, books, projects. Under 40 words.>"
    }
    // 4-7 entries, ordered by importance high -> low
  ],

  "interviewQuestions": [
    // EXACTLY 12 questions total, distributed as:
    //   4 technical (role-specific hard skills)
    //   3 behavioral (STAR-style)
    //   3 situational (hypothetical scenarios)
    //   2 role-specific deep-dives (about the candidate's actual resume experience)
    {
      "category": "technical" | "behavioral" | "situational" | "role-specific",
      "difficulty": "easy" | "medium" | "hard",
      "question": "<the actual question, phrased as an interviewer would ask>",
      "whatTheyLookFor": "<what signal the interviewer is testing, under 30 words>",
      "sampleAnswerOutline": "<3-5 bullet points of what a strong answer covers, joined by ' | '. Reference the candidate's actual resume where possible.>"
    }
  ],

  "preparationPlan": {
    "summary": "<2-3 sentence overall prep strategy for this candidate for this role>",
    "weekByWeek": [
      {
        "week": 1,
        "focus": "<theme for the week>",
        "actions": [<3-5 specific actions, each under 20 words>],
        "resources": [<2-4 named resources: specific books, courses, docs, YouTube channels>]
      }
      // EXACTLY 4 weeks
    ]
  }
}

CRITICAL RULES:
- If resumeText is very short or looks empty, still return the schema but set matchPercentage/atsScore low and explain in weaknesses/atsSuggestions.
- Keywords must be single words or short phrases actually present in the JD text.
- Never output a value as null or undefined — use an empty array [] or empty string "" if truly unknown.
- Do not use markdown formatting inside any string. Plain text only.`;

  console.log(`[AI] Starting interview analysis for ${jobTitle} at ${company}...`);
  const startTime = Date.now();
  const { json, raw } = await generateJSON(system, user, { temperature: 0.3 });
  const duration = (Date.now() - startTime) / 1000;
  console.log(`[AI] Analysis complete in ${duration.toFixed(1)}s`);
  return { analysis: sanitizeAnalysis(json), raw };
}

/**
 * ============================================================
 *  2. ATS SCORE ONLY
 *  Lighter call — resume alone, or resume + optional JD.
 * ============================================================
 */
async function scoreATS({ resumeText, jobDescription = "" }) {
  const system = `You are an ATS (Applicant Tracking System) expert. You know how Workday, Greenhouse, Lever, and Taleo parse resumes. You return a single valid JSON object — no prose, no fences.`;

  const user = `Score this resume for ATS compatibility.

${jobDescription ? `TARGET JOB DESCRIPTION:\n${jobDescription}\n\n` : "No specific JD provided — score for general ATS-friendliness.\n\n"}RESUME TEXT:
${resumeText}

Return JSON with this schema:
{
  "atsScore": <0-100>,
  "atsBreakdown": {
    "keywordMatch": <0-100>,
    "formatting": <0-100>,
    "sectionCompleteness": <0-100>,
    "readability": <0-100>,
    "experienceAlignment": <0-100>
  },
  "matchedKeywords": [<strings>],
  "missingKeywords": [<strings, only if JD provided>],
  "atsSuggestions": [<5-8 specific, concrete fixes. Each under 25 words.>],
  "verdict": "<one sentence overall verdict, under 30 words>"
}

Scoring guide:
- 90-100: excellent, likely to pass any ATS and rank high
- 75-89: good, minor fixes needed
- 60-74: mediocre, multiple issues
- 40-59: weak, major rewrite needed
- 0-39: will not pass ATS

Be strict. Most real resumes score 55-75.`;

  const { json } = await generateJSON(system, user, { temperature: 0.2 });
  return sanitizeATS(json);
}

/**
 * ============================================================
 *  3. ATS-FRIENDLY RESUME GENERATION
 *  Takes candidate info + target JD, returns a structured resume JSON
 *  that the docx generator turns into a .docx file.
 * ============================================================
 */
async function generateATSResume({ candidate, jobDescription = "", existingResumeText = "" }) {
  const system = `You are a resume writer who has helped candidates land offers at Google, Stripe, and Microsoft. You write tight, achievement-focused, ATS-parseable resumes. Every bullet starts with a strong action verb and is quantified where possible. You never invent facts — if the candidate did not provide a data point, you write the bullet without one rather than fabricating.

You return a single valid JSON object — no prose, no fences, no markdown.`;

  const user = `Generate an ATS-friendly resume for this candidate${
    jobDescription ? " tailored to the job description below" : ""
  }.

=== CANDIDATE INPUT ===
${JSON.stringify(candidate, null, 2)}

${existingResumeText ? `=== EXISTING RESUME (for reference, do not copy verbatim) ===\n${existingResumeText}\n\n` : ""}${
    jobDescription ? `=== TARGET JOB DESCRIPTION ===\n${jobDescription}\n\n` : ""
  }Return JSON with this schema:
{
  "fullName": "<string>",
  "headline": "<role-focused headline, under 10 words. Example: 'Full-Stack Engineer | React, Node.js, AWS'>",
  "contact": {
    "email": "<string>",
    "phone": "<string>",
    "location": "<City, Country>",
    "linkedin": "<url or empty>",
    "github": "<url or empty>",
    "portfolio": "<url or empty>"
  },
  "summary": "<3-4 line professional summary. Lead with years of experience + specialisation. Mention 2-3 top skills from the JD. No clichés like 'passionate' or 'hardworking'.>",
  "skills": {
    "technical": [<strings — group by JD priority>],
    "tools": [<strings>],
    "soft": [<3-5 strings>]
  },
  "experience": [
    {
      "title": "<job title>",
      "company": "<company>",
      "location": "<string>",
      "startDate": "<Mon YYYY>",
      "endDate": "<Mon YYYY or 'Present'>",
      "bullets": [
        "<Action verb + what you did + quantified impact. Under 25 words.>"
        // 3-5 bullets per role
      ]
    }
  ],
  "education": [
    {
      "degree": "<string>",
      "institution": "<string>",
      "location": "<string>",
      "startDate": "<YYYY>",
      "endDate": "<YYYY>",
      "details": "<gpa, honors, relevant coursework — or empty>"
    }
  ],
  "projects": [
    {
      "name": "<string>",
      "tech": "<comma-separated tech stack>",
      "link": "<url or empty>",
      "bullets": [<2-3 bullets, quantified>]
    }
  ],
  "certifications": [<strings — 'Name — Issuer, YYYY'>],
  "keywords": [<15-20 keywords pulled from the JD that are ALSO true of the candidate — these will be worked into the bullets above, listed here for the ATS>]
}

RULES:
- Use the exact tech/tool names from the JD when the candidate has them (e.g. if JD says "React.js" do not write "ReactJS").
- Every experience bullet: strong action verb + concrete impact. Quantify where the candidate gave numbers.
- Never invent employers, dates, or metrics not in the input.
- If a section has no data, return an empty array. Do not write "N/A" or placeholders.
- All strings must be plain text. No markdown, no bullet characters inside strings.`;

  const { json } = await generateJSON(system, user, { temperature: 0.35 });
  return sanitizeResume(json);
}

/* -------------------- sanitizers (defensive, never trust the model fully) -------------------- */

function clampInt(v, min = 0, max = 100) {
  const n = Math.round(Number(v));
  if (Number.isNaN(n)) return 0;
  return Math.max(min, Math.min(max, n));
}

function arr(v) {
  return Array.isArray(v) ? v.filter(Boolean) : [];
}

function str(v) {
  return typeof v === "string" ? v : "";
}

function sanitizeATS(j) {
  const b = j.atsBreakdown || {};
  return {
    atsScore: clampInt(j.atsScore),
    atsBreakdown: {
      keywordMatch: clampInt(b.keywordMatch),
      formatting: clampInt(b.formatting),
      sectionCompleteness: clampInt(b.sectionCompleteness),
      readability: clampInt(b.readability),
      experienceAlignment: clampInt(b.experienceAlignment),
    },
    matchedKeywords: arr(j.matchedKeywords).map(String),
    missingKeywords: arr(j.missingKeywords).map(String),
    atsSuggestions: arr(j.atsSuggestions).map(String),
    verdict: str(j.verdict),
  };
}

function sanitizeAnalysis(j) {
  const ats = sanitizeATS(j);
  return {
    ...ats,
    matchPercentage: clampInt(j.matchPercentage),
    strengths: arr(j.strengths).map(String),
    weaknesses: arr(j.weaknesses).map(String),
    skillGaps: arr(j.skillGaps).map((g) => ({
      skill: str(g.skill),
      importance: ["high", "medium", "low"].includes(g.importance) ? g.importance : "medium",
      reason: str(g.reason),
      howToLearn: str(g.howToLearn),
    })),
    interviewQuestions: arr(j.interviewQuestions).map((q) => ({
      category: ["technical", "behavioral", "situational", "role-specific"].includes(q.category)
        ? q.category
        : "technical",
      difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
      question: str(q.question),
      whatTheyLookFor: str(q.whatTheyLookFor),
      sampleAnswerOutline: str(q.sampleAnswerOutline),
    })),
    preparationPlan: {
      summary: str(j.preparationPlan?.summary),
      weekByWeek: arr(j.preparationPlan?.weekByWeek).map((w) => ({
        week: Math.round(Number(w.week)) || 0,
        focus: str(w.focus),
        actions: arr(w.actions).map(String),
        resources: arr(w.resources).map(String),
      })),
    },
  };
}

function sanitizeResume(j) {
  return {
    fullName: str(j.fullName),
    headline: str(j.headline),
    contact: {
      email: str(j.contact?.email),
      phone: str(j.contact?.phone),
      location: str(j.contact?.location),
      linkedin: str(j.contact?.linkedin),
      github: str(j.contact?.github),
      portfolio: str(j.contact?.portfolio),
    },
    summary: str(j.summary),
    skills: {
      technical: arr(j.skills?.technical).map(String),
      tools: arr(j.skills?.tools).map(String),
      soft: arr(j.skills?.soft).map(String),
    },
    experience: arr(j.experience).map((e) => ({
      title: str(e.title),
      company: str(e.company),
      location: str(e.location),
      startDate: str(e.startDate),
      endDate: str(e.endDate),
      bullets: arr(e.bullets).map(String),
    })),
    education: arr(j.education).map((e) => ({
      degree: str(e.degree),
      institution: str(e.institution),
      location: str(e.location),
      startDate: str(e.startDate),
      endDate: str(e.endDate),
      details: str(e.details),
    })),
    projects: arr(j.projects).map((p) => ({
      name: str(p.name),
      tech: str(p.tech),
      link: str(p.link),
      bullets: arr(p.bullets).map(String),
    })),
    certifications: arr(j.certifications).map(String),
    keywords: arr(j.keywords).map(String),
  };
}

module.exports = {
  client,
  generateContent,
  generateJSON,
  analyzeInterview,
  scoreATS,
  generateATSResume,
};
