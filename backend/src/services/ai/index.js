/**
 * AI Service Abstraction Layer
 * Provides a unified interface for AI providers
 * Handles errors gracefully to prevent UI crashes
 */

import { AI_CONFIG, validateAIConfig } from '../../config/ai.config.js';
import { generateContent as generateGoogleContent } from './google.provider.js';
import logger from '../../config/logger.js';

/**
 * Generate AI content using the configured provider
 * @param {string} prompt - The prompt to send to the AI
 * @returns {Promise<string>} The generated text response or fallback message
 */
export async function generateAIContent(prompt) {
  // Validate configuration
  const validation = validateAIConfig();
  if (!validation.valid) {
    logger.warn('AI configuration invalid', { errors: validation.errors });
    return 'AI service is not configured. Please contact support.';
  }

  if (!AI_CONFIG.enabled) {
    logger.info('AI service is disabled');
    return 'AI service is currently disabled. Please try again later.';
  }

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    logger.warn('Empty prompt provided to AI service');
    return 'Please provide a valid prompt.';
  }

  try {
    let result;

    switch (AI_CONFIG.provider) {
      case 'google':
        result = await generateGoogleContent(prompt);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${AI_CONFIG.provider}`);
    }

    return result || 'AI service returned an empty response. Please try again.';
  } catch (error) {
    logger.error('[AI ERROR]', {
      provider: AI_CONFIG.provider,
      error: error.message,
      errorStack: error.stack,
    });

    // Return user-friendly error message instead of throwing
    // This ensures the UI never crashes
    if (error.message.includes('not configured') || error.message.includes('not available')) {
      return 'AI service is not properly configured. Please contact support.';
    }

    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return 'AI service quota exceeded. Please try again later.';
    }

    if (error.message.includes('timeout')) {
      return 'AI request timed out. Please try again.';
    }

    if (error.message.includes('authentication') || error.message.includes('API key')) {
      return 'AI service authentication failed. Please contact support.';
    }

    // Generic fallback - never expose internal errors to users
    return 'AI service is temporarily unavailable. Please try again later.';
  }
}

/**
 * Check if AI service is available
 * @returns {Promise<boolean>}
 */
export async function isAIAvailable() {
  const validation = validateAIConfig();
  return validation.valid && AI_CONFIG.enabled;
}

