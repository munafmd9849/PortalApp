let cachedDetector = null;
let initPromise = null;
let initState = 'idle'; // idle | loading | ready | failed
let initError = null;

// Prefer local wasm (served from /public) — avoids CDN hangs in dev/slow networks
const WASM_LOCAL = `${import.meta.env.BASE_URL || '/'}mediapipe/wasm`;
const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

const INIT_TIMEOUT_MS = 20000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    }),
  ]);
}

export function getFaceDetectorState() {
  return { state: initState, error: initError };
}

export function resetFaceDetector() {
  cachedDetector = null;
  initPromise = null;
  initState = 'idle';
  initError = null;
}

async function loadDetector() {
  const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
  let vision;
  try {
    vision = await withTimeout(
      FilesetResolver.forVisionTasks(WASM_LOCAL),
      10000,
      'Local WASM load'
    );
  } catch {
    vision = await FilesetResolver.forVisionTasks(WASM_CDN);
  }
  return FaceDetector.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_URL },
    runningMode: 'VIDEO',
  });
}

export async function ensureFaceDetector() {
  if (cachedDetector) {
    initState = 'ready';
    return cachedDetector;
  }
  if (initPromise) return initPromise;

  initState = 'loading';
  initError = null;

  initPromise = withTimeout(loadDetector(), INIT_TIMEOUT_MS, 'Face detection model load')
    .then((detector) => {
      cachedDetector = detector;
      initState = 'ready';
      initError = null;
      return detector;
    })
    .catch((err) => {
      initState = 'failed';
      initError = err?.message || 'Failed to load face detection';
      cachedDetector = null;
      throw err;
    })
    .finally(() => {
      initPromise = null;
    });

  return initPromise;
}

/** Wrapper used by ProctoringEngine */
export async function createMediaPipeFaceDetector() {
  const detector = await ensureFaceDetector();
  return {
    async detect(video, timestampMs) {
      const result = detector.detectForVideo(video, timestampMs);
      return result?.detections ?? [];
    },
    async close() {
      // singleton kept for session reuse
    },
  };
}
