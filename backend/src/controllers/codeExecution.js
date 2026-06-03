import { runCode, evaluateTestCases } from '../coding-engine/index.js';
import { sanitizeCode, sanitizeInput } from '../coding-engine/sanitize.js';

const runBuckets = new Map();

function rateLimitKey(userId) {
  const now = Date.now();
  const windowMs = 10_000;
  const maxRuns = 8;
  let bucket = runBuckets.get(userId);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
    runBuckets.set(userId, bucket);
  }
  bucket.count += 1;
  if (bucket.count > maxRuns) {
    return false;
  }
  return true;
}

export async function runCodeHandler(req, res) {
  try {
    if (!rateLimitKey(req.user?.id || req.ip)) {
      return res.status(429).json({ error: 'Too many run requests. Please wait.' });
    }

    const { language, code, input } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code is required' });

    sanitizeCode(code);
    sanitizeInput(input);

    const result = await runCode({ language, code, input });
    res.json(result);
  } catch (err) {
    res.status(400).json({ output: '', error: err.message || 'Execution failed', executionTime: 0 });
  }
}

export async function evaluateCodeHandler(req, res) {
  try {
    if (!rateLimitKey(req.user?.id || req.ip)) {
      return res.status(429).json({ error: 'Too many evaluation requests. Please wait.' });
    }

    const { language, code, testCases } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code is required' });

    sanitizeCode(code);

    const evaluation = await evaluateTestCases({ language, code, testCases });
    res.json(evaluation);
  } catch (err) {
    res.status(400).json({
      passed: 0,
      total: 0,
      score: 0,
      results: [],
      error: err.message || 'Evaluation failed',
    });
  }
}
