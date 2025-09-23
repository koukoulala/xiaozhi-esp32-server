import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { 
  ArrowLeft,
  Save,
  RefreshCw,
  Bot,
  Brain,
  Mic,
  MessageSquare,
  User,
  Zap,
  Heart,
  Smile,
  Settings,
  TestTube,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  Wand2,
  Target,
  Clock,
  Volume2
} from 'lucide-react';
import ElderCareAPI from '@/services/api.js';

function AgentCreator() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(agentId);
  
  const [agent, setAgent] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [voices, setVoices] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');

  const [formData, setFormData] = useState({
    // 基本信息
    agent_name: '',
    agent_code: '',
    description: '',
    avatar_url: '',
    
    // 人格设定
    system_prompt: '',
    persona_traits: '',
    interaction_style: 'friendly',
    response_length: 'moderate',
    emotional_tone: 'warm',
    
    // 技术配置
    llm_model_id: 'gpt-3.5-turbo',
    tts_voice_id: '1',
    asr_model_id: 'whisper-1',
    
    // 高级设置
    temperature: 0.7,
    max_tokens: 1000,
    memory_enabled: true,
    context_window: 4000,
    response_delay: 500,
    
    // 能力配置
    capabilities: {
      chat: true,
      voice_call: true,
      health_monitoring: false,
      reminder: true,
      weather: true,
      news: false
    },
    
    // 安全设置
    content_filter: true,
    safe_mode: true,
    privacy_mode: false,
    
    // 状态设置
    is_active: true,
    is_default: false,
    is_public: false
  });

  useEffect(() => {
    loadInitialData();
  }, [agentId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 加载模板
      const templatesResponse = await ElderCareAPI.getAgentTemplates();
      if (templatesResponse.success) {
        setTemplates(templatesResponse.data || []);
      }

      // 加载语音列表
      const voicesResponse = await ElderCareAPI.getVoiceList();
      if (voicesResponse.success) {
        setVoices(voicesResponse.data || []);
      }

      // 加载模型列表
      const modelsResponse = await ElderCareAPI.getModelList();
      if (modelsResponse.success) {
        setModels(modelsResponse.data || []);
      }

      // 如果是编辑模式，加载智能体数据
      if (isEditing) {
        const agentResponse = await ElderCareAPI.getAgentDetails(agentId);
        if (agentResponse.success) {
          const agentData = agentResponse.data;
          setAgent(agentData);
          setFormData({
            ...formData,
            ...agentData,
            capabilities: agentData.capabilities || formData.capabilities
          });
        } else {
          setError('加载智能体数据失败');
        }
      }

    } catch (err) {
      setError('加载数据失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCapabilityChange = (capability, enabled) => {
    setFormData(prev => ({
      ...prev,
      capabilities: {
        ...prev.capabilities,
        [capability]: enabled
      }
    }));
  };

  const applyTemplate = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        system_prompt: template.system_prompt,
        persona_traits: template.persona_traits,
        interaction_style: template.interaction_style,
        emotional_tone: template.emotional_tone,
        agent_name: prev.agent_name || template.name
      }));
      setSuccess('模板应用成功');
    }
  };

  const generateAgentCode = () => {
    const name = formData.agent_name.toLowerCase().replace(/\s+/g, '');
    const timestamp = Date.now().toString().slice(-4);
    const code = `${name}_${timestamp}`;
    handleInputChange('agent_code', code);
  };

  const testAgent = async () => {
    if (!formData.agent_name || !formData.system_prompt) {
      setError('请先填写基本信息和系统提示词');
      return;
    }

    setTesting(true);
    try {
      const testResponse = await ElderCareAPI.testAgentConfig({
        ...formData,
        test_message: '你好，请介绍一下自己'
      });
      
      if (testResponse.success) {
        setSuccess('测试成功！智能体响应正常。');
      } else {
        setError('测试失败: ' + (testResponse.message || '未知错误'));
      }
    } catch (err) {
      setError('测试失败: ' + err.message);
    } finally {
      setTesting(false);
    }
  };

  const saveAgent = async () => {
    // 验证必填字段
    if (!formData.agent_name.trim()) {
      setError('请填写智能体名称');
      setActiveTab('basic');
      return;
    }
    
    if (!formData.system_prompt.trim()) {
      setError('请填写系统提示词');
      setActiveTab('persona');
      return;
    }

    setSaving(true);
    try {
      setError(null);
      setSuccess(null);

      const currentUser = ElderCareAPI.getCurrentUser();
      const agentData = {
        ...formData,
        userId: currentUser?.id || 1
      };

      let response;
      if (isEditing) {
        response = await ElderCareAPI.updateAgent(agentId, agentData);
      } else {
        response = await ElderCareAPI.createAgent(agentData);
      }

      if (response.success) {
        setSuccess(`智能体${isEditing ? '更新' : '创建'}成功！`);
        setTimeout(() => {
          navigate('/agents');
        }, 2000);
      } else {
        setError(response.message || `${isEditing ? '更新' : '创建'}失败`);
      }
    } catch (err) {
      setError(`${isEditing ? '更新' : '创建'}失败: ` + err.message);
    } finally {
      setSaving(false);
    }
  };

  const exportAgent = async () => {
    try {
      const exportData = {
        ...formData,
        exported_at: new Date().toISOString(),
        version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${formData.agent_code || 'agent'}_config.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccess('配置导出成功');
    } catch (err) {
      setError('导出失败: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/agents')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? `编辑智能体 - ${agent?.agent_name}` : '创建新智能体'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? '修改智能体的配置和行为' : '配置您的AI智能助手'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={testAgent} variant="outline" disabled={testing}>
            {testing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                测试中...
              </>
            ) : (
              <>
                <TestTube className="h-4 w-4 mr-2" />
                测试配置
              </>
            )}
          </Button>
          <Button onClick={exportAgent} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            导出配置
          </Button>
          <Button onClick={saveAgent} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? '更新智能体' : '创建智能体'}
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">基本信息</TabsTrigger>
          <TabsTrigger value="persona">人格设定</TabsTrigger>
          <TabsTrigger value="technical">技术配置</TabsTrigger>
          <TabsTrigger value="capabilities">能力设置</TabsTrigger>
          <TabsTrigger value="advanced">高级选项</TabsTrigger>
          <TabsTrigger value="preview">预览测试</TabsTrigger>
        </TabsList>
        
        {/* 基本信息 */}
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                基本信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agent_name">智能体名称 *</Label>
                  <Input
                    id="agent_name"
                    placeholder="请输入智能体名称"
                    value={formData.agent_name}
                    onChange={(e) => handleInputChange('agent_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agent_code">智能体编码</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="agent_code"
                      placeholder="自动生成或手动输入"
                      value={formData.agent_code}
                      onChange={(e) => handleInputChange('agent_code', e.target.value)}
                    />
                    <Button onClick={generateAgentCode} variant="outline">
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  placeholder="简要描述智能体的用途和特点"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="avatar_url">头像URL</Label>
                <Input
                  id="avatar_url"
                  placeholder="智能体头像图片链接（可选）"
                  value={formData.avatar_url}
                  onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active">启用状态</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_default"
                    checked={formData.is_default}
                    onCheckedChange={(checked) => handleInputChange('is_default', checked)}
                  />
                  <Label htmlFor="is_default">设为默认</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) => handleInputChange('is_public', checked)}
                  />
                  <Label htmlFor="is_public">公开共享</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 人格设定 */}
        <TabsContent value="persona">
          <div className="space-y-6">
            {/* 模板选择 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wand2 className="h-5 w-5 mr-2" />
                  快速模板
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {templates.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      onClick={() => applyTemplate(template.id)}
                      className="h-auto p-4 flex flex-col items-center space-y-2"
                    >
                      <div className="text-2xl">{template.emoji}</div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-muted-foreground text-center">
                        {template.description}
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 人格配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  人格设定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="system_prompt">系统提示词 *</Label>
                  <Textarea
                    id="system_prompt"
                    placeholder="定义智能体的角色、性格和行为方式..."
                    value={formData.system_prompt}
                    onChange={(e) => handleInputChange('system_prompt', e.target.value)}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    这是智能体的核心人格设定，决定了它如何思考和回应。
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="persona_traits">人格特征</Label>
                  <Input
                    id="persona_traits"
                    placeholder="如：热情、耐心、幽默、专业"
                    value={formData.persona_traits}
                    onChange={(e) => handleInputChange('persona_traits', e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>交互风格</Label>
                    <Select value={formData.interaction_style} onValueChange={(value) => handleInputChange('interaction_style', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">友善亲切</SelectItem>
                        <SelectItem value="professional">专业严谨</SelectItem>
                        <SelectItem value="casual">轻松随和</SelectItem>
                        <SelectItem value="formal">正式庄重</SelectItem>
                        <SelectItem value="humorous">幽默风趣</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>回复长度</Label>
                    <Select value={formData.response_length} onValueChange={(value) => handleInputChange('response_length', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="brief">简洁</SelectItem>
                        <SelectItem value="moderate">适中</SelectItem>
                        <SelectItem value="detailed">详细</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>情感基调</Label>
                    <Select value={formData.emotional_tone} onValueChange={(value) => handleInputChange('emotional_tone', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warm">温暖</SelectItem>
                        <SelectItem value="neutral">中性</SelectItem>
                        <SelectItem value="energetic">活力</SelectItem>
                        <SelectItem value="calm">平和</SelectItem>
                        <SelectItem value="encouraging">鼓励</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* 技术配置 */}
        <TabsContent value="technical">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                技术配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>语言模型</Label>
                  <Select value={formData.llm_model_id} onValueChange={(value) => handleInputChange('llm_model_id', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {models.filter(m => m.type === 'llm').map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>TTS语音</Label>
                  <Select value={formData.tts_voice_id} onValueChange={(value) => handleInputChange('tts_voice_id', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name} ({voice.language})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>ASR模型</Label>
                  <Select value={formData.asr_model_id} onValueChange={(value) => handleInputChange('asr_model_id', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {models.filter(m => m.type === 'asr').map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>创造性 (Temperature): {formData.temperature}</Label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    较高值会使回复更有创意，较低值更加一致
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>最大回复长度: {formData.max_tokens}</Label>
                  <input
                    type="range"
                    min="100"
                    max="4000"
                    step="100"
                    value={formData.max_tokens}
                    onChange={(e) => handleInputChange('max_tokens', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    控制单次回复的最大长度
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>上下文窗口: {formData.context_window}</Label>
                  <input
                    type="range"
                    min="1000"
                    max="8000"
                    step="500"
                    value={formData.context_window}
                    onChange={(e) => handleInputChange('context_window', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>响应延迟 (ms): {formData.response_delay}</Label>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="100"
                    value={formData.response_delay}
                    onChange={(e) => handleInputChange('response_delay', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="memory_enabled"
                  checked={formData.memory_enabled}
                  onCheckedChange={(checked) => handleInputChange('memory_enabled', checked)}
                />
                <Label htmlFor="memory_enabled">启用记忆功能</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 能力设置 */}
        <TabsContent value="capabilities">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                功能能力
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    交流功能
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="chat"
                        checked={formData.capabilities.chat}
                        onCheckedChange={(checked) => handleCapabilityChange('chat', checked)}
                      />
                      <Label htmlFor="chat">文字聊天</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="voice_call"
                        checked={formData.capabilities.voice_call}
                        onCheckedChange={(checked) => handleCapabilityChange('voice_call', checked)}
                      />
                      <Label htmlFor="voice_call">语音通话</Label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center">
                    <Heart className="h-4 w-4 mr-2" />
                    健康管理
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="health_monitoring"
                        checked={formData.capabilities.health_monitoring}
                        onCheckedChange={(checked) => handleCapabilityChange('health_monitoring', checked)}
                      />
                      <Label htmlFor="health_monitoring">健康监测</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="reminder"
                        checked={formData.capabilities.reminder}
                        onCheckedChange={(checked) => handleCapabilityChange('reminder', checked)}
                      />
                      <Label htmlFor="reminder">提醒服务</Label>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    生活服务
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="weather"
                        checked={formData.capabilities.weather}
                        onCheckedChange={(checked) => handleCapabilityChange('weather', checked)}
                      />
                      <Label htmlFor="weather">天气查询</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="news"
                        checked={formData.capabilities.news}
                        onCheckedChange={(checked) => handleCapabilityChange('news', checked)}
                      />
                      <Label htmlFor="news">新闻资讯</Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 高级选项 */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                高级选项
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-medium">安全设置</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="content_filter">内容过滤</Label>
                      <p className="text-xs text-muted-foreground">过滤不当内容</p>
                    </div>
                    <Switch
                      id="content_filter"
                      checked={formData.content_filter}
                      onCheckedChange={(checked) => handleInputChange('content_filter', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="safe_mode">安全模式</Label>
                      <p className="text-xs text-muted-foreground">限制敏感话题</p>
                    </div>
                    <Switch
                      id="safe_mode"
                      checked={formData.safe_mode}
                      onCheckedChange={(checked) => handleInputChange('safe_mode', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="privacy_mode">隐私模式</Label>
                      <p className="text-xs text-muted-foreground">不记录敏感信息</p>
                    </div>
                    <Switch
                      id="privacy_mode"
                      checked={formData.privacy_mode}
                      onCheckedChange={(checked) => handleInputChange('privacy_mode', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 预览测试 */}
        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TestTube className="h-5 w-5 mr-2" />
                预览测试
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* 配置摘要 */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-medium">配置摘要</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">智能体名称:</span>
                      <span className="ml-2 font-medium">{formData.agent_name || '未设置'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">交互风格:</span>
                      <span className="ml-2 font-medium">{formData.interaction_style || '友善'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">语言模型:</span>
                      <span className="ml-2 font-medium">{formData.llm_model_id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">TTS语音:</span>
                      <span className="ml-2 font-medium">
                        {voices.find(v => v.id === formData.tts_voice_id)?.name || '未选择'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(formData.capabilities)
                      .filter(([_, enabled]) => enabled)
                      .map(([capability, _]) => (
                        <Badge key={capability} variant="outline">
                          {capability.replace('_', ' ')}
                        </Badge>
                      ))}
                  </div>
                </div>
                
                {/* 测试区域 */}
                <div className="space-y-4">
                  <h3 className="font-medium">快速测试</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button onClick={testAgent} disabled={testing} className="h-20 flex flex-col">
                      <MessageSquare className="h-6 w-6 mb-2" />
                      <span>对话测试</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex flex-col">
                      <Volume2 className="h-6 w-6 mb-2" />
                      <span>语音测试</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AgentCreator;