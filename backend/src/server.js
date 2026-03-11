/**
 * Express Server Setup
 * Main entry point for backend API
 * Replaces Firebase Functions/backend
 */

// CRITICAL: Load environment variables FIRST before any imports that use them
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the backend root directory (parent of src/)
dotenv.config({ path: join(__dirname, '../.env') });

// Now import modules that depend on environment variables
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import recruiterScreeningRoutes from './routes/recruiterScreening.js';
import adminScreeningRoutes from './routes/adminScreening.js';
import adminJobsRoutes from './routes/adminJobs.js';
import adminDashboardRoutes from './routes/adminDashboard.js'; // NEW: Serve-side aggregation
import announcementsRoutes from './routes/announcements.js';
import superAdminRoutes from './routes/superAdmin.js';
import publicRoutes from './routes/public.js';
import resumeViewRoutes from './routes/resumeView.js';
import auditLogRoutes from './routes/auditLogs.js';

// ============================================
// STARTUP VALIDATION: Required Environment Variables
// ============================================
const isDevelopment = process.env.NODE_ENV !== 'production';
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  // Hard fail in all environments (database is mandatory)
  console.error('❌ CRITICAL: Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 This project requires DATABASE_URL to run.');
  process.exit(1);
}

// Validate DATABASE_URL format for PostgreSQL
const dbUrl = process.env.DATABASE_URL || '';
const dbUrlLower = dbUrl.toLowerCase();
if (!dbUrlLower.startsWith('postgresql://') && !dbUrlLower.startsWith('postgres://')) {
  console.error('❌ CRITICAL: DATABASE_URL must be a PostgreSQL connection string (postgresql:// or postgres://).');
  console.error(`   Current value: ${dbUrl.substring(0, 20)}...`);
  process.exit(1);
}

// Validate FRONTEND_URL format
const frontendUrl = process.env.FRONTEND_URL;
if (frontendUrl && !frontendUrl.startsWith('http://') && !frontendUrl.startsWith('https://')) {
  console.error('❌ CRITICAL: FRONTEND_URL must start with http:// or https://');
  console.error(`   Current value: ${frontendUrl}`);
  process.exit(1);
}

// Connection validation (fail fast) + safe logging of database
function logDatabaseTarget() {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    // Extract host from PostgreSQL connection string
    const match = dbUrl.match(/@([^:]+):(\d+)\//);
    if (match) {
      const host = match[1];
      const port = match[2];
      console.log(`🗄️  Database: PostgreSQL (${host}:${port})`);
    } else {
      console.log('🗄️  Database: PostgreSQL');
    }
  } catch {
    console.log('🗄️  Database: PostgreSQL');
  }
}

// DEBUG: Verify .env loading for Google AI
console.log('🔍 [DEBUG] Environment Variables Check:');
console.log('  - GOOGLE_AI_API_KEY:', process.env.GOOGLE_AI_API_KEY ? `${process.env.GOOGLE_AI_API_KEY.substring(0, 10)}...${process.env.GOOGLE_AI_API_KEY.substring(process.env.GOOGLE_AI_API_KEY.length - 5)} (${process.env.GOOGLE_AI_API_KEY.length} chars)` : '❌ NOT SET');
console.log('  - GOOGLE_AI_MODEL:', process.env.GOOGLE_AI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash (default)');
console.log('  - GOOGLE_AI_MAX_TOKENS:', process.env.GOOGLE_AI_MAX_TOKENS || '2048 (default)');
console.log('  - GOOGLE_AI_TEMPERATURE:', process.env.GOOGLE_AI_TEMPERATURE || '0.7 (default)');
console.log('  - AI_ENABLED:', process.env.AI_ENABLED !== 'false' ? 'true' : 'false');
console.log('  - FRONTEND_URL:', process.env.FRONTEND_URL);
logDatabaseTarget();

const app = express();

// Required for Vercel/proxy: express-rate-limit needs trust proxy when X-Forwarded-For is set
app.set('trust proxy', 1);

const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);
// io is exported from socket.js config for use in controllers

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Get allowed origins from environment variable
    // CORS_ORIGIN can be a comma-separated list for multiple origins
    let allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : [];

    // If no CORS_ORIGIN is set
    if (allowedOrigins.length === 0) {
      if (isDevelopment) {
        // Development: Use FRONTEND_URL if available, otherwise warn
        if (process.env.FRONTEND_URL) {
          allowedOrigins = [process.env.FRONTEND_URL];
          console.warn('⚠️  CORS_ORIGIN not set, using FRONTEND_URL for CORS:', process.env.FRONTEND_URL);
        } else {
          console.warn('⚠️  CORS_ORIGIN and FRONTEND_URL not set. CORS may not work properly.');
          console.warn('   Please set CORS_ORIGIN or FRONTEND_URL in your .env file');
        }
      } else {
        // Production: Fail fast
        console.error('❌ CRITICAL: CORS_ORIGIN environment variable is not set.');
        console.error('   Please set CORS_ORIGIN in your .env file (e.g., CORS_ORIGIN=https://your-frontend-domain.com)');
        process.exit(1);
      }
    }

    // In development, also allow localhost on any port
    if (isDevelopment && origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
      return callback(null, true);
    }

    // Allow requests from configured origins
    if (!origin || allowedOrigins.includes(origin)) {
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

// Root route - API information
app.get('/', (req, res) => {
  res.json({
    message: 'PWIOI Placement Portal API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      documentation: 'See API documentation for available endpoints'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
// Public routes (NO AUTH) - must come before authenticated routes
app.use('/api/public', publicRoutes);
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
app.use('/api/interview-sessions', interviewSchedulingRoutes); // Direct route alias for frontend compatibility
app.use('/api/interview', interviewerRoutes); // New interviewer token-based routes (no auth required) - MUST come before old routes
app.use('/api/interview', interviewTokenRoutes); // Old token-based interview routes (no auth required) - fallback for legacy
app.use('/api/google/calendar', googleCalendarConnectRoutes); // Legacy routes (keep for compatibility)
app.use('/api/calendar', calendarRoutes); // New unified calendar routes
app.use('/api/endorsements', endorsementRoutes);
app.use('/api/placement', placementRoutes);
app.use('/api/recruiter', recruiterScreeningRoutes); // Token-based recruiter screening (no login)
app.use('/api/resume', resumeViewRoutes); // Resume view by token (inline, for new tab)
app.use('/api/admin', adminScreeningRoutes); // Admin screening management routes
app.use('/api/admin', adminJobsRoutes); // Admin job applicants tracking routes
app.use('/api/admin/dashboard', adminDashboardRoutes); // NEW: Server-side dashboard stats
app.use('/api/announcements', announcementsRoutes);
app.use('/api/super-admin', superAdminRoutes); // Super Admin: create/disable admins, stats
app.use('/api/admin/audit-logs', auditLogRoutes); // Audit Logs: SUPER_ADMIN only

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

// Start server (after validating DB connectivity)
const PORT = process.env.PORT || 3000; // Default to 3000 as per project context

async function start() {
  let dbConnected = false;
  let dbQuotaExceeded = false;

  // Retry logic for Render free tier databases (they spin down after inactivity)
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds between retries

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`🔄 Retrying database connection (attempt ${attempt}/${maxRetries})...`);
      } else {
        console.log('🔄 Connecting to database...');
      }

      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
      console.log('✅ Database connection successful');
      break;
    } catch (dbErr) {
      const errorCode = dbErr?.code || '';
      const errorMessage = dbErr?.message || String(dbErr);

      // Check if it's a quota error - allow server to start but warn
      if (errorMessage.includes('quota')) {
        dbQuotaExceeded = true;
        console.warn('⚠️  WARNING: Database quota exceeded. Server will start but database queries will fail.');
        console.warn('   Some features may not work until quota resets. The server will continue running.');
        dbConnected = false;
        break;
      }

      // For connection errors (P1001, P1017), retry (database might be sleeping)
      if (errorCode === 'P1001' || errorCode === 'P1017' || errorCode === 'P2024' ||
        errorMessage.includes("Can't reach database") ||
        errorMessage.includes('connection pool') ||
        errorMessage.includes('Timed out')) {
        if (attempt < maxRetries) {
          console.warn(`⚠️  Database connection failed (attempt ${attempt}/${maxRetries}):`);
          console.warn(`   ${errorMessage.substring(0, 100)}...`);
          console.warn(`   💡 Render free tier databases spin down after ~90s inactivity`);
          console.warn(`   💡 Database may need 30-60 seconds to wake up`);
          console.warn(`   ⏳ Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        } else {
          // Final attempt failed
          console.error('\n❌ CRITICAL: Failed to connect to database after all retries.');
          console.error(`   Error: ${errorMessage}`);
          console.error(`   Code: ${errorCode}`);
          console.error('\n💡 Troubleshooting steps:');
          console.error('   1. Check Render dashboard - database may be paused/stopped');
          console.error('   2. Render free tier databases spin down after ~90s inactivity');
          console.error('   3. Database needs 30-60 seconds to wake up (first query triggers wake-up)');
          console.error('   4. Verify DATABASE_URL in .env file is correct');
          console.error('   5. Try accessing database from Render dashboard to wake it up');
          console.error('   6. Check network connectivity');
          console.error('   7. If using free tier, consider upgrading or using a different database');
          process.exit(1);
        }
      } else {
        // For other errors, fail fast
        console.error('❌ CRITICAL: Failed to connect to database. Server will not start.');
        console.error(`   Error: ${errorMessage}`);
        console.error(`   Code: ${errorCode}`);
        process.exit(1);
      }
    }
  }

  // Start server regardless of quota status
  try {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      if (!dbConnected) {
        console.log(`   ⚠️  Database quota exceeded - limited functionality until quota resets`);
      }
      console.log(`📡 Socket.IO enabled`);
      console.log(`🌐 CORS origin: ${process.env.CORS_ORIGIN || 'NOT SET (CRITICAL)'}`);
      console.log(`🌍 Frontend URL: ${process.env.FRONTEND_URL}`);
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
  } catch (listenErr) {
    console.error('❌ Server failed to start:', listenErr);
    process.exit(1);
  }
}

start();

// Scheduled task: Check for jobs with passed deadlines and send recruiter screening emails
// Runs every hour
import { checkAndSendScreeningEmails } from './services/screeningEmailService.js';
import { checkAndSendDriveReminders } from './services/driveReminderService.js';

let screeningEmailInterval = null;
let driveReminderInterval = null;

// Track if database quota is exceeded (set during server startup)
let dbQuotaExceeded = false;

function startScreeningEmailScheduler() {
  let consecutiveQuotaErrors = 0;
  const MAX_QUOTA_ERRORS = 3; // After 3 consecutive quota errors, reduce logging

  // If we already know quota is exceeded, delay initial check longer
  const initialDelay = dbQuotaExceeded ? 60000 : 30000; // 60s if quota exceeded, 30s otherwise

  // Run immediately on startup (for jobs that already passed deadline)
  setTimeout(async () => {
    try {
      const result = await checkAndSendScreeningEmails();
      if (result && result.skipped && result.reason === 'database_quota_exceeded') {
        consecutiveQuotaErrors++;
        if (consecutiveQuotaErrors === 1) {
          console.warn(`⚠️ [Deadline Email] Database quota exceeded. Email checks paused until quota resets.`);
        }
      } else {
        consecutiveQuotaErrors = 0;
        if (dbQuotaExceeded) {
          console.log(`✅ [Deadline Email] Database quota available again. Resuming email checks.`);
          dbQuotaExceeded = false;
        }
        console.log(`✅ [Deadline Email] Initial check complete: ${result?.processed || 0} job(s) processed`);
      }
    } catch (error) {
      if (error.message && error.message.includes('quota')) {
        consecutiveQuotaErrors++;
        if (consecutiveQuotaErrors === 1) {
          console.warn(`⚠️ [Deadline Email] Database quota exceeded. Email checks paused until quota resets.`);
        }
      } else {
        console.error('❌ [Deadline Email] Error in initial check:', error.message || error);
      }
    }
  }, initialDelay);

  // Then run every 1 minute (near-real-time as required)
  // Changed from 1 hour to 1 minute for immediate email delivery
  screeningEmailInterval = setInterval(async () => {
    try {
      const result = await checkAndSendScreeningEmails();

      if (result && result.skipped && result.reason === 'database_quota_exceeded') {
        consecutiveQuotaErrors++;
        // Only log quota errors occasionally to reduce spam (every 10th error or first 3)
        if (consecutiveQuotaErrors <= MAX_QUOTA_ERRORS || consecutiveQuotaErrors % 10 === 0) {
          console.warn(`⚠️ [Deadline Email] Database quota exceeded (${consecutiveQuotaErrors} consecutive). Email checks paused. Will resume when quota resets.`);
        }
      } else {
        // Reset counter on success
        if (consecutiveQuotaErrors > 0) {
          console.log(`✅ [Deadline Email] Database quota available. Resuming email checks.`);
          consecutiveQuotaErrors = 0;
        }
        if (result && result.processed > 0) {
          const checkTime = new Date().toISOString();
          console.log(`✅ [Deadline Email] Check complete at ${checkTime}: ${result.processed} job(s) processed, ${result.results?.filter(r => r.status === 'sent').length || 0} email(s) sent`);
        }
      }
    } catch (error) {
      if (error.message && error.message.includes('quota')) {
        consecutiveQuotaErrors++;
        // Only log quota errors occasionally to reduce spam
        if (consecutiveQuotaErrors <= MAX_QUOTA_ERRORS || consecutiveQuotaErrors % 10 === 0) {
          console.warn(`⚠️ [Deadline Email] Database quota exceeded (${consecutiveQuotaErrors} consecutive). Email checks paused. Will resume when quota resets.`);
        }
      } else {
        console.error(`❌ [Deadline Email] Error in scheduled check:`, error.message || error);
        consecutiveQuotaErrors = 0; // Reset on non-quota errors
      }
    }
  }, 60 * 1000); // Every 1 minute (60 seconds) - near-real-time

  console.log('📅 [Deadline Email] Scheduler started (runs every 1 minute for near-real-time delivery)');
}

// Drive reminder scheduler: 7d / 3d / 24h before drive (recruiter+admin; 24h also to applicants)
function startDriveReminderScheduler() {
  const run = async () => {
    try {
      const result = await checkAndSendDriveReminders();
      if (result.sent > 0) {
        console.log(`✅ [Drive Reminder] Sent ${result.sent} reminder(s) for ${result.processed} job(s) checked`);
      }
    } catch (err) {
      console.error('❌ [Drive Reminder] Error:', err.message || err);
    }
  };
  // Run once after 2 minutes, then every 24 hours (so we hit "7 days before", "3 days before", "1 day before" once per job)
  setTimeout(run, 2 * 60 * 1000);
  driveReminderInterval = setInterval(run, 24 * 60 * 60 * 1000);
  console.log('📅 [Drive Reminder] Scheduler started (runs daily for 7d/3d/24h reminders)');
}

// Start schedulers
startScreeningEmailScheduler();
startDriveReminderScheduler();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (screeningEmailInterval) clearInterval(screeningEmailInterval);
  if (driveReminderInterval) clearInterval(driveReminderInterval);
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  if (screeningEmailInterval) clearInterval(screeningEmailInterval);
  if (driveReminderInterval) clearInterval(driveReminderInterval);
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
