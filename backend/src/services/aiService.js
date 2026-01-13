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
 * @returns {Promise<Object>} ATS analysis results
 */
export async function analyzeATSResume(resumeText) {
  try {
    // Check if AI is available
    if (!AI_CONFIG.enabled || !AI_CONFIG.google.apiKey) {
      console.warn('AI service not configured, using fallback ATS analysis');
      return generateATSFallback(resumeText);
    }

    // Use AI abstraction layer for ATS analysis
    const prompt = `You are an ATS (Applicant Tracking System) resume analyzer. Analyze the following resume text and provide a comprehensive ATS compatibility assessment.

Resume Text:
${resumeText.substring(0, 8000)}${resumeText.length > 8000 ? '...' : ''}

Analyze the resume and return a JSON object with the following structure:
{
  "atsScore": 75,
  "missingKeywords": ["keyword1", "keyword2"],
  "missingSkills": ["skill1", "skill2"],
  "grammarIssues": ["issue1", "issue2"],
  "formattingIssues": ["issue1", "issue2"],
  "clarityIssues": ["issue1", "issue2"],
  "improvementSuggestions": ["suggestion1", "suggestion2"],
  "strengths": ["strength1", "strength2"],
  "overallFeedback": "Overall feedback about the resume"
}

Guidelines:
- atsScore: Number between 0-100 (higher is better)
- missingKeywords: Array of important keywords that should be included
- missingSkills: Array of skills that are commonly expected but missing
- grammarIssues: Array of grammar or spelling issues found
- formattingIssues: Array of formatting problems (e.g., inconsistent dates, missing sections)
- clarityIssues: Array of clarity or readability issues
- improvementSuggestions: Array of actionable suggestions to improve ATS compatibility
- strengths: Array of positive aspects of the resume
- overallFeedback: A comprehensive summary (2-3 sentences) of the resume's ATS compatibility

Return ONLY valid JSON, no markdown, no code blocks.`;

    const aiResponse = await generateAIContent(prompt);
    
    // Check if AI returned an error message
    if (aiResponse.includes('unavailable') || 
        aiResponse.includes('not configured') || 
        aiResponse.includes('disabled')) {
      // AI service is not available - use fallback
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
      atsScore: typeof parsed.atsScore === 'number' ? Math.max(0, Math.min(100, parsed.atsScore)) : 50,
      missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      grammarIssues: Array.isArray(parsed.grammarIssues) ? parsed.grammarIssues : [],
      formattingIssues: Array.isArray(parsed.formattingIssues) ? parsed.formattingIssues : [],
      clarityIssues: Array.isArray(parsed.clarityIssues) ? parsed.clarityIssues : [],
      improvementSuggestions: Array.isArray(parsed.improvementSuggestions) ? parsed.improvementSuggestions : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      overallFeedback: parsed.overallFeedback || 'Resume analysis completed. Review the suggestions to improve ATS compatibility.'
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
  const wordCount = resumeText.split(/\s+/).length;
  const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(resumeText);
  const hasPhone = /\b\d{10,}\b/.test(resumeText);
  const hasEducation = /education|degree|university|college|bachelor|master|phd/i.test(resumeText);
  const hasExperience = /experience|work|employment|intern|project/i.test(resumeText);
  const hasSkills = /skill|proficient|expert|knowledge|familiar/i.test(resumeText);

  // Calculate basic ATS score
  let score = 50; // Base score
  if (wordCount >= 300 && wordCount <= 800) score += 10;
  if (hasEmail) score += 10;
  if (hasPhone) score += 5;
  if (hasEducation) score += 10;
  if (hasExperience) score += 10;
  if (hasSkills) score += 5;

  const suggestions = [];
  if (wordCount < 200) suggestions.push('Resume is too short. Aim for 300-800 words.');
  if (wordCount > 1000) suggestions.push('Resume is too long. Consider condensing to 800 words or less.');
  if (!hasEmail) suggestions.push('Add your email address for contact information.');
  if (!hasPhone) suggestions.push('Add your phone number for better contact options.');
  if (!hasEducation) suggestions.push('Include your educational background.');
  if (!hasExperience) suggestions.push('Add work experience or internship details.');
  if (!hasSkills) suggestions.push('Include a skills section highlighting your technical and soft skills.');

  return {
    atsScore: Math.min(100, score),
    missingKeywords: [],
    missingSkills: [],
    grammarIssues: [],
    formattingIssues: [],
    clarityIssues: [],
    improvementSuggestions: suggestions,
    strengths: [
      hasEmail && hasPhone ? 'Contact information is present' : null,
      hasEducation ? 'Education section found' : null,
      hasExperience ? 'Experience section found' : null,
    ].filter(Boolean),
    overallFeedback: 'Basic resume analysis completed. For detailed ATS optimization, please configure the AI service. ' + 
      (suggestions.length > 0 ? 'Consider addressing the improvement suggestions listed above.' : 'Your resume has good basic structure.')
  };
}

