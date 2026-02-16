/**
 * Centralized Toast Utility
 * This is the ONLY place where toast APIs are called directly.
 * All components should use these functions instead of calling toast directly.
 */

import { TOAST_TYPES } from '../components/ui/Toast';

// Store reference to toast context
let toastContext = null;

// Deduplication cache to prevent duplicate toasts
const toastCache = new Map();
const TOAST_COOLDOWN = 2000; // 2 seconds cooldown for same message

/**
 * Initialize toast utility with toast context
 * Called once from App.jsx after ToastProvider mounts
 */
export function initToast(toast) {
  toastContext = toast;
  
  // Clean up old cache entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of toastCache.entries()) {
      if (now - timestamp > TOAST_COOLDOWN) {
        toastCache.delete(key);
      }
    }
  }, 5000); // Clean every 5 seconds
}

/**
 * Get toast instance (throws if not initialized)
 */
function getToast() {
  if (!toastContext) {
    console.warn('Toast not initialized. Make sure ToastProvider is mounted and initToast is called.');
    // Fallback to console for development
    return {
      success: (msg) => console.log('✅', msg),
      error: (msg) => console.error('❌', msg),
      warning: (msg) => console.warn('⚠️', msg),
      info: (msg) => console.info('ℹ️', msg),
      loading: (msg) => console.log('⏳', msg),
      dismiss: () => {},
    };
  }
  return toastContext;
}

/**
 * Check if toast message should be shown (deduplication)
 */
function shouldShowToast(message, type) {
  const key = `${type}:${message}`;
  const now = Date.now();
  const lastShown = toastCache.get(key);
  
  if (lastShown && (now - lastShown) < TOAST_COOLDOWN) {
    return false; // Too soon, skip this toast
  }
  
  toastCache.set(key, now);
  return true;
}

/**
 * Show success toast
 */
export function showSuccess(message, title = null, options = {}) {
  // Deduplicate: skip if same success message shown recently
  if (!shouldShowToast(message, 'success')) {
    return null;
  }
  
  return getToast().success(message, title, options);
}

/**
 * Show error toast
 */
export function showError(message, title = null, options = {}) {
  // Deduplicate: skip if same error message shown recently
  if (!shouldShowToast(message, 'error')) {
    return null;
  }
  
  return getToast().error(message, title, {
    duration: 7000, // Longer duration for errors
    ...options,
  });
}

/**
 * Show warning toast
 */
export function showWarning(message, title = null, options = {}) {
  // Deduplicate: skip if same warning message shown recently
  if (!shouldShowToast(message, 'warning')) {
    return null;
  }
  
  return getToast().warning(message, title, options);
}

/**
 * Show info toast
 */
export function showInfo(message, title = null, options = {}) {
  return getToast().info(message, title, options);
}

/**
 * Show loading toast
 * Returns toast ID for dismissal
 */
export function showLoading(message, title = null) {
  const toastId = getToast().show(message, TOAST_TYPES.INFO, title, {
    duration: Infinity, // Loading toasts don't auto-dismiss
  });
  return toastId;
}

/**
 * Dismiss a specific toast by ID
 */
export function dismissToast(toastId) {
  if (toastContext && toastContext.remove) {
    toastContext.remove(toastId);
  }
}

/**
 * Replace loading toast with success/error
 */
export function replaceLoadingToast(loadingToastId, type, message, title = null) {
  dismissToast(loadingToastId);
  if (type === 'success') {
    return showSuccess(message, title);
  } else if (type === 'error') {
    return showError(message, title);
  } else if (type === 'warning') {
    return showWarning(message, title);
  } else {
    return showInfo(message, title);
  }
}

/**
 * Clear all toasts
 */
export function clearAllToasts() {
  if (toastContext && toastContext.clear) {
    toastContext.clear();
  }
}

/**
 * Handle API error and show appropriate toast
 */
export function handleApiError(error, defaultMessage = 'An error occurred') {
  let message = defaultMessage;

  if (error?.response?.data?.message) {
    message = error.response.data.message;
  } else if (error?.response?.data?.error) {
    message = error.response.data.error;
  } else if (error?.message) {
    message = error.message;
  }

  // Network errors - use exact error message from API client
  if (error?.isNetworkError) {
    message = error.message || 'Network error. Please check your connection and try again.';
  } else if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    message = error.message || 'Network error. Please check your connection and try again.';
  }

  // Timeout errors
  if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
    message = 'Request timed out. Please try again.';
  }
  // Suppress noisy server message when there's simply no auth token.
  // Many dev workflows call protected endpoints (health checks) without a token;
  // showing "No token provided" as an error on the landing page is confusing.
  if (error?.response?.status === 401 && (message === 'No token provided' || message === 'No refresh token provided')) {
    console.warn('API returned 401 (no token) — suppressed user toast:', message);
    return message;
  }

  showError(message);
  return message;
}

/**
 * Handle API success and optionally show toast
 */
export function handleApiSuccess(response, showToast = false, customMessage = null) {
  const message = customMessage || response?.message || 'Operation completed successfully';
  if (showToast && message) {
    showSuccess(message);
  }
  return response;
}
