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
import EnhancedAgentManagement from './pages/EnhancedAgentManagement.jsx'
import SystemDiagnostic from './pages/SystemDiagnostic.jsx'
import DemoAccountValidator from './pages/DemoAccountValidator.jsx'

import './App.css'

// 导航组件
function Navigation({ currentUser, onLogout, systemStatus }) {
  const navigate = useNavigate()
  const location = useLocation()
  
  const isActive = (path) => location.pathname === path

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
            variant={isActive('/agents/enhanced') ? 'default' : 'ghost'}
            className="w-full justify-start mb-1"
            onClick={() => navigate('/agents/enhanced')}
          >
            <Settings className="h-4 w-4 mr-2" />
            高级管理
          </Button>
          <Button
            variant={isActive('/voice') ? 'default' : 'ghost'}
            className="w-full justify-start mb-1"
            onClick={() => navigate('/voice')}
          >
            <Mic className="h-4 w-4 mr-2" />
            声音克隆
          </Button>
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
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // 获取系统状态
    try {
      const status = ElderCareAPI.getSystemStatus()
      setSystemStatus(status)
    } catch (error) {
      console.error('Failed to get system status:', error)
    }

    // 检查是否有已登录用户
    const user = ElderCareAPI.getCurrentUser()
    
    // 严格检查用户登录状态
    const isLoggedIn = user && user.id && localStorage.getItem('eldercare_token')
    
    if (isLoggedIn) {
      setCurrentUser(user)
      // 如果用户已登录且在登录页面，重定向到dashboard
      if (location.pathname === '/login' || location.pathname === '/register') {
        navigate('/dashboard')
      }
    } else {
      // 如果没有用户或token无效，清除可能存在的无效数据
      ElderCareAPI.logout()
      setCurrentUser(null)
      
      // 如果不在认证页面，强制重定向到登录页
      if (location.pathname !== '/login' && location.pathname !== '/register') {
        console.log('未登录，重定向到登录页')
        navigate('/login')
      }
    }
    
    setLoading(false)
  }, [navigate, location.pathname])

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData)
    localStorage.setItem('eldercare_user', JSON.stringify(userData))
    navigate('/dashboard')
  }

  const handleRegistrationComplete = (userId, userData) => {
    const user = {
      id: userId,
      username: userData.familyInfo.name,
      realName: userData.familyInfo.name,
      elderName: userData.elderInfo.name,
      phone: userData.familyInfo.phone
    }
    setCurrentUser(user)
    localStorage.setItem('eldercare_user', JSON.stringify(user))
    navigate('/dashboard')
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
                <Route path="/agents/enhanced" element={<EnhancedAgentManagement />} />
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