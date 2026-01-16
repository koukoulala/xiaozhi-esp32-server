/**
 * 用户设置组件 - 管理用户信息和密码
 */
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { X, User, Lock, UserCircle, Phone, Mail, Save, Eye, EyeOff } from 'lucide-react'
import ElderCareAPI from '../services/api.js'

export default function UserSettings({ currentUser, onClose, onUserUpdated }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // 用户基本信息
  const [userInfo, setUserInfo] = useState({
    realName: currentUser?.realName || '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || ''
  })
  
  // 老人信息
  const [elderInfo, setElderInfo] = useState({
    elderName: currentUser?.elderName || '',
    elderRelation: '',
    elderProfile: {}
  })
  
  // 密码修改
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // 加载用户详细信息
  useEffect(() => {
    loadUserDetails()
  }, [currentUser?.id])

  const loadUserDetails = async () => {
    if (!currentUser?.id) return
    
    try {
      const response = await ElderCareAPI.getUserInfo(currentUser.id)
      if (response.success && response.data) {
        const data = response.data
        setUserInfo({
          realName: data.real_name || '',
          phone: data.phone || '',
          email: data.email || ''
        })
        setElderInfo({
          elderName: data.elder_name || '',
          elderRelation: data.elder_relation || '',
          elderProfile: data.elder_profile ? 
            (typeof data.elder_profile === 'string' ? JSON.parse(data.elder_profile) : data.elder_profile) 
            : {}
        })
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  }

  // 保存用户基本信息
  const handleSaveUserInfo = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    
    try {
      const response = await ElderCareAPI.updateUserInfo(currentUser.id, {
        real_name: userInfo.realName,
        phone: userInfo.phone,
        email: userInfo.email
      })
      
      if (response.success) {
        setMessage({ type: 'success', text: '用户信息已更新' })
        // 更新父组件的用户状态
        onUserUpdated({
          ...currentUser,
          realName: userInfo.realName,
          phone: userInfo.phone,
          email: userInfo.email
        })
      } else {
        setMessage({ type: 'error', text: response.message || '更新失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '更新失败: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  // 保存老人信息
  const handleSaveElderInfo = async () => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    
    try {
      const response = await ElderCareAPI.updateUserInfo(currentUser.id, {
        elder_name: elderInfo.elderName,
        elder_relation: elderInfo.elderRelation,
        elder_profile: JSON.stringify(elderInfo.elderProfile)
      })
      
      if (response.success) {
        setMessage({ type: 'success', text: '老人信息已更新' })
        onUserUpdated({
          ...currentUser,
          elderName: elderInfo.elderName
        })
      } else {
        setMessage({ type: 'error', text: response.message || '更新失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '更新失败: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  // 修改密码
  const handleChangePassword = async () => {
    // 验证
    if (!passwordData.currentPassword) {
      setMessage({ type: 'error', text: '请输入当前密码' })
      return
    }
    if (!passwordData.newPassword) {
      setMessage({ type: 'error', text: '请输入新密码' })
      return
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码长度至少6位' })
      return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的新密码不一致' })
      return
    }
    
    setLoading(true)
    setMessage({ type: '', text: '' })
    
    try {
      const response = await ElderCareAPI.changePassword(currentUser.id, {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      })
      
      if (response.success) {
        setMessage({ type: 'success', text: '密码修改成功' })
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        setMessage({ type: 'error', text: response.message || '密码修改失败' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '密码修改失败: ' + error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[500px] max-h-[80vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            用户设置
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          {message.text && (
            <div className={`mb-4 p-3 rounded-md text-sm ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}
          
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">个人信息</TabsTrigger>
              <TabsTrigger value="elder">老人信息</TabsTrigger>
              <TabsTrigger value="password">修改密码</TabsTrigger>
            </TabsList>
            
            {/* 个人信息 */}
            <TabsContent value="profile" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  用户名
                </Label>
                <Input 
                  id="username" 
                  value={currentUser?.username || ''} 
                  disabled 
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">用户名不可修改</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="realName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  真实姓名
                </Label>
                <Input 
                  id="realName" 
                  value={userInfo.realName}
                  onChange={(e) => setUserInfo({...userInfo, realName: e.target.value})}
                  placeholder="请输入您的真实姓名"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  手机号码
                </Label>
                <Input 
                  id="phone" 
                  value={userInfo.phone}
                  onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})}
                  placeholder="请输入手机号码"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  邮箱地址
                </Label>
                <Input 
                  id="email" 
                  type="email"
                  value={userInfo.email}
                  onChange={(e) => setUserInfo({...userInfo, email: e.target.value})}
                  placeholder="请输入邮箱地址"
                />
              </div>
              
              <Button 
                onClick={handleSaveUserInfo} 
                disabled={loading}
                className="w-full mt-4"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? '保存中...' : '保存个人信息'}
              </Button>
            </TabsContent>
            
            {/* 老人信息 */}
            <TabsContent value="elder" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="elderName">老人姓名</Label>
                <Input 
                  id="elderName" 
                  value={elderInfo.elderName}
                  onChange={(e) => setElderInfo({...elderInfo, elderName: e.target.value})}
                  placeholder="请输入老人姓名"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="elderRelation">与老人关系</Label>
                <select
                  id="elderRelation"
                  value={elderInfo.elderRelation}
                  onChange={(e) => setElderInfo({...elderInfo, elderRelation: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">请选择</option>
                  <option value="son">儿子</option>
                  <option value="daughter">女儿</option>
                  <option value="spouse">配偶</option>
                  <option value="grandchild">孙子/孙女</option>
                  <option value="other">其他</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="elderAge">老人年龄</Label>
                <Input 
                  id="elderAge" 
                  type="number"
                  value={elderInfo.elderProfile?.age || ''}
                  onChange={(e) => setElderInfo({
                    ...elderInfo, 
                    elderProfile: {...elderInfo.elderProfile, age: e.target.value}
                  })}
                  placeholder="请输入老人年龄"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="elderGender">老人性别</Label>
                <select
                  id="elderGender"
                  value={elderInfo.elderProfile?.gender || ''}
                  onChange={(e) => setElderInfo({
                    ...elderInfo, 
                    elderProfile: {...elderInfo.elderProfile, gender: e.target.value}
                  })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">请选择</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="elderHealth">健康状况备注</Label>
                <textarea
                  id="elderHealth"
                  value={elderInfo.elderProfile?.healthNotes || ''}
                  onChange={(e) => setElderInfo({
                    ...elderInfo, 
                    elderProfile: {...elderInfo.elderProfile, healthNotes: e.target.value}
                  })}
                  placeholder="请输入老人的健康状况、病史、用药情况等"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              
              <Button 
                onClick={handleSaveElderInfo} 
                disabled={loading}
                className="w-full mt-4"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? '保存中...' : '保存老人信息'}
              </Button>
            </TabsContent>
            
            {/* 修改密码 */}
            <TabsContent value="password" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  当前密码
                </Label>
                <div className="relative">
                  <Input 
                    id="currentPassword" 
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    placeholder="请输入当前密码"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  新密码
                </Label>
                <div className="relative">
                  <Input 
                    id="newPassword" 
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    placeholder="请输入新密码（至少6位）"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  确认新密码
                </Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    placeholder="请再次输入新密码"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <Button 
                onClick={handleChangePassword} 
                disabled={loading}
                className="w-full mt-4"
              >
                <Lock className="h-4 w-4 mr-2" />
                {loading ? '修改中...' : '修改密码'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
