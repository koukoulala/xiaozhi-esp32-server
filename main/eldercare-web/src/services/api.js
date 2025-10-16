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
        console.warn('⚠️ 模拟数据模式已弃用，将使用真实API模式');
        this.baseURL = API_CONFIG.REAL_API_URL;
        this.currentMode = 'real';
        this.isBackendAvailable = true;
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

    // 3. 都不可用时标记为不可用，但仍尝试请求（可能是临时网络问题）
    this.currentMode = 'unavailable';
    this.isBackendAvailable = false;
    console.error('❌ 后端服务不可用，请检查服务器状态');
    console.error('提示: 所有API调用都将失败并返回错误');
    
    // 尝试设置一个默认的baseURL以便重试
    this.baseURL = API_CONFIG.REAL_API_URL;
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
    
    // 注释：不再强制使用模拟数据，始终优先尝试真实API
    // if (this.currentMode === 'mock') {
    //   requestLog.usedMock = true;
    //   requestLog.reason = 'mock_mode_forced';
    //   this.logApiRequest(requestLog);
    //   return this.getMockResponse(endpoint, options);
    // }

    // 如果后端不可用，尝试重新检测后端
    if (!this.isBackendAvailable) {
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
    
    // 对于关键端点和语音API，即使后端不可用也尝试请求
    const criticalEndpoints = ['/auth/login', '/auth/register', '/config', '/auth/status'];
    const isCriticalEndpoint = criticalEndpoints.some(criticalEndpoint => 
      endpoint.includes(criticalEndpoint)
    );
    
    // 语音API必须使用真实后端
    const isVoiceAPI = endpoint.includes('/voice/') || endpoint.includes('/eldercare/voice');
    
    // 注释：移除自动fallback到模拟数据的逻辑
    // 现在即使后端标记为不可用，也会尝试真实API请求
    // 只有在请求完全失败后才考虑使用模拟数据
    // if (!this.isBackendAvailable && !isCriticalEndpoint && !isVoiceAPI) {
    //   requestLog.usedMock = true;
    //   requestLog.reason = 'backend_unavailable_non_critical';
    //   this.logApiRequest(requestLog);
    //   return this.getMockResponse(endpoint, options);
    // }

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
        requestLog.usedMock = false; // 修改：不再自动使用模拟数据
        requestLog.reason = error.name === 'AbortError' ? 'timeout' : 'request_failed';
        this.logApiRequest(requestLog);
        
        // 为AbortError提供更明确的错误信息
        if (error.name === 'AbortError') {
          throw new Error(`请求超时(${timeoutDuration}ms): ${endpoint}`);
        }
        
        // 修改：所有API失败都抛出错误，不再fallback到模拟数据
        // 让调用方决定如何处理错误
        throw error;
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
   * ⚠️ 警告：此方法已弃用，不应在生产环境中使用
   * 如果执行到这里，说明API请求失败且没有正确处理错误
   */
  getMockResponse(endpoint, options) {
    console.error(`❌ 严重警告: 不应该使用模拟数据 - ${endpoint}`);
    console.error(`请检查后端服务是否正常运行，或者在调用API时正确处理错误`);
    console.warn(`⚠️ 此功能已被弃用，仅用于调试目的`);
    
    // 抛出错误而不是返回模拟数据
    throw new Error(`API调用失败且无可用数据: ${endpoint}. 请确保后端服务正常运行。`);
    
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
    if (endpoint.includes('/agent/list') || endpoint.includes('/agents')) {
      return {
        success: true,
        data: this.generateMockAgents()
      };
    }

    if (endpoint.includes('/agent/templates')) {
      return {
        success: true,
        data: this.generateMockAgentTemplates()
      };
    }

    if (endpoint.includes('/agent/set-default')) {
      return {
        success: true,
        message: '默认智能体设置成功（模拟）'
      };
    }

    if (endpoint.includes('/agent/create') || endpoint.includes('/agent/update')) {
      return {
        success: true,
        message: '智能体操作成功（模拟）',
        data: { id: Date.now() }
      };
    }

    if (endpoint.includes('/agent/delete')) {
      return {
        success: true,
        message: '智能体删除成功（模拟）'
      };
    }

    // 语音相关API - 强制使用真实后端，不提供模拟数据
    if (endpoint.includes('/voice/') || endpoint.includes('/eldercare/voice')) {
      console.error(`❌ 语音API不支持模拟数据: ${endpoint}`);
      throw new Error(`语音功能需要真实后端服务，请确保ElderCare服务器正在运行 (${endpoint})`);
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
        id: 'agent_001',
        agent_code: 'ELDER_001',
        agent_name: '小智助手',
        system_prompt: '您是一位温暖贴心的养老助手，专门陪伴老年用户。',
        tts_model_id: 1,
        tts_voice_id: 1,
        llm_model_id: 1,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'agent_002',
        agent_code: 'HEALTH_001',
        agent_name: '健康顾问',
        system_prompt: '您是一位专业的健康管理顾问，为老年用户提供健康建议。',
        tts_model_id: 2,
        tts_voice_id: 2,
        llm_model_id: 1,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  /**
   * 生成模拟智能体模板数据
   */
  generateMockAgentTemplates() {
    return [
      {
        id: 'eldercare_companion',
        agent_name: '智慧陪伴助手',
        system_prompt: '您是一位温暖贴心的养老助手，专门陪伴老年用户，提供日常生活的关怀和帮助。'
      },
      {
        id: 'health_monitor',
        agent_name: '健康管理助手',
        system_prompt: '您是一位专业的健康管理顾问，为老年用户提供健康监测、用药提醒和健康建议。'
      },
      {
        id: 'emergency_assistant',
        agent_name: '紧急救助助手',
        system_prompt: '您是一位专业的紧急救助助手，在紧急情况下为老年用户提供快速响应和帮助。'
      }
    ];
  }

  /**
   * 生成模拟声音数据
   */
  generateMockVoices() {
    return [
      {
        id: 'TTS_CosyVoiceClone302AI0001',
        name: '奶奶的声音',
        family_member_name: '奶奶',
        relationship: 'grandparent',
        reference_audio: '/data/audio_uploads/voice/user_23_grandma_voice.wav',
        reference_text: '小宝贝，奶奶想你了，记得要好好吃饭，按时休息哦。',
        creator: 23,
        tts_model_id: 'TTS_CosyVoiceClone302AI',
        tts_model_name: 'TTS_CosyVoiceClone302AI',
        create_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        update_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        audio_file_exists: true,
        audio_file_size: 1024567,
        remark: JSON.stringify({
          family_member_name: '奶奶',
          relationship: 'grandparent',
          voice_description: '温暖慈祥的奶奶声音'
        })
      },
      {
        id: 'TTS_CosyVoiceClone302AI0002',
        name: '爸爸的声音',
        family_member_name: '爸爸',
        relationship: 'parent',
        reference_audio: '/data/audio_uploads/voice/user_23_father_voice.wav',
        reference_text: '孩子，爸爸为你骄傲，要继续努力，保持健康快乐。',
        creator: 23,
        tts_model_id: 'TTS_CosyVoiceClone302AI',
        tts_model_name: 'TTS_CosyVoiceClone302AI',
        create_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        update_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        audio_file_exists: true,
        audio_file_size: 892134,
        remark: JSON.stringify({
          family_member_name: '爸爸',
          relationship: 'parent',
          voice_description: '严肃又温暖的父亲声音'
        })
      },
      {
        id: 'TTS_CosyVoiceClone302AI0003',
        name: '女儿的声音',
        family_member_name: '女儿',
        relationship: 'child',
        reference_audio: '/data/audio_uploads/voice/user_23_daughter_voice.wav',
        reference_text: '妈妈，我爱你！记得按时吃药，我会经常回来看你的。',
        creator: 23,
        tts_model_id: 'TTS_CosyVoiceClone302AI',
        tts_model_name: 'TTS_CosyVoiceClone302AI',
        create_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        update_date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        audio_file_exists: true,
        audio_file_size: 756821,
        remark: JSON.stringify({
          family_member_name: '女儿',
          relationship: 'child',
          voice_description: '甜美关爱的女儿声音'
        })
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

    console.log('API登录响应:', result);

    if (result.success && (result.user || result.data)) {
      // 处理可能的数据结构差异
      const userData = result.user || result.data;
      
      console.log('原始用户数据:', userData);
      
      // 标准化用户数据
      const normalizedUser = {
        id: userData.id || userData.user_id,
        username: userData.username,
        realName: userData.real_name || userData.realName || userData.username,
        elderName: userData.elder_name || userData.elderName || '',
        phone: userData.phone || '',
        token: userData.token || `login_token_${userData.id || userData.user_id}_${Date.now()}`
      };
      
      this.currentUser = normalizedUser;
      localStorage.setItem('eldercare_user', JSON.stringify(normalizedUser));
      localStorage.setItem('eldercare_token', normalizedUser.token);
      
      console.log('登录成功，保存用户数据:', normalizedUser);
      
      // 确保返回格式正确，包含user属性
      return {
        success: true,
        message: result.message || '登录成功',
        user: normalizedUser
      };
    }

    return result;
  }

  async register(userData) {
    console.log('发送注册请求，数据:', userData);
    
    // 使用通用请求方法
    const result = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    console.log('注册响应:', result);
    
    if (result.success) {
      // 确保返回正确的用户ID
      return {
        success: true,
        message: result.message || '注册成功',
        user_id: result.user_id || result.data?.user_id || result.data?.id
      };
    }
    
    return result;
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
        const token = localStorage.getItem('eldercare_token');
        
        if (stored && token && token !== 'null' && token !== 'undefined') {
          const parsedUser = JSON.parse(stored);
          // 验证用户对象的完整性
          if (parsedUser && (parsedUser.id || parsedUser.user_id)) {
            this.currentUser = parsedUser;
            console.log('从localStorage恢复用户:', this.currentUser);
            return this.currentUser;
          }
        }
        
        // 如果数据无效，清理localStorage
        localStorage.removeItem('eldercare_user');
        localStorage.removeItem('eldercare_token');
        return null;
      } catch (error) {
        console.error('解析用户数据失败:', error);
        localStorage.removeItem('eldercare_user');
        localStorage.removeItem('eldercare_token');
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
    return this.request(`/health/data?user_id=${userId}&days=${days}`);
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

  async addDevice(deviceData) {
    return this.request('/eldercare/device/add', {
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
    return this.request(`/agents?user_id=${userId}`);
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
   * 设置默认智能体
   */
  async setDefaultAgent(userId, agentId) {
    return this.request('/agent/set-default', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, agent_id: agentId })
    });
  }

  /**
   * 获取智能体模板
   */
  async getAgentTemplates() {
    return this.request('/agent/templates');
  }

  /**
   * 声音克隆
   */
  async getVoiceClones(userId, agentId = null) {
    let url = `/voice/list?user_id=${userId}`;
    if (agentId) {
      url += `&agent_id=${agentId}`;
    }
    return this.request(url);
  }

  async createVoiceClone(voiceData) {
    // 创建FormData对象用于文件上传
    const formData = new FormData();
    formData.append('userId', voiceData.userId);
    formData.append('name', voiceData.name);
    formData.append('referenceText', voiceData.referenceText);
    formData.append('audioFile', voiceData.audioFile);
    
    // 支持agent_id和家庭成员信息
    if (voiceData.agentId) {
      formData.append('agent_id', voiceData.agentId);
    }
    if (voiceData.family_member_name) {
      formData.append('family_member_name', voiceData.family_member_name);
    }
    if (voiceData.relationship) {
      formData.append('relationship', voiceData.relationship);
    }
    if (voiceData.ttsModelId) {
      formData.append('ttsModelId', voiceData.ttsModelId);
    }

    // 获取token用于认证
    const token = localStorage.getItem('eldercare_token');
    
    // 直接使用fetch避免request方法设置默认Content-Type
    const response = await fetch(`${this.baseURL}/voice/clone`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
        // 不设置Content-Type，让浏览器自动设置multipart/form-data
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  // 音色管理API
  async setDefaultVoice(userId, voiceId, agentId = null) {
    return this.request('/voice/set_default', {
      method: 'POST',
      body: JSON.stringify({ 
        user_id: userId, 
        voice_id: voiceId,
        agent_id: agentId  // 添加智能体ID参数
      })
    });
  }

  async deleteVoice(userId, voiceId) {
    return this.request(`/voice/delete?user_id=${userId}&voice_id=${voiceId}`, {
      method: 'DELETE'
    });
  }

  async updateVoice(userId, voiceId, voiceData) {
    if (voiceData.audioFile) {
      // 文件上传格式
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('voice_id', voiceId);
      formData.append('name', voiceData.name);
      formData.append('referenceText', voiceData.referenceText);
      if (voiceData.audioFile) {
        formData.append('audioFile', voiceData.audioFile);
      }

      const token = localStorage.getItem('eldercare_token');
      
      const response = await fetch(`${this.baseURL}/voice/update`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } else {
      // JSON格式
      return this.request('/voice/update', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          voice_id: voiceId,
          ...voiceData
        })
      });
    }
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
   * 设备删除
   */
  async deleteDevice(deviceId, userId = null) {
    const url = `/device/delete/${deviceId}`;
    const requestData = userId ? { user_id: userId } : {};
    return this.request(url, {
      method: 'DELETE',
      body: JSON.stringify(requestData)
    });
  }

  /**
   * 设备更新
   */
  async updateDevice(deviceId, deviceData) {
    return this.request(`/device/update/${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify(deviceData)
    });
  }

  /**
   * 获取设备详细信息
   */
  async getDeviceDetails(deviceId, deviceType = 'ai') {
    return this.request(`/device/details/${deviceId}?device_type=${deviceType}`);
  }

  /**
   * 更新设备配置
   */
  async updateDeviceConfig(deviceId, configData, deviceType = 'ai') {
    return this.request(`/device/config/${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify({ config_data: configData, device_type: deviceType })
    });
  }

  /**
   * 获取用户AI设备列表
   */
  async getUserAIDevices(userId) {
    return this.request(`/device/ai_devices?user_id=${userId}`);
  }

  /**
   * 获取用户健康设备列表
   */
  async getUserHealthDevices(userId) {
    return this.request(`/device/health_devices?user_id=${userId}`);
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