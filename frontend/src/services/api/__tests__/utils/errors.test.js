import {
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
} from '../utils/errors';

describe('Error Utilities', () => {
  describe('Error Classes', () => {
    it('should create ApiError with default values', () => {
      const error = new ApiError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Test error');
      expect(error.status).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.details).toEqual({});
    });

    it('should create specific error types with correct status codes', () => {
      const badRequest = new BadRequestError('Invalid input');
      expect(badRequest).toBeInstanceOf(ApiError);
      expect(badRequest.status).toBe(400);
      expect(badRequest.code).toBe('BAD_REQUEST');

      const unauthorized = new UnauthorizedError('Login required');
      expect(unauthorized.status).toBe(401);
      expect(unauthorized.code).toBe('UNAUTHORIZED');

      const forbidden = new ForbiddenError('Access denied');
      expect(forbidden.status).toBe(403);
      expect(forbidden.code).toBe('FORBIDDEN');

      const notFound = new NotFoundError('Resource not found');
      expect(notFound.status).toBe(404);
      expect(notFound.code).toBe('NOT_FOUND');

      const conflict = new ConflictError('Resource conflict');
      expect(conflict.status).toBe(409);
      expect(conflict.code).toBe('CONFLICT');

      const validation = new ValidationError('Validation failed');
      expect(validation.status).toBe(422);
      expect(validation.code).toBe('VALIDATION_ERROR');

      const rateLimit = new RateLimitError('Too many requests');
      expect(rateLimit.status).toBe(429);
      expect(rateLimit.code).toBe('RATE_LIMIT_EXCEEDED');

      const internal = new InternalServerError('Server error');
      expect(internal.status).toBe(500);
      expect(internal.code).toBe('INTERNAL_SERVER_ERROR');

      const unavailable = new ServiceUnavailableError('Service down');
      expect(unavailable.status).toBe(503);
      expect(unavailable.code).toBe('SERVICE_UNAVAILABLE');

      const network = new NetworkError('Network issue');
      expect(network.status).toBe(0);
      expect(network.code).toBe('NETWORK_ERROR');

      const timeout = new TimeoutError('Request timeout');
      expect(timeout.status).toBe(408);
      expect(timeout.code).toBe('TIMEOUT_ERROR');
    });
  });

  describe('createErrorFromResponse', () => {
    it('should create appropriate error from response status', async () => {
      const responses = [
        { status: 400, errorClass: BadRequestError },
        { status: 401, errorClass: UnauthorizedError },
        { status: 403, errorClass: ForbiddenError },
        { status: 404, errorClass: NotFoundError },
        { status: 409, errorClass: ConflictError },
        { status: 422, errorClass: ValidationError },
        { status: 429, errorClass: RateLimitError },
        { status: 500, errorClass: InternalServerError },
        { status: 503, errorClass: ServiceUnavailableError },
      ];

      for (const { status, errorClass } of responses) {
        const mockResponse = {
          status,
          statusText: 'Error',
          json: () => Promise.resolve({ message: 'Error occurred' }),
          clone: function() { return this; }
        };

        const error = await createErrorFromResponse(mockResponse);
        expect(error).toBeInstanceOf(errorClass);
        expect(error.status).toBe(status);
      }
    });

    it('should handle network errors', async () => {
      const mockResponse = {
        ok: false,
        status: 0,
        statusText: 'Network Error',
        json: () => Promise.reject(new Error('Network error')),
        clone: function() { return this; }
      };

      const error = await createErrorFromResponse(mockResponse);
      expect(error).toBeInstanceOf(NetworkError);
    });

    it('should include response data in error details', async () => {
      const errorData = {
        message: 'Validation failed',
        errors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'password', message: 'Too short' }
        ]
      };

      const mockResponse = {
        status: 422,
        statusText: 'Unprocessable Entity',
        json: () => Promise.resolve(errorData),
        clone: function() { return this; }
      };

      const error = await createErrorFromResponse(mockResponse);
      expect(error.details).toEqual(errorData);
    });
  });

  describe('handleApiError', () => {
    let originalConsoleError;
    let originalConsoleWarn;
    
    beforeEach(() => {
      originalConsoleError = console.error;
      originalConsoleWarn = console.warn;
      console.error = jest.fn();
      console.warn = jest.fn();
    });
    
    afterEach(() => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    });

    it('should log error to console by default', () => {
      const error = new Error('Test error');
      handleApiError(error);
      
      expect(console.error).toHaveBeenCalledWith('API Error:', error);
    });

    it('should call custom error handler if provided', () => {
      const error = new Error('Test error');
      const customHandler = jest.fn();
      
      handleApiError(error, { onError: customHandler });
      
      expect(customHandler).toHaveBeenCalledWith(error);
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should rethrow error if rethrow option is true', () => {
      const error = new Error('Test error');
      
      expect(() => handleApiError(error, { rethrow: true }))
        .toThrow('Test error');
    });

    it('should handle ApiError instances correctly', () => {
      const apiError = new BadRequestError('Invalid input', {
        field: 'email',
        reason: 'Invalid format'
      });
      
      handleApiError(apiError);
      
      expect(console.error).toHaveBeenCalledWith(
        'API Error:', 
        expect.objectContaining({
          message: 'Invalid input',
          status: 400,
          code: 'BAD_REQUEST',
          details: {
            field: 'email',
            reason: 'Invalid format'
          }
        })
      );
    });
  });
});
