import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Browser Speech Synthesis for AI interviewer voice.
 */
export function useInterviewSpeech({ rate = 1, pitch = 1, lang = 'en-IN' } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const utterRef = useRef(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  const pickVoice = useCallback(() => {
    const voices = window.speechSynthesis?.getVoices() || [];
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))
    );
    return preferred || voices.find((v) => v.lang.startsWith('en')) || voices[0];
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text) => {
      if (!supported || !text?.trim()) return Promise.resolve();
      stop();
      return new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(text.trim());
        u.rate = rate;
        u.pitch = pitch;
        u.lang = lang;
        const voice = pickVoice();
        if (voice) u.voice = voice;
        u.onend = () => {
          setSpeaking(false);
          resolve();
        };
        u.onerror = () => {
          setSpeaking(false);
          resolve();
        };
        utterRef.current = u;
        setSpeaking(true);
        window.speechSynthesis.speak(u);
      });
    },
    [supported, rate, pitch, lang, pickVoice, stop]
  );

  useEffect(() => {
    const loadVoices = () => pickVoice();
    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
      stop();
    };
  }, [pickVoice, stop]);

  return { speak, stop, speaking, supported, setRate: () => {} };
}
