/**
 * 1:1 WebRTC live video from student → admin (video-call style).
 * Uses the same camera stream as ProctoringEngine (no second camera).
 */
import { initSocket } from '../services/socket';
import { resolveIceServers } from './iceServers.js';

function bindSocketHandlers(socket, handlers) {
  for (const [event, fn] of handlers) {
    socket.on(event, fn);
  }
  return () => {
    for (const [event, fn] of handlers) {
      socket.off(event, fn);
    }
  };
}

/** Student side: publishes webcam to admins who request watch */
export class ProctoringBroadcaster {
  constructor({ sessionId, assessmentId, getStream }) {
    this.sessionId = sessionId;
    this.assessmentId = assessmentId;
    this.getStream = getStream;
    this.pcs = new Map();
    this.socket = null;
    this.unbind = null;
    this.viewers = new Set();
    this.pendingViewers = new Set();
    this._retryTimer = null;
    this._requestRegister = null;
  }

  async start() {
    this.socket = initSocket();
    if (!this.socket) return;

    const register = () => {
      this.socket.emit('proctor:student-register', {
        sessionId: this.sessionId,
        assessmentId: this.assessmentId,
      });
    };
    register();
    this._requestRegister = register;
    this.socket.on('connect', register);

    const handlers = [
      [
        'proctor:viewer-joined',
        async ({ sessionId, viewerSocketId }) => {
          if (sessionId !== this.sessionId || !viewerSocketId) return;
          this.viewers.add(viewerSocketId);
          await this._sendOffer(viewerSocketId);
        },
      ],
      [
        'proctor:answer',
        async ({ sessionId, answer, fromSocketId }) => {
          if (sessionId !== this.sessionId || !answer || !fromSocketId) return;
          if (!this.viewers.has(fromSocketId)) return;
          const pc = this.pcs.get(fromSocketId);
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (e) {
            console.warn('[Proctor RTC] setRemoteDescription failed', e);
          }
        },
      ],
      [
        'proctor:ice',
        async ({ sessionId, candidate, fromSocketId }) => {
          if (sessionId !== this.sessionId || !candidate || !fromSocketId) return;
          if (!this.viewers.has(fromSocketId)) return;
          const pc = this.pcs.get(fromSocketId);
          if (!pc) return;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {
            /* ignore stale ICE */
          }
        },
      ],
    ];

    this.unbind = bindSocketHandlers(this.socket, handlers);
    this._retryTimer = setInterval(() => this._retryPendingViewers(), 2000);
  }

  _retryPendingViewers() {
    if (this.pendingViewers.size === 0) return;
    for (const viewerId of [...this.pendingViewers]) {
      void this._sendOffer(viewerId);
    }
  }

  async _sendOffer(viewerSocketId) {
    const stream = this.getStream?.();
    if (!stream?.getVideoTracks?.().length) {
      this.pendingViewers.add(viewerSocketId);
      return;
    }

    this.pendingViewers.delete(viewerSocketId);

    const existing = this.pcs.get(viewerSocketId);
    if (existing) {
      existing.close();
      this.pcs.delete(viewerSocketId);
    }

    const iceServers = await resolveIceServers();
    const pc = new RTCPeerConnection({ iceServers });
    this.pcs.set(viewerSocketId, pc);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('proctor:ice', {
          sessionId: this.sessionId,
          targetSocketId: viewerSocketId,
          candidate: event.candidate,
        });
      }
    };

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);
      this.socket.emit('proctor:offer', {
        sessionId: this.sessionId,
        targetSocketId: viewerSocketId,
        offer,
      });
    } catch (e) {
      console.warn('[Proctor RTC] createOffer failed', e);
      pc.close();
      this.pcs.delete(viewerSocketId);
      this.pendingViewers.add(viewerSocketId);
    }
  }

  stop() {
    if (this._retryTimer) {
      clearInterval(this._retryTimer);
      this._retryTimer = null;
    }
    for (const pc of this.pcs.values()) {
      pc.close();
    }
    this.pcs.clear();
    this.viewers.clear();
    this.pendingViewers.clear();
    if (this.socket) {
      if (this._requestRegister) {
        this.socket.off('connect', this._requestRegister);
        this._requestRegister = null;
      }
      this.socket.emit('proctor:student-unregister', { sessionId: this.sessionId });
    }
    if (this.unbind) {
      this.unbind();
      this.unbind = null;
    }
  }
}

/** Admin side: receives continuous video stream */
export class ProctoringViewer {
  constructor({ sessionId, assessmentId, videoEl, onConnected, onDisconnected }) {
    this.sessionId = sessionId;
    this.assessmentId = assessmentId;
    this.videoEl = videoEl;
    this.onConnected = onConnected;
    this.onDisconnected = onDisconnected;
    this.pc = null;
    this.socket = null;
    this.unbind = null;
    this.studentSocketId = null;
    this._requestWatch = null;
    this._watchRetryTimer = null;
    this._connectTimeout = null;
  }

  async start() {
    this.stop();
    this.socket = initSocket();
    if (!this.socket || !this.videoEl) return;

    const requestWatch = () => {
      if (!this.socket?.connected) return;
      this.socket.emit('proctor:watch', {
        sessionId: this.sessionId,
        assessmentId: this.assessmentId,
      });
    };

    requestWatch();
    this._requestWatch = requestWatch;
    this.socket.on('connect', requestWatch);

    this._watchRetryTimer = setInterval(() => {
      if (this.pc?.connectionState === 'connected') return;
      requestWatch();
    }, 5000);

    const handlers = [
      [
        'proctor:offer',
        async ({ sessionId, offer, fromSocketId }) => {
          if (sessionId !== this.sessionId || !offer) return;
          this.studentSocketId = fromSocketId;
          await this._handleOffer(offer, fromSocketId);
        },
      ],
      [
        'proctor:ice',
        async ({ sessionId, candidate, fromSocketId }) => {
          if (sessionId !== this.sessionId || !this.pc || !candidate) return;
          try {
            await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {
            /* ignore */
          }
        },
      ],
      [
        'proctor:student-offline',
        ({ sessionId }) => {
          if (sessionId === this.sessionId) {
            this.onDisconnected?.();
          }
        },
      ],
    ];

    this.unbind = bindSocketHandlers(this.socket, handlers);

    this._connectTimeout = setTimeout(() => {
      if (this.pc?.connectionState !== 'connected') {
        requestWatch();
      }
    }, 3000);
  }

  async _handleOffer(offer, fromSocketId) {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    const iceServers = await resolveIceServers();
    this.pc = new RTCPeerConnection({ iceServers });

    this.pc.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (!stream || !this.videoEl) return;
      this.videoEl.srcObject = stream;
      this.videoEl.play().catch(() => {});
      this.onConnected?.();
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      if (state === 'connected') this.onConnected?.();
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        this.onDisconnected?.();
      }
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('proctor:ice', {
          sessionId: this.sessionId,
          targetSocketId: fromSocketId || this.studentSocketId,
          candidate: event.candidate,
        });
      }
    };

    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.socket.emit('proctor:answer', {
        sessionId: this.sessionId,
        targetSocketId: fromSocketId,
        answer,
      });
    } catch (e) {
      console.warn('[Proctor RTC] handleOffer failed', e);
      this.onDisconnected?.();
    }
  }

  stop() {
    if (this._watchRetryTimer) {
      clearInterval(this._watchRetryTimer);
      this._watchRetryTimer = null;
    }
    if (this._connectTimeout) {
      clearTimeout(this._connectTimeout);
      this._connectTimeout = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
    if (this.socket) {
      if (this._requestWatch) {
        this.socket.off('connect', this._requestWatch);
        this._requestWatch = null;
      }
      this.socket.emit('proctor:unwatch', { sessionId: this.sessionId });
    }
    if (this.unbind) {
      this.unbind();
      this.unbind = null;
    }
    this.studentSocketId = null;
  }
}
