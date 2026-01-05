/**
 * AI Configuration
 * Centralized configuration for AI providers
 * All model names and settings come from environment variables
 */

export const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || 'google',
  enabled: process.env.AI_ENABLED !== 'false', // Default to enabled
  google: {
    model: process.env.GOOGLE_AI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash', // Default to gemini-2.5-flash
    apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
    maxTokens: parseInt(process.env.GOOGLE_AI_MAX_TOKENS || '800', 10), // Default to 800 for concise responses
    temperature: parseFloat(process.env.GOOGLE_AI_TEMPERATURE || '0.35'), // Default to 0.35 for structured responses
  },
};

/**
 * Validate AI configuration
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateAIConfig() {
  const errors = [];

  if (!AI_CONFIG.enabled) {
    return { valid: false, errors: ['AI is disabled'] };
  }

  if (AI_CONFIG.provider === 'google') {
    if (!AI_CONFIG.google.apiKey) {
      errors.push('GOOGLE_AI_API_KEY or GEMINI_API_KEY is required');
      console.error('[AI_CONFIG] GOOGLE_AI_API_KEY is missing. Set it in your .env file.');
    } else if (AI_CONFIG.google.apiKey.trim() === '') {
      errors.push('GOOGLE_AI_API_KEY cannot be empty');
      console.error('[AI_CONFIG] GOOGLE_AI_API_KEY is empty. Set a valid key in your .env file.');
    }
    
    if (!AI_CONFIG.google.model) {
      errors.push('GOOGLE_AI_MODEL or GEMINI_MODEL is required');
      console.error('[AI_CONFIG] GOOGLE_AI_MODEL is missing. Using default: gemini-2.5-flash');
    } else {
      console.log('[AI_CONFIG] Using model:', AI_CONFIG.google.model);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

