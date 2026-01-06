/**
 * Test Script for Google AI API
 * Run this to verify your API key and model configuration
 * 
 * Usage: node test-google-ai.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: join(__dirname, '.env') });

console.log('🧪 Testing Google AI Configuration\n');
console.log('=' .repeat(50));

// Step 1: Check .env loading
console.log('\n📋 Step 1: Environment Variables');
const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const model = process.env.GOOGLE_AI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';

console.log('  - API Key:', apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)` : '❌ NOT SET');
console.log('  - Model:', model);
console.log('  - Max Tokens:', process.env.GOOGLE_AI_MAX_TOKENS || '2048 (default)');
console.log('  - Temperature:', process.env.GOOGLE_AI_TEMPERATURE || '0.7 (default)');

if (!apiKey) {
  console.error('\n❌ ERROR: API key not found!');
  console.error('   Set GOOGLE_AI_API_KEY in your .env file');
  process.exit(1);
}

if (apiKey.trim() === '') {
  console.error('\n❌ ERROR: API key is empty!');
  process.exit(1);
}

// Step 2: Validate API key format
console.log('\n🔍 Step 2: API Key Format Validation');
if (apiKey.startsWith('AIza') && apiKey.length >= 39) {
  console.log('  ✅ API key format looks correct');
} else {
  console.warn('  ⚠️  API key format looks unusual');
  console.warn('     Google AI keys usually start with "AIza" and are 39+ characters');
}

// Step 3: Initialize client
console.log('\n🚀 Step 3: Initializing Google AI Client');
let genAI;
try {
  genAI = new GoogleGenerativeAI(apiKey);
  console.log('  ✅ Client initialized successfully');
} catch (error) {
  console.error('  ❌ Failed to initialize client:', error.message);
  process.exit(1);
}

// Step 4: Test API call
console.log('\n📡 Step 4: Testing API Call');
console.log(`  Model: ${model}`);
console.log('  Prompt: "Say hello in one sentence"');

try {
  const modelInstance = genAI.getGenerativeModel({
    model: model,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 100,
    },
  });

  const result = await modelInstance.generateContent('Say hello in one sentence');
  const response = await result.response;
  const text = response.text();

  console.log('\n✅ SUCCESS! API call worked!');
  console.log(`  Response: ${text}`);
  console.log('\n🎉 Your Google AI configuration is correct!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ API call failed!');
  console.error('  Error:', error.message);
  
  if (error.message.includes('not found') || error.message.includes('404')) {
    console.error('\n💡 Solution: Model not found. Try:');
    console.error('   - gemini-1.5-flash');
    console.error('   - gemini-1.5-pro');
    console.error('   - gemini-2.0-flash');
  } else if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('403')) {
    console.error('\n💡 Solution: Authentication failed. Check:');
    console.error('   1. API key is correct in .env file');
    console.error('   2. API key has Generative AI API enabled in Google Cloud Console');
    console.error('   3. API key has no IP restrictions (for localhost testing)');
    console.error('   4. API key is not expired or revoked');
  } else if (error.message.includes('quota') || error.message.includes('429')) {
    console.error('\n💡 Solution: Quota exceeded. Check your Google Cloud billing/quota settings');
  } else {
    console.error('\n💡 Full error details:', error);
  }
  
  process.exit(1);
}

