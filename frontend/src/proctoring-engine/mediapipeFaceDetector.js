let cached = null;

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';

export async function getFaceDetector() {
  if (cached) return cached;
  const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  const detector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      // Use the lightweight short-range model.
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
    },
    runningMode: 'VIDEO',
  });
  cached = detector;
  return detector;
}

/** Wrapper used by ProctoringEngine */
export async function createMediaPipeFaceDetector() {
  const detector = await getFaceDetector();
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

