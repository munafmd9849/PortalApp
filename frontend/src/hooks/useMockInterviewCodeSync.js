import { useCallback, useEffect, useRef, useState } from 'react';
import { initSocket } from '../services/socket';
import { createCodingQuestion, mergeSlotQuestions } from '../utils/mockInterviewQuestions';

const THROTTLE_MS = 200;

/**
 * Live coding sync for mock interview rooms.
 * Student writes; interviewer receives read-only updates.
 */
export function useMockInterviewCodeSync({ slotId, slot, isInterviewer, enabled }) {
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [questions, setQuestions] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const throttleRef = useRef(null);
  const socketRef = useRef(null);
  const isLocalEditRef = useRef(false);

  const applyState = useCallback((state) => {
    if (!state) return;
    isLocalEditRef.current = true;
    if (typeof state.code === 'string') setCode(state.code);
    if (state.language) setLanguage(state.language);
    if (Array.isArray(state.questions)) setQuestions(state.questions);
    if (state.activeQuestionId !== undefined) setActiveQuestionId(state.activeQuestionId);
    setTimeout(() => {
      isLocalEditRef.current = false;
    }, 0);
  }, []);

  useEffect(() => {
    if (!enabled || !slotId || !slot) return undefined;

    const merged = mergeSlotQuestions(slot);
    if (merged.length > 0) {
      setQuestions(merged);
      const active = slot.activeQuestionId || merged[0]?.id;
      setActiveQuestionId(active);
      const q = merged.find((x) => x.id === active) || merged[0];
      if (!isInterviewer && slot.liveCode) {
        setCode(slot.liveCode);
        setLanguage(slot.liveCodeLanguage || q.language || 'javascript');
      } else if (!isInterviewer) {
        setCode(q.starterCode || '');
        setLanguage(q.language || 'javascript');
      }
    }

    const socket = initSocket();
    if (!socket) return undefined;
    socketRef.current = socket;

    const role = isInterviewer ? 'interviewer' : 'student';
    socket.emit('mock-code:join', { slotId, role });

    const onState = (payload) => {
      if (payload?.slotId !== slotId) return;
      applyState(payload);
      setConnected(true);
    };

    const onCodeUpdate = (payload) => {
      if (payload?.slotId !== slotId) return;
      if (!isInterviewer) return;
      isLocalEditRef.current = true;
      if (typeof payload.code === 'string') setCode(payload.code);
      if (payload.language) setLanguage(payload.language);
      setTimeout(() => {
        isLocalEditRef.current = false;
      }, 0);
    };

    const onConnect = () => {
      socket.emit('mock-code:join', { slotId, role });
    };

    socket.on('mock-code:state', onState);
    socket.on('mock-code:code-update', onCodeUpdate);
    socket.on('connect', onConnect);

    return () => {
      socket.emit('mock-code:leave', { slotId });
      socket.off('mock-code:state', onState);
      socket.off('mock-code:code-update', onCodeUpdate);
      socket.off('connect', onConnect);
      if (throttleRef.current) clearTimeout(throttleRef.current);
    };
  }, [slotId, slot, isInterviewer, enabled, applyState]);

  const emitCodeUpdate = useCallback(
    (nextCode, nextLang) => {
      const s = socketRef.current;
      if (!s?.connected || isInterviewer) return;
      if (throttleRef.current) clearTimeout(throttleRef.current);
      throttleRef.current = setTimeout(() => {
        s.emit('mock-code:code-update', {
          slotId,
          code: nextCode,
          language: nextLang || language,
        });
      }, THROTTLE_MS);
    },
    [slotId, language, isInterviewer]
  );

  const handleCodeChange = useCallback(
    (value) => {
      if (isInterviewer) return;
      setCode(value);
      if (!isLocalEditRef.current) emitCodeUpdate(value, language);
      else emitCodeUpdate(value, language);
    },
    [isInterviewer, emitCodeUpdate, language]
  );

  const handleLanguageChange = useCallback(
    (lang) => {
      if (isInterviewer) return;
      setLanguage(lang);
      emitCodeUpdate(code, lang);
    },
    [isInterviewer, code, emitCodeUpdate]
  );

  const pushQuestionToCandidate = useCallback(
    (questionId) => {
      const s = socketRef.current;
      if (!s?.connected || !isInterviewer) return;
      s.emit('mock-code:set-question', { slotId, questionId });
    },
    [slotId, isInterviewer]
  );

  const addLiveQuestion = useCallback(
    (question) => {
      const s = socketRef.current;
      if (!s?.connected || !isInterviewer) return;
      const q = question?.id ? question : createCodingQuestion(question);
      s.emit('mock-code:add-question', { slotId, question: q });
      setQuestions((prev) => (prev.some((x) => x.id === q.id) ? prev : [...prev, q]));
    },
    [slotId, isInterviewer]
  );

  const activeQuestion = questions.find((q) => q.id === activeQuestionId) || questions[0] || null;

  return {
    connected,
    code,
    language,
    questions,
    activeQuestion,
    activeQuestionId,
    setActiveQuestionId,
    handleCodeChange,
    handleLanguageChange,
    pushQuestionToCandidate,
    addLiveQuestion,
    readOnly: isInterviewer,
  };
}
