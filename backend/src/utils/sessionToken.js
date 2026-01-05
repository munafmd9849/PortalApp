/**
 * Session Token Utility
 * Generates secure, unique tokens for interview session access
 */

import crypto from 'crypto';

/**
 * Generate a secure session token
 * @returns {string} A URL-safe base64 token (32 bytes = 43 characters)
 */
export function generateSessionToken() {
  // Generate 32 random bytes and convert to base64url (URL-safe)
  const randomBytes = crypto.randomBytes(32);
  return randomBytes.toString('base64url');
}

/**
 * Validate session token format
 * @param {string} token - The token to validate
 * @returns {boolean} True if token format is valid
 */
export function isValidTokenFormat(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  // Base64url tokens are typically 32-44 characters
  return token.length >= 32 && token.length <= 44;
}

