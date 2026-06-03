import {
  defaultProctoringConfig,
  ProctoringViolationType,
  ScreenshotCaptureType,
  EVENT_SCREENSHOT_VIOLATIONS,
} from './constants';
import {
  createMediaPipeFaceDetector,
  getFaceDetectorState,
  resetFaceDetector,
} from './mediapipeFaceDetector';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function nowMs() {
  return Date.now();
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

function isHighRiskEvent(event) {
  if (!event) return false;
  return (
    event === ProctoringViolationType.MULTIPLE_FACES ||
    event === ProctoringViolationType.NO_FACE_DETECTED ||
    event === ProctoringViolationType.TAB_SWITCH ||
    event === ProctoringViolationType.FULLSCREEN_EXIT
  );
}

/**
 * Client proctoring engine with hybrid screenshot capture:
 * semi-random periodic (~3 min ± jitter) + debounced event-triggered evidence.
 */
export class ProctoringEngine {
  constructor({
    getVideoEl,
    getSessionId,
    logViolation,
    uploadScreenshot,
    onWarning,
    onAutoSubmit,
    onViolation,
    onRiskChange,
    onStatus,
    onError,
    onLiveFrame,
    config = {},
  }) {
    this.getVideoEl = getVideoEl;
    this.getSessionId = getSessionId;
    this.logViolation = logViolation;
    this.uploadScreenshot = uploadScreenshot;
    this.onWarning = onWarning;
    this.onAutoSubmit = onAutoSubmit;
    this.onViolation = onViolation;
    this.onRiskChange = onRiskChange;
    this.onStatus = onStatus;
    this.onError = onError;
    this.onLiveFrame = onLiveFrame;
    this.cfg = { ...defaultProctoringConfig, ...config };

    this._stream = null;
    this._faceDetector = null;
    this._running = false;
    this._monitoring = false;
    this._faceLoopTimer = null;
    this._periodicTimer = null;
    this._liveFrameTimer = null;
    this._eventDebounceTimer = null;
    this._audioCtx = null;
    this._analyser = null;
    this._audioRaf = null;
    this._listeners = [];

    this._lastViolationAt = new Map();
    this._tabSwitchCount = 0;
    this._lastScreenshotAt = 0;
    this._pendingEventCapture = null;
    this._uploadQueue = Promise.resolve();
    this._noFaceSince = null;
    this._multiFaceSince = null;
    this._violationCount = 0;
    this._faceDetectorInitPromise = null;
  }

  get isFullscreen() {
    return Boolean(document.fullscreenElement);
  }

  isCameraActive() {
    const video = this.getVideoEl?.();
    const trackLive = this._stream?.getVideoTracks?.().some((t) => t.readyState === 'live');
    return Boolean(trackLive || (video?.srcObject && video.videoWidth > 0));
  }

  getStream() {
    return this._stream || null;
  }

  isFaceDetectorReady() {
    return Boolean(this._faceDetector);
  }

  getFaceDetectorStatus() {
    if (!this.cfg.faceMonitoring) return { state: 'off', error: null };
    if (this._faceDetector) return { state: 'ready', error: null };
    return getFaceDetectorState();
  }

  async retryFaceDetector() {
    resetFaceDetector();
    this._faceDetector = null;
    this._faceDetectorInitPromise = null;
    if (this.cfg.faceMonitoring) {
      try {
        this._faceDetector = await createMediaPipeFaceDetector();
      } catch {
        this._faceDetector = null;
      }
    }
    return this.getFaceDetectorStatus();
  }

  async initCamera({ withAudio } = {}) {
    const wantAudio = withAudio ?? this.cfg.micRequired ?? false;
    this._stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: wantAudio,
    });
    const video = this.getVideoEl?.();
    if (video) {
      video.srcObject = this._stream;
      await video.play().catch(() => {});
      await this._waitForVideoFrames(video);
    }
    if (this.cfg.faceMonitoring) {
      try {
        this._faceDetector = await createMediaPipeFaceDetector();
      } catch (err) {
        this._faceDetector = null;
        console.warn('[Proctoring] Face detector failed to load; camera still active.', err);
      }
    }
    return this._stream;
  }

  /** Re-bind active stream after React remounts the <video> element (e.g. pre-check → exam UI). */
  reattachVideo() {
    const video = this.getVideoEl?.();
    if (!video || !this._stream) return false;
    video.srcObject = this._stream;
    video.play().catch(() => {});
    return true;
  }

  async _waitForVideoFrames(video, timeoutMs = 8000) {
    if (!video) return false;
    if (video.videoWidth > 0 && video.readyState >= 2) return true;
    return new Promise((resolve) => {
      const finish = () => resolve(video.videoWidth > 0);
      const timer = setTimeout(finish, timeoutMs);
      const onReady = () => {
        if (video.videoWidth > 0) {
          clearTimeout(timer);
          video.removeEventListener('loadeddata', onReady);
          video.removeEventListener('playing', onReady);
          resolve(true);
        }
      };
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('playing', onReady);
    });
  }

  async detectFacesOnce() {
    const video = this.getVideoEl?.();
    if (!video) return 0;
    if (!video.videoWidth) {
      await this._waitForVideoFrames(video, 3000);
    }
    if (!this._faceDetector && this.cfg.faceMonitoring) {
      const { state } = getFaceDetectorState();
      if (state === 'failed') return 0;
      if (!this._faceDetectorInitPromise) {
        this._faceDetectorInitPromise = createMediaPipeFaceDetector()
          .then((d) => {
            this._faceDetector = d;
            return d;
          })
          .catch(() => null)
          .finally(() => {
            this._faceDetectorInitPromise = null;
          });
      }
      try {
        await withTimeout(this._faceDetectorInitPromise, 5000);
      } catch {
        return 0;
      }
      if (!this._faceDetector) return 0;
    }
    if (!this._faceDetector) return this.cfg.faceMonitoring ? 0 : 1;
    try {
      const faces = await this._faceDetector.detect(video, nowMs());
      return Array.isArray(faces) ? faces.length : 0;
    } catch {
      return 0;
    }
  }

  async requestFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      return true;
    } catch {
      this.onWarning?.({ level: 'warn', message: 'Fullscreen could not be enabled.' });
      return false;
    }
  }

  async precheck() {
    if (this.cfg.fullscreenRequired && !this.isFullscreen) {
      return { ok: false, reason: 'FULLSCREEN_REQUIRED' };
    }
    if (!this.isCameraActive()) {
      return { ok: false, reason: 'CAMERA_REQUIRED' };
    }
    if (this.cfg.faceMonitoring) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const count = await this.detectFacesOnce();
        if (count === 1) return { ok: true };
        if (count > 1) return { ok: false, reason: 'MULTIPLE_FACES' };
        await new Promise((r) => setTimeout(r, 500));
      }
      return { ok: false, reason: 'NO_FACE_DETECTED' };
    }
    return { ok: true };
  }

  async start() {
    if (this._monitoring) return;
    this._monitoring = true;
    this._running = true;
    this._attachDomListeners();
    if (this.cfg.faceMonitoring) this._startFaceLoop();
    if (this.cfg.audioMonitoring) this._startAudioMonitor();
    // Immediate evidence capture when session monitoring starts
    this._captureAndUpload({
      captureType: ScreenshotCaptureType.PERIODIC,
      event: 'SESSION_START',
      riskFlag: false,
    }).finally(() => this._scheduleNextPeriodicCapture());
    this._startLiveFrameLoop();
    this._emitStatus?.('Monitoring active');
  }

  async destroy() {
    await this.stop();
  }

  async stop() {
    this._running = false;
    this._monitoring = false;
    this._detachDomListeners();
    if (this._faceLoopTimer) clearTimeout(this._faceLoopTimer);
    if (this._periodicTimer) clearTimeout(this._periodicTimer);
    if (this._eventDebounceTimer) clearTimeout(this._eventDebounceTimer);
    this._pendingEventCapture = null;
    if (this._audioRaf) cancelAnimationFrame(this._audioRaf);
    if (this._analyser) this._analyser.disconnect();
    if (this._audioCtx) await this._audioCtx.close().catch(() => {});
    if (this._faceDetector) await this._faceDetector.close().catch(() => {});
    this._faceDetector = null;
    if (this._stream) this._stream.getTracks().forEach((t) => t.stop());
    this._stream = null;
    this._emitStatus?.('Monitoring stopped');
  }

  _emitStatus(msg) {
    try {
      this.onStatus?.(msg);
    } catch {
      // ignore
    }
  }

  _emitError(err) {
    try {
      this.onError?.(err);
    } catch {
      // ignore
    }
  }

  _attachDomListeners() {
    const onVis = () => {
      if (!this._running) return;
      if (document.visibilityState === 'hidden' && this.cfg.tabSwitch) {
        this.bumpViolation(ProctoringViolationType.TAB_SWITCH, 'Tab switched / page hidden');
      }
    };
    const onBlur = () => {
      if (!this._running) return;
      if (this.cfg.windowBlur) {
        this.bumpViolation(ProctoringViolationType.WINDOW_BLUR, 'Window lost focus');
      }
    };
    const onFs = () => {
      if (!this._running) return;
      if (this.cfg.fullscreenRequired && !document.fullscreenElement) {
        this.bumpViolation(ProctoringViolationType.FULLSCREEN_EXIT, 'Exited fullscreen');
      }
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFs);
    this._listeners.push(['visibilitychange', onVis, document]);
    this._listeners.push(['blur', onBlur, window]);
    this._listeners.push(['fullscreenchange', onFs, document]);
  }

  _detachDomListeners() {
    for (const [evt, fn, target] of this._listeners) {
      target.removeEventListener(evt, fn);
    }
    this._listeners = [];
  }

  _canLogViolation(type) {
    const last = this._lastViolationAt.get(type) || 0;
    const cd = this.cfg.violationCooldownMs || 8000;
    return nowMs() - last >= cd;
  }

  async bumpViolation(type, details, meta) {
    if (!this._running) return;
    const sessionId = await this.getSessionId?.();
    if (!sessionId) return;
    if (!this._canLogViolation(type)) return;

    this._lastViolationAt.set(type, nowMs());
    if (type === ProctoringViolationType.TAB_SWITCH) this._tabSwitchCount += 1;

    try {
      await this.logViolation?.(type, details, meta);
    } catch (e) {
      this._emitError(e);
    }

    this._violationCount += 1;
    try {
      this.onViolation?.({ type, details, meta, at: new Date().toISOString() });
    } catch {
      // ignore
    }

    const threshold = this.cfg.autoSubmit?.threshold ?? 10;
    if (this.cfg.autoSubmit?.enabled && this._violationCount >= threshold) {
      this.onAutoSubmit?.({ reason: 'Violation threshold exceeded' });
    }

    if (EVENT_SCREENSHOT_VIOLATIONS.has(type)) {
      this._queueEventScreenshot(type);
    }
  }

  _nextPeriodicDelayMs() {
    const base = this.cfg.periodicSnapshotBaseMs ?? 180000;
    const jitter = this.cfg.periodicSnapshotJitterMs ?? 25000;
    const delta = (Math.random() * 2 - 1) * jitter;
    return Math.round(clamp(base + delta, base - jitter, base + jitter));
  }

  _scheduleNextPeriodicCapture() {
    if (!this._running) return;
    if (this._periodicTimer) clearTimeout(this._periodicTimer);
    const delay = this._nextPeriodicDelayMs();
    this._periodicTimer = setTimeout(() => {
      this._periodicTimer = null;
      if (!this._running) return;
      this._captureAndUpload({
        captureType: ScreenshotCaptureType.PERIODIC,
        event: null,
        riskFlag: false,
      }).finally(() => this._scheduleNextPeriodicCapture());
    }, delay);
  }

  _queueEventScreenshot(eventType) {
    const debounceMs = this.cfg.screenshotDebounceMs ?? 8000;
    const now = nowMs();

    if (!this._pendingEventCapture) {
      this._pendingEventCapture = { events: new Set(), riskFlag: false, faceCount: null };
    }
    this._pendingEventCapture.events.add(eventType);
    if (isHighRiskEvent(eventType)) this._pendingEventCapture.riskFlag = true;
    if (eventType === ProctoringViolationType.TAB_SWITCH && this._tabSwitchCount >= 2) {
      this._pendingEventCapture.riskFlag = true;
    }

    if (now - this._lastScreenshotAt < debounceMs && this._lastScreenshotAt > 0) {
      if (this._eventDebounceTimer) clearTimeout(this._eventDebounceTimer);
      const remaining = debounceMs - (now - this._lastScreenshotAt);
      this._eventDebounceTimer = setTimeout(() => this._flushPendingEventScreenshot(), remaining);
      return;
    }

    if (this._eventDebounceTimer) clearTimeout(this._eventDebounceTimer);
    this._eventDebounceTimer = setTimeout(() => this._flushPendingEventScreenshot(), 150);
  }

  _flushPendingEventScreenshot() {
    this._eventDebounceTimer = null;
    const pending = this._pendingEventCapture;
    this._pendingEventCapture = null;
    if (!pending?.events?.size) return;

    const events = [...pending.events];
    const primaryEvent = events[events.length - 1];
    let riskFlag = pending.riskFlag || events.some(isHighRiskEvent);
    if (this._tabSwitchCount >= 2 && events.includes(ProctoringViolationType.TAB_SWITCH)) {
      riskFlag = true;
    }

    this._captureAndUpload({
      captureType: ScreenshotCaptureType.EVENT,
      event: events.length > 1 ? events.join(',') : primaryEvent,
      riskFlag,
      flags: { events, grouped: events.length > 1 },
      faceCount: pending.faceCount,
    });
  }

  _startLiveFrameLoop() {
    if (!this.cfg.liveFrameToAdmin || !this.onLiveFrame) return;
    if (this._liveFrameTimer) clearInterval(this._liveFrameTimer);
    const interval = this.cfg.liveFrameIntervalMs ?? 1000;
    let inFlight = false;
    const tick = async () => {
      if (!this._running || inFlight) return;
      inFlight = true;
      try {
        const frame = await this._captureFrameDataUrl(
          this.cfg.liveFrameMaxWidth ?? 400,
          this.cfg.liveFrameJpegQuality ?? 0.45
        );
        if (!frame) return;
        const sessionId = await this.getSessionId?.();
        if (!sessionId) return;
        this.onLiveFrame?.({ frame, sessionId, at: Date.now() });
      } catch {
        /* skip frame */
      } finally {
        inFlight = false;
      }
    };
    tick();
    this._liveFrameTimer = setInterval(tick, interval);
  }

  async _captureFrameDataUrl(maxW = 400, quality = 0.45) {
    const video = this.getVideoEl?.();
    if (!video?.videoWidth) return null;
    const scale = Math.min(1, maxW / video.videoWidth);
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  }

  async _captureFrameBlob() {
    const video = this.getVideoEl?.();
    if (!video?.videoWidth) return null;

    const maxW = this.cfg.snapshotMaxWidth || 640;
    const maxH = this.cfg.snapshotMaxHeight || 360;
    const scale = Math.min(1, maxW / video.videoWidth, maxH / video.videoHeight);
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);

    const quality = this.cfg.snapshotJpegQuality ?? 0.6;
    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
    });
  }

  async _captureAndUpload(meta, retry = false) {
    if (!this._running) return;
    const sessionId = await this.getSessionId?.();
    if (!sessionId || !this.uploadScreenshot) return;

    const run = async () => {
      try {
        const blob = await this._captureFrameBlob();
        if (!blob) return;

        let faceCount = meta.faceCount;
        if (faceCount == null && this._faceDetector) {
          const video = this.getVideoEl?.();
          if (video) {
            try {
              const faces = await this._faceDetector.detect(video, nowMs());
              faceCount = Array.isArray(faces) ? faces.length : null;
            } catch {
              // ignore
            }
          }
        }

        let riskFlag = meta.riskFlag ?? false;
        if (faceCount === 0 || (typeof faceCount === 'number' && faceCount > 1)) {
          riskFlag = true;
        }

        const flags = {
          ...(meta.flags || {}),
          captureType: meta.captureType,
          event: meta.event,
          riskFlag,
          timestamp: new Date().toISOString(),
        };

        await this.uploadScreenshot(blob, {
          captureType: meta.captureType,
          event: meta.event || null,
          riskFlag,
          flags,
          faceCount,
        });

        this._lastScreenshotAt = nowMs();
      } catch {
        if (!retry) {
          await new Promise((r) => setTimeout(r, 400));
          return this._captureAndUpload(meta, true);
        }
      }
    };

    this._uploadQueue = this._uploadQueue.then(run, run);
    return this._uploadQueue;
  }

  _startFaceLoop() {
    const tick = async () => {
      if (!this._running) return;
      try {
        const video = this.getVideoEl?.();
        if (!video) return;
        const faces = await this._faceDetector.detect(video, nowMs());
        const count = Array.isArray(faces) ? faces.length : 0;

        if (count === 0) {
          const since = this._noFaceSince || (this._noFaceSince = nowMs());
          if (nowMs() - since >= (this.cfg.noFaceGraceMs || 6500)) {
            this.bumpViolation(ProctoringViolationType.NO_FACE_DETECTED, 'No face detected');
            this._noFaceSince = null;
          }
        } else {
          this._noFaceSince = null;
        }

        if (count > 1) {
          const since = this._multiFaceSince || (this._multiFaceSince = nowMs());
          if (nowMs() - since >= (this.cfg.multipleFacesGraceMs || 2500)) {
            this.bumpViolation(
              ProctoringViolationType.MULTIPLE_FACES,
              `Multiple faces detected (${count})`
            );
            this._multiFaceSince = null;
          }
        } else {
          this._multiFaceSince = null;
        }
      } catch (e) {
        this._emitError(e);
      } finally {
        if (this._running) {
          this._faceLoopTimer = setTimeout(tick, this.cfg.faceCheckIntervalMs || 2500);
        }
      }
    };
    tick();
  }

  _startAudioMonitor() {
    if (!this._stream) return;
    const audioTrack = this._stream.getAudioTracks()[0];
    if (!audioTrack) return;

    this._audioCtx = new AudioContext();
    const src = this._audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
    this._analyser = this._audioCtx.createAnalyser();
    this._analyser.fftSize = 256;
    src.connect(this._analyser);

    const data = new Uint8Array(this._analyser.frequencyBinCount);
    let streak = 0;

    const loop = () => {
      if (!this._running) return;
      this._analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      if (rms >= (this.cfg.audioRmsThreshold || 0.25)) {
        streak += 1;
        if (streak >= (this.cfg.audioSpikeConsecutiveSamples || 5)) {
          this.bumpViolation(ProctoringViolationType.AUDIO_SPIKE, 'Audio spike detected');
          streak = 0;
        }
      } else {
        streak = 0;
      }
      this._audioRaf = requestAnimationFrame(loop);
    };
    loop();
  }
}
