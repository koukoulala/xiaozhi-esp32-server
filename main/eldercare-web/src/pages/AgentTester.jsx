import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Progress } from '@/components/ui/progress.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { 
  ArrowLeft,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RefreshCw,
  Play,
  Pause,
  Square,
  MessageSquare,
  Bot,
  User,
  TestTube,
  Activity,
  Clock,
  Zap,
  CheckCircle,
  AlertTriangle,
  Brain,
  Settings
} from 'lucide-react';
import ElderCareAPI from '@/services/api.js';

function AgentTester() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testMode, setTestMode] = useState('chat'); // chat | voice
  
  // 聊天状态
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // 语音状态
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // 测试统计
  const [testStats, setTestStats] = useState({
    totalMessages: 0,
    avgResponseTime: 0,
    successRate: 100,
    errors: []
  });
  
  // 预设测试场景
  const testScenarios = [
    {
      id: 'greeting',
      name: '问候测试',
      description: '测试基本问候功能',
      messages: [
        '你好',
        '早上好',
        '晚安',
        '再见'
      ]
    },
    {
      id: 'health',
      name: '健康咨询',
      description: '测试健康相关对话',
      messages: [
        '我今天感觉有点不舒服',
        '血压应该多久测量一次？',
        '如何保持良好的睡眠？',
        '老人运动需要注意什么？'
      ]
    },
    {
      id: 'daily',
      name: '日常聊天',
      description: '测试日常对话能力',
      messages: [
        '今天天气怎么样？',
        '给我讲个笑话',
        '推荐一些好看的电视剧',
        '怎么做红烧肉？'
      ]
    },
    {
      id: 'emergency',
      name: '紧急情况',
      description: '测试紧急情况处理',
      messages: [
        '我摔倒了',
        '我胸口疼',
        '忘记吃药了',
        '找不到家人的电话'
      ]
    }
  ];

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    
    return () => clearInterval(interval);
  }, [isRecording]);

  const loadAgent = async () => {
    try {
      setLoading(true);
      const response = await ElderCareAPI.getAgentDetails(agentId);
      
      if (response.success) {
        setAgent(response.data);
        // 添加初始问候消息
        setMessages([{
          id: Date.now(),
          type: 'bot',
          content: `你好！我是 ${response.data.agent_name}，现在开始测试对话功能。`,
          timestamp: new Date(),
          responseTime: 0
        }]);
      } else {
        throw new Error(response.message || '加载智能体失败');
      }
    } catch (error) {
      console.error('加载智能体失败:', error);
      setMessages([{
        id: Date.now(),
        type: 'error',
        content: '加载智能体失败: ' + error.message,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sendMessage = async (message = currentMessage) => {
    if (!message.trim() || sending) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setSending(true);

    const startTime = Date.now();

    try {
      const response = await ElderCareAPI.chatWithAgent(agentId, message);
      const responseTime = Date.now() - startTime;

      if (response.success) {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: response.data.reply,
          timestamp: new Date(),
          responseTime
        };
        
        setMessages(prev => [...prev, botMessage]);
        
        // 更新统计
        setTestStats(prev => ({
          ...prev,
          totalMessages: prev.totalMessages + 1,
          avgResponseTime: (prev.avgResponseTime * (prev.totalMessages - 1) + responseTime) / prev.totalMessages
        }));
      } else {
        throw new Error(response.message || '发送消息失败');
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: '发送失败: ' + error.message,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      setTestStats(prev => ({
        ...prev,
        errors: [...prev.errors, error.message],
        successRate: Math.max(0, prev.successRate - 5)
      }));
    } finally {
      setSending(false);
    }
  };

  const runScenarioTest = async (scenario) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'system',
      content: `开始运行测试场景: ${scenario.name}`,
      timestamp: new Date()
    }]);

    for (const message of scenario.messages) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 间隔1秒
      await sendMessage(message);
    }

    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'system',
      content: `测试场景 "${scenario.name}" 完成`,
      timestamp: new Date()
    }]);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      
      // 这里应该实现真正的录音逻辑
      // 暂时用定时器模拟
      setTimeout(() => {
        stopVoiceRecording();
      }, 5000);
    } catch (error) {
      console.error('录音失败:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  const stopVoiceRecording = () => {
    setIsRecording(false);
    // 模拟生成音频文件
    setAudioUrl('data:audio/wav;base64,mock-audio-data');
    
    // 模拟发送语音消息
    const voiceMessage = {
      id: Date.now(),
      type: 'user',
      content: '[语音消息]',
      audioUrl: 'data:audio/wav;base64,mock-audio-data',
      timestamp: new Date(),
      duration: recordingTime
    };
    
    setMessages(prev => [...prev, voiceMessage]);
    
    // 模拟智能体语音回复
    setTimeout(() => {
      const botReply = {
        id: Date.now() + 1,
        type: 'bot',
        content: '我听到了您的语音消息，这是我的回复。',
        audioUrl: 'data:audio/wav;base64,mock-bot-audio',
        timestamp: new Date(),
        responseTime: 1500
      };
      setMessages(prev => [...prev, botReply]);
    }, 1500);
  };

  const playAudio = (audioUrl) => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    // 模拟播放音频
    setTimeout(() => {
      setIsPlaying(false);
    }, 3000);
  };

  const clearMessages = () => {
    setMessages([{
      id: Date.now(),
      type: 'bot',
      content: `你好！我是 ${agent?.agent_name}，现在开始新的测试对话。`,
      timestamp: new Date(),
      responseTime: 0
    }]);
    setTestStats({
      totalMessages: 0,
      avgResponseTime: 0,
      successRate: 100,
      errors: []
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>加载智能体信息...</p>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate(`/agents/${agentId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回详情
          </Button>
          <div>
            <h1 className="text-2xl font-bold">智能体测试 - {agent.agent_name}</h1>
            <p className="text-muted-foreground">测试智能体的对话和功能</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={agent.is_active ? "default" : "secondary"}>
            {agent.is_active ? "运行中" : "已停用"}
          </Badge>
          <Button onClick={clearMessages} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            重置对话
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左侧 - 测试区域 */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <TestTube className="h-5 w-5 mr-2" />
                  测试对话
                </CardTitle>
                <Tabs value={testMode} onValueChange={setTestMode} className="w-auto">
                  <TabsList>
                    <TabsTrigger value="chat">文字对话</TabsTrigger>
                    <TabsTrigger value="voice">语音测试</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0">
              {/* 消息区域 */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-2 max-w-[80%] ${
                        message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          message.type === 'user' 
                            ? 'bg-blue-500 text-white' 
                            : message.type === 'bot' 
                            ? 'bg-green-500 text-white'
                            : message.type === 'system'
                            ? 'bg-gray-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}>
                          {message.type === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : message.type === 'bot' ? (
                            <Bot className="h-4 w-4" />
                          ) : message.type === 'system' ? (
                            <Settings className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                        </div>
                        
                        <div className={`rounded-lg p-3 ${
                          message.type === 'user'
                            ? 'bg-blue-500 text-white'
                            : message.type === 'bot'
                            ? 'bg-gray-100'
                            : message.type === 'system'
                            ? 'bg-yellow-50 border border-yellow-200'
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          <div className="text-sm">{message.content}</div>
                          
                          {message.audioUrl && (
                            <div className="mt-2 flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => playAudio(message.audioUrl)}
                                disabled={isPlaying}
                              >
                                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                              {message.duration && (
                                <span className="text-xs opacity-70">
                                  {formatTime(message.duration)}
                                </span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString()}
                            </span>
                            {message.responseTime && (
                              <span className="text-xs opacity-70">
                                {message.responseTime}ms
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span className="text-sm">正在思考...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>
              
              {/* 输入区域 */}
              <div className="border-t p-4">
                {testMode === 'chat' ? (
                  <div className="flex space-x-2">
                    <Input
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      placeholder="输入测试消息..."
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={sending}
                    />
                    <Button 
                      onClick={() => sendMessage()}
                      disabled={!currentMessage.trim() || sending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-4">
                    {!isRecording ? (
                      <Button
                        onClick={startVoiceRecording}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        开始录音
                      </Button>
                    ) : (
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-sm">录音中 {formatTime(recordingTime)}</span>
                        </div>
                        <Button
                          onClick={stopVoiceRecording}
                          variant="outline"
                        >
                          <Square className="h-4 w-4 mr-2" />
                          停止录音
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧 - 控制面板 */}
        <div className="space-y-6">
          {/* 测试统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                测试统计
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">消息总数</span>
                  <Badge>{testStats.totalMessages}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">平均响应时间</span>
                  <Badge variant="outline">{Math.round(testStats.avgResponseTime)}ms</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">成功率</span>
                    <Badge variant={testStats.successRate >= 90 ? "default" : "destructive"}>
                      {testStats.successRate}%
                    </Badge>
                  </div>
                  <Progress value={testStats.successRate} />
                </div>
                {testStats.errors.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm text-red-600">错误记录</span>
                    <div className="text-xs space-y-1">
                      {testStats.errors.slice(-3).map((error, index) => (
                        <div key={index} className="text-red-600 p-2 bg-red-50 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 测试场景 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                测试场景
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testScenarios.map((scenario) => (
                  <div key={scenario.id} className="space-y-2">
                    <Button
                      onClick={() => runScenarioTest(scenario)}
                      variant="outline"
                      className="w-full justify-start"
                      disabled={sending}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {scenario.name}
                    </Button>
                    <p className="text-xs text-muted-foreground px-2">
                      {scenario.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 快速测试 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                快速测试
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {[
                  '你好',
                  '今天天气怎么样？',
                  '我感觉不舒服',
                  '帮我设置一个提醒'
                ].map((message, index) => (
                  <Button
                    key={index}
                    onClick={() => sendMessage(message)}
                    variant="outline"
                    size="sm"
                    disabled={sending}
                    className="justify-start text-left"
                  >
                    {message}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AgentTester;