export const ProctoringViolationType = Object.freeze({
  TAB_SWITCH: 'TAB_SWITCH',
  WINDOW_BLUR: 'WINDOW_BLUR',
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
  NO_FACE_DETECTED: 'NO_FACE_DETECTED',
  MULTIPLE_FACES: 'MULTIPLE_FACES',
  AUDIO_SPIKE: 'AUDIO_SPIKE',
});

export const ScreenshotCaptureType = Object.freeze({
  PERIODIC: 'PERIODIC',
  EVENT: 'EVENT',
});

/** Violation types that trigger immediate (debounced) evidence capture */
export const EVENT_SCREENSHOT_VIOLATIONS = new Set([
  ProctoringViolationType.TAB_SWITCH,
  ProctoringViolationType.WINDOW_BLUR,
  ProctoringViolationType.FULLSCREEN_EXIT,
  ProctoringViolationType.NO_FACE_DETECTED,
  ProctoringViolationType.MULTIPLE_FACES,
]);

export const defaultProctoringConfig = Object.freeze({
  enabled: true,
  cameraRequired: true,
  micRequired: false,
  fullscreenRequired: true,
  tabSwitch: true,
  windowBlur: true,
  faceMonitoring: true,
  faceCheckIntervalMs: 2500,
  noFaceGraceMs: 6500,
  multipleFacesGraceMs: 2500,
  violationCooldownMs: 8000,
  /** @deprecated use periodic snapshot settings below */
  snapshotIntervalMs: 45000,
  periodicSnapshotBaseMs: 180000,
  periodicSnapshotJitterMs: 25000,
  screenshotDebounceMs: 8000,
  snapshotJpegQuality: 0.6,
  snapshotMaxWidth: 640,
  snapshotMaxHeight: 360,
  /** Legacy JPEG frames over socket — use WebRTC live video instead */
  liveFrameToAdmin: false,
  liveFrameIntervalMs: 1000,
  liveFrameMaxWidth: 400,
  liveFrameJpegQuality: 0.45,
  audioMonitoring: false,
  audioRmsThreshold: 0.25,
  audioSpikeConsecutiveSamples: 5,
  autoSubmit: {
    enabled: true,
    threshold: 10,
  },
});

