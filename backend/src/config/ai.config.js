/**
 * AI Configuration
 * Centralized configuration for AI providers
 * All model names and settings come from environment variables
 */

export const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || 'google',
  enabled: process.env.AI_ENABLED !== 'false', // Default to enabled
  google: {
    model: process.env.GOOGLE_AI_MODEL || process.env.GEMINI_MODEL, // Support both env var names
    apiKey: process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
    maxTokens: parseInt(process.env.GOOGLE_AI_MAX_TOKENS || '2048', 10),
    temperature: parseFloat(process.env.GOOGLE_AI_TEMPERATURE || '0.7'),
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
    }
    if (!AI_CONFIG.google.model) {
      errors.push('GOOGLE_AI_MODEL or GEMINI_MODEL is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

