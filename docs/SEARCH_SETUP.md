# Placement Resources Search Setup Guide

The Placement Resources search feature uses **DuckDuckGo HTML search** (completely free, no API key required) and optional **OpenAI** for AI-powered summaries.

## How It Works

1. **Search**: Uses DuckDuckGo's HTML endpoint (free, no limits)
2. **Summary**: Optionally uses OpenAI to generate AI summaries (requires API key)

## Quick Setup

### Step 1: Search (No Configuration Required!)

The search feature works **immediately** without any setup. DuckDuckGo HTML search is free and requires no API keys.

### Step 2: AI Summary (Optional)

For AI-powered summaries, add OpenAI API key to `backend/.env`:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini  # or gpt-3.5-turbo for cheaper option
```

**Note:** If OpenAI is not configured, the search will still work and return results, but without the AI summary.

### Step 3: Restart Backend

After adding OpenAI key (if desired), restart your backend server:

```bash
cd backend
npm run dev
```

## Alternative: Local AI (Ollama)

Instead of OpenAI, you can use a local Ollama instance:

```env
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1  # or any model you have installed
```

## Testing

1. Start both backend and frontend servers
2. Navigate to "Placement Resources" in the student dashboard
3. Search for "DSA basics" or any topic
4. You should see:
   - Search results from DuckDuckGo (always works)
   - AI summary (if OpenAI/Ollama is configured)

## API Endpoints

### GET `/api/search?query=...`

Searches DuckDuckGo and returns top 10 results.

**Response:**
```json
{
  "query": "DSA basics",
  "results": [
    {
      "title": "Data Structures and Algorithms",
      "url": "https://example.com",
      "snippet": "Learn about arrays, linked lists..."
    }
  ]
}
```

### POST `/api/search/summarize`

Generates an AI summary from search results.

**Request:**
```json
{
  "results": [
    {
      "title": "Data Structures and Algorithms",
      "url": "https://example.com",
      "snippet": "Learn about arrays..."
    }
  ]
}
```

**Response:**
```json
{
  "summary": "Key concepts: Arrays, linked lists, time complexity..."
}
```

## Troubleshooting

### Search returns empty results

- Check your internet connection
- DuckDuckGo may be rate-limiting (rare) - wait a few minutes
- Try a different search query

### AI summary not appearing

- Check that `OPENAI_API_KEY` is set in `backend/.env`
- Verify your OpenAI API key is valid
- Check backend logs for error messages
- Summary is optional - search results will still work without it

### Error: "Search service is temporarily unavailable"

- DuckDuckGo may be blocking requests (rare)
- Check backend logs for detailed error
- Try again in a few minutes

## Production Deployment

- **No API keys needed** for search (DuckDuckGo is free)
- **Optional**: Add `OPENAI_API_KEY` to your hosting platform's environment variables for AI summaries
- Monitor OpenAI usage if using summaries (check OpenAI dashboard)

## Cost

- **Search**: $0 (completely free via DuckDuckGo)
- **AI Summary**: 
  - OpenAI: ~$0.01-0.05 per summary (depending on model)
  - Ollama: $0 (runs locally)

