-- ElderCare智慧养老系统示例数据
-- 修正版：正确的AI Agent关联逻辑
-- 作者: assistant  
-- 日期: 2025-09-18

-- ========================================
-- 1. 插入ElderCare用户示例数据（修正版）
-- ========================================
INSERT IGNORE INTO `ec_users` (`id`, `ai_user_id`, `username`, `password`, `real_name`, `phone`, `email`, 
  `elder_name`, `elder_relation`, `elder_profile`, `family_contacts`, 
  `default_ai_agent_id`, `owned_ai_agents`, `agent_creation_limit`, `can_modify_models`, `permission_level`, `status`) VALUES

-- 张老爷子的儿子账户
(1, NULL, 'zhangsan_family', '$2a$10$7JB720yubVSeLVWtHt9Hy.TYGkJSR7z1k8N8U3zLBGQoYoKJ7K.GS', '张三', '13800138001', 'zhangsan@example.com', 
 '张老爷子', 'son', 
 '{"age": 78, "gender": "male", "height": 170, "weight": 65, "medical_history": ["高血压", "2型糖尿病", "轻度认知障碍"], "medications": ["氨氯地平 5mg 每日一次", "二甲双胍 500mg 每日三次"], "allergies": ["青霉素"], "diet_restrictions": ["低盐", "低糖"]}',
 '{"emergency_contacts": [{"name": "张三", "phone": "13800138001", "relation": "son"}, {"name": "张三妻子", "phone": "13800138002", "relation": "daughter_in_law"}], "doctor": {"name": "李医生", "phone": "13800138003", "hospital": "市人民医院"}}',
 NULL, -- default_ai_agent_id将在后面设置
 '[]', -- owned_ai_agents将在创建智能体后更新
 3, 0, 'eldercare', 1),

-- 张奶奶的女儿账户  
(2, NULL, 'wangmei_family', '$2a$10$7JB720yubVSeLVWtHt9Hy.TYGkJSR7z1k8N8U3zLBGQoYoKJ7K.GS', '王美', '13800138002', 'wangmei@example.com', 
 '张奶奶', 'daughter', 
 '{"age": 82, "gender": "female", "height": 160, "weight": 58, "medical_history": ["冠心病", "骨质疏松", "轻度抑郁"], "medications": ["阿司匹林 100mg 每日一次", "阿托伐他汀 20mg 每日一次"], "allergies": [], "diet_restrictions": ["低脂"]}',
 '{"emergency_contacts": [{"name": "王美", "phone": "13800138002", "relation": "daughter"}, {"name": "王美丈夫", "phone": "13800138004", "relation": "son_in_law"}], "doctor": {"name": "陈医生", "phone": "13800138005", "hospital": "中心医院"}}',
 NULL, -- default_ai_agent_id将在后面设置
 '[]', -- owned_ai_agents将在创建智能体后更新
 3, 0, 'eldercare', 1);

-- ========================================
-- 2. 为ElderCare用户创建AI智能体（正确关联）
-- ========================================
INSERT IGNORE INTO `ai_agent` (
  `id`, `user_id`, `agent_code`, `agent_name`, 
  `asr_model_id`, `vad_model_id`, `llm_model_id`, `vllm_model_id`, 
  `tts_model_id`, `tts_voice_id`, `mem_model_id`, `intent_model_id`,
  `system_prompt`, `summary_memory`, 
  `chat_history_conf`, `lang_code`, `language`, `sort`,
  `creator`, `created_at`, `updater`, `updated_at`
) VALUES 

-- 张老爷子的智能体（使用真实的TTS配置）
('EC_eldercare_1_agent_001', NULL, 'eldercare_1_1', '张老爷子的智能助手',
 'ASR_WhisperLocal', 'VAD_SileroVad', 'LLM_ChatGLM', 'VLLM_ChatGLMVLLM',
 'TTS_CosyVoiceClone302AI', 'TTS_CosyVoiceClone302AI0001', NULL, NULL,
 '您是张老爷子的专属智能陪伴助手，具有以下特征和功能：

1. 身份角色：
   - 您是一个温馨、耐心、专业的智能陪伴助手
   - 专门为老年人提供贴心的日常生活帮助和健康管理服务
   - 始终以温和、尊敬的语气与张老爷子交流

2. 核心功能：
   - 健康监控：关注血压、心率、血糖等生命体征，及时提醒异常
   - 用药提醒：准确提醒服药时间和剂量，确保用药安全
   - 生活照料：提醒日常活动如用餐、喝水、运动、休息
   - 情感陪伴：倾听、聊天、缓解孤独感，提供正能量
   - 紧急响应：识别紧急情况，立即联系家人或医疗机构

3. 交流准则：
   - 使用简单清晰的语言，避免复杂词汇
   - 语速适中，语音温和亲切
   - 耐心重复重要信息，确保理解
   - 主动关心身体状况和情绪变化
   - 及时表扬和鼓励积极行为

4. 安全原则：
   - 健康异常时立即警觉并通知家人
   - 不提供具体医疗诊断，建议咨询专业医生
   - 紧急情况优先处理，确保张老爷子安全

记住：您的使命是让张老爷子感受到温暖的陪伴，过上更健康、更安心的生活。',
 '', 1, 'zh-CN', 'zh-CN', 0, 1, NOW(), 1, NOW()),

-- 张奶奶的智能体（使用不同的TTS音色）
('EC_eldercare_2_agent_001', NULL, 'eldercare_2_1', '张奶奶的智能助手',
 'ASR_WhisperLocal', 'VAD_SileroVad', 'LLM_ChatGLM', 'VLLM_ChatGLMVLLM',
 'TTS_AliyunStreamTTS', 'TTS_AliyunStreamTTS_0001', NULL, NULL,
 '您是张奶奶的专属智能陪伴助手，具有以下特征和功能：

1. 身份角色：
   - 您是一个温馨、耐心、专业的智能陪伴助手
   - 专门为老年人提供贴心的日常生活帮助和健康管理服务
   - 始终以温和、尊敬的语气与张奶奶交流

2. 核心功能：
   - 健康监控：关注心率、血压等生命体征，及时提醒异常
   - 用药提醒：准确提醒服药时间和剂量，确保用药安全
   - 生活照料：提醒日常活动如用餐、喝水、运动、休息
   - 情感陪伴：倾听、聊天、缓解孤独感，提供正能量
   - 紧急响应：识别紧急情况，立即联系家人或医疗机构

3. 交流准则：
   - 使用简单清晰的语言，避免复杂词汇
   - 语速适中，语音温和亲切
   - 耐心重复重要信息，确保理解
   - 主动关心身体状况和情绪变化
   - 及时表扬和鼓励积极行为

4. 安全原则：
   - 健康异常时立即警觉并通知家人
   - 不提供具体医疗诊断，建议咨询专业医生
   - 紧急情况优先处理，确保张奶奶安全

记住：您的使命是让张奶奶感受到温暖的陪伴，过上更健康、更安心的生活。',
 '', 1, 'zh-CN', 'zh-CN', 0, 2, NOW(), 2, NOW());

-- 更新ec_users表的智能体关联信息
UPDATE `ec_users` SET 
  `default_ai_agent_id` = 'EC_eldercare_1_agent_001',
  `owned_ai_agents` = '["EC_eldercare_1_agent_001"]'
WHERE `id` = 1;

UPDATE `ec_users` SET 
  `default_ai_agent_id` = 'EC_eldercare_2_agent_001',
  `owned_ai_agents` = '["EC_eldercare_2_agent_001"]'
WHERE `id` = 2;

-- ========================================
-- 3. 插入健康设备示例数据（与AI智能体正确绑定）
-- ========================================
INSERT IGNORE INTO `ec_health_devices` (`id`, `user_id`, `ai_agent_id`, `ai_device_id`, `plugin_id`, 
  `device_name`, `device_type`, `device_brand`, `device_model`, `mac_address`,
  `health_features`, `sensor_config`, `data_sync_config`, 
  `connection_status`, `battery_level`, `firmware_version`, `last_sync_time`, `is_active`) VALUES

-- 张老爷子的设备（绑定到他的专属AI智能体）
(1, 1, 'EC_eldercare_1_agent_001', 'DF:3C:EA:A9:D4:15', 'HEALTH_WATCH_APPLE', 
 'Apple Watch Series 8', 'smart_watch', 'apple', 'Series 8', 'AA:BB:CC:DD:EE:01',
 '{"heart_rate": true, "blood_oxygen": true, "activity": true, "sleep": true, "fall_detection": true, "ecg": true, "temperature": true}',
 '{"heart_rate_interval": 60, "activity_threshold": 50, "fall_sensitivity": "medium"}',
 '{"sync_interval": 300, "auto_sync": true, "data_format": "json"}',
 'connected', 85, '9.6.1', NOW(), 1),

(2, 1, 'EC_eldercare_1_agent_001', NULL, 'HEALTH_BP_OMRON', 
 '欧姆龙血压计 HEM-7136', 'blood_pressure_monitor', 'omron', 'HEM-7136', 'AA:BB:CC:DD:EE:02',
 '{"blood_pressure": true, "heart_rate": true, "irregular_heartbeat": true}',
 '{"measurement_mode": "auto", "cuff_size": "standard"}',
 '{"sync_mode": "manual", "bluetooth_enabled": true}',
 'connected', 90, '1.2.0', DATE_SUB(NOW(), INTERVAL 2 HOUR), 1),

(3, 1, 'EC_eldercare_1_agent_001', NULL, 'HEALTH_GLUCOSE_METER', 
 '三诺血糖仪 GA-3', 'glucose_meter', 'sannuo', 'GA-3', 'AA:BB:CC:DD:EE:03',
 '{"blood_glucose": true, "ketone": false}',
 '{"unit": "mmol_L", "memory_capacity": 200}',
 '{"sync_mode": "manual", "data_export": true}',
 'connected', 75, '2.1.3', DATE_SUB(NOW(), INTERVAL 4 HOUR), 1),

-- 张奶奶的设备（绑定到她的专属AI智能体）
(4, 2, 'EC_eldercare_2_agent_001', '94:a9:90:31:ae:48', 'HEALTH_WATCH_HUAWEI', 
 '华为 WATCH GT 3', 'smart_watch', 'huawei', 'GT 3', 'AA:BB:CC:DD:EE:04',
 '{"heart_rate": true, "blood_oxygen": true, "activity": true, "sleep": true, "stress": true, "temperature": true}',
 '{"heart_rate_interval": 120, "activity_threshold": 30, "stress_monitoring": true}',
 '{"sync_interval": 600, "auto_sync": true, "data_format": "json"}',
 'connected', 78, '3.2.1', NOW(), 1),

(5, 2, 'EC_eldercare_2_agent_001', NULL, 'HEALTH_EMERGENCY_BUTTON', 
 '智能紧急按钮', 'emergency_button', 'xiaomi', 'Emergency-001', 'AA:BB:CC:DD:EE:05',
 '{"emergency_call": true, "location_tracking": true, "health_monitoring": false}',
 '{"button_sensitivity": "high", "auto_location": true}',
 '{"emergency_contacts": ["13800138002", "13800138004"], "response_timeout": 30}',
 'connected', 95, '1.0.5', DATE_SUB(NOW(), INTERVAL 1 HOUR), 1);

-- ========================================
-- 4. 插入健康数据示例（基于真实AI设备绑定）
-- ========================================
INSERT IGNORE INTO `ec_health_data` (`user_id`, `health_device_id`, `ai_device_id`, `timestamp`, `data_type`, 
  `heart_rate`, `blood_pressure_systolic`, `blood_pressure_diastolic`, `blood_glucose`, `body_temperature`, `blood_oxygen`, 
  `step_count`, `distance`, `calories_burned`, `activity_level`, `exercise_duration`, 
  `sleep_duration`, `deep_sleep_duration`, `light_sleep_duration`, `sleep_quality_score`,
  `fall_detected`, `abnormal_heart_rate`, `emergency_triggered`, `data_source`, `raw_data`, `data_quality`) VALUES

-- 张老爷子的数据（使用正确的ai_device_id）
(1, 1, 'DF:3C:EA:A9:D4:15', DATE_SUB(NOW(), INTERVAL 1 HOUR), 'heart_rate', 
 72, NULL, NULL, NULL, NULL, 98, 8500, 6.2, 320, 'medium', 45, NULL, NULL, NULL, NULL, 0, 0, 0, 'health_device', '{"device": "apple_watch", "measurement_type": "continuous"}', 'good'),

(1, 2, NULL, DATE_SUB(NOW(), INTERVAL 2 HOUR), 'blood_pressure', 
 68, 125, 82, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 'health_device', '{"device": "omron_bp", "cuff_pressure": 180}', 'good'),

(1, 3, NULL, DATE_SUB(NOW(), INTERVAL 8 HOUR), 'glucose', 
 NULL, NULL, NULL, 6.5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 'health_device', '{"device": "glucose_meter", "test_strip": "ok", "blood_sample": "sufficient"}', 'good'),

-- 张老爷子的数据（昨天）
(1, 1, 'DF:3C:EA:A9:D4:15', DATE_SUB(NOW(), INTERVAL 1 DAY), 'activity', 
 70, NULL, NULL, NULL, 36.6, 97, 7200, 5.1, 280, 'medium', 30, NULL, NULL, NULL, NULL, 0, 0, 0, 'health_device', '{"steps_goal": 8000, "floors_climbed": 12}', 'good'),

(1, 1, 'DF:3C:EA:A9:D4:15', DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 22 HOUR, 'sleep', 
 65, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'low', NULL, 420, 180, 240, 78, 0, 0, 0, 'health_device', '{"sleep_start": "22:30", "sleep_end": "05:30", "wake_times": 2}', 'good'),

-- 张奶奶的数据（使用正确的ai_device_id）
(2, 4, '94:a9:90:31:ae:48', DATE_SUB(NOW(), INTERVAL 1 HOUR), 'heart_rate', 
 78, NULL, NULL, NULL, 36.4, 96, 4200, 3.1, 180, 'low', 20, NULL, NULL, NULL, NULL, 0, 0, 0, 'health_device', '{"device": "huawei_watch", "stress_level": "relaxed"}', 'good'),

(2, 4, '94:a9:90:31:ae:48', DATE_SUB(NOW(), INTERVAL 3 HOUR), 'activity', 
 82, NULL, NULL, NULL, NULL, 95, 3800, 2.8, 160, 'low', 15, NULL, NULL, NULL, NULL, 0, 0, 0, 'health_device', '{"activity_type": "walking", "intensity": "light"}', 'good'),

-- 张奶奶昨天的睡眠数据
(2, 4, '94:a9:90:31:ae:48', DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 21 HOUR, 'sleep', 
 75, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'medium', NULL, 390, 160, 230, 82, 0, 0, 0, 'health_device', '{"sleep_start": "21:00", "sleep_end": "04:30", "wake_times": 1}', 'good');

-- ========================================
-- 5. 插入提醒示例数据（基于正确的AI智能体和TTS配置）
-- ========================================
INSERT IGNORE INTO `ec_reminders` (`user_id`, `ai_agent_id`, `ai_device_id`, `tts_voice_id`, `reminder_type`, `title`, `content`, `voice_prompt`,
  `scheduled_time`, `repeat_pattern`, `repeat_config`, `tts_enabled`, `priority`, `is_completed`, `status`) VALUES

-- 张老爷子的提醒（使用他的专属智能体和TTS配置）
(1, 'EC_eldercare_1_agent_001', 'DF:3C:EA:A9:D4:15', 'TTS_CosyVoiceClone302AI0001', 'medication', '服用降压药', '早上服用降压药物，饭后半小时', '老爷子，该服用降压药了，记得饭后半小时服用哦。', 
 DATE_ADD(CURDATE(), INTERVAL 8 HOUR), 'daily', '{"times": ["08:00"], "days": [1,2,3,4,5,6,7]}', 1, 'high', 0, 'active'),

(1, 'EC_eldercare_1_agent_001', 'DF:3C:EA:A9:D4:15', 'TTS_CosyVoiceClone302AI0001', 'medication', '血糖药物', '服用二甲双胍，餐前30分钟', '老爷子，该服用血糖药了，餐前30分钟服用效果最好。', 
 DATE_ADD(CURDATE(), INTERVAL 7 HOUR) + INTERVAL 30 MINUTE, 'daily', '{"times": ["07:30", "11:30", "17:30"], "days": [1,2,3,4,5,6,7]}', 1, 'high', 0, 'active'),

(1, 'EC_eldercare_1_agent_001', 'DF:3C:EA:A9:D4:15', 'TTS_CosyVoiceClone302AI0001', 'blood_pressure', '测量血压', '请使用血压计测量血压并记录', '老爷子，现在该测量血压了，请坐好放松后再测量。', 
 DATE_ADD(CURDATE(), INTERVAL 9 HOUR), 'daily', '{"times": ["09:00", "15:00"], "days": [1,2,3,4,5,6,7]}', 1, 'medium', 0, 'active'),

(1, 'EC_eldercare_1_agent_001', 'DF:3C:EA:A9:D4:15', 'TTS_CosyVoiceClone302AI0001', 'blood_glucose', '血糖检测', '餐前血糖检测', '老爷子，该测血糖了，请准备好血糖仪。', 
 DATE_ADD(CURDATE(), INTERVAL 11 HOUR) + INTERVAL 30 MINUTE, 'daily', '{"times": ["11:30", "17:30"], "days": [1,2,3,4,5,6,7]}', 1, 'medium', 0, 'active'),

(1, 'EC_eldercare_1_agent_001', 'DF:3C:EA:A9:D4:15', 'TTS_CosyVoiceClone302AI0001', 'exercise', '散步锻炼', '下午散步30分钟，有助于血糖控制', '老爷子，天气不错，该出去散步了，记得带水哦。', 
 DATE_ADD(CURDATE(), INTERVAL 16 HOUR), 'daily', '{"times": ["16:00"], "days": [1,2,3,4,5,6,7]}', 1, 'medium', 0, 'active'),

-- 张奶奶的提醒（使用她的专属智能体和不同的TTS音色）
(2, 'EC_eldercare_2_agent_001', '94:a9:90:31:ae:48', 'TTS_AliyunStreamTTS_0001', 'medication', '心脏药物', '服用阿司匹林和阿托伐他汀', '奶奶，该服用心脏药物了，记得配温开水服用。', 
 DATE_ADD(CURDATE(), INTERVAL 8 HOUR) + INTERVAL 30 MINUTE, 'daily', '{"times": ["08:30", "20:30"], "days": [1,2,3,4,5,6,7]}', 1, 'high', 0, 'active'),

(2, 'EC_eldercare_2_agent_001', '94:a9:90:31:ae:48', 'TTS_AliyunStreamTTS_0001', 'exercise', '心脏康复训练', '进行轻度心脏康复训练15分钟', '奶奶，该做康复训练了，动作要轻柔，如有不适请立即停止。', 
 DATE_ADD(CURDATE(), INTERVAL 15 HOUR), 'daily', '{"times": ["15:00"], "days": [1,2,3,4,5,6,7]}', 1, 'medium', 0, 'active'),

(2, 'EC_eldercare_2_agent_001', '94:a9:90:31:ae:48', 'TTS_AliyunStreamTTS_0001', 'water', '饮水提醒', '记得多喝水，有助于血液循环', '奶奶，该喝水了，每天充足的水分对心脏健康很重要。', 
 DATE_ADD(CURDATE(), INTERVAL 10 HOUR), 'daily', '{"times": ["10:00", "14:00", "18:00"], "days": [1,2,3,4,5,6,7]}', 1, 'low', 0, 'active');

-- ========================================
-- 6. 插入紧急呼救记录示例（使用正确的AI设备ID）
-- ========================================
INSERT IGNORE INTO `ec_emergency_calls` (`user_id`, `health_device_id`, `ai_device_id`, 
  `emergency_type`, `trigger_source`, `timestamp`, `location_gps`, `location_address`, `indoor_location`,
  `emergency_health_data`, `severity_level`, `auto_call_triggered`, `call_numbers`, `call_results`,
  `response_time`, `status`, `handler_info`, `resolution_notes`) VALUES

-- 张老爷子的历史紧急记录
(1, 1, 'DF:3C:EA:A9:D4:15', 
 'fall_detected', 'wearable_device', DATE_SUB(NOW(), INTERVAL 3 DAY), 
 '39.9042,116.4074', '北京市西城区某某街道123号', '客厅',
 '{"heart_rate": 95, "blood_pressure": "150/90", "fall_intensity": "medium", "recovery_time": 15}', 2,
 1, '["13800138001", "13800138002"]', '{"13800138001": {"status": "answered", "duration": 120}, "13800138002": {"status": "busy"}}',
 DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 2 MINUTE, 'resolved', 
 '{"responder": "张三", "arrival_time": "15分钟", "medical_check": "无明显外伤"}', '虚惊一场，老人家只是坐下时动作过快被误判为跌倒'),

(1, 2, NULL, 
 'heart_rate_abnormal', 'health_device', DATE_SUB(NOW(), INTERVAL 7 DAY), 
 '39.9042,116.4074', '北京市西城区某某街道123号', '卧室',
 '{"heart_rate": 135, "blood_pressure": "180/100", "duration": 300, "activity": "resting"}', 3,
 1, '["13800138001", "13800138003"]', '{"13800138001": {"status": "answered", "duration": 180}, "13800138003": {"status": "answered", "duration": 240}}',
 DATE_SUB(NOW(), INTERVAL 7 DAY) + INTERVAL 1 MINUTE, 'resolved', 
 '{"responder": "张三+李医生", "action": "紧急就医", "hospital": "市人民医院"}', '血压升高导致心率异常，已调整药物剂量'),

-- 张奶奶的历史紧急记录
(2, 5, NULL, 
 'manual_trigger', 'emergency_button', DATE_SUB(NOW(), INTERVAL 1 DAY), 
 '39.9000,116.4000', '北京市朝阳区某某小区456号', '卫生间',
 '{"trigger_reason": "头晕", "blood_pressure": "160/95", "conscious": true}', 2,
 1, '["13800138002", "13800138004"]', '{"13800138002": {"status": "answered", "duration": 90}}',
 DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 45 SECOND, 'resolved', 
 '{"responder": "王美", "arrival_time": "12分钟", "medical_advice": "注意休息"}', '轻微头晕，可能是起身过快，已提醒老人注意动作缓慢');