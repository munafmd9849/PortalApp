import express from 'express';
import { query, body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { searchWeb } from '../services/duckDuckGoSearch.js';
import { summarizeSearchResults } from '../services/aiSummary.js';

const router = express.Router();

/**
 * GET /api/search?query=...
 * Searches DuckDuckGo and returns results (without summary)
 */
router.get(
  '/',
  authenticate,
  [
    query('query')
      .trim()
      .isLength({ min: 2, max: 120 })
      .withMessage('Search query must be between 2 and 120 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const queryText = req.query.query.trim();

    try {
      const results = await searchWeb(queryText, 10);

      res.json({
        query: queryText,
        results,
      });
    } catch (error) {
      console.error('Search route error:', error);
      const errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('Failed to fetch')) {
        return res.status(503).json({ 
          error: 'Search service is temporarily unavailable. Please try again later.',
          details: errorMessage
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to complete search. Please try again later.',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      });
    }
  }
);

/**
 * POST /api/search/summarize
 * Takes search results and returns an AI-generated summary
 */
router.post(
  '/summarize',
  authenticate,
  [
    body('results')
      .isArray({ min: 1 })
      .withMessage('Results array is required and must contain at least one item'),
    body('results.*.title')
      .notEmpty()
      .withMessage('Each result must have a title'),
    body('results.*.url')
      .notEmpty()
      .withMessage('Each result must have a URL'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { results } = req.body;

    try {
      const summary = await summarizeSearchResults(results);

      res.json({
        summary,
      });
    } catch (error) {
      console.error('Summarize route error:', error);
      const errorMessage = error.message || 'Unknown error';
      
      res.status(500).json({ 
        error: 'Failed to generate summary. Please try again later.',
        ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
      });
    }
  }
);

export default router;

