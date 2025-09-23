import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { 
  Plus,
  Bot,
  Brain,
  Mic,
  MessageSquare,
  Settings,
  Trash2,
  Play,
  Pause,
  Edit,
  Users,
  BarChart3,
  Clock,
  RefreshCw,
  AlertTriangle,
  Star,
  Search,
  Filter
} from 'lucide-react';
import ElderCareAPI from '@/services/api.js';

function EnhancedAgentManagement({ onNavigate = () => {} }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  const [sortBy, setSortBy] = useState('created_at'); // name, created_at, usage
  
  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = ElderCareAPI.getCurrentUser();
      const response = await ElderCareAPI.getUserAgents(currentUser?.id || 1);
      
      if (response.success && response.data) {
        setAgents(response.data);
      } else {
        setError('加载智能体列表失败');
      }
    } catch (err) {
      setError('加载智能体失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAgent = async (agentId, currentStatus) => {
    try {
      const response = await ElderCareAPI.toggleAgentStatus(agentId, !currentStatus);
      if (response.success) {
        setSuccess(`智能体${currentStatus ? '已停用' : '已启用'}`);
        loadAgents();
      } else {
        setError('操作失败');
      }
    } catch (err) {
      setError('操作失败: ' + err.message);
    }
  };

  const handleDeleteAgent = async (agentId, agentName) => {
    if (!confirm(`确定要删除智能体"${agentName}"吗？此操作不可撤销。`)) {
      return;
    }
    
    try {
      const response = await ElderCareAPI.deleteAgent(agentId);
      if (response.success) {
        setSuccess(`智能体"${agentName}"删除成功`);
        loadAgents();
      } else {
        setError('删除失败');
      }
    } catch (err) {
      setError('删除失败: ' + err.message);
    }
  };

  const handleTestAgent = async (agentId) => {
    navigate(`/agents/${agentId}/test`);
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <Badge className="bg-green-500"><Play className="h-3 w-3 mr-1" />活跃</Badge>
    ) : (
      <Badge variant="secondary"><Pause className="h-3 w-3 mr-1" />停用</Badge>
    );
  };

  const getInteractionStyleBadge = (style) => {
    const styles = {
      friendly: { label: '友善', color: 'bg-blue-500' },
      professional: { label: '专业', color: 'bg-purple-500' },
      casual: { label: '随和', color: 'bg-green-500' },
      formal: { label: '正式', color: 'bg-gray-500' }
    };
    const styleInfo = styles[style] || styles.friendly;
    return <Badge className={styleInfo.color}>{styleInfo.label}</Badge>;
  };

  // 过滤和排序逻辑
  const filteredAgents = agents
    .filter(agent => {
      const matchesSearch = agent.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           agent.agent_code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && agent.is_active) ||
                           (filterStatus === 'inactive' && !agent.is_active);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.agent_name.localeCompare(b.agent_name);
        case 'usage':
          return (b.usage_count || 0) - (a.usage_count || 0);
        case 'created_at':
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>加载智能体列表中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部区域 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI智能体管理</h2>
          <p className="text-muted-foreground">创建和管理您的AI智能助手</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => navigate('/agents/create')} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            创建智能体
          </Button>
          <Button onClick={() => navigate('/agents/templates')} variant="outline">
            <Bot className="h-4 w-4 mr-2" />
            模板库
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
          <Bot className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* 搜索和过滤器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索智能体名称或编码..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">所有状态</option>
                <option value="active">活跃</option>
                <option value="inactive">停用</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="created_at">创建时间</option>
                <option value="name">名称</option>
                <option value="usage">使用频率</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 智能体概览统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Bot className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">总智能体</p>
                <p className="text-2xl font-bold">{agents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">活跃中</p>
                <p className="text-2xl font-bold">{agents.filter(a => a.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">今日对话</p>
                <p className="text-2xl font-bold">{agents.reduce((sum, a) => sum + (a.daily_conversations || 0), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">平均评分</p>
                <p className="text-2xl font-bold">{agents.length > 0 ? (agents.reduce((sum, a) => sum + (a.rating || 4.5), 0) / agents.length).toFixed(1) : '0.0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 智能体列表 */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList>
          <TabsTrigger value="grid">卡片视图</TabsTrigger>
          <TabsTrigger value="list">列表视图</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grid">
          {filteredAgents.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无智能体</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterStatus !== 'all' ? '没有找到符合条件的智能体' : '开始创建您的第一个AI智能助手'}
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <Button onClick={() => navigate('/agents/create')} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  创建智能体
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent) => (
                <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <Bot className="h-5 w-5 text-blue-500" />
                        <div>
                          <CardTitle className="text-base">{agent.agent_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">@{agent.agent_code}</p>
                        </div>
                      </div>
                      {getStatusBadge(agent.is_active)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 智能体描述 */}
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {agent.system_prompt || '暂无描述'}
                    </div>
                    
                    {/* 特性标签 */}
                    <div className="flex flex-wrap gap-2">
                      {getInteractionStyleBadge(agent.interaction_style)}
                      <Badge variant="outline">
                        <Brain className="h-3 w-3 mr-1" />
                        {agent.llm_model_name || 'GPT-3.5'}
                      </Badge>
                      <Badge variant="outline">
                        <Mic className="h-3 w-3 mr-1" />
                        {agent.tts_voice_name || '默认'}
                      </Badge>
                    </div>
                    
                    {/* 使用统计 */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">对话次数</p>
                        <p className="font-semibold">{agent.total_conversations || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">满意度</p>
                        <div className="flex items-center">
                          <Star className="h-3 w-3 text-yellow-500 mr-1" />
                          <span className="font-semibold">{agent.rating || 4.5}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 性能指标 */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>响应速度</span>
                        <span>{agent.response_speed || 85}%</span>
                      </div>
                      <Progress value={agent.response_speed || 85} />
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className="flex space-x-2 pt-2">
                      <Button size="sm" onClick={() => handleTestAgent(agent.id)}>
                        <MessageSquare className="h-3 w-3 mr-1" />
                        测试
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/agents/${agent.id}`)}>
                        <Settings className="h-3 w-3 mr-1" />
                        设置
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/agents/${agent.id}/analytics`)}>
                        <BarChart3 className="h-3 w-3 mr-1" />
                        分析
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleAgent(agent.id, agent.is_active)}
                      >
                        {agent.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteAgent(agent.id, agent.agent_name)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>智能体列表</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAgents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">没有找到智能体</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">名称</th>
                        <th className="text-left p-2">状态</th>
                        <th className="text-left p-2">交互风格</th>
                        <th className="text-left p-2">对话次数</th>
                        <th className="text-left p-2">满意度</th>
                        <th className="text-left p-2">创建时间</th>
                        <th className="text-left p-2">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAgents.map((agent) => (
                        <tr key={agent.id} className="border-b hover:bg-gray-50">
                          <td className="p-2">
                            <div className="flex items-center space-x-2">
                              <Bot className="h-4 w-4 text-blue-500" />
                              <div>
                                <p className="font-medium">{agent.agent_name}</p>
                                <p className="text-xs text-muted-foreground">@{agent.agent_code}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-2">{getStatusBadge(agent.is_active)}</td>
                          <td className="p-2">{getInteractionStyleBadge(agent.interaction_style)}</td>
                          <td className="p-2">{agent.total_conversations || 0}</td>
                          <td className="p-2">
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-500 mr-1" />
                              <span>{agent.rating || 4.5}</span>
                            </div>
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {new Date(agent.created_at).toLocaleDateString('zh-CN')}
                          </td>
                          <td className="p-2">
                            <div className="flex space-x-1">
                              <Button size="sm" variant="ghost" onClick={() => handleTestAgent(agent.id)}>
                                <MessageSquare className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/agents/${agent.id}`)}>
                                <Settings className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => navigate(`/agents/${agent.id}/analytics`)}>
                                <BarChart3 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteAgent(agent.id, agent.agent_name)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 底部操作区 */}
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={loadAgents}>
          <RefreshCw className="h-4 w-4 mr-2" />
          刷新列表
        </Button>
        <Button onClick={() => navigate('/agents/import')} variant="outline">
          <Users className="h-4 w-4 mr-2" />
          导入智能体
        </Button>
      </div>
    </div>
  );
}

export default EnhancedAgentManagement;