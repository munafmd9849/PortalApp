/**
 * Socket.IO Configuration
 * Replaces Firestore real-time listeners (onSnapshot)
 * Provides real-time updates for applications, notifications, jobs
 */

import { Server } from 'socket.io';
import {
  ensureMockCodeSession,
  initMockCodeSession,
  snapshotMockCodeSession,
  updateStudentCode,
  setActiveQuestion,
  addLiveQuestion,
} from '../utils/mockCodeSession.js';

let io = null;

/** sessionId → student socket id (for WebRTC live proctoring) */
const proctorStudentSockets = new Map();

/**
 * Initialize Socket.IO server
 */
export function initSocket(server) {
  // CORS_ORIGIN is validated at server startup, so it's guaranteed to exist
  const corsOrigin = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : [];
  
  if (corsOrigin.length === 0) {
    throw new Error('CORS_ORIGIN environment variable is required for Socket.IO');
  }

  io = new Server(server, {
    cors: {
      origin: corsOrigin,
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
        socket.userRole = user.role;
        // Join user-specific room
        socket.join(`user:${socket.userId}`);
        
        // Join role-based room
        socket.join(`${user.role.toLowerCase()}:${socket.userId}`);
        
        if (user.role === 'STUDENT') {
          socket.join('students');
          socket.join(`student:${socket.userId}`);
        } else if (user.role === 'RECRUITER') {
          socket.join('recruiters');
        } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
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

    socket.on('subscribe:proctoring', (assessmentId) => {
      const role = socket.userRole;
      if (!assessmentId || !['ADMIN', 'SUPER_ADMIN'].includes(role)) return;
      socket.join(`proctoring:assessment:${assessmentId}`);
    });

    socket.on('unsubscribe:proctoring', (assessmentId) => {
      if (assessmentId) socket.leave(`proctoring:assessment:${assessmentId}`);
    });

    socket.on('proctoring:frame', (payload) => {
      if (socket.userRole !== 'STUDENT') return;
      const { assessmentId, sessionId, frame } = payload || {};
      if (!assessmentId || !sessionId || typeof frame !== 'string') return;
      if (frame.length > 250000) return;
      io.to(`proctoring:assessment:${assessmentId}`).emit('proctoring:live-frame', {
        assessmentId,
        sessionId,
        frame,
        timestamp: Date.now(),
      });
    });

    const relayProctorSignal = (event, payload) => {
      const { targetSocketId, sessionId } = payload || {};
      if (!sessionId) return;
      const msg = { ...payload, fromSocketId: socket.id };
      if (targetSocketId) {
        io.to(targetSocketId).emit(event, msg);
        return;
      }
      if (event === 'proctor:offer' || event === 'proctor:ice') {
        io.to(`proctor:viewers:${sessionId}`).emit(event, msg);
      }
    };

    socket.on('proctor:student-register', ({ sessionId }) => {
      if (socket.userRole !== 'STUDENT' || !sessionId) return;
      proctorStudentSockets.set(sessionId, socket.id);
      socket.join(`proctor:student:${sessionId}`);

      // Admins may join before the student registers — notify student about waiting viewers.
      const viewersRoom = io.sockets.adapter.rooms.get(`proctor:viewers:${sessionId}`);
      if (viewersRoom) {
        for (const viewerSocketId of viewersRoom) {
          if (viewerSocketId === socket.id) continue;
          io.to(socket.id).emit('proctor:viewer-joined', {
            sessionId,
            viewerSocketId,
          });
        }
      }
    });

    socket.on('proctor:student-unregister', ({ sessionId }) => {
      if (!sessionId) return;
      proctorStudentSockets.delete(sessionId);
      socket.leave(`proctor:student:${sessionId}`);
      io.to(`proctor:viewers:${sessionId}`).emit('proctor:student-offline', { sessionId });
    });

    socket.on('disconnect', () => {
      for (const [sessionId, sid] of proctorStudentSockets.entries()) {
        if (sid === socket.id) {
          proctorStudentSockets.delete(sessionId);
          io.to(`proctor:viewers:${sessionId}`).emit('proctor:student-offline', { sessionId });
        }
      }
    });

    socket.on('proctor:watch', ({ sessionId }) => {
      if (!['ADMIN', 'SUPER_ADMIN'].includes(socket.userRole) || !sessionId) return;
      socket.join(`proctor:viewers:${sessionId}`);
      const studentSid = proctorStudentSockets.get(sessionId);
      if (studentSid) {
        io.to(studentSid).emit('proctor:viewer-joined', {
          sessionId,
          viewerSocketId: socket.id,
        });
      }
    });

    socket.on('proctor:unwatch', ({ sessionId }) => {
      if (sessionId) socket.leave(`proctor:viewers:${sessionId}`);
    });

    socket.on('proctor:offer', (p) => relayProctorSignal('proctor:offer', p));
    socket.on('proctor:answer', (p) => relayProctorSignal('proctor:answer', p));
    socket.on('proctor:ice', (p) => relayProctorSignal('proctor:ice', p));

    const broadcastMockCodeState = (slotId) => {
      const state = snapshotMockCodeSession(slotId);
      if (state) {
        io.to(`mock-code:${slotId}`).emit('mock-code:state', { slotId, ...state });
      }
    };

    const persistMockCode = async (slotId) => {
      const state = snapshotMockCodeSession(slotId);
      if (!state) return;
      try {
        const prisma = (await import('../config/database.js')).default;
        await prisma.mockInterviewSlot.update({
          where: { id: slotId },
          data: {
            liveCode: state.code,
            liveCodeLanguage: state.language,
            activeQuestionId: state.activeQuestionId,
          },
        });
      } catch (e) {
        console.warn('[mock-code] persist failed', e?.message);
      }
    };

    const loadMockCodeSlot = async (slotId) => {
      const prisma = (await import('../config/database.js')).default;
      return prisma.mockInterviewSlot.findUnique({
        where: { id: slotId },
        include: { drive: true, student: { select: { userId: true } } },
      });
    };

    socket.on('mock-code:join', async ({ slotId, role }) => {
      if (!slotId || !['student', 'interviewer'].includes(role)) return;
      try {
        const slot = await loadMockCodeSlot(slotId);
        if (!slot?.drive?.enableCodeConsole) return;

        if (role === 'student') {
          if (socket.userRole !== 'STUDENT' || slot.student?.userId !== socket.userId) return;
        } else if (!['ADMIN', 'SUPER_ADMIN'].includes(socket.userRole)) {
          return;
        }

        socket.join(`mock-code:${slotId}`);

        const session = ensureMockCodeSession(slotId, {
          driveQuestions: slot.drive.codingQuestions,
          extraQuestions: slot.extraQuestions,
          liveCode: slot.liveCode,
          liveCodeLanguage: slot.liveCodeLanguage,
          activeQuestionId: slot.activeQuestionId,
        });

        const payload = { slotId, ...session };
        socket.emit('mock-code:state', payload);
        // Sync peers already in the room (e.g. interviewer waiting before student joins).
        socket.to(`mock-code:${slotId}`).emit('mock-code:state', payload);
      } catch (e) {
        console.error('[mock-code:join]', e);
      }
    });

    socket.on('mock-code:leave', ({ slotId }) => {
      if (slotId) socket.leave(`mock-code:${slotId}`);
    });

    socket.on('mock-code:code-update', async ({ slotId, code, language }) => {
      if (!slotId || socket.userRole !== 'STUDENT') return;
      try {
        const slot = await loadMockCodeSlot(slotId);
        if (!slot?.drive?.enableCodeConsole) return;
        if (socket.userRole !== 'STUDENT' || slot.student?.userId !== socket.userId) return;

        socket.join(`mock-code:${slotId}`);

        let state = updateStudentCode(slotId, code, language);
        if (!state) {
          ensureMockCodeSession(slotId, {
            driveQuestions: slot.drive.codingQuestions,
            extraQuestions: slot.extraQuestions,
            liveCode: slot.liveCode,
            liveCodeLanguage: slot.liveCodeLanguage,
            activeQuestionId: slot.activeQuestionId,
          });
          state = updateStudentCode(slotId, code, language);
        }
        if (!state) return;

        io.to(`mock-code:${slotId}`).emit('mock-code:code-update', {
          slotId,
          code: state.code,
          language: state.language,
        });
        await persistMockCode(slotId);
      } catch (e) {
        console.error('[mock-code:code-update]', e);
      }
    });

    socket.on('mock-code:set-question', async ({ slotId, questionId }) => {
      if (!slotId || !['ADMIN', 'SUPER_ADMIN'].includes(socket.userRole)) return;
      const state = setActiveQuestion(slotId, questionId);
      if (!state) return;
      broadcastMockCodeState(slotId);
      await persistMockCode(slotId);
    });

    socket.on('mock-code:add-question', async ({ slotId, question }) => {
      if (!slotId || !['ADMIN', 'SUPER_ADMIN'].includes(socket.userRole)) return;
      if (!question?.id) return;
      addLiveQuestion(slotId, question);
      try {
        const prisma = (await import('../config/database.js')).default;
        const slot = await prisma.mockInterviewSlot.findUnique({ where: { id: slotId } });
        const existing = JSON.parse(slot?.extraQuestions || '[]');
        if (!existing.some((q) => q.id === question.id)) {
          existing.push(question);
          await prisma.mockInterviewSlot.update({
            where: { id: slotId },
            data: { extraQuestions: JSON.stringify(existing) },
          });
        }
      } catch (e) {
        console.warn('[mock-code:add-question] db', e?.message);
      }
      broadcastMockCodeState(slotId);
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
