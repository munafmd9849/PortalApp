import logger from '../config/logger.js';

const DUCKDUCKGO_ENDPOINT = 'https://html.duckduckgo.com/html/';

/**
 * Parses HTML content from DuckDuckGo search results
 * @param {string} html
 * @returns {Array<{title: string, url: string, snippet: string}>}
 */
/**
 * Decodes HTML entities
 */
function decodeHtmlEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=');
}

/**
 * Parses HTML content from DuckDuckGo search results
 * Handles multiple possible HTML structures
 */
function parseDuckDuckGoResults(html) {
  const results = [];
  
  // Try multiple patterns to handle different DuckDuckGo HTML structures
  // Pattern 1: <div class="result"> with <a class="result__a">
  let resultPattern = /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="[^"]*result|$)/gi;
  let match;
  
  while ((match = resultPattern.exec(html)) !== null && results.length < 10) {
    const resultHtml = match[1];
    
    // Try to extract title and URL - multiple possible patterns
    let titleMatch = resultHtml.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i);
    
    // Fallback: look for any link with a title-like structure
    if (!titleMatch) {
      titleMatch = resultHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*class="[^"]*result[^"]*"[^>]*>([^<]+)<\/a>/i);
    }
    
    // Another fallback: any link in result div
    if (!titleMatch) {
      const linkMatch = resultHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i);
      if (linkMatch && !linkMatch[1].includes('duckduckgo.com')) {
        titleMatch = linkMatch;
      }
    }
    
    if (!titleMatch) continue;
    
    let url = titleMatch[1];
    let title = titleMatch[2];
    
    // Extract snippet - try multiple patterns
    let snippet = '';
    const snippetMatch = resultHtml.match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([^<]+)<\/a>/i);
    if (snippetMatch) {
      snippet = snippetMatch[1];
    } else {
      // Fallback: look for description text
      const descMatch = resultHtml.match(/<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([^<]+)<\/div>/i);
      if (descMatch) {
        snippet = descMatch[1];
      }
    }
    
    // Clean up
    title = decodeHtmlEntities(title.trim());
    snippet = decodeHtmlEntities(snippet.trim());
    
    // Skip invalid URLs
    if (!url || url.startsWith('javascript:') || url.startsWith('#') || url.includes('duckduckgo.com/l/')) {
      continue;
    }
    
    // Normalize URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    // Skip if title is empty
    if (!title) continue;
    
    results.push({
      title: title || 'Untitled result',
      url: url,
      snippet: snippet || '',
    });
  }
  
  // If no results found with first pattern, try alternative structure
  if (results.length === 0) {
    // Alternative: look for result links directly
    const linkPattern = /<a[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*class="[^"]*result[^"]*"[^>]*>([^<]+)<\/a>/gi;
    let linkMatch;
    
    while ((linkMatch = linkPattern.exec(html)) !== null && results.length < 10) {
      const url = linkMatch[1];
      const title = decodeHtmlEntities(linkMatch[2].trim());
      
      if (url && !url.includes('duckduckgo.com') && title) {
        results.push({
          title,
          url,
          snippet: '',
        });
      }
    }
  }
  
  return results;
}

/**
 * Searches DuckDuckGo HTML endpoint and returns parsed results
 * @param {string} query
 * @param {number} [limit=10]
 * @returns {Promise<Array<{title: string, url: string, snippet: string}>>}
 */
export async function searchWeb(query, limit = 10) {
  if (!query || !query.trim()) {
    throw new Error('Search query is required');
  }

  const url = new URL(DUCKDUCKGO_ENDPOINT);
  url.searchParams.set('q', query.trim());

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      logger.error('DuckDuckGo search error', {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error('Failed to fetch search results from DuckDuckGo');
    }

    const html = await response.text();
    const results = parseDuckDuckGoResults(html);
    
    // Limit results
    return results.slice(0, limit);
  } catch (error) {
    logger.error('Error searching DuckDuckGo', { error: error.message });
    throw error;
  }
}

