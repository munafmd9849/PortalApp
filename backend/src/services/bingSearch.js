import logger from '../config/logger.js';

const DUCKDUCKGO_ENDPOINT = 'https://html.duckduckgo.com/html/';

/**
 * Parses HTML content from DuckDuckGo search results
 * @param {string} html
 * @returns {Array<{title: string, url: string, snippet: string}>}
 */
function parseDuckDuckGoResults(html) {
  const results = [];
  
  // DuckDuckGo HTML structure: results are in <div class="result">
  // Title is in <a class="result__a">
  // Snippet is in <a class="result__snippet">
  // URL is in the href of the title link
  
  // Simple regex-based parsing (more reliable than complex HTML parsing for this use case)
  const resultPattern = /<div class="result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="result|$)/g;
  let match;
  
  while ((match = resultPattern.exec(html)) !== null && results.length < 10) {
    const resultHtml = match[1];
    
    // Extract title and URL from <a class="result__a">
    const titleMatch = resultHtml.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/);
    if (!titleMatch) continue;
    
    const url = titleMatch[1];
    const title = titleMatch[2].trim();
    
    // Extract snippet from <a class="result__snippet">
    const snippetMatch = resultHtml.match(/<a[^>]*class="result__snippet"[^>]*>([^<]+)<\/a>/);
    const snippet = snippetMatch ? snippetMatch[1].trim() : '';
    
    // Clean up HTML entities
    const cleanTitle = title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    
    const cleanSnippet = snippet
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    
    // Skip if no valid URL
    if (!url || url.startsWith('javascript:') || url.startsWith('#')) continue;
    
    results.push({
      title: cleanTitle || 'Untitled result',
      url: url.startsWith('http') ? url : `https://${url}`,
      snippet: cleanSnippet || '',
    });
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

