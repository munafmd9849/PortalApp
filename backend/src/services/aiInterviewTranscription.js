import { Blob } from 'node:buffer';

const TRANSCRIBE_URL = 'https://api.mistral.ai/v1/audio/transcriptions';
const DEFAULT_MODEL = process.env.MISTRAL_TRANSCRIBE_MODEL || 'voxtral-mini-latest';
const MAX_ATTEMPTS = 3;

function recordingFilename(mimeType = 'video/webm') {
  if (mimeType.includes('mp4')) return 'answer.mp4';
  if (mimeType.includes('wav')) return 'answer.wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'answer.mp3';
  return 'answer.webm';
}

/**
 * Transcribe a recorded interview answer via Mistral Voxtral.
 * Returns { transcript, status, error } where status is COMPLETED | FAILED | SKIPPED.
 */
export async function transcribeInterviewRecording(buffer, mimeType = 'video/webm') {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return { transcript: null, status: 'SKIPPED', error: 'MISTRAL_API_KEY not configured' };
  }
  if (!buffer?.length) {
    return { transcript: '', status: 'COMPLETED', error: null };
  }

  let lastError = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const formData = new FormData();
      formData.append('file', new Blob([buffer], { type: mimeType }), recordingFilename(mimeType));
      formData.append('model', DEFAULT_MODEL);
      if (process.env.MISTRAL_TRANSCRIBE_LANGUAGE) {
        formData.append('language', process.env.MISTRAL_TRANSCRIBE_LANGUAGE);
      }

      const response = await fetch(TRANSCRIBE_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
        signal: AbortSignal.timeout(120000),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Transcription HTTP ${response.status}: ${errText.slice(0, 300)}`);
      }

      const data = await response.json();
      const text = String(data.text || data.transcript || '').trim();
      return { transcript: text, status: 'COMPLETED', error: null };
    } catch (e) {
      lastError = e?.message || 'Transcription failed';
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  return { transcript: null, status: 'FAILED', error: lastError };
}
