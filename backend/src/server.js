/**
 * Express Server Setup
 * Main entry point for backend API
 * Replaces Firebase Functions/backend
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import http from 'http';

import { initSocket } from './config/socket.js';
import prisma from './config/database.js';

// Routes
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import jobRoutes from './routes/jobs.js';
import applicationRoutes from './routes/applications.js';
import notificationRoutes from './routes/notifications.js';
import queryRoutes from './routes/queries.js';
import adminRequestRoutes from './routes/adminRequests.js';
import recruiterRoutes from './routes/recruiters.js';
import contactRoutes from './routes/contact.js';
import interviewRoutes from './routes/interviews.js';
import interviewTokenRoutes from './routes/interviewToken.js';
import interviewSchedulingRoutes from './routes/interviewScheduling.js';
import interviewerRoutes from './routes/interviewerRoutes.js';
import googleCalendarConnectRoutes from './routes/googleCalendarConnect.js';
import calendarRoutes from './routes/calendar.js';
import endorsementRoutes from './routes/endorsements.js';
import placementRoutes from './routes/placement.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the backend root directory (parent of src/)
dotenv.config({ path: join(__dirname, '../.env') });

// DEBUG: Verify .env loading for Google AI
console.log('🔍 [DEBUG] Environment Variables Check:');
console.log('  - GOOGLE_AI_API_KEY:', process.env.GOOGLE_AI_API_KEY ? `${process.env.GOOGLE_AI_API_KEY.substring(0, 10)}...${process.env.GOOGLE_AI_API_KEY.substring(process.env.GOOGLE_AI_API_KEY.length - 5)} (${process.env.GOOGLE_AI_API_KEY.length} chars)` : '❌ NOT SET');
console.log('  - GOOGLE_AI_MODEL:', process.env.GOOGLE_AI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash (default)');
console.log('  - GOOGLE_AI_MAX_TOKENS:', process.env.GOOGLE_AI_MAX_TOKENS || '2048 (default)');
console.log('  - GOOGLE_AI_TEMPERATURE:', process.env.GOOGLE_AI_TEMPERATURE || '0.7 (default)');
console.log('  - AI_ENABLED:', process.env.AI_ENABLED !== 'false' ? 'true' : 'false');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);
// io is exported from socket.js config for use in controllers

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // In development, allow localhost on any port
    if (process.env.NODE_ENV === 'development') {
      if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    // In production, use configured CORS_ORIGIN
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:5173'];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting in development mode
    if (process.env.NODE_ENV === 'development') {
      return false; // Still apply in development, but we'll increase the limit
    }
    return false;
  },
});

// More lenient rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 50, // Very high limit in dev (effectively disabled)
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // In development, allow unlimited auth requests
    return process.env.NODE_ENV === 'development';
  },
});

// General API rate limiting - more lenient in development
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 100, // Much higher in dev
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limits (auth endpoints are effectively unlimited in dev)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/send-otp', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/', generalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/admin-requests', adminRequestRoutes);
app.use('/api/recruiters', recruiterRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin/interview', interviewRoutes);
app.use('/api/admin/interview-scheduling', interviewSchedulingRoutes); // New interview scheduling routes (admin)
app.use('/api/interview', interviewerRoutes); // New interviewer token-based routes (no auth required) - MUST come before old routes
app.use('/api/interview', interviewTokenRoutes); // Old token-based interview routes (no auth required) - fallback for legacy
app.use('/api/google/calendar', googleCalendarConnectRoutes); // Legacy routes (keep for compatibility)
app.use('/api/calendar', calendarRoutes); // New unified calendar routes
app.use('/api/endorsements', endorsementRoutes);
app.use('/api/placement', placementRoutes);

// Google Calendar OAuth callback for popup flow
// This route is called by Google with the authorization code
// CRITICAL: Use secure handler with email validation
// Support both old and new callback paths for compatibility
app.get('/auth/google/calendar/callback', async (req, res) => {
  // Use secure handler with email validation (googleCalendarConnect.js)
  const { handleOAuthCallback } = await import('./controllers/googleCalendarConnect.js');
  return handleOAuthCallback(req, res);
});

// Legacy callback route (for backward compatibility)
// If Google Cloud Console is configured with /auth/google/callback
// CRITICAL: Use secure handler with email validation
app.get('/auth/google/callback', async (req, res) => {
  // Use secure handler with email validation (googleCalendarConnect.js)
  const { handleOAuthCallback } = await import('./controllers/googleCalendarConnect.js');
  return handleOAuthCallback(req, res);
});

// Additional callback route for /api/calendar/oauth/callback
// This handles redirects from Google Cloud Console if configured with this path
app.get('/api/calendar/oauth/callback', async (req, res) => {
  // Use secure handler with email validation (googleCalendarConnect.js)
  const { handleOAuthCallback } = await import('./controllers/googleCalendarConnect.js');
  return handleOAuthCallback(req, res);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  console.log(`[404] Available routes: /api/calendar/oauth-url, /auth/google/callback, /auth/google/calendar/callback`);
  res.status(404).json({ 
    error: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    suggestion: 'Check if the route exists and if you are authenticated (for protected routes)'
  });
});

// Start server
const PORT = process.env.PORT || 3000 ; // Default to 3000 as per project context

server.listen(PORT,'0.0.0.0',() => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO enabled`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL?.includes('postgresql') ? 'PostgreSQL' : 'SQLite'}`);
  console.log(`🌐 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
  console.log(`📧 Email configured: ${process.env.EMAIL_USER ? 'Yes' : 'No'}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the existing process or use a different port.`);
    console.error(`   Run: lsof -ti:${PORT} | xargs kill -9`);
  } else {
    console.error('❌ Server failed to start:', err);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
