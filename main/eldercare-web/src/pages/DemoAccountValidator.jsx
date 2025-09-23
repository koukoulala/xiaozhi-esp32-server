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
      const healthResponse = await ElderCareAPI.getHealthData(userId, 1)
      apiTests.health = {
        status: healthResponse.success ? 'success' : 'error',
        message: healthResponse.success ? '健康数据API可用' : '健康数据API不可用',
        data: healthResponse.data,
        usedMock: ElderCareAPI.currentMode === 'mock' || !healthResponse.success
      }
    } catch (error) {
      apiTests.health = {
        status: 'error',
        message: `健康数据API错误: ${error.message}`,
        usedMock: true
      }
    }
    
    try {
      // 测试提醒API
      const remindersResponse = await ElderCareAPI.get_reminders(userId)
      apiTests.reminders = {
        status: remindersResponse.success ? 'success' : 'error',
        message: remindersResponse.success ? '提醒API可用' : '提醒API不可用',
        data: remindersResponse.data,
        usedMock: ElderCareAPI.currentMode === 'mock' || !remindersResponse.success
      }
    } catch (error) {
      apiTests.reminders = {
        status: 'error',
        message: `提醒API错误: ${error.message}`,
        usedMock: true
      }
    }
    
    try {
      // 测试设备API
      const deviceResponse = await ElderCareAPI.getUserDevices(userId)
      apiTests.devices = {
        status: deviceResponse.success ? 'success' : 'error',
        message: deviceResponse.success ? '设备API可用' : '设备API不可用',
        data: deviceResponse.data,
        usedMock: ElderCareAPI.currentMode === 'mock' || !deviceResponse.success
      }
    } catch (error) {
      apiTests.devices = {
        status: 'error',
        message: `设备API错误: ${error.message}`,
        usedMock: true
      }
    }
    
    try {
      // 测试智能体API
      const agentsResponse = await ElderCareAPI.getAgents(userId)
      apiTests.agents = {
        status: agentsResponse.success ? 'success' : 'error',
        message: agentsResponse.success ? '智能体API可用' : '智能体API不可用',
        data: agentsResponse.data,
        usedMock: ElderCareAPI.currentMode === 'mock' || !agentsResponse.success
      }
    } catch (error) {
      apiTests.agents = {
        status: 'error',
        message: `智能体API错误: ${error.message}`,
        usedMock: true
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
                          <th className="px-4 py-3 text-left text-sm font-medium">信息</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {Object.entries(apiResults).map(([key, value], index) => (
                          <tr key={key} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                            <td className="px-4 py-3 text-sm font-medium">{
                              key === 'health' ? '健康数据API' :
                              key === 'reminders' ? '提醒API' :
                              key === 'devices' ? '设备API' :
                              key === 'agents' ? '智能体API' : key
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
                      <TabsList>
                        <TabsTrigger value="health">健康数据</TabsTrigger>
                        <TabsTrigger value="reminders">提醒</TabsTrigger>
                        <TabsTrigger value="devices">设备</TabsTrigger>
                        <TabsTrigger value="agents">智能体</TabsTrigger>
                      </TabsList>
                      <TabsContent value="health" className="p-4 bg-muted/30 rounded-md mt-2">
                        <pre className="text-xs overflow-auto max-h-40">{apiResults.health?.data ? JSON.stringify(apiResults.health.data, null, 2) : '无数据'}</pre>
                      </TabsContent>
                      <TabsContent value="reminders" className="p-4 bg-muted/30 rounded-md mt-2">
                        <pre className="text-xs overflow-auto max-h-40">{apiResults.reminders?.data ? JSON.stringify(apiResults.reminders.data, null, 2) : '无数据'}</pre>
                      </TabsContent>
                      <TabsContent value="devices" className="p-4 bg-muted/30 rounded-md mt-2">
                        <pre className="text-xs overflow-auto max-h-40">{apiResults.devices?.data ? JSON.stringify(apiResults.devices.data, null, 2) : '无数据'}</pre>
                      </TabsContent>
                      <TabsContent value="agents" className="p-4 bg-muted/30 rounded-md mt-2">
                        <pre className="text-xs overflow-auto max-h-40">{apiResults.agents?.data ? JSON.stringify(apiResults.agents.data, null, 2) : '无数据'}</pre>
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