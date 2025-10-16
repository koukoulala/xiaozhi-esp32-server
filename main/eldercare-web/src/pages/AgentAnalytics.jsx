import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  MessageSquare,
  Clock,
  Star,
  Heart,
  Zap,
  Brain,
  Target,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  AlertCircle,
  CheckCircle,
  Timer,
  Mic
} from 'lucide-react';
import ElderCareAPI from '@/services/api.js';

function AgentAnalytics() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  
  const [agent, setAgent] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d

  useEffect(() => {
    loadAnalytics();
  }, [agentId, dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 加载智能体基本信息
      const agentResponse = await ElderCareAPI.getAgentDetails(agentId);
      if (!agentResponse.success) {
        throw new Error('加载智能体信息失败');
      }
      setAgent(agentResponse.data);

      // 加载分析数据
      const analyticsResponse = await ElderCareAPI.getAgentAnalytics(agentId, dateRange);
      if (analyticsResponse.success) {
        setAnalytics(analyticsResponse.data);
      } else {
        // 修改：不再使用模拟数据，显示错误提示
        setError('暂无分析数据或API未实现');
        setAnalytics(null);
      }
    } catch (err) {
      setError(err.message);
      // 修改：不再使用模拟数据
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalytics = () => {
    // 生成模拟分析数据
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const dailyStats = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      dailyStats.push({
        date: date.toISOString().split('T')[0],
        conversations: Math.floor(Math.random() * 50) + 10,
        messages: Math.floor(Math.random() * 200) + 50,
        responseTime: Math.floor(Math.random() * 1000) + 500,
        satisfaction: Math.floor(Math.random() * 30) + 70,
        errors: Math.floor(Math.random() * 5),
        voiceCalls: Math.floor(Math.random() * 20) + 5
      });
    }

    return {
      overview: {
        totalConversations: dailyStats.reduce((sum, day) => sum + day.conversations, 0),
        totalMessages: dailyStats.reduce((sum, day) => sum + day.messages, 0),
        avgResponseTime: Math.round(dailyStats.reduce((sum, day) => sum + day.responseTime, 0) / dailyStats.length),
        satisfactionScore: Math.round(dailyStats.reduce((sum, day) => sum + day.satisfaction, 0) / dailyStats.length),
        errorRate: Math.round((dailyStats.reduce((sum, day) => sum + day.errors, 0) / dailyStats.reduce((sum, day) => sum + day.messages, 0)) * 100 * 100) / 100,
        activeUsers: Math.floor(Math.random() * 100) + 20,
        completionRate: 95.5,
        uptime: 99.8
      },
      dailyStats,
      topicDistribution: [
        { name: '健康咨询', value: 35, color: '#8884d8' },
        { name: '日常聊天', value: 25, color: '#82ca9d' },
        { name: '提醒服务', value: 15, color: '#ffc658' },
        { name: '紧急求助', value: 10, color: '#ff7c7c' },
        { name: '娱乐休闲', value: 10, color: '#8dd1e1' },
        { name: '其他', value: 5, color: '#d084d0' }
      ],
      satisfactionTrend: dailyStats.map(day => ({
        date: day.date,
        satisfaction: day.satisfaction,
        responseTime: day.responseTime
      })),
      errorAnalysis: [
        { type: 'API超时', count: 5, percentage: 45 },
        { type: '理解错误', count: 3, percentage: 27 },
        { type: '网络异常', count: 2, percentage: 18 },
        { type: '其他', count: 1, percentage: 10 }
      ],
      peakHours: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        conversations: Math.floor(Math.random() * 20) + (hour >= 8 && hour <= 20 ? 10 : 0)
      })),
      userEngagement: {
        newUsers: Math.floor(Math.random() * 20) + 5,
        returningUsers: Math.floor(Math.random() * 50) + 15,
        avgSessionDuration: Math.floor(Math.random() * 300) + 180, // seconds
        bounceRate: Math.floor(Math.random() * 20) + 10 // percentage
      },
      featureUsage: [
        { feature: '文字聊天', usage: 90, trend: 'up' },
        { feature: '语音通话', usage: 65, trend: 'up' },
        { feature: '健康提醒', usage: 45, trend: 'stable' },
        { feature: '紧急呼叫', usage: 15, trend: 'down' },
        { feature: '天气查询', usage: 35, trend: 'up' }
      ]
    };
  };

  const exportAnalytics = async () => {
    try {
      const exportData = {
        agent: agent,
        analytics: analytics,
        dateRange: dateRange,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${agent?.agent_code || 'agent'}_analytics_${dateRange}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>加载分析数据...</p>
        </div>
      </div>
    );
  }

  if (!agent || !analytics) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">数据加载失败</h2>
        <p className="text-muted-foreground mb-4">无法加载智能体分析数据</p>
        <Button onClick={() => navigate('/agents')}>返回列表</Button>
      </div>
    );
  }

  const { overview, dailyStats, topicDistribution, satisfactionTrend, errorAnalysis, peakHours, userEngagement, featureUsage } = analytics;

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate(`/agents/${agentId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回详情
          </Button>
          <div>
            <h1 className="text-2xl font-bold">数据分析 - {agent.agent_name}</h1>
            <p className="text-muted-foreground">智能体使用情况和性能指标</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            {['7d', '30d', '90d'].map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange(range)}
              >
                {range === '7d' ? '7天' : range === '30d' ? '30天' : '90天'}
              </Button>
            ))}
          </div>
          <Button onClick={exportAnalytics} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出数据
          </Button>
        </div>
      </div>

      {/* 概览指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总对话数</p>
                <p className="text-2xl font-bold">{overview.totalConversations}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-500">+12%</span>
                </div>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">活跃用户</p>
                <p className="text-2xl font-bold">{overview.activeUsers}</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-500">+8%</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">平均响应时间</p>
                <p className="text-2xl font-bold">{overview.avgResponseTime}ms</p>
                <div className="flex items-center mt-1">
                  <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-500">-5%</span>
                </div>
              </div>
              <Timer className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">满意度评分</p>
                <p className="text-2xl font-bold">{overview.satisfactionScore}/100</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-500">+3%</span>
                </div>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细分析 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="usage">使用情况</TabsTrigger>
          <TabsTrigger value="performance">性能指标</TabsTrigger>
          <TabsTrigger value="topics">话题分析</TabsTrigger>
          <TabsTrigger value="errors">错误分析</TabsTrigger>
        </TabsList>

        {/* 概览 */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 对话趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  对话趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).getMonth() + 1 + '/' + new Date(value).getDate()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="conversations" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="对话数"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="messages" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="消息数"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 用户参与度 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  用户参与度
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{userEngagement.newUsers}</p>
                    <p className="text-sm text-muted-foreground">新用户</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{userEngagement.returningUsers}</p>
                    <p className="text-sm text-muted-foreground">回访用户</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">平均会话时长</span>
                    <Badge variant="outline">
                      {Math.floor(userEngagement.avgSessionDuration / 60)}:{(userEngagement.avgSessionDuration % 60).toString().padStart(2, '0')}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">跳出率</span>
                      <Badge variant={userEngagement.bounceRate < 30 ? "default" : "destructive"}>
                        {userEngagement.bounceRate}%
                      </Badge>
                    </div>
                    <Progress value={100 - userEngagement.bounceRate} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 高峰时段 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  使用高峰时段
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={peakHours}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tickFormatter={(value) => `${value}:00`} />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => `${value}:00 - ${value + 1}:00`}
                      formatter={(value) => [value, '对话数']}
                    />
                    <Bar dataKey="conversations" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 性能指标 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  关键性能指标
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">完成率</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={overview.completionRate} className="w-20" />
                      <Badge>{overview.completionRate}%</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">运行时间</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={overview.uptime} className="w-20" />
                      <Badge>{overview.uptime}%</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">错误率</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={100 - overview.errorRate * 10} className="w-20" />
                      <Badge variant={overview.errorRate < 5 ? "default" : "destructive"}>
                        {overview.errorRate}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 使用情况 */}
        <TabsContent value="usage">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 功能使用情况 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  功能使用情况
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {featureUsage.map((feature, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{feature.feature}</span>
                      <div className="flex items-center space-x-2">
                        {feature.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : feature.trend === 'down' ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <div className="h-4 w-4" />
                        )}
                        <Badge>{feature.usage}%</Badge>
                      </div>
                    </div>
                    <Progress value={feature.usage} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 消息类型分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  消息类型分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <MessageSquare className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <p className="text-lg font-semibold">{Math.round(overview.totalMessages * 0.75)}</p>
                    <p className="text-xs text-muted-foreground">文字消息</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <Mic className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <p className="text-lg font-semibold">{Math.round(overview.totalMessages * 0.25)}</p>
                    <p className="text-xs text-muted-foreground">语音消息</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).getMonth() + 1 + '/' + new Date(value).getDate()}
                    />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="messages" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="voiceCalls" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 性能指标 */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 响应时间趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Timer className="h-5 w-5 mr-2" />
                  响应时间趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={satisfactionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).getMonth() + 1 + '/' + new Date(value).getDate()}
                    />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#ff7c7c" 
                      strokeWidth={2}
                      name="响应时间(ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 满意度趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  满意度趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={satisfactionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).getMonth() + 1 + '/' + new Date(value).getDate()}
                    />
                    <YAxis domain={[60, 100]} />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="satisfaction" 
                      stroke="#ffc658" 
                      fill="#ffc658" 
                      fillOpacity={0.3}
                      name="满意度评分"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 话题分析 */}
        <TabsContent value="topics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 话题分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2" />
                  话题分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topicDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {topicDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 话题详情 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  话题详情
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {topicDistribution.map((topic, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: topic.color }}
                        />
                        <span className="text-sm font-medium">{topic.name}</span>
                      </div>
                      <Badge>{topic.value}%</Badge>
                    </div>
                    <Progress value={topic.value} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 错误分析 */}
        <TabsContent value="errors">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 错误类型分布 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  错误类型分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {errorAnalysis.map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-red-700">{error.type}</p>
                        <p className="text-sm text-red-600">发生 {error.count} 次</p>
                      </div>
                      <Badge variant="destructive">{error.percentage}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 错误趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  错误趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).getMonth() + 1 + '/' + new Date(value).getDate()}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="errors" fill="#ff7c7c" name="错误数量" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AgentAnalytics;