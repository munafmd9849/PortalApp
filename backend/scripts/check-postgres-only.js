/**
 * Enforce PostgreSQL-only codebase.
 *
 * This script fails the build if a file-based DB or common SQLite packages/configs
 * are reintroduced anywhere in the repo.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.cache',
  '.turbo',
  '.cursor',
  '.vscode',
  'coverage',
]);

const SKIP_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.pdf', '.zip', '.gz', '.tgz', '.rar',
  '.mp4', '.mov', '.avi', '.mkv',
  '.ico',
]);

const BAD_FILE_EXT_RE = /\.(db|sqlite|sqlite3)$/i;

// NOTE: Keep these patterns narrowly targeted to avoid false positives
// (e.g., "file:" appears in many unrelated contexts like file paths).
const BAD_CONTENT_RES = [
  /"sqlite3"\s*:/i,
  /"better-sqlite3"\s*:/i,
  /\bfrom\s+["']sqlite3["']/i,
  /\bfrom\s+["']better-sqlite3["']/i,
  /\bprovider\s*=\s*["']sqlite["']/i,
  /\bDATABASE_URL\b[^\n]*\bsqlite\b/i,
  /\bDATABASE_URL\b[^\n]*\bfile:/i,
];

function isSkippableDirName(name) {
  return SKIP_DIRS.has(name);
}

function isSkippableFile(filePath) {
  const base = path.basename(filePath);
  // Don't scan local env files (can contain secrets and vary per machine).
  if (base === '.env' || base.startsWith('.env.')) return true;
  // Avoid self-matching on enforcement patterns
  if (base === 'check-postgres-only.js') return true;

  const ext = path.extname(filePath).toLowerCase();
  if (SKIP_EXTS.has(ext)) return true;
  return false;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (isSkippableDirName(entry.name)) continue;
      walk(full, files);
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function findBadFilesByExtension(allFiles) {
  return allFiles.filter(f => BAD_FILE_EXT_RE.test(f));
}

function scanFileContents(filePath) {
  if (isSkippableFile(filePath)) return [];

  const stat = fs.statSync(filePath);
  // Skip very large files (likely binary) to keep this fast.
  if (stat.size > 5 * 1024 * 1024) return [];

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const hits = [];
  for (const re of BAD_CONTENT_RES) {
    if (re.test(content)) {
      hits.push(re);
    }
  }
  return hits;
}

function toRelative(p) {
  return path.relative(repoRoot, p);
}

function main() {
  const allFiles = walk(repoRoot);

  const badByExt = findBadFilesByExtension(allFiles);
  const badByContent = [];

  for (const f of allFiles) {
    const hits = scanFileContents(f);
    if (hits.length > 0) {
      badByContent.push({ file: f, hits: hits.map(h => String(h)) });
    }
  }

  const offenders = {
    badFiles: badByExt.map(toRelative),
    badContent: badByContent.map(o => ({ file: toRelative(o.file), hits: o.hits })),
  };

  if (offenders.badFiles.length || offenders.badContent.length) {
    // eslint-disable-next-line no-console
    console.error('❌ Forbidden database artifacts found (PostgreSQL-only repo):');
    if (offenders.badFiles.length) {
      // eslint-disable-next-line no-console
      console.error('  - Files with forbidden DB extensions:', offenders.badFiles);
    }
    if (offenders.badContent.length) {
      // eslint-disable-next-line no-console
      console.error('  - Files containing forbidden keywords:');
      for (const o of offenders.badContent) {
        // eslint-disable-next-line no-console
        console.error(`    * ${o.file} -> ${o.hits.join(', ')}`);
      }
    }
    process.exit(1);
  }
}

main();

