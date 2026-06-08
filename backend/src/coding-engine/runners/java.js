import { spawn } from 'child_process';
import { writeFile, mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

function exec(cmd, args, cwd, timeoutMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(cmd, args, { cwd, timeout: timeoutMs });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      resolve({
        ok: false,
        stdout: '',
        stderr: err.code === 'ENOENT' ? `${cmd} is not installed on the server` : err.message,
        ms: Date.now() - start,
      });
    });
    child.on('close', (code) => {
      resolve({
        ok: code === 0,
        stdout: stdout.trimEnd(),
        stderr: stderr.trim(),
        ms: Date.now() - start,
      });
    });
  });
}

function splitImportsAndBody(code) {
  const lines = String(code || '').split('\n');
  const imports = [];
  const body = [];
  let pastImports = false;

  for (const line of lines) {
    const t = line.trim();
    if (!pastImports && (t.startsWith('import ') || t.startsWith('package '))) {
      imports.push(line);
      continue;
    }
    if (!pastImports && t === '' && body.length === 0 && imports.length > 0) {
      continue;
    }
    pastImports = true;
    body.push(line);
  }

  return { imports, body: body.join('\n').trim() };
}

/** Injected main: finds static solution(?) and invokes with coerced input (any primitive/Object). */
function runnerMainBlock(rawInputLiteral) {
  return `
  public static void main(String[] args) throws Exception {
    runWithInput(${rawInputLiteral});
  }

  static void runWithInput(String rawInput) throws Exception {
    java.lang.reflect.Method target = null;
    for (java.lang.reflect.Method m : Main.class.getDeclaredMethods()) {
      if (!"solution".equals(m.getName()) || m.getParameterCount() != 1) continue;
      if (!java.lang.reflect.Modifier.isStatic(m.getModifiers())) continue;
      target = m;
      break;
    }
    if (target == null) {
      System.err.println("Add a static method: public static Object solution(Object input) { ... }");
      System.exit(1);
    }
    Object arg = coerceArg(target.getParameterTypes()[0], rawInput);
    Object result = target.invoke(null, arg);
    if (result != null) System.out.print(String.valueOf(result));
  }

  static Object coerceArg(Class<?> type, String raw) {
    if (type == String.class) return raw;
    if (type == int.class || type == Integer.class) return Integer.parseInt(raw.trim());
    if (type == long.class || type == Long.class) return Long.parseLong(raw.trim());
    if (type == double.class || type == Double.class) return Double.parseDouble(raw.trim());
    if (type == float.class || type == Float.class) return Float.parseFloat(raw.trim());
    if (type == boolean.class || type == Boolean.class) return Boolean.parseBoolean(raw.trim());
    return raw;
  }`;
}

function buildJavaSource(code, rawInputLiteral) {
  const { imports, body } = splitImportsAndBody(code);
  const importBlock = imports.length ? `${imports.join('\n')}\n\n` : '';
  const mainBlock = runnerMainBlock(rawInputLiteral);

  if (/^\s*(?:public\s+)?class\s+Main\b/m.test(body)) {
    if (/\bpublic\s+static\s+void\s+main\s*\(/m.test(body)) {
      return `${importBlock}${body}`;
    }
    const lastBrace = body.lastIndexOf('}');
    if (lastBrace === -1) {
      return `${importBlock}${body}\n${mainBlock}\n}`;
    }
    return `${importBlock}${body.slice(0, lastBrace)}${mainBlock}\n${body.slice(lastBrace)}`;
  }

  return `${importBlock}public class Main {
${body}
${mainBlock}
}`;
}

export async function runJava(code, input, timeoutMs = 5000) {
  const rawLiteral =
    typeof input === 'string' ? JSON.stringify(input) : JSON.stringify(String(input ?? ''));
  const source = buildJavaSource(code, rawLiteral);

  let dir;
  try {
    dir = await mkdtemp(join(tmpdir(), 'portal-java-'));
    const src = join(dir, 'Main.java');
    await writeFile(src, source, 'utf8');
    const compile = await exec('javac', [src], dir, timeoutMs);
    if (!compile.ok) {
      return { output: '', error: compile.stderr || 'Compilation failed', executionTime: compile.ms };
    }
    const run = await exec('java', ['-cp', dir, 'Main'], dir, timeoutMs);
    return {
      output: run.stdout,
      error: run.ok ? null : run.stderr || 'Runtime error',
      executionTime: run.ms,
    };
  } finally {
    if (dir) {
      try { await rm(dir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
}
