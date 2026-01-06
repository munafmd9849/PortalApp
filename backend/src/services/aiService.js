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

