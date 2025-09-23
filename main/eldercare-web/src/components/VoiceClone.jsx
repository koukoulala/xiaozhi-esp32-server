import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Volume2, Upload, RefreshCw, AlertTriangle, CheckCircle, Mic, Square, Play, Pause, Star, Settings } from 'lucide-react';
import ElderCareAPI from '@/services/api.js';

function VoiceClone() {
  const [userAgents, setUserAgents] = useState([]);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [voiceClones, setVoiceClones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // 录音相关状态
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorder = useRef(null);
  const audioRef = useRef(null);
  
  // 表单状态
  const [voiceName, setVoiceName] = useState('');
  const [referenceText, setReferenceText] = useState('亲爱的，该吃药了。记住要多喝水，注意保暖。我很想你，希望你身体健康。');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = ElderCareAPI.getCurrentUser();
  const userId = currentUser?.id || 1;

  // 预设参考文本示例
  const sampleTexts = [
    '亲爱的，该吃药了。记住要多喝水，注意保暖。我很想你，希望你身体健康。',
    '今天天气很好，记得出去散散步。早饭要记得吃，对身体好。',
    '孙子今天考试了，希望他能考好。你要早点休息，不要熬夜了。'
  ];

  const loadUserAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 获取用户的AI智能体列表
      const response = await ElderCareAPI.getUserAgents(userId);
      if (response.success && response.data) {
        setUserAgents(response.data);
        
        // 找到默认的AI智能体
        const defaultAgent = response.data.find(agent => agent.isDefault) || response.data[0];
        if (defaultAgent) {
          setCurrentAgent(defaultAgent);
          loadVoiceClones(defaultAgent.tts_voice_id);
        }
      } else {
        setError('加载智能体信息失败');
      }
    } catch (err) {
      setError('加载智能体信息失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadVoiceClones = async (ttsVoiceId = null) => {
    try {
      // 获取所有可用的音色
      const response = await ElderCareAPI.getVoiceClones(userId);
      if (response.success && response.data) {
        setVoiceClones(response.data);
      }
    } catch (err) {
      console.error('加载音色列表失败:', err);
    }
  };

  useEffect(() => {
    loadUserAgents();
  }, []);

  // 开始录音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError('无法访问麦克风: ' + err.message);
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

  // 提交音色克隆
  const handleSubmit = async () => {
    if (!audioBlob || !voiceName.trim() || !referenceText.trim()) {
      setError('请完成录音并填写完整信息');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);
      
      const voiceData = {
        userId: userId,
        name: voiceName.trim(),
        referenceText: referenceText.trim(),
        audioFile: audioBlob,
        ttsModelId: currentAgent?.tts_model_id || 'TTS_CosyVoiceClone302AI'
      };
      
      const response = await ElderCareAPI.createVoiceClone(voiceData);
      
      if (response.success) {
        setSuccess('声音克隆成功');
        setVoiceName('');
        setReferenceText(sampleTexts[0]);
        setAudioBlob(null);
        setAudioURL('');
        loadVoiceClones();
      } else {
        setError(response.message || '声音克隆失败');
      }
    } catch (err) {
      setError('声音克隆失败: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 设置为默认音色
  const setAsDefault = async (voiceId) => {
    if (!currentAgent) {
      setError('请先选择智能体');
      return;
    }

    try {
      const response = await ElderCareAPI.updateAgentVoice(currentAgent.id, voiceId);
      
      if (response.success) {
        setSuccess('默认音色设置成功');
        // 更新当前智能体信息
        setCurrentAgent(prev => ({
          ...prev,
          tts_voice_id: voiceId
        }));
        loadUserAgents();
      } else {
        setError('设置默认音色失败: ' + response.message);
      }
    } catch (err) {
      setError('设置默认音色失败: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>加载中...</span>
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

      {/* 智能体选择 */}
      {userAgents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>选择智能体</CardTitle>
            <CardDescription>选择要配置声音的AI智能体</CardDescription>
          </CardHeader>
          <CardContent>
            <Select 
              value={currentAgent?.id || ''} 
              onValueChange={(agentId) => {
                const agent = userAgents.find(a => a.id === agentId);
                setCurrentAgent(agent);
                if (agent) {
                  loadVoiceClones(agent.tts_voice_id);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择智能体" />
              </SelectTrigger>
              <SelectContent>
                {userAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center space-x-2">
                      <span>{agent.agent_name || agent.name}</span>
                      {agent.isDefault && <Badge variant="secondary" className="ml-2">默认</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">创建声音克隆</TabsTrigger>
          <TabsTrigger value="manage">管理音色</TabsTrigger>
        </TabsList>

        {/* 创建声音克隆 */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>录制家人声音</CardTitle>
              <CardDescription>录制一段清晰的家人声音，用于AI声音克隆</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="voice-name">音色名称</Label>
                <Input
                  id="voice-name"
                  placeholder="例如：妈妈、爸爸、女儿"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reference-text">参考文本</Label>
                <Textarea
                  id="reference-text"
                  placeholder="请输入要录制的文本内容"
                  value={referenceText}
                  onChange={(e) => setReferenceText(e.target.value)}
                  rows={3}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {sampleTexts.map((text, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setReferenceText(text)}
                    >
                      示例{index + 1}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 录音控制 */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  {!isRecording ? (
                    <Button onClick={startRecording} className="flex items-center space-x-2">
                      <Mic className="h-4 w-4" />
                      <span>开始录音</span>
                    </Button>
                  ) : (
                    <Button onClick={stopRecording} variant="destructive" className="flex items-center space-x-2">
                      <Square className="h-4 w-4" />
                      <span>停止录音</span>
                    </Button>
                  )}

                  {audioURL && (
                    <Button onClick={playAudio} variant="outline" className="flex items-center space-x-2">
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      <span>{isPlaying ? '暂停' : '播放'}</span>
                    </Button>
                  )}
                </div>

                {audioURL && (
                  <audio
                    ref={audioRef}
                    src={audioURL}
                    onEnded={() => setIsPlaying(false)}
                    className="w-full"
                    controls
                  />
                )}
              </div>
              
              <Button 
                onClick={handleSubmit} 
                disabled={!audioBlob || !voiceName.trim() || !referenceText.trim() || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    正在处理...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    开始声音克隆
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 管理音色 */}
        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>音色管理</CardTitle>
                <Button variant="outline" size="sm" onClick={loadVoiceClones} disabled={loading}>
                  <RefreshCw className={'h-4 w-4 mr-1 ' + (loading ? 'animate-spin' : '')} />
                  刷新
                </Button>
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
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {voice.voice_demo && (
                          <Button variant="outline" size="sm">
                            <Volume2 className="h-3 w-3 mr-1" />
                            试听
                          </Button>
                        )}
                        
                        {currentAgent && currentAgent.tts_voice_id !== voice.id && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setAsDefault(voice.id)}
                          >
                            <Star className="h-3 w-3 mr-1" />
                            设为默认
                          </Button>
                        )}

                        <Button variant="ghost" size="sm">
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无声音克隆</p>
                  <p className="text-sm">点击"创建声音克隆"标签页开始录制家人声音</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default VoiceClone;