import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { initSocket, whenSocketReady } from '../services/socket';
import { createCodingQuestion, mergeSlotQuestions } from '../utils/mockInterviewQuestions';

const THROTTLE_MS = 200;
const JOIN_RETRY_MS = 4000;
const POLL_MS = 1500;

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
  const slotBootstrappedRef = useRef(false);
  const lastPollCodeRef = useRef('');

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
    if (!slot || slotBootstrappedRef.current) return;
    const merged = mergeSlotQuestions(slot);
    if (merged.length === 0) return;

    slotBootstrappedRef.current = true;
    setQuestions(merged);
    const active = slot.activeQuestionId || merged[0]?.id;
    setActiveQuestionId(active);
    const q = merged.find((x) => x.id === active) || merged[0];
    if (!isInterviewer && slot.liveCode) {
      setCode(slot.liveCode);
      setLanguage(slot.liveCodeLanguage || q.language || 'javascript');
      lastPollCodeRef.current = slot.liveCode;
    } else if (!isInterviewer) {
      setCode(q.starterCode || '');
      setLanguage(q.language || 'javascript');
    }
  }, [slot, isInterviewer]);

  useEffect(() => {
    if (!enabled || !slotId) return undefined;

    let cancelled = false;
    const role = isInterviewer ? 'interviewer' : 'student';

    const joinRoom = () => {
      const s = socketRef.current;
      if (!s) return;
      s.emit('mock-code:join', { slotId, role });
    };

    const onState = (payload) => {
      if (payload?.slotId !== slotId || cancelled) return;
      applyState(payload);
      setConnected(true);
    };

    const onCodeUpdate = (payload) => {
      if (payload?.slotId !== slotId || cancelled || !isInterviewer) return;
      isLocalEditRef.current = true;
      if (typeof payload.code === 'string') {
        setCode(payload.code);
        lastPollCodeRef.current = payload.code;
      }
      if (payload.language) setLanguage(payload.language);
      setConnected(true);
      setTimeout(() => {
        isLocalEditRef.current = false;
      }, 0);
    };

    const onConnect = () => joinRoom();

    const setup = async () => {
      initSocket();
      const socket = await whenSocketReady();
      if (!socket || cancelled) return;

      socketRef.current = socket;
      socket.on('mock-code:state', onState);
      socket.on('mock-code:code-update', onCodeUpdate);
      socket.on('connect', onConnect);
      joinRoom();
    };

    setup();

    const joinRetry = setInterval(() => {
      if (!cancelled && socketRef.current?.connected) joinRoom();
    }, JOIN_RETRY_MS);

    return () => {
      cancelled = true;
      clearInterval(joinRetry);
      const s = socketRef.current;
      if (s) {
        s.emit('mock-code:leave', { slotId });
        s.off('mock-code:state', onState);
        s.off('mock-code:code-update', onCodeUpdate);
        s.off('connect', onConnect);
      }
      if (throttleRef.current) clearTimeout(throttleRef.current);
      setConnected(false);
    };
  }, [slotId, isInterviewer, enabled, applyState]);

  useEffect(() => {
    if (!enabled || !slotId || !isInterviewer) return undefined;

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await api.getMockInterviewLiveCode(slotId);
        if (cancelled || typeof data?.liveCode !== 'string') return;
        if (data.liveCode === lastPollCodeRef.current) return;
        lastPollCodeRef.current = data.liveCode;
        isLocalEditRef.current = true;
        setCode(data.liveCode);
        if (data.liveCodeLanguage) setLanguage(data.liveCodeLanguage);
        if (data.activeQuestionId) setActiveQuestionId(data.activeQuestionId);
        setConnected(true);
        setTimeout(() => {
          isLocalEditRef.current = false;
        }, 0);
      } catch {
        /* ignore transient poll errors */
      }
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, slotId, isInterviewer]);

  const emitCodeUpdate = useCallback(
    (nextCode, nextLang) => {
      if (isInterviewer) return;
      if (throttleRef.current) clearTimeout(throttleRef.current);
      throttleRef.current = setTimeout(() => {
        const s = socketRef.current;
        const lang = nextLang || language;
        if (s?.connected) {
          s.emit('mock-code:code-update', {
            slotId,
            code: nextCode,
            language: lang,
          });
        } else {
          api.patchMockInterviewLiveCode(slotId, { code: nextCode, language: lang }).catch(() => {});
        }
      }, THROTTLE_MS);
    },
    [slotId, language, isInterviewer]
  );

  const handleCodeChange = useCallback(
    (value) => {
      if (isInterviewer) return;
      setCode(value);
      emitCodeUpdate(value, language);
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
