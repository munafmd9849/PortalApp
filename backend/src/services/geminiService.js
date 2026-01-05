/**
 * Google Gemini AI Service
 * Provides AI-powered placement guidance using Google AI Studio (Gemini)
 * Uses centralized AI abstraction layer for configuration and error handling
 */

import { generateAIContent } from './ai/index.js';
import logger from '../config/logger.js';

/**
 * System prompt for placement guidance
 */
const SYSTEM_PROMPT = `You are an AI placement mentor.

Rules:
- Be concise and structured.
- NO motivational or filler text.
- NO long explanations unless explicitly asked.
- Always prioritize actionable steps and resources.
- If YouTube resources are requested:
  - You MUST list specific channel names.
  - Each topic MUST include at least 1 YouTube channel.
- Prefer bullet points or tables over paragraphs.
- Assume the user is serious about placements, not a beginner child.

Always respond with a valid JSON object in this exact format:
{
  "summary": "Brief 2-3 sentence summary of the topic",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "recommendedResources": ["resource1", "resource2", "resource3"],
  "practiceSuggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "nextSteps": ["step1", "step2", "step3"]
}

Keep arrays to 3-5 items maximum. Be specific and actionable.
For YouTube resources, always include channel names (e.g., "Striver's A2Z DSA Course - takeUforward").`;

/**
 * Generate placement guidance using AI abstraction layer
 * @param {string} query - Student's query/topic
 * @param {string} context - Context (default: "placement_resources")
 * @returns {Promise<Object>} Structured guidance response
 */
export async function generatePlacementGuidance(query, context = 'placement_resources') {
  // Validate input
  if (!query || typeof query !== 'string') {
    throw new Error('Query is required and must be a string');
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    throw new Error('Query cannot be empty');
  }

  if (trimmedQuery.length > 500) {
    throw new Error('Query is too long. Maximum 500 characters allowed.');
  }

  // Sanitize query (remove potentially harmful content)
  const sanitizedQuery = trimmedQuery
    .replace(/[<>]/g, '') // Remove HTML tags
    .substring(0, 500); // Enforce max length

  // Construct user prompt
  const userPrompt = `Student query: ${sanitizedQuery}.\nGenerate structured placement guidance.`;

  // Combine system prompt and user prompt
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;

  logger.info('Sending request to AI service for placement guidance', {
    queryLength: sanitizedQuery.length,
    context,
  });

  try {
    // Use AI abstraction layer - handles errors gracefully
    const aiResponse = await generateAIContent(fullPrompt);

    // Check if AI returned an error message (from abstraction layer)
    if (aiResponse.includes('unavailable') || 
        aiResponse.includes('not configured') || 
        aiResponse.includes('disabled') ||
        aiResponse.includes('contact support')) {
      // AI service is not available - return structured error response
      throw new Error(aiResponse);
    }

    logger.info('Received response from AI service', {
      responseLength: aiResponse.length,
    });

    // Parse JSON response
    let parsedResponse;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : aiResponse;
      parsedResponse = JSON.parse(jsonText.trim());
    } catch (parseError) {
      logger.error('Failed to parse AI response as JSON', {
        error: parseError.message,
        response: aiResponse.substring(0, 200),
      });
      
      // Fallback: try to extract structured data from text
      parsedResponse = extractStructuredData(aiResponse);
    }

    // Validate response structure
    const validatedResponse = validateResponse(parsedResponse);

    return validatedResponse;
  } catch (error) {
    logger.error('Error generating placement guidance', {
      error: error.message,
      query: sanitizedQuery.substring(0, 50),
    });

    // Re-throw with user-friendly message
    // The error message from generateAIContent is already user-friendly
    throw error;
  }
}

/**
 * Extract structured data from text response (fallback)
 */
function extractStructuredData(text) {
  const summaryMatch = text.match(/summary[:\-]\s*(.+?)(?=\n|$)/i);
  const topicsMatch = text.match(/key topics?[:\-]\s*(.+?)(?=\n|$)/i);
  const resourcesMatch = text.match(/recommended resources?[:\-]\s*(.+?)(?=\n|$)/i);
  const practiceMatch = text.match(/practice suggestions?[:\-]\s*(.+?)(?=\n|$)/i);
  const nextStepsMatch = text.match(/next steps?[:\-]\s*(.+?)(?=\n|$)/i);

  return {
    summary: summaryMatch ? summaryMatch[1].trim() : 'Guidance generated successfully.',
    keyTopics: topicsMatch ? topicsMatch[1].split(',').map(t => t.trim()).filter(Boolean) : [],
    recommendedResources: resourcesMatch ? resourcesMatch[1].split(',').map(r => r.trim()).filter(Boolean) : [],
    practiceSuggestions: practiceMatch ? practiceMatch[1].split(',').map(p => p.trim()).filter(Boolean) : [],
    nextSteps: nextStepsMatch ? nextStepsMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [],
  };
}

/**
 * Validate and normalize response structure
 */
function validateResponse(response) {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid response format');
  }

  return {
    summary: typeof response.summary === 'string' ? response.summary : 'Guidance generated successfully.',
    keyTopics: Array.isArray(response.keyTopics) ? response.keyTopics.slice(0, 5) : [],
    recommendedResources: Array.isArray(response.recommendedResources) ? response.recommendedResources.slice(0, 5) : [],
    practiceSuggestions: Array.isArray(response.practiceSuggestions) ? response.practiceSuggestions.slice(0, 5) : [],
    nextSteps: Array.isArray(response.nextSteps) ? response.nextSteps.slice(0, 5) : [],
  };
}
