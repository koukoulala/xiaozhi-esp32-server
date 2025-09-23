/**
 * API错误处理工具
 * 
 * 提供统一的API错误处理和显示功能
 * 包含错误提示、重试和降级处理
 * 
 * 作者: GitHub Copilot
 * 日期: 2025-09-23
 */

import { toast } from 'sonner';

/**
 * 处理API错误并显示适当的提示
 * @param {Error} error - 错误对象
 * @param {string} endpoint - API端点
 * @param {Function} retryCallback - 重试回调函数
 * @param {Object} options - 额外选项
 */
export const handleApiError = (error, endpoint = '', retryCallback = null, options = {}) => {
  const { showToast = true, title = '请求失败', defaultMessage = '无法连接到服务器，请稍后再试' } = options;
  
  let message = error?.message || defaultMessage;
  
  // 处理常见错误类型
  if (error?.name === 'AbortError') {
    message = '请求超时，请检查网络连接';
  } else if (error?.message?.includes('NetworkError')) {
    message = '网络错误，请检查您的网络连接';
  } else if (error?.message?.includes('401') || error?.message?.includes('403')) {
    message = '认证失败，请重新登录';
  }
  
  // 格式化端点显示
  const formattedEndpoint = endpoint ? ` (${endpoint.replace(/^\//, '')})` : '';
  
  if (showToast) {
    // 显示错误提示
    toast.error(title + formattedEndpoint, {
      description: message,
      duration: 5000,
      action: retryCallback ? {
        label: '重试',
        onClick: () => retryCallback(),
      } : undefined,
    });
  }
  
  // 返回错误信息，方便调用者处理
  return {
    error,
    message,
    endpoint,
    isTimeout: error?.name === 'AbortError',
    isAuthError: error?.message?.includes('401') || error?.message?.includes('403'),
  };
};

/**
 * 显示API连接状态提示
 * @param {string} mode - API模式 ('real', 'manager', 'mock')
 * @param {boolean} isAvailable - 后端是否可用
 */
export const showApiStatusToast = (mode, isAvailable) => {
  if (isAvailable) {
    const modeMap = {
      'real': 'ElderCare API服务',
      'manager': '管理后端服务',
      'mock': '模拟数据模式'
    };
    
    toast.success('成功连接到后端', {
      description: `使用${modeMap[mode] || mode}`,
      duration: 3000,
    });
  } else {
    toast.warning('使用模拟数据模式', {
      description: '无法连接到后端服务，当前使用本地模拟数据',
      duration: 5000,
    });
  }
};

/**
 * 显示重试提示
 * @param {number} attempt - 当前尝试次数
 * @param {number} maxRetries - 最大重试次数
 * @param {string} endpoint - API端点
 */
export const showRetryToast = (attempt, maxRetries, endpoint = '') => {
  const formattedEndpoint = endpoint ? ` (${endpoint.replace(/^\//, '')})` : '';
  
  toast.info(`重试请求${formattedEndpoint}`, {
    description: `第 ${attempt}/${maxRetries} 次尝试连接服务器...`,
    duration: 2000,
  });
};

export default {
  handleApiError,
  showApiStatusToast,
  showRetryToast
};