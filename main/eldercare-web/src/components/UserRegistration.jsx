// UserRegistration.jsx - 用户注册和设备绑定界面
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

const UserRegistration = ({ onRegistrationComplete }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  // 表单数据
  const [formData, setFormData] = useState({
    // 基本信息
    elderName: '',
    elderAge: '',
    elderGender: '',
    elderIdCard: '',
    elderPhone: '',
    
    // 家属信息
    familyName: '',
    familyPhone: '',
    relationship: '',
    familyAddress: '',
    
    // 健康档案
    chronicDiseases: [],
    medications: [],
    allergies: '',
    emergencyContact: '',
    emergencyPhone: '',
    
    // 健康基线
    baseHeartRate: '',
    baseBloodPressure: '',
    baseWeight: '',
    baseHeight: '',
    
    // 生活习惯
    wakeUpTime: '',
    sleepTime: '',
    mealTimes: '',
    exerciseHabits: '',
    
    // 设备信息
    deviceId: '',
    deviceName: '',
    installLocation: ''
  })
  
  // 设备发现状态
  const [deviceDiscovery, setDeviceDiscovery] = useState({
    scanning: false,
    discoveredDevices: [],
    selectedDevice: null,
    connectionStatus: 'disconnected'
  })

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateStep = (step) => {
    setError(null)
    
    switch (step) {
      case 1:
        if (!formData.elderName || !formData.elderAge || !formData.elderGender) {
          setError('请填写老人基本信息')
          return false
        }
        break
      case 2:
        if (!formData.familyName || !formData.familyPhone || !formData.relationship) {
          setError('请填写家属信息')
          return false
        }
        if (!/^1[3-9]\d{9}$/.test(formData.familyPhone)) {
          setError('请输入正确的手机号码')
          return false
        }
        break
      case 3:
        // 健康档案为可选项，但建议填写
        if (!formData.emergencyContact || !formData.emergencyPhone) {
          setError('请填写紧急联系人信息')
          return false
        }
        break
      case 4:
        if (!formData.deviceId || !deviceDiscovery.selectedDevice) {
          setError('请选择并连接设备')
          return false
        }
        break
    }
    return true
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => prev - 1)
    setError(null)
  }

  // 设备发现功能
  const scanDevices = async () => {
    setDeviceDiscovery(prev => ({ ...prev, scanning: true }))
    setError(null)
    
    try {
      // 模拟设备扫描过程
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // 模拟发现的设备
      const mockDevices = [
        {
          id: 'esp32_001',
          name: '小智陪伴设备-001',
          type: 'ElderCare Device',
          signal: -45,
          status: 'available'
        },
        {
          id: 'esp32_002', 
          name: '小智陪伴设备-002',
          type: 'ElderCare Device',
          signal: -67,
          status: 'available'
        }
      ]
      
      setDeviceDiscovery(prev => ({
        ...prev,
        discoveredDevices: mockDevices,
        scanning: false
      }))
      
    } catch (err) {
      setError('设备扫描失败，请重试')
      setDeviceDiscovery(prev => ({ ...prev, scanning: false }))
    }
  }

  const selectDevice = (device) => {
    setDeviceDiscovery(prev => ({ 
      ...prev, 
      selectedDevice: device 
    }))
    updateFormData('deviceId', device.id)
    updateFormData('deviceName', device.name)
  }

  const connectDevice = async () => {
    if (!deviceDiscovery.selectedDevice) return
    
    setLoading(true)
    setDeviceDiscovery(prev => ({ ...prev, connectionStatus: 'connecting' }))
    
    try {
      // 模拟设备连接过程
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setDeviceDiscovery(prev => ({ ...prev, connectionStatus: 'connected' }))
      setSuccess('设备连接成功！')
      
    } catch (err) {
      setError('设备连接失败，请重试')
      setDeviceDiscovery(prev => ({ ...prev, connectionStatus: 'failed' }))
    } finally {
      setLoading(false)
    }
  }

  const submitRegistration = async () => {
    if (!validateStep(4)) return
    
    setLoading(true)
    setError(null)
    
    try {
      // 提交注册数据
      const registrationData = {
        elderInfo: {
          name: formData.elderName,
          age: parseInt(formData.elderAge),
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
          emergencyContact: formData.emergencyContact,
          emergencyPhone: formData.emergencyPhone,
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
        deviceInfo: {
          deviceId: formData.deviceId,
          deviceName: formData.deviceName,
          installLocation: formData.installLocation
        }
      }
      
      const result = await ElderCareAPI.register(registrationData)
      
      if (result.success) {
        setSuccess('注册成功！正在跳转到系统...')
        setTimeout(() => {
          onRegistrationComplete && onRegistrationComplete(result.user_id, registrationData)
        }, 2000)
      } else {
        setError(result.message || '注册失败')
      }
      
    } catch (err) {
      setError(`注册失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getStepTitle = (step) => {
    const titles = {
      1: '老人基本信息',
      2: '家属联系信息', 
      3: '健康档案配置',
      4: '设备绑定配置'
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
        <span className={currentStep >= 1 ? 'text-primary font-medium' : ''}>基本信息</span>
        <span className={currentStep >= 2 ? 'text-primary font-medium' : ''}>家属信息</span>
        <span className={currentStep >= 3 ? 'text-primary font-medium' : ''}>健康档案</span>
        <span className={currentStep >= 4 ? 'text-primary font-medium' : ''}>设备绑定</span>
      </div>
    </div>
  )

  const renderStep1 = () => (
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

  const renderStep2 = () => (
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
        
        <Separator />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emergencyContact">紧急联系人 *</Label>
            <Input
              id="emergencyContact"
              placeholder="紧急联系人姓名"
              value={formData.emergencyContact}
              onChange={(e) => updateFormData('emergencyContact', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="emergencyPhone">紧急联系电话 *</Label>
            <Input
              id="emergencyPhone"
              placeholder="紧急联系电话"
              value={formData.emergencyPhone}
              onChange={(e) => updateFormData('emergencyPhone', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderStep3 = () => (
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

  const renderStep4 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            设备发现与绑定
          </CardTitle>
          <CardDescription>
            扫描并连接您的智慧养老设备
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">扫描附近设备</p>
              <p className="text-sm text-muted-foreground">请确保设备已开机并处于配网模式</p>
            </div>
            <Button 
              onClick={scanDevices} 
              disabled={deviceDiscovery.scanning}
              variant="outline"
            >
              {deviceDiscovery.scanning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  扫描中...
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  扫描设备
                </>
              )}
            </Button>
          </div>

          {deviceDiscovery.discoveredDevices.length > 0 && (
            <div className="space-y-3">
              <Label>发现的设备</Label>
              {deviceDiscovery.discoveredDevices.map((device) => (
                <div
                  key={device.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    deviceDiscovery.selectedDevice?.id === device.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => selectDevice(device)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{device.name}</p>
                        <p className="text-sm text-muted-foreground">
                          设备ID: {device.id} • 信号: {device.signal}dBm
                        </p>
                      </div>
                    </div>
                    {deviceDiscovery.selectedDevice?.id === device.id && (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {deviceDiscovery.selectedDevice && (
        <Card>
          <CardHeader>
            <CardTitle>设备配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deviceName">设备名称</Label>
                <Input
                  id="deviceName"
                  value={formData.deviceName}
                  onChange={(e) => updateFormData('deviceName', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="installLocation">安装位置</Label>
                <Select value={formData.installLocation} onValueChange={(value) => updateFormData('installLocation', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择安装位置" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="living_room">客厅</SelectItem>
                    <SelectItem value="bedroom">卧室</SelectItem>
                    <SelectItem value="kitchen">厨房</SelectItem>
                    <SelectItem value="bathroom">卫生间</SelectItem>
                    <SelectItem value="study">书房</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  deviceDiscovery.connectionStatus === 'connected' ? 'bg-green-500' :
                  deviceDiscovery.connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  deviceDiscovery.connectionStatus === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                <div>
                  <p className="font-medium">设备连接状态</p>
                  <p className="text-sm text-muted-foreground">
                    {deviceDiscovery.connectionStatus === 'connected' ? '已连接' :
                     deviceDiscovery.connectionStatus === 'connecting' ? '连接中...' :
                     deviceDiscovery.connectionStatus === 'failed' ? '连接失败' : '未连接'}
                  </p>
                </div>
              </div>
              
              {deviceDiscovery.connectionStatus !== 'connected' && (
                <Button 
                  onClick={connectDevice}
                  disabled={loading || deviceDiscovery.connectionStatus === 'connecting'}
                  size="sm"
                >
                  {deviceDiscovery.connectionStatus === 'connecting' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      连接中
                    </>
                  ) : (
                    '连接设备'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
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
              disabled={loading || deviceDiscovery.connectionStatus !== 'connected'}
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