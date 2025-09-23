import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { 
  ArrowLeft,
  Wifi,
  WifiOff,
  Activity,
  Settings,
  BarChart3,
  Calendar,
  MapPin,
  Cpu,
  Memory,
  HardDrive,
  Battery,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import ElderCareAPI from '@/services/api.js';

function DeviceDetails() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [deviceStats, setDeviceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDeviceData();
  }, [deviceId]);

  const loadDeviceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 加载设备基本信息
      const deviceResponse = await ElderCareAPI.getDeviceDetails(deviceId);
      if (deviceResponse.success) {
        setDevice(deviceResponse.data);
      }

      // 加载设备统计信息
      const statsResponse = await ElderCareAPI.getDeviceStats(deviceId);
      if (statsResponse.success) {
        setDeviceStats(statsResponse.data);
      }

    } catch (err) {
      setError('加载设备数据失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 1:
      case 'online':
        return <Badge className="bg-green-500"><Wifi className="h-3 w-3 mr-1" />在线</Badge>;
      case 0:
      case 'offline':
        return <Badge variant="secondary"><WifiOff className="h-3 w-3 mr-1" />离线</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  const formatUptime = (hours) => {
    if (!hours) return '未知';
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    return days > 0 ? `${days}天 ${remainingHours}小时` : `${remainingHours}小时`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>加载设备信息中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/devices')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回设备列表
        </Button>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/devices')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回设备列表
        </Button>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>未找到该设备</AlertDescription>
        </Alert>
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
            onClick={() => navigate('/devices')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{device.device_name}</h1>
            <p className="text-muted-foreground">设备详情和管理</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(device.status)}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/devices/${deviceId}/config`)}
          >
            <Settings className="h-4 w-4 mr-2" />
            设备配置
          </Button>
        </div>
      </div>

      {/* 设备概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">安装位置</p>
                <p className="font-medium">{device.location || '未设置'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">最后在线</p>
                <p className="font-medium">
                  {device.last_online ? new Date(device.last_online).toLocaleString('zh-CN') : '从未'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">运行时间</p>
                <p className="font-medium">{formatUptime(deviceStats?.uptime_hours)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细信息标签页 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="performance">性能监控</TabsTrigger>
          <TabsTrigger value="logs">运行日志</TabsTrigger>
          <TabsTrigger value="settings">基本设置</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 设备基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle>基本信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">设备ID</span>
                  <span className="font-mono text-sm">{device.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">设备类型</span>
                  <span>{device.device_type === 'companion' ? '智能陪伴设备' : '健康监测设备'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">设备型号</span>
                  <span>{device.model || '未知'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">固件版本</span>
                  <span>{deviceStats?.firmware_version || '未知'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">创建时间</span>
                  <span>{new Date(device.created_at).toLocaleString('zh-CN')}</span>
                </div>
              </CardContent>
            </Card>

            {/* 连接状态 */}
            <Card>
              <CardHeader>
                <CardTitle>连接状态</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">当前状态</span>
                  {getStatusBadge(device.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IP地址</span>
                  <span className="font-mono text-sm">{deviceStats?.ip_address || '未知'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wi-Fi信号</span>
                  <span>{deviceStats?.wifi_signal ? `${deviceStats.wifi_signal} dBm` : '未知'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">连接次数</span>
                  <span>{deviceStats?.connection_count || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 系统资源 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Cpu className="h-4 w-4 mr-2" />
                  系统资源
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>CPU使用率</span>
                    <span>{deviceStats?.cpu_usage || 0}%</span>
                  </div>
                  <Progress value={deviceStats?.cpu_usage || 0} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>内存使用率</span>
                    <span>{deviceStats?.memory_usage || 0}%</span>
                  </div>
                  <Progress value={deviceStats?.memory_usage || 0} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>存储使用率</span>
                    <span>{deviceStats?.storage_usage || 0}%</span>
                  </div>
                  <Progress value={deviceStats?.storage_usage || 0} />
                </div>
              </CardContent>
            </Card>

            {/* 电源状态 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Battery className="h-4 w-4 mr-2" />
                  电源状态
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">电源类型</span>
                  <span>{deviceStats?.power_source || '外部供电'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">电池电量</span>
                  <span>{deviceStats?.battery_level ? `${deviceStats.battery_level}%` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">温度</span>
                  <span>{deviceStats?.temperature ? `${deviceStats.temperature}°C` : '未知'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>运行日志</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900 text-slate-100 p-4 rounded-md font-mono text-sm h-96 overflow-y-auto">
                <div className="space-y-1">
                  {deviceStats?.recent_logs?.map((log, index) => (
                    <div key={index} className="flex">
                      <span className="text-slate-400 mr-2">[{log.timestamp}]</span>
                      <span className={log.level === 'ERROR' ? 'text-red-400' : log.level === 'WARN' ? 'text-yellow-400' : 'text-green-400'}>
                        {log.level}:
                      </span>
                      <span className="ml-2">{log.message}</span>
                    </div>
                  )) || (
                    <div className="text-slate-400 text-center py-8">
                      暂无日志记录
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={loadDeviceData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新日志
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>基本设置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">设备名称</label>
                    <p className="text-muted-foreground">{device.device_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">安装位置</label>
                    <p className="text-muted-foreground">{device.location || '未设置'}</p>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button 
                    onClick={() => navigate(`/devices/${deviceId}/config`)}
                    className="mr-2"
                  >
                    高级配置
                  </Button>
                  <Button variant="outline" onClick={loadDeviceData}>
                    刷新数据
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DeviceDetails;