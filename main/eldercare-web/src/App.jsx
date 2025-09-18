import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { 
  Heart, 
  Activity, 
  Thermometer, 
  Phone, 
  Mic, 
  Calendar, 
  AlertTriangle,
  User,
  Settings,
  Home,
  Shield,
  Clock,
  TrendingUp,
  Volume2,
  RefreshCw,
  UserPlus,
  Smartphone
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import ElderCareAPI from './services/api.js'
import UserRegistration from './components/UserRegistration.jsx'
import UserLogin from './components/UserLogin.jsx'
import DeviceManagement from './components/DeviceManagement.jsx'
import './App.css'

function Dashboard() {
  const [deviceStatus, setDeviceStatus] = useState('offline')
  const [lastActivity, setLastActivity] = useState('未知')
  const [healthData, setHealthData] = useState([])
  const [reminders, setReminders] = useState([])
  const [emergencyCalls, setEmergencyCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const deviceId = 'demo-device-001' // 默认设备ID，实际应用中应该从用户登录信息获取

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 获取监护数据
      const data = await ElderCareAPI.getMonitorData(deviceId, 1) // 获取1天数据
      
      if (data) {
        setHealthData(data.health_data || [])
        setReminders(data.reminders || [])
        setEmergencyCalls(data.emergency_calls || [])
      }
      
      // 获取设备状态
      try {
        const deviceInfo = await ElderCareAPI.getDeviceStatus(deviceId)
        setDeviceStatus(deviceInfo.status === 'online' ? 'online' : 'offline')
        setLastActivity(deviceInfo.last_activity || '未知')
      } catch (err) {
        console.warn('Device status unavailable:', err)
        setDeviceStatus('offline')
      }
      
    } catch (err) {
      setError(`加载数据失败: ${err.message}`)
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
    
    // 设置定时刷新
    const interval = setInterval(loadDashboardData, 30000) // 30秒刷新一次
    
    return () => clearInterval(interval)
  }, [])

  // 计算今日健康指标
  const latestHealthData = healthData.length > 0 ? healthData[0] : null
  const todayEmergencyCalls = emergencyCalls.filter(call => {
    const today = new Date().toDateString()
    const callDate = new Date(call.timestamp).toDateString()
    return today === callDate
  }).length

  // 转换健康数据格式用于图表显示
  const chartData = healthData.slice(-24).reverse().map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    heartRate: item.heart_rate,
    bloodPressure: item.blood_pressure_systolic,
    temperature: item.temperature
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* 设备状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">设备状态</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={deviceStatus === 'online' ? 'default' : 'destructive'}>
                {deviceStatus === 'online' ? '在线' : '离线'}
              </Badge>
              <span className="text-sm text-muted-foreground">最后活动: {lastActivity}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={loadDashboardData}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今日健康指标</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {latestHealthData ? (
              <>
                <div className="text-2xl font-bold">正常</div>
                <p className="text-xs text-muted-foreground">
                  心率: {latestHealthData.heart_rate || '--'} bpm, 血压: {latestHealthData.blood_pressure_systolic || '--'}/{latestHealthData.blood_pressure_diastolic || '--'}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-400">无数据</div>
                <p className="text-xs text-muted-foreground">暂无健康数据</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">紧急呼救</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${todayEmergencyCalls === 0 ? 'text-green-600' : 'text-red-600'}`}>
              {todayEmergencyCalls}
            </div>
            <p className="text-xs text-muted-foreground">
              {todayEmergencyCalls === 0 ? '今日无紧急情况' : `今日${todayEmergencyCalls}次紧急呼救`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 健康数据图表 */}
      <Card>
        <CardHeader>
          <CardTitle>今日健康趋势</CardTitle>
          <CardDescription>实时监测老人的健康指标变化</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="heartRate" stroke="#8884d8" name="心率" />
                <Line type="monotone" dataKey="bloodPressure" stroke="#82ca9d" name="血压" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无健康数据</p>
                <p className="text-sm">等待设备数据同步...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 今日提醒 */}
      <Card>
        <CardHeader>
          <CardTitle>今日提醒事项</CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length > 0 ? (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{reminder.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(reminder.scheduled_time).toLocaleTimeString('zh-CN', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant={reminder.is_completed ? 'default' : 'secondary'}>
                    {reminder.is_completed ? '已完成' : '待完成'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无提醒事项</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function HealthMonitor() {
  const [healthData, setHealthData] = useState([])
  const [emergencyCalls, setEmergencyCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const deviceId = 'demo-device-001'

  const loadHealthData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await ElderCareAPI.getMonitorData(deviceId, 7)
      if (data) {
        setHealthData(data.health_data || [])
        setEmergencyCalls(data.emergency_calls || [])
      }
    } catch (err) {
      setError(`加载健康数据失败: ${err.message}`)
      console.error('Failed to load health data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHealthData()
  }, [])

  // 获取最新的健康数据
  const latestHealthData = healthData.length > 0 ? healthData[0] : null
  
  // 转换数据格式用于图表
  const chartData = healthData.slice(-24).reverse().map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    heartRate: item.heart_rate,
    bloodPressure: item.blood_pressure_systolic,
    temperature: item.temperature
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>加载健康数据中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>健康数据详情</CardTitle>
              <CardDescription>查看老人的详细健康监测数据</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadHealthData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="vitals" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="vitals">生命体征</TabsTrigger>
              <TabsTrigger value="activity">活动记录</TabsTrigger>
              <TabsTrigger value="alerts">异常警报</TabsTrigger>
            </TabsList>
            
            <TabsContent value="vitals" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">心率</CardTitle>
                    <Heart className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {latestHealthData?.heart_rate || '--'} {latestHealthData?.heart_rate ? 'bpm' : ''}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {latestHealthData?.heart_rate ? '正常范围' : '暂无数据'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">血压</CardTitle>
                    <Activity className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {latestHealthData?.blood_pressure_systolic && latestHealthData?.blood_pressure_diastolic
                        ? `${latestHealthData.blood_pressure_systolic}/${latestHealthData.blood_pressure_diastolic}`
                        : '--'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {latestHealthData?.blood_pressure_systolic ? '理想血压' : '暂无数据'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">体温</CardTitle>
                    <Thermometer className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {latestHealthData?.temperature || '--'}{latestHealthData?.temperature ? '°C' : ''}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {latestHealthData?.temperature ? '正常体温' : '暂无数据'}
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="heartRate" stroke="#ef4444" name="心率" />
                    <Line type="monotone" dataKey="bloodPressure" stroke="#3b82f6" name="血压" />
                    <Line type="monotone" dataKey="temperature" stroke="#f97316" name="体温" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无健康数据</p>
                    <p className="text-sm">等待设备数据同步...</p>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>活动水平</CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="heartRate" fill="#8884d8" name="活动强度" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>暂无活动数据</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="alerts">
              <div className="space-y-4">
                {emergencyCalls.length > 0 ? (
                  emergencyCalls.map((call) => (
                    <Alert key={call.id}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{call.notes}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(call.timestamp).toLocaleString('zh-CN')}
                            </p>
                          </div>
                          <Badge variant={call.status === 'resolved' ? 'default' : 'destructive'}>
                            {call.status === 'resolved' ? '已处理' : '待处理'}
                          </Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无异常警报</p>
                    <p className="text-sm">系统监控正常</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function VoiceClone() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [familyMemberName, setFamilyMemberName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [voiceClones, setVoiceClones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const deviceId = 'demo-device-001'

  const loadVoiceClones = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ElderCareAPI.getVoiceClones(deviceId)
      setVoiceClones(data.voice_clones || [])
    } catch (err) {
      setError(`加载声音克隆列表失败: ${err.message}`)
      console.error('Failed to load voice clones:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVoiceClones()
  }, [])

  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file && file.type.startsWith('audio/')) {
      setSelectedFile(file)
      setError(null)
    } else {
      setError('请选择音频文件')
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile || !familyMemberName) {
      setError('请填写完整信息')
      return
    }
    
    try {
      setIsUploading(true)
      setError(null)
      
      // 将音频文件转换为base64
      const base64Data = await ElderCareAPI.fileToBase64(selectedFile)
      
      const voiceData = {
        device_id: deviceId,
        family_member_name: familyMemberName,
        voice_data: base64Data
      }
      
      await ElderCareAPI.createVoiceClone(voiceData)
      
      // 重置表单并刷新列表
      setSelectedFile(null)
      setFamilyMemberName('')
      await loadVoiceClones()
      
      alert('声音克隆成功！')
    } catch (err) {
      setError(`声音克隆失败: ${err.message}`)
      console.error('Voice clone failed:', err)
    } finally {
      setIsUploading(false)
    }
  }

  const testVoice = async (voiceId, familyName) => {
    // 这里可以实现声音测试功能，调用xiaozhi的TTS服务
    alert(`测试${familyName}的声音克隆功能`)
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>声音克隆管理</CardTitle>
          <CardDescription>上传家人声音，让AI用熟悉的声音陪伴老人</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="family-name">家人姓名</Label>
            <Input
              id="family-name"
              placeholder="请输入家人姓名"
              value={familyMemberName}
              onChange={(e) => setFamilyMemberName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="voice-file">声音文件</Label>
            <Input
              id="voice-file"
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                已选择: {selectedFile.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              建议上传清晰的音频文件，时长30秒至2分钟为佳
            </p>
          </div>
          
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedFile || !familyMemberName || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                正在处理...
              </>
            ) : (
              '开始声音克隆'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>已克隆的声音</CardTitle>
            <Button variant="outline" size="sm" onClick={loadVoiceClones} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              加载中...
            </div>
          ) : voiceClones.length > 0 ? (
            <div className="space-y-3">
              {voiceClones.map((voice) => (
                <div key={voice.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{voice.family_member_name}</p>
                      <p className="text-sm text-muted-foreground">
                        创建于 {new Date(voice.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={voice.is_active ? 'default' : 'secondary'}>
                      {voice.is_active ? '启用中' : '已禁用'}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => testVoice(voice.id, voice.family_member_name)}
                    >
                      测试
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无声音克隆</p>
              <p className="text-sm">上传家人声音开始使用</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AgentManagement() {
  const [agents, setAgents] = useState([])
  const [templates, setTemplates] = useState([])
  const [devices, setDevices] = useState([])
  const [chatSessions, setChatSessions] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // 新建智能体表单数据
  const [formData, setFormData] = useState({
    agent_name: '',
    agent_intro: '',
    agent_prompt: '',
    template_id: ''
  })

  const loadAgents = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('http://localhost:8003/eldercare/agents?user_id=1')
      const data = await response.json()
      if (data.success) {
        setAgents(data.data || [])
      }
    } catch (err) {
      setError(`加载智能体列表失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch('http://localhost:8003/eldercare/agents/templates')
      const data = await response.json()
      if (data.success) {
        setTemplates(data.data || [])
      }
    } catch (err) {
      console.error('Failed to load templates:', err)
    }
  }

  const loadAgentDevices = async (agentId) => {
    try {
      const response = await fetch(`http://localhost:8003/eldercare/agents/${agentId}/devices`)
      const data = await response.json()
      if (data.success) {
        setDevices(data.data || [])
      }
    } catch (err) {
      console.error('Failed to load agent devices:', err)
    }
  }

  const loadChatSessions = async (agentId) => {
    try {
      const response = await fetch(`http://localhost:8003/eldercare/agents/${agentId}/sessions?page=1&size=10`)
      const data = await response.json()
      if (data.success) {
        setChatSessions(data.data || [])
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err)
    }
  }

  useEffect(() => {
    loadAgents()
    loadTemplates()
  }, [])

  const handleCreateAgent = async () => {
    if (!formData.agent_name || !formData.agent_prompt) {
      setError('请填写智能体名称和角色设定')
      return
    }

    try {
      const response = await fetch('http://localhost:8003/eldercare/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      if (data.success) {
        setFormData({ agent_name: '', agent_intro: '', agent_prompt: '', template_id: '' })
        setShowCreateForm(false)
        await loadAgents()
        alert('智能体创建成功！')
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError(`创建智能体失败: ${err.message}`)
    }
  }

  const handleSelectAgent = async (agent) => {
    setSelectedAgent(agent)
    await loadAgentDevices(agent.id)
    await loadChatSessions(agent.id)
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>智能体管理</CardTitle>
              <CardDescription>管理陪伴老人的AI智能体，配置角色和设备</CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <User className="h-4 w-4 mr-2" />
              新建智能体
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              加载中...
            </div>
          ) : agents.length > 0 ? (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div 
                  key={agent.id} 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedAgent?.id === agent.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleSelectAgent(agent)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{agent.agent_name}</p>
                      <p className="text-sm text-muted-foreground">{agent.agent_intro || '暂无介绍'}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        创建时间: {new Date(agent.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                      {agent.is_active ? '启用' : '禁用'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无智能体</p>
              <p className="text-sm">创建智能体开始使用陪伴功能</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 智能体详情和管理 */}
      {selectedAgent && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 智能体详情 */}
          <Card>
            <CardHeader>
              <CardTitle>智能体详情</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>助手昵称</Label>
                <p className="text-sm text-muted-foreground mt-1">{selectedAgent.agent_name}</p>
              </div>
              <div>
                <Label>角色介绍</Label>
                <p className="text-sm text-muted-foreground mt-1">{selectedAgent.agent_intro || '暂无介绍'}</p>
              </div>
              <div>
                <Label>角色设定</Label>
                <p className="text-sm text-muted-foreground mt-1 max-h-24 overflow-y-auto">
                  {selectedAgent.agent_prompt}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">编辑配置</Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowChatHistory(!showChatHistory)}
                >
                  {showChatHistory ? '隐藏' : '查看'}聊天记录
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 设备管理 */}
          <Card>
            <CardHeader>
              <CardTitle>关联设备</CardTitle>
            </CardHeader>
            <CardContent>
              {devices.length > 0 ? (
                <div className="space-y-3">
                  {devices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{device.device_name}</p>
                          <p className="text-sm text-muted-foreground">设备码: {device.device_code}</p>
                        </div>
                      </div>
                      <Badge variant={device.is_online ? 'default' : 'secondary'}>
                        {device.is_online ? '在线' : '离线'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-6">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无关联设备</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 聊天记录（可折叠） */}
      {selectedAgent && showChatHistory && (
        <Card>
          <CardHeader>
            <CardTitle>聊天记录</CardTitle>
          </CardHeader>
          <CardContent>
            {chatSessions.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {chatSessions.map((session) => (
                  <div key={session.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">会话 {session.session_id}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <Badge variant="outline">{session.message_count || 0} 条消息</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-6">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无聊天记录</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 创建智能体表单弹窗 */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>创建新智能体</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>助手昵称</Label>
                <Input
                  placeholder="输入智能体名称"
                  value={formData.agent_name}
                  onChange={(e) => setFormData({...formData, agent_name: e.target.value})}
                />
              </div>
              <div>
                <Label>角色模板</Label>
                <Select value={formData.template_id} onValueChange={(value) => setFormData({...formData, template_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择角色模板（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.template_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>角色介绍</Label>
                <Input
                  placeholder="简单介绍智能体角色"
                  value={formData.agent_intro}
                  onChange={(e) => setFormData({...formData, agent_intro: e.target.value})}
                />
              </div>
              <div>
                <Label>角色设定</Label>
                <Textarea
                  placeholder="详细描述智能体的性格、说话方式等"
                  value={formData.agent_prompt}
                  onChange={(e) => setFormData({...formData, agent_prompt: e.target.value})}
                  rows={4}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleCreateAgent} className="flex-1">
                  创建
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)} className="flex-1">
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function Reminders() {
  const [reminderType, setReminderType] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  
  const deviceId = 'demo-device-001'

  const loadReminders = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ElderCareAPI.getMonitorData(deviceId, 30) // 获取30天的提醒
      setReminders(data.reminders || [])
    } catch (err) {
      setError(`加载提醒列表失败: ${err.message}`)
      console.error('Failed to load reminders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReminders()
  }, [])

  const handleSubmit = async () => {
    if (!reminderType || !title || !scheduledTime) {
      setError('请填写完整信息')
      return
    }
    
    try {
      setSubmitting(true)
      setError(null)
      
      const reminderData = {
        device_id: deviceId,
        reminder_type: reminderType,
        title: title,
        content: content,
        scheduled_time: scheduledTime
      }
      
      await ElderCareAPI.createHealthReminder(reminderData)
      
      // 重置表单并刷新列表
      setReminderType('')
      setTitle('')
      setContent('')
      setScheduledTime('')
      await loadReminders()
      
      alert('提醒设置成功！')
    } catch (err) {
      setError(`设置提醒失败: ${err.message}`)
      console.error('Failed to create reminder:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const getReminderTypeText = (type) => {
    const types = {
      'medication': '服药提醒',
      'appointment': '体检预约',
      'exercise': '运动提醒',
      'meal': '用餐提醒'
    }
    return types[type] || type
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>设置健康提醒</CardTitle>
          <CardDescription>为老人设置药物、体检等重要提醒</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reminder-type">提醒类型</Label>
            <Select value={reminderType} onValueChange={setReminderType}>
              <SelectTrigger>
                <SelectValue placeholder="选择提醒类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medication">服药提醒</SelectItem>
                <SelectItem value="appointment">体检预约</SelectItem>
                <SelectItem value="exercise">运动提醒</SelectItem>
                <SelectItem value="meal">用餐提醒</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title">提醒标题</Label>
            <Input
              id="title"
              placeholder="请输入提醒标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">提醒内容</Label>
            <Textarea
              id="content"
              placeholder="请输入详细的提醒内容（可选）"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="scheduled-time">提醒时间</Label>
            <Input
              id="scheduled-time"
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={submitting || !reminderType || !title || !scheduledTime}
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                设置中...
              </>
            ) : (
              '设置提醒'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>提醒列表</CardTitle>
            <Button variant="outline" size="sm" onClick={loadReminders} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              加载中...
            </div>
          ) : reminders.length > 0 ? (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{reminder.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {getReminderTypeText(reminder.reminder_type)} • {
                          new Date(reminder.scheduled_time).toLocaleString('zh-CN')
                        }
                      </p>
                      {reminder.content && (
                        <p className="text-xs text-gray-600 mt-1">{reminder.content}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={reminder.is_completed ? 'default' : 'secondary'}>
                      {reminder.is_completed ? '已完成' : '待完成'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无提醒事项</p>
              <p className="text-sm">添加健康提醒帮助老人记住重要事情</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentUser, setCurrentUser] = useState(null)
  const [showRegistration, setShowRegistration] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    // 检查是否有已登录用户
    const user = ElderCareAPI.getCurrentUser()
    if (user) {
      setCurrentUser(user)
    } else {
      // 如果没有用户，显示登录界面
      setShowLogin(true)
    }
  }, [])

  const handleRegistrationComplete = (userId, userData) => {
    // 注册完成后的处理
    const user = {
      id: userId,
      username: userData.familyInfo.name,
      realName: userData.familyInfo.name,
      elderName: userData.elderInfo.name,
      phone: userData.familyInfo.phone
    }
    setCurrentUser(user)
    setShowRegistration(false)
    setShowLogin(false)
    
    // 保存用户信息
    localStorage.setItem('eldercare_user', JSON.stringify(user))
  }

  const handleLoginSuccess = (userData) => {
    // 登录成功后的处理
    setCurrentUser(userData)
    setShowLogin(false)
    setShowRegistration(false)
    
    // 保存用户信息
    localStorage.setItem('eldercare_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    ElderCareAPI.logout()
    setCurrentUser(null)
    setShowLogin(true)
    setShowRegistration(false)
  }

  const showRegisterForm = () => {
    setShowLogin(false)
    setShowRegistration(true)
  }

  // 如果显示登录界面
  if (showLogin) {
    return <UserLogin onLoginSuccess={handleLoginSuccess} onShowRegister={showRegisterForm} />
  }

  // 如果显示注册界面
  if (showRegistration) {
    return <UserRegistration onRegistrationComplete={handleRegistrationComplete} />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">智慧养老陪伴系统</h1>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <Badge variant="outline">设备在线</Badge>
            {currentUser && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {currentUser.realName} - 照护 {currentUser.elderName}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <User className="h-4 w-4 mr-2" />
                  注销
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex">
        <div className="w-64 border-r bg-muted/40 min-h-[calc(100vh-4rem)]">
          <div className="p-4">
            <nav className="space-y-2">
              <Button
                variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('dashboard')}
              >
                <Home className="h-4 w-4 mr-2" />
                监控面板
              </Button>
              <Button
                variant={activeTab === 'devices' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('devices')}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                设备管理
              </Button>
              <Button
                variant={activeTab === 'agents' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('agents')}
              >
                <User className="h-4 w-4 mr-2" />
                智能体管理
              </Button>
              <Button
                variant={activeTab === 'health' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('health')}
              >
                <Activity className="h-4 w-4 mr-2" />
                健康监测
              </Button>
              <Button
                variant={activeTab === 'voice' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('voice')}
              >
                <Mic className="h-4 w-4 mr-2" />
                声音克隆
              </Button>
              <Button
                variant={activeTab === 'reminders' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('reminders')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                健康提醒
              </Button>
              <Button
                variant={activeTab === 'register' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => showRegisterForm()}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                重新注册
              </Button>
            </nav>
          </div>
        </div>

        <div className="flex-1 p-6">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'devices' && <DeviceManagement userId={currentUser?.id} />}
          {activeTab === 'agents' && <AgentManagement />}
          {activeTab === 'health' && <HealthMonitor />}
          {activeTab === 'voice' && <VoiceClone />}
          {activeTab === 'reminders' && <Reminders />}
        </div>
      </div>
    </div>
  )
}

export default App

