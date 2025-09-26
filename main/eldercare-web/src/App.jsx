import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Shield, Home, Activity, Calendar, Smartphone, Bot, Mic, Settings, UserCheck } from 'lucide-react'
import ElderCareAPI from './services/api.js'
import UserRegistration from './components/UserRegistration.jsx'
import UserLogin from './components/UserLogin.jsx'

// 基础组件
import Dashboard from './components/Dashboard.jsx'
import HealthMonitor from './components/HealthMonitor.jsx'
import VoiceClone from './components/VoiceClone.jsx'
import AgentManagement from './components/AgentManagement.jsx'
import DeviceManagement from './components/DeviceManagement.jsx'
import Reminders from './components/Reminders.jsx'

// 高级页面组件
import SystemDiagnostic from './pages/SystemDiagnostic.jsx'
import DemoAccountValidator from './pages/DemoAccountValidator.jsx'

import './App.css'

// 导航组件
function Navigation({ currentUser, onLogout, systemStatus }) {
  const navigate = useNavigate()
  const location = useLocation()
  
  const isActive = (path) => location.pathname === path
  
  // 检查是否是演示账户（用户ID 1、2或coco用户）
  const isDemoAccount = currentUser && 
    (currentUser.id === 1 || currentUser.id === 2 || 
     currentUser.username === 'coco' || currentUser.real_name === 'coco' ||
     currentUser.username === '张三' || currentUser.username === '王美' || 
     currentUser.real_name === '张三' || currentUser.real_name === '王美')

  return (
    <div className="w-64 border-r bg-muted/40 min-h-[calc(100vh-4rem)]">
      <div className="p-4">
        <nav className="space-y-2">
          <Button
            variant={isActive('/dashboard') ? 'default' : 'ghost'}
            className="w-full justify-start mb-1"
            onClick={() => navigate('/dashboard')}
          >
            <Home className="h-4 w-4 mr-2" />
            监控面板
          </Button>
          <Button
            variant={isActive('/health') ? 'default' : 'ghost'}
            className="w-full justify-start mb-1"
            onClick={() => navigate('/health')}
          >
            <Activity className="h-4 w-4 mr-2" />
            健康监测
          </Button>
          <Button
            variant={isActive('/reminders') ? 'default' : 'ghost'}
            className="w-full justify-start mb-1"
            onClick={() => navigate('/reminders')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            健康提醒
          </Button>
          <Button
            variant={isActive('/devices') ? 'default' : 'ghost'}
            className="w-full justify-start mb-1"
            onClick={() => navigate('/devices')}
          >
            <Smartphone className="h-4 w-4 mr-2" />
            设备管理
          </Button>
          <Button
            variant={isActive('/agents') ? 'default' : 'ghost'}
            className="w-full justify-start mb-1"
            onClick={() => navigate('/agents')}
          >
            <Bot className="h-4 w-4 mr-2" />
            智能体管理
          </Button>
          <Button
            variant={isActive('/voice') ? 'default' : 'ghost'}
            className="w-full justify-start mb-1"
            onClick={() => navigate('/voice')}
          >
            <Mic className="h-4 w-4 mr-2" />
            声音克隆
          </Button>
          
          {/* 只对演示账户显示调试功能 */}
          {isDemoAccount && (
            <>
              <Button
                variant={isActive('/diagnostic') ? 'default' : 'ghost'}
                className="w-full justify-start mb-1"
                onClick={() => navigate('/diagnostic')}
              >
                <Settings className="h-4 w-4 mr-2" />
                系统诊断
              </Button>
              <Button
                variant={isActive('/demo-validator') ? 'default' : 'ghost'}
                className="w-full justify-start mb-1"
                onClick={() => navigate('/demo-validator')}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                演示账户验证
              </Button>
            </>
          )}
        </nav>
      </div>
    </div>
  )
}

// 主应用内容组件
function AppContent() {
  const [currentUser, setCurrentUser] = useState(null)
  const [systemStatus, setSystemStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true) // 新增：跟踪初始加载
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // 只在初始加载时执行
    if (!initialLoad) return;
    
    // 获取系统状态
    try {
      const status = ElderCareAPI.getSystemStatus()
      setSystemStatus(status)
    } catch (error) {
      console.error('Failed to get system status:', error)
    }

    // 检查是否有已登录用户
    const user = ElderCareAPI.getCurrentUser()
    const token = localStorage.getItem('eldercare_token')
    
    console.log('初始检查登录状态:', { user, token, pathname: location.pathname })
    
    // 严格检查用户登录状态 - 确保用户对象完整且有有效token
    const isLoggedIn = user && 
                      (user.id || user.user_id) && 
                      token && 
                      token !== 'null' && 
                      token !== 'undefined'
    
    console.log('初始登录状态:', isLoggedIn)
    
    if (isLoggedIn) {
      setCurrentUser(user)
      // 如果在登录/注册页面，重定向到dashboard
      if (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/') {
        console.log('用户已登录，重定向到dashboard')
        navigate('/dashboard')
      }
    } else {
      // 清除无效数据
      if (user || token) {
        console.log('清除无效的登录数据')
        ElderCareAPI.logout()
      }
      setCurrentUser(null)
      
      // 如果不在认证页面，重定向到登录页
      if (location.pathname !== '/login' && location.pathname !== '/register') {
        console.log('未登录，重定向到登录页')
        navigate('/login')
      }
    }
    
    setLoading(false)
    setInitialLoad(false) // 标记初始加载完成
  }, [initialLoad, navigate, location.pathname]) // 添加必要依赖

  const handleLoginSuccess = (userData) => {
    console.log('登录成功，用户数据:', userData)
    
    // 确保用户数据格式正确
    const normalizedUser = {
      id: userData.id || userData.user_id,
      username: userData.username,
      realName: userData.real_name || userData.realName,
      elderName: userData.elder_name || userData.elderName,
      phone: userData.phone,
      token: userData.token
    }
    
    console.log('标准化用户数据:', normalizedUser)
    
    // 立即设置用户状态
    setCurrentUser(normalizedUser)
    
    // 确保localStorage也同步更新
    localStorage.setItem('eldercare_user', JSON.stringify(normalizedUser))
    if (userData.token) {
      localStorage.setItem('eldercare_token', userData.token)
    }
    
    console.log('执行登录成功后的导航到dashboard')
    // 直接导航，不再依赖useEffect
    navigate('/dashboard')
  }

  const handleRegistrationComplete = (userId, userData) => {
    console.log('注册完成，用户ID:', userId, '用户数据:', userData)
    
    // 构建用户对象
    const user = {
      id: userId,
      username: userData.username,
      realName: userData.familyInfo?.name || userData.username,
      elderName: userData.elderInfo?.name || '',
      phone: userData.familyInfo?.phone || '',
      // 为了兼容，设置一个临时token
      token: `temp_token_${userId}_${Date.now()}`
    }
    
    console.log('设置注册用户:', user)
    
    setCurrentUser(user)
    localStorage.setItem('eldercare_user', JSON.stringify(user))
    localStorage.setItem('eldercare_token', user.token)
    
    // 延迟导航
    setTimeout(() => {
      navigate('/dashboard')
    }, 100)
  }

  const handleLogout = () => {
    ElderCareAPI.logout()
    setCurrentUser(null)
    navigate('/login')
  }

  const getStatusColor = () => {
    if (!systemStatus) return 'outline'
    switch (systemStatus.backend_mode) {
      case 'real': return 'default'
      case 'manager': return 'secondary'
      case 'mock': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusText = () => {
    if (!systemStatus) return '系统加载中'
    switch (systemStatus.backend_mode) {
      case 'real': return 'xiaozhi-server已连接'
      case 'manager': return '管理后端已连接'
      case 'mock': return '模拟数据模式'
      default: return '系统状态未知'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">系统启动中...</p>
        </div>
      </div>
    )
  }

  // 认证页面不需要导航栏
  if (location.pathname === '/login' || location.pathname === '/register') {
    return (
      <div className="min-h-screen bg-background">
        <Routes>
          <Route 
            path="/login" 
            element={
              <UserLogin 
                onLoginSuccess={handleLoginSuccess}
                onShowRegister={() => navigate('/register')}
              />
            } 
          />
          <Route 
            path="/register" 
            element={
              <UserRegistration 
                onRegistrationComplete={handleRegistrationComplete}
                onSwitchToLogin={() => navigate('/login')}
              />
            } 
          />
        </Routes>
      </div>
    )
  }

  // 主应用布局
  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">智慧养老陪伴系统</h1>
            <Badge variant={getStatusColor()} className="ml-2">
              {getStatusText()}
            </Badge>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            {currentUser && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  欢迎，{currentUser.realName || currentUser.username}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  注销
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex">
        <Navigation 
          currentUser={currentUser} 
          onLogout={handleLogout}
          systemStatus={systemStatus}
        />
        <div className="flex-1 p-6">
          <Routes>
            {/* 确保用户已登录 */}
            {!currentUser ? (
              <Route path="*" element={<Navigate to="/login" replace />} />
            ) : (
              <>
                {/* 默认重定向 */}
                <Route path="/" element={<Dashboard />} />
                
                {/* 基础功能 */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/health" element={<HealthMonitor />} />
                <Route path="/reminders" element={<Reminders />} />
                <Route path="/voice" element={<VoiceClone />} />
                <Route path="/devices" element={<DeviceManagement />} />
                <Route path="/agents" element={<AgentManagement />} />
                <Route path="/diagnostic" element={<SystemDiagnostic />} />
                <Route path="/demo-validator" element={<DemoAccountValidator />} />
              </>
            )}
          </Routes>
        </div>
      </div>
    </div>
  )
}

// 主App组件
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App