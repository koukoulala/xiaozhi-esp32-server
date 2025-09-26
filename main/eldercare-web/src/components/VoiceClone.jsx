import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { 
  Volume2, 
  Upload, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Star, 
  Settings, 
  Trash2,
  Plus,
  Bot
} from 'lucide-react';
import ElderCareAPI from '../services/api.js';

function VoiceClone() {
  const [userAgents, setUserAgents] = useState([]);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [voiceClones, setVoiceClones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingVoice, setEditingVoice] = useState(null);
  
  // 录音相关状态
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorder = useRef(null);
  const audioRef = useRef(null);
  
  // 表单状态
  const [voiceName, setVoiceName] = useState('');
  const [referenceText, setReferenceText] = useState('今天天气很好，记得出去散散步。早饭要记得吃，对身体好。');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = ElderCareAPI.getCurrentUser();
  const userId = currentUser?.id || 23;

  // 组件调试信息和API重新初始化
  useEffect(() => {
    console.log('=== VoiceClone组件初始化调试 ===');
    console.log('currentUser:', currentUser);
    console.log('userId:', userId);
    console.log('localStorage eldercare_user:', localStorage.getItem('eldercare_user'));
    console.log('localStorage eldercare_token:', localStorage.getItem('eldercare_token'));
    console.log('API系统状态:', ElderCareAPI.getSystemStatus());
    console.log('window.location:', window.location);
    
    // 强制重新初始化API连接
    const reinitAPI = async () => {
      console.log('强制重新初始化API连接...');
      await ElderCareAPI.initAPI();
      console.log('API重新初始化完成，新状态:', ElderCareAPI.getSystemStatus());
    };
    reinitAPI();
  }, []);

  // 预设参考文本示例
  const sampleTexts = [
    '今天天气很好，记得出去散散步。早饭要记得吃，对身体好。',
    '亲爱的，该吃药了。记住要多喝水，注意保暖。我很想你，希望你身体健康。',
    '孩子今天考试了，希望他能考好。你要早点休息，不要熬夜了。'
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading data for userId:', userId);
      
      let defaultAgent = null; // 声明在正确的作用域
      
      // 加载用户智能体
      console.log('正在调用 getUserAgents API...');
      const agentsResponse = await ElderCareAPI.getUserAgents(userId);
      console.log('getUserAgents响应:', agentsResponse);
      
      if (agentsResponse.success && Array.isArray(agentsResponse.data)) {
        setUserAgents(agentsResponse.data);
        // 设置默认智能体
        defaultAgent = agentsResponse.data.find(agent => agent.is_default) || agentsResponse.data[0];
        console.log('找到默认智能体:', defaultAgent);
        if (defaultAgent) {
          setCurrentAgent(defaultAgent);
          setSelectedAgent(defaultAgent.id);
        }
      } else {
        console.warn('智能体API调用失败或返回空数据:', agentsResponse);
        setUserAgents([]);
      }
      
      // 加载用户语音克隆（根据选择的智能体）
      const agentId = defaultAgent ? defaultAgent.id : null;
      console.log('正在调用 getVoiceClones API, userId:', userId, 'agentId:', agentId);
      const voicesResponse = await ElderCareAPI.getVoiceClones(userId, agentId);
      console.log('getVoiceClones响应:', voicesResponse);
      
      if (voicesResponse.success && Array.isArray(voicesResponse.data)) {
        console.log('成功获取到', voicesResponse.data.length, '条语音数据');
        setVoiceClones(voicesResponse.data);
      } else {
        console.warn('语音API调用失败或返回空数据:', voicesResponse);
        setVoiceClones([]);
      }
    } catch (err) {
      console.error('Load data error:', err);
      setError('加载数据失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // 当选择的智能体改变时，重新加载语音数据
  useEffect(() => {
    if (userId && selectedAgent) {
      loadData();
    }
  }, [selectedAgent]);

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      
      const chunks = [];
      mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      setError('录音失败: ' + err.message);
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  // 播放录音
  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // 音频播放结束事件处理
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => setIsPlaying(false);
      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, [audioURL]);

  // 提交语音克隆
  const handleSubmit = async () => {
    if (!audioBlob || !voiceName.trim() || !selectedAgent) {
      setError('请完成所有必填信息');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const voiceData = {
        userId: userId,
        agentId: selectedAgent ? selectedAgent.id : null,
        name: voiceName.trim(),
        referenceText: referenceText.trim(),
        audioFile: audioBlob,
        family_member_name: voiceName.trim(), // 使用语音名称作为家庭成员名称
        relationship: 'family' // 默认关系为家庭成员
      };

      const result = await ElderCareAPI.createVoiceClone(voiceData);
      
      if (result.success) {
        setSuccess('语音克隆创建成功！');
        resetForm();
        loadData(); // 重新加载数据
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || '创建失败');
      }
    } catch (err) {
      setError('创建语音克隆失败: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setVoiceName('');
    setReferenceText('今天天气很好，记得出去散散步。早饭要记得吃，对身体好。');
    setAudioBlob(null);
    setAudioURL('');
    setIsPlaying(false);
    setShowCreateForm(false);
    setEditingVoice(null);
  };

  // 设置为默认语音
  const setAsDefault = async (voiceId) => {
    if (!currentAgent) return;

    try {
      setIsSubmitting(true);
      const result = await ElderCareAPI.setDefaultVoice(userId, voiceId);
      
      if (result.success) {
        setSuccess('默认语音设置成功');
        loadData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || '设置失败');
      }
    } catch (err) {
      setError('设置默认语音失败: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 删除语音
  const deleteVoice = async (voiceId) => {
    if (!confirm('确定要删除这个语音克隆吗？此操作不可恢复。')) return;

    try {
      setIsSubmitting(true);
      const result = await ElderCareAPI.deleteVoice(userId, voiceId);
      
      if (result.success) {
        setSuccess('语音删除成功');
        loadData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.message || '删除失败');
      }
    } catch (err) {
      setError('删除语音失败: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 开始创建语音
  const startCreate = () => {
    resetForm();
    setShowCreateForm(true);
  };

  if (loading && voiceClones.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* 智能体选择 - 简洁下拉框版本 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bot className="h-5 w-5 mr-2" />
            选择智能体
          </CardTitle>
          <CardDescription>
            为智能体"{currentAgent?.agent_name || '未选择'}"创建专属语音音色
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userAgents.length > 0 ? (
            <div className="max-w-md">
              <Label htmlFor="agentSelect">当前智能体</Label>
              <Select 
                value={selectedAgent} 
                onValueChange={(value) => {
                  setSelectedAgent(value);
                  const agent = userAgents.find(a => a.id === value);
                  setCurrentAgent(agent);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择智能体" />
                </SelectTrigger>
                <SelectContent>
                  {userAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{agent.agent_name}</span>
                        {agent.is_default && (
                          <Badge variant="secondary" className="ml-2">默认</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无智能体</p>
              <p className="text-sm">请先在智能体管理页面创建智能体</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 语音克隆列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Volume2 className="h-5 w-5 mr-2" />
                语音克隆库
              </CardTitle>
              <CardDescription>
                管理您的个人语音克隆，为智能体设置专属声音
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
              <Button onClick={startCreate} disabled={!currentAgent || isSubmitting}>
                <Plus className="h-4 w-4 mr-1" />
                创建语音
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {voiceClones.length > 0 ? (
            <div className="space-y-3">
              {voiceClones.map((voice) => (
                <div key={voice.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{voice.name}</p>
                        {currentAgent?.tts_voice_id === voice.id && (
                          <Badge variant="default" className="flex items-center space-x-1">
                            <Star className="h-3 w-3" />
                            <span>默认</span>
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {voice.reference_text ? voice.reference_text.substring(0, 50) + '...' : '无参考文本'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        创建于 {new Date(voice.create_date || voice.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                      {voice.family_member_name && (
                        <p className="text-xs text-blue-600">
                          家庭成员: {voice.family_member_name} ({voice.relationship})
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {currentAgent && currentAgent.tts_voice_id !== voice.id && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setAsDefault(voice.id)}
                        disabled={isSubmitting}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        设为默认
                      </Button>
                    )}

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setEditingVoice(voice);
                        setVoiceName(voice.name);
                        setReferenceText(voice.reference_text || '');
                        setShowCreateForm(true);
                      }}
                      disabled={isSubmitting}
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      编辑
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => deleteVoice(voice.id)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无语音克隆</p>
              <p className="text-sm">点击"创建语音"开始录制您的专属声音</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建/编辑表单 */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingVoice ? '编辑语音克隆' : '创建语音克隆'}
            </CardTitle>
            <CardDescription>
              录制15-30秒的高质量音频来创建个性化语音克隆
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 当前智能体显示 */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-blue-600" />
                <span className="font-medium">为智能体创建语音：</span>
                <Badge variant="default">{currentAgent?.agent_name || '未选择智能体'}</Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                语音将用于此智能体的TTS语音合成
              </p>
            </div>

            {/* 语音名称 */}
            <div className="space-y-2">
              <Label htmlFor="voiceName">语音名称 *</Label>
              <Input
                id="voiceName"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="例如：爷爷的声音、妈妈的声音"
                disabled={isSubmitting}
              />
            </div>

            {/* 参考文本 */}
            <div className="space-y-2">
              <Label htmlFor="referenceText">参考文本 *</Label>
              <Textarea
                id="referenceText"
                value={referenceText}
                onChange={(e) => setReferenceText(e.target.value)}
                placeholder="请输入用于录音的参考文本，建议15-30字"
                className="min-h-[100px]"
                disabled={isSubmitting}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {sampleTexts.map((text, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setReferenceText(text)}
                    disabled={isSubmitting}
                  >
                    示例{index + 1}
                  </Button>
                ))}
              </div>
            </div>

            {/* 录音区域 */}
            <div className="space-y-4">
              <Label htmlFor="recording">录制音频 *</Label>
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? "destructive" : "default"}
                    disabled={isSubmitting}
                  >
                    {isRecording ? (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        停止录音
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        开始录音
                      </>
                    )}
                  </Button>
                  
                  {audioBlob && (
                    <Button
                      onClick={playAudio}
                      variant="outline"
                      disabled={isSubmitting}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          暂停播放
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          播放录音
                        </>
                      )}
                    </Button>
                  )}
                </div>
                
                {/* 录音状态提示 */}
                {isRecording && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">正在录音中...请朗读上方参考文本</span>
                  </div>
                )}
                
                {/* 音频播放器（带进度条） */}
                {audioURL && (
                  <div className="space-y-2">
                    <audio 
                      ref={audioRef} 
                      src={audioURL} 
                      controls 
                      className="w-full h-10"
                      onEnded={() => setIsPlaying(false)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    <p className="text-xs text-gray-500">
                      ✅ 录音完成，可点击播放预览
                    </p>
                  </div>
                )}
                
                {!audioBlob && !isRecording && (
                  <div className="text-center text-gray-500 py-4">
                    <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">点击"开始录音"录制您的声音</p>
                    <p className="text-xs">建议录制15-30秒高质量音频</p>
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={resetForm}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!audioBlob || !voiceName.trim() || !selectedAgent || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {editingVoice ? '更新语音' : '创建语音'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default VoiceClone;