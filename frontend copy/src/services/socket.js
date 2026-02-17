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

export default {
  initSocket,
  disconnectSocket,
  subscribeToUpdates,
  useSocket,
};
