/**
 * Socket.IO Configuration
 * Replaces Firestore real-time listeners (onSnapshot)
 * Provides real-time updates for applications, notifications, jobs
 */

import { Server } from 'socket.io';

let io = null;

/**
 * Initialize Socket.IO server
 */
export function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      // Authenticate socket connection using JWT token
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT (reuse auth middleware logic)
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.default.verify(token, process.env.JWT_SECRET);

      // Attach user info to socket
      socket.userId = decoded.userId;
      socket.userRole = decoded.role; // Could fetch from DB if needed

      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`✅ Socket connected: ${socket.userId}`);

    // Join role-based room for targeted updates
    const prisma = (await import('../config/database.js')).default;
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: socket.userId },
        select: { role: true },
      });

      if (user) {
        // Join user-specific room
        socket.join(`user:${socket.userId}`);
        
        // Join role-based room
        socket.join(`${user.role.toLowerCase()}:${socket.userId}`);
        
        if (user.role === 'STUDENT') {
          socket.join('students');
        } else if (user.role === 'RECRUITER') {
          socket.join('recruiters');
        } else if (user.role === 'ADMIN') {
          socket.join('admins');
        }
      }
    } catch (error) {
      console.error('Socket connection error:', error);
    }

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.userId}`);
    });

    // Handle custom events (if needed)
    socket.on('subscribe:jobs', () => {
      socket.join('jobs:updates');
    });

    socket.on('subscribe:applications', () => {
      socket.join(`applications:${socket.userId}`);
    });

    socket.on('subscribe:notifications', () => {
      socket.join(`notifications:${socket.userId}`);
    });
  });

  return io;
}

/**
 * Get Socket.IO instance
 */
export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocket() first.');
  }
  return io;
}

// Export io for use in controllers (set after initSocket is called)
let exportedIO = null;

export function setIO(socketIO) {
  exportedIO = socketIO;
}

export { exportedIO as io };
