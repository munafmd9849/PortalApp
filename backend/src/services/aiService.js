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
 * Fallback ATS analysis when AI is not available
 */
function generateATSFallback(resumeText) {
  const raw = typeof resumeText === 'string' ? resumeText : '';
  const text = raw.toLowerCase();
  const wordCount = raw.trim().length === 0 ? 0 : raw.trim().split(/\s+/).filter(Boolean).length;

  const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(raw);
  const hasPhone = /(\+?\d[\d\s().-]{8,}\d)/.test(raw);

  // Basic keyword checking
  const commonKeywords = [
    'experience', 'education', 'skills', 'project', 'achievement',
    'leadership', 'teamwork', 'communication', 'problem solving',
    'javascript', 'python', 'react', 'node', 'java', 'sql'
  ];

  const foundKeywords = commonKeywords.filter(keyword => text.includes(keyword));
  const keywordScore = (foundKeywords.length / commonKeywords.length) * 30;

  // Basic structure checking
  let structureScore = 0;
  if (hasEmail || hasPhone || text.includes('contact')) structureScore += 10;
  if (text.includes('summary') || text.includes('objective') || text.includes('profile')) structureScore += 10;
  if (text.includes('experience') || text.includes('work') || text.includes('employment') || text.includes('intern')) structureScore += 15;
  if (text.includes('education') || text.includes('degree') || text.includes('university') || text.includes('college')) structureScore += 10;
  if (text.includes('skill') || text.includes('technical') || text.includes('competenc')) structureScore += 10;

  // Basic quality checks
  let qualityScore = 0;
  const hasNumbers = /\d/.test(raw);
  const hasActionVerbs = /(developed|created|implemented|designed|managed|led|improved|achieved)/i.test(raw);
  if (hasNumbers) qualityScore += 10;
  if (hasActionVerbs) qualityScore += 10;

  // Word count heuristics
  let lengthScore = 0;
  if (wordCount >= 300 && wordCount <= 800) lengthScore += 10;
  if (wordCount > 1000) lengthScore -= 5;
  if (wordCount > 0 && wordCount < 200) lengthScore -= 5;

  // Contact info heuristics
  let contactScore = 0;
  if (hasEmail) contactScore += 5;
  if (hasPhone) contactScore += 3;

  const totalScore = Math.max(0, Math.min(100, Math.round(keywordScore + structureScore + qualityScore + lengthScore + contactScore)));

  // Generate improvement suggestions - always provide at least some suggestions
  const improvementSuggestions = [];

  if (wordCount > 0 && wordCount < 200) improvementSuggestions.push('Resume is too short. Aim for 300–800 words with more detail and impact.');
  if (wordCount > 1000) improvementSuggestions.push('Resume is too long. Consider condensing to ~1 page (or 2 max) and removing repetition.');
  if (!hasEmail) improvementSuggestions.push('Add a professional email address in the contact section.');
  if (!hasPhone) improvementSuggestions.push('Add a phone number to improve recruiter reachability.');

  if (foundKeywords.length < 5) improvementSuggestions.push('Add more relevant keywords to improve ATS matching.');
  if (structureScore < 30) improvementSuggestions.push('Ensure key sections exist: Contact, Summary, Experience, Education, Skills.');
  if (!hasNumbers) improvementSuggestions.push('Add quantifiable achievements (numbers, percentages, metrics) to demonstrate impact.');
  if (!hasActionVerbs) improvementSuggestions.push('Use stronger action verbs (developed, implemented, led, improved) to describe accomplishments.');

  if (improvementSuggestions.length === 0) {
    improvementSuggestions.push('Tailor keywords to the target job description for better ATS matching.');
    improvementSuggestions.push('Keep formatting clean: consistent dates, bullet points, and section headings.');
  }

  const strengths = [
    hasEmail && hasPhone ? 'Contact information is present' : null,
    foundKeywords.length > 5 ? 'Good keyword usage' : null,
    structureScore >= 35 ? 'Well-structured resume' : null,
    hasActionVerbs ? 'Uses action verbs' : null,
    hasNumbers ? 'Includes measurable impact' : null,
  ].filter(Boolean);

  return {
    atsScore: totalScore,
    strengths,
    improvementSuggestions,
    missingKeywords: commonKeywords.filter(k => !text.includes(k)).slice(0, 5),
    missingSkills: [],
    grammarIssues: [],
    formattingIssues: [],
    clarityIssues: [],
    overallFeedback: `Basic analysis completed. Your resume scored ${totalScore}/100. Configure the AI service for a deeper ATS analysis.`,
    isAI: false,
  };
}

