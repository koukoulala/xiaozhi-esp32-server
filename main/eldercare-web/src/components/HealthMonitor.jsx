import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { 
  Activity, 
  Heart,
  Thermometer,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Shield,
  CheckCircle,
  Calendar,
  Download
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts'
import ElderCareAPI from '@/services/api.js'

function HealthMonitor() {
  const [healthData, setHealthData] = useState([])
  const [latestData, setLatestData] = useState(null)
  const [emergencyCalls, setEmergencyCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [selectedDays, setSelectedDays] = useState(7)
  const [autoRefresh, setAutoRefresh] = useState(false)
  
  const currentUser = ElderCareAPI.getCurrentUser()
  const userId = currentUser?.id || 1

  const loadHealthData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 获取用户健康数据
      const healthResponse = await ElderCareAPI.getHealthData(userId, selectedDays)
      if (healthResponse.success && healthResponse.data) {
        setHealthData(healthResponse.data)
      }
      
      // 获取最新健康数据
      const latestResponse = await ElderCareAPI.getLatestHealthData(userId)
      if (latestResponse.success && latestResponse.data) {
        setLatestData(latestResponse.data)
      }
      
      // 获取紧急呼叫记录 (使用monitor data API)
      const monitorResponse = await ElderCareAPI.getMonitorData(userId, selectedDays)
      if (monitorResponse && monitorResponse.emergency_calls) {
        setEmergencyCalls(monitorResponse.emergency_calls)
      }
      
      setSuccess('健康数据已更新')
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (err) {
      setError(`加载健康数据失败: ${err.message}`)
      console.error('Failed to load health data:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateHealthReport = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - selectedDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const response = await ElderCareAPI.generateHealthReport(userId, startDate, endDate)
      
      if (response.success) {
        setSuccess('健康报告生成成功')
        // 这里可以添加下载逻辑
      } else {
        setError(response.message || '健康报告生成失败')
      }
    } catch (err) {
      setError(`生成健康报告失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHealthData()
  }, [selectedDays])

  useEffect(() => {
    let interval
    if (autoRefresh) {
      interval = setInterval(() => {
        loadHealthData()
      }, 60000) // 每分钟刷新一次
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, selectedDays])

  // 获取最新的健康数据
  const currentHealthData = latestData || (healthData.length > 0 ? healthData[0] : null)
  
  // 转换数据格式用于图表
  const chartData = healthData.slice(-24).reverse().map(item => ({
    time: new Date(item.timestamp || item.recorded_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    heartRate: item.heart_rate,
    bloodPressure: item.blood_pressure_systolic,
    diastolic: item.blood_pressure_diastolic,
    temperature: item.temperature,
    oxygenSaturation: item.oxygen_saturation
  }))

  // 健康状态评估
  const getHealthStatus = (data) => {
    if (!data) return { status: 'unknown', message: '暂无数据' }
    
    const hr = data.heart_rate
    const systolic = data.blood_pressure_systolic
    const temp = data.temperature
    
    if (hr && (hr < 60 || hr > 100)) return { status: 'warning', message: '心率异常' }
    if (systolic && (systolic < 90 || systolic > 140)) return { status: 'warning', message: '血压异常' }
    if (temp && (temp < 36 || temp > 37.5)) return { status: 'warning', message: '体温异常' }
    
    return { status: 'normal', message: '健康状态良好' }
  }

  const healthStatus = getHealthStatus(currentHealthData)

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

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* 健康状态总览 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                健康状态总览
                <Badge 
                  className="ml-2"
                  variant={healthStatus.status === 'normal' ? 'default' : 'destructive'}
                >
                  {healthStatus.message}
                </Badge>
              </CardTitle>
              <CardDescription>实时监测老人的健康状况</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={selectedDays.toString()} onValueChange={(value) => setSelectedDays(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">今天</SelectItem>
                  <SelectItem value="7">7天</SelectItem>
                  <SelectItem value="30">30天</SelectItem>
                  <SelectItem value="90">90天</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-green-50' : ''}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? '自动刷新' : '手动刷新'}
              </Button>
              <Button variant="outline" size="sm" onClick={generateHealthReport}>
                <Download className="h-4 w-4 mr-1" />
                健康报告
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">心率</CardTitle>
                <Heart className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentHealthData?.heart_rate || '--'} {currentHealthData?.heart_rate ? 'bpm' : ''}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentHealthData?.heart_rate ? 
                    (currentHealthData.heart_rate >= 60 && currentHealthData.heart_rate <= 100 ? '正常范围' : '需要关注')
                    : '暂无数据'
                  }
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
                  {currentHealthData?.blood_pressure_systolic && currentHealthData?.blood_pressure_diastolic
                    ? `${currentHealthData.blood_pressure_systolic}/${currentHealthData.blood_pressure_diastolic}`
                    : '--'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentHealthData?.blood_pressure_systolic ? 
                    (currentHealthData.blood_pressure_systolic <= 120 ? '理想血压' : '需要关注')
                    : '暂无数据'
                  }
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
                  {currentHealthData?.temperature || '--'}{currentHealthData?.temperature ? '°C' : ''}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentHealthData?.temperature ? 
                    (currentHealthData.temperature >= 36.0 && currentHealthData.temperature <= 37.5 ? '正常体温' : '需要关注')
                    : '暂无数据'
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">血氧</CardTitle>
                <Activity className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentHealthData?.oxygen_saturation || '--'}{currentHealthData?.oxygen_saturation ? '%' : ''}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentHealthData?.oxygen_saturation ? 
                    (currentHealthData.oxygen_saturation >= 95 ? '正常范围' : '需要关注')
                    : '暂无数据'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
          <Tabs defaultValue="vitals" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="vitals">生命体征</TabsTrigger>
              <TabsTrigger value="trends">趋势分析</TabsTrigger>
              <TabsTrigger value="activity">活动记录</TabsTrigger>
              <TabsTrigger value="alerts">异常警报</TabsTrigger>
            </TabsList>
            
            <TabsContent value="vitals" className="space-y-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="heartRate" stroke="#ef4444" name="心率" strokeWidth={2} />
                    <Line type="monotone" dataKey="bloodPressure" stroke="#3b82f6" name="收缩压" strokeWidth={2} />
                    <Line type="monotone" dataKey="temperature" stroke="#f97316" name="体温" strokeWidth={2} />
                    <Line type="monotone" dataKey="oxygenSaturation" stroke="#10b981" name="血氧" strokeWidth={2} />
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

            <TabsContent value="trends" className="space-y-4">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="heartRate" stackId="1" stroke="#ef4444" fill="#fca5a5" name="心率" />
                    <Area type="monotone" dataKey="bloodPressure" stackId="2" stroke="#3b82f6" fill="#93c5fd" name="血压" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无趋势数据</p>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    活动水平分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="heartRate" fill="#8884d8" name="活动强度（心率）" />
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
                            <p className="font-medium">{call.notes || '紧急呼叫'}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(call.timestamp || call.created_at).toLocaleString('zh-CN')}
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

export default HealthMonitor