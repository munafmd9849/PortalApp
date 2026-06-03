import {
  parseCodingQuestions,
  defaultStarterCode,
} from './mockInterviewCoding.js';

/** @type {Map<string, { code: string, language: string, activeQuestionId: string|null, questions: object[] }>} */
const sessions = new Map();

function pickStarter(questions, questionId) {
  const q = questions.find((x) => x.id === questionId) || questions[0];
  return {
    code: q?.starterCode || defaultStarterCode(q?.language || 'javascript'),
    language: q?.language || 'javascript',
    activeQuestionId: q?.id || null,
  };
}

export function getMockCodeSession(slotId) {
  return sessions.get(slotId) || null;
}

export function initMockCodeSession(slotId, { driveQuestions = [], extraQuestions = [], liveCode, liveCodeLanguage, activeQuestionId } = {}) {
  const questions = [...parseCodingQuestions(driveQuestions), ...parseCodingQuestions(extraQuestions)];
  let code = liveCode;
  let language = liveCodeLanguage || 'javascript';
  let activeId = activeQuestionId || null;

  if (!code) {
    const picked = pickStarter(questions, activeId);
    code = picked.code;
    language = picked.language;
    activeId = picked.activeQuestionId;
  }

  const session = {
    code: code || defaultStarterCode(language),
    language: language || 'javascript',
    activeQuestionId: activeId,
    questions,
  };
  sessions.set(slotId, session);
  return session;
}

export function ensureMockCodeSession(slotId, initPayload) {
  if (!sessions.has(slotId)) {
    return initMockCodeSession(slotId, initPayload);
  }
  const existing = sessions.get(slotId);
  const incoming = [...parseCodingQuestions(initPayload?.driveQuestions), ...parseCodingQuestions(initPayload?.extraQuestions)];
  for (const q of incoming) {
    if (!existing.questions.some((x) => x.id === q.id)) {
      existing.questions.push(q);
    }
  }
  return existing;
}

export function snapshotMockCodeSession(slotId) {
  const s = sessions.get(slotId);
  if (!s) return null;
  return {
    code: s.code,
    language: s.language,
    activeQuestionId: s.activeQuestionId,
    questions: s.questions,
  };
}

export function updateStudentCode(slotId, code, language) {
  const s = sessions.get(slotId);
  if (!s) return null;
  if (typeof code === 'string') s.code = code.slice(0, 120000);
  if (language) s.language = language;
  return snapshotMockCodeSession(slotId);
}

export function setActiveQuestion(slotId, questionId) {
  const s = sessions.get(slotId);
  if (!s) return null;
  const picked = pickStarter(s.questions, questionId);
  s.activeQuestionId = picked.activeQuestionId;
  s.code = picked.code;
  s.language = picked.language;
  return snapshotMockCodeSession(slotId);
}

export function addLiveQuestion(slotId, question) {
  const s = sessions.get(slotId);
  if (!s || !question?.id) return null;
  if (!s.questions.some((q) => q.id === question.id)) {
    s.questions.push(question);
  }
  return snapshotMockCodeSession(slotId);
}

export function clearMockCodeSession(slotId) {
  sessions.delete(slotId);
}
