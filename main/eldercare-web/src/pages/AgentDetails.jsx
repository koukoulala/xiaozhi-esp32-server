import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { 
  ArrowLeft,
  Edit,
  TestTube,
  BarChart3,
  Settings,
  PlayCircle,
  PauseCircle,
  Trash2,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Bot,
  Brain,
  Mic,
  MessageSquare,
  Clock,
  Star,
  Users,
  Activity,
  Zap,
  Heart,
  AlertTriangle,
  CheckCircle,
  Target,
  Shield,
  Globe
} from 'lucide-react';
import ElderCareAPI from '@/services/api.js';

function AgentDetails() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  
  const [agent, setAgent] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    loadAgentDetails();
  }, [agentId]);

  const loadAgentDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const [agentResponse, statsResponse] = await Promise.all([
        ElderCareAPI.getAgentDetails(agentId),
        ElderCareAPI.getAgentStats(agentId)
      ]);

      if (agentResponse.success) {
        setAgent(agentResponse.data);
      } else {
        throw new Error(agentResponse.message || '加载智能体详情失败');
      }

      if (statsResponse.success) {
        setStats(statsResponse.data);
      } else {
        // 使用模拟数据
        setStats(generateMockStats());
      }
    } catch (err) {
      setError(err.message);
      // 出错时也可以生成一些模拟数据用于展示
      if (!agent) {
        setAgent(generateMockAgent());
      }
      if (!stats) {
        setStats(generateMockStats());
      }
    } finally {
      setLoading(false);
    }
  };

  const generateMockAgent = () => ({
    id: agentId,
    agent_name: '小智助手',
    agent_code: 'xiaozhi_001',
    description: '专为老年人设计的智能助手，提供健康咨询、日常聊天和紧急求助功能。',
    avatar_url: '',
    system_prompt: '你是一个专业、耐心、温暖的老年人智能助手。你需要用简单易懂的语言与用户交流，关心用户的健康和日常生活。',
    persona_traits: '耐心、温暖、专业、细心',
    interaction_style: 'friendly',
    response_length: 'moderate',
    emotional_tone: 'warm',
    llm_model_id: 'gpt-3.5-turbo',
    tts_voice_id: '1',
    asr_model_id: 'whisper-1',
    temperature: 0.7,
    max_tokens: 1000,
    memory_enabled: true,
    context_window: 4000,
    response_delay: 500,
    capabilities: {
      chat: true,
      voice_call: true,
      health_monitoring: true,
      reminder: true,
      weather: true,
      news: false
    },
    content_filter: true,
    safe_mode: true,
    privacy_mode: false,
    is_active: true,
    is_default: true,
    is_public: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 1
  });

  const generateMockStats = () => ({
    totalConversations: 245,
    totalMessages: 1530,
    activeUsers: 48,
    avgResponseTime: 750,
    satisfactionScore: 87,
    errorRate: 2.3,
    uptime: 99.5,
    lastActivity: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15分钟前
    usageToday: {
      conversations: 23,
      messages: 156,
      users: 12
    },
    recentActivity: [
      { time: '2分钟前', action: '与用户张奶奶对话', type: 'chat' },
      { time: '8分钟前', action: '健康提醒服务', type: 'reminder' },
      { time: '15分钟前', action: '语音通话', type: 'voice' },
      { time: '23分钟前', action: '天气查询', type: 'service' },
      { time: '31分钟前', action: '与用户李爷爷对话', type: 'chat' }
    ]
  });

  const handleAction = async (action) => {
    setActionLoading(prev => ({ ...prev, [action]: true }));
    
    try {
      let response;
      
      switch (action) {
        case 'toggle':
          response = await ElderCareAPI.toggleAgentStatus(agentId, !agent.is_active);
          if (response.success) {
            setAgent(prev => ({ ...prev, is_active: !prev.is_active }));
          }
          break;
        case 'delete':
          if (window.confirm('确定要删除这个智能体吗？此操作不可逆。')) {
            response = await ElderCareAPI.deleteAgent(agentId);
            if (response.success) {
              navigate('/agents');
              return;
            }
          } else {
            return;
          }
          break;
        case 'duplicate':
          response = await ElderCareAPI.duplicateAgent(agentId);
          if (response.success) {
            navigate(`/agents/${response.data.id}/edit`);
            return;
          }
          break;
        case 'export':
          const exportData = {
            ...agent,
            exported_at: new Date().toISOString(),
            version: '1.0'
          };
          const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${agent.agent_code}_export.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          return;
        default:
          return;
      }
      
      if (!response.success) {
        throw new Error(response.message || '操作失败');
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [action]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>加载智能体详情...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">智能体未找到</h2>
        <p className="text-muted-foreground mb-4">请检查智能体ID是否正确</p>
        <Button onClick={() => navigate('/agents')}>返回列表</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/agents')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={agent.avatar_url} />
              <AvatarFallback>
                <Bot className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <h1 className="text-2xl font-bold">{agent.agent_name}</h1>
                <Badge variant={agent.is_active ? "default" : "secondary"}>
                  {agent.is_active ? "运行中" : "已停用"}
                </Badge>
                {agent.is_default && (
                  <Badge variant="outline">默认</Badge>
                )}
                {agent.is_public && (
                  <Badge variant="outline">
                    <Globe className="h-3 w-3 mr-1" />
                    公开
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-1">{agent.description}</p>
              <p className="text-sm text-muted-foreground">
                智能体编码: {agent.agent_code} | 创建于 {new Date(agent.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            onClick={() => navigate(`/agents/${agentId}/test`)}
            variant="outline"
          >
            <TestTube className="h-4 w-4 mr-2" />
            测试
          </Button>
          <Button
            onClick={() => navigate(`/agents/${agentId}/analytics`)}
            variant="outline"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            分析
          </Button>
          <Button
            onClick={() => navigate(`/agents/${agentId}/edit`)}
            variant="outline"
          >
            <Edit className="h-4 w-4 mr-2" />
            编辑
          </Button>
          <Button
            onClick={() => handleAction('toggle')}
            disabled={actionLoading.toggle}
            variant={agent.is_active ? "destructive" : "default"}
          >
            {actionLoading.toggle ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : agent.is_active ? (
              <PauseCircle className="h-4 w-4 mr-2" />
            ) : (
              <PlayCircle className="h-4 w-4 mr-2" />
            )}
            {agent.is_active ? '停用' : '启用'}
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 快速统计 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalConversations}</p>
                  <p className="text-xs text-muted-foreground">总对话数</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.activeUsers}</p>
                  <p className="text-xs text-muted-foreground">活跃用户</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.avgResponseTime}ms</p>
                  <p className="text-xs text-muted-foreground">响应时间</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.satisfactionScore}</p>
                  <p className="text-xs text-muted-foreground">满意度</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.uptime}%</p>
                  <p className="text-xs text-muted-foreground">运行时间</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.errorRate}%</p>
                  <p className="text-xs text-muted-foreground">错误率</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 详细信息 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="configuration">配置</TabsTrigger>
          <TabsTrigger value="capabilities">功能</TabsTrigger>
          <TabsTrigger value="activity">活动</TabsTrigger>
          <TabsTrigger value="management">管理</TabsTrigger>
        </TabsList>

        {/* 概览 */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 基本信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="h-5 w-5 mr-2" />
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">名称:</span>
                  <span className="font-medium">{agent.agent_name}</span>
                  
                  <span className="text-muted-foreground">编码:</span>
                  <span className="font-medium">{agent.agent_code}</span>
                  
                  <span className="text-muted-foreground">交互风格:</span>
                  <span className="font-medium">{agent.interaction_style}</span>
                  
                  <span className="text-muted-foreground">情感基调:</span>
                  <span className="font-medium">{agent.emotional_tone}</span>
                  
                  <span className="text-muted-foreground">人格特征:</span>
                  <span className="font-medium">{agent.persona_traits}</span>
                </div>
              </CardContent>
            </Card>

            {/* 今日使用情况 */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    今日使用情况
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">对话数</span>
                      <Badge>{stats.usageToday.conversations}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">消息数</span>
                      <Badge variant="outline">{stats.usageToday.messages}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">活跃用户</span>
                      <Badge variant="outline">{stats.usageToday.users}</Badge>
                    </div>
                  </div>
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      最后活动: {new Date(stats.lastActivity).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 状态指示器 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  系统状态
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">运行状态</span>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${agent.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="text-sm">{agent.is_active ? '运行中' : '已停用'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">内容过滤</span>
                    <CheckCircle className={`h-4 w-4 ${agent.content_filter ? 'text-green-500' : 'text-gray-400'}`} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">安全模式</span>
                    <CheckCircle className={`h-4 w-4 ${agent.safe_mode ? 'text-green-500' : 'text-gray-400'}`} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">隐私模式</span>
                    <CheckCircle className={`h-4 w-4 ${agent.privacy_mode ? 'text-green-500' : 'text-gray-400'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 配置 */}
        <TabsContent value="configuration">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 模型配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  模型配置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">语言模型:</span>
                  <span className="font-medium">{agent.llm_model_id}</span>
                  
                  <span className="text-muted-foreground">TTS语音:</span>
                  <span className="font-medium">{agent.tts_voice_id}</span>
                  
                  <span className="text-muted-foreground">ASR模型:</span>
                  <span className="font-medium">{agent.asr_model_id}</span>
                </div>
              </CardContent>
            </Card>

            {/* 参数配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  参数配置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">创造性 (Temperature)</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={agent.temperature * 100} className="w-16" />
                      <Badge variant="outline">{agent.temperature}</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">最大回复长度</span>
                    <Badge variant="outline">{agent.max_tokens}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">上下文窗口</span>
                    <Badge variant="outline">{agent.context_window}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">响应延迟</span>
                    <Badge variant="outline">{agent.response_delay}ms</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">记忆功能</span>
                    <CheckCircle className={`h-4 w-4 ${agent.memory_enabled ? 'text-green-500' : 'text-gray-400'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 功能 */}
        <TabsContent value="capabilities">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                功能能力
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(agent.capabilities || {}).map(([capability, enabled]) => (
                  <div key={capability} className={`p-4 rounded-lg border-2 ${
                    enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      {capability === 'chat' && <MessageSquare className="h-5 w-5" />}
                      {capability === 'voice_call' && <Mic className="h-5 w-5" />}
                      {capability === 'health_monitoring' && <Heart className="h-5 w-5" />}
                      {capability === 'reminder' && <Clock className="h-5 w-5" />}
                      {capability === 'weather' && <Activity className="h-5 w-5" />}
                      {capability === 'news' && <Globe className="h-5 w-5" />}
                      <span className={enabled ? 'text-green-600' : 'text-gray-500'}>
                        {enabled ? '✓' : '✗'}
                      </span>
                    </div>
                    <p className="text-sm font-medium capitalize">
                      {capability.replace('_', ' ')}
                    </p>
                    <Badge variant={enabled ? "default" : "secondary"} className="mt-1">
                      {enabled ? '已启用' : '已禁用'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 活动 */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                最近活动
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats && stats.recentActivity ? (
                <div className="space-y-3">
                  {stats.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.type === 'chat' ? 'bg-blue-100 text-blue-600' :
                        activity.type === 'voice' ? 'bg-green-100 text-green-600' :
                        activity.type === 'reminder' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {activity.type === 'chat' && <MessageSquare className="h-4 w-4" />}
                        {activity.type === 'voice' && <Mic className="h-4 w-4" />}
                        {activity.type === 'reminder' && <Clock className="h-4 w-4" />}
                        {activity.type === 'service' && <Settings className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">暂无活动记录</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 管理 */}
        <TabsContent value="management">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 操作 */}
            <Card>
              <CardHeader>
                <CardTitle>操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => handleAction('duplicate')}
                  disabled={actionLoading.duplicate}
                  className="w-full justify-start"
                  variant="outline"
                >
                  {actionLoading.duplicate ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  复制智能体
                </Button>
                
                <Button
                  onClick={() => handleAction('export')}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  导出配置
                </Button>
                
                <Button
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  导入配置
                </Button>
              </CardContent>
            </Card>

            {/* 危险操作 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">危险操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    以下操作具有风险，请谨慎执行
                  </AlertDescription>
                </Alert>
                
                <Button
                  onClick={() => handleAction('delete')}
                  disabled={actionLoading.delete}
                  className="w-full justify-start"
                  variant="destructive"
                >
                  {actionLoading.delete ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  删除智能体
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AgentDetails;