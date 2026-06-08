/**
 * Mistral AI Service
 * Handles ATS resume scoring and AI resume optimization using Mistral models.
 */

import { Mistral } from '@mistralai/mistralai';

const MODEL = process.env.MISTRAL_MODEL || 'mistral-large-latest';

function getClient() {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY is not configured');
  return new Mistral({ apiKey, timeoutMs: 120000 });
}

/**
 * Internal: Call Mistral and return strict JSON
 */
async function callMistralJSON(systemPrompt, userPrompt, temperature = 0.3) {
  const client = getClient();
  const response = await client.chat.complete({
    model: MODEL,
    temperature,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  }, {
    timeoutMs: 120000,
    retries: {
      strategy: 'backoff',
      backoff: { initialInterval: 1000, maxInterval: 8000, exponent: 1.5, maxElapsedTime: 40000 },
      retryConnectionErrors: true,
    },
  });

  const raw = response.choices[0].message.content;
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Mistral did not return valid JSON');
  }
}

/* ─────────────────────────────────────────────
   Sanitizers (defensive — never trust model fully)
───────────────────────────────────────────── */
function clampInt(v, min = 0, max = 100) {
  const n = Math.round(Number(v));
  return Number.isNaN(n) ? 0 : Math.max(min, Math.min(max, n));
}
function arr(v) { return Array.isArray(v) ? v.filter(Boolean) : []; }
function str(v) { return typeof v === 'string' ? v : ''; }

/* ─────────────────────────────────────────────
   1. JOB-MATCHED ATS SCORE
───────────────────────────────────────────── */
/**
 * Score a resume against a specific job description using Mistral.
 * @param {string} resumeText - Extracted plain text from the student's resume
 * @param {string} jobDescription - Combined job description (description + requirements + skills)
 * @param {string} jobTitle - Title of the job
 * @returns {Promise<Object>} Rich ATS score with breakdown, keywords, suggestions
 */
export async function scoreATSWithJob({ resumeText, jobDescription, jobTitle = '' }) {
  const system = `You are an ATS (Applicant Tracking System) expert. You know how Workday, Greenhouse, Lever, and Taleo parse resumes. You return a single valid JSON object — no prose, no markdown fences.`;

  const user = `Score this resume for ATS compatibility against the job description below.

JOB TITLE:
${jobTitle || 'Not specified'}

TARGET JOB DESCRIPTION:
${(jobDescription || '').substring(0, 4000)}

RESUME TEXT:
${(resumeText || '').substring(0, 6000)}

Return JSON with EXACTLY this schema:
{
  "atsScore": <integer 0-100>,
  "atsBreakdown": {
    "keywordMatch": <0-100, how well resume keywords match the JD>,
    "formatting": <0-100, 100=clean parseable ATS layout; deduct for tables/images/graphics/multi-column>,
    "sectionCompleteness": <0-100, has contact, summary, experience, education, skills sections>,
    "readability": <0-100, strong action verbs, quantified achievements, no walls of text>,
    "experienceAlignment": <0-100, years and type of experience vs what JD asks for>
  },
  "matchedKeywords": [<up to 20 hard skills/tools from the JD that also appear in the resume>],
  "missingKeywords": [<up to 15 keywords from JD NOT in resume, ordered by importance>],
  "atsSuggestions": [<5-8 concrete specific fixes, each under 25 words>],
  "matchPercentage": <0-100 overall candidate-job fit>,
  "verdict": "<one sentence overall verdict, under 30 words>"
}

Scoring guide: 90-100 excellent, 75-89 good, 60-74 mediocre, 40-59 weak, 0-39 will not pass ATS. Be strict — most real resumes score 55-75.`;

  const json = await callMistralJSON(system, user, 0.2);
  const b = json.atsBreakdown || {};
  return {
    atsScore: clampInt(json.atsScore),
    atsBreakdown: {
      keywordMatch: clampInt(b.keywordMatch),
      formatting: clampInt(b.formatting),
      sectionCompleteness: clampInt(b.sectionCompleteness),
      readability: clampInt(b.readability),
      experienceAlignment: clampInt(b.experienceAlignment),
    },
    matchedKeywords: arr(json.matchedKeywords).map(String),
    missingKeywords: arr(json.missingKeywords).map(String),
    atsSuggestions: arr(json.atsSuggestions).map(String),
    matchPercentage: clampInt(json.matchPercentage),
    verdict: str(json.verdict),
    isAI: true,
  };
}

/* ─────────────────────────────────────────────
   2. AI RESUME OPTIMIZER
───────────────────────────────────────────── */
/**
 * Rewrite a student's resume sections to be optimized for a specific job.
 * @param {Object} studentProfile - Student profile data from DB
 * @param {string} jobDescription - Combined job description text
 * @param {string} jobTitle - Job title
 * @param {string} companyName - Company name
 * @returns {Promise<Object>} Optimized resume sections
 */
export async function optimizeResumeForJob({ studentProfile, jobDescription, jobTitle = '', companyName = '' }) {
  const system = `You are an expert resume writer who has helped candidates land offers at top companies. You write tight, achievement-focused, ATS-parseable resumes. Every bullet starts with a strong action verb and is quantified where possible. You never invent facts — if a data point was not provided, write without it rather than fabricating.

You return a single valid JSON object — no prose, no fences, no markdown.`;

  // Build candidate info from student profile
  const candidate = {
    fullName: studentProfile.fullName || '',
    email: studentProfile.email || '',
    phone: studentProfile.phone || '',
    school: studentProfile.school || '',
    batch: studentProfile.batch || '',
    center: studentProfile.center || '',
    cgpa: studentProfile.cgpa || null,
    summary: studentProfile.summary || studentProfile.bio || '',
    headline: studentProfile.headline || '',
    skills: (studentProfile.skills || []).map(s => s.skillName || s),
    experience: (studentProfile.experiences || []).map(e => ({
      title: e.title,
      company: e.company,
      start: e.start,
      end: e.end || 'Present',
      description: e.description || '',
    })),
    education: (studentProfile.education || []).map(e => ({
      degree: e.degree,
      institution: e.institution,
      startYear: e.startYear,
      endYear: e.endYear,
      cgpa: e.cgpa,
    })),
    projects: (studentProfile.projects || []).map(p => ({
      title: p.title,
      technologies: p.technologies,
      description: p.description || '',
    })),
    certifications: (studentProfile.certifications || []).map(c => c.title),
  };

  const user = `Optimize this candidate's resume for the specific job below. Rewrite sections to highlight the most relevant experience and match JD keywords without inventing facts.

JOB TITLE: ${jobTitle || 'Not specified'}
COMPANY: ${companyName || 'Not specified'}

JOB DESCRIPTION:
${(jobDescription || '').substring(0, 3500)}

CANDIDATE PROFILE:
${JSON.stringify(candidate, null, 2).substring(0, 4000)}

Return JSON with EXACTLY this schema:
{
  "summary": "<3-4 line professional summary. Lead with the candidate's strongest qualification for THIS role. Mention 2-3 keywords from the JD that the candidate actually has. No clichés.>",
  "skills": {
    "technical": [<reorder/curate skills list to highlight JD-relevant ones first. Include from JD if candidate has them.>],
    "tools": [<tools/platforms relevant to the JD>],
    "soft": [<3-4 soft skills relevant to the JD>]
  },
  "experience": [
    {
      "originalTitle": "<exact job title from candidate input — used to match>",
      "originalCompany": "<exact company name from candidate input>",
      "optimizedBullets": [
        "<Action verb + what was done + quantified impact tailored to JD, under 25 words>"
      ]
    }
  ],
  "projects": [
    {
      "originalTitle": "<exact project title from candidate input>",
      "optimizedBullets": [
        "<Action verb + what was built + tech stack + impact, under 25 words>"
      ]
    }
  ],
  "keywords": [<15-20 JD keywords that the candidate genuinely has — these improve ATS match rate>]
}

RULES:
- Use the exact tech/tool names from the JD when the candidate has them.
- Every bullet: strong action verb + concrete impact. Quantify only where candidate gave numbers.
- Never invent employers, dates, or metrics not in the input.
- Match JD keywords naturally; do not stuff.`;

  const json = await callMistralJSON(system, user, 0.35);

  return {
    summary: str(json.summary),
    skills: {
      technical: arr(json.skills?.technical).map(String),
      tools: arr(json.skills?.tools).map(String),
      soft: arr(json.skills?.soft).map(String),
    },
    experience: arr(json.experience).map(e => ({
      originalTitle: str(e.originalTitle),
      originalCompany: str(e.originalCompany),
      optimizedBullets: arr(e.optimizedBullets).map(String),
    })),
    projects: arr(json.projects).map(p => ({
      originalTitle: str(p.originalTitle),
      optimizedBullets: arr(p.optimizedBullets).map(String),
    })),
    keywords: arr(json.keywords).map(String),
  };
}
