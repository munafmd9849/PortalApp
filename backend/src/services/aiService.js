/**
 * AI Service
 * Handles LLM calls for resume content generation
 * Uses centralized AI abstraction layer
 */

import { generateAIContent } from './ai/index.js';
import { AI_CONFIG } from '../config/ai.config.js';

/**
 * Generate project content using AI
 * @param {Object} projectData - Project input data
 * @param {string} projectData.title - Project title
 * @param {string} projectData.description - Raw project description
 * @param {string[]} projectData.techStack - Array of technologies
 * @returns {Promise<Object>} Generated content with summary, bullets, and skills
 */
export async function generateProjectContent({ title, description, techStack = [] }) {
  try {
    // Check if AI is available
    if (!AI_CONFIG.enabled || !AI_CONFIG.google.apiKey) {
      console.warn('AI service not configured, using fallback generation');
      return await generateFallback({ title, description, techStack });
    }

    // Use AI abstraction layer
    const prompt = `You are a resume content generator. 

Given a project's title, raw student description, and tech stack:

1. rewrite into a crisp professional SUMMARY (max 1–2 sentences)
2. create 3–4 strong resume bullets (action + impact)
3. extract relevant skills strictly based on the project

Project Title: ${title}
Description: ${description || 'No description provided'}
Tech Stack: ${techStack.join(', ') || 'Not specified'}

Return JSON with:
{
  "summary": "Professional summary (1-2 sentences)",
  "bullets": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
  "skills": ["Skill1", "Skill2", "Skill3"]
}

Return ONLY valid JSON, no markdown, no code blocks.`;

    const aiResponse = await generateAIContent(prompt);
    
    // Check if AI returned an error message
    if (aiResponse.includes('unavailable') || 
        aiResponse.includes('not configured') || 
        aiResponse.includes('disabled')) {
      // AI service is not available - use fallback
      return await generateFallback({ title, description, techStack });
    }

    // Parse JSON from response (handle markdown code blocks if present)
    let jsonText = aiResponse.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const parsed = JSON.parse(jsonText);
    
    // Validate and format response
    return {
      summary: parsed.summary || generateSummaryFallback(title, description, techStack),
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : techStack
    };
  } catch (error) {
    console.error('AI generation error:', error);
    // Return fallback on any error - never crash the UI
    return await generateFallback({ title, description, techStack });
  }
}

/**
 * Fallback generation when AI is not available
 */
async function generateFallback({ title, description, techStack }) {
  return {
    summary: generateSummaryFallback(title, description, techStack),
    bullets: generateBulletsFallback(title, description, techStack),
    skills: techStack.length > 0 ? techStack : []
  };
}

/**
 * Generate summary fallback
 */
function generateSummaryFallback(title, description, techStack) {
  const tech = techStack.length > 0 ? techStack.join(', ') : 'modern technologies';
  return `Developed ${title}, a ${description ? description.substring(0, 50) : 'software project'} using ${tech}.`;
}

/**
 * Generate bullets fallback
 */
function generateBulletsFallback(title, description, techStack) {
  const bullets = [];
  
  if (description) {
    bullets.push(`Built ${title} with focus on ${description.substring(0, 40)}.`);
  }
  
  if (techStack.length > 0) {
    bullets.push(`Implemented using ${techStack.slice(0, 3).join(', ')} and best practices.`);
  }
  
  bullets.push(`Delivered a functional solution with clean code and proper documentation.`);
  
  if (techStack.length > 3) {
    bullets.push(`Leveraged additional technologies: ${techStack.slice(3).join(', ')}.`);
  }
  
  return bullets.slice(0, 4); // Max 4 bullets
}

/**
 * Analyze resume for ATS (Applicant Tracking System) compatibility
 * @param {string} resumeText - Extracted text from resume PDF
 * @returns {Promise<Object>} Analysis results with score, suggestions, etc.
 */
export async function analyzeATSResume(resumeText) {
  try {
    const clamp = (value, min, max, fallback) => {
      if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
      return Math.max(min, Math.min(max, value));
    };

    // Check if AI is available
    if (!AI_CONFIG.enabled || !AI_CONFIG.google.apiKey) {
      console.warn('AI service not configured, using fallback ATS analysis');
      return generateATSFallback(resumeText);
    }

    // Use AI abstraction layer for comprehensive ATS analysis
    const prompt = `You are an expert ATS (Applicant Tracking System) resume analyzer.

Resume Text:
${(resumeText || '').substring(0, 8000)}${resumeText && resumeText.length > 8000 ? '... (truncated)' : ''}

Return ONLY valid JSON (no markdown, no code blocks) with the following structure:
{
  "atsScore": 75,
  "strengths": ["strength1", "strength2"],
  "improvementSuggestions": ["suggestion1", "suggestion2"],
  "missingKeywords": ["keyword1", "keyword2"],
  "missingSkills": ["skill1", "skill2"],
  "grammarIssues": ["issue1", "issue2"],
  "formattingIssues": ["issue1", "issue2"],
  "clarityIssues": ["issue1", "issue2"],
  "overallFeedback": "Comprehensive feedback (2-4 sentences)"
}

Scoring Guidelines:
- 80-100: Excellent ATS compatibility
- 60-79: Good with room for improvement
- 40-59: Needs significant improvements
- 0-39: Poor ATS compatibility

Focus on:
1. Keyword optimization and relevance
2. Format compatibility (no tables, clean structure)
3. Section organization (Contact, Summary, Experience, Education, Skills)
4. Grammar and spelling
5. Clarity and conciseness
6. Action verbs and quantifiable achievements`;

    const aiResponse = await generateAIContent(prompt);

    // Check if AI returned an error message
    if (aiResponse.includes('unavailable') || 
        aiResponse.includes('not configured') || 
        aiResponse.includes('disabled')) {
      return generateATSFallback(resumeText);
    }

    // Parse JSON from response (handle markdown code blocks if present)
    let jsonText = aiResponse.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const parsed = JSON.parse(jsonText);

    // Validate and format response
    return {
      atsScore: clamp(parsed.atsScore, 0, 100, 50),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvementSuggestions: Array.isArray(parsed.improvementSuggestions) ? parsed.improvementSuggestions : [],
      missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      grammarIssues: Array.isArray(parsed.grammarIssues) ? parsed.grammarIssues : [],
      formattingIssues: Array.isArray(parsed.formattingIssues) ? parsed.formattingIssues : [],
      clarityIssues: Array.isArray(parsed.clarityIssues) ? parsed.clarityIssues : [],
      overallFeedback: parsed.overallFeedback || 'Analysis completed. Review the suggestions to improve your resume.',
      isAI: true,
    };
  } catch (error) {
    console.error('ATS analysis error:', error);
    // Return fallback on any error - never crash the UI
    return generateATSFallback(resumeText);
  }
}

/**
 * Real ATS-style rule-based analysis (no AI):
 * Contact placement, section order, dates, keyword stuffing, skills block, quantification
 */
function generateATSFallback(resumeText) {
  const raw = typeof resumeText === 'string' ? resumeText : '';
  const text = raw.toLowerCase();
  const words = raw.trim().length === 0 ? [] : raw.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const firstBlock = raw.slice(0, 280);

  // ---- Contact & placement (ATS expect contact at top) ----
  const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(raw);
  const hasPhone = /(\+?\d[\d\s().-]{8,}\d)/.test(raw);
  const hasLinkedIn = /linkedin\.com\/in\//i.test(raw);
  const contactInTop = (hasEmail && firstBlock.includes('@')) || (hasPhone && /\d[\d\s().-]{6,}\d/.test(firstBlock));

  // ---- Section order (ATS prefer: Experience → Education → Skills) ----
  const expPos = text.search(/\b(experience|work\s*history|employment|professional\s*experience)\b/);
  const eduPos = text.search(/\b(education|academic|qualification|degree)\b/);
  const skillPos = text.search(/\b(skills|technical\s*skills|competencies|expertise)\b/);
  const sectionOrderOk = (expPos === -1 || eduPos === -1 || expPos <= eduPos) &&
    (skillPos === -1 || eduPos === -1 || eduPos <= skillPos);

  // ---- Industry keyword sets ----
  const sectionKeywords = [
    'experience', 'work history', 'employment', 'education', 'academic', 'qualification',
    'skills', 'technical skills', 'competencies', 'summary', 'objective', 'profile',
    'project', 'projects', 'achievement', 'certification', 'internship'
  ];
  const technicalKeywords = [
    'javascript', 'python', 'java', 'react', 'node', 'sql', 'html', 'css', 'git', 'github',
    'aws', 'docker', 'kubernetes', 'api', 'rest', 'machine learning', 'data structure',
    'algorithm', 'mongodb', 'express', 'typescript', 'c++', 'r', 'tableau', 'excel',
    'agile', 'scrum', 'ci/cd', 'linux', 'testing', 'debugging', 'frontend', 'backend'
  ];
  const softSkillKeywords = [
    'leadership', 'teamwork', 'communication', 'problem solving', 'analytical',
    'collaboration', 'time management', 'adaptability', 'initiative', 'critical thinking',
    'attention to detail', 'multitasking', 'presentation'
  ];
  const actionVerbs = [
    'developed', 'created', 'implemented', 'designed', 'managed', 'led', 'improved',
    'achieved', 'delivered', 'built', 'optimized', 'automated', 'analyzed', 'coordinated',
    'launched', 'reduced', 'increased', 'streamlined', 'established', 'mentored'
  ];

  const allKeywords = [...sectionKeywords, ...technicalKeywords, ...softSkillKeywords];
  const foundKeywords = allKeywords.filter(k => text.includes(k));
  const missingKeywords = [
    ...technicalKeywords.filter(k => !text.includes(k)),
    ...softSkillKeywords.filter(k => !text.includes(k)),
  ].slice(0, 10);
  const keywordScore = Math.min(28, (foundKeywords.length / allKeywords.length) * 28);

  // ---- Keyword stuffing ----
  const stopWords = new Set('the a an and or but in on at to for of with by from as is was are were been be have has had do does did will would could should may might must can'.split(' '));
  const wordFreq = {};
  words.forEach(w => {
    const key = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key.length < 3 || stopWords.has(key)) return;
    wordFreq[key] = (wordFreq[key] || 0) + 1;
  });
  const stuffed = Object.entries(wordFreq).filter(([, c]) => c >= 8).map(([w]) => w);

  // ---- Section detection & skills block ----
  const sectionMarkers = [
    /\b(experience|work\s*history|employment|professional\s*experience)\b/i,
    /\b(education|academic|qualification|degree)\b/i,
    /\b(skills|technical\s*skills|competencies|expertise)\b/i,
    /\b(summary|objective|profile|about\s*me)\b/i,
    /\b(project|projects)\b/i,
  ];
  const sectionsFound = sectionMarkers.filter(re => re.test(raw)).length;
  const hasDedicatedSkillsBlock = /\b(skills|technical\s*skills|competencies)\s*[:\-]?\s*[\w\s,|/\-]+(?:\.|$)/i.test(raw) ||
    (text.includes('skills') && (raw.match(/[,|]\s*\w+/g) || []).length >= 3);

  const monthYear = raw.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/gi) || [];
  const numericDates = raw.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g) || [];
  const rangeDates = raw.match(/\b\d{4}\s*[-–—]\s*(?:present|current|\d{4})\b/gi) || [];
  const hasDates = monthYear.length + numericDates.length + rangeDates.length >= 2;
  const dateFormatsMixed = [monthYear.length, numericDates.length, rangeDates.length].filter(n => n > 0).length > 1;
  const hasExperienceSection = expPos !== -1;

  let structureScore = 0;
  if (contactInTop) structureScore += 6;
  else if (hasEmail || hasPhone) structureScore += 3;
  if (sectionsFound >= 4) structureScore += 12;
  else if (sectionsFound >= 3) structureScore += 8;
  else if (sectionsFound >= 2) structureScore += 4;
  if (sectionOrderOk && expPos !== -1) structureScore += 4;
  if (hasDedicatedSkillsBlock) structureScore += 4;
  if (hasExperienceSection && !hasDates) structureScore -= 5;

  // ---- Quantification (ATS look for metrics) ----
  const hasNumbers = /\d/.test(raw);
  const hasPercent = /%\s*|\d+\s*percent/i.test(raw);
  const quantPhrases = (raw.match(/(?:increased|reduced|improved|decreased|saved|achieved|managed|led)\s+(?:by\s+)?\d+/gi) || []).length;
  const actionVerbsFound = actionVerbs.filter(v => new RegExp(v, 'i').test(raw));
  const hasActionVerbs = actionVerbsFound.length > 0;
  let qualityScore = 0;
  if (hasNumbers) qualityScore += 5;
  if (hasPercent || (raw.match(/\d+/g) || []).length >= 4) qualityScore += 5;
  if (quantPhrases >= 1) qualityScore += 8;
  else if (hasActionVerbs) qualityScore += 4;
  if (actionVerbsFound.length >= 4) qualityScore += 5;

  // ---- Length (1–2 pages) ----
  let lengthScore = 0;
  if (wordCount >= 300 && wordCount <= 800) lengthScore += 10;
  else if (wordCount >= 200 && wordCount < 300) lengthScore += 5;
  if (wordCount > 1000) lengthScore -= 6;
  if (wordCount > 0 && wordCount < 150) lengthScore -= 5;

  // ---- Contact score ----
  let contactScore = 0;
  if (hasEmail) contactScore += 5;
  if (hasPhone) contactScore += 3;
  if (hasLinkedIn) contactScore += 2;

  // ---- Grammar ----
  const grammarIssues = [];
  if (/\s{2,}/.test(raw)) grammarIssues.push('Multiple consecutive spaces; use single spaces for ATS-friendly formatting.');
  const repeatedWord = raw.match(/\b(\w+)\s+\1\b/gi);
  if (repeatedWord?.length > 0) grammarIssues.push(`Repeated word (e.g. "${(repeatedWord[0] || '').trim()}"); remove duplicates.`);
  const sentences = raw.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const longSentences = sentences.filter(s => s.split(/\s+/).length > 35);
  if (longSentences.length > 0) grammarIssues.push('Long sentences; keep bullets to 1–2 lines for ATS parsing.');
  const allCapsWords = (raw.match(/\b[A-Z]{3,}\b/g) || []).length;
  if (allCapsWords > 6) grammarIssues.push('Too many ALL CAPS; use sentence case for better ATS parsing.');
  if (stuffed.length > 0) grammarIssues.push(`Keyword stuffing: "${stuffed.slice(0, 3).join('", "')}" repeated too often; vary language.`);

  // ---- Formatting (ATS break on complex layout) ----
  const formattingIssues = [];
  if (dateFormatsMixed) formattingIssues.push('Use one date format (e.g. "Jan 2023" or "MM/YYYY"). ATS parse dates for experience.');
  const bulletLike = (raw.match(/[•·\-*]\s+|\d+\.\s/g) || []).length;
  if (wordCount > 200 && bulletLike < 3) formattingIssues.push('Use bullet points for roles and achievements so ATS parse sections clearly.');
  if (raw.includes('\t')) formattingIssues.push('Avoid tabs; use spaces or bullets. Tabs can break ATS parsing.');
  if (!contactInTop && hasEmail) formattingIssues.push('Place contact info at the top; ATS expect a clear header block.');
  if (hasExperienceSection && !hasDates) formattingIssues.push('Add dates to each role (e.g. Jan 2022 – Present). ATS use dates for tenure.');
  const specialCharRatio = (raw.replace(/[\w\s]/g, '').length / Math.max(raw.length, 1));
  if (specialCharRatio > 0.15) formattingIssues.push('High special characters; simplify to plain text and bullets for ATS.');
  if (!sectionOrderOk && expPos !== -1 && eduPos !== -1) formattingIssues.push('Preferred ATS order: Experience → Education → Skills. Consider reordering.');

  // ---- Clarity ----
  const clarityIssues = [];
  const vaguePhrases = ['various', 'etc.', 'and so on', 'something', 'things', 'stuff', 'many', 'several', 'some'];
  const foundVague = vaguePhrases.filter(p => text.includes(p));
  if (foundVague.length > 0) clarityIssues.push(`Replace vague terms (e.g. ${foundVague.slice(0, 3).join(', ')}) with specific achievements.`);
  if (/was\s+(?:responsible|involved|tasked)|were\s+(?:made|given|used)|being\s+\w+ed/i.test(raw)) clarityIssues.push('Use active voice (e.g. "Led the team" not "Was responsible for leading").');
  const veryShortBullets = sentences.filter(s => s.split(/\s+/).length <= 3 && s.length > 10).length;
  if (veryShortBullets > 4) clarityIssues.push('Expand short bullets with impact; ATS and recruiters look for results.');
  if (!hasDedicatedSkillsBlock && sectionsFound >= 2) clarityIssues.push('Include a dedicated Skills section with a clear list; ATS match on keywords.');

  // ---- Missing skills (common ATS match terms) ----
  const commonExpectedSkills = [
    'Communication', 'Problem Solving', 'Teamwork', 'Leadership', 'Python', 'Java',
    'JavaScript', 'SQL', 'Git', 'Analytical', 'Project Management', 'Time Management',
    'Excel', 'Collaboration', 'Agile', 'Debugging'
  ];
  const missingSkills = commonExpectedSkills.filter(skill => !text.includes(skill.toLowerCase())).slice(0, 8);

  // ---- Score & penalty ----
  const issuePenalty = Math.min(18, (grammarIssues.length + formattingIssues.length + clarityIssues.length) * 3);
  const totalScore = Math.max(0, Math.min(100, Math.round(
    keywordScore + structureScore + qualityScore + lengthScore + contactScore - issuePenalty
  )));

  // ---- Improvement suggestions ----
  const improvementSuggestions = [];
  if (wordCount > 0 && wordCount < 200) improvementSuggestions.push('Resume too short. Aim for 300–800 words (1–2 pages) with concrete achievements.');
  if (wordCount > 1000) improvementSuggestions.push('Keep to 1–2 pages; long resumes can be truncated or parsed poorly by ATS.');
  if (!hasEmail) improvementSuggestions.push('Add a professional email at the top; ATS and recruiters need it.');
  if (!hasPhone) improvementSuggestions.push('Add phone number in the header; many ATS store it for matching.');
  if (!hasLinkedIn) improvementSuggestions.push('Add LinkedIn URL in contact block if you have one.');
  if (!contactInTop && (hasEmail || hasPhone)) improvementSuggestions.push('Move contact info to the very top; ATS expect name and contact first.');
  if (foundKeywords.length < 10) improvementSuggestions.push('Add more industry keywords (skills, tools) so ATS match you to job descriptions.');
  if (sectionsFound < 3) improvementSuggestions.push('Use clear section headings: Experience, Education, Skills (and Summary if space allows).');
  if (hasExperienceSection && !hasDates) improvementSuggestions.push('Add start/end dates for each role; ATS use them for tenure and recency.');
  if (!hasDedicatedSkillsBlock) improvementSuggestions.push('Add a clear Skills section with keywords; ATS rank by keyword match.');
  if (!hasNumbers) improvementSuggestions.push('Add quantifiable results (%, numbers, metrics) to show impact.');
  if (actionVerbsFound.length < 2) improvementSuggestions.push('Start bullets with action verbs (Developed, Led, Implemented, Increased, Reduced).');
  if (dateFormatsMixed) improvementSuggestions.push('Use one date format everywhere (e.g. "Jan 2023 – Present").');
  if (grammarIssues.length > 0 || formattingIssues.length > 0) improvementSuggestions.push('Fix grammar and formatting so ATS parse your content correctly.');
  if (missingSkills.length > 0) improvementSuggestions.push(`Consider adding common ATS terms: ${missingSkills.slice(0, 4).join(', ')}.`);
  if (improvementSuggestions.length === 0) {
    improvementSuggestions.push('Tailor keywords to the job description for best ATS match.');
    improvementSuggestions.push('Keep layout simple (no tables/graphics) for reliable ATS parsing.');
  }

  const strengths = [
    contactInTop && (hasEmail || hasPhone) ? 'Contact block at top (ATS-friendly)' : (hasEmail && hasPhone ? 'Complete contact info' : null),
    foundKeywords.length >= 12 ? 'Strong keyword coverage' : foundKeywords.length >= 6 ? 'Good keyword usage' : null,
    sectionsFound >= 4 ? 'Clear section structure' : sectionsFound >= 3 ? 'Reasonable sections' : null,
    hasDedicatedSkillsBlock ? 'Dedicated skills section' : null,
    hasActionVerbs ? 'Action-oriented language' : null,
    (hasNumbers || quantPhrases > 0) ? 'Quantifiable impact' : null,
    hasDates && hasExperienceSection ? 'Dates on experience' : null,
    grammarIssues.length === 0 && formattingIssues.length === 0 ? 'Clean formatting' : null,
  ].filter(Boolean);

  const overallFeedback = grammarIssues.length + formattingIssues.length + clarityIssues.length > 0
    ? `ATS-style analysis: ${totalScore}/100. Fix the issues above and strengthen keywords/sections to improve ATS match rate.`
    : `ATS-style analysis: ${totalScore}/100. Resume is well structured for ATS; keep tailoring keywords to each job description.`;

  return {
    atsScore: totalScore,
    strengths,
    improvementSuggestions: [...new Set(improvementSuggestions)].slice(0, 14),
    missingKeywords: missingKeywords.slice(0, 8),
    missingSkills,
    grammarIssues,
    formattingIssues,
    clarityIssues,
    overallFeedback,
    isAI: false,
  };
}

