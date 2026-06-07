import vm from 'vm';
import { parseInputValue } from '../sanitize.js';

export async function runJavaScript(code, input, timeoutMs = 3000) {
  const parsedInput = parseInputValue(input);
  const logs = [];
  const wrapped = `
    "use strict";
    ${code}
    (function() {
      if (typeof solution === "function") {
        return solution(__INPUT__);
      }
      return undefined;
    })();
  `;

  const context = {
    __INPUT__: parsedInput,
    console: {
      log: (...args) => logs.push(args.map(String).join(' ')),
    },
  };

  const start = Date.now();
  try {
    const script = new vm.Script(wrapped);
    vm.createContext(context);
    const result = script.runInContext(context, { timeout: timeoutMs });
    const stdout = logs.length ? logs.join('\n') : '';
    const output =
      result !== undefined && result !== null
        ? String(result)
        : stdout;
    return {
      output: output.trimEnd(),
      error: null,
      executionTime: Date.now() - start,
    };
  } catch (err) {
    return {
      output: logs.join('\n'),
      error: err.message || 'Runtime error',
      executionTime: Date.now() - start,
    };
  }
}
