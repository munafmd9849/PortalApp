#!/usr/bin/env node
/**
 * Simple automated test for the new search experience.
 * 1. Calls the backend /api/search endpoint with "DSA basics"
 * 2. Verifies that a summary and at least one result are returned
 * 3. Scans the frontend codebase to ensure no Google CSE embeds remain
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const FRONTEND_SRC = path.join(ROOT, 'frontend', 'src');
const DEFAULT_ENDPOINT = 'http://localhost:3001/api/search?q=DSA%20basics';

async function fetchSearchResults() {
  const endpoint = process.env.TEST_SEARCH_URL || DEFAULT_ENDPOINT;
  const response = await fetch(endpoint, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Search API failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function scanForGoogleEmbeds() {
  const bannedSnippets = ['cse.google.com', 'gcse-search', 'google.search.cse'];
  const queue = [FRONTEND_SRC];

  while (queue.length) {
    const current = queue.pop();
    const stat = fs.statSync(current);

    if (stat.isDirectory()) {
      const entries = fs.readdirSync(current);
      entries.forEach((entry) => {
        if (entry === 'node_modules' || entry.startsWith('.')) return;
        queue.push(path.join(current, entry));
      });
    } else if (stat.isFile()) {
      const content = fs.readFileSync(current, 'utf-8');
      if (bannedSnippets.some((snippet) => content.includes(snippet))) {
        throw new Error(`Found forbidden Google CSE reference in ${path.relative(ROOT, current)}`);
      }
    }
  }
}

async function run() {
  try {
    console.log('🔍 Running search test for "DSA basics"...');
    const data = await fetchSearchResults();

    if (!data.summary || typeof data.summary !== 'string') {
      throw new Error('Summary missing in API response');
    }

    if (!Array.isArray(data.results) || data.results.length === 0) {
      throw new Error('No results returned by search API');
    }

    if (!data.results.every((item) => item.title && item.url)) {
      throw new Error('Search results missing title or url fields');
    }

    console.log('✅ API response looks good. Verifying frontend code...');
    scanForGoogleEmbeds();
    console.log('✅ No Google CSE references detected.');
    console.log('🎉 Search system sanity check passed.');
  } catch (error) {
    console.error('❌ Search system test failed:', error.message);
    process.exit(1);
  }
}

run();

