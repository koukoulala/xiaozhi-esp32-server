import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { 
  User, 
  Heart, 
  Phone,
  Home,
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle,
  Wifi,
  Settings,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  QrCode,
  Smartphone
} from 'lucide-react'
import ElderCareAPI from '@/services/api.js'

const UserRegistration = ({ onRegistrationComplete, onSwitchToLogin }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  // 表单数据
  const [formData, setFormData] = useState({
    // 账号设置（第一步）
    username: '',
    password: '',
    confirmPassword: '',
    
    // 老人基本信息（第二步）
    elderName: '',
    elderAge: '',
    elderGender: '',
    elderIdCard: '',
    elderPhone: '',
    
    // 家属信息（第三步）
    familyName: '',
    familyPhone: '',
    relationship: '',
    familyAddress: '',
    
    // 健康档案（第四步）
    chronicDiseases: [],
    medications: [],
    allergies: '',
    
    // 健康基线
    baseHeartRate: '',
    baseBloodPressure: '',
    baseWeight: '',
    baseHeight: '',
    
    // 生活习惯
    wakeUpTime: '',
    sleepTime: '',
    mealTimes: '',
    exerciseHabits: ''
  })

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateStep = (step) => {
    setError(null)
    
    switch (step) {
      case 1:
        // 账号设置验证
        if (!formData.username) {
          setError('请填写用户名')
          return false
        }
        if (!formData.password || formData.password.length < 6) {
          setError('密码长度不能少于6个字符')
          return false
        }
        if (formData.password !== formData.confirmPassword) {
          setError('两次输入的密码不一致')
          return false
        }
        break
      case 2:
        // 老人基本信息验证
        if (!formData.elderName || !formData.elderAge || !formData.elderGender) {
          setError('请填写老人基本信息')
          return false
        }
        break
      case 3:
        // 家属信息验证
        if (!formData.familyName || !formData.familyPhone || !formData.relationship) {
          setError('请填写家属信息')
          return false
        }
        if (!/^1[3-9]\d{9}$/.test(formData.familyPhone)) {
          setError('请输入正确的手机号码')
          return false
        }
        break
      case 4:
        // 健康档案为可选项，可以直接通过
        break
    }
    return true
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      // 第4步之后直接提交注册
      if (currentStep === 4) {
        submitRegistration();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => prev - 1)
    setError(null)
  }



  const submitRegistration = async () => {
    if (!validateStep(4)) return
    
    setLoading(true)
    setError(null)
    
    try {
      // 提交注册数据
      const registrationData = {
        username: formData.username,
        password: formData.password,
        email: '', // 可选字段
        elderInfo: {
          name: formData.elderName,
          age: parseInt(formData.elderAge) || 0,
          gender: formData.elderGender,
          idCard: formData.elderIdCard,
          phone: formData.elderPhone
        },
        familyInfo: {
          name: formData.familyName,
          phone: formData.familyPhone,
          relationship: formData.relationship,
          address: formData.familyAddress
        },
        healthProfile: {
          chronicDiseases: formData.chronicDiseases,
          medications: formData.medications,
          allergies: formData.allergies,
          baseline: {
            heartRate: formData.baseHeartRate ? parseInt(formData.baseHeartRate) : null,
            bloodPressure: formData.baseBloodPressure,
            weight: formData.baseWeight ? parseFloat(formData.baseWeight) : null,
            height: formData.baseHeight ? parseFloat(formData.baseHeight) : null
          }
        },
        lifeHabits: {
          wakeUpTime: formData.wakeUpTime,
          sleepTime: formData.sleepTime,
          mealTimes: formData.mealTimes,
          exerciseHabits: formData.exerciseHabits
        },
        create_default_agent: true // 标记需要创建默认智能体
      }
      
      console.log('提交注册数据:', registrationData);
      
      const result = await ElderCareAPI.register(registrationData)
      
      console.log('注册结果:', result);
      
      if (result.success) {
        setSuccess('注册成功！系统已为您创建默认智能体，正在跳转...')
        setTimeout(() => {
          onRegistrationComplete && onRegistrationComplete(result.user_id, registrationData)
        }, 2000)
      } else {
        setError(result.message || '注册失败')
      }
      
    } catch (err) {
      console.error('注册失败:', err);
      setError(`注册失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getStepTitle = (step) => {
    const titles = {
      1: '账号设置',
      2: '老人基本信息',
      3: '家属联系信息', 
      4: '健康档案配置'
    }
    return titles[step]
  }

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">用户注册</h2>
        <Badge variant="outline">
          步骤 {currentStep}/4
        </Badge>
      </div>
      <Progress value={(currentStep / 4) * 100} className="mb-4" />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span className={currentStep >= 1 ? 'text-primary font-medium' : ''}>账号设置</span>
        <span className={currentStep >= 2 ? 'text-primary font-medium' : ''}>老人信息</span>
        <span className={currentStep >= 3 ? 'text-primary font-medium' : ''}>家属信息</span>
        <span className={currentStep >= 4 ? 'text-primary font-medium' : ''}>健康档案</span>
      </div>
    </div>
  )

  // 新的第一步 - 账号设置
  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          账号设置
        </CardTitle>
        <CardDescription>
          请设置您的登录账号和密码
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">用户名 *</Label>
          <Input
            id="username"
            placeholder="请输入登录用户名"
            value={formData.username}
            onChange={(e) => updateFormData('username', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">密码 *</Label>
          <Input
            id="password"
            type="password"
            placeholder="请输入登录密码（至少6位字符）"
            value={formData.password}
            onChange={(e) => updateFormData('password', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">确认密码 *</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="请再次输入登录密码"
            value={formData.confirmPassword}
            onChange={(e) => updateFormData('confirmPassword', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  )
  
  // 第二步 - 老人基本信息
  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="h-5 w-5 mr-2" />
          老人基本信息
        </CardTitle>
        <CardDescription>
          请填写需要照护的老人基本信息
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="elderName">姓名 *</Label>
            <Input
              id="elderName"
              placeholder="请输入老人姓名"
              value={formData.elderName}
              onChange={(e) => updateFormData('elderName', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="elderAge">年龄 *</Label>
            <Input
              id="elderAge"
              type="number"
              placeholder="请输入年龄"
              value={formData.elderAge}
              onChange={(e) => updateFormData('elderAge', e.target.value)}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="elderGender">性别 *</Label>
            <Select value={formData.elderGender} onValueChange={(value) => updateFormData('elderGender', value)}>
              <SelectTrigger>
                <SelectValue placeholder="请选择性别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">男</SelectItem>
                <SelectItem value="female">女</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="elderPhone">联系电话</Label>
            <Input
              id="elderPhone"
              placeholder="请输入联系电话"
              value={formData.elderPhone}
              onChange={(e) => updateFormData('elderPhone', e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="elderIdCard">身份证号</Label>
          <Input
            id="elderIdCard"
            placeholder="请输入身份证号码（可选）"
            value={formData.elderIdCard}
            onChange={(e) => updateFormData('elderIdCard', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  )

  // 第三步 - 家属联系信息
  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Phone className="h-5 w-5 mr-2" />
          家属联系信息
        </CardTitle>
        <CardDescription>
          请填写主要照护家属的联系信息
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="familyName">家属姓名 *</Label>
            <Input
              id="familyName"
              placeholder="请输入家属姓名"
              value={formData.familyName}
              onChange={(e) => updateFormData('familyName', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="familyPhone">联系电话 *</Label>
            <Input
              id="familyPhone"
              placeholder="请输入手机号码"
              value={formData.familyPhone}
              onChange={(e) => updateFormData('familyPhone', e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="relationship">与老人关系 *</Label>
          <Select value={formData.relationship} onValueChange={(value) => updateFormData('relationship', value)}>
            <SelectTrigger>
              <SelectValue placeholder="请选择关系" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="son">儿子</SelectItem>
              <SelectItem value="daughter">女儿</SelectItem>
              <SelectItem value="spouse">配偶</SelectItem>
              <SelectItem value="grandson">孙子</SelectItem>
              <SelectItem value="granddaughter">孙女</SelectItem>
              <SelectItem value="other">其他亲属</SelectItem>
              <SelectItem value="caregiver">护工</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="familyAddress">家庭住址</Label>
          <Textarea
            id="familyAddress"
            placeholder="请输入详细地址"
            value={formData.familyAddress}
            onChange={(e) => updateFormData('familyAddress', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  )

  // 第四步 - 健康档案配置
  const renderStep4 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Heart className="h-5 w-5 mr-2" />
          健康档案配置
        </CardTitle>
        <CardDescription>
          详细填写有助于提供更精准的健康监护服务
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="diseases" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="diseases">疾病史</TabsTrigger>
            <TabsTrigger value="baseline">健康基线</TabsTrigger>
            <TabsTrigger value="habits">生活习惯</TabsTrigger>
          </TabsList>
          
          <TabsContent value="diseases" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chronicDiseases">慢性疾病</Label>
              <Textarea
                id="chronicDiseases"
                placeholder="请列出慢性疾病，如高血压、糖尿病等"
                value={formData.chronicDiseases.join(', ')}
                onChange={(e) => updateFormData('chronicDiseases', e.target.value.split(',').map(item => item.trim()).filter(item => item))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="medications">常用药物</Label>
              <Textarea
                id="medications"
                placeholder="请列出正在服用的药物"
                value={formData.medications.join(', ')}
                onChange={(e) => updateFormData('medications', e.target.value.split(',').map(item => item.trim()).filter(item => item))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="allergies">过敏史</Label>
              <Textarea
                id="allergies"
                placeholder="请填写已知的过敏情况"
                value={formData.allergies}
                onChange={(e) => updateFormData('allergies', e.target.value)}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="baseline" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseHeartRate">静息心率 (bpm)</Label>
                <Input
                  id="baseHeartRate"
                  type="number"
                  placeholder="如 72"
                  value={formData.baseHeartRate}
                  onChange={(e) => updateFormData('baseHeartRate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="baseBloodPressure">正常血压 (mmHg)</Label>
                <Input
                  id="baseBloodPressure"
                  placeholder="如 120/80"
                  value={formData.baseBloodPressure}
                  onChange={(e) => updateFormData('baseBloodPressure', e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseWeight">体重 (kg)</Label>
                <Input
                  id="baseWeight"
                  type="number"
                  placeholder="如 65"
                  value={formData.baseWeight}
                  onChange={(e) => updateFormData('baseWeight', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="baseHeight">身高 (cm)</Label>
                <Input
                  id="baseHeight"
                  type="number"
                  placeholder="如 165"
                  value={formData.baseHeight}
                  onChange={(e) => updateFormData('baseHeight', e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="habits" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wakeUpTime">起床时间</Label>
                <Input
                  id="wakeUpTime"
                  type="time"
                  value={formData.wakeUpTime}
                  onChange={(e) => updateFormData('wakeUpTime', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sleepTime">就寝时间</Label>
                <Input
                  id="sleepTime"
                  type="time"
                  value={formData.sleepTime}
                  onChange={(e) => updateFormData('sleepTime', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mealTimes">用餐时间</Label>
              <Input
                id="mealTimes"
                placeholder="如 早餐7:30 午餐12:00 晚餐18:00"
                value={formData.mealTimes}
                onChange={(e) => updateFormData('mealTimes', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="exerciseHabits">运动习惯</Label>
              <Textarea
                id="exerciseHabits"
                placeholder="请描述日常运动习惯"
                value={formData.exerciseHabits}
                onChange={(e) => updateFormData('exerciseHabits', e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )



  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* 添加登录按钮 */}
        <div className="flex justify-between items-center mb-4">
          <div></div>
          <Button 
            variant="outline"
            onClick={onSwitchToLogin}
            className="flex items-center space-x-2"
          >
            <User className="h-4 w-4" />
            <span>已有账户？去登录</span>
          </Button>
        </div>
        
        {renderProgressBar()}
        
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
        
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4">{getStepTitle(currentStep)}</h3>
          
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>
        
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            上一步
          </Button>
          
          {currentStep < 4 ? (
            <Button onClick={nextStep}>
              下一步
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={submitRegistration}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  注册中...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  完成注册
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserRegistration