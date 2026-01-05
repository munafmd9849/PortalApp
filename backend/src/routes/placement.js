/**
 * Placement AI Routes
 * Provides AI-powered placement guidance using Google AI
 */

import express from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { AI_CONFIG, validateAIConfig } from '../config/ai.config.js';
import { generateContent as generateGoogleContent } from '../services/ai/google.provider.js';
import { getCachedResponse, setCachedResponse } from '../utils/placementCache.js';
import { getFallbackGuidance } from '../utils/placementFallback.js';
import { getDuckDuckGoFallback } from '../services/duckDuckGoFallback.js';

const router = express.Router();

// Rate limiting for placement AI: 5 requests per 10 minutes per IP
const placementLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    errorType: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests. Please wait 10 minutes before requesting again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development for testing
    return process.env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT === 'true';
  },
});

// Apply rate limiting to placement AI endpoint
router.use('/ai', placementLimiter);

/**
 * POST /api/placement/ai
 * Generate AI-powered placement guidance
 * 
 * Request Body:
 * {
 *   "topic": "string describing the placement topic"
 * }
 * 
 * Response:
 * {
 *   "guidance": "generated text here"
 * }
 * 
 * Error Response (400 - Misconfiguration):
 * {
 *   "message": "AI not configured"
 * }
 * 
 * Error Response (500 - Internal Error):
 * {
 *   "message": "Failed to generate guidance",
 *   "error": "<error details>"
 * }
 */
router.post(
  '/ai',
  [
    body('topic')
      .trim()
      .notEmpty()
      .withMessage('Topic is required')
      .isLength({ min: 1, max: 1000 })
      .withMessage('Topic must be between 1 and 1000 characters'),
  ],
  async (req, res) => {
    // Log request
    console.log('[PLACEMENT_AI] Request received:', {
      topic: req.body.topic?.substring(0, 50),
      timestamp: new Date().toISOString(),
    });

    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('[PLACEMENT_AI] Validation failed:', errors.array());
      return res.status(400).json({
        message: 'Failed to generate guidance',
        error: errors.array()[0].msg,
      });
    }

    const { topic } = req.body;

    // Check cache first
    const cachedResponse = getCachedResponse(topic);
    if (cachedResponse) {
      console.log('[PLACEMENT_AI] Returning cached response');
      return res.json({
        guidance: cachedResponse,
        cached: true,
      });
    }

    // Validate AI configuration
    const validation = validateAIConfig();
    if (!validation.valid) {
      console.error('[PLACEMENT_AI] Configuration invalid:', validation.errors);
      // Return fallback instead of error
      const fallback = getFallbackGuidance(topic);
      return res.json({
        guidance: `[Fallback Content]\n\n${fallback}`,
        fallback: true,
      });
    }

    // Check if AI is enabled
    if (!AI_CONFIG.enabled) {
      console.warn('[PLACEMENT_AI] AI service is disabled, returning fallback');
      const fallback = getFallbackGuidance(topic);
      return res.json({
        guidance: `[Fallback Content]\n\n${fallback}`,
        fallback: true,
      });
    }

    // Validate API key and model are set
    if (!AI_CONFIG.google.apiKey || !AI_CONFIG.google.model) {
      console.error('[PLACEMENT_AI] ❌ Missing API key or model, returning fallback');
      const fallback = getFallbackGuidance(topic);
      return res.json({
        guidance: `[Fallback Content]\n\n${fallback}`,
        fallback: true,
      });
    }

    // DEBUG: Log request details (without exposing full key)
    console.log('[PLACEMENT_AI] Request details:', {
      topic: topic.substring(0, 50),
      model: AI_CONFIG.google.model,
      apiKeyLength: AI_CONFIG.google.apiKey.length,
      apiKeyPrefix: AI_CONFIG.google.apiKey.substring(0, 8),
      maxTokens: AI_CONFIG.google.maxTokens,
      temperature: AI_CONFIG.google.temperature,
    });

    // Validate provider is Google
    if (AI_CONFIG.provider !== 'google') {
      console.error('[PLACEMENT_AI] Invalid provider:', AI_CONFIG.provider);
      return res.status(400).json({
        message: 'AI not configured',
      });
    }

    try {
      // STRICT SYSTEM PROMPT - formatting contract
      const systemPrompt = `You are an AI placement mentor helping students prepare for software engineering interviews.

FORMATTING CONTRACT (STRICTLY ENFORCED):
- Output must be 100% plain text. NO markdown symbols (**, ##, ###, ####, *, |, tables).
- NO emojis. NO bullet symbols (*, -, •).
- Use ONLY numbered points (1., 2., 3.) and line breaks.
- Headings must be plain text followed by a colon (e.g., "Overview:", "Step 1:", "Resources:").
- Each point must be 1-2 lines maximum.
- ALWAYS end with a complete sentence. Never truncate mid-sentence.
- Response must be complete and self-contained.

CONTENT STRUCTURE:
- Start with a 2-3 line plain text overview (no heading needed).
- Then provide numbered steps (1., 2., 3., etc.).
- Include YouTube channel names when resources are mentioned.
- End with a complete concluding sentence.

TONE:
- Clear, direct, educational.
- No fluff, no marketing language, no motivational filler.`;

      // User prompt construction
      const userPrompt = `Topic: ${topic}

Generate a complete placement preparation plan following the formatting contract:
- Plain text only (NO markdown, bullets, or emojis).
- Numbered points (1., 2., 3.) for structure.
- Start with 2-3 line overview.
- Include YouTube channel names if resources are mentioned.
- End with a complete sentence.
- Ensure the response is complete and not cut off.`;

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      // Use lower temperature and max tokens for placement guidance
      const placementConfig = {
        temperature: 0.35, // Between 0.3-0.4 as specified
        maxTokens: 800, // ≤800 as specified
      };

      console.log('[PLACEMENT_AI] Calling Google AI:', {
        model: AI_CONFIG.google.model,
        maxTokens: placementConfig.maxTokens,
        temperature: placementConfig.temperature,
        promptLength: fullPrompt.length,
      });

      // Call Google AI with placement-specific config
      let guidance;
      let aiFailed = false;
      let failureReason = null;
      
      try {
        guidance = await generateGoogleContent(fullPrompt, placementConfig);
        
        // CRITICAL: Log raw response before any processing
        console.log('[PLACEMENT_AI] Raw Gemini response (first 500 chars):', guidance?.substring(0, 500));
        console.log('[PLACEMENT_AI] Full response length:', guidance?.length || 0);
        console.log('[PLACEMENT_AI] Response ends with:', guidance?.substring(Math.max(0, guidance.length - 50)) || 'N/A');

        // Validate response is complete (not truncated)
        if (!guidance || guidance.trim().length === 0) {
          throw new Error('AI service returned an empty response');
        }
      } catch (aiError) {
        // This catch handles errors from the try block above
        // If we already handled it in the outer try-catch, skip
        if (aiFailed) {
          throw aiError; // Re-throw to outer catch
        }
        
        // Detect AI failure explicitly
        aiFailed = true;
        const errorMessage = aiError.message || '';
        const errorStatus = aiError.status;
        
        // Categorize failure type
        if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorStatus === 429) {
          failureReason = 'QUOTA_EXCEEDED';
        } else if (errorMessage.includes('authentication') || errorMessage.includes('API key') || errorStatus === 401 || errorStatus === 403) {
          failureReason = 'AUTHENTICATION_FAILED';
        } else if (errorMessage.includes('timeout')) {
          failureReason = 'TIMEOUT';
        } else {
          failureReason = 'AI_ERROR';
        }
        
        console.warn('[PLACEMENT_AI] AI failed, activating DuckDuckGo fallback:', {
          reason: failureReason,
          error: errorMessage,
        });
        
        // Try DuckDuckGo fallback
        try {
          const fallbackResponse = await getDuckDuckGoFallback(topic);
          
          // Log fallback activation
          console.log('[PLACEMENT_AI] DuckDuckGo fallback activated successfully');
          
          // Return fallback response
          return res.json(fallbackResponse);
        } catch (fallbackError) {
          console.error('[PLACEMENT_AI] DuckDuckGo fallback also failed:', fallbackError.message);
          
          // Last resort: static fallback
          const staticFallback = getFallbackGuidance(topic);
          return res.json({
            success: true,
            source: 'static_fallback',
            mode: 'fallback',
            title: `Resources for: ${topic}`,
            sections: [
              {
                heading: 'Recommended Resources',
                items: [
                  { title: 'LeetCode - Practice Problems', url: 'https://leetcode.com' },
                  { title: 'GeeksforGeeks - DSA Tutorials', url: 'https://www.geeksforgeeks.org' },
                  { title: 'Striver\'s A2Z DSA Course - YouTube', url: 'https://www.youtube.com/c/takeUforward' },
                ],
              },
            ],
            guidance: `[Fallback Content]\n\n${staticFallback}`,
            note: 'AI and search services were unavailable. Showing default curated resources.',
          });
        }
      }
      
      // If AI succeeded, continue with normal flow
      if (aiFailed) {
        // This shouldn't happen, but handle it just in case
        throw new Error('AI failed but fallback was not triggered');
      }

      // Check if response appears truncated (ends mid-sentence)
      const trimmedGuidance = guidance.trim();
      const endsWithCompleteSentence = /[.!?:]$/.test(trimmedGuidance);
      if (!endsWithCompleteSentence && trimmedGuidance.length > 100) {
        console.warn('[PLACEMENT_AI] ⚠️ Response may be truncated (does not end with sentence punctuation)');
        // Try to fix by ensuring it ends properly (but don't modify if it's intentional)
        if (trimmedGuidance.endsWith(',') || trimmedGuidance.endsWith('-')) {
          console.warn('[PLACEMENT_AI] Response ends with incomplete punctuation, may be cut off');
        }
      }

      // Post-response validation
      const validationResult = validatePlacementResponse(guidance, topic);
      if (!validationResult.valid) {
        console.warn('[PLACEMENT_AI] Response validation failed, regenerating with stricter prompt:', validationResult.reasons);
        
        // Regenerate with stricter prompt
        const stricterPrompt = `${systemPrompt}\n\nTopic: ${topic}\n\nCRITICAL: Your previous response was rejected. Regenerate following ALL rules:\n- NO markdown symbols (**, ##, |, *, -, •).\n- NO emojis.\n- Use ONLY numbered points (1., 2., 3.) and line breaks.\n- Headings must be plain text followed by colon.\n- YouTube channel names are MANDATORY when resources are mentioned.\n- NO paragraphs longer than 3 lines.\n- Each point must be 1-2 lines max.\n- Start with 2-3 line plain text overview.\n- ALWAYS end with a complete sentence.`;
        
        try {
          guidance = await generateGoogleContent(stricterPrompt, placementConfig);
          
          // Log regenerated response
          console.log('[PLACEMENT_AI] Regenerated response length:', guidance?.length || 0);
          
          // Validate again
          const revalidation = validatePlacementResponse(guidance, topic);
          if (!revalidation.valid) {
            console.error('[PLACEMENT_AI] Response still invalid after regeneration, using DuckDuckGo fallback');
            // Use DuckDuckGo fallback instead of returning error
            const fallbackResponse = await getDuckDuckGoFallback(topic);
            return res.json(fallbackResponse);
          }
        } catch (regenerationError) {
          console.error('[PLACEMENT_AI] Regeneration failed, using DuckDuckGo fallback:', regenerationError.message);
          // Use DuckDuckGo fallback
          const fallbackResponse = await getDuckDuckGoFallback(topic);
          return res.json(fallbackResponse);
        }
      }

      console.log('[PLACEMENT_AI] Success:', {
        responseLength: guidance?.length || 0,
        endsWithCompleteSentence: /[.!?:]$/.test(guidance.trim()),
        timestamp: new Date().toISOString(),
      });

      // Return response - ensure it's a string and not truncated
      const finalGuidance = guidance || 'No guidance generated. Please try again.';
      
      // Cache the response
      setCachedResponse(topic, finalGuidance);
      
      // Log request count (for quota monitoring)
      logRequestCount();
      
      res.json({
        guidance: finalGuidance,
        success: true,
      });
    } catch (error) {
      // DEBUG: Log full error details
      console.error('[PLACEMENT_AI] ❌ Error occurred:', {
        errorMessage: error.message,
        errorStack: error.stack?.substring(0, 1000), // First 1000 chars
        errorCode: error.code,
        errorStatus: error.status,
        timestamp: new Date().toISOString(),
      });

      // All AI errors should trigger DuckDuckGo fallback
      console.warn('[PLACEMENT_AI] AI error in catch block, activating DuckDuckGo fallback');
      
      try {
        const fallbackResponse = await getDuckDuckGoFallback(topic);
        console.log('[PLACEMENT_AI] DuckDuckGo fallback activated from catch block');
        return res.json(fallbackResponse);
      } catch (fallbackError) {
        console.error('[PLACEMENT_AI] DuckDuckGo fallback failed:', fallbackError.message);
        
        // Last resort: static fallback
        const staticFallback = getFallbackGuidance(topic);
        return res.json({
          success: true,
          source: 'static_fallback',
          mode: 'fallback',
          title: `Resources for: ${topic}`,
          sections: [
            {
              heading: 'Recommended Resources',
              items: [
                { title: 'LeetCode - Practice Problems', url: 'https://leetcode.com' },
                { title: 'GeeksforGeeks - DSA Tutorials', url: 'https://www.geeksforgeeks.org' },
                { title: 'Striver\'s A2Z DSA Course - YouTube', url: 'https://www.youtube.com/c/takeUforward' },
              ],
            },
          ],
          guidance: `[Fallback Content]\n\n${staticFallback}`,
          note: 'AI and search services were unavailable. Showing default curated resources.',
        });
      }
    }
  }
);

/**
 * Post-response validator for placement AI responses
 * Checks for YouTube channels, formatting rules, and content quality
 * @param {string} response - The AI-generated response
 * @param {string} topic - The original topic query
 * @returns {Object} { valid: boolean, reasons: string[] }
 */
function validatePlacementResponse(response, topic) {
  const reasons = [];
  
  if (!response || typeof response !== 'string' || response.trim().length === 0) {
    return { valid: false, reasons: ['Response is empty'] };
  }

  const responseLower = response.toLowerCase();

  // Check for forbidden markdown symbols
  const forbiddenMarkdown = [
    { pattern: /\*\*/g, name: 'bold markdown (**)' },
    { pattern: /#{1,6}\s/g, name: 'heading markdown (##)' },
    { pattern: /\|/g, name: 'table markdown (|)' },
    { pattern: /^[\*\-\•]\s/gm, name: 'bullet symbols (*, -, •)' },
  ];

  forbiddenMarkdown.forEach(({ pattern, name }) => {
    if (pattern.test(response)) {
      reasons.push(`Response contains forbidden ${name}`);
    }
  });

  // Check for emojis (common emoji patterns)
  const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  if (emojiPattern.test(response)) {
    reasons.push('Response contains emojis');
  }

  // Check for YouTube resources (mandatory when resources are mentioned)
  const topicLower = topic.toLowerCase();
  const mentionsResources = topicLower.includes('resource') || 
                           topicLower.includes('youtube') || 
                           topicLower.includes('video') ||
                           topicLower.includes('channel') ||
                           topicLower.includes('learn') ||
                           topicLower.includes('study') ||
                           topicLower.includes('prepare');

  if (mentionsResources) {
    // Check for YouTube channel indicators
    const youtubeIndicators = [
      'youtube',
      'channel',
      'striver',
      'takeuforward',
      'abdul bari',
      'neetcode',
      'freecodecamp',
      'coding ninjas',
      'apna college',
      'love babbar',
      'gfg',
      'geeksforgeeks',
    ];
    
    const hasYouTubeMention = youtubeIndicators.some(indicator => 
      responseLower.includes(indicator)
    );
    
    if (!hasYouTubeMention) {
      reasons.push('YouTube resources requested but no YouTube channels found in response');
    }
  }

  // Check for long paragraphs (>3 lines)
  const paragraphs = response.split('\n\n').filter(p => p.trim().length > 0);
  const longParagraphs = paragraphs.filter(p => {
    const lines = p.split('\n').filter(l => l.trim().length > 0);
    return lines.length > 3;
  });

  if (longParagraphs.length > 0) {
    reasons.push(`Found ${longParagraphs.length} paragraph(s) longer than 3 lines`);
  }

  // Check for motivational/filler text indicators
  const fillerPhrases = [
    'remember that',
    'keep in mind',
    'don\'t forget',
    'always remember',
    'it\'s important to',
    'you should know',
    'believe in yourself',
    'stay motivated',
    'keep pushing',
    'never give up',
  ];
  
  const hasFiller = fillerPhrases.some(phrase => 
    responseLower.includes(phrase)
  );
  
  if (hasFiller) {
    reasons.push('Response contains motivational/filler text');
  }

  // Check if response uses numbered points (preferred format)
  const hasNumberedPoints = /\d+\.\s/.test(response);
  if (!hasNumberedPoints && response.split('\n').length > 5) {
    reasons.push('Response should use numbered points (1., 2., 3.) for structured content');
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

// Request count tracking for quota monitoring
let requestCounts = {
  perMinute: [],
  perHour: [],
};

/**
 * Log request count for quota monitoring
 */
function logRequestCount() {
  const now = Date.now();
  
  // Track per minute
  requestCounts.perMinute.push(now);
  requestCounts.perMinute = requestCounts.perMinute.filter(t => now - t < 60 * 1000);
  
  // Track per hour
  requestCounts.perHour.push(now);
  requestCounts.perHour = requestCounts.perHour.filter(t => now - t < 60 * 60 * 1000);
  
  // Log every 10 requests
  if (requestCounts.perMinute.length % 10 === 0) {
    console.log('[PLACEMENT_AI] Request count:', {
      perMinute: requestCounts.perMinute.length,
      perHour: requestCounts.perHour.length,
      timestamp: new Date().toISOString(),
    });
  }
}

export default router;
