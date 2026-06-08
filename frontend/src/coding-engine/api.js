import api from '../services/api';

export async function runCode({ language, code, input }) {
  return api.runCode({ language, code, input });
}

export async function evaluateCode({ language, code, testCases }) {
  return api.evaluateCode({ language, code, testCases });
}
