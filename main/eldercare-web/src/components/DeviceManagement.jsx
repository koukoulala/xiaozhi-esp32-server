// DeviceManagement.jsx - 设备管理和健康数据展示界面
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { 
  Activity, 
  Wifi, 
  Settings,
  Heart,
  Thermometer,
  Gauge,
  Battery,
  Signal,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Bluetooth,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Filter,
  Download
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import ElderCareAPI from '@/services/api.js'

const DeviceManagement = ({ userId = 1 }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('devices')
  
  // 设备状态
  const [devices, setDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [deviceStats, setDeviceStats] = useState({})
  
  // 健康数据
  const [healthData, setHealthData] = useState([])
  const [healthSummary, setHealthSummary] = useState({})
  const [healthAlerts, setHealthAlerts] = useState([])
  
  // 数据过滤
  const [dateRange, setDateRange] = useState('7') // 7天、30天、90天
  const [dataType, setDataType] = useState('all')

  useEffect(() => {
    loadAllData()
  }, [userId, dateRange])

  const loadAllData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      await Promise.all([
        loadDevices(),
        loadHealthData(),
        loadHealthSummary()
      ])
      
    } catch (err) {
      setError(`加载数据失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadDevices = async () => {
    try {
      const response = await ElderCareAPI.getUserDevices(userId)
      if (response.success) {
        const devicesData = response.data || []
        
        // 添加模拟的设备详细信息
        const enhancedDevices = devicesData.map(device => ({
          ...device,
          batteryLevel: Math.floor(Math.random() * 30) + 70, // 70-100%
          signalStrength: Math.floor(Math.random() * 30) + 70, // 70-100%
          temperature: (Math.random() * 5 + 18).toFixed(1), // 18-23°C
          lastSeen: device.last_online || new Date().toISOString(),
          firmwareVersion: '1.2.3',
          uptime: Math.floor(Math.random() * 720) + 24, // 24-744小时
          dataTransmitted: Math.floor(Math.random() * 500) + 100, // 100-600MB
          connectionType: ['WiFi', 'Bluetooth', '4G'][Math.floor(Math.random() * 3)]
        }))
        
        setDevices(enhancedDevices)
        
        if (enhancedDevices.length > 0 && !selectedDevice) {
          setSelectedDevice(enhancedDevices[0])
        }
      }
    } catch (err) {
      console.error('加载设备数据失败:', err)
    }
  }

  const loadHealthData = async () => {
    try {
      const response = await ElderCareAPI.getHealthData(userId, parseInt(dateRange))
      if (response.success) {
        const data = response.data || []
        
        // 数据预处理和趋势分析
        const processedData = data.map((item, index) => ({
          ...item,
          timestamp: new Date(item.timestamp).toISOString(),
          heartRateVariability: index > 0 ? Math.abs(item.heart_rate - data[index-1].heart_rate) : 0,
          bloodPressureTrend: index > 0 ? 
            (item.blood_pressure_systolic > data[index-1].blood_pressure_systolic ? 'up' :
             item.blood_pressure_systolic < data[index-1].blood_pressure_systolic ? 'down' : 'stable') : 'stable'
        }))
        
        setHealthData(processedData)
        
        // 生成健康警报
        const alerts = generateHealthAlerts(processedData)
        setHealthAlerts(alerts)
      }
    } catch (err) {
      console.error('加载健康数据失败:', err)
    }
  }

  const loadHealthSummary = async () => {
    try {
      const response = await ElderCareAPI.generateHealthReport(userId, 
        new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString(),
        new Date().toISOString()
      )
      
      if (response.success) {
        setHealthSummary(response.data.summary || {})
      }
    } catch (err) {
      console.error('加载健康摘要失败:', err)
    }
  }

  const generateHealthAlerts = (data) => {
    const alerts = []
    const latest = data[data.length - 1]
    
    if (!latest) return alerts
    
    // 心率异常
    if (latest.heart_rate > 100) {
      alerts.push({
        id: 'hr_high',
        type: 'warning',
        title: '心率偏高',
        message: `当前心率 ${latest.heart_rate} bpm，建议休息并观察`,
        timestamp: latest.timestamp,
        severity: 'medium'
      })
    } else if (latest.heart_rate < 60) {
      alerts.push({
        id: 'hr_low',
        type: 'info',
        title: '心率偏低',
        message: `当前心率 ${latest.heart_rate} bpm，如有不适请及时就医`,
        timestamp: latest.timestamp,
        severity: 'low'
      })
    }
    
    // 血压异常
    if (latest.blood_pressure_systolic > 140) {
      alerts.push({
        id: 'bp_high',
        type: 'danger',
        title: '血压偏高',
        message: `收缩压 ${latest.blood_pressure_systolic} mmHg，请注意休息并监测`,
        timestamp: latest.timestamp,
        severity: 'high'
      })
    }
    
    // 体温异常
    if (latest.temperature > 37.3) {
      alerts.push({
        id: 'temp_high',
        type: 'warning',
        title: '体温偏高',
        message: `当前体温 ${latest.temperature}°C，建议测量确认`,
        timestamp: latest.timestamp,
        severity: 'medium'
      })
    }
    
    // 血氧偏低
    if (latest.blood_oxygen < 95) {
      alerts.push({
        id: 'spo2_low',
        type: 'danger',
        title: '血氧偏低',
        message: `血氧饱和度 ${latest.blood_oxygen}%，建议立即关注`,
        timestamp: latest.timestamp,
        severity: 'high'
      })
    }
    
    return alerts
  }

  const getHealthTrend = (current, previous) => {
    if (!previous) return 'stable'
    const diff = ((current - previous) / previous) * 100
    if (diff > 5) return 'up'
    if (diff < -5) return 'down'
    return 'stable'
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const formatChartData = (data) => {
    return data.slice(-24).map(item => ({
      time: new Date(item.timestamp).toLocaleTimeString('zh-CN', { 
        month: 'short',
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      heartRate: item.heart_rate,
      bloodPressure: item.blood_pressure_systolic,
      temperature: item.temperature,
      bloodOxygen: item.blood_oxygen
    }))
  }

  const renderDeviceCard = (device) => (
    <Card 
      key={device.id} 
      className={`cursor-pointer transition-colors ${
        selectedDevice?.id === device.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
      }`}
      onClick={() => setSelectedDevice(device)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              device.status === 1 ? 'bg-green-500' : 'bg-gray-400'
            }`} />
            <div>
              <p className="font-medium">{device.device_name}</p>
              <p className="text-sm text-muted-foreground">ID: {device.id}</p>
            </div>
          </div>
          <Badge variant={device.status === 1 ? 'default' : 'secondary'}>
            {device.status === 1 ? '在线' : '离线'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Battery className="h-4 w-4 text-muted-foreground" />
            <span>{device.batteryLevel}%</span>
          </div>
          <div className="flex items-center space-x-2">
            <Signal className="h-4 w-4 text-muted-foreground" />
            <span>{device.signalStrength}%</span>
          </div>
          <div className="flex items-center space-x-2">
            <Thermometer className="h-4 w-4 text-muted-foreground" />
            <span>{device.temperature}°C</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{device.location || '客厅'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderDeviceDetail = () => {
    if (!selectedDevice) return null
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedDevice.device_name}</span>
              <div className="flex items-center space-x-2">
                <Badge variant={selectedDevice.status === 1 ? 'default' : 'secondary'}>
                  {selectedDevice.status === 1 ? '在线' : '离线'}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => loadDevices()}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  刷新
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Battery className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">电池电量</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{selectedDevice.batteryLevel}%</span>
                    <span className="text-sm text-muted-foreground">剩余约12小时</span>
                  </div>
                  <Progress value={selectedDevice.batteryLevel} className="h-2" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">信号强度</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{selectedDevice.signalStrength}%</span>
                    <span className="text-sm text-muted-foreground">{selectedDevice.connectionType}</span>
                  </div>
                  <Progress value={selectedDevice.signalStrength} className="h-2" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">运行时间</span>
                </div>
                <div>
                  <span className="text-2xl font-bold">{selectedDevice.uptime}</span>
                  <span className="text-sm text-muted-foreground ml-1">小时</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">数据传输</span>
                </div>
                <div>
                  <span className="text-2xl font-bold">{selectedDevice.dataTransmitted}</span>
                  <span className="text-sm text-muted-foreground ml-1">MB</span>
                </div>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">固件版本:</span>
                <span className="ml-2">{selectedDevice.firmwareVersion}</span>
              </div>
              <div>
                <span className="font-medium">最后通讯:</span>
                <span className="ml-2">
                  {new Date(selectedDevice.lastSeen).toLocaleString('zh-CN')}
                </span>
              </div>
              <div>
                <span className="font-medium">设备温度:</span>
                <span className="ml-2">{selectedDevice.temperature}°C</span>
              </div>
              <div>
                <span className="font-medium">安装位置:</span>
                <span className="ml-2">{selectedDevice.location || '客厅'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 设备诊断信息 */}
        <Card>
          <CardHeader>
            <CardTitle>设备诊断</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">系统运行正常</p>
                    <p className="text-sm text-muted-foreground">所有传感器工作正常</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-green-600">正常</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">数据加密传输</p>
                    <p className="text-sm text-muted-foreground">采用AES-256加密保护隐私</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-blue-600">安全</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium">建议更新固件</p>
                    <p className="text-sm text-muted-foreground">新版本v1.3.0已发布</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">更新</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderHealthDashboard = () => {
    const chartData = formatChartData(healthData)
    const latest = healthData[healthData.length - 1]
    
    return (
      <div className="space-y-6">
        {/* 健康指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span className="font-medium">心率</span>
                </div>
                {healthData.length > 1 && getTrendIcon(getHealthTrend(
                  latest?.heart_rate, 
                  healthData[healthData.length - 2]?.heart_rate
                ))}
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">
                  {latest?.heart_rate || '--'}
                </span>
                <span className="text-sm text-muted-foreground ml-1">bpm</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                平均: {healthSummary.avgHeartRate || '--'} bpm
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Gauge className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">血压</span>
                </div>
                {healthData.length > 1 && getTrendIcon(getHealthTrend(
                  latest?.blood_pressure_systolic, 
                  healthData[healthData.length - 2]?.blood_pressure_systolic
                ))}
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">
                  {latest?.blood_pressure_systolic || '--'}/{latest?.blood_pressure_diastolic || '--'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                平均: {healthSummary.avgBloodPressure?.systolic || '--'}/{healthSummary.avgBloodPressure?.diastolic || '--'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Thermometer className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">体温</span>
                </div>
                {healthData.length > 1 && getTrendIcon(getHealthTrend(
                  latest?.temperature, 
                  healthData[healthData.length - 2]?.temperature
                ))}
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">
                  {latest?.temperature || '--'}
                </span>
                <span className="text-sm text-muted-foreground ml-1">°C</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                平均: {healthSummary.avgTemperature || '--'}°C
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <span className="font-medium">血氧</span>
                </div>
                {healthData.length > 1 && getTrendIcon(getHealthTrend(
                  latest?.blood_oxygen, 
                  healthData[healthData.length - 2]?.blood_oxygen
                ))}
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">
                  {latest?.blood_oxygen || '--'}
                </span>
                <span className="text-sm text-muted-foreground ml-1">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                平均: {healthSummary.avgBloodOxygen || '--'}%
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* 健康警报 */}
        {healthAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                健康警报
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {healthAlerts.map((alert) => (
                <Alert key={alert.id} className={`${
                  alert.severity === 'high' ? 'border-red-200 bg-red-50' :
                  alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }`}>
                  <AlertTriangle className="h-4 w-4" />
                  <div className="flex items-center justify-between">
                    <div>
                      <AlertDescription>
                        <span className="font-medium">{alert.title}</span>
                        <br />
                        <span className="text-sm">{alert.message}</span>
                      </AlertDescription>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        alert.severity === 'high' ? 'destructive' :
                        alert.severity === 'medium' ? 'default' : 'secondary'
                      }>
                        {alert.severity === 'high' ? '高' :
                         alert.severity === 'medium' ? '中' : '低'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </Alert>
              ))}
            </CardContent>
          </Card>
        )}
        
        {/* 健康趋势图表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>健康趋势</CardTitle>
              <div className="flex items-center space-x-2">
                <select 
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="1">1天</option>
                  <option value="7">7天</option>
                  <option value="30">30天</option>
                  <option value="90">90天</option>
                </select>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  导出
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="heartRate" stroke="#ef4444" name="心率" strokeWidth={2} />
                  <Line type="monotone" dataKey="bloodPressure" stroke="#3b82f6" name="收缩压" strokeWidth={2} />
                  <Line type="monotone" dataKey="bloodOxygen" stroke="#10b981" name="血氧" strokeWidth={2} />
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
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>加载数据中...</span>
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="devices">设备管理</TabsTrigger>
          <TabsTrigger value="health">健康数据</TabsTrigger>
        </TabsList>
        
        <TabsContent value="devices" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>我的设备</span>
                    <Badge variant="outline">{devices.length} 台</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {devices.length > 0 ? (
                    devices.map(device => renderDeviceCard(device))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>暂无绑定设备</p>
                      <Button variant="outline" className="mt-2">
                        添加设备
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              {selectedDevice ? (
                renderDeviceDetail()
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center text-gray-500">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>请选择一个设备查看详情</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="health">
          {renderHealthDashboard()}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default DeviceManagement