import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Switch } from '@/components/ui/switch.jsx'
import { 
  User,
  UserPlus,
  AlertTriangle,
  RefreshCw,
  Settings,
  Mic,
  Brain,
  CheckCircle,
  Bot
} from 'lucide-react'
import ElderCareAPI from '@/services/api.js'

function AgentManagement() {
  const [agents, setAgents] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [savingAgent, setSavingAgent] = useState(false)
  const [formData, setFormData] = useState({
    agent_name: '',
    agent_code: '',
    system_prompt: '',
    selectedTemplate: 'custom',
    is_default: false,
    memory_enabled: true,
    persona_traits: '',
    interaction_style: 'friendly',
    response_length: 'moderate'
  })

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const currentUser = ElderCareAPI.getCurrentUser()
      
      // 加载用户的智能体
      const agentsResponse = await ElderCareAPI.getUserAgents(currentUser?.id || 1)
      
      if (agentsResponse.success && agentsResponse.data) {
        setAgents(agentsResponse.data)
        console.log('加载的智能体列表:', agentsResponse.data)
      } else {
        setError(agentsResponse.message || '加载智能体列表失败')
      }
      
      // 加载智能体模板（只获取ElderCare相关模板）
      try {
        const templatesResponse = await ElderCareAPI.getAgentTemplates()
        if (templatesResponse.success && templatesResponse.data) {
          // 只保留agent_code为ElderCare的模板
          const eldercareTemplates = templatesResponse.data.filter(
            template => template.id && template.id.includes('eldercare') || template.id.includes('ElderCare') || template.id.includes('EC_')
          )
          
          // 添加自定义选项
          setTemplates([
            {
              id: 'custom',
              agent_name: '自定义',
              system_prompt: ''
            },
            ...eldercareTemplates
          ])
        } else {
          // 使用默认模板作为备用
          setTemplates([
            {
              id: 'custom',
              agent_name: '自定义',
              system_prompt: ''
            },
            {
              id: 'EC_eldercare_agent_template_001',
              agent_name: '老人的智能助手',
              system_prompt: '您是一位温暖贴心的养老助手，专门陪伴老年用户，提供日常生活的关怀和帮助。'
            }
          ])
        }
      } catch (err) {
        console.warn('加载模板失败，使用默认模板:', err)
        // 使用默认模板
        setTemplates([
          {
            id: 'custom',
            agent_name: '自定义',
            system_prompt: ''
          }
        ])
      }
      
    } catch (err) {
      console.error('加载数据失败:', err)
      setError(`加载数据失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateAgent = () => {
    setEditingAgent(null)
    setFormData({
      agent_name: '',
      agent_code: '',
      system_prompt: '',
      selectedTemplate: 'custom',
      is_default: false,
      memory_enabled: true,
      persona_traits: '',
      interaction_style: 'friendly',
      response_length: 'moderate'
    })
    setShowCreateForm(true)
  }

  const handleEditAgent = (agent) => {
    setEditingAgent(agent)
    setFormData({
      agent_name: agent.agent_name || '',
      agent_code: agent.agent_code || '',
      system_prompt: agent.system_prompt || '',
      selectedTemplate: 'custom', // 编辑时默认为自定义
      is_default: agent.default_agent || false,
      memory_enabled: agent.memory_enabled !== false,
      persona_traits: agent.persona_traits || '',
      interaction_style: agent.interaction_style || 'friendly',
      response_length: agent.response_length || 'moderate'
    })
    setShowCreateForm(true)
  }

  const handleTemplateChange = (templateId) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      if (templateId === 'custom') {
        // 自定义模式，不修改现有内容
        setFormData(prev => ({
          ...prev,
          selectedTemplate: 'custom'
        }))
      } else {
        // 使用模板内容
        setFormData(prev => ({
          ...prev,
          system_prompt: template.system_prompt,
          agent_name: prev.agent_name || template.agent_name,
          selectedTemplate: templateId
        }))
      }
    }
  }

  const handleSaveAgent = async () => {
    if (!formData.agent_name.trim()) {
      setError('请输入智能体名称')
      return
    }

    try {
      setSavingAgent(true)
      setError(null)
      setSuccess(null)
      
      const currentUser = ElderCareAPI.getCurrentUser()
      const agentData = {
        userId: currentUser?.id || 1,
        agentName: formData.agent_name.trim(),
        agentCode: formData.agent_code.trim(),
        systemPrompt: formData.system_prompt.trim(),
        defaultAgent: formData.is_default,
        memoryEnabled: formData.memory_enabled,
        personaTraits: formData.persona_traits.trim(),
        interactionStyle: formData.interaction_style,
        responseLength: formData.response_length
      }

      let response
      if (editingAgent) {
        response = await ElderCareAPI.updateAgent(editingAgent.id, agentData)
      } else {
        response = await ElderCareAPI.createAgent(agentData)
      }

      if (response.success) {
        setSuccess(editingAgent ? '智能体更新成功' : '智能体创建成功')
        setShowCreateForm(false)
        loadData() // 重新加载数据
      } else {
        setError(response.message || '保存失败')
      }
    } catch (err) {
      console.error('保存智能体失败:', err)
      setError(`保存失败: ${err.message}`)
    } finally {
      setSavingAgent(false)
    }
  }

  const handleDeleteAgent = async (agentId, agentName) => {
    if (!confirm(`确定要删除智能体"${agentName}"吗？`)) {
      return
    }

    try {
      const response = await ElderCareAPI.deleteAgent(agentId)
      
      if (response.success) {
        setSuccess(`智能体"${agentName}"删除成功`)
        loadData()
      } else {
        setError(response.message || '删除失败')
      }
    } catch (err) {
      console.error('删除智能体失败:', err)
      setError(`删除失败: ${err.message}`)
    }
  }

  const handleSetDefaultAgent = async (agentId, agentName) => {
    try {
      const currentUser = ElderCareAPI.getCurrentUser()
      const response = await ElderCareAPI.setDefaultAgent(currentUser?.id || 1, agentId)
      
      if (response.success) {
        setSuccess(`已将"${agentName}"设为默认智能体`)
        loadData()
      } else {
        setError(response.message || '设置默认智能体失败')
      }
    } catch (err) {
      console.error('设置默认智能体失败:', err)
      setError(`设置失败: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">加载智能体...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">智能体管理</h2>
          <p className="text-muted-foreground">管理陪老人的AI智能体，配置角色和设备</p>
        </div>
        <Button onClick={handleCreateAgent}>
          <UserPlus className="h-4 w-4 mr-2" />
          创建智能体
        </Button>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" className="ml-2" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* 智能体列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{agent.agent_name}</CardTitle>
                  <CardDescription>
                    {agent.agent_code ? `编号: ${agent.agent_code}` : '智能陪伴助手'}
                  </CardDescription>
                </div>
                {agent.default_agent && (
                  <Badge variant="default">默认</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <p className="text-muted-foreground mb-2">角色设定预览:</p>
                <p className="line-clamp-3">
                  {agent.system_prompt ? 
                    agent.system_prompt.substring(0, 100) + '...' : 
                    '暂无角色设定'
                  }
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  智能助手
                </Badge>
                {agent.memory_enabled && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Settings className="h-3 w-3" />
                    记忆模式
                  </Badge>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                {!agent.is_default && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSetDefaultAgent(agent.id, agent.agent_name)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    设为默认
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEditAgent(agent)}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  编辑
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDeleteAgent(agent.id, agent.agent_name)}
                  className="text-red-600 hover:text-red-700"
                >
                  删除
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {agents.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">暂无智能体</p>
              <Button onClick={handleCreateAgent}>
                <UserPlus className="h-4 w-4 mr-2" />
                创建第一个智能体
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 创建/编辑智能体表单 */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingAgent ? '编辑智能体' : '创建新智能体'}</CardTitle>
            <CardDescription>
              配置智能体的名称、角色模板和个性化设定
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agent_name">智能体名称</Label>
                <Input
                  id="agent_name"
                  placeholder="例如: 张奶奶的贴心助手"
                  value={formData.agent_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, agent_name: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agent_code">智能体编号 (可选)</Label>
                <Input
                  id="agent_code"
                  placeholder="例如: XZ001"
                  value={formData.agent_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, agent_code: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>角色模板</Label>
              <Select value={formData.selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="选择角色模板" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.agent_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="system_prompt">角色设定与个性描述</Label>
              <Textarea
                id="system_prompt"
                placeholder="请详细描述智能体的角色设定、个性特点、专业知识和交互风格..."
                value={formData.system_prompt}
                onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                className="h-32"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>交互风格</Label>
                <Select
                  value={formData.interaction_style}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, interaction_style: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">友好亲切</SelectItem>
                    <SelectItem value="professional">专业严谨</SelectItem>
                    <SelectItem value="casual">轻松随和</SelectItem>
                    <SelectItem value="caring">关怀体贴</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>回答长度</Label>
                <Select
                  value={formData.response_length}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, response_length: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">简洁 (1-2句)</SelectItem>
                    <SelectItem value="moderate">适中 (2-4句)</SelectItem>
                    <SelectItem value="detailed">详细 (4-6句)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="persona_traits">个性标签 (可选)</Label>
                <Input
                  id="persona_traits"
                  placeholder="例如: 温和、耐心、博学、幽默"
                  value={formData.persona_traits}
                  onChange={(e) => setFormData(prev => ({ ...prev, persona_traits: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用记忆功能</Label>
                  <p className="text-sm text-muted-foreground">
                    智能体将记住与用户的对话历史
                  </p>
                </div>
                <Switch
                  checked={formData.memory_enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, memory_enabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>设为默认智能体</Label>
                  <p className="text-sm text-muted-foreground">
                    用户首次使用时将启用此智能体
                  </p>
                </div>
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                />
              </div>
            </div>





            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                取消
              </Button>
              <Button onClick={handleSaveAgent} disabled={savingAgent}>
                {savingAgent ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  editingAgent ? '保存更改' : '创建智能体'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AgentManagement