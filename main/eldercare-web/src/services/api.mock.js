/**
 * ElderCare Mock API 服务层 - 模拟版本
 * 用于在没有后端服务时进行前端演示
 */

// 模拟数据
const mockHealthData = [
  {
    id: 1,
    device_id: 'demo-device-001',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    heart_rate: 72,
    blood_pressure_systolic: 120,
    blood_pressure_diastolic: 80,
    temperature: 36.5,
    blood_oxygen: 98,
    activity_level: 'medium',
    fall_detected: false
  },
  {
    id: 2,
    device_id: 'demo-device-001',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    heart_rate: 75,
    blood_pressure_systolic: 125,
    blood_pressure_diastolic: 82,
    temperature: 36.7,
    blood_oxygen: 97,
    activity_level: 'high',
    fall_detected: false
  }
]

const mockReminders = [
  {
    id: 1,
    device_id: 'demo-device-001',
    reminder_type: 'medication',
    title: '服用降压药',
    content: '每日早上8点服用降压药1粒，饭后服用',
    scheduled_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    is_completed: false,
    created_at: new Date().toISOString()
  }
]

const mockEmergencyCalls = []

const mockVoiceClones = [
  {
    id: 1,
    device_id: 'demo-device-001',
    family_member_name: '女儿小丽',
    voice_file_path: '/voices/demo_daughter.wav',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    is_active: true
  }
]

class MockElderCareAPI {
  constructor() {
    console.warn('🟡 使用Mock API模式 - 仅用于演示，数据不会真实保存')
  }

  async delay(ms = 500) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async getMonitorData(deviceId, days = 7) {
    await this.delay()
    
    console.log(`📊 获取设备 ${deviceId} 的 ${days} 天监护数据`)
    
    return {
      health_data: mockHealthData,
      reminders: mockReminders,
      emergency_calls: mockEmergencyCalls
    }
  }

  async submitMonitorData(data) {
    await this.delay()
    
    console.log('📈 提交监护数据:', data)
    
    // 添加到模拟数据
    const newData = {
      ...data,
      id: mockHealthData.length + 1,
      timestamp: new Date().toISOString()
    }
    mockHealthData.unshift(newData)
    
    return { message: '监护数据已接收' }
  }

  async createHealthReminder(reminder) {
    await this.delay()
    
    console.log('⏰ 创建健康提醒:', reminder)
    
    const newReminder = {
      ...reminder,
      id: mockReminders.length + 1,
      is_completed: false,
      created_at: new Date().toISOString()
    }
    
    mockReminders.push(newReminder)
    
    return {
      message: '健康提醒设置成功',
      reminder_id: newReminder.id
    }
  }

  async emergencyCall(emergency) {
    await this.delay()
    
    console.log('🚨 紧急呼救:', emergency)
    
    const newCall = {
      ...emergency,
      id: mockEmergencyCalls.length + 1,
      timestamp: new Date().toISOString(),
      status: 'sent'
    }
    
    mockEmergencyCalls.push(newCall)
    
    return {
      message: '紧急呼救已发送',
      call_id: newCall.id,
      status: 'sent'
    }
  }

  async createVoiceClone(voiceData) {
    await this.delay(2000) // 模拟较长的处理时间
    
    console.log('🎵 创建声音克隆:', voiceData.family_member_name)
    
    const newVoice = {
      id: mockVoiceClones.length + 1,
      device_id: voiceData.device_id,
      family_member_name: voiceData.family_member_name,
      voice_file_path: `/voices/${voiceData.family_member_name}_${Date.now()}.wav`,
      created_at: new Date().toISOString(),
      is_active: true
    }
    
    mockVoiceClones.push(newVoice)
    
    return {
      message: '声音克隆成功',
      voice_id: newVoice.id
    }
  }

  async getVoiceClones(deviceId) {
    await this.delay()
    
    console.log(`🎤 获取设备 ${deviceId} 的声音克隆列表`)
    
    return {
      voice_clones: mockVoiceClones.filter(v => v.device_id === deviceId)
    }
  }

  async getDeviceStatus(deviceId) {
    await this.delay()
    
    return {
      status: 'online',
      last_activity: '刚刚'
    }
  }

  async fileToBase64(audioFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(audioFile)
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = (error) => reject(error)
    })
  }
}

// 检查是否能访问真实API，否则使用Mock版本
const checkRealAPI = async () => {
  try {
    const response = await fetch('http://localhost:8801/eldercare/monitor_data?device_id=test')
    return response.ok
  } catch (error) {
    return false
  }
}

// 动态选择API实现
const createAPI = async () => {
  const hasRealAPI = await checkRealAPI()
  
  if (hasRealAPI) {
    console.log('✅ 连接到真实API服务')
    // 如果真实API可用，动态导入真实API
    const { default: RealAPI } = await import('./api.real.js').catch(() => ({ default: MockElderCareAPI }))
    return new RealAPI()
  } else {
    console.log('🟡 使用Mock API演示模式')
    return new MockElderCareAPI()
  }
}

export default await createAPI()
