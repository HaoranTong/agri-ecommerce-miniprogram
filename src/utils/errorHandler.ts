import Taro from '@tarojs/taro';

export interface AppError {
  code: string;
  message: string;
  type: ErrorType;
  details?: any;
  retryable?: boolean;
}

export type ErrorType =
  | 'network'
  | 'validation'
  | 'permission'
  | 'server'
  | 'business'
  | 'unknown';

// 错误类型枚举（用于测试）
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  SERVER = 'server',
  BUSINESS = 'business',
  UNKNOWN = 'unknown'
}

// 错误消息映射
const ERROR_MESSAGE_MAP: Record<string, string> = {
  'network': '网络连接异常，请检查网络后重试',
  'timeout': '请求超时，请检查网络后重试',
  'connection': '网络连接失败，请检查网络设置',
  'unauthorized': '登录已过期，请重新登录',
  'forbidden': '没有权限执行此操作',
  'not_found': '请求的资源不存在',
  'validation': '输入数据格式不正确',
  'business': '业务处理失败',
  'server': '服务器错误，请稍后重试',
  'unknown': '未知错误，请稍后重试'
};

// 重试策略配置
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1秒
  backoffMultiplier: 2
};

// 分析错误类型
export const analyzeError = (error: any): AppError => {
  let code = 'unknown';
  let type: ErrorType = 'unknown';
  let message = '未知错误';
  let retryable = false;

  // 首先检查HTTP状态码（来自axios/fetch响应）
  if (error?.response?.status) {
    const status = error.response.status;
    if (status >= 500) {
      type = 'server';
      code = 'server_error';
      message = ERROR_MESSAGE_MAP.server;
      retryable = true;
    } else if (status === 401) {
      type = 'permission';
      code = 'unauthorized';
      message = ERROR_MESSAGE_MAP.unauthorized;
    } else if (status === 403) {
      // 检查是否是业务逻辑错误（如余额不足）
      if (error?.code === 'INSUFFICIENT_BALANCE' || error?.message?.includes('余额')) {
        type = 'business';
        code = error?.code || 'business_error';
        message = error?.message || ERROR_MESSAGE_MAP.business;
      } else {
        type = 'permission';
        code = 'forbidden';
        message = ERROR_MESSAGE_MAP.forbidden;
      }
    } else if (status === 404) {
      type = 'unknown';
      code = 'not_found';
      message = ERROR_MESSAGE_MAP.not_found;
    } else if (status >= 400 && status < 500) {
      type = 'validation';
      code = 'bad_request';
      message = ERROR_MESSAGE_MAP.validation;
    }
    return {
      code,
      message,
      type,
      retryable,
      details: error
    };
  }

  // 处理不同类型的错误
  if (error?.errMsg) {
    // Taro 特有错误
    if (error.errMsg.includes('timeout')) {
      code = 'timeout';
      type = 'network';
      message = ERROR_MESSAGE_MAP.timeout;
      retryable = true;
    } else if (error.errMsg.includes('network')) {
      code = 'network';
      type = 'network';
      message = ERROR_MESSAGE_MAP.network;
      retryable = true;
    }
  } else if (error?.message) {
    message = error.message;
    
    // 根据消息内容判断错误类型
    const msgLower = message.toLowerCase();
    if (msgLower.includes('network') || msgLower.includes('connection')) {
      type = 'network';
      code = 'network';
      message = ERROR_MESSAGE_MAP.network;
      retryable = true;
    } else if (msgLower.includes('timeout')) {
      type = 'network';
      code = 'timeout';
      message = ERROR_MESSAGE_MAP.timeout;
      retryable = true;
    } else if (msgLower.includes('unauthorized') || msgLower.includes('登录')) {
      type = 'permission';
      code = 'unauthorized';
      message = ERROR_MESSAGE_MAP.unauthorized;
    } else if (msgLower.includes('validation') || msgLower.includes('格式')) {
      type = 'validation';
      code = 'validation';
      message = ERROR_MESSAGE_MAP.validation;
    } else if (msgLower.includes('business')) {
      type = 'business';
      code = 'business';
      message = ERROR_MESSAGE_MAP.business;
    } else if (msgLower.includes('server') || msgLower.includes('内部错误')) {
      type = 'server';
      code = 'server';
      message = ERROR_MESSAGE_MAP.server;
      retryable = true;
    }
  }

  return {
    code,
    message,
    type,
    retryable,
    details: error
  };
};

// 显示用户友好的错误提示
export const showErrorToast = (error: any, customMessage?: string) => {
  const appError = analyzeError(error);
  const message = customMessage || appError.message;
  
  // 根据错误类型选择不同的提示方式
  if (appError.type === 'permission') {
    // 权限错误需要明确处理
    Taro.showModal({
      title: '权限不足',
      content: message,
      showCancel: false,
      confirmText: '知道了'
    });
  } else if (appError.type === 'network' && appError.retryable) {
    // 网络错误可以重试
    Taro.showModal({
      title: '网络错误',
      content: message + '，是否重试？',
      confirmText: '重试',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 触发重试 - 简单的方式是直接重新加载页面或调用回调
          if (typeof window !== 'undefined' && (window as any).retryError) {
            (window as any).retryError(error);
          }
        }
      }
    });
  } else {
    // 其他错误使用普通提示
    Taro.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    });
  }
};

// 通用重试函数
export const withRetry = async <T>(
  operation: () => Promise<T>,
  options?: {
    maxRetries?: number;
    onRetry?: (attempt: number, error: any) => void;
    onSuccess?: (result: T) => void;
    onError?: (error: any, attempt: number) => void;
  }
): Promise<T> => {
  const maxRetries = options?.maxRetries || RETRY_CONFIG.maxRetries;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      
      if (attempt > 1 && options?.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      if (options?.onRetry) {
        options.onRetry(attempt, error);
      }

      // 如果是最后一次尝试或错误不可重试，则抛出错误
      const appError = analyzeError(error);
      if (attempt === maxRetries || !appError.retryable) {
        if (options?.onError) {
          options.onError(error, attempt);
        }
        throw error;
      }

      // 等待一段时间后重试
      const delay = RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

// 专门用于网络请求的重试包装器
export const requestWithRetry = <T>(
  requestFn: () => Promise<T>,
  context?: string
): Promise<T> => {
  return withRetry(requestFn, {
    onRetry: (attempt, error) => {
      console.log(`[${context || 'Request'}] 第 ${attempt} 次重试:`, error);
      Taro.showToast({
        title: `网络异常，第 ${attempt} 次重试中...`,
        icon: 'none',
        duration: 1000
      });
    },
    onError: (error, attempt) => {
      console.error(`[${context || 'Request'}] 重试 ${attempt} 次后仍然失败:`, error);
    }
  });
};

// 创建错误边界组件的辅助函数
export const createErrorBoundary = (componentName: string) => {
  return {
    logError: (error: any, errorInfo?: any) => {
      console.error(`[${componentName}] 错误:`, error);
      console.error(`[${componentName}] 错误信息:`, errorInfo);
    },
    handleError: (error: any) => {
      const appError = analyzeError(error);
      showErrorToast(appError);
    }
  };
};

// 获取用户友好的错误消息
export const getUserFriendlyMessage = (error: AppError): string => {
  const typeMessages: Record<ErrorType, string> = {
    network: '网络连接不稳定，请检查网络后重试',
    validation: '参数错误，请检查输入后重试',
    permission: '登录状态已过期，请重新登录',
    server: '服务暂时不可用，请稍后重试',
    business: '业务处理失败，请联系客服',
    unknown: '发生未知错误，请稍后重试'
  };
  
  return typeMessages[error.type] || error.message;
};

// 判断错误是否可重试
export const isRetryable = (error: any): boolean => {
  const appError = analyzeError(error);
  return appError.retryable || false;
};

// 创建错误负载
export const createErrorPayload = (
  error: any,
  options?: { showAlert?: boolean; redirectTo?: string }
): AppError & { timestamp: number; showAlert?: boolean; redirectTo?: string } => {
  const appError = analyzeError(error);
  return {
    ...appError,
    timestamp: Date.now(),
    showAlert: options?.showAlert ?? true,
    redirectTo: options?.redirectTo
  };
};