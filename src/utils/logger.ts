// 日志工具类 - 控制开发日志输出

// 动态检查环境变量
const isDebugEnabled = () => {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEBUG_LOGS === 'true';
};

export const logger = {
  // 开发环境下的调试日志
  debug: (message: string, ...args: any[]) => {
    if (isDebugEnabled()) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  // 信息日志
  info: (message: string, ...args: any[]) => {
    if (isDebugEnabled()) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  // 警告日志
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  // 错误日志 - 始终输出
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  // API 调试日志
  api: (method: string, url: string, ...args: any[]) => {
    if (isDebugEnabled()) {
      console.log(`[API] ${method} ${url}`, ...args);
    }
  },

  // 认证相关日志
  auth: (message: string, ...args: any[]) => {
    if (isDebugEnabled()) {
      console.log(`[AUTH] ${message}`, ...args);
    }
  },

  // 业务逻辑日志
  business: (message: string, ...args: any[]) => {
    if (isDebugEnabled()) {
      console.log(`[BUSINESS] ${message}`, ...args);
    }
  }
};

// 便捷方法
export const log = {
  debug: logger.debug,
  info: logger.info,
  warn: logger.warn,
  error: logger.error,
  api: logger.api,
  auth: logger.auth,
  business: logger.business
};

export default logger;
