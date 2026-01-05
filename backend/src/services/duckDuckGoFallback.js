/**
 * DuckDuckGo Fallback Service
 * Provides search-based fallback when AI service fails
 */

import { getCachedResponse, setCachedResponse } from '../utils/placementCache.js';

/**
 * Build search query with placement-focused intent
 * @param {string} userPrompt - Original user query
 * @returns {string} Enhanced search query
 */
function buildSearchQuery(userPrompt) {
  const prompt = userPrompt.toLowerCase().trim();
  
  // Add placement-focused sites to search
  const placementSites = [
    'site:youtube.com',
    'site:geeksforgeeks.org',
    'site:leetcode.com',
    'site:interviewbit.com',
    'site:codeforces.com',
  ];
  
  // Build query: original prompt + site filters
  const siteFilter = placementSites.join(' OR ');
  return `${userPrompt} ${siteFilter}`;
}

/**
 * Fetch search results from DuckDuckGo
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of search results
 */
async function fetchDuckDuckGoResults(query) {
  try {
    // Use DuckDuckGo HTML endpoint (no API key required)
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`DuckDuckGo search failed: ${response.status}`);
      }

      const html = await response.text();
      return parseDuckDuckGoHTML(html);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('DuckDuckGo search timeout');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('[DUCKDUCKGO] Search error:', error.message);
    throw error;
  }
}

/**
 * Parse DuckDuckGo HTML results
 * @param {string} html - HTML content from DuckDuckGo
 * @returns {Array} Parsed results
 */
function parseDuckDuckGoHTML(html) {
  const results = [];
  
  try {
    // DuckDuckGo HTML structure: results are in <div class="result">
    // Try multiple patterns to handle different DuckDuckGo HTML structures
    const patterns = [
      // Pattern 1: result__a class
      /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi,
      // Pattern 2: result-link class
      /<a[^>]*class="[^"]*result-link[^"]*"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi,
      // Pattern 3: Generic result link
      /<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi,
    ];
    
    let count = 0;
    const maxResults = 8;
    const seenUrls = new Set();

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && count < maxResults) {
        const url = match[1];
        const title = match[2].trim();
        
        // Skip if already seen or invalid
        if (!url || !title || !url.startsWith('http') || seenUrls.has(url)) {
          continue;
        }
        
        seenUrls.add(url);
        
        // Extract snippet if available (look ahead in HTML)
        let snippet = '';
        const snippetPattern = new RegExp(
          `(<a[^>]*href="${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>[^<]*</a>[\\s\\S]{0,500}?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([^<]*)</a>)`,
          'i'
        );
        const snippetMatch = html.match(snippetPattern);
        if (snippetMatch) {
          snippet = cleanText(snippetMatch[2]).substring(0, 150);
        }
        
        results.push({
          title: cleanText(title),
          url: url,
          snippet: snippet,
        });
        count++;
        
        if (count >= maxResults) break;
      }
      
      if (count >= maxResults) break;
    }
  } catch (error) {
    console.error('[DUCKDUCKGO] Parse error:', error.message);
  }

  return results;
}

/**
 * Clean HTML entities and extra whitespace from text
 */
function cleanText(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Categorize results into sections
 * @param {Array} results - Raw search results
 * @returns {Object} Categorized results
 */
function categorizeResults(results) {
  const sections = {
    youtube: [],
    practice: [],
    articles: [],
  };

  results.forEach(result => {
    const url = result.url.toLowerCase();
    const title = result.title.toLowerCase();

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      sections.youtube.push(result);
    } else if (
      url.includes('leetcode.com') ||
      url.includes('geeksforgeeks.org') ||
      url.includes('interviewbit.com') ||
      url.includes('codeforces.com') ||
      title.includes('practice') ||
      title.includes('problems')
    ) {
      sections.practice.push(result);
    } else {
      sections.articles.push(result);
    }
  });

  return sections;
}

/**
 * Generate fallback response from search results
 * @param {string} userPrompt - Original user query
 * @param {Array} results - Search results
 * @returns {Object} Normalized response
 */
function generateFallbackResponse(userPrompt, results) {
  const categorized = categorizeResults(results);
  
  const sections = [];
  
  if (categorized.youtube.length > 0) {
    sections.push({
      heading: 'YouTube Resources',
      items: categorized.youtube.slice(0, 5).map(r => ({
        title: r.title,
        url: r.url,
      })),
    });
  }

  if (categorized.practice.length > 0) {
    sections.push({
      heading: 'Practice Platforms',
      items: categorized.practice.slice(0, 5).map(r => ({
        title: r.title,
        url: r.url,
      })),
    });
  }

  if (categorized.articles.length > 0 && sections.length < 2) {
    sections.push({
      heading: 'Additional Resources',
      items: categorized.articles.slice(0, 3).map(r => ({
        title: r.title,
        url: r.url,
      })),
    });
  }

  return {
    success: true,
    source: 'duckduckgo_fallback',
    mode: 'fallback',
    title: `Resources for: ${userPrompt}`,
    sections: sections,
    note: 'AI service was unavailable. Showing curated search-based resources.',
  };
}

/**
 * Get fallback resources using DuckDuckGo search
 * @param {string} userPrompt - User's original query
 * @returns {Promise<Object>} Normalized fallback response
 */
export async function getDuckDuckGoFallback(userPrompt) {
  // Check cache first
  const cacheKey = `ddg:${userPrompt}`;
  const cached = getCachedResponse(cacheKey);
  if (cached && typeof cached === 'object' && cached.source === 'duckduckgo_fallback') {
    console.log('[DUCKDUCKGO] Returning cached fallback results');
    return cached;
  }

  try {
    console.log('[DUCKDUCKGO] Fetching fallback resources for:', userPrompt);
    
    // Build enhanced search query
    const searchQuery = buildSearchQuery(userPrompt);
    console.log('[DUCKDUCKGO] Search query:', searchQuery);

    // Fetch results
    const results = await fetchDuckDuckGoResults(searchQuery);
    console.log('[DUCKDUCKGO] Found', results.length, 'results');

    if (results.length === 0) {
      throw new Error('No search results found');
    }

    // Generate normalized response
    const response = generateFallbackResponse(userPrompt, results);
    
    // Cache the response
    setCachedResponse(cacheKey, response);
    
    return response;
  } catch (error) {
    console.error('[DUCKDUCKGO] Fallback failed:', error.message);
    
    // Return minimal fallback if search also fails
    return {
      success: true,
      source: 'duckduckgo_fallback',
      mode: 'fallback',
      title: `Resources for: ${userPrompt}`,
      sections: [
        {
          heading: 'Recommended Resources',
          items: [
            {
              title: 'LeetCode - Practice Problems',
              url: 'https://leetcode.com',
            },
            {
              title: 'GeeksforGeeks - DSA Tutorials',
              url: 'https://www.geeksforgeeks.org',
            },
            {
              title: 'Striver\'s A2Z DSA Course - YouTube',
              url: 'https://www.youtube.com/c/takeUforward',
            },
            {
              title: 'NeetCode - Coding Interview Prep',
              url: 'https://www.youtube.com/c/NeetCode',
            },
          ],
        },
      ],
      note: 'AI and search services were unavailable. Showing default curated resources.',
    };
  }
}

