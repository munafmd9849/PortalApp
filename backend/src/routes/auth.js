/**
 * Authentication Routes
 * Replaces Firebase Auth SDK calls
 * Handles registration, login, password reset, email verification
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database.js';
import { 
  authenticate, 
  generateAccessToken, 
  generateRefreshToken,
  verifyRefreshToken,
} from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { validateUUID } from '../middleware/validation.js';
import { body, validationResult } from 'express-validator';
import { sendOTP, sendPasswordResetOTP } from '../services/emailService.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * POST /auth/register
 * Register new user (replaces createUserWithEmailAndPassword)
 * Requires OTP verification before registration (optional: can be enforced on frontend)
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').custom((value) => {
    if (!value) return false;
    const upper = value.toUpperCase();
    return ['STUDENT', 'RECRUITER', 'ADMIN'].includes(upper);
  }).withMessage('Role must be STUDENT, RECRUITER, or ADMIN'),
  body('verificationToken').optional().isString(), // Optional: verification token from OTP
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, role: roleFromBody, profile = {}, verificationToken } = req.body;
    // Normalize role to uppercase
    const role = roleFromBody ? roleFromBody.toUpperCase() : undefined;

    // Track if email was verified via OTP
    let emailVerified = false;
    let emailVerifiedAt = null;

    // Optional: Verify OTP verification token if provided (enforce OTP verification)
    // Frontend should send verificationToken from verify-otp endpoint
    if (verificationToken) {
      try {
        const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
        
        // Verify token email matches registration email
        // Token payload has 'email' field, not 'userId'
        if (decoded.email !== email || decoded.type !== 'verification') {
          return res.status(400).json({ error: 'Email verification failed' });
        }

        // Check if OTP was actually verified (exists and is used)
        const otpVerified = await prisma.oTP.findFirst({
          where: {
            email,
            purpose: 'VERIFY_EMAIL',
            isUsed: true,
            expiresAt: { gt: new Date(Date.now() - 10 * 60 * 1000) }, // Verified within last 10 minutes
          },
          orderBy: { createdAt: 'desc' }, // Use createdAt since OTP model doesn't have updatedAt
        });

        if (!otpVerified) {
          return res.status(400).json({ error: 'Email verification required. Please verify OTP first.' });
        }

        // OTP was verified - mark email as verified
        emailVerified = true;
        emailVerifiedAt = new Date();
      } catch (tokenError) {
        return res.status(400).json({ error: 'Invalid verification token. Please verify OTP first.' });
      }
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Validate email domain based on role
    // COMMENTED OUT: Email domain restriction for students
    // if (role === 'STUDENT') {
    //   const emailLower = email.toLowerCase();
    //   const allowedDomains = ['@pwioi.com', '@student.pwioi.com'];
    //   // Allow @gmail.com for testing (remove in production)
    //   if (!allowedDomains.some(d => emailLower.endsWith(d)) && !emailLower.endsWith('@gmail.com')) {
    //     return res.status(400).json({ error: 'Students must use @pwioi.com email' });
    //   }
    // }

    // Use transaction to ensure User and Student/Recruiter/Admin are created atomically
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const userData = {
        email,
        passwordHash,
        role,
        status: role === 'RECRUITER' ? 'PENDING' : 'ACTIVE',
        emailVerified: emailVerified, // Set based on OTP verification
        emailVerifiedAt: emailVerifiedAt, // Set timestamp if verified
        recruiterVerified: role === 'RECRUITER' ? false : undefined,
      };

      const createdUser = await tx.user.create({
        data: userData,
      });

      // Create role-specific profile
      if (role === 'STUDENT') {
        // enrollmentId should be provided by user during profile setup
        // Allow it to be empty during registration - user will fill it later
        // Using null to avoid unique constraint issues with empty strings
        const enrollmentId = profile.enrollmentId?.trim() || null;

        await tx.student.create({
          data: {
            userId: createdUser.id,
            fullName: profile.fullName || createdUser.email, // Use email as fallback for name
            email: createdUser.email,
            phone: profile.phone || '',
            enrollmentId: enrollmentId, // Can be null initially, user will set it later
            school: profile.school || '',
            center: profile.center || '',
            batch: profile.batch || '',
          },
        });
      } else if (role === 'RECRUITER') {
        await tx.recruiter.create({
          data: {
            userId: createdUser.id,
            companyName: profile.companyName,
            location: profile.location,
          },
        });
        
        // Emit Socket.IO event to notify admins of new recruiter registration
        const { getIO } = await import('../config/socket.js');
        const io = getIO();
        if (io) {
          io.to('admins').emit('recruiter:new', {
            id: createdUser.id,
            email: createdUser.email,
            companyName: profile.companyName,
            location: profile.location,
            status: 'PENDING',
            createdAt: new Date(),
          });
        }
      } else if (role === 'ADMIN') {
        await tx.admin.create({
          data: {
            userId: createdUser.id,
            name: profile.name || createdUser.email,
          },
        });
      }

      return createdUser;
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // TODO: Send email verification

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /auth/login
 * Login user (replaces signInWithEmailAndPassword)
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  body('role').optional().custom((value) => {
    if (!value) return true;
    const upper = value.toUpperCase();
    return ['STUDENT', 'RECRUITER', 'ADMIN'].includes(upper);
  }).withMessage('Role must be STUDENT, RECRUITER, or ADMIN'),
  body('selectedRole').optional().custom((value) => {
    if (!value) return true;
    const upper = value.toUpperCase();
    return ['STUDENT', 'RECRUITER', 'ADMIN'].includes(upper);
  }).withMessage('SelectedRole must be STUDENT, RECRUITER, or ADMIN'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, role: roleFromBody, selectedRole } = req.body;
    // Normalize role to uppercase (accept both 'role' and 'selectedRole')
    const role = (selectedRole || roleFromBody) ? (selectedRole || roleFromBody).toUpperCase() : undefined;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        student: true,
        recruiter: true,
        admin: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify role if specified (case-insensitive comparison)
    if (role && user.role.toUpperCase() !== role.toUpperCase()) {
      return res.status(403).json({ error: 'Invalid role for this account' });
    }

    // Check status
    if (user.status === 'BLOCKED') {
      return res.status(403).json({ error: 'Account is blocked' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Login error:', error);
    logger.error('Login error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      meta: error.meta,
    });
    res.status(500).json({ 
      error: 'Login failed',
      message: error.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', verifyRefreshToken, async (req, res) => {
  try {
    const newAccessToken = generateAccessToken(req.user.id);

    res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * POST /auth/logout
 * Logout user (invalidate refresh token)
 * 
 * IMPORTANT: This endpoint ONLY clears refresh tokens for session management.
 * Google Calendar tokens are NOT cleared on logout - they persist in the database
 * so the calendar remains connected when the user logs back in.
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const refreshToken = req.body.refreshToken;

    // Delete refresh token if provided
    // NOTE: We explicitly do NOT delete GoogleCalendarToken records here.
    // Calendar connection should persist across logout/login cycles.
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /auth/me
 * Get current user (replaces onAuthStateChanged)
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        student: true,
        recruiter: {
          include: { company: true },
        },
        admin: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        profilePhoto: user.profilePhoto,
        student: user.student,
        recruiter: user.recruiter,
        admin: user.admin,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * PUT /auth/profile
 * Update current user profile (displayName, profilePhoto)
 */
router.put('/profile', authenticate, [
  body('displayName').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('profilePhoto').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { displayName, profilePhoto } = req.body;
    const updateData = {};

    if (displayName !== undefined) {
      updateData.displayName = displayName.trim() || null;
    }

    if (profilePhoto !== undefined) {
      updateData.profilePhoto = profilePhoto.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        displayName: true,
        profilePhoto: true,
        emailVerified: true,
      },
    });

    res.json({
      user: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * POST /auth/reset-password
 * Request password reset - sends OTP to email
 */
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    logger.info(`=== Password Reset Request Received ===`);
    logger.info(`Request body:`, JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error(`Validation errors:`, errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    
    // Email should be normalized by express-validator's normalizeEmail()
    // But let's ensure it's lowercase for database lookup (case-sensitive matching)
    const normalizedEmail = email ? email.toLowerCase().trim() : '';
    
    logger.info(`Email from request body: ${email}`);
    logger.info(`Normalized email: ${normalizedEmail}`);
    
    if (!email || !normalizedEmail) {
      logger.error(`Email is missing or empty in request body!`);
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists (try both normalized and original email)
    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    
    if (!user) {
      // Try original email in case normalization didn't work
      user = await prisma.user.findUnique({ where: { email } });
    }
    
    if (!user) {
      // Don't reveal if email exists - security best practice
      // But return consistent format for frontend (don't create OTP if user doesn't exist)
      logger.info(`Password reset requested for non-existent email: ${normalizedEmail} (original: ${email})`);
      
      // Return consistent format but don't create OTP (security: don't reveal if email exists)
      // Frontend will show UI, but OTP verification will fail (which is fine for security)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      return res.json({ 
        success: true,
        message: 'If email exists, password reset OTP sent',
        otpStatus: 'PENDING_VERIFICATION',
        otpExpiresAt: expiresAt.toISOString(),
      });
    }
    
    // Use the email from the database (source of truth)
    const dbEmail = user.email;
    logger.info(`Password reset requested for existing user: ${dbEmail} (ID: ${user.id}, requested: ${normalizedEmail})`);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in database with 10-minute expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate any existing password reset OTPs for this email (use DB email)
    await prisma.oTP.updateMany({
      where: {
        email: dbEmail,
        purpose: 'RESET_PASSWORD',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      data: { isUsed: true },
    });

    // Create new password reset OTP (use DB email - source of truth)
    const otpRecord = await prisma.oTP.create({
      data: {
        email: dbEmail,
        otp,
        purpose: 'RESET_PASSWORD',
        expiresAt,
      },
    });

    logger.info(`Password reset OTP created in database: ${otpRecord.id} for ${email}`);

    // Send password reset OTP via email (asynchronously)
    // NOTE: Send email asynchronously - don't block the response
    // OTP is already stored in DB, so we can respond immediately
    try {
      logger.info(`Attempting to send password reset OTP to ${dbEmail}`);
      
      // Send email in background (fire and forget)
      // If email fails, user can request OTP again
      sendPasswordResetOTP(dbEmail, otp).then(() => {
        logger.info(`Password reset OTP email sent successfully to ${dbEmail}`);
      }).catch((emailError) => {
        logger.error(`Failed to send password reset OTP email to ${dbEmail}:`, emailError);
        logger.error(`Email error details:`, {
          message: emailError.message,
          stack: emailError.stack,
          code: emailError.code,
        });
        // Don't delete OTP - user might have received it despite error
      });
      
      // Respond immediately - don't wait for email
      logger.info(`Password reset OTP created and email sending initiated for ${dbEmail} (OTP: ${otp}, Record ID: ${otpRecord.id})`);
      res.json({
        success: true,
        message: 'If email exists, password reset OTP sent',
        otpStatus: 'PENDING_VERIFICATION',
        otpExpiresAt: expiresAt.toISOString(),
      });
    } catch (emailError) {
      logger.error(`Failed to initiate password reset OTP email to ${dbEmail}:`, emailError);
      logger.error(`Email error details:`, {
        message: emailError.message,
        stack: emailError.stack,
        code: emailError.code,
      });
      
      // Still respond with success since OTP is in DB
      // User can try requesting OTP again if email fails
      res.json({
        success: true,
        message: 'If email exists, password reset OTP sent',
        otpStatus: 'PENDING_VERIFICATION',
        otpExpiresAt: expiresAt.toISOString(),
      });
    }
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

/**
 * POST /auth/send-otp
 * Send OTP to email for verification (required before registration)
 */
router.post('/send-otp', [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in database with 5-minute expiration
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate any existing OTPs for this email
    await prisma.oTP.updateMany({
      where: {
        email,
        purpose: 'VERIFY_EMAIL',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      data: { isUsed: true },
    });

    // Create new OTP
    await prisma.oTP.create({
      data: {
        email,
        otp,
        purpose: 'VERIFY_EMAIL',
        expiresAt,
      },
    });

    // Send OTP via email (with timeout to prevent hanging)
    // NOTE: Send email asynchronously - don't block the response
    // OTP is already stored in DB, so we can respond immediately
    try {
      logger.info(`Attempting to send OTP to ${email}`);
      
      // Send email in background (fire and forget)
      // If email fails, user can request OTP again
      sendOTP(email, otp).catch((emailError) => {
        logger.error(`Failed to send OTP email to ${email}:`, emailError);
        // Don't delete OTP - user might have received it despite error
      });
      
      // Respond immediately - don't wait for email
      logger.info(`OTP created and email sending initiated for ${email}`);
      res.json({
        success: true,
        message: 'OTP sent to your email. Please check your inbox.',
        expiresIn: 300, // 5 minutes in seconds
        otpStatus: 'PENDING_VERIFICATION',
        otpExpiresAt: expiresAt.toISOString(), // ISO timestamp
      });
    } catch (emailError) {
      logger.error(`Failed to initiate OTP email to ${email}:`, emailError);
      
      // Still respond with success since OTP is in DB
      // User can try requesting OTP again if email fails
      res.json({
        success: true,
        message: 'OTP created. If you don\'t receive an email, please try again.',
        expiresIn: 300,
        otpStatus: 'PENDING_VERIFICATION',
        otpExpiresAt: expiresAt.toISOString(), // ISO timestamp
      });
    }
  } catch (error) {
    logger.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

/**
 * POST /auth/verify-otp
 * Verify OTP before allowing registration
 */
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).matches(/^\d+$/),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    // Find valid OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email,
        otp,
        purpose: 'VERIFY_EMAIL',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    // Return verification token (or just success - frontend will use this for registration)
    res.json({
      success: true,
      message: 'OTP verified successfully',
      verified: true,
      email,
      // Store email in token payload as 'email' field, not 'userId'
      verificationToken: jwt.sign({ email, type: 'verification' }, process.env.JWT_SECRET, { expiresIn: '10m' }),
    });
  } catch (error) {
    logger.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

/**
 * POST /auth/verify-reset-otp
 * Verify password reset OTP
 */
router.post('/verify-reset-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).matches(/^\d+$/),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    // Find valid password reset OTP
    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email,
        otp,
        purpose: 'RESET_PASSWORD',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    // Return reset token for password update
    res.json({
      success: true,
      message: 'Reset code verified successfully',
      verified: true,
      email,
      resetToken: jwt.sign({ email, userId: user.id, type: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '15m' }),
    });
  } catch (error) {
    logger.error('Verify reset OTP error:', error);
    res.status(500).json({ error: 'Failed to verify reset code' });
  }
});

/**
 * POST /auth/update-password
 * Update password after reset OTP verification
 */
router.post('/update-password', [
  body('resetToken').notEmpty(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { resetToken, password } = req.body;

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        return res.status(400).json({ error: 'Invalid reset token' });
      }
    } catch (tokenError) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Find user
    const user = await prisma.user.findUnique({ 
      where: { email: decoded.email },
    });

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Verify that a password reset OTP was verified recently (within last 15 minutes)
    const otpVerified = await prisma.oTP.findFirst({
      where: {
        email: decoded.email,
        purpose: 'RESET_PASSWORD',
        isUsed: true,
        expiresAt: { gt: new Date(Date.now() - 15 * 60 * 1000) }, // Verified within last 15 minutes
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpVerified) {
      return res.status(400).json({ error: 'Reset code verification required. Please verify OTP first.' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    logger.info(`Password updated successfully for user ${user.email}`);

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    logger.error('Update password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
