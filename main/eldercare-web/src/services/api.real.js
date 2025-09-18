/**
 * ElderCare API 服务层
 * 与xiaozhi-server的ElderCare模块进行通信
 */

const API_BASE_URL = 'http://localhost:8801/eldercare'

class ElderCareAPI {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  /**
   * 通用API请求方法
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, finalOptions)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('API Request Error:', error)
      throw error
    }
  }

  /**
   * 获取监护数据
   * @param {string} deviceId - 设备ID
   * @param {number} days - 获取多少天的数据
   */
  async getMonitorData(deviceId, days = 7) {
    return this.request(`/monitor_data?device_id=${deviceId}&days=${days}`)
  }

  /**
   * 提交监护数据
   * @param {Object} data - 监护数据
   */
  async submitMonitorData(data) {
    return this.request('/monitor_data', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * 设置健康提醒
   * @param {Object} reminder - 提醒数据
   */
  async createHealthReminder(reminder) {
    return this.request('/health_reminder', {
      method: 'POST',
      body: JSON.stringify(reminder)
    })
  }

  /**
   * 发起紧急呼救
   * @param {Object} emergency - 紧急情况数据
   */
  async emergencyCall(emergency) {
    return this.request('/emergency_call', {
      method: 'POST',
      body: JSON.stringify(emergency)
    })
  }

  /**
   * 创建声音克隆
   * @param {Object} voiceData - 声音数据
   */
  async createVoiceClone(voiceData) {
    return this.request('/voice_clone', {
      method: 'POST',
      body: JSON.stringify(voiceData)
    })
  }

  /**
   * 获取声音克隆列表
   * @param {string} deviceId - 设备ID
   */
  async getVoiceClones(deviceId) {
    return this.request(`/voice_clones?device_id=${deviceId}`)
  }

  /**
   * 上传音频文件并转换为base64
   * @param {File} audioFile - 音频文件
   */
  async fileToBase64(audioFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(audioFile)
      reader.onload = () => {
        // 移除data:audio/xxx;base64,前缀
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = (error) => reject(error)
    })
  }

  /**
   * 获取设备状态
   * @param {string} deviceId - 设备ID
   */
  async getDeviceStatus(deviceId) {
    // 这个功能可能需要连接到xiaozhi-server的设备管理API
    try {
      const response = await fetch(`http://localhost:8801/device/status?device_id=${deviceId}`)
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.warn('Failed to get device status:', error)
    }
    
    // 返回默认状态
    return {
      status: 'unknown',
      last_activity: null
    }
  }
}

export default new ElderCareAPI()
