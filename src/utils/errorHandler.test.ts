import {
  analyzeError,
  getUserFriendlyMessage,
  ErrorCategory,
  isRetryable,
  createErrorPayload,
} from './errorHandler';

describe('errorHandler', () => {
  describe('analyzeError', () => {
    it('should categorize network errors', () => {
      const error = new Error('Network Error');
      error.name = 'NetworkError';
      const result = analyzeError(error);
      expect(result.type).toBe(ErrorCategory.NETWORK);
      expect(result.retryable).toBe(true);
    });

    it('should categorize server errors (500)', () => {
      const error = {
        response: { status: 500 },
        message: 'Internal Server Error',
      } as any;
      const result = analyzeError(error);
      expect(result.type).toBe(ErrorCategory.SERVER);
      expect(result.retryable).toBe(true);
    });

    it('should categorize client errors (400)', () => {
      const error = {
        response: { status: 400 },
        message: 'Bad Request',
      } as any;
      const result = analyzeError(error);
      expect(result.type).toBe(ErrorCategory.VALIDATION);
      expect(result.retryable).toBe(false);
    });

    it('should categorize authentication errors (401)', () => {
      const error = {
        response: { status: 401 },
        message: 'Unauthorized',
      } as any;
      const result = analyzeError(error);
      expect(result.type).toBe(ErrorCategory.PERMISSION);
      expect(result.retryable).toBe(false);
    });

    it('should categorize business logic errors', () => {
      const error = {
        response: { status: 403 },
        message: 'Insufficient balance',
        code: 'INSUFFICIENT_BALANCE',
      } as any;
      const result = analyzeError(error);
      expect(result.type).toBe(ErrorCategory.BUSINESS);
      expect(result.retryable).toBe(false);
    });

    it('should default to unknown errors', () => {
      const error = new Error('Something unexpected');
      const result = analyzeError(error);
      expect(result.type).toBe(ErrorCategory.UNKNOWN);
      expect(result.retryable).toBe(false);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return network error message', () => {
      const error = new Error('Network Error');
      error.name = 'NetworkError';
      const result = analyzeError(error);
      const message = getUserFriendlyMessage(result);
      expect(message).toContain('网络连接不稳定');
    });

    it('should return validation error message', () => {
      const error = {
        response: { status: 400 },
        message: 'Bad Request',
      } as any;
      const result = analyzeError(error);
      const message = getUserFriendlyMessage(result);
      expect(message).toContain('参数错误');
    });

    it('should return permission error message', () => {
      const error = {
        response: { status: 401 },
        message: 'Unauthorized',
      } as any;
      const result = analyzeError(error);
      const message = getUserFriendlyMessage(result);
      expect(message).toContain('登录状态已过期');
    });

    it('should return server error message', () => {
      const error = {
        response: { status: 500 },
        message: 'Internal Server Error',
      } as any;
      const result = analyzeError(error);
      const message = getUserFriendlyMessage(result);
      expect(message).toContain('服务暂时不可用');
    });
  });

  describe('isRetryable', () => {
    it('should return true for network errors', () => {
      const error = new Error('Network Error');
      error.name = 'NetworkError';
      expect(isRetryable(error)).toBe(true);
    });

    it('should return true for server errors', () => {
      const error = { response: { status: 500 } } as any;
      expect(isRetryable(error)).toBe(true);
    });

    it('should return false for client errors', () => {
      const error = { response: { status: 400 } } as any;
      expect(isRetryable(error)).toBe(false);
    });

    it('should return false for permission errors', () => {
      const error = { response: { status: 401 } } as any;
      expect(isRetryable(error)).toBe(false);
    });
  });

  describe('createErrorPayload', () => {
    it('should create error payload with default values', () => {
      const error = new Error('Test error');
      const payload = createErrorPayload(error);
      expect(payload.message).toBe('Test error');
      expect(payload.type).toBeDefined();
      expect(payload.retryable).toBeDefined();
      expect(payload.timestamp).toBeDefined();
    });

    it('should allow custom options', () => {
      const error = new Error('Custom error');
      const payload = createErrorPayload(error, {
        showAlert: true,
        redirectTo: '/login',
      });
      expect(payload.showAlert).toBe(true);
      expect(payload.redirectTo).toBe('/login');
    });
  });
});
