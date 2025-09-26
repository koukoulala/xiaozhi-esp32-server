import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { RefreshCw, UserCheck, AlertTriangle, Key, User, CheckCircle } from 'lucide-react'
import ElderCareAPI from '@/services/api.js'

function DemoAccountValidator() {
  const [username, setUsername] = useState('demo_user')
  const [password, setPassword] = useState('password123')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [autoLoginSuccess, setAutoLoginSuccess] = useState(false)
  const [userData, setUserData] = useState(null)
  const [apiResults, setApiResults] = useState({})

  const validateAccount = async () => {
    setLoading(true)
    setResult(null)
    setUserData(null)
    setApiResults({})
    
    try {
      // 记录开始时间
      const startTime = Date.now()
      
      // 尝试登录
      const loginResponse = await ElderCareAPI.login(username, password)
      
      // 记录响应时间
      const responseTime = Date.now() - startTime
      
      if (loginResponse.success) {
        setResult({
          status: 'success',
          message: `登录成功: ${loginResponse.message || '用户验证通过'}`,
          responseTime
        })
        setUserData(loginResponse.user)
        setAutoLoginSuccess(true)
        
        // 登录成功后，测试几个主要API
        await testMainApis(loginResponse.user.id)
      } else {
        setResult({
          status: 'error',
          message: `登录失败: ${loginResponse.message || '用户验证失败'}`,
          responseTime
        })
        setAutoLoginSuccess(false)
      }
    } catch (error) {
      setResult({
        status: 'error',
        message: `验证出错: ${error.message}`,
        error: error.toString()
      })
      setAutoLoginSuccess(false)
    } finally {
      setLoading(false)
    }
  }
  
  const testMainApis = async (userId) => {
    const apiTests = {}
    
    try {
      // 测试健康数据API
      const healthResponse = await ElderCareAPI.getHealthData(userId, 7)
      apiTests.health = {
        status: healthResponse.success ? 'success' : 'error',
        message: healthResponse.success ? '健康数据API可用' : '健康数据API不可用',
        data: healthResponse.data,
        usedMock: ElderCareAPI.currentMode === 'mock' || !healthResponse.success,
        count: healthResponse.data ? healthResponse.data.length : 0
      }
    } catch (error) {
      apiTests.health = {
        status: 'error',
        message: `健康数据API错误: ${error.message}`,
        usedMock: true,
        count: 0
      }
    }
    
    try {
      // 测试提醒API
      const remindersResponse = await ElderCareAPI.getHealthReminders(userId)
      apiTests.reminders = {
        status: remindersResponse.success ? 'success' : 'error',
        message: remindersResponse.success ? '提醒API可用' : '提醒API不可用',
        data: remindersResponse.data,
        usedMock: ElderCareAPI.currentMode === 'mock' || !remindersResponse.success,
        count: remindersResponse.data ? remindersResponse.data.length : 0
      }
    } catch (error) {
      apiTests.reminders = {
        status: 'error',
        message: `提醒API错误: ${error.message}`,
        usedMock: true,
        count: 0
      }
    }
    
    try {
      // 测试AI设备API
      const aiDeviceResponse = await ElderCareAPI.getUserAIDevices(userId)
      apiTests.aiDevices = {
        status: aiDeviceResponse.success ? 'success' : 'error',
        message: aiDeviceResponse.success ? 'AI设备API可用' : 'AI设备API不可用',
        data: aiDeviceResponse.data,
        usedMock: ElderCareAPI.currentMode === 'mock' || !aiDeviceResponse.success,
        count: aiDeviceResponse.data ? aiDeviceResponse.data.length : 0
      }
    } catch (error) {
      apiTests.aiDevices = {
        status: 'error',
        message: `AI设备API错误: ${error.message}`,
        usedMock: true,
        count: 0
      }
    }
    
    try {
      // 测试健康设备API
      const healthDeviceResponse = await ElderCareAPI.getUserHealthDevices(userId)
      apiTests.healthDevices = {
        status: healthDeviceResponse.success ? 'success' : 'error',
        message: healthDeviceResponse.success ? '健康设备API可用' : '健康设备API不可用',
        data: healthDeviceResponse.data,
        usedMock: ElderCareAPI.currentMode === 'mock' || !healthDeviceResponse.success,
        count: healthDeviceResponse.data ? healthDeviceResponse.data.length : 0
      }
    } catch (error) {
      apiTests.healthDevices = {
        status: 'error',
        message: `健康设备API错误: ${error.message}`,
        usedMock: true,
        count: 0
      }
    }
    
    try {
      // 测试智能体API
      const agentsResponse = await ElderCareAPI.getUserAgents(userId)
      apiTests.agents = {
        status: agentsResponse.success ? 'success' : 'error',
        message: agentsResponse.success ? '智能体API可用' : '智能体API不可用',
        data: agentsResponse.data,
        usedMock: ElderCareAPI.currentMode === 'mock' || !agentsResponse.success,
        count: agentsResponse.data ? agentsResponse.data.length : 0
      }
    } catch (error) {
      apiTests.agents = {
        status: 'error',
        message: `智能体API错误: ${error.message}`,
        usedMock: true,
        count: 0
      }
    }
    
    try {
      // 测试声音克隆API
      const voiceResponse = await ElderCareAPI.getVoiceClones(userId)
      apiTests.voice = {
        status: voiceResponse.success ? 'success' : 'error',
        message: voiceResponse.success ? '声音克隆API可用' : '声音克隆API不可用',
        data: voiceResponse.data,
        usedMock: ElderCareAPI.currentMode === 'mock' || !voiceResponse.success,
        count: voiceResponse.data ? voiceResponse.data.length : 0
      }
    } catch (error) {
      apiTests.voice = {
        status: 'error',
        message: `声音克隆API错误: ${error.message}`,
        usedMock: true,
        count: 0
      }
    }
    
    try {
      // 测试监控数据API
      const monitorResponse = await ElderCareAPI.getMonitorData(userId, 1)
      apiTests.monitor = {
        status: monitorResponse.success ? 'success' : 'error',
        message: monitorResponse.success ? '监控数据API可用' : '监控数据API不可用',
        data: monitorResponse,
        usedMock: ElderCareAPI.currentMode === 'mock' || !monitorResponse.success,
        count: monitorResponse.health_data ? monitorResponse.health_data.length : 0
      }
    } catch (error) {
      apiTests.monitor = {
        status: 'error',
        message: `监控数据API错误: ${error.message}`,
        usedMock: true,
        count: 0
      }
    }
    
    setApiResults(apiTests)
  }

  const resetTest = () => {
    setResult(null)
    setUserData(null)
    setApiResults({})
    ElderCareAPI.logout()
    setAutoLoginSuccess(false)
  }
  
  const getStatusBadge = (status) => {
    return status === 'success' ? (
      <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />成功</Badge>
    ) : (
      <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />失败</Badge>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">演示账户验证</h1>
        <Button variant="outline" onClick={resetTest} disabled={loading}>
          重置测试
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="h-5 w-5 mr-2" />
            演示账户验证工具
          </CardTitle>
          <CardDescription>
            验证系统预设的演示账户是否可用，并测试相关API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList>
              <TabsTrigger value="login">账户验证</TabsTrigger>
              <TabsTrigger value="results" disabled={!result}>测试结果</TabsTrigger>
              <TabsTrigger value="api-tests" disabled={!autoLoginSuccess}>API测试</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">用户名</Label>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Input 
                      id="username" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="演示用户名"
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="password">密码</Label>
                  <div className="flex items-center">
                    <Key className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password"
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="演示密码"
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={validateAccount} 
                  disabled={loading || !username || !password}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      验证中...
                    </>
                  ) : (
                    '验证演示账户'
                  )}
                </Button>
                
                {result && (
                  <Alert className={result.status === 'success' ? 'bg-green-50' : 'bg-red-50'}>
                    {result.status === 'success' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {result.message}
                      {result.responseTime && (
                        <span className="block text-xs text-muted-foreground mt-1">
                          响应时间: {result.responseTime}ms
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="results" className="space-y-4">
              {userData ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <h3 className="text-lg font-semibold">用户信息</h3>
                    {getStatusBadge('success')}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">用户ID</div>
                      <div className="text-sm">{userData.id}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">用户名</div>
                      <div className="text-sm">{userData.username}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">姓名</div>
                      <div className="text-sm">{userData.realName}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">老人姓名</div>
                      <div className="text-sm">{userData.elderName}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">联系电话</div>
                      <div className="text-sm">{userData.phone}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Token</div>
                      <div className="text-xs text-muted-foreground truncate">{userData.token}</div>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <h3 className="text-lg font-semibold mb-2">认证信息</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">登录状态</div>
                        <div className="text-sm flex items-center">
                          <Badge className="bg-green-500 mr-2">已登录</Badge>
                          <span className="text-xs text-muted-foreground">
                            {ElderCareAPI.currentMode === 'mock' ? '(使用模拟数据)' : '(使用真实API)'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">API模式</div>
                        <Badge 
                          className={
                            ElderCareAPI.currentMode === 'real' ? 'bg-green-500' : 
                            ElderCareAPI.currentMode === 'manager' ? 'bg-blue-500' : 
                            'bg-amber-500'
                          }
                        >
                          {ElderCareAPI.currentMode === 'real' ? '真实API' : 
                           ElderCareAPI.currentMode === 'manager' ? '管理API' : 
                           '模拟数据'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-10 w-10 mx-auto mb-4 opacity-50" />
                  <p>未获取到用户数据</p>
                  <p className="text-sm mt-2">请先验证账户</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="api-tests" className="space-y-4">
              {Object.keys(apiResults).length > 0 ? (
                <div className="space-y-6">
                  <div className="rounded-md border">
                    <table className="min-w-full divide-y divide-border">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-4 py-3 text-left text-sm font-medium">API服务</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">状态</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">数据来源</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">数据量</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">信息</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {Object.entries(apiResults).map(([key, value], index) => (
                          <tr key={key} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                            <td className="px-4 py-3 text-sm font-medium">{
                              key === 'health' ? '健康数据API' :
                              key === 'reminders' ? '提醒API' :
                              key === 'aiDevices' ? 'AI设备API' :
                              key === 'healthDevices' ? '健康设备API' :
                              key === 'agents' ? '智能体API' :
                              key === 'voice' ? '声音克隆API' :
                              key === 'monitor' ? '监控数据API' : key
                            }</td>
                            <td className="px-4 py-3 text-sm">
                              {getStatusBadge(value.status)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge 
                                variant={value.usedMock ? 'outline' : 'default'}
                                className={value.usedMock ? 'text-amber-500 border-amber-500' : 'bg-green-500'}
                              >
                                {value.usedMock ? '使用模拟数据' : '使用真实API'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge variant="secondary">
                                {value.count || 0} 条记录
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {value.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">API响应数据</h3>
                    <Tabs defaultValue="health">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="health">健康数据</TabsTrigger>
                        <TabsTrigger value="devices">设备管理</TabsTrigger>
                        <TabsTrigger value="others">其他APIs</TabsTrigger>
                      </TabsList>
                      <TabsContent value="health" className="space-y-3">
                        <div className="p-4 bg-muted/30 rounded-md">
                          <div className="text-sm mb-2 font-medium">健康数据API响应 ({apiResults.health?.count || 0} 条记录)</div>
                          <pre className="text-xs overflow-auto max-h-40">{apiResults.health?.data ? JSON.stringify(apiResults.health.data.slice(0, 3), null, 2) : '无数据'}</pre>
                          {apiResults.health?.count > 3 && (
                            <div className="text-xs text-muted-foreground mt-2">... 还有 {apiResults.health.count - 3} 条记录</div>
                          )}
                        </div>
                        <div className="p-4 bg-muted/30 rounded-md">
                          <div className="text-sm mb-2 font-medium">监控数据API响应 ({apiResults.monitor?.count || 0} 条记录)</div>
                          <pre className="text-xs overflow-auto max-h-40">{apiResults.monitor?.data ? JSON.stringify(apiResults.monitor.data, null, 2) : '无数据'}</pre>
                        </div>
                      </TabsContent>
                      <TabsContent value="devices" className="space-y-3">
                        <div className="p-4 bg-muted/30 rounded-md">
                          <div className="text-sm mb-2 font-medium">AI设备API响应 ({apiResults.aiDevices?.count || 0} 条记录)</div>
                          <pre className="text-xs overflow-auto max-h-40">{apiResults.aiDevices?.data ? JSON.stringify(apiResults.aiDevices.data, null, 2) : '无数据'}</pre>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-md">
                          <div className="text-sm mb-2 font-medium">健康设备API响应 ({apiResults.healthDevices?.count || 0} 条记录)</div>
                          <pre className="text-xs overflow-auto max-h-40">{apiResults.healthDevices?.data ? JSON.stringify(apiResults.healthDevices.data, null, 2) : '无数据'}</pre>
                        </div>
                      </TabsContent>
                      <TabsContent value="others" className="space-y-3">
                        <div className="p-4 bg-muted/30 rounded-md">
                          <div className="text-sm mb-2 font-medium">智能体API响应 ({apiResults.agents?.count || 0} 条记录)</div>
                          <pre className="text-xs overflow-auto max-h-40">{apiResults.agents?.data ? JSON.stringify(apiResults.agents.data, null, 2) : '无数据'}</pre>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-md">
                          <div className="text-sm mb-2 font-medium">提醒API响应 ({apiResults.reminders?.count || 0} 条记录)</div>
                          <pre className="text-xs overflow-auto max-h-40">{apiResults.reminders?.data ? JSON.stringify(apiResults.reminders.data, null, 2) : '无数据'}</pre>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-md">
                          <div className="text-sm mb-2 font-medium">声音克隆API响应 ({apiResults.voice?.count || 0} 条记录)</div>
                          <pre className="text-xs overflow-auto max-h-40">{apiResults.voice?.data ? JSON.stringify(apiResults.voice.data, null, 2) : '无数据'}</pre>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-10 w-10 mx-auto mb-4 opacity-50" />
                  <p>无API测试数据</p>
                  <p className="text-sm mt-2">请先验证账户并确保登录成功</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default DemoAccountValidator