# AI Configuration Guide

## Overview

The application uses a centralized AI abstraction layer that supports multiple providers. All AI model names and configurations come from environment variables - **no hardcoded model names**.

## Environment Variables

### Required Variables

```bash
# AI Provider (default: 'google')
AI_PROVIDER=google

# Google AI Configuration
GOOGLE_AI_API_KEY=your_api_key_here
# OR (for backward compatibility)
GEMINI_API_KEY=your_api_key_here
GOOGLE_GEMINI_API_KEY=your_api_key_here

# Google AI Model Name (REQUIRED - no default)
GOOGLE_AI_MODEL=gemini-2.5-flash
# OR (for backward compatibility)
GEMINI_MODEL=gemini-2.5-flash
```

### Optional Variables

```bash
# Enable/disable AI service (default: enabled)
AI_ENABLED=true

# Google AI Configuration
GOOGLE_AI_MAX_TOKENS=2048
GOOGLE_AI_TEMPERATURE=0.7
```

## Supported Models

The model name is **completely configurable** via environment variables. Common models include:

- `gemini-2.5-flash` (recommended - latest, fast and efficient)
- `gemini-1.5-flash` (previous version, still supported)
- `gemini-1.5-pro` (higher quality, slower)
- `gemini-2.5-flash` (newer, may require v1 API)

**Note:** Model availability depends on your Google AI API access level and API version.

## Architecture

### File Structure

```
backend/src/
├── config/
│   └── ai.config.js          # Centralized AI configuration
├── services/
│   ├── ai/
│   │   ├── index.js          # AI abstraction layer
│   │   └── google.provider.js # Google AI provider implementation
│   ├── geminiService.js      # Placement guidance service (uses abstraction)
│   └── aiService.js          # Project content generation (uses abstraction)
└── routes/
    └── placement.js          # Placement AI route
```

### How It Works

1. **Configuration Layer** (`ai.config.js`)
   - Reads all AI settings from environment variables
   - Validates configuration on startup
   - Provides single source of truth for AI settings

2. **Abstraction Layer** (`services/ai/index.js`)
   - Provides unified `generateAIContent()` function
   - Handles errors gracefully - never crashes the UI
   - Returns user-friendly error messages

3. **Provider Implementation** (`services/ai/google.provider.js`)
   - Implements Google AI-specific logic
   - Uses model name from `AI_CONFIG.google.model`
   - Handles Google API errors and converts to user-friendly messages

4. **Service Layer** (`geminiService.js`, `aiService.js`)
   - Uses abstraction layer only
   - No direct Google AI SDK calls
   - No hardcoded model names

## Error Handling

The system is designed to **never crash** due to AI errors:

1. **Configuration Errors**: Returns "AI service is not configured"
2. **Model Not Found**: Returns "Model is not available" (with model name from env)
3. **Quota Exceeded**: Returns "AI service quota exceeded"
4. **Timeout**: Returns "AI request timed out"
5. **Generic Errors**: Returns "AI service is temporarily unavailable"

All errors are logged server-side but only user-friendly messages are returned to the frontend.

## Changing Models

To change the AI model, **only update the environment variable**:

```bash
# Change model
export GOOGLE_AI_MODEL=gemini-2.5-flash

# Restart the server
npm run dev
```

No code changes required!

## Troubleshooting

### Model Not Found Error

If you see "Model is not available", check:

1. **Model name is correct**: Verify the model name in your `.env` file
2. **API access**: Ensure your Google AI API key has access to the model
3. **API version**: Some models require specific API versions

### AI Service Not Working

1. Check environment variables are set:
   ```bash
   echo $GOOGLE_AI_API_KEY
   echo $GOOGLE_AI_MODEL
   ```

2. Verify configuration:
   ```bash
   node -e "import('./src/config/ai.config.js').then(m => console.log(m.AI_CONFIG))"
   ```

3. Check logs for detailed error messages

## Migration from Hardcoded Models

If you have old code with hardcoded models:

**Before:**
```javascript
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
```

**After:**
```javascript
import { generateAIContent } from './services/ai/index.js';
const response = await generateAIContent(prompt);
```

## Best Practices

1. **Never hardcode model names** - Always use environment variables
2. **Use the abstraction layer** - Don't call providers directly
3. **Handle errors gracefully** - The abstraction layer does this automatically
4. **Test with different models** - Ensure your prompts work across models
5. **Monitor API usage** - Track quota and costs

## Production Checklist

- [ ] `GOOGLE_AI_API_KEY` is set in production environment
- [ ] `GOOGLE_AI_MODEL` is set to a supported model
- [ ] AI service is tested and working
- [ ] Error handling is verified (try invalid model name)
- [ ] Rate limiting is configured
- [ ] Logging is enabled for AI errors

