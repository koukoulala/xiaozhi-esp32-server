import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { 
  Heart, 
  Activity, 
  Thermometer, 
  Phone, 
  Calendar, 
  AlertTriangle,
  Shield,
  Clock,
  RefreshCw
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ElderCareAPI from '../services/api.js'

function Dashboard() {
  const [deviceStatus, setDeviceStatus] = useState('offline')
  const [lastActivity, setLastActivity] = useState('未知')
  const [healthData, setHealthData] = useState([])
  const [reminders, setReminders] = useState([])
  const [emergencyCalls, setEmergencyCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 获取当前用户ID作为deviceId参数
      const currentUser = ElderCareAPI.getCurrentUser()
      const userId = currentUser?.id || 1
      
      // 获取真实的健康数据
      const [healthResponse, reminderResponse] = await Promise.all([
        ElderCareAPI.getHealthData(userId, 1), // 获取近1天的健康数据
        ElderCareAPI.getHealthReminders(userId) // 获取用户提醒
      ])
      
      if (healthResponse && healthResponse.success) {
        setHealthData(healthResponse.data || [])
      } else {
        console.warn('获取健康数据失败:', healthResponse?.message)
        setHealthData([])
      }
      
      if (reminderResponse && reminderResponse.success) {
        setReminders(reminderResponse.data || [])
      } else {
        console.warn('获取提醒数据失败:', reminderResponse?.message)
        setReminders([])
      }
      
      // 设置空的紧急呼叫数据，因为这个数据在当前数据库中没有
      setEmergencyCalls([])
      
      // 获取设备状态 - 使用用户的智能陪伴设备
      try {
        // 先获取用户的AI设备列表
        const devicesResponse = await ElderCareAPI.getUserAIDevices(userId)
        if (devicesResponse.success && devicesResponse.data && devicesResponse.data.length > 0) {
          // 使用第一个AI设备作为智能陪伴设备
          const userDevice = devicesResponse.data[0]
          const deviceInfo = await ElderCareAPI.getDeviceStatus(userDevice.id || userDevice.device_id)
          setDeviceStatus(deviceInfo.status === 'online' ? 'online' : 'offline')
          setLastActivity(deviceInfo.last_activity || '未知')
        } else {
          // 用户没有智能陪伴设备
          setDeviceStatus('offline')
          setLastActivity('未配置智能陪伴设备')
        }
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
    // 移除自动刷新，改为手动刷新
  }, [])

  // 计算今日健康指标
  const latestHealthData = healthData.length > 0 ? healthData[0] : null
  const todayEmergencyCalls = emergencyCalls.filter(call => {
    const today = new Date().toDateString()
    const callDate = new Date(call.timestamp).toDateString()
    return today === callDate
  }).length

  // 转换健康数据格式用于图表显示
  const chartData = healthData.slice(-12).reverse().map((item, index) => ({
    time: new Date(item.timestamp).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
    heartRate: item.heart_rate || 0,
    bloodPressure: item.blood_pressure_systolic || 0,
    temperature: item.body_temperature || 0
  }))
  
  // 如果没有真实数据，创建示例数据用于图表显示
  const displayChartData = chartData.length > 0 ? chartData : [
    { time: '今日', heartRate: 0, bloodPressure: 0, temperature: 0 }
  ]

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
          <CardTitle>近期健康趋势</CardTitle>
          <CardDescription>
            {healthData.length > 0 ? 
              `展示最近${healthData.length}天的健康数据趋势` : 
              '暂无健康数据'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayChartData.length > 0 && displayChartData[0].heartRate > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={displayChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === '心率') return [`${value} BPM`, name]
                    if (name === '收缩压') return [`${value} mmHg`, name]
                    if (name === '体温') return [`${value}°C`, name]
                    return [value, name]
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="heartRate" 
                  stroke="#8884d8" 
                  name="心率" 
                  strokeWidth={2}
                  dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="bloodPressure" 
                  stroke="#82ca9d" 
                  name="收缩压" 
                  strokeWidth={2}
                  dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#ffc658" 
                  name="体温" 
                  strokeWidth={2}
                  dot={{ fill: '#ffc658', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无健康数据</p>
                <p className="text-sm">
                  {healthData.length === 0 ? 
                    '等待设备数据同步...' : 
                    '当前用户暂无健康监测数据'
                  }
                </p>
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

export default Dashboard