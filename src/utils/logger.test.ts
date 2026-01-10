import { logger } from './logger';

// 简单的测试验证
describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // 捕获console调用
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // 设置环境变量以启用日志
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEBUG_LOGS = 'true';
  });

  afterEach(() => {
    // 清理mock
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    delete process.env.ENABLE_DEBUG_LOGS;
  });

  it('should log debug messages when DEBUG_MODE is true', () => {
    logger.debug('Test message');
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('should not log debug messages when DEBUG_MODE is false', () => {
    delete process.env.ENABLE_DEBUG_LOGS;
    logger.debug('This should not appear');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should include tag in log messages', () => {
    logger.info('Test message');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]')
    );
  });

  it('should support different log methods', () => {
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warn message');
    logger.error('Error message');
    expect(consoleLogSpy).toHaveBeenCalledTimes(2); // debug and info
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('should support API log method', () => {
    logger.api('GET', '/api/test');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[API]')
    );
  });

  it('should support auth log method', () => {
    logger.auth('User logged in');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AUTH]')
    );
  });

  it('should support business log method', () => {
    logger.business('Order created');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[BUSINESS]')
    );
  });
});

describe('Logger - Production Mode', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    delete process.env.ENABLE_DEBUG_LOGS;
    process.env.NODE_ENV = 'production';
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should not log debug in production mode', () => {
    logger.debug('Should not appear');
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should still log errors in production mode', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('Error should appear');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
