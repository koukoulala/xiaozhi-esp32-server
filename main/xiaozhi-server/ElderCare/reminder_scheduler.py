"""
ElderCare 健康提醒调度器
定时检查并触发健康提醒的语音播放

功能：
1. 定时扫描到期的提醒
2. 根据提醒内容生成语音播报文本
3. 通过连接管理器向ESP32设备推送语音提醒
4. 处理重复提醒的下次触发时间计算

作者: assistant  
日期: 2026-01-16
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Callable
import threading

try:
    from config.logger import setup_logging
    logger = setup_logging()
except ImportError:
    import logging
    logger = logging.getLogger(__name__)

TAG = "ElderCare.reminder_scheduler"


class ConnectionManager:
    """
    全局连接管理器
    用于追踪所有活跃的ESP32设备连接，支持向指定设备推送消息
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        
        # 设备连接映射: device_id -> ConnectionHandler
        self.connections: Dict[str, Any] = {}
        # 用户设备映射: user_id -> List[device_id]
        self.user_devices: Dict[int, List[str]] = {}
        self._lock = threading.Lock()
        
        logger.info(f"[{TAG}] ConnectionManager初始化完成")
    
    def register_connection(self, device_id: str, connection_handler, user_id: int = None):
        """注册设备连接"""
        with self._lock:
            self.connections[device_id] = connection_handler
            
            if user_id:
                if user_id not in self.user_devices:
                    self.user_devices[user_id] = []
                if device_id not in self.user_devices[user_id]:
                    self.user_devices[user_id].append(device_id)
            
            logger.info(f"[{TAG}] 设备连接已注册: {device_id}, 用户: {user_id}")
    
    def unregister_connection(self, device_id: str):
        """注销设备连接"""
        with self._lock:
            if device_id in self.connections:
                del self.connections[device_id]
                
                # 从用户设备列表中移除
                for user_id, devices in self.user_devices.items():
                    if device_id in devices:
                        devices.remove(device_id)
                        break
                
                logger.info(f"[{TAG}] 设备连接已注销: {device_id}")
    
    def get_connection(self, device_id: str) -> Optional[Any]:
        """获取设备连接"""
        with self._lock:
            return self.connections.get(device_id)
    
    def get_user_connections(self, user_id: int) -> List[Any]:
        """获取用户的所有设备连接"""
        with self._lock:
            device_ids = self.user_devices.get(user_id, [])
            return [self.connections[d] for d in device_ids if d in self.connections]
    
    def get_all_active_devices(self) -> List[str]:
        """获取所有活跃设备ID"""
        with self._lock:
            return list(self.connections.keys())
    
    def get_connection_count(self) -> int:
        """获取活跃连接数"""
        with self._lock:
            return len(self.connections)


# 全局连接管理器实例
_connection_manager: Optional[ConnectionManager] = None


def get_connection_manager() -> ConnectionManager:
    """获取全局连接管理器实例"""
    global _connection_manager
    if _connection_manager is None:
        _connection_manager = ConnectionManager()
    return _connection_manager


class ReminderScheduler:
    """
    健康提醒定时调度器
    
    功能：
    - 定时检查到期的提醒
    - 根据提醒类型和内容生成播报文本
    - 向设备推送语音提醒
    - 处理重复提醒
    """
    
    def __init__(self, eldercare_api, check_interval: int = 60):
        """
        初始化调度器
        
        Args:
            eldercare_api: ElderCareAPI实例
            check_interval: 检查间隔（秒），默认60秒
        """
        self.eldercare_api = eldercare_api
        self.check_interval = check_interval
        self.connection_manager = get_connection_manager()
        
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        
        # 提醒类型对应的播报模板
        self.reminder_templates = {
            'medication': "您好，现在是{title}时间了。{content}请记得按时服药，保持身体健康。",
            'health_check': "您好，{title}的时间到了。{content}定期检查有助于了解您的身体状况。",
            'exercise': "您好，是时候{title}了。{content}适当运动有益身心健康。",
            'meal': "您好，{title}时间到了。{content}按时用餐很重要，祝您用餐愉快。",
            'water': "您好，该喝水了。{content}保持充足的水分摄入对健康很重要。",
            'rest': "您好，{title}时间到了。{content}充足的休息对身体恢复很重要。",
            'appointment': "您好，提醒您{title}。{content}请做好准备，不要错过。",
            'other': "您好，{title}。{content}"
        }
        
        logger.info(f"[{TAG}] ReminderScheduler初始化完成，检查间隔: {check_interval}秒")
    
    async def start(self):
        """启动调度器"""
        if self._running:
            logger.warning(f"[{TAG}] 调度器已在运行中")
            return
        
        self._running = True
        self._loop = asyncio.get_event_loop()
        
        # 启动时先刷新过期的重复提醒的 scheduled_time
        await self._refresh_expired_repeat_reminders()
        
        self._task = asyncio.create_task(self._scheduler_loop())
        
        logger.info(f"[{TAG}] ✅ 提醒调度器已启动")
    
    async def stop(self):
        """停止调度器"""
        self._running = False
        
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        
        logger.info(f"[{TAG}] 提醒调度器已停止")
    
    async def _scheduler_loop(self):
        """调度器主循环"""
        logger.info(f"[{TAG}] 调度器循环已启动")
        
        while self._running:
            try:
                await self._check_and_trigger_reminders()
            except Exception as e:
                logger.error(f"[{TAG}] 调度器循环错误: {e}")
            
            # 等待下次检查
            await asyncio.sleep(self.check_interval)
    
    async def _refresh_expired_repeat_reminders(self):
        """
        刷新过期的重复提醒的 scheduled_time
        
        场景：服务器关机期间，某些重复提醒的 scheduled_time 已经过期，
        启动时需要将它们更新到下一个有效的触发时间
        """
        try:
            conn = self.eldercare_api.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            now = datetime.now()
            
            # 查询所有过期的、未完成的、重复提醒
            sql = """
            SELECT id, scheduled_time, repeat_pattern, repeat_config
            FROM ec_reminders
            WHERE status = 'active'
              AND is_completed = 0
              AND repeat_pattern NOT IN ('once', 'none')
              AND scheduled_time < %s
            """
            
            cursor.execute(sql, (now,))
            expired_reminders = cursor.fetchall()
            
            if not expired_reminders:
                logger.info(f"[{TAG}] 没有需要刷新的过期重复提醒")
                cursor.close()
                conn.close()
                return
            
            logger.info(f"[{TAG}] 发现 {len(expired_reminders)} 个过期的重复提醒，正在刷新...")
            
            updated_count = 0
            for reminder in expired_reminders:
                next_time = self._calculate_next_valid_time(reminder, now)
                
                if next_time:
                    update_sql = """
                    UPDATE ec_reminders 
                    SET scheduled_time = %s, update_date = NOW() 
                    WHERE id = %s
                    """
                    cursor.execute(update_sql, (next_time, reminder['id']))
                    updated_count += 1
                    logger.debug(f"[{TAG}] 提醒 #{reminder['id']} scheduled_time 更新为: {next_time}")
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"[{TAG}] ✅ 已刷新 {updated_count} 个过期重复提醒的 scheduled_time")
            
        except Exception as e:
            logger.error(f"[{TAG}] 刷新过期重复提醒错误: {e}")
    
    def _calculate_next_valid_time(self, reminder: Dict[str, Any], reference_time: datetime) -> Optional[datetime]:
        """
        计算下一个有效的触发时间（相对于参考时间）
        
        Args:
            reminder: 提醒数据
            reference_time: 参考时间（通常是当前时间）
            
        Returns:
            下一个有效的触发时间
        """
        try:
            repeat_pattern = reminder.get('repeat_pattern', 'once')
            scheduled_time = reminder.get('scheduled_time')
            
            if isinstance(scheduled_time, str):
                scheduled_time = datetime.fromisoformat(scheduled_time)
            
            if repeat_pattern == 'daily':
                interval = timedelta(days=1)
            elif repeat_pattern == 'weekly':
                interval = timedelta(weeks=1)
            elif repeat_pattern == 'monthly':
                interval = timedelta(days=30)
            elif repeat_pattern == 'hourly':
                interval = timedelta(hours=1)
            else:
                # 尝试从 repeat_config 获取间隔
                repeat_config = reminder.get('repeat_config', {})
                if isinstance(repeat_config, str):
                    repeat_config = json.loads(repeat_config) if repeat_config else {}
                
                interval_hours = repeat_config.get('interval_hours')
                if interval_hours:
                    interval = timedelta(hours=interval_hours)
                else:
                    return None
            
            # 循环计算直到找到下一个未来的时间
            next_time = scheduled_time
            while next_time <= reference_time:
                next_time += interval
            
            return next_time
            
        except Exception as e:
            logger.error(f"[{TAG}] 计算下一个有效时间错误: {e}")
            return None

    async def _check_and_trigger_reminders(self):
        """检查并触发到期的提醒"""
        try:
            conn = self.eldercare_api.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            now = datetime.now()
            # 查询最近2分钟内到期且未完成的活跃提醒
            # 通过 scheduled_time 字段判断提醒时间
            sql = """
            SELECT 
                r.id, r.user_id,
                r.reminder_type, r.title, r.content, r.voice_prompt,
                r.scheduled_time, r.repeat_pattern, r.repeat_config,
                r.tts_enabled, r.priority,
                u.elder_name
            FROM ec_reminders r
            LEFT JOIN ec_users u ON r.user_id = u.id
            WHERE r.status = 'active' 
              AND r.is_completed = 0
              AND r.scheduled_time <= %s
              AND r.scheduled_time > %s
            ORDER BY r.priority DESC, r.scheduled_time ASC
            """
            
            # 查询窗口：当前时间前2分钟到当前时间
            window_start = now - timedelta(minutes=2)
            cursor.execute(sql, (now, window_start))
            due_reminders = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            if due_reminders:
                logger.info(f"[{TAG}] 发现 {len(due_reminders)} 个到期提醒")
                
                for reminder in due_reminders:
                    await self._trigger_reminder(reminder)
            
        except Exception as e:
            logger.error(f"[{TAG}] 检查提醒错误: {e}")
    
    async def _trigger_reminder(self, reminder: Dict[str, Any]):
        """触发单个提醒"""
        try:
            reminder_id = reminder['id']
            user_id = reminder['user_id']
            
            # 直接使用 voice_prompt 作为播报文本（前端已生成好）
            voice_text = reminder.get('voice_prompt', '')
            
            # 如果 voice_prompt 为空，使用标题和内容拼接
            if not voice_text:
                title = reminder.get('title', '提醒')
                content = reminder.get('content', '')
                voice_text = f"您好，{title}。{content}" if content else f"您好，{title}时间到了。"
            
            logger.info(f"[{TAG}] 触发提醒 #{reminder_id}: {voice_text[:50]}...")
            
            # 获取用户的设备连接
            connections = self.connection_manager.get_user_connections(user_id)
            
            if connections:
                # 向所有连接的设备发送语音提醒
                success_count = 0
                for conn in connections:
                    try:
                        await self._send_voice_reminder(conn, voice_text, reminder)
                        success_count += 1
                    except Exception as e:
                        logger.error(f"[{TAG}] 发送提醒到设备失败: {e}")
                
                if success_count > 0:
                    logger.info(f"[{TAG}] 提醒 #{reminder_id} 已发送到 {success_count} 个设备")
                    # 更新提醒状态
                    await self._update_reminder_triggered(reminder)
            else:
                # 设备离线，缓存提醒待下次连接时播放
                logger.warning(f"[{TAG}] 用户 {user_id} 无在线设备，提醒 #{reminder_id} 已缓存")
                await self._cache_pending_reminder(reminder)
            
        except Exception as e:
            logger.error(f"[{TAG}] 触发提醒错误: {e}")
    
    def _generate_voice_text(self, reminder: Dict[str, Any], elder_name: str = "您") -> str:
        """
        备用方法：根据提醒内容生成语音播报文本（正常情况下使用voice_prompt）
        
        Args:
            reminder: 提醒数据
            elder_name: 老人姓名
            
        Returns:
            生成的语音文本
        """
        reminder_type = reminder.get('reminder_type', 'other')
        title = reminder.get('title', '提醒')
        content = reminder.get('content', '')
        voice_prompt = reminder.get('voice_prompt', '')
        
        # 优先使用自定义的voice_prompt
        if voice_prompt and voice_prompt.strip():
            # 替换占位符
            voice_text = voice_prompt.replace('{name}', elder_name)
            voice_text = voice_text.replace('{title}', title)
            return voice_text
        
        # 使用模板生成
        template = self.reminder_templates.get(reminder_type, self.reminder_templates['other'])
        
        # 处理内容
        if content and content.strip():
            content = content.strip()
            if not content.endswith('。') and not content.endswith('！') and not content.endswith('？'):
                content += '。'
        else:
            content = ''
        
        # 生成文本
        voice_text = template.format(
            name=elder_name,
            title=title,
            content=content
        )
        
        # 清理多余的空格和标点
        voice_text = voice_text.replace('。。', '。').replace('  ', ' ')
        
        return voice_text
    
    async def _send_voice_reminder(self, connection, voice_text: str, reminder: Dict[str, Any]):
        """
        向设备发送语音提醒
        
        这个方法会通过ConnectionHandler的TTS系统播放语音
        """
        try:
            # 发送提醒开始消息
            await connection.send_message({
                'type': 'reminder_notification',
                'reminder_id': reminder['id'],
                'title': reminder['title'],
                'content': voice_text,
                'priority': reminder.get('priority', 'medium'),
                'timestamp': datetime.now().isoformat()
            })
            
            # 通过TTS播放语音
            # 注意：这里需要使用ConnectionHandler的TTS系统
            if hasattr(connection, 'tts') and connection.tts:
                # 将文本放入TTS队列
                from core.providers.tts.dto.dto import ContentType, TTSMessageDTO, SentenceType
                
                tts_message = TTSMessageDTO(
                    content_type=ContentType.text,
                    content=voice_text,
                    sentence_type=SentenceType.FULL,
                    is_last=True
                )
                
                connection.tts.tts_text_queue.put(tts_message)
                logger.info(f"[{TAG}] 语音提醒已加入TTS队列: {voice_text[:30]}...")
            else:
                # 如果TTS不可用，发送文本消息
                await connection.send_message({
                    'type': 'tts',
                    'state': 'start',
                    'text': voice_text
                })
                logger.warning(f"[{TAG}] TTS不可用，已发送文本消息")
            
        except Exception as e:
            logger.error(f"[{TAG}] 发送语音提醒错误: {e}")
            raise
    
    async def _update_reminder_triggered(self, reminder: Dict[str, Any]):
        """更新提醒触发状态，包括last_triggered_time和snooze_count"""
        try:
            conn = self.eldercare_api.get_connection()
            cursor = conn.cursor()
            
            reminder_id = reminder['id']
            repeat_pattern = reminder.get('repeat_pattern', 'once')
            
            # 首先更新last_triggered_time（无论是一次性还是重复提醒）
            self.eldercare_api.mark_reminder_triggered(reminder_id)
            
            if repeat_pattern == 'once' or repeat_pattern == 'none':
                # 一次性提醒，标记为已完成
                sql = """
                UPDATE ec_reminders 
                SET is_completed = 1, 
                    completed_time = NOW(),
                    status = 'completed',
                    update_date = NOW() 
                WHERE id = %s
                """
                cursor.execute(sql, (reminder_id,))
                logger.info(f"[{TAG}] 一次性提醒 #{reminder_id} 已标记为完成")
            else:
                # 重复提醒，计算下次触发时间
                next_time = self._calculate_next_trigger_time(reminder)
                if next_time:
                    sql = """
                    UPDATE ec_reminders 
                    SET scheduled_time = %s,
                        update_date = NOW() 
                    WHERE id = %s
                    """
                    cursor.execute(sql, (next_time, reminder_id))
                    logger.info(f"[{TAG}] 重复提醒 #{reminder_id} 下次触发时间: {next_time}")
                else:
                    # 无法计算下次时间，标记为完成
                    sql = """
                    UPDATE ec_reminders 
                    SET is_completed = 1,
                        completed_time = NOW(),
                        status = 'completed',
                        update_date = NOW() 
                    WHERE id = %s
                    """
                    cursor.execute(sql, (reminder_id,))
            
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"[{TAG}] 更新提醒状态错误: {e}")
    
    def _calculate_next_trigger_time(self, reminder: Dict[str, Any]) -> Optional[datetime]:
        """计算重复提醒的下次触发时间"""
        try:
            repeat_pattern = reminder.get('repeat_pattern', 'once')
            scheduled_time = reminder.get('scheduled_time')
            
            if isinstance(scheduled_time, str):
                scheduled_time = datetime.fromisoformat(scheduled_time)
            
            if repeat_pattern == 'daily':
                return scheduled_time + timedelta(days=1)
            elif repeat_pattern == 'weekly':
                return scheduled_time + timedelta(weeks=1)
            elif repeat_pattern == 'monthly':
                # 简单处理：加30天
                return scheduled_time + timedelta(days=30)
            elif repeat_pattern == 'hourly':
                return scheduled_time + timedelta(hours=1)
            else:
                # 尝试解析repeat_config
                repeat_config = reminder.get('repeat_config', {})
                if isinstance(repeat_config, str):
                    repeat_config = json.loads(repeat_config)
                
                interval_hours = repeat_config.get('interval_hours')
                if interval_hours:
                    return scheduled_time + timedelta(hours=interval_hours)
            
            return None
            
        except Exception as e:
            logger.error(f"[{TAG}] 计算下次触发时间错误: {e}")
            return None
    
    async def _cache_pending_reminder(self, reminder: Dict[str, Any]):
        """缓存待发送的提醒（设备离线时）"""
        try:
            conn = self.eldercare_api.get_connection()
            cursor = conn.cursor()
            
            # 将提醒标记为待发送状态
            sql = """
            UPDATE ec_reminders 
            SET status = 'pending_delivery',
                update_date = NOW() 
            WHERE id = %s
            """
            cursor.execute(sql, (reminder['id'],))
            
            cursor.close()
            conn.close()
            
            logger.info(f"[{TAG}] 提醒 #{reminder['id']} 已标记为待发送")
            
        except Exception as e:
            logger.error(f"[{TAG}] 缓存待发送提醒错误: {e}")
    
    async def check_pending_reminders_for_user(self, user_id: int, connection):
        """
        检查用户的待发送提醒（设备上线时调用）
        
        Args:
            user_id: 用户ID
            connection: 设备连接
        """
        try:
            conn = self.eldercare_api.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 查询待发送的提醒
            sql = """
            SELECT 
                r.id, r.user_id, r.reminder_type, r.title, r.content, 
                r.voice_prompt, r.scheduled_time, r.priority,
                u.elder_name
            FROM ec_reminders r
            LEFT JOIN ec_users u ON r.user_id = u.id
            WHERE r.user_id = %s 
              AND r.status = 'pending_delivery'
              AND r.is_completed = 0
            ORDER BY r.scheduled_time ASC
            LIMIT 5
            """
            
            cursor.execute(sql, (user_id,))
            pending_reminders = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            if pending_reminders:
                logger.info(f"[{TAG}] 用户 {user_id} 有 {len(pending_reminders)} 个待发送提醒")
                
                for reminder in pending_reminders:
                    elder_name = reminder.get('elder_name', '您')
                    voice_text = self._generate_voice_text(reminder, elder_name)
                    
                    try:
                        await self._send_voice_reminder(connection, voice_text, reminder)
                        
                        # 更新状态为已发送
                        await self._mark_reminder_delivered(reminder['id'])
                        
                    except Exception as e:
                        logger.error(f"[{TAG}] 发送待发送提醒失败: {e}")
            
        except Exception as e:
            logger.error(f"[{TAG}] 检查待发送提醒错误: {e}")
    
    async def _mark_reminder_delivered(self, reminder_id: int):
        """标记提醒为已发送"""
        try:
            conn = self.eldercare_api.get_connection()
            cursor = conn.cursor()
            
            sql = """
            UPDATE ec_reminders 
            SET status = 'active',
                is_completed = 1,
                completed_time = NOW(),
                update_date = NOW() 
            WHERE id = %s
            """
            cursor.execute(sql, (reminder_id,))
            
            cursor.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"[{TAG}] 标记提醒已发送错误: {e}")


# 全局调度器实例
_reminder_scheduler: Optional[ReminderScheduler] = None


def get_reminder_scheduler() -> Optional[ReminderScheduler]:
    """获取全局调度器实例"""
    return _reminder_scheduler


async def init_reminder_scheduler(eldercare_api, check_interval: int = 60) -> ReminderScheduler:
    """
    初始化并启动提醒调度器
    
    Args:
        eldercare_api: ElderCareAPI实例
        check_interval: 检查间隔（秒）
        
    Returns:
        ReminderScheduler实例
    """
    global _reminder_scheduler
    
    if _reminder_scheduler is None:
        _reminder_scheduler = ReminderScheduler(eldercare_api, check_interval)
        await _reminder_scheduler.start()
    
    return _reminder_scheduler


async def stop_reminder_scheduler():
    """停止提醒调度器"""
    global _reminder_scheduler
    
    if _reminder_scheduler:
        await _reminder_scheduler.stop()
        _reminder_scheduler = None
