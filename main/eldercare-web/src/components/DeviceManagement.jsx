import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
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
  Settings,
  Wifi,
  WifiOff,
  CheckCircle
} from 'lucide-react';
import ElderCareAPI from '@/services/api.js';

function DeviceManagement() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [addingDevice, setAddingDevice] = useState(false);
  const [newDevice, setNewDevice] = useState({
    deviceName: '',
    deviceType: 'companion',
    location: '',
    model: ''
  });

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = ElderCareAPI.getCurrentUser();
      const response = await ElderCareAPI.getUserDevices(currentUser?.id || 1);
      
      if (response.success && response.data) {
        setDevices(response.data);
      } else {
        setError('加载设备列表失败');
      }
    } catch (err) {
      setError('加载设备失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async () => {
    if (!newDevice.deviceName.trim()) {
      setError('请填写设备名称');
      return;
    }
    
    try {
      setAddingDevice(true);
      setError(null);
      setSuccess(null);
      
      const currentUser = ElderCareAPI.getCurrentUser();
      const deviceData = {
        userId: currentUser?.id || 1,
        deviceName: newDevice.deviceName.trim(),
        deviceType: newDevice.deviceType,
        location: newDevice.location.trim() || '未指定',
        model: newDevice.model.trim() || '未知型号'
      };
      
      const response = await ElderCareAPI.registerDevice(deviceData);
      
      if (response.success) {
        setSuccess('设备添加成功');
        setShowAddDevice(false);
        setNewDevice({
          deviceName: '',
          deviceType: 'companion',
          location: '',
          model: ''
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
  };

  const handleDeleteDevice = async (deviceId, deviceName) => {
    if (!confirm(`确定要删除设备"${deviceName}"吗？`)) {
      return;
    }
    
    try {
      const response = await ElderCareAPI.deleteDevice(deviceId);
      
      if (response.success) {
        setSuccess(`设备"${deviceName}"删除成功`);
        loadDevices();
      } else {
        setError('删除设备失败');
      }
    } catch (err) {
      setError('删除设备失败: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 1:
      case 'online':
        return <Badge><Wifi className="h-3 w-3 mr-1" />在线</Badge>;
      case 0:
      case 'offline':
        return <Badge variant="secondary"><WifiOff className="h-3 w-3 mr-1" />离线</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  const deviceList = Array.isArray(devices) ? devices : [];
  const companionDevices = deviceList.filter(d => d.device_type === 'companion' || d.device_type === 'ai_companion');
  const healthDevices = deviceList.filter(d => d.device_type === 'health_monitor');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">设备管理</h2>
          <p className="text-muted-foreground">管理您的智能设备</p>
        </div>
        <Button onClick={() => setShowAddDevice(!showAddDevice)}>
          <Plus className="h-4 w-4 mr-2" />
          添加设备
        </Button>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {showAddDevice && (
        <Card>
          <CardHeader>
            <CardTitle>添加新设备</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>设备名称</Label>
                <Input
                  placeholder="输入设备名称"
                  value={newDevice.deviceName}
                  onChange={(e) => setNewDevice(prev => ({...prev, deviceName: e.target.value}))}
                />
              </div>
              <div className="space-y-2">
                <Label>设备类型</Label>
                <Select 
                  value={newDevice.deviceType} 
                  onValueChange={(value) => setNewDevice(prev => ({...prev, deviceType: value}))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="companion">智能陪伴设备</SelectItem>
                    <SelectItem value="health_monitor">健康监测设备</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>安装位置</Label>
                <Input
                  placeholder="如：客厅、卧室"
                  value={newDevice.location}
                  onChange={(e) => setNewDevice(prev => ({...prev, location: e.target.value}))}
                />
              </div>
              <div className="space-y-2">
                <Label>设备型号</Label>
                <Input
                  placeholder="如：ESP32-Pro"
                  value={newDevice.model}
                  onChange={(e) => setNewDevice(prev => ({...prev, model: e.target.value}))}
                />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={handleAddDevice} disabled={addingDevice}>
                {addingDevice ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    添加中...
                  </>
                ) : (
                  '添加设备'
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowAddDevice(false)}>
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="companion" className="w-full">
        <TabsList>
          <TabsTrigger value="companion">智能陪伴设备 ({companionDevices.length})</TabsTrigger>
          <TabsTrigger value="health">健康监测设备 ({healthDevices.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="companion">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Smartphone className="h-5 w-5 mr-2" />
                智能陪伴设备
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  加载中...
                </div>
              ) : companionDevices.length === 0 ? (
                <div className="text-center py-8">
                  <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">暂无陪伴设备</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companionDevices.map((device) => (
                    <div key={device.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <Smartphone className="h-5 w-5" />
                          <div className="ml-2">
                            <h4 className="font-medium">{device.device_name}</h4>
                            <p className="text-sm text-muted-foreground">{device.location}</p>
                          </div>
                        </div>
                        {getStatusBadge(device.status)}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>设备ID: {device.id}</div>
                        <div>最后在线: {device.last_online ? new Date(device.last_online).toLocaleString('zh-CN') : '未知'}</div>
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/devices/${device.id}`)}>
                          <Settings className="h-3 w-3 mr-1" />
                          详情
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/devices/${device.id}/monitor`)}>
                          <Activity className="h-3 w-3 mr-1" />
                          监控
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteDevice(device.id, device.device_name)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          删除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                健康监测设备
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  加载中...
                </div>
              ) : healthDevices.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">暂无健康设备</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {healthDevices.map((device) => (
                    <div key={device.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <Activity className="h-5 w-5" />
                          <div className="ml-2">
                            <h4 className="font-medium">{device.device_name}</h4>
                            <p className="text-sm text-muted-foreground">{device.location}</p>
                          </div>
                        </div>
                        {getStatusBadge(device.status)}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>设备ID: {device.id}</div>
                        <div>最后在线: {device.last_online ? new Date(device.last_online).toLocaleString('zh-CN') : '未知'}</div>
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/devices/${device.id}`)}>
                          <Settings className="h-3 w-3 mr-1" />
                          详情
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/devices/${device.id}/monitor`)}>
                          <Activity className="h-3 w-3 mr-1" />
                          监控
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDeleteDevice(device.id, device.device_name)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          删除
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={loadDevices} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新设备列表
        </Button>
      </div>
    </div>
  );
}

export default DeviceManagement;
