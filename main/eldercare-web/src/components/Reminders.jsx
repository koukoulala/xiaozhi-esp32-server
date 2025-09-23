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
  X
} from 'lucide-react'
import ElderCareAPI from '@/services/api.js'

function Reminders() {
  const [reminderType, setReminderType] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [repeatInterval, setRepeatInterval] = useState('none')
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  
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
        is_active: true
      }
      
      const response = await ElderCareAPI.createHealthReminder(reminderData)
      
      if (response.success) {
        // 重置表单并刷新列表
        setReminderType('')
        setTitle('')
        setContent('')
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
      const response = await fetch(`http://localhost:8003/eldercare/reminder/update-status/${reminderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_completed: isCompleted })
      })

      const data = await response.json()
      if (data.success) {
        loadReminders() // 刷新列表
      } else {
        alert(`更新状态失败: ${data.message}`)
      }
    } catch (err) {
      console.error('更新提醒状态失败:', err)
      // 本地更新状态
      setReminders(prev => prev.map(reminder => 
        reminder.id === reminderId 
          ? { ...reminder, is_completed: isCompleted }
          : reminder
      ))
    }
  }

  const deleteReminder = async (reminderId) => {
    if (!confirm('确定要删除这个提醒吗？')) {
      return
    }

    try {
      const response = await fetch(`http://localhost:8003/eldercare/reminder/delete/${reminderId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        loadReminders()
        alert('提醒已删除')
      } else {
        alert(`删除失败: ${data.message}`)
      }
    } catch (err) {
      console.error('删除提醒失败:', err)
      alert('删除失败，请稍后重试')
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
      
      {/* 创建提醒表单 */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>设置新提醒</CardTitle>
            <CardDescription>创建健康相关的定时提醒</CardDescription>
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
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                取消
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={submitting || !reminderType || !title.trim() || !scheduledTime}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    设置中...
                  </>
                ) : (
                  '设置提醒'
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
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div 
                  key={reminder.id} 
                  className={`border rounded-lg p-4 ${reminder.is_completed ? 'bg-muted/30' : ''} ${
                    isOverdue(reminder.scheduled_time) && !reminder.is_completed ? 'border-red-200 bg-red-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3">
                      {reminder.is_completed ? (
                        <Check className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : isOverdue(reminder.scheduled_time) ? (
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      ) : (
                        <Bell className="h-5 w-5 text-blue-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={`font-medium ${reminder.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                            {reminder.title}
                          </h4>
                          <Badge variant="outline" size="sm">
                            {getReminderTypeText(reminder.reminder_type)}
                          </Badge>
                        </div>
                        {reminder.content && (
                          <p className={`text-sm mb-2 ${reminder.is_completed ? 'text-muted-foreground' : 'text-gray-600'}`}>
                            {reminder.content}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDateTime(reminder.scheduled_time)}
                          </span>
                          {reminder.repeat_interval && reminder.repeat_interval !== 'none' && (
                            <span>重复: {getRepeatText(reminder.repeat_interval)}</span>
                          )}
                          {isOverdue(reminder.scheduled_time) && !reminder.is_completed && (
                            <Badge variant="destructive" size="sm">已逾期</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {!reminder.is_completed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReminderStatus(reminder.id, true)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {reminder.is_completed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReminderStatus(reminder.id, false)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteReminder(reminder.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
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