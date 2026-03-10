# 🔍 Google AI Authentication Debugging Guide

This guide helps you systematically debug Google AI authentication issues.

## Quick Test

Run the test script to verify your configuration:

```bash
cd backend
node test-google-ai.js
```

This will:
1. ✅ Check if `.env` is loaded correctly
2. ✅ Validate API key format
3. ✅ Test API key authentication
4. ✅ Verify model availability

## Step-by-Step Debugging

### Step 1: Verify .env Loading

When you start the server, you should see:

```
🔍 [DEBUG] Environment Variables Check:
  - GOOGLE_AI_API_KEY: AIzaSyC...xyz12 (39 chars)
  - GOOGLE_AI_MODEL: gemini-2.5-flash
  - GOOGLE_AI_MAX_TOKENS: 2048 (default)
  - GOOGLE_AI_TEMPERATURE: 0.7 (default)
  - AI_ENABLED: true
```

**If the key shows as "NOT SET":**
- Check that `.env` file exists in `backend/` directory
- Verify the file is named exactly `.env` (not `.env.example` or `.env.local`)
- Restart the server after adding the key

### Step 2: Verify API Key in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your API key
4. Ensure:
   - ✅ Key is **Active**
   - ✅ **Generative AI API** is enabled
   - ✅ No IP restrictions (for localhost testing)
   - ✅ Key is not expired or revoked

### Step 3: Test API Key Directly

Run the test script:

```bash
node test-google-ai.js
```

**Expected output:**
```
✅ SUCCESS! API call worked!
  Response: Hello! How can I assist you today?
🎉 Your Google AI configuration is correct!
```

**If you get authentication errors:**
- Check the error message for specific guidance
- Verify the API key is copied correctly (no extra spaces/quotes)
- Ensure Generative AI API is enabled in Google Cloud

### Step 4: Check Server Logs

When making a request, watch for these logs:

**On Request:**
```
[PLACEMENT_AI] Request details: {
  topic: 'how to prepare for DSA interviews',
  model: 'gemini-2.5-flash',
  apiKeyLength: 39,
  apiKeyPrefix: 'AIzaSyCx',
  maxTokens: 2048,
  temperature: 0.7
}
```

**On Success:**
```
[GOOGLE_AI] ✅ Client initialized successfully
[GOOGLE_AI] Sending request to Google AI
[GOOGLE_AI] ✅ Received response from Google AI
[PLACEMENT_AI] Success: { responseLength: 1234 }
```

**On Error:**
```
[GOOGLE_AI] ❌ Generation error: {
  model: 'gemini-2.5-flash',
  errorMessage: 'API key not valid',
  errorCode: 401
}
[GOOGLE_AI] ❌ Authentication failed. Check:
  1. API key is correct in .env file
  2. API key has Generative AI API enabled
  3. API key has no IP restrictions
  4. API key is not expired or revoked
```

### Step 5: Common Issues & Solutions

#### Issue: "API key not configured"
**Solution:**
- Add `GOOGLE_AI_API_KEY=your_key_here` to `backend/.env`
- Restart the server

#### Issue: "Model not found (404)"
**Solution:**
- Try a different model: `gemini-1.5-flash` or `gemini-1.5-pro`
- Update `.env`: `GOOGLE_AI_MODEL=gemini-1.5-flash`

#### Issue: "Authentication failed (401/403)"
**Solution:**
1. Verify API key in Google Cloud Console
2. Enable "Generative AI API" for your project
3. Remove IP restrictions (or add localhost)
4. Generate a new API key if needed

#### Issue: "API key was reported as leaked (403)"
**This is a security issue - Google has disabled your API key.**

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Find your API key and **delete it** (or restrict it)
3. **Create a NEW API key:**
   - Click "Create Credentials" → "API Key"
   - Copy the new key immediately
4. **Enable Generative AI API** for the new key
5. **Update your `.env` file:**
   ```bash
   GOOGLE_AI_API_KEY=your_new_key_here
   ```
6. **Restart your server**
7. **Test with:** `npm run test:google-ai`

**Important:** Never commit API keys to git. Always use `.env` files and add them to `.gitignore`.

#### Issue: "Quota exceeded (429)"
**Solution:**
- Check Google Cloud billing/quota settings
- Wait for quota reset
- Upgrade your plan if needed

### Step 6: Manual API Test

Test the API directly with curl:

```bash
export GOOGLE_AI_API_KEY="your_key_here"

curl -X POST \
  -H "Authorization: Bearer $GOOGLE_AI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Say hello"}]
    }]
  }' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GOOGLE_AI_API_KEY"
```

**Note:** The Google Generative AI SDK uses a different endpoint format. The test script uses the SDK correctly.

## Environment Variables

Required in `backend/.env`:

```bash
# Required
GOOGLE_AI_API_KEY=AIzaSyC...your_key_here

# Optional (defaults shown)
GOOGLE_AI_MODEL=gemini-2.5-flash
GOOGLE_AI_MAX_TOKENS=2048
GOOGLE_AI_TEMPERATURE=0.7
AI_ENABLED=true
```

## Debugging Checklist

- [ ] `.env` file exists in `backend/` directory
- [ ] `GOOGLE_AI_API_KEY` is set in `.env`
- [ ] API key starts with `AIza` and is 39+ characters
- [ ] Server logs show API key is loaded (masked)
- [ ] Generative AI API is enabled in Google Cloud
- [ ] No IP restrictions on API key (or localhost allowed)
- [ ] Model name is correct (try `gemini-1.5-flash` if `gemini-2.5-flash` fails)
- [ ] Test script (`node test-google-ai.js`) succeeds
- [ ] Server restarted after `.env` changes

## Still Having Issues?

1. Run the test script: `node test-google-ai.js`
2. Check server startup logs for environment variable loading
3. Check request logs for detailed error messages
4. Verify API key in Google Cloud Console
5. Try a different model name
6. Check Google Cloud billing/quota status

