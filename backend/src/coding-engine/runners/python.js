import { spawn } from 'child_process';
import { writeFile, unlink, mkdtemp } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { parseInputValue } from '../sanitize.js';

function runProcess(cmd, args, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(cmd, args, { timeout: timeoutMs });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      resolve({
        output: '',
        error: err.code === 'ENOENT' ? `${cmd} is not installed on the server` : err.message,
        executionTime: Date.now() - start,
      });
    });
    child.on('close', (code) => {
      resolve({
        output: stdout.trimEnd(),
        error: code !== 0 ? (stderr.trim() || `Process exited with code ${code}`) : null,
        executionTime: Date.now() - start,
      });
    });
  });
}

export async function runPython(code, input, timeoutMs = 3000) {
  const parsedInput = parseInputValue(input);
  const inputJson = JSON.stringify(parsedInput);
  const script = `
import json
INPUT = json.loads(${JSON.stringify(inputJson)})
${code}
if "solution" in dir() and callable(solution):
    result = solution(INPUT)
    if result is not None:
        print(result)
`;
  let dir;
  let filePath;
  try {
    dir = await mkdtemp(join(tmpdir(), 'portal-py-'));
    filePath = join(dir, 'main.py');
    await writeFile(filePath, script, 'utf8');
    return await runProcess('python3', [filePath], timeoutMs);
  } finally {
    if (filePath) {
      try { await unlink(filePath); } catch { /* ignore */ }
    }
  }
}
