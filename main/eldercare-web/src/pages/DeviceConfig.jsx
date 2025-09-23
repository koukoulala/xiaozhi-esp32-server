import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { 
  ArrowLeft,
  Save,
  RefreshCw,
  Settings,
  Wifi,
  Volume2,
  Mic,
  Camera,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import ElderCareAPI from '@/services/api.js';

function DeviceConfig() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [config, setConfig] = useState({
    // 基本设置
    deviceName: '',
    location: '',
    timezone: 'Asia/Shanghai',
    language: 'zh-CN',
    
    // 网络设置
    wifiSSID: '',
    wifiPassword: '',
    enableEthernet: false,
    
    // 音频设置
    micSensitivity: 50,
    speakerVolume: 70,
    enableNoiseCancellation: true,
    audioFormat: 'wav',
    
    // 视觉设置
    enableCamera: true,
    cameraResolution: '720p',
    enableMotionDetection: false,
    
    // 安全设置
    enableEncryption: true,
    autoUpdate: true,
    dataRetentionDays: 30,
    
    // 功能设置
    enableVoiceActivation: true,
    wakeWord: 'xiaozhi',
    responseDelay: 500,
    enableStatusLED: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadDeviceConfig();
  }, [deviceId]);

  const loadDeviceConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const deviceResponse = await ElderCareAPI.getDeviceDetails(deviceId);
      if (deviceResponse.success) {
        setDevice(deviceResponse.data);
        setConfig(prev => ({
          ...prev,
          deviceName: deviceResponse.data.device_name,
          location: deviceResponse.data.location || ''
        }));
      }

      const configResponse = await ElderCareAPI.getDeviceConfig(deviceId);
      if (configResponse.success) {
        setConfig(prev => ({ ...prev, ...configResponse.data }));
      }

    } catch (err) {
      setError('加载设备配置失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await ElderCareAPI.updateDeviceConfig(deviceId, config);
      
      if (response.success) {
        setSuccess('配置保存成功');
      } else {
        setError('保存配置失败: ' + (response.message || '未知错误'));
      }

    } catch (err) {
      setError('保存配置失败: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>加载配置信息中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/devices/${deviceId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回设备详情
          </Button>
          <div>
            <h1 className="text-2xl font-bold">设备配置</h1>
            <p className="text-muted-foreground">{device?.device_name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={handleSaveConfig}
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                保存配置
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 状态提示 */}
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* 配置选项卡 */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList>
          <TabsTrigger value="basic">基本设置</TabsTrigger>
          <TabsTrigger value="network">网络配置</TabsTrigger>
          <TabsTrigger value="audio">音频设置</TabsTrigger>
          <TabsTrigger value="visual">视觉设置</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
          <TabsTrigger value="advanced">高级功能</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                基本设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deviceName">设备名称</Label>
                  <Input
                    id="deviceName"
                    value={config.deviceName}
                    onChange={(e) => handleConfigChange('deviceName', e.target.value)}
                    placeholder="请输入设备名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">安装位置</Label>
                  <Input
                    id="location"
                    value={config.location}
                    onChange={(e) => handleConfigChange('location', e.target.value)}
                    placeholder="如：客厅、卧室"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">时区</Label>
                  <Select value={config.timezone} onValueChange={(value) => handleConfigChange('timezone', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Shanghai">北京时间 (UTC+8)</SelectItem>
                      <SelectItem value="Asia/Hong_Kong">香港时间 (UTC+8)</SelectItem>
                      <SelectItem value="Asia/Taipei">台北时间 (UTC+8)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">系统语言</Label>
                  <Select value={config.language} onValueChange={(value) => handleConfigChange('language', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-CN">简体中文</SelectItem>
                      <SelectItem value="zh-TW">繁體中文</SelectItem>
                      <SelectItem value="en-US">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="network">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wifi className="h-4 w-4 mr-2" />
                网络配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="wifiSSID">Wi-Fi名称 (SSID)</Label>
                  <Input
                    id="wifiSSID"
                    value={config.wifiSSID}
                    onChange={(e) => handleConfigChange('wifiSSID', e.target.value)}
                    placeholder="请输入Wi-Fi名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wifiPassword">Wi-Fi密码</Label>
                  <Input
                    id="wifiPassword"
                    type="password"
                    value={config.wifiPassword}
                    onChange={(e) => handleConfigChange('wifiPassword', e.target.value)}
                    placeholder="请输入Wi-Fi密码"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="enableEthernet"
                  checked={config.enableEthernet}
                  onCheckedChange={(checked) => handleConfigChange('enableEthernet', checked)}
                />
                <Label htmlFor="enableEthernet">启用以太网连接</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="audio">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Volume2 className="h-4 w-4 mr-2" />
                音频设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="micSensitivity">麦克风灵敏度: {config.micSensitivity}%</Label>
                  <input
                    id="micSensitivity"
                    type="range"
                    min="0"
                    max="100"
                    value={config.micSensitivity}
                    onChange={(e) => handleConfigChange('micSensitivity', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="speakerVolume">扬声器音量: {config.speakerVolume}%</Label>
                  <input
                    id="speakerVolume"
                    type="range"
                    min="0"
                    max="100"
                    value={config.speakerVolume}
                    onChange={(e) => handleConfigChange('speakerVolume', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="audioFormat">音频格式</Label>
                  <Select value={config.audioFormat} onValueChange={(value) => handleConfigChange('audioFormat', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wav">WAV</SelectItem>
                      <SelectItem value="mp3">MP3</SelectItem>
                      <SelectItem value="flac">FLAC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="enableNoiseCancellation"
                      checked={config.enableNoiseCancellation}
                      onCheckedChange={(checked) => handleConfigChange('enableNoiseCancellation', checked)}
                    />
                    <Label htmlFor="enableNoiseCancellation">启用噪音消除</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="visual">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Camera className="h-4 w-4 mr-2" />
                视觉设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="enableCamera"
                  checked={config.enableCamera}
                  onCheckedChange={(checked) => handleConfigChange('enableCamera', checked)}
                />
                <Label htmlFor="enableCamera">启用摄像头</Label>
              </div>
              
              {config.enableCamera && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cameraResolution">摄像头分辨率</Label>
                    <Select value={config.cameraResolution} onValueChange={(value) => handleConfigChange('cameraResolution', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="480p">480p (640x480)</SelectItem>
                        <SelectItem value="720p">720p (1280x720)</SelectItem>
                        <SelectItem value="1080p">1080p (1920x1080)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="enableMotionDetection"
                        checked={config.enableMotionDetection}
                        onCheckedChange={(checked) => handleConfigChange('enableMotionDetection', checked)}
                      />
                      <Label htmlFor="enableMotionDetection">启用动作检测</Label>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                安全设置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="enableEncryption"
                  checked={config.enableEncryption}
                  onCheckedChange={(checked) => handleConfigChange('enableEncryption', checked)}
                />
                <Label htmlFor="enableEncryption">启用数据加密</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="autoUpdate"
                  checked={config.autoUpdate}
                  onCheckedChange={(checked) => handleConfigChange('autoUpdate', checked)}
                />
                <Label htmlFor="autoUpdate">自动更新固件</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dataRetentionDays">数据保留天数</Label>
                <Select 
                  value={config.dataRetentionDays.toString()} 
                  onValueChange={(value) => handleConfigChange('dataRetentionDays', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7天</SelectItem>
                    <SelectItem value="30">30天</SelectItem>
                    <SelectItem value="90">90天</SelectItem>
                    <SelectItem value="365">365天</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                高级功能
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="enableVoiceActivation"
                      checked={config.enableVoiceActivation}
                      onCheckedChange={(checked) => handleConfigChange('enableVoiceActivation', checked)}
                    />
                    <Label htmlFor="enableVoiceActivation">启用语音唤醒</Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="enableStatusLED"
                      checked={config.enableStatusLED}
                      onCheckedChange={(checked) => handleConfigChange('enableStatusLED', checked)}
                    />
                    <Label htmlFor="enableStatusLED">启用状态指示灯</Label>
                  </div>
                </div>
              </div>
              
              {config.enableVoiceActivation && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wakeWord">唤醒词</Label>
                    <Input
                      id="wakeWord"
                      value={config.wakeWord}
                      onChange={(e) => handleConfigChange('wakeWord', e.target.value)}
                      placeholder="请输入唤醒词"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="responseDelay">响应延迟 (毫秒)</Label>
                    <Input
                      id="responseDelay"
                      type="number"
                      min="0"
                      max="2000"
                      value={config.responseDelay}
                      onChange={(e) => handleConfigChange('responseDelay', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 底部操作按钮 */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={loadDeviceConfig}>
          <RefreshCw className="h-4 w-4 mr-2" />
          重置配置
        </Button>
        <Button onClick={handleSaveConfig} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              保存配置
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default DeviceConfig;