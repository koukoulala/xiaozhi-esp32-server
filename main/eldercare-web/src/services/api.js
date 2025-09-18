/**
 * ElderCare API 服务层
 * 提供与后端的所有接口交互功能，包括认证、健康监控、声音克隆等
 * 支持实际后端API和模拟数据的自动切换
 * 
 * 作者: assistant
 * 日期: 2025-08-27
 */

const API_BASE_URL = 'http://localhost:8003/eldercare';

class ElderCareAPI {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.currentUser = null;
        this.isBackendAvailable = false;
        this.initAPI();
    }

    async initAPI() {
        // 检查后端是否可用
        try {
            const response = await fetch(`${this.baseURL}/config`, {
                method: 'GET',
                timeout: 5000
            });
            if (response.ok) {
                console.log('✅ ElderCare后端连接成功');
                this.isBackendAvailable = true;
            } else {
                console.warn('⚠️ ElderCare后端连接失败，使用模拟数据');
                this.isBackendAvailable = false;
            }
        } catch (error) {
            console.warn('⚠️ ElderCare后端不可用，使用模拟数据:', error.message);
            this.isBackendAvailable = false;
        }
        
        console.log(`🔧 API模式: ${this.isBackendAvailable ? '真实后端' : '模拟数据'}`);
    }

    // =========================== 工具方法 ===========================
    
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            if (this.isBackendAvailable) {
                const response = await fetch(url, config);
                const data = await response.json();
                return data;
            } else {
                // 使用模拟数据
                return this.getMockData(endpoint, options);
            }
        } catch (error) {
            console.error(`API请求失败 ${endpoint}:`, error);
            return this.getMockData(endpoint, options);
        }
    }

    getMockData(endpoint, options) {
        // 根据endpoint返回对应的模拟数据
        if (endpoint.includes('/auth/login')) {
            return {
                success: true,
                message: '登录成功（模拟）',
                user: {
                    id: 1,
                    username: 'demo_user',
                    realName: '演示用户',
                    elderName: '李奶奶',
                    phone: '13812345678'
                }
            };
        }
        
        if (endpoint.includes('/auth/register')) {
            return {
                success: true,
                message: '注册成功（模拟）',
                user_id: Date.now()
            };
        }

        if (endpoint.includes('/health/data')) {
            return {
                success: true,
                data: this.generateMockHealthData()
            };
        }

        if (endpoint.includes('/health/latest')) {
            const latestData = this.generateMockHealthData();
            return {
                success: true,
                data: latestData.length > 0 ? latestData[latestData.length - 1] : null
            };
        }

        if (endpoint.includes('/voice/list')) {
            return {
                success: true,
                data: [
                    {
                        id: 1,
                        family_member_name: '小明',
                        relationship: 'son',
                        is_default: 1,
                        is_active: 1,
                        voice_file_path: '/temp/voice_xiaoming.wav',
                        reference_text: '你好奶奶，我是小明，记得按时吃药哦。',
                        created_at: new Date(Date.now() - 86400000).toISOString() // 1天前
                    },
                    {
                        id: 2,
                        family_member_name: '小红',
                        relationship: 'daughter',
                        is_default: 0,
                        is_active: 1,
                        voice_file_path: '/temp/voice_xiaohong.wav',
                        reference_text: '奶奶，我是小红，今天天气很好，出去散散步吧。',
                        created_at: new Date(Date.now() - 172800000).toISOString() // 2天前
                    }
                ]
            };
        }

        if (endpoint.includes('/device/list')) {
            return {
                success: true,
                data: [
                    {
                        id: 'esp32_001',
                        device_name: '智能陪伴设备',
                        status: 1,
                        last_online: new Date().toISOString(),
                        location: '客厅'
                    }
                ]
            };
        }

        return { success: false, message: '未知的API端点' };
    }

    generateMockHealthData() {
        const data = [];
        const now = new Date();
        
        // 生成最近24小时的数据，每小时一条记录
        for (let i = 23; i >= 0; i--) {
            const date = new Date(now.getTime() - (i * 60 * 60 * 1000));
            
            // 模拟正常的健康指标变化
            const baseHeartRate = 70;
            const baseSystolic = 120;
            const baseDiastolic = 80;
            const baseTemp = 36.5;
            const baseOxygen = 98;
            
            data.push({
                id: Date.now() + i,
                timestamp: date.toISOString(),
                heart_rate: Math.round(baseHeartRate + (Math.random() - 0.5) * 20),
                blood_pressure_systolic: Math.round(baseSystolic + (Math.random() - 0.5) * 20),
                blood_pressure_diastolic: Math.round(baseDiastolic + (Math.random() - 0.5) * 15),
                temperature: Number((baseTemp + (Math.random() - 0.5) * 0.8).toFixed(1)),
                blood_oxygen: Math.round(baseOxygen + (Math.random() - 0.5) * 5),
                activity_level: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
            });
        }
        return data;
    }

    // =========================== 认证相关API ===========================
    
    async register(userData) {
        return await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(username, password) {
        const result = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (result.success && result.user) {
            this.currentUser = result.user;
            localStorage.setItem('eldercare_user', JSON.stringify(result.user));
        }
        
        return result;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('eldercare_user');
        return { success: true, message: '退出成功' };
    }

    getCurrentUser() {
        if (!this.currentUser) {
            const stored = localStorage.getItem('eldercare_user');
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
        }
        return this.currentUser;
    }

    // =========================== 健康数据API ===========================
    
    async saveHealthData(healthData) {
        return await this.request('/health/save', {
            method: 'POST',
            body: JSON.stringify(healthData)
        });
    }

    async getHealthData(userId, days = 7) {
        return await this.request(`/health/data?user_id=${userId}&days=${days}`);
    }

    async getLatestHealthData(userId) {
        return await this.request(`/health/latest?user_id=${userId}`);
    }

    // 获取监控数据（整合健康数据、提醒、紧急呼救等）
    async getMonitorData(deviceId, days = 7) {
        try {
            // 获取健康数据
            const healthResponse = await this.getHealthData(deviceId, days);
            const healthData = healthResponse.success ? healthResponse.data : this.generateMockHealthData();

            // 获取提醒数据
            const reminders = await this.getReminders(deviceId);
            const reminderData = reminders.success ? reminders.data : [];

            // 模拟紧急呼救数据
            const emergencyCalls = this.generateMockEmergencyCalls();

            return {
                success: true,
                health_data: healthData,
                reminders: reminderData,
                emergency_calls: emergencyCalls
            };
        } catch (error) {
            console.error('获取监控数据失败:', error);
            return {
                success: true, // 返回模拟数据
                health_data: this.generateMockHealthData(),
                reminders: [],
                emergency_calls: []
            };
        }
    }

    // 获取设备状态
    async getDeviceStatus(deviceId) {
        try {
            const response = await this.getUserDevices(deviceId);
            if (response.success && response.data && response.data.length > 0) {
                const device = response.data[0];
                return {
                    status: device.status === 1 ? 'online' : 'offline',
                    last_activity: device.last_online ? new Date(device.last_online).toLocaleString('zh-CN') : '未知'
                };
            }
        } catch (error) {
            console.warn('获取设备状态失败:', error);
        }
        
        // 返回模拟状态
        return {
            status: 'online',
            last_activity: '刚刚'
        };
    }

    generateMockEmergencyCalls() {
        return [
            {
                id: 1,
                timestamp: new Date(Date.now() - 86400000).toISOString(), // 1天前
                notes: '检测到心率异常',
                status: 'resolved'
            },
            {
                id: 2,
                timestamp: new Date(Date.now() - 172800000).toISOString(), // 2天前
                notes: '紧急按钮被按下',
                status: 'resolved'
            }
        ];
    }

    // =========================== 声音克隆API ===========================
    
    async saveVoiceClone(voiceData) {
        return await this.request('/voice/save', {
            method: 'POST',
            body: JSON.stringify(voiceData)
        });
    }

    // 别名方法，与前端调用保持一致
    async createVoiceClone(voiceData) {
        return await this.saveVoiceClone(voiceData);
    }

    async getVoiceClones(userId) {
        const response = await this.request(`/voice/list?user_id=${userId}`);
        // 转换数据格式以匹配前端期望
        if (response.success && response.data) {
            return {
                success: true,
                voice_clones: response.data.map(item => ({
                    id: item.id,
                    family_member_name: item.family_member_name,
                    relationship: item.relationship || 'family',
                    is_active: item.is_active === 1,
                    created_at: item.created_at || new Date().toISOString(),
                    voice_file_path: item.voice_file_path,
                    reference_text: item.reference_text
                }))
            };
        }
        return response;
    }

    async getDefaultVoice(userId) {
        return await this.request(`/voice/default?user_id=${userId}`);
    }

    async testVoiceSynthesis(voiceId, testText) {
        return await this.request('/voice/test', {
            method: 'POST',
            body: JSON.stringify({ voice_id: voiceId, test_text: testText })
        });
    }

    // 文件转Base64工具方法
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]; // 去掉 data:audio/xxx;base64, 前缀
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }

    // =========================== 设备管理API ===========================
    
    async registerDevice(deviceData) {
        return await this.request('/device/register', {
            method: 'POST',
            body: JSON.stringify(deviceData)
        });
    }

    async getUserDevices(userId) {
        return await this.request(`/device/list?user_id=${userId}`);
    }

    // =========================== 系统配置API ===========================
    
    async getSystemConfig(configKey = null) {
        const url = configKey ? `/config?config_key=${configKey}` : '/config';
        return await this.request(url);
    }

    // =========================== 紧急呼救API ===========================
    
    async triggerEmergencyCall(userId, deviceId, callType = 'manual', location = null) {
        const data = {
            user_id: userId,
            device_id: deviceId,
            call_type: callType,
            location: location,
            timestamp: new Date().toISOString()
        };
        
        console.log('🚨 紧急呼救触发:', data);
        
        // 模拟API调用
        return {
            success: true,
            message: '紧急呼救已触发，正在通知家属...',
            emergency_id: Date.now()
        };
    }

    // =========================== 提醒系统API ===========================
    
    async createReminder(reminderData) {
        // 模拟创建提醒
        const reminder = {
            id: Date.now(),
            ...reminderData,
            is_completed: false,
            create_date: new Date().toISOString()
        };
        
        console.log('📅 创建提醒:', reminder);
        
        return {
            success: true,
            message: '提醒创建成功',
            reminder: reminder
        };
    }

    // 别名方法，与前端调用保持一致
    async createHealthReminder(reminderData) {
        return await this.createReminder(reminderData);
    }

    async getReminders(userId) {
        // 模拟获取提醒列表
        const mockReminders = [
            {
                id: 1,
                title: '服药提醒',
                content: '记得按时服用降压药',
                scheduled_time: new Date(Date.now() + 3600000).toISOString(), // 1小时后
                reminder_type: 'medication',
                is_completed: false
            },
            {
                id: 2,
                title: '运动提醒',
                content: '今天天气不错，出去散散步吧',
                scheduled_time: new Date(Date.now() + 7200000).toISOString(), // 2小时后
                reminder_type: 'exercise',
                is_completed: false
            },
            {
                id: 3,
                title: '体检提醒',
                content: '下周三上午10点体检预约',
                scheduled_time: new Date(Date.now() + 604800000).toISOString(), // 7天后
                reminder_type: 'appointment',
                is_completed: false
            }
        ];
        
        return {
            success: true,
            data: mockReminders
        };
    }

    async markReminderComplete(reminderId) {
        console.log('✅ 提醒完成:', reminderId);
        return {
            success: true,
            message: '提醒已标记为完成'
        };
    }

    // =========================== 扩展功能API ===========================

    // 生成健康报告
    async generateHealthReport(userId, startDate, endDate) {
        const healthData = await this.getHealthData(userId, 30);
        if (!healthData.success) {
            return { success: false, message: '获取健康数据失败' };
        }

        const data = healthData.data;
        const report = {
            period: { startDate, endDate },
            summary: {
                totalRecords: data.length,
                avgHeartRate: Math.round(data.reduce((sum, item) => sum + item.heart_rate, 0) / data.length),
                avgBloodPressure: {
                    systolic: Math.round(data.reduce((sum, item) => sum + item.blood_pressure_systolic, 0) / data.length),
                    diastolic: Math.round(data.reduce((sum, item) => sum + item.blood_pressure_diastolic, 0) / data.length)
                },
                avgTemperature: (data.reduce((sum, item) => sum + item.temperature, 0) / data.length).toFixed(1),
                avgBloodOxygen: Math.round(data.reduce((sum, item) => sum + item.blood_oxygen, 0) / data.length)
            },
            trends: {
                heartRate: this.calculateTrend(data.map(item => item.heart_rate)),
                bloodPressure: this.calculateTrend(data.map(item => item.blood_pressure_systolic)),
                activity: this.analyzeActivityPattern(data)
            },
            alerts: this.generateHealthAlerts(data)
        };

        return {
            success: true,
            data: report
        };
    }

    calculateTrend(values) {
        if (values.length < 2) return 'stable';
        
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
        
        const diff = secondAvg - firstAvg;
        if (diff > 2) return 'increasing';
        if (diff < -2) return 'decreasing';
        return 'stable';
    }

    analyzeActivityPattern(data) {
        const activityCounts = data.reduce((acc, item) => {
            acc[item.activity_level] = (acc[item.activity_level] || 0) + 1;
            return acc;
        }, {});
        
        const total = data.length;
        return {
            low: ((activityCounts.low || 0) / total * 100).toFixed(1) + '%',
            medium: ((activityCounts.medium || 0) / total * 100).toFixed(1) + '%',
            high: ((activityCounts.high || 0) / total * 100).toFixed(1) + '%'
        };
    }

    generateHealthAlerts(data) {
        const alerts = [];
        
        const latestData = data[data.length - 1];
        if (latestData.heart_rate > 100) {
            alerts.push({ type: 'warning', message: '心率偏高，建议休息' });
        }
        if (latestData.blood_pressure_systolic > 140) {
            alerts.push({ type: 'danger', message: '血压偏高，建议就医' });
        }
        if (latestData.blood_oxygen < 95) {
            alerts.push({ type: 'warning', message: '血氧偏低，注意休息' });
        }
        
        return alerts;
    }
}

// 创建单例实例
const elderCareAPI = new ElderCareAPI();

export default elderCareAPI;
