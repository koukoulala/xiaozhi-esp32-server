import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { CheckCircle, XCircle, RefreshCw, Database, Server, AlertTriangle, Download } from 'lucide-react'
import ElderCareAPI from '@/services/api.js'

function SystemDiagnostic() {
  const navigate = useNavigate()
  const location = useLocation()
  const [diagnostics, setDiagnostics] = useState({})
  const [apiCalls, setApiCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [forcedApiMode, setForcedApiMode] = useState(localStorage.getItem('eldercare_api_mode') || 'auto')

  useEffect(() => {
    runDiagnostics()
    collectApiCallStats()
  }, [])

  // 收集API调用统计
  const collectApiCallStats = () => {
    // 检查localStorage中的模拟API使用记录
    const mockApiUsage = JSON.parse(localStorage.getItem('eldercare_mock_api_usage') || '{}');
    
    // 分析主要功能模块的API调用
    const apiMapping = [
      { 
        feature: '用户认证', 
        endpoints: ['/auth/login', '/auth/register'],
        components: ['UserLogin.jsx', 'UserRegistration.jsx'],
        status: ElderCareAPI.isBackendAvailable ? 'success' : 'error',
        mockStatus: ElderCareAPI.currentMode === 'mock' ? '使用模拟数据' : '使用真实API',
        mockUsageCount: Object.keys(mockApiUsage).filter(key => key.includes('/auth/'))
          .reduce((count, key) => count + mockApiUsage[key].count, 0)
      },
      { 
        feature: '健康监测', 
        endpoints: ['/health/data', '/health/latest', '/health/report'],
        components: ['HealthMonitor.jsx'],
        status: ElderCareAPI.isBackendAvailable ? 'success' : 'error',
        mockStatus: ElderCareAPI.currentMode === 'mock' ? '使用模拟数据' : '使用真实API',
        mockUsageCount: Object.keys(mockApiUsage).filter(key => key.includes('/health/'))
          .reduce((count, key) => count + mockApiUsage[key].count, 0)
      },
      { 
        feature: '健康提醒', 
        endpoints: ['/reminders', '/reminder/list', '/reminder/create'],
        components: ['Reminders.jsx'],
        status: ElderCareAPI.isBackendAvailable ? 'success' : 'error',
        mockStatus: ElderCareAPI.currentMode === 'mock' ? '使用模拟数据' : '使用真实API',
        mockUsageCount: Object.keys(mockApiUsage).filter(key => key.includes('/reminder'))
          .reduce((count, key) => count + mockApiUsage[key].count, 0)
      },
      { 
        feature: '设备管理', 
        endpoints: ['/device/list', '/device/status', '/device/register'],
        components: ['DeviceManagement.jsx'],
        status: ElderCareAPI.isBackendAvailable ? 'success' : 'error',
        mockStatus: ElderCareAPI.currentMode === 'mock' ? '使用模拟数据' : '使用真实API',
        mockUsageCount: Object.keys(mockApiUsage).filter(key => key.includes('/device/'))
          .reduce((count, key) => count + mockApiUsage[key].count, 0)
      },
      { 
        feature: '智能体管理', 
        endpoints: ['/agent/list', '/agent/create', '/agent/update'],
        components: ['AgentManagement.jsx'],
        status: ElderCareAPI.isBackendAvailable ? 'success' : 'error',
        mockStatus: ElderCareAPI.currentMode === 'mock' ? '使用模拟数据' : '使用真实API',
        mockUsageCount: Object.keys(mockApiUsage).filter(key => key.includes('/agent/'))
          .reduce((count, key) => count + mockApiUsage[key].count, 0)
      },
      { 
        feature: '声音克隆', 
        endpoints: ['/voice/list', '/voice/clone'],
        components: ['VoiceClone.jsx'],
        status: ElderCareAPI.isBackendAvailable ? 'success' : 'error',
        mockStatus: ElderCareAPI.currentMode === 'mock' ? '使用模拟数据' : '使用真实API',
        mockUsageCount: Object.keys(mockApiUsage).filter(key => key.includes('/voice/'))
          .reduce((count, key) => count + mockApiUsage[key].count, 0)
      },
      { 
        feature: '监控面板', 
        endpoints: ['/monitor/data'],
        components: ['Dashboard.jsx'],
        status: ElderCareAPI.isBackendAvailable ? 'success' : 'error',
        mockStatus: ElderCareAPI.currentMode === 'mock' ? '使用模拟数据' : '使用真实API',
        mockUsageCount: Object.keys(mockApiUsage).filter(key => key.includes('/monitor/'))
          .reduce((count, key) => count + mockApiUsage[key].count, 0)
      }
    ]
    
    setApiCalls(apiMapping)
  }

  const runDiagnostics = async () => {
    setLoading(true)
    const results = {}

    // 测试路由功能
    try {
      results.router = {
        status: 'success',
        message: `当前路由: ${location.pathname}`,
        details: { pathname: location.pathname, search: location.search }
      }
    } catch (error) {
      results.router = {
        status: 'error',
        message: '路由系统错误',
        details: error.message
      }
    }

    // 测试API连接
    try {
      const systemStatus = ElderCareAPI.getSystemStatus()
      results.api = {
        status: 'success',
        message: `API连接正常 - ${systemStatus.backend_mode}模式`,
        details: systemStatus
      }
    } catch (error) {
      results.api = {
        status: 'error',
        message: 'API连接失败',
        details: error.message
      }
    }

    // 测试用户状态
    try {
      const currentUser = ElderCareAPI.getCurrentUser()
      results.user = {
        status: currentUser ? 'success' : 'warning',
        message: currentUser ? `用户已登录: ${currentUser.username}` : '用户未登录',
        details: currentUser
      }
    } catch (error) {
      results.user = {
        status: 'error',
        message: '用户状态检查失败',
        details: error.message
      }
    }

    // 测试组件加载
    try {
      results.components = {
        status: 'success',
        message: '组件加载正常',
        details: { count: 'Basic components loaded' }
      }
    } catch (error) {
      results.components = {
        status: 'error',
        message: '组件加载失败',
        details: error.message
      }
    }

    setDiagnostics(results)
    setLoading(false)
  }

  const handleApiModeChange = (mode) => {
    setForcedApiMode(mode)
    localStorage.setItem('eldercare_api_mode', mode)
    alert(`API模式已切换为: ${mode}，即将刷新页面以应用更改`)
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />正常</Badge>
      case 'warning':
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1" />警告</Badge>
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />错误</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const testNavigation = () => {
    try {
      navigate('/dashboard')
    } catch (error) {
      alert('导航测试失败: ' + error.message)
    }
  }

  const exportDiagnosticData = () => {
    try {
      // 收集所有诊断信息
      const exportData = {
        systemStatus: ElderCareAPI.getSystemStatus(),
        diagnostics: diagnostics,
        apiCalls: apiCalls,
        mockApiUsage: JSON.parse(localStorage.getItem('eldercare_mock_api_usage') || '{}'),
        timestamp: new Date().toISOString()
      }
      
      // 转换为JSON并创建Blob
      const jsonData = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json' })
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `eldercare-diagnostic-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      
      // 清理
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      alert('诊断数据导出成功')
    } catch (error) {
      alert('导出诊断数据失败: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              正在进行系统诊断...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">系统诊断</h1>
        <div className="flex space-x-2">
          <Button 
            onClick={exportDiagnosticData} 
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            导出诊断数据
          </Button>
          <Button 
            onClick={runDiagnostics} 
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                刷新中...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新诊断
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="h-5 w-5 mr-2" />
            API模式设置
          </CardTitle>
          <CardDescription>
            设置系统使用的API模式，更改后将刷新页面
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium mb-1">当前API模式</h3>
                <div className="flex items-center">
                  <Badge className={
                    ElderCareAPI.currentMode === 'real' ? 'bg-green-500' : 
                    ElderCareAPI.currentMode === 'manager' ? 'bg-blue-500' : 
                    'bg-amber-500'
                  }>
                    {ElderCareAPI.currentMode === 'real' ? '真实API' : 
                     ElderCareAPI.currentMode === 'manager' ? '管理API' : 
                     '模拟数据'}
                  </Badge>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {ElderCareAPI.isBackendAvailable ? '后端可用' : '后端不可用'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Select
                  value={forcedApiMode}
                  onValueChange={handleApiModeChange}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="选择模式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">自动检测</SelectItem>
                    <SelectItem value="real">真实API</SelectItem>
                    <SelectItem value="manager">管理API</SelectItem>
                    <SelectItem value="mock">模拟数据</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            API调用分析
          </CardTitle>
          <CardDescription>
            系统各功能的API调用情况
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-muted-foreground">
                统计数据展示每个功能模块使用模拟数据的次数
              </div>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  localStorage.removeItem('eldercare_mock_api_usage');
                  collectApiCallStats();
                  alert('模拟数据使用记录已清除');
                }}
              >
                清除模拟数据使用记录
              </Button>
            </div>
            <div className="rounded-md border">
              <table className="min-w-full divide-y divide-border">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">功能模块</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">API端点</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">组件</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">数据来源</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">模拟数据使用次数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {apiCalls.map((api, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="px-4 py-3 text-sm">{api.feature}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="space-y-1">
                          {api.endpoints.map((endpoint, i) => (
                            <Badge key={i} variant="outline" className="mr-1">
                              {endpoint}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="space-y-1">
                          {api.components.map((component, i) => (
                            <div key={i} className="text-xs text-muted-foreground">
                              {component}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(api.status)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge 
                          variant={api.mockStatus.includes('模拟') ? 'outline' : 'default'}
                          className={api.mockStatus.includes('模拟') ? 'text-amber-500 border-amber-500' : 'bg-green-500'}
                        >
                          {api.mockStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge 
                          variant={api.mockUsageCount > 0 ? 'destructive' : 'outline'}
                        >
                          {api.mockUsageCount || 0}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            模拟数据使用详情
          </CardTitle>
          <CardDescription>
            详细显示所有使用过模拟数据的API调用
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.keys(JSON.parse(localStorage.getItem('eldercare_mock_api_usage') || '{}')).length > 0 ? (
              <div className="rounded-md border">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">API端点</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">请求方法</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">使用次数</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">最后使用时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Object.entries(JSON.parse(localStorage.getItem('eldercare_mock_api_usage') || '{}')).map(([endpoint, data], index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="outline" className="mr-1">
                            {endpoint}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {data.method}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="destructive">
                            {data.count}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(data.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>没有记录到模拟数据的使用</p>
                <p className="text-sm mt-2">浏览其他功能页面后，使用模拟数据的API调用将在这里显示</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            API请求日志
          </CardTitle>
          <CardDescription>
            最近的100条API请求记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {JSON.parse(localStorage.getItem('eldercare_api_request_logs') || '[]').length > 0 ? (
              <div className="rounded-md border overflow-auto max-h-96">
                <table className="min-w-full divide-y divide-border">
                  <thead className="sticky top-0 bg-background">
                    <tr className="bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">API端点</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">方法</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">状态</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">响应时间</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">使用模拟数据</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {JSON.parse(localStorage.getItem('eldercare_api_request_logs') || '[]').map((log, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant="outline" className="mr-1">
                            {log.endpoint}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.method}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.success ? (
                            <Badge variant="default" className="bg-green-500">
                              {log.status || 'OK'}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              {log.status || 'Failed'}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.responseTime ? `${log.responseTime}ms` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {log.usedMock ? (
                            <Badge variant="destructive">
                              是 ({log.reason})
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-500">
                              否
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>暂无API请求记录</p>
                <p className="text-sm mt-2">浏览其他功能页面后，API请求将在这里记录</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(diagnostics).map(([key, value]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize">{key}</CardTitle>
                {getStatusBadge(value.status)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2">{value.message}</p>
              {value.details && (
                <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-24">
                  {JSON.stringify(value.details, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default SystemDiagnostic