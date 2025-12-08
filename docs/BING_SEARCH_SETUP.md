# Placement Resources Search Setup Guide

The Placement Resources search feature uses **DuckDuckGo HTML search** (free, no API key required) and optional **OpenAI** for AI summaries.

## Quick Setup

### 1. Get a Bing API Key (Free Tier Available)

1. Go to [Azure Portal](https://portal.azure.com/)
2. Sign in with your Microsoft account
3. Create a new resource:
   - Click "Create a resource"
   - Search for "Bing Search v7"
   - Click "Create"
   - Choose your subscription and resource group
   - Give it a name (e.g., "portal-bing-search")
   - Select the "Free F1" pricing tier
   - Click "Review + create" then "Create"

4. After creation, go to your resource:
   - Click "Keys and Endpoint" in the left menu
   - Copy **Key 1** (or Key 2)

### 2. Add to Backend Environment

Add the following line to your `backend/.env` file:

```env
BING_API_KEY=your_bing_api_key_here
```

### 3. Restart Backend Server

After adding the key, restart your backend server:

```bash
cd backend
npm run dev
```

## Free Tier Limits

- **3,000 queries per month** (free tier)
- **Up to 1,000 queries per day**

This should be sufficient for development and moderate production use.

## Optional: AI Summary Setup

For AI-powered summaries, you can optionally configure:

### Option 1: OpenAI (Recommended for best quality)

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini  # or gpt-3.5-turbo for cheaper option
```

### Option 2: Local Ollama (Free, runs locally)

```env
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1  # or any model you have installed
```

**Note:** If neither AI service is configured, the system will use a fallback summary based on the search results.

## Troubleshooting

### Error: "BING_API_KEY is not configured"

- Make sure you've added `BING_API_KEY` to `backend/.env`
- Restart the backend server after adding the key
- Check that there are no typos in the variable name

### Error: "Failed to fetch search results"

- Verify your Bing API key is valid
- Check your Azure subscription is active
- Ensure you haven't exceeded the free tier limits
- Check backend server logs for detailed error messages

### Search returns empty results

- Verify your Bing API key has the correct permissions
- Check that the Bing Search v7 resource is active in Azure Portal
- Try a different search query to test

## Testing

After setup, test the search functionality:

1. Start both backend and frontend servers
2. Navigate to "Placement Resources" in the student dashboard
3. Search for "DSA basics" or any topic
4. You should see results and an AI summary

## Production Deployment

For production:

1. Use environment variables in your hosting platform (Vercel, Railway, etc.)
2. Consider upgrading to a paid Bing tier if you expect high traffic
3. Monitor API usage in Azure Portal to avoid unexpected charges

