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
  Calendar
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
      
      console.log(`正在获取用户 ${userId} 最近 ${selectedDays} 天的健康数据...`)
      
      // 并行获取健康数据
      const [healthResponse, latestResponse] = await Promise.all([
        ElderCareAPI.getHealthData(userId, selectedDays).catch(err => {
          console.warn('Health data API failed:', err)
          return { success: false, data: [] }
        }),
        ElderCareAPI.getLatestHealthData(userId).catch(err => {
          console.warn('Latest health data API failed:', err)
          return { success: false, data: null }
        })
      ])
      
      console.log('健康数据响应:', healthResponse)
      console.log('最新健康数据响应:', latestResponse)
      
      // 处理健康数据响应
      if (healthResponse.success && Array.isArray(healthResponse.data)) {
        setHealthData(healthResponse.data)
        console.log(`成功加载 ${healthResponse.data.length} 条健康记录`)
      } else if (healthResponse.data) {
        // 如果返回的是单个对象，转换为数组
        setHealthData([healthResponse.data])
        console.log('成功加载 1 条健康记录')
      } else {
        setHealthData([])
        console.log('未找到健康数据')
      }
      
      // 处理最新健康数据
      if (latestResponse.success && latestResponse.data) {
        setLatestData(latestResponse.data)
        console.log('成功加载最新健康数据:', latestResponse.data)
      } else {
        setLatestData(null)
        console.log('未找到最新健康数据')
      }
      
      // 获取紧急呼叫记录（从健康数据中筛选）
      if (healthResponse.success && Array.isArray(healthResponse.data)) {
        const emergencyRecords = healthResponse.data.filter(record => 
          record.emergency_triggered === 1 || record.fall_detected === 1
        ).map(record => ({
          id: record.id,
          message: record.fall_detected ? '跌倒检测警报' : '健康异常警报',
          timestamp: record.timestamp,
          status: 'resolved',
          priority: 'high',
          location: record.device_name || '未知设备',
          notes: `设备: ${record.device_name || '未知'} - 数据类型: ${record.data_type}`
        }))
        setEmergencyCalls(emergencyRecords)
        console.log(`找到 ${emergencyRecords.length} 条紧急记录`)
      } else {
        setEmergencyCalls([])
      }
      
      setSuccess(`健康数据已更新 (${healthResponse.data?.length || 0} 条记录)`)
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (err) {
      setError(`加载健康数据失败: ${err.message}`)
      console.error('Failed to load health data:', err)
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
  
  // 转换数据格式用于图表 - 优化时间显示格式
  const chartData = healthData.slice(-50).reverse().map(item => {
    const timestamp = item.timestamp || item.create_date
    const dateObj = new Date(timestamp)
    
    // 根据选择的天数决定时间显示格式
    let timeLabel;
    if (selectedDays === 1) {
      // 1天内显示时间
      timeLabel = dateObj.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } else if (selectedDays <= 7) {
      // 7天内显示日期+时间
      timeLabel = `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${dateObj.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    } else {
      // 超过7天显示完整日期
      timeLabel = dateObj.toLocaleDateString('zh-CN')
    }
    
    return {
      id: item.id,
      time: timeLabel,
      date: dateObj.toLocaleDateString('zh-CN'),
      fullDateTime: dateObj.toLocaleString('zh-CN'),
      heartRate: parseFloat(item.heart_rate) || 0,
      bloodPressure: parseFloat(item.blood_pressure_systolic) || 0,
      diastolic: parseFloat(item.blood_pressure_diastolic) || 0,
      temperature: parseFloat(item.body_temperature) || 0,
      oxygenSaturation: parseFloat(item.blood_oxygen) || 0,
      dataType: item.data_type,
      deviceName: item.device_name || '未知设备',
      stepCount: parseFloat(item.step_count) || 0,
      sleepDuration: parseFloat(item.sleep_duration) || 0
    }
  }).filter(item => 
    item.heartRate > 0 || 
    item.bloodPressure > 0 || 
    item.temperature > 0 || 
    item.oxygenSaturation > 0 ||
    item.stepCount > 0 ||
    item.sleepDuration > 0
  )

  // 健康状态评估
  const getHealthStatus = (data) => {
    if (!data) return { status: 'unknown', message: '暂无数据' }
    
    const hr = parseFloat(data.heart_rate)
    const systolic = parseFloat(data.blood_pressure_systolic)
    const temp = parseFloat(data.body_temperature)
    const oxygen = parseFloat(data.blood_oxygen)
    
    // 检查异常值
    const issues = []
    if (hr && (hr < 60 || hr > 100)) issues.push('心率')
    if (systolic && (systolic < 90 || systolic > 140)) issues.push('血压')
    if (temp && (temp < 36.0 || temp > 37.5)) issues.push('体温')
    if (oxygen && oxygen < 95) issues.push('血氧')
    
    if (issues.length > 0) {
      return { status: 'warning', message: `${issues.join('、')}异常` }
    }
    
    if (hr || systolic || temp || oxygen) {
      return { status: 'normal', message: '健康状态良好' }
    }
    
    return { status: 'unknown', message: '数据不完整' }
  }

  const healthStatus = getHealthStatus(currentHealthData)

  if (loading && !healthData.length) {
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
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
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
                  variant={healthStatus.status === 'normal' ? 'default' : healthStatus.status === 'warning' ? 'destructive' : 'secondary'}
                >
                  {healthStatus.message}
                </Badge>
              </CardTitle>
              <CardDescription>
                实时监测健康状况 - 数据来源于真实健康监测设备
                {healthData.length > 0 && (
                  <span className="ml-2 text-blue-600">
                    (已加载 {healthData.length} 条记录)
                  </span>
                )}
              </CardDescription>
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
                  {currentHealthData?.heart_rate ? `${currentHealthData.heart_rate} bpm` : '--'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentHealthData?.heart_rate ? 
                    (parseFloat(currentHealthData.heart_rate) >= 60 && parseFloat(currentHealthData.heart_rate) <= 100 ? '正常范围' : '需要关注')
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
                    (parseFloat(currentHealthData.blood_pressure_systolic) <= 120 ? '理想血压' : '需要关注')
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
                  {currentHealthData?.body_temperature ? 
                    `${currentHealthData.body_temperature}°C` : '--'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentHealthData?.body_temperature ? 
                    (() => {
                      const temp = parseFloat(currentHealthData.body_temperature)
                      return temp >= 36.0 && temp <= 37.5 ? '正常体温' : '需要关注'
                    })()
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
                  {currentHealthData?.blood_oxygen ? `${currentHealthData.blood_oxygen}%` : '--'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentHealthData?.blood_oxygen ? 
                    (parseFloat(currentHealthData.blood_oxygen) >= 95 ? '正常范围' : '需要关注')
                    : '暂无数据'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="vitals" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="vitals">生命体征</TabsTrigger>
              <TabsTrigger value="activity">活动记录</TabsTrigger>
              <TabsTrigger value="alerts">异常警报</TabsTrigger>
            </TabsList>
            
            <TabsContent value="vitals" className="space-y-4">
              {chartData.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    显示最近 {selectedDays} 天的生命体征数据 (共 {chartData.length} 条有效记录)
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value}${name === '心率' ? ' bpm' : name === '体温' ? '°C' : name === '血氧' ? '%' : (name === '收缩压' || name === '舒张压') ? ' mmHg' : ''}`, 
                          name
                        ]}
                        labelFormatter={(label) => `时间: ${label}`}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="heartRate" 
                        stroke="#ef4444" 
                        name="心率" 
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                        connectNulls={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="bloodPressure" 
                        stroke="#3b82f6" 
                        name="收缩压" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                        connectNulls={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="temperature" 
                        stroke="#f97316" 
                        name="体温" 
                        strokeWidth={2}
                        dot={{ fill: '#f97316', strokeWidth: 2, r: 3 }}
                        connectNulls={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="diastolic" 
                        stroke="#8b5cf6" 
                        name="舒张压" 
                        strokeWidth={2}
                        dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                        connectNulls={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="oxygenSaturation" 
                        stroke="#10b981" 
                        name="血氧" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                        connectNulls={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无健康数据</p>
                    <p className="text-sm">
                      {healthData.length === 0 ? 
                        '等待设备数据同步...' : 
                        '当前时间段内暂无有效的生命体征数据'
                      }
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={loadHealthData}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      重新加载
                    </Button>
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
                  <CardDescription>
                    基于真实健康监测设备数据分析活动强度和步数统计
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-sm text-gray-600">总步数</div>
                          <div className="text-lg font-bold text-green-600">
                            {chartData.reduce((sum, item) => sum + item.stepCount, 0).toLocaleString()} 步
                          </div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-600">平均步数</div>
                          <div className="text-lg font-bold text-blue-600">
                            {Math.round(chartData.reduce((sum, item) => sum + item.stepCount, 0) / chartData.filter(item => item.stepCount > 0).length || 0)} 步/天
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-4">
                        显示最近 {selectedDays} 天的每日步数统计
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData.filter(item => item.stepCount > 0)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="time" 
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value, name) => [`${value} 步`, name]}
                            labelFormatter={(label) => `时间: ${label}`}
                          />
                          <Bar 
                            dataKey="stepCount" 
                            fill="#22c55e" 
                            name="每日步数"
                            radius={[2, 2, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-500">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>暂无活动数据</p>
                        <p className="text-sm">等待健康监测设备上传活动数据</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="alerts">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">紧急呼叫与异常警报</h3>
                  <Badge variant="outline">
                    {emergencyCalls.length} 条记录
                  </Badge>
                </div>
                
                {emergencyCalls.length > 0 ? (
                  <div className="space-y-3">
                    {emergencyCalls.map((call, index) => (
                      <Alert key={call.id || index} variant={call.status === 'resolved' ? 'default' : 'destructive'}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium">{call.message}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {call.timestamp ? 
                                  new Date(call.timestamp).toLocaleString('zh-CN') : 
                                  '时间未知'
                                }
                              </p>
                              {call.location && (
                                <p className="text-sm text-muted-foreground">
                                  位置: {call.location}
                                </p>
                              )}
                              {call.notes && (
                                <p className="text-sm text-muted-foreground">
                                  详情: {call.notes}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              <Badge variant={call.status === 'resolved' ? 'default' : 'destructive'}>
                                {call.status === 'resolved' ? '已处理' : 
                                 call.status === 'pending' ? '待处理' : 
                                 call.status || '未知状态'}
                              </Badge>
                              {call.priority && (
                                <Badge variant="outline" className="text-xs">
                                  {call.priority === 'high' ? '高优先级' : 
                                   call.priority === 'medium' ? '中优先级' : 
                                   call.priority === 'low' ? '低优先级' : call.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无异常警报</p>
                    <p className="text-sm">系统监控正常，所有健康指标处于安全范围内</p>
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