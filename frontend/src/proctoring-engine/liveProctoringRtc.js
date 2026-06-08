/**
 * 1:1 WebRTC live video from student → admin (video-call style).
 * Uses the same camera stream as ProctoringEngine (no second camera).
 */
import { initSocket } from '../services/socket';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

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
    this.pc = null;
    this.socket = null;
    this.unbind = null;
    this.viewers = new Set();
  }

  async start() {
    this.socket = initSocket();
    if (!this.socket) return;

    this.socket.emit('proctor:student-register', {
      sessionId: this.sessionId,
      assessmentId: this.assessmentId,
    });

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
          if (sessionId !== this.sessionId || !this.pc || !answer) return;
          if (fromSocketId && !this.viewers.has(fromSocketId)) return;
          try {
            await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (e) {
            console.warn('[Proctor RTC] setRemoteDescription failed', e);
          }
        },
      ],
      [
        'proctor:ice',
        async ({ sessionId, candidate, fromSocketId }) => {
          if (sessionId !== this.sessionId || !this.pc || !candidate) return;
          if (fromSocketId && !this.viewers.has(fromSocketId)) return;
          try {
            await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {
            /* ignore stale ICE */
          }
        },
      ],
    ];

    this.unbind = bindSocketHandlers(this.socket, handlers);
  }

  async _sendOffer(viewerSocketId) {
    const stream = this.getStream?.();
    if (!stream?.getVideoTracks?.().length) return;

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    stream.getTracks().forEach((track) => this.pc.addTrack(track, stream));

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('proctor:ice', {
          sessionId: this.sessionId,
          targetSocketId: viewerSocketId,
          candidate: event.candidate,
        });
      }
    };

    const offer = await this.pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });
    await this.pc.setLocalDescription(offer);
    this.socket.emit('proctor:offer', {
      sessionId: this.sessionId,
      targetSocketId: viewerSocketId,
      offer,
    });
  }

  stop() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.viewers.clear();
    if (this.socket) {
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
  }

  async start() {
    this.stop();
    this.socket = initSocket();
    if (!this.socket || !this.videoEl) return;

    this.socket.emit('proctor:watch', {
      sessionId: this.sessionId,
      assessmentId: this.assessmentId,
    });

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
  }

  async _handleOffer(offer, fromSocketId) {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

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

    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.socket.emit('proctor:answer', {
      sessionId: this.sessionId,
      targetSocketId: fromSocketId,
      answer,
    });
  }

  stop() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
    if (this.socket) {
      this.socket.emit('proctor:unwatch', { sessionId: this.sessionId });
    }
    if (this.unbind) {
      this.unbind();
      this.unbind = null;
    }
    this.studentSocketId = null;
  }
}
