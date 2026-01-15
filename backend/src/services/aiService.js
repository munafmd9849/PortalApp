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
 * Analyze resume for ATS compatibility
 * @param {string} resumeText - Extracted text from resume PDF
 * @returns {Promise<Object>} Analysis results with score, suggestions, etc.
 */
export async function analyzeATSResume(resumeText) {
  try {
    // Check if AI is available
    if (!AI_CONFIG.enabled || !AI_CONFIG.google.apiKey) {
      console.warn('AI service not configured, using fallback ATS analysis');
      return generateATSFallback(resumeText);
    }

    // Use AI abstraction layer for comprehensive ATS analysis
    const prompt = `You are an expert ATS (Applicant Tracking System) resume analyzer. Analyze the following resume text and provide a comprehensive analysis.

Resume Text:
${resumeText.substring(0, 8000)}${resumeText.length > 8000 ? '... (truncated)' : ''}

Provide a detailed ATS compatibility analysis in JSON format with the following structure:
{
  "atsScore": <number 0-100>,
  "strengths": ["strength1", "strength2", ...],
  "improvementSuggestions": ["suggestion1", "suggestion2", ...],
  "missingKeywords": ["keyword1", "keyword2", ...],
  "missingSkills": ["skill1", "skill2", ...],
  "grammarIssues": ["issue1", "issue2", ...],
  "formattingIssues": ["issue1", "issue2", ...],
  "clarityIssues": ["issue1", "issue2", ...],
  "overallFeedback": "Comprehensive feedback paragraph"
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
6. Action verbs and quantifiable achievements

Return ONLY valid JSON, no markdown, no code blocks.`;

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
      atsScore: Math.max(0, Math.min(100, parsed.atsScore || 50)),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvementSuggestions: Array.isArray(parsed.improvementSuggestions) ? parsed.improvementSuggestions : [],
      missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      grammarIssues: Array.isArray(parsed.grammarIssues) ? parsed.grammarIssues : [],
      formattingIssues: Array.isArray(parsed.formattingIssues) ? parsed.formattingIssues : [],
      clarityIssues: Array.isArray(parsed.clarityIssues) ? parsed.clarityIssues : [],
      overallFeedback: parsed.overallFeedback || 'Analysis completed. Review the suggestions to improve your resume.',
      isAI: true // Mark as AI-generated
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
  const text = resumeText.toLowerCase();
  
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
  if (text.includes('contact') || text.includes('email') || text.includes('phone')) structureScore += 10;
  if (text.includes('summary') || text.includes('objective') || text.includes('profile')) structureScore += 10;
  if (text.includes('experience') || text.includes('work') || text.includes('employment')) structureScore += 15;
  if (text.includes('education') || text.includes('degree') || text.includes('university')) structureScore += 10;
  if (text.includes('skill') || text.includes('technical') || text.includes('competenc')) structureScore += 10;
  
  // Basic grammar/formatting checks
  let qualityScore = 0;
  const hasNumbers = /\d/.test(resumeText);
  const hasActionVerbs = /(developed|created|implemented|designed|managed|led|improved|achieved)/i.test(resumeText);
  if (hasNumbers) qualityScore += 10;
  if (hasActionVerbs) qualityScore += 10;
  
  const totalScore = Math.min(100, Math.round(keywordScore + structureScore + qualityScore));
  
  // Generate improvement suggestions - always provide at least some suggestions
  const improvementSuggestions = [];
  
  if (foundKeywords.length < 5) {
    improvementSuggestions.push('Add more relevant keywords to improve ATS matching');
  }
  if (structureScore < 30) {
    improvementSuggestions.push('Improve resume structure - ensure all key sections (Contact, Summary, Experience, Education, Skills) are present');
  }
  if (!hasNumbers) {
    improvementSuggestions.push('Add quantifiable achievements (numbers, percentages, metrics) to demonstrate impact');
  }
  if (!hasActionVerbs) {
    improvementSuggestions.push('Use more action verbs (developed, created, implemented, managed, led, improved) to describe your accomplishments');
  }
  
  // If no specific issues found, provide general improvement suggestions
  if (improvementSuggestions.length === 0) {
    if (totalScore < 80) {
      improvementSuggestions.push('Review and optimize keyword placement throughout your resume');
      improvementSuggestions.push('Ensure consistent formatting and professional presentation');
    } else {
      // For high scores, provide advanced suggestions
      improvementSuggestions.push('Consider tailoring keywords to specific job descriptions');
      improvementSuggestions.push('Keep resume updated with latest achievements and skills');
    }
  }
  
  return {
    atsScore: totalScore,
    strengths: [
      foundKeywords.length > 5 ? 'Good keyword usage' : null,
      structureScore > 30 ? 'Well-structured resume' : null,
      hasActionVerbs ? 'Uses action verbs' : null
    ].filter(Boolean),
    improvementSuggestions: improvementSuggestions,
    missingKeywords: commonKeywords.filter(k => !text.includes(k)).slice(0, 5),
    missingSkills: [],
    grammarIssues: [],
    formattingIssues: [],
    clarityIssues: [],
    overallFeedback: `Basic analysis completed. Your resume scored ${totalScore}/100. For more detailed analysis, ensure AI service is configured.`,
    isAI: false // Mark as fallback
  };
}

