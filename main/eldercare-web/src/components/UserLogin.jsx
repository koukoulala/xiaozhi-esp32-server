// UserLogin.jsx - 用户登录界面
import React, { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { 
  User, 
  Lock,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  UserPlus,
  LogIn
} from 'lucide-react'
import ElderCareAPI from '@/services/api.js'

const UserLogin = ({ onLoginSuccess, onShowRegister }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  })

  const updateLoginData = (field, value) => {
    setLoginData(prev => ({ ...prev, [field]: value }))
    setError(null) // 清除错误信息
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!loginData.username || !loginData.password) {
      setError('请输入用户名和密码')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const result = await ElderCareAPI.login(loginData.username, loginData.password)
      
      if (result.success && result.user) {
        setSuccess('登录成功！正在跳转...')
        setTimeout(() => {
          onLoginSuccess && onLoginSuccess(result.user)
        }, 1000)
      } else {
        setError(result.message || '登录失败，请检查用户名和密码')
      }
      
    } catch (err) {
      setError(`登录失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (demoType) => {
    setLoading(true)
    setError(null)
    
    try {
      let demoCredentials = {}
      
      if (demoType === 'zhang') {
        demoCredentials = {
          username: 'zhangsan_family',
          password: 'password123'
        }
      } else if (demoType === 'wang') {
        demoCredentials = {
          username: 'wangmei_family', 
          password: 'password123'
        }
      }
      
      const result = await ElderCareAPI.login(demoCredentials.username, demoCredentials.password)
      
      if (result.success && result.user) {
        setSuccess(`${demoType === 'zhang' ? '张老爷子' : '张奶奶'}家属账户登录成功！`)
        setTimeout(() => {
          onLoginSuccess && onLoginSuccess(result.user)
        }, 1000)
      } else {
        setError('演示账户登录失败')
      }
      
    } catch (err) {
      setError(`演示账户登录失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">智慧养老陪伴系统</h1>
          <p className="text-muted-foreground mt-2">
            让科技成为爱的桥梁，陪伴每一个珍贵的时光
          </p>
        </div>

        {error && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">用户登录</TabsTrigger>
            <TabsTrigger value="demo">演示账户</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LogIn className="h-5 w-5 mr-2" />
                  登录账户
                </CardTitle>
                <CardDescription>
                  使用您的家属账户登录系统
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">用户名</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="请输入用户名"
                      value={loginData.username}
                      onChange={(e) => updateLoginData('username', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">密码</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="请输入密码"
                      value={loginData.password}
                      onChange={(e) => updateLoginData('password', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        登录中...
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        登录
                      </>
                    )}
                  </Button>
                </form>
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    还没有账户？{' '}
                    <button 
                      onClick={onShowRegister}
                      className="text-primary hover:underline"
                    >
                      立即注册
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="demo">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  演示账户
                </CardTitle>
                <CardDescription>
                  快速体验系统功能，使用预设的演示数据
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">张老爷子家属账户</h4>
                        <p className="text-sm text-muted-foreground">
                          张三 - 照护张老爷子（78岁，高血压+糖尿病）
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDemoLogin('zhang')}
                        disabled={loading}
                        size="sm"
                      >
                        {loading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          '登录'
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">张奶奶家属账户</h4>
                        <p className="text-sm text-muted-foreground">
                          王美 - 照护张奶奶（75岁，心脏病）
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDemoLogin('wang')}
                        disabled={loading}
                        size="sm"
                      >
                        {loading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          '登录'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  <p>演示账户包含完整的模拟数据：</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>健康监测数据和图表展示</li>
                    <li>智能提醒和用药管理</li>
                    <li>紧急呼救记录</li>
                    <li>AI智能体陪伴功能</li>
                    <li>声音克隆管理</li>
                  </ul>
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    想要创建真实账户？{' '}
                    <button 
                      onClick={onShowRegister}
                      className="text-primary hover:underline"
                    >
                      开始注册
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default UserLogin