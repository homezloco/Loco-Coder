/**
 * Base API Error class
 */
class ApiError extends Error {
  constructor(message, status, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status || 500;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
    
    // Capture stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 400 Bad Request
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', details = {}) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

/**
 * 401 Unauthorized
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required', details = {}) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

/**
 * 403 Forbidden
 */
class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', details = {}) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

/**
 * 404 Not Found
 */
class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', details = {}) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

/**
 * 409 Conflict
 */
class ConflictError extends ApiError {
  constructor(message = 'Conflict', details = {}) {
    super(message, 409, 'CONFLICT', details);
  }
}

/**
 * 422 Unprocessable Entity
 */
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details = {}) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

/**
 * 429 Too Many Requests
 */
class RateLimitError extends ApiError {
  constructor(message = 'Too many requests', details = {}) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
  }
}

/**
 * 500 Internal Server Error
 */
class InternalServerError extends ApiError {
  constructor(message = 'Internal Server Error', details = {}) {
    super(message, 500, 'INTERNAL_SERVER_ERROR', details);
  }
}

/**
 * 503 Service Unavailable
 */
class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service Unavailable', details = {}) {
    super(message, 503, 'SERVICE_UNAVAILABLE', details);
  }
}

/**
 * Network Error
 */
class NetworkError extends ApiError {
  constructor(message = 'Network Error', details = {}) {
    super(message, 0, 'NETWORK_ERROR', details);
  }
}

/**
 * Timeout Error
 */
class TimeoutError extends ApiError {
  constructor(message = 'Request Timeout', details = {}) {
    super(message, 408, 'TIMEOUT_ERROR', details);
  }
}

/**
 * Handles API errors consistently
 * @param {Error|Response} error - The error or response object
 * @param {Object} [options] - Options for error handling
 * @param {boolean} [options.rethrow=false] - Whether to rethrow the error
 * @param {Function} [options.onError] - Callback for custom error handling
 * @returns {Promise<ApiError>} The processed error
 */
const handleApiError = async (error, options = {}) => {
  const { rethrow = false, onError } = options;
  
  // If it's already an ApiError, just return it
  if (error instanceof ApiError) {
    if (rethrow) throw error;
    return error;
  }
  
  // If it's a Response object, convert it to an error
  if (error instanceof Response) {
    error = await createErrorFromResponse(error);
  }
  
  // Log the error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', error);
  }
  
  // Call custom error handler if provided
  if (typeof onError === 'function') {
    onError(error);
  }
  
  // Re-throw if requested
  if (rethrow) {
    throw error;
  }
  
  return error;
};

/**
 * Creates an appropriate error object from an HTTP response
 * @param {Response} response - The fetch Response object
 * @returns {Promise<ApiError>} An appropriate error instance
 */
const createErrorFromResponse = async (response) => {
  let errorData = {};
  
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      errorData = await response.json();
    }
  } catch (e) {
    console.warn('Failed to parse error response:', e);
  }
  
  const { message = 'An error occurred', code, errors } = errorData;
  const details = { status: response.status, ...errorData };
  
  switch (response.status) {
    case 400:
      return new BadRequestError(message, { ...details, errors });
    case 401:
      return new UnauthorizedError(message, details);
    case 403:
      return new ForbiddenError(message, details);
    case 404:
      return new NotFoundError(message, details);
    case 409:
      return new ConflictError(message, details);
    case 422:
      return new ValidationError(message, { ...details, errors });
    case 429:
      const retryAfter = response.headers.get('Retry-After');
      return new RateLimitError(message, { ...details, retryAfter });
    case 500:
      return new InternalServerError(message, details);
    case 503:
      return new ServiceUnavailableError(message, details);
    default:
      return new ApiError(message, response.status, code, details);
  }
};

export {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  NetworkError,
  TimeoutError,
  createErrorFromResponse,
  handleApiError
};
