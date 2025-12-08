import logger from '../config/logger.js';

const FALLBACK_SUMMARY = 'Summary unavailable. Review the search results below for more context.';

/**
 * Formats the prompt for the AI summarizer
 * @param {Array<{title: string, snippet: string}>} results
 */
function buildPrompt(results = []) {
  const bulletList = results
    .map(
      (item, idx) =>
        `${idx + 1}. Title: ${item.title}\n   Summary: ${item.snippet || 'No snippet provided.'}`
    )
    .join('\n');

  return [
    {
      role: 'system',
      content:
        'You are generating a clean, structured, ATS-friendly learning summary for students preparing for placements.',
    },
    {
      role: 'user',
      content: `Summarize key concepts based on these search results:\n${bulletList}\n\nReturn a focused explanation, bullet points, and recommended learning steps.`,
    },
  ];
}

async function callOpenAI(results) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: buildPrompt(results),
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('OpenAI summarizer error', { status: response.status, body: errorText });
    return null;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function callOllama(results) {
  const baseUrl = process.env.OLLAMA_API_URL || process.env.OLLAMA_HOST;
  if (!baseUrl) return null;

  const model = process.env.OLLAMA_MODEL || 'llama3.1';
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt: buildPrompt(results).map((msg) => msg.content).join('\n'),
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('Ollama summarizer error', { status: response.status, body: errorText });
    return null;
  }

  const data = await response.json();
  return data.response?.trim() || null;
}

export async function summarizeSearchResults(results = []) {
  if (!results.length) {
    return FALLBACK_SUMMARY;
  }

  try {
    const viaOpenAI = await callOpenAI(results);
    if (viaOpenAI) return viaOpenAI;
  } catch (error) {
    logger.error('OpenAI summarizer invocation failed', { error });
  }

  try {
    const viaOllama = await callOllama(results);
    if (viaOllama) return viaOllama;
  } catch (error) {
    logger.error('Ollama summarizer invocation failed', { error });
  }

  // Fallback summary constructed locally
  const keyPoints = results
    .slice(0, 3)
    .map((item) => `• ${item.title} — ${item.snippet.slice(0, 120)}...`)
    .join('\n');

  return `Key insights:\n${keyPoints}\n\nRecommended next steps:\n• Open the top links and create concise notes.\n• Practice questions mentioned in the resources.\n• Consolidate learnings into your preparation tracker.`;
}

