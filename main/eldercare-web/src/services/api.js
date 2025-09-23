/**
 * ElderCare API 服务层 - 统一版本
 * 支持真实后端API和模拟数据的自动切换
 * 
 * 作者: GitHub Copilot
 * 日期: 2025-09-23
 * 版本: 2.0 (重构版)
 */

import { handleApiError, showApiStatusToast, showRetryToast } from '../utils/apiErrorHandler';

// API配置
const API_CONFIG = {
  // 真实后端API地址（使用相对路径，通过Vite代理访问）
  REAL_API_URL: '/eldercare',
  // 管理后端API地址（使用相对路径，通过Vite代理访问）
  MANAGER_API_URL: '/eldercare',
  // 连接超时时间
  TIMEOUT: 30000, // 30秒
  // 关键API的超时时间
  CRITICAL_TIMEOUT: 45000, // 45秒
  // 重试次数
  MAX_RETRIES: 5
};

class ElderCareAPI {
  constructor() {
    this.isBackendAvailable = false;
    this.currentMode = 'unknown'; // 'real', 'manager', 'mock'
    this.currentUser = null;
    this.initAPI();
  }

  /**
   * 初始化API - 自动检测可用的后端服务
   */
  async initAPI() {
    console.log('🔍 正在检测可用的后端服务...');
    
    // 检查是否在localStorage中设置了强制API模式
    const forcedMode = localStorage.getItem('eldercare_api_mode');
    if (forcedMode) {
      console.log(`使用强制设置的API模式: ${forcedMode}`);
      
      if (forcedMode === 'real') {
        this.baseURL = API_CONFIG.REAL_API_URL;
        this.currentMode = 'real';
        this.isBackendAvailable = true;
        return;
      }
      
      if (forcedMode === 'manager') {
        this.baseURL = API_CONFIG.MANAGER_API_URL;
        this.currentMode = 'manager';
        this.isBackendAvailable = true;
        return;
      }
      
      if (forcedMode === 'mock') {
        this.currentMode = 'mock';
        this.isBackendAvailable = false;
        return;
      }

      if (forcedMode === 'auto') {
        // 继续执行自动检测逻辑
      }
    }
    
    // 优先尝试并行检测两个服务
    const results = await Promise.allSettled([
      this.checkAPIAvailability(API_CONFIG.REAL_API_URL),
      this.checkAPIAvailability(API_CONFIG.MANAGER_API_URL)
    ]);
    
    // 1. 优先尝试真实的xiaozhi-server ElderCare API
    if (results[0].status === 'fulfilled' && results[0].value === true) {
      this.baseURL = API_CONFIG.REAL_API_URL;
      this.currentMode = 'real';
      this.isBackendAvailable = true;
      console.log('✅ 连接到xiaozhi-server ElderCare API');
      return;
    }

    // 2. 尝试管理后端API
    if (results[1].status === 'fulfilled' && results[1].value === true) {
      this.baseURL = API_CONFIG.MANAGER_API_URL;
      this.currentMode = 'manager';
      this.isBackendAvailable = true;
      console.log('✅ 连接到管理后端API');
      return;
    }

    // 3. 都不可用时使用模拟数据
    this.currentMode = 'mock';
    this.isBackendAvailable = false;
    console.log('⚠️ 后端服务不可用，使用模拟数据模式');
    
    // 在系统诊断页面可以切换模式，暂时先使用模拟数据保证UI可用
    console.log('提示: 可以在系统诊断页面手动设置API模式');
  }

  /**
   * 检查API可用性
   */
  async checkAPIAvailability(url) {
    let retries = 2; // 减少重试次数，加快初始化
    
    // 查看URL是否是管理后端API，如果是，优先使用特定端点进行检测
    const checkEndpoint = '/config';
    
    console.log(`尝试连接 ${url}${checkEndpoint}...`);
    
    while (retries > 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 降低检测超时时间
        
        const response = await fetch(`${url}${checkEndpoint}`, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          cache: 'no-cache' // 防止缓存影响检测结果
        });
        
        clearTimeout(timeoutId);
        
        // 如果响应成功并且是JSON格式
        if (response.ok) {
          try {
            const data = await response.json();
            console.log('API连接成功，返回数据:', data);
            return true;
          } catch (jsonError) {
            console.log('API连接成功，但返回的不是JSON格式');
            return true; // 仍然认为是成功的
          }
        }
        
        // 尝试第二个端点
        if (retries === API_CONFIG.MAX_RETRIES) {
          // 如果第一次检查失败，尝试使用另一个常见端点
          const secondCheckEndpoint = '/auth/status';
          console.log(`尝试连接备用端点 ${url}${secondCheckEndpoint}...`);
          
          const controller2 = new AbortController();
          const timeoutId2 = setTimeout(() => controller2.abort(), API_CONFIG.TIMEOUT);
          
          const response2 = await fetch(`${url}${secondCheckEndpoint}`, {
            method: 'GET',
            signal: controller2.signal,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            mode: 'cors',
            credentials: 'same-origin',
            cache: 'no-cache'
          });
          
          clearTimeout(timeoutId2);
          
          if (response2.ok) {
            console.log('API备用端点连接成功');
            return true;
          }
        }
        
        console.log(`API响应失败，状态码: ${response.status}`);
        retries--;
        
        if (retries > 0) {
          console.log(`将在1秒后重试，剩余重试次数: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.log(`API连接失败 (重试 ${API_CONFIG.MAX_RETRIES - retries + 1}/${API_CONFIG.MAX_RETRIES}):`, error.message);
        retries--;
        if (retries > 0) {
          console.log(`将在1秒后重试，剩余重试次数: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    console.log(`在 ${API_CONFIG.MAX_RETRIES} 次重试后，API连接失败`);
    return false;
  }

  /**
   * 通用请求方法
   */
  async request(endpoint, options = {}) {
    // 是否是关键端点，决定使用哪个超时时间
    const criticalEndpointList = ['/auth/login', '/auth/register', '/config', '/auth/status'];
    const isCriticalRequest = criticalEndpointList.some(criticalEndpoint => 
      endpoint.includes(criticalEndpoint)
    );
    const timeoutDuration = isCriticalRequest ? API_CONFIG.CRITICAL_TIMEOUT : API_CONFIG.TIMEOUT;
    
    // 记录API请求
    const requestLog = {
      endpoint,
      method: options.method || 'GET',
      timestamp: new Date().toISOString(),
      usedMock: false,
      isCritical: isCriticalRequest
    };
    
    // 如果强制使用模拟数据模式，直接返回模拟数据
    if (this.currentMode === 'mock') {
      requestLog.usedMock = true;
      requestLog.reason = 'mock_mode_forced';
      this.logApiRequest(requestLog);
      return this.getMockResponse(endpoint, options);
    }

    // 如果后端不可用且非强制模式，尝试重新检测后端
    if (!this.isBackendAvailable && this.currentMode !== 'mock') {
      console.log('后端可能恢复，尝试重新检测API可用性...');
      
      // 优先尝试并行检测两个服务
      const results = await Promise.allSettled([
        this.checkAPIAvailability(API_CONFIG.REAL_API_URL),
        this.checkAPIAvailability(API_CONFIG.MANAGER_API_URL)
      ]);
      
      if (results[0].status === 'fulfilled' && results[0].value === true) {
        this.baseURL = API_CONFIG.REAL_API_URL;
        this.currentMode = 'real';
        this.isBackendAvailable = true;
        console.log('✅ 重新连接到xiaozhi-server ElderCare API成功');
      } else if (results[1].status === 'fulfilled' && results[1].value === true) {
        this.baseURL = API_CONFIG.MANAGER_API_URL;
        this.currentMode = 'manager';
        this.isBackendAvailable = true;
        console.log('✅ 重新连接到管理后端API成功');
      }
    }
    
    // 对于关键端点，即使后端不可用也尝试请求
    const criticalEndpoints = ['/auth/login', '/auth/register', '/config', '/auth/status'];
    const isCriticalEndpoint = criticalEndpoints.some(criticalEndpoint => 
      endpoint.includes(criticalEndpoint)
    );
    
    // 后端不可用且非关键端点则使用模拟数据
    if (!this.isBackendAvailable && !isCriticalEndpoint) {
      requestLog.usedMock = true;
      requestLog.reason = 'backend_unavailable_non_critical';
      this.logApiRequest(requestLog);
      return this.getMockResponse(endpoint, options);
    }

    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('eldercare_token');
    
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    // 最大重试次数
    let retries = 2; // 最多重试2次
    
    while (retries >= 0) {
      try {
        console.log(`🌐 API请求: ${config.method} ${url}`);
        const startTime = Date.now();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.warn(`请求超时 (${timeoutDuration}ms): ${endpoint}`);
          controller.abort('请求超时');  // 提供明确的中止原因
        }, timeoutDuration);
        
        const response = await fetch(url, { ...config, signal: controller.signal });
        clearTimeout(timeoutId);
        
        const endTime = Date.now();
        requestLog.responseTime = endTime - startTime;
        
        if (!response.ok) {
          // 如果是认证错误，不要重试
          if (response.status === 401 || response.status === 403) {
            requestLog.status = response.status;
            requestLog.statusText = response.statusText;
            requestLog.success = false;
            requestLog.usedMock = true;
            requestLog.reason = 'auth_error';
            this.logApiRequest(requestLog);
            
            // 清除可能无效的token
            if (endpoint.includes('/auth/') === false) {
              console.warn('认证失败，清除token');
              localStorage.removeItem('eldercare_token');
            }
            
            throw new Error(`认证失败: HTTP ${response.status}: ${response.statusText}`);
          }
          
          // 如果还有重试次数，继续重试
          if (retries > 0) {
            console.log(`请求失败，状态码: ${response.status}，将在1秒后重试，剩余重试次数: ${retries}`);
            retries--;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          
          requestLog.status = response.status;
          requestLog.statusText = response.statusText;
          requestLog.success = false;
          requestLog.usedMock = true;
          requestLog.reason = 'response_not_ok';
          this.logApiRequest(requestLog);
          
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        requestLog.status = response.status;
        requestLog.success = true;
        requestLog.usedMock = false;
        this.logApiRequest(requestLog);
        
        return data;
      } catch (error) {
        // 如果是超时或网络错误且还有重试次数，继续重试
        if ((error.name === 'AbortError' || error.name === 'TypeError') && retries > 0) {
          console.log(`请求超时或网络错误，将在1秒后重试，剩余重试次数: ${retries}`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        console.error(`API请求失败 ${endpoint}:`, error);
        
        // 记录错误信息
        requestLog.error = error.message || (error.name === 'AbortError' ? '请求超时' : '请求失败');
        requestLog.success = false;
        requestLog.usedMock = true;
        requestLog.reason = error.name === 'AbortError' ? 'timeout' : 'request_failed';
        this.logApiRequest(requestLog);
        
        // 判断是否是关键端点
        if (isCriticalRequest) {
          // 为AbortError提供更明确的错误信息
          if (error.name === 'AbortError') {
            throw new Error(`请求超时(${timeoutDuration}ms): ${endpoint}`);
          }
          throw error;
        }
        
        // 请求失败时降级到模拟数据
        return this.getMockResponse(endpoint, options);
      }
    }
  }
  
  /**
   * 记录API请求日志
   */
  logApiRequest(requestLog) {
    // 保存到localStorage中
    const apiRequestLogs = JSON.parse(localStorage.getItem('eldercare_api_request_logs') || '[]');
    apiRequestLogs.unshift(requestLog); // 添加到开头
    
    // 最多保留100条记录
    if (apiRequestLogs.length > 100) {
      apiRequestLogs.pop();
    }
    
    localStorage.setItem('eldercare_api_request_logs', JSON.stringify(apiRequestLogs));
    
    // 如果使用了模拟数据，更新模拟数据使用记录
    if (requestLog.usedMock) {
      console.warn(`⚠️ 使用模拟数据: ${requestLog.endpoint} (原因: ${requestLog.reason})`);
    }
  }

  /**
   * 获取模拟数据响应
   */
  getMockResponse(endpoint, options) {
    console.log(`📊 使用模拟数据: ${endpoint}`);
    console.warn(`警告: 使用了模拟数据而非真实API - ${endpoint}`);
    
    // 将使用的模拟数据记录到localStorage中，用于诊断
    const mockApiUsage = JSON.parse(localStorage.getItem('eldercare_mock_api_usage') || '{}');
    mockApiUsage[endpoint] = {
      timestamp: new Date().toISOString(),
      method: options?.method || 'GET',
      count: (mockApiUsage[endpoint]?.count || 0) + 1
    };
    localStorage.setItem('eldercare_mock_api_usage', JSON.stringify(mockApiUsage));
    
    // 认证相关
    if (endpoint.includes('/auth/login')) {
      return {
        success: true,
        code: 200,
        message: '登录成功（模拟）',
        data: {
          id: 1,
          username: 'demo_user',
          realName: '演示用户',
          elderName: '李奶奶',
          phone: '13812345678',
          token: 'mock_token_' + Date.now()
        }
      };
    }
    
    if (endpoint.includes('/auth/register')) {
      return {
        success: true,
        code: 200,
        message: '注册成功（模拟）',
        data: { userId: Date.now() }
      };
    }

    // 监控数据
    if (endpoint.includes('/monitor_data') || endpoint.includes('/monitor/data')) {
      return {
        success: true,
        data: this.generateMockHealthData(),
        emergency_calls: [],
        health_data: this.generateMockHealthData(),
        reminders: []
      };
    }
    
    // 健康数据
    if (endpoint.includes('/health/data')) {
      return {
        success: true,
        data: this.generateMockHealthData()
      };
    }
    
    if (endpoint.includes('/health/latest')) {
      const mockData = this.generateMockHealthData();
      return {
        success: true,
        data: mockData.length > 0 ? mockData[0] : {}
      };
    }
    
    if (endpoint.includes('/health/report')) {
      return {
        success: true,
        data: {
          report_id: Date.now(),
          summary: "用户健康状况良好",
          average_heart_rate: 75,
          average_blood_pressure: "120/80",
          details: "详细健康报告内容...",
          generated_date: new Date().toISOString()
        }
      };
    }
    
    // 提醒相关
    if (endpoint.includes('/reminders') || endpoint.includes('/reminder/list')) {
      return {
        success: true,
        data: [
          {
            id: 1,
            title: '服药提醒',
            content: '高血压药物，饭后服用',
            reminder_type: 'medication',
            scheduled_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            repeat_interval: 'daily',
            is_completed: false,
            is_active: true,
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            title: '体检预约',
            content: '社区医院例行检查',
            reminder_type: 'appointment',
            scheduled_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            repeat_interval: 'none',
            is_completed: false,
            is_active: true,
            created_at: new Date().toISOString()
          }
        ]
      };
    }
    
    if (endpoint.includes('/reminder/create') || endpoint.includes('/reminder/update')) {
      return {
        success: true,
        message: '操作成功',
        data: {
          id: Date.now(),
          created_at: new Date().toISOString()
        }
      };
    }

    // 设备状态
    if (endpoint.includes('/device')) {
      return {
        success: true,
        data: {
          status: 'online',
          last_activity: new Date().toISOString(),
          device_name: '演示设备',
          battery_level: 85
        }
      };
    }

    // 智能体数据
    if (endpoint.includes('/agent')) {
      return {
        success: true,
        data: this.generateMockAgents()
      };
    }

    // 声音克隆
    if (endpoint.includes('/voice')) {
      return {
        success: true,
        data: this.generateMockVoices()
      };
    }

    // 默认成功响应
    return {
      success: true,
      code: 200,
      message: '操作成功（模拟）',
      data: {}
    };
  }

  /**
   * 生成模拟健康数据
   */
  generateMockHealthData() {
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        id: i + 1,
        device_id: 'demo-device-001',
        timestamp: timestamp.toISOString(),
        heart_rate: 70 + Math.floor(Math.random() * 20),
        blood_pressure_systolic: 120 + Math.floor(Math.random() * 20),
        blood_pressure_diastolic: 80 + Math.floor(Math.random() * 10),
        temperature: 36.0 + Math.random() * 1.5,
        blood_oxygen: 95 + Math.floor(Math.random() * 5),
        activity_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        fall_detected: Math.random() < 0.05 // 5%概率检测到跌倒
      });
    }
    
    return data;
  }

  /**
   * 生成模拟智能体数据
   */
  generateMockAgents() {
    return [
      {
        id: 1,
        name: '小智助手',
        description: '专业的养老陪伴智能体',
        status: 'active',
        voice_id: 'voice_001',
        personality: 'caring',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        name: '健康顾问',
        description: '健康监测和建议专家',
        status: 'active',
        voice_id: 'voice_002',
        personality: 'professional',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  /**
   * 生成模拟声音数据
   */
  generateMockVoices() {
    return [
      {
        id: 'voice_001',
        name: '温柔女声',
        description: '温暖亲切的女性声音',
        language: 'zh-CN',
        gender: 'female',
        created_at: new Date().toISOString()
      },
      {
        id: 'voice_002',
        name: '稳重男声',
        description: '沉稳可靠的男性声音',
        language: 'zh-CN',
        gender: 'male',
        created_at: new Date().toISOString()
      }
    ];
  }

  // ===================== 业务API方法 =====================

  /**
   * 用户认证
   */
  async login(username, password) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (result.success && result.data) {
      this.currentUser = result.data;
      localStorage.setItem('eldercare_user', JSON.stringify(result.data));
      localStorage.setItem('eldercare_token', result.data.token || 'mock_token');
      
      // 确保返回格式正确，包含user属性
      return {
        success: true,
        message: result.message || '登录成功',
        user: result.data
      };
    }

    return result;
  }

  async register(userData) {
    // 使用通用请求方法
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('eldercare_user');
    localStorage.removeItem('eldercare_token');
  }

  getCurrentUser() {
    if (!this.currentUser) {
      try {
        const stored = localStorage.getItem('eldercare_user');
        this.currentUser = stored ? JSON.parse(stored) : null;
      } catch (error) {
        console.error('解析用户数据失败:', error);
        return null;
      }
    }
    return this.currentUser;
  }

  /**
   * 健康监控数据
   */
  async getMonitorData(deviceId, days = 7) {
    return this.request(`/monitor/data?user_id=${deviceId}&days=${days}`);
  }

  async submitMonitorData(data) {
    return this.request('/monitor/data', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  /**
   * 获取健康数据
   */
  async getHealthData(userId, days = 7) {
    return this.request(`/health/data?userId=${userId}&days=${days}`);
  }
  
  /**
   * 获取最新健康数据
   */
  async getLatestHealthData(userId) {
    return this.request(`/health/latest?userId=${userId}`);
  }
  
  /**
   * 生成健康报告
   */
  async generateHealthReport(userId, startDate, endDate) {
    return this.request(`/health/report?userId=${userId}&startDate=${startDate}&endDate=${endDate}`);
  }

  /**
   * 设备管理
   */
  async getDeviceStatus(deviceId) {
    return this.request(`/device/status?device_id=${deviceId}`);
  }

  async getUserDevices(userId) {
    return this.request(`/device/list?user_id=${userId}`);
  }

  async registerDevice(deviceData) {
    return this.request('/device/register', {
      method: 'POST',
      body: JSON.stringify(deviceData)
    });
  }

  /**
   * 智能体管理
   */
  async getAgents(userId) {
    return this.request(`/agent/list?user_id=${userId}`);
  }
  
  /**
   * 获取用户智能体列表
   */
  async getUserAgents(userId) {
    return this.request(`/agent/list?userId=${userId}`);
  }

  async createAgent(agentData) {
    return this.request('/agent/create', {
      method: 'POST',
      body: JSON.stringify(agentData)
    });
  }

  async updateAgent(agentId, agentData) {
    return this.request(`/agent/update/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(agentData)
    });
  }

  async deleteAgent(agentId) {
    return this.request(`/agent/delete/${agentId}`, {
      method: 'DELETE'
    });
  }

  /**
   * 声音克隆
   */
  async getVoiceClones(userId) {
    return this.request(`/voice/list?user_id=${userId}`);
  }

  async createVoiceClone(voiceData) {
    return this.request('/voice/clone', {
      method: 'POST',
      body: JSON.stringify(voiceData)
    });
  }

  /**
   * 健康提醒
   */
  async createHealthReminder(reminder) {
    return this.request('/reminders', {
      method: 'POST',
      body: JSON.stringify(reminder)
    });
  }

  async getHealthReminders(userId) {
    return this.request(`/reminders?user_id=${userId}`);
  }
  
  /**
   * 获取提醒数据
   */
  async get_reminders(userId) {
    return this.request(`/reminders?user_id=${userId}`);
  }

  /**
   * 紧急呼救
   */
  async emergencyCall(emergency) {
    return this.request('/emergency_call', {
      method: 'POST',
      body: JSON.stringify(emergency)
    });
  }

  /**
   * 获取系统状态
   */
  getSystemStatus() {
    return {
      backend_mode: this.currentMode,
      api_available: this.isBackendAvailable,
      base_url: this.baseURL || 'mock',
      user_logged_in: !!this.currentUser
    };
  }

  /**
   * 文件处理工具
   */
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }
}

// 创建单例实例
const elderCareAPI = new ElderCareAPI();

export default elderCareAPI;