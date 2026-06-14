import { spawn } from 'child_process';
import { writeFile, mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { sanitizeInput } from '../sanitize.js';

function exec(cmd, args, cwd, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(cmd, args, { cwd, timeout: timeoutMs });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      resolve({ ok: false, stdout: '', stderr: err.code === 'ENOENT' ? `${cmd} not installed` : err.message, ms: Date.now() - start });
    });
    child.on('close', (code) => {
      resolve({ ok: code === 0, stdout: stdout.trimEnd(), stderr: stderr.trim(), ms: Date.now() - start });
    });
  });
}

export async function runCpp(code, input, timeoutMs = 5000) {
  const stdin = sanitizeInput(input);
  const hasMain = /\bint\s+main\s*\(/.test(code);
  const source = hasMain
    ? code
    : `#include <iostream>
#include <string>
using namespace std;
${code}
int main() {
  // Provide solution() if defined
  return 0;
}`;

  let dir;
  try {
    dir = await mkdtemp(join(tmpdir(), 'portal-cpp-'));
    const src = join(dir, 'main.cpp');
    const out = join(dir, 'main');
    await writeFile(src, source, 'utf8');
    const compile = await exec('g++', ['-std=c++17', '-O0', src, '-o', out], dir, timeoutMs);
    if (!compile.ok) {
      return { output: '', error: compile.stderr || 'Compilation failed', executionTime: compile.ms };
    }
    const run = await new Promise((resolve) => {
      const start = Date.now();
      const child = spawn(out, [], { cwd: dir, timeout: timeoutMs });
      let stdout = '';
      let stderr = '';
      if (stdin) child.stdin.write(stdin);
      child.stdin.end();
      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      child.on('error', (err) => {
        resolve({ output: '', error: err.message, executionTime: Date.now() - start });
      });
      child.on('close', (code) => {
        resolve({
          output: stdout.trimEnd(),
          error: code !== 0 ? stderr || `Exit code ${code}` : null,
          executionTime: Date.now() - start,
        });
      });
    });
    return run;
  } finally {
    if (dir) {
      try { await rm(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
}
