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

  // DEBUG: Log API key status (masked for security)
  const apiKey = AI_CONFIG.google.apiKey;
  const apiKeyPreview = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'MISSING';
  console.log('[GOOGLE_AI] Initializing with API key:', apiKeyPreview);
  console.log('[GOOGLE_AI] Model:', AI_CONFIG.google.model || 'gemini-2.5-flash');

  if (!apiKey) {
    console.error('[GOOGLE_AI] ❌ GOOGLE_AI_API_KEY is missing. Set it in your .env file.');
    console.error('[GOOGLE_AI] Checked env vars: GOOGLE_AI_API_KEY, GOOGLE_GEMINI_API_KEY, GEMINI_API_KEY');
    throw new Error('Google AI API key not configured');
  }

  if (apiKey.trim() === '') {
    console.error('[GOOGLE_AI] ❌ GOOGLE_AI_API_KEY is empty. Set a valid key in your .env file.');
    throw new Error('Google AI API key cannot be empty');
  }

  // Validate API key format (Google AI keys typically start with AIza)
  if (!apiKey.startsWith('AIza') && apiKey.length < 30) {
    console.warn('[GOOGLE_AI] ⚠️  API key format looks unusual. Google AI keys usually start with "AIza" and are 39+ characters.');
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey);
    logger.info('Google AI client initialized', {
      model: AI_CONFIG.google.model || 'gemini-2.5-flash',
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey.length,
    });
    console.log('[GOOGLE_AI] ✅ Client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Google AI client', { error: error.message, stack: error.stack });
    console.error('[GOOGLE_AI] ❌ Failed to initialize:', error.message);
    throw new Error('Failed to initialize Google AI service');
  }
}

/**
 * Generate content using Google Gemini
 * @param {string} prompt - The prompt to send to the AI
 * @param {Object} overrideConfig - Optional config override { temperature, maxTokens }
 * @returns {Promise<string>} The generated text response
 */
export async function generateContent(prompt, overrideConfig = {}) {
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

  // Use override config if provided, otherwise use default from AI_CONFIG
  const temperature = overrideConfig.temperature !== undefined ? overrideConfig.temperature : AI_CONFIG.google.temperature;
  const maxTokens = overrideConfig.maxTokens !== undefined ? overrideConfig.maxTokens : AI_CONFIG.google.maxTokens;

  try {
    const model = genAI.getGenerativeModel({
      model: AI_CONFIG.google.model,
      generationConfig: {
        temperature: temperature,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: maxTokens,
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
    
    // CRITICAL: Read the FULL response text - check for multiple candidates
    let text = '';
    try {
      // Method 1: Try result.text() (standard method)
      text = result.text();
      
      // Log raw response for debugging (first 500 chars)
      console.log('[GOOGLE_AI] Raw response preview:', text.substring(0, 500));
      console.log('[GOOGLE_AI] Full response length:', text.length);
      
      // Verify response is complete (not truncated mid-sentence)
      if (text.length > 0 && !text.trim().endsWith('.') && !text.trim().endsWith('!') && !text.trim().endsWith('?') && !text.trim().endsWith(':') && text.length > 50) {
        // Check if response might be truncated (ends with incomplete word)
        const lastChar = text.trim().slice(-1);
        const incompleteEndings = [',', '-', '—', '–', ';'];
        if (incompleteEndings.includes(lastChar)) {
          console.warn('[GOOGLE_AI] ⚠️ Response may be truncated (ends with punctuation):', lastChar);
        }
      }
    } catch (textError) {
      console.error('[GOOGLE_AI] Error reading response.text():', textError);
      
      // Fallback: Try to extract from candidates array
      if (result.candidates && result.candidates.length > 0) {
        const candidate = result.candidates[0];
        if (candidate.content && candidate.content.parts) {
          text = candidate.content.parts.map(part => part.text || '').join('');
          console.log('[GOOGLE_AI] Extracted text from candidates:', text.substring(0, 500));
        }
      }
      
      if (!text) {
        throw new Error(`Failed to extract text from response: ${textError.message}`);
      }
    }

    // Validate response is not empty
    if (!text || text.trim().length === 0) {
      throw new Error('AI service returned an empty response');
    }

    logger.info('Received response from Google AI', {
      model: AI_CONFIG.google.model,
      responseLength: text.length,
      endsWithCompleteSentence: /[.!?:]$/.test(text.trim()),
    });

    return text;
  } catch (error) {
    // DEBUG: Log full error details
    console.error('[GOOGLE_AI] ❌ Generation error:', {
      model: AI_CONFIG.google.model,
      errorMessage: error.message,
      errorCode: error.code,
      errorStatus: error.status,
      errorResponse: error.response?.data || error.response,
      stack: error.stack?.substring(0, 500), // First 500 chars of stack
    });

    logger.error('Google AI generation error', {
      model: AI_CONFIG.google.model,
      error: error.message,
      errorCode: error.code,
      errorStatus: error.status,
    });

    // Re-throw with more context
    if (error.message.includes('not found') || error.message.includes('404') || error.status === 404) {
      const detailedError = `Model "${AI_CONFIG.google.model}" is not available. Please check GOOGLE_AI_MODEL environment variable. Available models: gemini-2.5-flash, gemini-1.5-flash, gemini-1.5-pro`;
      console.error('[GOOGLE_AI] Model not found. Try: gemini-1.5-flash or gemini-1.5-pro');
      throw new Error(detailedError);
    }

    if (error.message.includes('quota') || error.message.includes('rate limit') || error.message.includes('429') || error.status === 429) {
      // Extract more details from Google's error response
      const errorDetails = error.response?.data || error.response || {};
      const quotaError = errorDetails.error || errorDetails;
      
      console.error('[GOOGLE_AI] ❌ Quota/Rate Limit Error:', {
        message: error.message,
        status: error.status,
        errorDetails: JSON.stringify(quotaError, null, 2),
      });
      
      // Provide more helpful error message
      let errorMessage = 'AI service quota exceeded. Please try again later.';
      if (quotaError.message) {
        errorMessage = `Google AI quota exceeded: ${quotaError.message}. Please try again in a few minutes.`;
      } else if (quotaError.reason) {
        errorMessage = `Google AI quota exceeded (${quotaError.reason}). Please try again later or check your Google Cloud Console quota settings.`;
      }
      
      throw new Error(errorMessage);
    }

    if (error.message.includes('timeout')) {
      throw new Error('AI request timed out. Please try again.');
    }

    if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('403') || error.status === 401 || error.status === 403) {
      // Check for specific "leaked" error
      if (error.message.includes('leaked') || error.message.includes('reported as leaked')) {
        console.error('[GOOGLE_AI] ❌ CRITICAL: API key was reported as leaked by Google');
        console.error('  Your API key has been disabled for security reasons.');
        console.error('  SOLUTION:');
        console.error('  1. Go to Google Cloud Console → APIs & Services → Credentials');
        console.error('  2. Delete or restrict the old API key');
        console.error('  3. Create a NEW API key');
        console.error('  4. Enable "Generative AI API" for the new key');
        console.error('  5. Update GOOGLE_AI_API_KEY in your .env file');
        console.error('  6. Restart the server');
        throw new Error('API key was reported as leaked. Please generate a new API key in Google Cloud Console and update your .env file.');
      }
      
      // Check for "API not enabled" error
      if (error.message.includes('SERVICE_DISABLED') || error.message.includes('has not been used') || error.message.includes('it is disabled') || error.message.includes('Enable it by visiting')) {
        console.error('[GOOGLE_AI] ❌ CRITICAL: Generative Language API is not enabled');
        console.error('  The API key is valid, but the Generative Language API is not enabled for your project.');
        console.error('  SOLUTION:');
        console.error('  1. Visit: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
        console.error('  2. Select your project (or create one)');
        console.error('  3. Click "Enable" button');
        console.error('  4. Wait 1-2 minutes for the API to activate');
        console.error('  5. Try again');
        
        // Extract activation URL if available
        const activationUrlMatch = error.message.match(/https:\/\/console\.developers\.google\.com\/apis\/[^\s]+/);
        if (activationUrlMatch) {
          console.error(`  Direct link: ${activationUrlMatch[0]}`);
        }
        
        throw new Error('Generative Language API is not enabled for your Google Cloud project. Please enable it at https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com and wait 1-2 minutes before retrying.');
      }
      
      console.error('[GOOGLE_AI] ❌ Authentication failed. Check:');
      console.error('  1. API key is correct in .env file');
      console.error('  2. API key has Generative AI API enabled in Google Cloud Console');
      console.error('  3. API key has no IP restrictions (for localhost testing)');
      console.error('  4. API key is not expired or revoked');
      throw new Error('AI service authentication failed. Please check API key configuration.');
    }

    // Log unexpected errors with full details
    console.error('[GOOGLE_AI] ❌ Unexpected error:', error.message);
    throw new Error(`AI service error: ${error.message}`);
  }
}

