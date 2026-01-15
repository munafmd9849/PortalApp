/**
 * Standardized API Response Helpers
 * Ensures consistent response format across all endpoints
 */

/**
 * Send standardized success response
 */
export function sendSuccess(res, data = null, message = null, statusCode = 200) {
  const response = {
    success: true,
  };
  
  if (message) {
    response.message = message;
  }
  
  if (data !== null) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Send standardized error response
 */
export function sendError(res, error, message = null, statusCode = 400) {
  const response = {
    success: false,
    error: error,
  };
  
  if (message) {
    response.message = message;
  } else if (error) {
    // Use error as message if no explicit message provided
    response.message = error;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Send standardized validation error
 */
export function sendValidationError(res, field, message) {
  return sendError(res, `Validation failed: ${field}`, message || `Invalid value for ${field}`, 400);
}

/**
 * Send standardized not found error
 */
export function sendNotFound(res, resource = 'Resource') {
  return sendError(res, `${resource} not found`, `The requested ${resource.toLowerCase()} does not exist.`, 404);
}

/**
 * Send standardized unauthorized error
 */
export function sendUnauthorized(res, message = 'Authentication required') {
  return sendError(res, 'Unauthorized', message, 401);
}

/**
 * Send standardized forbidden error
 */
export function sendForbidden(res, message = 'Access denied') {
  return sendError(res, 'Forbidden', message, 403);
}

/**
 * Send standardized server error
 */
export function sendServerError(res, message = 'An internal server error occurred') {
  return sendError(res, 'Internal server error', message, 500);
}
