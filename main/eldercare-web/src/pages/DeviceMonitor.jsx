import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { 
  ArrowLeft,
  RefreshCw,
  Activity,
  Cpu,
  Memory,
  HardDrive,
  Thermometer,
  Wifi,
  Battery,
  AlertTriangle,
  TrendingUp,
  Clock
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import ElderCareAPI from '@/services/api.js';

function DeviceMonitor() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [realtimeData, setRealtimeData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMonitoringData();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadRealtimeData, 5000); // 每5秒更新一次实时数据
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [deviceId, autoRefresh]);

  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 加载设备基本信息
      const deviceResponse = await ElderCareAPI.getDeviceDetails(deviceId);
      if (deviceResponse.success) {
        setDevice(deviceResponse.data);
      }

      // 加载实时监控数据
      await loadRealtimeData();

      // 加载历史数据
      const historyResponse = await ElderCareAPI.getDeviceHistoryData(deviceId, {
        timeRange: '24h',
        metrics: ['cpu', 'memory', 'temperature', 'network']
      });
      if (historyResponse.success) {
        setHistoricalData(historyResponse.data);
      }

      // 加载告警信息
      const alertsResponse = await ElderCareAPI.getDeviceAlerts(deviceId);
      if (alertsResponse.success) {
        setAlerts(alertsResponse.data || []);
      }

    } catch (err) {
      setError('加载监控数据失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRealtimeData = async () => {
    try {
      const response = await ElderCareAPI.getDeviceRealtimeData(deviceId);
      if (response.success) {
        setRealtimeData(response.data);
      }
    } catch (err) {
      console.warn('更新实时数据失败:', err);
    }
  };

  const getStatusColor = (value, thresholds = { warning: 70, critical: 90 }) => {
    if (value >= thresholds.critical) return 'text-red-500';
    if (value >= thresholds.warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getProgressColor = (value, thresholds = { warning: 70, critical: 90 }) => {
    if (value >= thresholds.critical) return 'bg-red-500';
    if (value >= thresholds.warning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getAlertBadge = (level) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive">严重</Badge>;
      case 'warning':
        return <Badge variant="secondary">警告</Badge>;
      case 'info':
        return <Badge variant="outline">信息</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>加载监控数据中...</p>
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
            <h1 className="text-2xl font-bold">设备监控</h1>
            <p className="text-muted-foreground">{device?.device_name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm">自动刷新</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`w-8 h-4 rounded-full ${autoRefresh ? 'bg-blue-500' : 'bg-gray-300'} relative transition-colors`}
            >
              <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${autoRefresh ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <Button onClick={loadMonitoringData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            手动刷新
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

      {/* 实时状态卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">CPU</span>
              </div>
              <span className={`text-sm font-bold ${getStatusColor(realtimeData?.cpu_usage || 0)}`}>
                {realtimeData?.cpu_usage || 0}%
              </span>
            </div>
            <Progress 
              value={realtimeData?.cpu_usage || 0} 
              className="mt-2"
              style={{ '--progress-foreground': getProgressColor(realtimeData?.cpu_usage || 0) }}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Memory className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">内存</span>
              </div>
              <span className={`text-sm font-bold ${getStatusColor(realtimeData?.memory_usage || 0)}`}>
                {realtimeData?.memory_usage || 0}%
              </span>
            </div>
            <Progress 
              value={realtimeData?.memory_usage || 0} 
              className="mt-2"
              style={{ '--progress-foreground': getProgressColor(realtimeData?.memory_usage || 0) }}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">存储</span>
              </div>
              <span className={`text-sm font-bold ${getStatusColor(realtimeData?.storage_usage || 0)}`}>
                {realtimeData?.storage_usage || 0}%
              </span>
            </div>
            <Progress 
              value={realtimeData?.storage_usage || 0} 
              className="mt-2"
              style={{ '--progress-foreground': getProgressColor(realtimeData?.storage_usage || 0) }}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">温度</span>
              </div>
              <span className={`text-sm font-bold ${getStatusColor(realtimeData?.temperature || 0, { warning: 60, critical: 80 })}`}>
                {realtimeData?.temperature || 0}°C
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              最后更新: {realtimeData?.timestamp ? formatTimestamp(realtimeData.timestamp) : '--'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 监控图表标签页 */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList>
          <TabsTrigger value="performance">性能监控</TabsTrigger>
          <TabsTrigger value="network">网络监控</TabsTrigger>
          <TabsTrigger value="alerts">告警信息</TabsTrigger>
          <TabsTrigger value="realtime">实时数据</TabsTrigger>
        </TabsList>
        
        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CPU使用率趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CPU使用率 (24小时)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                      fontSize={12}
                    />
                    <YAxis domain={[0, 100]} fontSize={12} />
                    <Tooltip 
                      labelFormatter={(value) => formatTimestamp(value)}
                      formatter={(value) => [`${value}%`, 'CPU使用率']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cpu" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 内存使用率趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">内存使用率 (24小时)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                      fontSize={12}
                    />
                    <YAxis domain={[0, 100]} fontSize={12} />
                    <Tooltip 
                      labelFormatter={(value) => formatTimestamp(value)}
                      formatter={(value) => [`${value}%`, '内存使用率']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="memory" 
                      stroke="#10b981" 
                      fill="#10b981"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 温度趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">温度变化 (24小时)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      labelFormatter={(value) => formatTimestamp(value)}
                      formatter={(value) => [`${value}°C`, '温度']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 网络流量 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">网络流量 (24小时)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      labelFormatter={(value) => formatTimestamp(value)}
                      formatter={(value, name) => [`${value} KB/s`, name === 'network_in' ? '下载' : '上传']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="network_in" 
                      stackId="1"
                      stroke="#8b5cf6" 
                      fill="#8b5cf6"
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="network_out" 
                      stackId="2"
                      stroke="#ec4899" 
                      fill="#ec4899"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="network">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 网络连接状态 */}
            <Card>
              <CardHeader>
                <CardTitle>网络连接状态</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">连接状态</span>
                  <Badge className="bg-green-500">
                    <Wifi className="h-3 w-3 mr-1" />
                    已连接
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IP地址</span>
                  <span className="font-mono text-sm">{realtimeData?.ip_address || '未知'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wi-Fi信号强度</span>
                  <span>{realtimeData?.wifi_signal ? `${realtimeData.wifi_signal} dBm` : '未知'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">下载速度</span>
                  <span>{realtimeData?.download_speed || 0} KB/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">上传速度</span>
                  <span>{realtimeData?.upload_speed || 0} KB/s</span>
                </div>
              </CardContent>
            </Card>

            {/* 连接统计 */}
            <Card>
              <CardHeader>
                <CardTitle>连接统计</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">总连接次数</span>
                  <span>{realtimeData?.total_connections || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">断线次数</span>
                  <span>{realtimeData?.disconnections || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">平均延迟</span>
                  <span>{realtimeData?.avg_latency || 0} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">数据传输量</span>
                  <span>{realtimeData?.total_data || 0} MB</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>告警信息</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">暂无告警信息</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{alert.title}</span>
                          <div className="flex items-center space-x-2">
                            {getAlertBadge(alert.level)}
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(alert.timestamp)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="realtime">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                实时监控数据
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 系统信息 */}
                <div className="space-y-3">
                  <h3 className="font-medium">系统信息</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">运行时间</span>
                      <span>{realtimeData?.uptime || '未知'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">负载均衡</span>
                      <span>{realtimeData?.load_average || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">进程数</span>
                      <span>{realtimeData?.process_count || 0}</span>
                    </div>
                  </div>
                </div>

                {/* 硬件状态 */}
                <div className="space-y-3">
                  <h3 className="font-medium">硬件状态</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">电源状态</span>
                      <span>{realtimeData?.power_status || '外部供电'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">风扇转速</span>
                      <span>{realtimeData?.fan_speed || 0} RPM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">电压</span>
                      <span>{realtimeData?.voltage || '0.0'} V</span>
                    </div>
                  </div>
                </div>

                {/* 服务状态 */}
                <div className="space-y-3">
                  <h3 className="font-medium">服务状态</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI引擎</span>
                      <Badge className="bg-green-500 text-xs">运行中</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">语音服务</span>
                      <Badge className="bg-green-500 text-xs">运行中</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">网络服务</span>
                      <Badge className="bg-green-500 text-xs">运行中</Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t">
                <div className="text-xs text-muted-foreground text-center">
                  数据更新时间: {realtimeData?.timestamp ? new Date(realtimeData.timestamp).toLocaleString('zh-CN') : '未知'}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DeviceMonitor;