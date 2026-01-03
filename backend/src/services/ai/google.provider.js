/**
 * Google AI Provider
 * Handles Google Gemini API interactions
 * Model name comes from environment variables only
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG } from '../../config/ai.config.js';
import logger from '../../config/logger.js';

let genAI = null;

/**
 * Initialize Google AI client
 */
function initializeGoogleAI() {
  if (genAI) {
    return;
  }

  if (!AI_CONFIG.google.apiKey) {
    throw new Error('Google AI API key not configured');
  }

  try {
    genAI = new GoogleGenerativeAI(AI_CONFIG.google.apiKey);
    logger.info('Google AI client initialized', {
      model: AI_CONFIG.google.model,
    });
  } catch (error) {
    logger.error('Failed to initialize Google AI client', { error: error.message });
    throw new Error('Failed to initialize Google AI service');
  }
}

/**
 * Generate content using Google Gemini
 * @param {string} prompt - The prompt to send to the AI
 * @returns {Promise<string>} The generated text response
 */
export async function generateContent(prompt) {
  if (!AI_CONFIG.google.model) {
    throw new Error('Google AI model not configured. Set GOOGLE_AI_MODEL or GEMINI_MODEL environment variable.');
  }

  if (!AI_CONFIG.google.apiKey) {
    throw new Error('Google AI API key not configured. Set GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable.');
  }

  // Initialize if not already done
  if (!genAI) {
    initializeGoogleAI();
  }

  try {
    const model = genAI.getGenerativeModel({
      model: AI_CONFIG.google.model,
      generationConfig: {
        temperature: AI_CONFIG.google.temperature,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: AI_CONFIG.google.maxTokens,
      },
    });

    logger.info('Sending request to Google AI', {
      model: AI_CONFIG.google.model,
      promptLength: prompt.length,
    });

    // Generate content with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
    });

    const generatePromise = model.generateContent(prompt);
    const response = await Promise.race([generatePromise, timeoutPromise]);

    const result = await response.response;
    const text = result.text();

    logger.info('Received response from Google AI', {
      model: AI_CONFIG.google.model,
      responseLength: text.length,
    });

    return text;
  } catch (error) {
    logger.error('Google AI generation error', {
      model: AI_CONFIG.google.model,
      error: error.message,
      errorCode: error.code,
    });

    // Re-throw with more context
    if (error.message.includes('not found') || error.message.includes('404')) {
      throw new Error(`Model "${AI_CONFIG.google.model}" is not available. Please check GOOGLE_AI_MODEL environment variable.`);
    }

    if (error.message.includes('quota') || error.message.includes('rate limit') || error.message.includes('429')) {
      throw new Error('AI service quota exceeded. Please try again later.');
    }

    if (error.message.includes('timeout')) {
      throw new Error('AI request timed out. Please try again.');
    }

    if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('403')) {
      throw new Error('AI service authentication failed. Please check API key configuration.');
    }

    throw new Error(`AI service error: ${error.message}`);
  }
}

