/**
 * Professional recruiter-style voice for Guided AI Interviews.
 * Selects the best available English female voice and keeps it for the session.
 */

const BASE_RATE = 0.95;
const BASE_PITCH = 1.0;
const BASE_VOLUME = 1.0;

const PRIORITY_MATCHERS = [
  (name) => /microsoft\s+jenny/i.test(name),
  (name) => /microsoft\s+aria/i.test(name),
  (name) => /google\s+uk\s+english\s+female/i.test(name),
  (name) => /samantha/i.test(name),
];

const FEMALE_NAME_HINTS =
  /\b(female|zira|jenny|aria|samantha|karen|moira|tessa|fiona|veena|susan|victoria|serena|kate|salli|joanna|ivy|kimberly|nicole|penelope|raveena|aditi|amy|emma|linda|heather|hazel|leslie|sarah|allison|ava|sonia|laura|hannah|olivia|natasha|neural)\b/i;

const AVOID_VOICE =
  /compact|espeak|fred|ralph|bad news|cellos|trinoids|whisper|wobble|bah|bells|boing|bubbles|deranged|good news|juniors|organs|superstar|zarvox|albert|bruce|junior|grandma|grandpa|pipe|good|bells/i;

export const AI_INTERVIEWER_SCRIPTS = {
  welcome:
    'Welcome to your AI Mock Interview. Please ensure your camera and microphone remain active throughout the session. Let\'s begin.',
  completion:
    'Thank you for completing your AI Mock Interview. Your responses have been recorded successfully. You may now return to your dashboard.',
};

function normalizeName(voice) {
  return String(voice?.name || '').trim();
}

function isEnglish(voice) {
  return /^en([-_]|$)/i.test(voice?.lang || '');
}

function isEnglishFemale(voice) {
  if (!isEnglish(voice)) return false;
  const name = normalizeName(voice).toLowerCase();
  if (name.includes('female')) return true;
  if (FEMALE_NAME_HINTS.test(name)) return true;
  return false;
}

function isAvoidedVoice(voice) {
  const name = normalizeName(voice).toLowerCase();
  return AVOID_VOICE.test(name);
}

/**
 * @param {SpeechSynthesisVoice[]} voices
 * @returns {SpeechSynthesisVoice | null}
 */
export function selectBestInterviewerVoice(voices) {
  const pool = (voices || []).filter((v) => v && !isAvoidedVoice(v));

  for (const match of PRIORITY_MATCHERS) {
    const hit = pool.find((v) => match(normalizeName(v)));
    if (hit) return hit;
  }

  const female = pool.find((v) => isEnglishFemale(v));
  if (female) return female;

  const english = pool.find((v) => isEnglish(v));
  if (english) return english;

  return pool[0] || voices?.[0] || null;
}

/**
 * Wait until the browser exposes speech synthesis voices (Chrome loads async).
 */
export function waitForSpeechVoices(timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    const synth = window.speechSynthesis;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      synth.removeEventListener('voiceschanged', onVoicesChanged);
      resolve(synth.getVoices());
    };

    const onVoicesChanged = () => {
      if (synth.getVoices().length > 0) finish();
    };

    if (synth.getVoices().length > 0) {
      finish();
      return;
    }

    synth.addEventListener('voiceschanged', onVoicesChanged);
    synth.getVoices();

    setTimeout(finish, timeoutMs);
  });
}

class AIInterviewerVoiceService {
  constructor() {
    this.selectedVoice = null;
    this.ready = false;
    this.speaking = false;
    this._initPromise = null;
    this._utterance = null;
    this._onSpeakingChange = null;
  }

  get isSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  get voiceName() {
    return this.selectedVoice?.name || null;
  }

  setSpeakingListener(fn) {
    this._onSpeakingChange = fn;
  }

  _setSpeaking(value) {
    this.speaking = value;
    this._onSpeakingChange?.(value);
  }

  /**
   * Load voices and lock the session voice for consistency.
   */
  async initialize() {
    if (!this.isSupported) return null;
    if (this.ready && this.selectedVoice) return this.selectedVoice;
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      const voices = await waitForSpeechVoices();
      this.selectedVoice = selectBestInterviewerVoice(voices);
      this.ready = true;
      return this.selectedVoice;
    })();

    return this._initPromise;
  }

  resetSession() {
    this.stop();
    this.selectedVoice = null;
    this.ready = false;
    this._initPromise = null;
  }

  stop() {
    if (!this.isSupported) return;
    window.speechSynthesis.cancel();
    this._utterance = null;
    this._setSpeaking(false);
  }

  /**
   * @param {string} text
   * @param {{ rateMultiplier?: number }} [options] — optional slight speed tweak (0.88–1.05)
   */
  async speak(text, options = {}) {
    if (!this.isSupported || !text?.trim()) return;

    await this.initialize();
    this.stop();

    const rateMultiplier = Number(options.rateMultiplier) || 1;
    const rate = Math.min(1.08, Math.max(0.88, BASE_RATE * rateMultiplier));

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.rate = rate;
      utterance.pitch = BASE_PITCH;
      utterance.volume = BASE_VOLUME;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
        utterance.lang = this.selectedVoice.lang || 'en-US';
      } else {
        utterance.lang = 'en-US';
      }

      utterance.onend = () => {
        this._setSpeaking(false);
        this._utterance = null;
        resolve();
      };

      utterance.onerror = () => {
        this._setSpeaking(false);
        this._utterance = null;
        resolve();
      };

      this._utterance = utterance;
      this._setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    });
  }

  async speakWelcome(rateMultiplier) {
    return this.speak(AI_INTERVIEWER_SCRIPTS.welcome, { rateMultiplier });
  }

  async speakCompletion(rateMultiplier) {
    return this.speak(AI_INTERVIEWER_SCRIPTS.completion, { rateMultiplier });
  }

  async speakInstructions(instructions, rateMultiplier) {
    if (!instructions?.trim()) return;
    const trimmed = instructions.trim().slice(0, 600);
    return this.speak(trimmed, { rateMultiplier });
  }
}

export const aiInterviewerVoice = new AIInterviewerVoiceService();

export default AIInterviewerVoiceService;
