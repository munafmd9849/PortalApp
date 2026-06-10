import { useCallback, useEffect, useRef, useState } from 'react';
import { aiInterviewerVoice } from '../services/AIInterviewerVoiceService';

/**
 * React hook wrapping AIInterviewerVoiceService for Guided AI Interviews.
 */
export function useInterviewSpeech({ rateMultiplier = 1 } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voiceName, setVoiceName] = useState(null);
  const rateRef = useRef(rateMultiplier);

  rateRef.current = rateMultiplier;

  useEffect(() => {
    setSupported(aiInterviewerVoice.isSupported);
    aiInterviewerVoice.setSpeakingListener(setSpeaking);

    let cancelled = false;
    aiInterviewerVoice.initialize().then((voice) => {
      if (!cancelled && voice) setVoiceName(voice.name);
    });

    return () => {
      cancelled = true;
      aiInterviewerVoice.setSpeakingListener(null);
      aiInterviewerVoice.stop();
    };
  }, []);

  const stop = useCallback(() => {
    aiInterviewerVoice.stop();
  }, []);

  const speak = useCallback((text) => {
    return aiInterviewerVoice.speak(text, { rateMultiplier: rateRef.current });
  }, []);

  const speakWelcome = useCallback(() => {
    return aiInterviewerVoice.speakWelcome(rateRef.current);
  }, []);

  const speakCompletion = useCallback(() => {
    return aiInterviewerVoice.speakCompletion(rateRef.current);
  }, []);

  const speakInstructions = useCallback((instructions) => {
    return aiInterviewerVoice.speakInstructions(instructions, rateRef.current);
  }, []);

  return {
    speak,
    speakWelcome,
    speakCompletion,
    speakInstructions,
    stop,
    speaking,
    supported,
    voiceName,
  };
}
