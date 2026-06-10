/**
 * Socket.IO Client Service
 * Replaces Firestore real-time listeners (onSnapshot)
 * Provides real-time updates via WebSocket
 */

import { io } from 'socket.io-client';
import api from './api.js';
import { SOCKET_URL } from '../config/api.js';

let socket = null;

/**
 * Resolves when the shared socket is connected (or after timeout).
 */
export function whenSocketReady(timeoutMs = 12000) {
  const s = initSocket();
  if (!s) return Promise.resolve(null);
  if (s.connected) return Promise.resolve(s);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      s.off('connect', onConnect);
      resolve(s.connected ? s : s);
    }, timeoutMs);
    const onConnect = () => {
      clearTimeout(timer);
      s.off('connect', onConnect);
      resolve(s);
    };
    s.on('connect', onConnect);
  });
}

/**
 * Initialize Socket.IO connection
 */
export function initSocket() {
  // Prevent multiple socket connections
  if (socket && socket.connected) {
    return socket;
  }
  
  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  const token = api.getAuthToken();
  
  if (!token) {
    console.warn('No auth token, Socket.IO not connected');
    return null;
  }

  console.log(`🔌 Initializing Socket.IO connection to: ${SOCKET_URL}`);
  
  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected');
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket.IO disconnected');
  });

  socket.on('error', (error) => {
    console.error('Socket.IO error:', error);
  });

  // Subscribe to events
  socket.emit('subscribe:jobs');
  socket.emit('subscribe:applications');
  socket.emit('subscribe:notifications');

  return socket;
}

/**
 * Disconnect Socket.IO
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to real-time updates
 */
export function subscribeToUpdates(callbacks) {
  if (!socket) {
    socket = initSocket();
  }

  // Application updates
  if (callbacks.onApplicationCreated) {
    socket.on('application:created', callbacks.onApplicationCreated);
  }

  if (callbacks.onApplicationUpdated) {
    socket.on('application:updated', callbacks.onApplicationUpdated);
  }

  // Notification updates
  if (callbacks.onNotificationNew) {
    socket.on('notification:new', callbacks.onNotificationNew);
  }

  // Job updates
  if (callbacks.onJobPosted) {
    socket.on('job:posted', callbacks.onJobPosted);
  }

  if (callbacks.onJobUpdated) {
    socket.on('job:updated', callbacks.onJobUpdated);
  }

  // Return unsubscribe function
  return () => {
    if (socket) {
      if (callbacks.onApplicationCreated) socket.off('application:created');
      if (callbacks.onApplicationUpdated) socket.off('application:updated');
      if (callbacks.onNotificationNew) socket.off('notification:new');
      if (callbacks.onJobPosted) socket.off('job:posted');
      if (callbacks.onJobUpdated) socket.off('job:updated');
    }
  };
}

/**
 * Use Socket.IO in React hook
 */
export function useSocket() {
  return socket;
}

/**
 * Real-time proctoring updates for admin live monitor (screenshots + violations).
 */
export function subscribeProctoringMonitor(assessmentId, callbacks = {}) {
  const s = initSocket();
  if (!s || !assessmentId) return () => {};

  s.emit('subscribe:proctoring', assessmentId);

  const handler = (payload) => {
    if (!payload || payload.assessmentId === assessmentId || !payload.assessmentId) {
      callbacks.onUpdate?.(payload);
    }
    if (payload?.kind === 'screenshot') callbacks.onScreenshot?.(payload);
    if (payload?.kind === 'violation') callbacks.onViolation?.(payload);
  };

  s.on('proctoring:update', handler);

  const liveHandler = (payload) => {
    callbacks.onLiveFrame?.(payload);
  };
  s.on('proctoring:live-frame', liveHandler);

  return () => {
    s.off('proctoring:update', handler);
    s.off('proctoring:live-frame', liveHandler);
    s.emit('unsubscribe:proctoring', assessmentId);
  };
}

export function emitProctoringLiveFrame(assessmentId, sessionId, frame) {
  const s = initSocket();
  if (!s?.connected || !assessmentId || !sessionId || !frame) return;
  s.emit('proctoring:frame', { assessmentId, sessionId, frame });
}

export default {
  initSocket,
  disconnectSocket,
  subscribeToUpdates,
  subscribeProctoringMonitor,
  emitProctoringLiveFrame,
  useSocket,
};
