/**
 * Authentication Middleware
 * Replaces Firebase Auth token verification
 * JWT-based authentication with refresh token support
 */

import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

/**
 * Verify JWT token and attach user to request
 */
export async function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        student: true,
        recruiter: true,
        admin: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.status === 'BLOCKED') {
      return res.status(403).json({ error: 'Account is blocked' });
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if token exists in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    req.user = tokenRecord.user;
    req.refreshToken = refreshToken;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(userId) {
  return jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(userId) {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}
