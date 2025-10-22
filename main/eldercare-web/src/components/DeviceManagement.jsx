import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { 
  Smartphone,
  Activity,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react';
import ElderCareAPI from '../services/api.js';

function DeviceManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [addingDevice, setAddingDevice] = useState(false);
  const [deviceType, setDeviceType] = useState('health'); // 'ai' or 'health'
  const [verificationCode, setVerificationCode] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [userAgents, setUserAgents] = useState([]);
  const [newDevice, setNewDevice] = useState({
    deviceName: '',
    deviceType: 'health',
    aiDeviceId: '',
    location: '',
    description: ''
  });

  useEffect(() => {
    loadDevices();
    loadUserAgents();
    // 移除自动刷新，改为手动刷新
  }, []);

  // 处理自动打开添加设备流程
  useEffect(() => {
    if (location.state?.autoAddDevice && location.state?.deviceType) {
      // 延迟一点，等待数据加载完成
      const timer = setTimeout(() => {
        handleShowAddDevice(location.state.deviceType);
        // 清除state，避免重复触发
        navigate(location.pathname, { replace: true, state: {} });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const loadUserAgents = async () => {
    try {
      const currentUser = ElderCareAPI.getCurrentUser();
      if (!currentUser) {
        return;
      }
      
      const response = await ElderCareAPI.getUserAgents(currentUser.id);
      if (response.success && Array.isArray(response.data)) {
        setUserAgents(response.data);
        // 设置默认agent
        const defaultAgent = response.data.find(agent => agent.default_agent || agent.is_default);
        if (defaultAgent) {
          setSelectedAgentId(defaultAgent.id);
        } else if (response.data.length > 0) {
          setSelectedAgentId(response.data[0].id);
        }
      }
    } catch (err) {
      console.error('加载智能体列表失败:', err);
    }
  };

  const handleShowAddDevice = (type) => {
    setDeviceType(type);
    setVerificationCode('');
    setShowAddDevice(true);
    if (type === 'health') {
      // 健康设备保持原有逻辑
      setNewDevice({
        deviceName: '',
        deviceType: 'health',
        aiDeviceId: '',
        location: '',
        description: ''
      });
    }
  };

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = ElderCareAPI.getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      
      setUserId(currentUser.id);

      // 获取AI设备和健康设备
      const [aiDevicesResponse, healthDevicesResponse] = await Promise.all([
        ElderCareAPI.getUserAIDevices(currentUser.id),
        ElderCareAPI.getUserHealthDevices(currentUser.id)
      ]);

      let aiDevices = [];
      let healthDevices = [];

      if (aiDevicesResponse.success && Array.isArray(aiDevicesResponse.data)) {
        aiDevices = aiDevicesResponse.data;
      }

      if (healthDevicesResponse.success && Array.isArray(healthDevicesResponse.data)) {
        healthDevices = healthDevicesResponse.data;
      }

      // 构建层级结构 - 每个AI设备关联其健康设备
      const devicesWithAssociations = aiDevices.map(aiDevice => ({
        ...aiDevice,
        device_category: 'ai',
        healthDevices: healthDevices.filter(hd => hd.ai_device_id === aiDevice.id)
      }));

      setDevices(devicesWithAssociations);
      
    } catch (err) {
      setError('加载设备列表失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async () => {
    if (deviceType === 'ai') {
      // AI智能陪伴设备 - 使用6位验证码绑定
      if (!/^\d{6}$/.test(verificationCode)) {
        setError('请输入正确的6位数字验证码');
        return;
      }

      if (!selectedAgentId) {
        setError('请选择要绑定的智能体');
        return;
      }

      try {
        setAddingDevice(true);
        setError(null);
        
        const response = await ElderCareAPI.bindDeviceWithCode(selectedAgentId, verificationCode);
        
        if (response.success || response.code === 0) {
          setSuccess('智能陪伴设备绑定成功');
          setShowAddDevice(false);
          setVerificationCode('');
          loadDevices();
        } else {
          setError(response.message || '设备绑定失败');
        }
      } catch (err) {
        setError('设备绑定失败: ' + err.message);
      } finally {
        setAddingDevice(false);
      }
    } else {
      // 健康监测设备 - 保持原有逻辑
      if (!newDevice.deviceName.trim()) {
        setError('请填写设备名称');
        return;
      }

      if (!newDevice.aiDeviceId) {
        setError('添加健康设备时必须选择关联的AI设备');
        return;
      }

      try {
        setAddingDevice(true);
        setError(null);
        
        const deviceData = {
          userId: userId,
          deviceName: newDevice.deviceName.trim(),
          deviceType: newDevice.deviceType,
          aiDeviceId: newDevice.aiDeviceId,
          location: newDevice.location.trim(),
          description: newDevice.description.trim()
        };

        const response = await ElderCareAPI.addDevice(deviceData);
        
        if (response.success) {
          setSuccess('健康监测设备添加成功');
          setShowAddDevice(false);
          setNewDevice({
            deviceName: '',
            deviceType: 'health',
            aiDeviceId: '',
            location: '',
            description: ''
          });
          loadDevices();
        } else {
          setError(response.message || '添加设备失败');
        }
      } catch (err) {
        setError('添加设备失败: ' + err.message);
      } finally {
        setAddingDevice(false);
      }
    }
  };

  const handleDeleteDevice = async (deviceId, deviceType) => {
    if (!confirm(`确定要删除这个${deviceType === 'ai' ? 'AI' : '健康监测'}设备吗？`)) {
      return;
    }

    try {
      setError(null);
      const response = await ElderCareAPI.deleteDevice(deviceId, deviceType);
      
      if (response.success) {
        setSuccess('设备删除成功');
        loadDevices();
      } else {
        setError(response.message || '删除设备失败');
      }
    } catch (err) {
      setError('删除设备失败: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    const isOnline = status === 1 || status === 'online';
    return (
      <Badge variant={isOnline ? 'default' : 'secondary'} className="flex items-center">
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3 mr-1" />
            在线
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 mr-1" />
            离线
          </>
        )}
      </Badge>
    );
  };

  const totalHealthDeviceCount = devices.reduce((count, device) => 
    count + (device.healthDevices ? device.healthDevices.length : 0), 0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">设备管理</h2>
          <p className="text-muted-foreground">管理您的AI智能设备和健康监测设备</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleShowAddDevice('ai')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            添加智能陪伴设备
          </Button>
          <Button onClick={() => handleShowAddDevice('health')} variant="outline" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            添加健康监测设备
          </Button>
        </div>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* 添加设备对话框 */}
      {showAddDevice && deviceType === 'ai' && (
        <Card>
          <CardHeader>
            <CardTitle>添加智能陪伴设备</CardTitle>
            <CardDescription>请输入设备播报的6位数字验证码进行绑定</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="agentSelect">选择智能体 *</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择要绑定的智能体" />
                  </SelectTrigger>
                  <SelectContent>
                    {userAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.agent_name} {agent.default_agent && '(默认)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="verificationCode">设备验证码 *</Label>
                <Input
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6位数字"
                  maxLength={6}
                  className="w-40 text-center text-lg tracking-widest font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  设备开机后会播报验证码
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleAddDevice} 
                disabled={addingDevice || !/^\d{6}$/.test(verificationCode)}
              >
                {addingDevice ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    绑定中...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    绑定设备
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddDevice(false);
                  setVerificationCode('');
                }}
              >
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 添加健康设备对话框 */}
      {showAddDevice && deviceType === 'health' && (
        <Card>
          <CardHeader>
            <CardTitle>添加健康监测设备</CardTitle>
            <CardDescription>添加健康监测设备并关联到AI智能陪伴设备</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deviceName">设备名称 *</Label>
                <Input
                  id="deviceName"
                  value={newDevice.deviceName}
                  onChange={(e) => setNewDevice(prev => ({...prev, deviceName: e.target.value}))}
                  placeholder="输入设备名称"
                />
              </div>
              <div>
                <Label htmlFor="aiDeviceId">关联AI设备 *</Label>
                <Select value={newDevice.aiDeviceId} onValueChange={(value) => setNewDevice(prev => ({...prev, aiDeviceId: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择要关联的AI设备" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.alias || device.device_name || `设备 ${device.mac_address}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddDevice} disabled={addingDevice}>
                {addingDevice ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    添加中...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    添加设备
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddDevice(false);
                  setNewDevice({
                    deviceName: '',
                    deviceType: 'health',
                    aiDeviceId: '',
                    location: '',
                    description: ''
                  });
                }}
              >
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 设备列表 */}
      <div className="space-y-4">
        {/* 设备总数信息 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            共 {devices.length} 个AI设备，{totalHealthDeviceCount} 个健康监测设备
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            加载设备中...
          </div>
        ) : devices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">暂无设备</p>
              <p className="text-sm text-muted-foreground">点击上方"添加设备"按钮添加您的第一个设备</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {devices.map((aiDevice) => (
              <div key={aiDevice.id} className="space-y-4">
                {/* AI设备卡片 */}
                <Card className="border-blue-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-lg">
                        {aiDevice.device_name || aiDevice.alias || `AI设备 ${aiDevice.id}`}
                      </CardTitle>
                      <Badge variant="default">AI智能陪伴</Badge>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(aiDevice.status)}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteDevice(aiDevice.id, 'ai')}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        删除
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">MAC地址:</span>
                        <p className="font-mono">{aiDevice.mac_address || '--'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">设备型号:</span>
                        <p>{aiDevice.board || '--'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">固件版本:</span>
                        <p>{aiDevice.app_version || '--'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">最后连接:</span>
                        <p>{aiDevice.last_connected_at ? new Date(aiDevice.last_connected_at).toLocaleString() : '--'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 关联的健康设备 */}
                {aiDevice.healthDevices && aiDevice.healthDevices.length > 0 && (
                  <div className="ml-6 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-green-500" />
                      关联的健康监测设备 ({aiDevice.healthDevices.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiDevice.healthDevices.map((healthDevice) => (
                        <Card key={healthDevice.id} className="border-green-100">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Activity className="h-4 w-4 text-green-500" />
                                <CardTitle className="text-sm">
                                  {healthDevice.device_name || '健康设备'}
                                </CardTitle>
                                <Badge variant="secondary">健康监测</Badge>
                              </div>
                              {getStatusBadge(healthDevice.connection_status)}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">类型:</span>
                                <span>{healthDevice.device_type || '未知'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">品牌:</span>
                                <span>{healthDevice.device_brand || '未知'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">电池:</span>
                                <span>{healthDevice.battery_level ? `${healthDevice.battery_level}%` : '--'}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDeleteDevice(healthDevice.id, 'health')}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                删除
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex justify-center">
        <Button variant="outline" onClick={loadDevices} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          刷新设备列表
        </Button>
      </div>
    </div>
  );
}

export default DeviceManagement;