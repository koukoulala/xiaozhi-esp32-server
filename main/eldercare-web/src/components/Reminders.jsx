import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { 
  Calendar,
  Clock,
  AlertTriangle,
  RefreshCw,
  Bell,
  BellOff,
  Plus,
  Check,
  X,
  Edit2
} from 'lucide-react'
import ElderCareAPI from '@/services/api.js'

function Reminders() {
  const [reminderType, setReminderType] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [repeatInterval, setRepeatInterval] = useState('none')
  const [voicePrompt, setVoicePrompt] = useState('')  // 语音播报内容
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false)  // 生成中状态
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingReminder, setEditingReminder] = useState(null)  // 正在编辑的提醒
  
  const loadReminders = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const currentUser = ElderCareAPI.getCurrentUser()
      const userId = currentUser?.id || 1
      
      // 使用API服务获取提醒列表
      const response = await ElderCareAPI.get_reminders(userId)
      
      if (response.success && response.data) {
        setReminders(response.data)
      } else {
        setError(`加载提醒失败: ${response.message || '未知错误'}`)
      }
    } catch (err) {
      setError(`加载提醒列表失败: ${err.message}`)
      console.error('Failed to load reminders:', err)
      setReminders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReminders()
  }, [])

  // 当提醒类型、标题或内容变化时，自动生成语音播报内容
  useEffect(() => {
    const generateVoicePrompt = async () => {
      // 只有当有标题时才生成
      if (!title.trim()) {
        setVoicePrompt('')
        return
      }

      // 本地生成语音内容的函数
      const generateLocalVoicePrompt = () => {
        const templates = {
          'medication': `您好，现在是${title.trim()}时间了。${content.trim() ? content.trim() + '。' : ''}请记得按时服药，保持身体健康。`,
          'appointment': `您好，${title.trim()}的时间到了。${content.trim() ? content.trim() + '。' : ''}定期检查有助于了解您的身体状况。`,
          'exercise': `您好，是时候${title.trim()}了。${content.trim() ? content.trim() + '。' : ''}适当运动有益身心健康。`,
          'meal': `您好，${title.trim()}时间到了。${content.trim() ? content.trim() + '。' : ''}按时用餐很重要，祝您用餐愉快。`,
          'other': `您好，${title.trim()}。${content.trim() || ''}`
        }
        return templates[reminderType] || templates['other']
      }

      try {
        setIsGeneratingVoice(true)
        const response = await ElderCareAPI.generateVoicePrompt(reminderType, title.trim(), content.trim())
        if (response.success && response.data?.voice_prompt) {
          setVoicePrompt(response.data.voice_prompt)
        } else {
          // API 返回失败，使用本地生成
          setVoicePrompt(generateLocalVoicePrompt())
        }
      } catch (err) {
        console.error('生成语音播报内容失败:', err)
        // 失败时使用本地生成
        setVoicePrompt(generateLocalVoicePrompt())
      } finally {
        setIsGeneratingVoice(false)
      }
    }

    // 使用防抖，避免频繁请求
    const timer = setTimeout(generateVoicePrompt, 500)
    return () => clearTimeout(timer)
  }, [reminderType, title, content])

  const handleSubmit = async () => {
    if (!reminderType || !title.trim() || !scheduledTime) {
      setError('请填写完整信息')
      return
    }
    
    try {
      setSubmitting(true)
      setError(null)
      
      const currentUser = ElderCareAPI.getCurrentUser()
      const reminderData = {
        user_id: currentUser?.id || 1,
        title: title.trim(),
        content: content.trim(),
        reminder_type: reminderType,
        scheduled_time: scheduledTime,
        repeat_interval: repeatInterval,
        voice_prompt: voicePrompt.trim(),  // 添加语音播报内容
        is_active: true
      }
      
      const response = await ElderCareAPI.createHealthReminder(reminderData)
      
      if (response.success) {
        // 重置表单并刷新列表
        setReminderType('')
        setTitle('')
        setContent('')
        setVoicePrompt('')  // 重置语音播报内容
        setScheduledTime('')
        setRepeatInterval('none')
        setShowCreateForm(false)
        await loadReminders()
        
        alert('提醒设置成功！')
      } else {
        setError(`设置提醒失败: ${response.message || '未知错误'}`)
      }
    } catch (err) {
      setError(`设置提醒失败: ${err.message}`)
      console.error('Failed to create reminder:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const updateReminderStatus = async (reminderId, isCompleted) => {
    try {
      const response = await ElderCareAPI.updateReminderStatus(reminderId, isCompleted)

      if (response.success) {
        loadReminders() // 刷新列表
      } else {
        alert(`更新状态失败: ${response.message}`)
      }
    } catch (err) {
      console.error('更新提醒状态失败:', err)
      alert('更新状态失败，请稍后重试')
    }
  }

  const deleteReminder = async (reminderId) => {
    if (!confirm('确定要删除这个提醒吗？')) {
      return
    }

    try {
      const response = await ElderCareAPI.deleteReminder(reminderId)

      if (response.success) {
        loadReminders()
        alert('提醒已删除')
      } else {
        alert(`删除失败: ${response.message}`)
      }
    } catch (err) {
      console.error('删除提醒失败:', err)
      alert('删除失败，请稍后重试')
    }
  }

  // 开始编辑提醒
  const startEditReminder = (reminder) => {
    setEditingReminder(reminder)
    setReminderType(reminder.reminder_type || '')
    setTitle(reminder.title || '')
    setContent(reminder.content || '')
    setVoicePrompt(reminder.voice_prompt || '')
    setRepeatInterval(reminder.repeat_pattern || 'none')
    // 格式化时间为datetime-local格式
    if (reminder.scheduled_time) {
      const date = new Date(reminder.scheduled_time)
      const localDateTime = date.toISOString().slice(0, 16)
      setScheduledTime(localDateTime)
    }
    setShowCreateForm(true)
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingReminder(null)
    setReminderType('')
    setTitle('')
    setContent('')
    setVoicePrompt('')
    setScheduledTime('')
    setRepeatInterval('none')
    setShowCreateForm(false)
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!reminderType || !title.trim() || !scheduledTime) {
      setError('请填写完整信息')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const updateData = {
        title: title.trim(),
        content: content.trim(),
        reminder_type: reminderType,
        scheduled_time: scheduledTime,
        repeat_pattern: repeatInterval,
        voice_prompt: voicePrompt.trim(),
        status: 'active',
        is_completed: 0
      }

      const response = await ElderCareAPI.updateReminder(editingReminder.id, updateData)

      if (response.success) {
        cancelEdit()
        await loadReminders()
        alert('提醒更新成功！')
      } else {
        setError(`更新失败: ${response.message || '未知错误'}`)
      }
    } catch (err) {
      setError(`更新失败: ${err.message}`)
      console.error('Failed to update reminder:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const getReminderTypeText = (type) => {
    const types = {
      'medication': '服药提醒',
      'appointment': '体检预约',
      'exercise': '运动提醒',
      'meal': '用餐提醒',
      'other': '其他提醒'
    }
    return types[type] || type
  }

  const getRepeatText = (interval) => {
    const intervals = {
      'none': '不重复',
      'daily': '每天',
      'weekly': '每周',
      'monthly': '每月'
    }
    return intervals[interval] || interval
  }

  const isOverdue = (scheduledTime) => {
    return new Date(scheduledTime) < new Date()
  }

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays === 1) {
      return `明天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    } else if (diffDays === -1) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return date.toLocaleString('zh-CN')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">加载提醒...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">健康提醒</h2>
          <p className="text-muted-foreground">为老人设置药物、体检等重要提醒</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          创建提醒
        </Button>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" className="ml-2" onClick={() => setError(null)}>
              关闭
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* 创建/编辑提醒表单 */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingReminder ? '编辑提醒' : '设置新提醒'}</CardTitle>
            <CardDescription>{editingReminder ? '修改健康提醒的内容' : '创建健康相关的定时提醒'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reminder-type">提醒类型</Label>
                <Select value={reminderType} onValueChange={setReminderType}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择提醒类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medication">服药提醒</SelectItem>
                    <SelectItem value="appointment">体检预约</SelectItem>
                    <SelectItem value="exercise">运动提醒</SelectItem>
                    <SelectItem value="meal">用餐提醒</SelectItem>
                    <SelectItem value="other">其他提醒</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="repeat-interval">重复频率</Label>
                <Select value={repeatInterval} onValueChange={setRepeatInterval}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择重复频率" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不重复</SelectItem>
                    <SelectItem value="daily">每天</SelectItem>
                    <SelectItem value="weekly">每周</SelectItem>
                    <SelectItem value="monthly">每月</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title">提醒标题</Label>
              <Input
                id="title"
                placeholder="请输入提醒标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">提醒内容</Label>
              <Textarea
                id="content"
                placeholder="请输入详细的提醒内容（可选）"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="h-24"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="scheduled-time">提醒时间</Label>
              <Input
                id="scheduled-time"
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="voice-prompt" className="flex items-center">
                语音播报内容
                {isGeneratingVoice && (
                  <RefreshCw className="h-3 w-3 ml-2 animate-spin text-muted-foreground" />
                )}
              </Label>
              <Textarea
                id="voice-prompt"
                placeholder="语音播报内容会根据标题和内容自动生成，您也可以手动修改"
                value={voicePrompt}
                onChange={(e) => setVoicePrompt(e.target.value)}
                className="h-20"
              />
              <p className="text-xs text-muted-foreground">
                此内容将在提醒时间到达时通过语音播报给老人
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline"
                onClick={cancelEdit}
              >
                取消
              </Button>
              <Button 
                onClick={editingReminder ? handleSaveEdit : handleSubmit}
                disabled={submitting || !reminderType || !title.trim() || !scheduledTime}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {editingReminder ? '保存中...' : '设置中...'}
                  </>
                ) : (
                  editingReminder ? '保存修改' : '设置提醒'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 提醒列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>提醒列表</CardTitle>
            <Button variant="outline" size="sm" onClick={loadReminders} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reminders.length > 0 ? (
            <div className="space-y-6">
              {/* 待完成的提醒 */}
              {reminders.filter(r => !r.is_completed).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center">
                    <Bell className="h-4 w-4 mr-2" />
                    待完成 ({reminders.filter(r => !r.is_completed).length})
                  </h3>
                  {reminders.filter(r => !r.is_completed).map((reminder) => (
                    <div 
                      key={reminder.id} 
                      className={`border rounded-lg p-4 ${
                        isOverdue(reminder.scheduled_time) ? 'border-red-200 bg-red-50' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          {isOverdue(reminder.scheduled_time) ? (
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                          ) : (
                            <Bell className="h-5 w-5 text-blue-500 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium">{reminder.title}</h4>
                              <Badge variant="outline" size="sm">
                                {getReminderTypeText(reminder.reminder_type)}
                              </Badge>
                            </div>
                            {reminder.content && (
                              <p className="text-sm mb-2 text-gray-600">{reminder.content}</p>
                            )}
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDateTime(reminder.scheduled_time)}
                              </span>
                              {reminder.repeat_pattern && reminder.repeat_pattern !== 'once' && reminder.repeat_pattern !== 'none' && (
                                <span>重复: {getRepeatText(reminder.repeat_pattern)}</span>
                              )}
                              {isOverdue(reminder.scheduled_time) && (
                                <Badge variant="destructive" size="sm">已逾期</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditReminder(reminder)}
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            title="编辑此提醒"
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            <span className="text-xs">编辑</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateReminderStatus(reminder.id, true)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="标记为已完成"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            <span className="text-xs">完成</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteReminder(reminder.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="删除此提醒"
                          >
                            <X className="h-4 w-4 mr-1" />
                            <span className="text-xs">删除</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 已完成的提醒 */}
              {reminders.filter(r => r.is_completed).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    已完成 ({reminders.filter(r => r.is_completed).length})
                  </h3>
                  {reminders.filter(r => r.is_completed).map((reminder) => (
                    <div 
                      key={reminder.id} 
                      className="border rounded-lg p-4 bg-muted/30 opacity-75"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Check className="h-5 w-5 text-green-500 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-medium line-through text-muted-foreground">{reminder.title}</h4>
                              <Badge variant="outline" size="sm">
                                {getReminderTypeText(reminder.reminder_type)}
                              </Badge>
                            </div>
                            {reminder.content && (
                              <p className="text-sm mb-2 text-muted-foreground">{reminder.content}</p>
                            )}
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDateTime(reminder.scheduled_time)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditReminder(reminder)}
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            title="编辑此提醒"
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            <span className="text-xs">编辑</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateReminderStatus(reminder.id, false)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="恢复为未完成"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            <span className="text-xs">恢复</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteReminder(reminder.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="删除此提醒"
                          >
                            <X className="h-4 w-4 mr-1" />
                            <span className="text-xs">删除</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">暂无提醒事项</p>
              <p className="text-sm">添加健康提醒帮助老人记住重要事情</p>
              <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                创建第一个提醒
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Reminders