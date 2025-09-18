-- ElderCare智慧养老陪伴系统数据库架构
-- 集成到现有AI Agent系统，不创建平行表结构
-- 作者: assistant  
-- 日期: 2025-08-27

-- ========================================
-- 1. 创建ElderCare用户表（子女家庭账号管理）
-- ========================================
CREATE TABLE IF NOT EXISTS `ec_users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ElderCare用户ID',
  `ai_user_id` bigint(20) DEFAULT NULL COMMENT '关联的AI系统用户ID（可选，用于高级用户）',
  `username` varchar(50) NOT NULL COMMENT '子女账号用户名',
  `password` varchar(100) NOT NULL COMMENT '密码(加密)',
  `real_name` varchar(50) DEFAULT NULL COMMENT '子女真实姓名',
  `phone` varchar(20) DEFAULT NULL COMMENT '子女手机号',
  `email` varchar(100) DEFAULT NULL COMMENT '子女邮箱',
  
  -- 老人相关信息
  `elder_name` varchar(50) DEFAULT NULL COMMENT '老人姓名',
  `elder_relation` varchar(50) DEFAULT NULL COMMENT '与老人关系(son/daughter/spouse/other)',
  `elder_profile` text DEFAULT NULL COMMENT '老人档案信息(JSON格式：年龄、性别、身高体重、病史、用药等)',
  `family_contacts` text DEFAULT NULL COMMENT '家庭联系人信息(JSON格式：紧急联系人、医生信息等)',
  
  -- AI系统关联 - 修正设计
  `default_ai_agent_id` varchar(32) DEFAULT NULL COMMENT '默认AI智能体ID（关联ai_agent表）',
  `owned_ai_agents` text DEFAULT NULL COMMENT '拥有的AI智能体列表(JSON数组：ec_user可以创建多个agent)',
  
  -- 权限控制
  `agent_creation_limit` int(11) DEFAULT 3 COMMENT 'AI智能体创建数量限制',
  `can_modify_models` tinyint(1) DEFAULT 0 COMMENT '是否可以修改AI模型配置(0否 1是，默认ec_user不能修改)',
  `permission_level` varchar(20) DEFAULT 'eldercare' COMMENT '权限级别(eldercare/advanced/admin)',
  
  -- 系统字段
  `status` tinyint(1) DEFAULT 1 COMMENT '状态(0禁用 1启用)',
  `creator` bigint(20) DEFAULT NULL COMMENT '创建者',
  `create_date` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updater` bigint(20) DEFAULT NULL COMMENT '更新者',
  `update_date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_phone` (`phone`),
  KEY `idx_email` (`email`),
  KEY `idx_default_ai_agent` (`default_ai_agent_id`),
  KEY `idx_ai_user_id` (`ai_user_id`),
  KEY `idx_permission_level` (`permission_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ElderCare用户表-支持AI智能体创建和管理';

-- ========================================
-- 2. 创建健康设备插件映射表（集成ai_agent_plugin_mapping）
-- ========================================
CREATE TABLE IF NOT EXISTS `ec_health_devices` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` bigint(20) NOT NULL COMMENT 'ElderCare用户ID',
  `ai_agent_id` varchar(32) NOT NULL COMMENT 'AI智能体ID（关联ai_agent表）',
  `ai_device_id` varchar(32) DEFAULT NULL COMMENT 'AI设备ID（关联ai_device表，每个ai_device只能绑定一个ai_agent）',
  `plugin_id` varchar(32) NOT NULL COMMENT '健康设备插件ID（用于ai_agent_plugin_mapping）',
  
  -- 设备信息
  `device_name` varchar(100) NOT NULL COMMENT '设备名称（如：Apple Watch Series 8）',
  `device_type` varchar(50) NOT NULL COMMENT '设备类型(smart_watch/blood_pressure_monitor/glucose_meter/fitness_tracker)',
  `device_brand` varchar(50) DEFAULT NULL COMMENT '设备品牌(apple/huawei/xiaomi/omron)',
  `device_model` varchar(100) DEFAULT NULL COMMENT '设备型号',
  `mac_address` varchar(32) DEFAULT NULL COMMENT 'MAC地址或设备标识符',
  
  -- 健康功能配置
  `health_features` text NOT NULL COMMENT '健康监控功能(JSON格式：心率、血压、血氧、体温、步数、睡眠、跌倒检测等)',
  `sensor_config` text DEFAULT NULL COMMENT '传感器配置(JSON格式：采样频率、阈值设置等)',
  `data_sync_config` text DEFAULT NULL COMMENT '数据同步配置(JSON格式：同步频率、数据格式等)',
  
  -- 设备状态
  `connection_status` varchar(20) DEFAULT 'disconnected' COMMENT '连接状态(connected/disconnected/pairing)',
  `battery_level` int(11) DEFAULT NULL COMMENT '电池电量百分比',
  `firmware_version` varchar(50) DEFAULT NULL COMMENT '固件版本',
  `last_sync_time` datetime DEFAULT NULL COMMENT '最后同步时间',
  
  -- 系统字段
  `is_active` tinyint(1) DEFAULT 1 COMMENT '是否激活(0否 1是)',
  `creator` bigint(20) DEFAULT NULL COMMENT '创建者',
  `create_date` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updater` bigint(20) DEFAULT NULL COMMENT '更新者',
  `update_date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_device_mac` (`user_id`, `mac_address`),
  UNIQUE KEY `uk_ai_device_agent` (`ai_device_id`, `ai_agent_id`),
  KEY `idx_user_agent` (`user_id`, `ai_agent_id`),
  KEY `idx_device_type` (`device_type`),
  KEY `idx_plugin_id` (`plugin_id`),
  CONSTRAINT `fk_ec_health_devices_user_id` FOREIGN KEY (`user_id`) REFERENCES `ec_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ElderCare健康设备表-与AI Agent一对一绑定';

-- ========================================
-- 3. 创建健康数据采集表
-- ========================================
CREATE TABLE IF NOT EXISTS `ec_health_data` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` bigint(20) NOT NULL COMMENT 'ElderCare用户ID',
  `health_device_id` bigint(20) NOT NULL COMMENT '健康设备ID（关联ec_health_devices表）',
  `ai_device_id` varchar(32) DEFAULT NULL COMMENT 'AI设备ID（关联ai_device表）',
  
  -- 时间和基础信息
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '数据采集时间',
  `data_type` varchar(50) NOT NULL COMMENT '数据类型(heart_rate/blood_pressure/glucose/temperature/oxygen/activity/sleep)',
  
  -- 生命体征数据
  `heart_rate` int(11) DEFAULT NULL COMMENT '心率(次/分)',
  `blood_pressure_systolic` int(11) DEFAULT NULL COMMENT '收缩压(mmHg)',
  `blood_pressure_diastolic` int(11) DEFAULT NULL COMMENT '舒张压(mmHg)',
  `blood_glucose` decimal(4,1) DEFAULT NULL COMMENT '血糖值(mmol/L)',
  `body_temperature` decimal(4,1) DEFAULT NULL COMMENT '体温(°C)',
  `blood_oxygen` int(11) DEFAULT NULL COMMENT '血氧饱和度(%)',
  
  -- 运动和活动数据
  `step_count` int(11) DEFAULT NULL COMMENT '步数',
  `distance` decimal(6,2) DEFAULT NULL COMMENT '距离(km)',
  `calories_burned` int(11) DEFAULT NULL COMMENT '消耗卡路里',
  `activity_level` varchar(20) DEFAULT NULL COMMENT '活动水平(low/medium/high)',
  `exercise_duration` int(11) DEFAULT NULL COMMENT '运动时长(分钟)',
  
  -- 睡眠数据
  `sleep_duration` int(11) DEFAULT NULL COMMENT '睡眠时长(分钟)',
  `deep_sleep_duration` int(11) DEFAULT NULL COMMENT '深度睡眠时长(分钟)',
  `light_sleep_duration` int(11) DEFAULT NULL COMMENT '浅睡眠时长(分钟)',
  `sleep_quality_score` int(11) DEFAULT NULL COMMENT '睡眠质量评分(0-100)',
  
  -- 异常检测
  `fall_detected` tinyint(1) DEFAULT 0 COMMENT '跌倒检测(0否 1是)',
  `abnormal_heart_rate` tinyint(1) DEFAULT 0 COMMENT '心率异常(0否 1是)',
  `emergency_triggered` tinyint(1) DEFAULT 0 COMMENT '紧急情况触发(0否 1是)',
  
  -- 数据元信息
  `data_source` varchar(50) DEFAULT 'health_device' COMMENT '数据来源(health_device/manual_input/ai_device)',
  `raw_data` text DEFAULT NULL COMMENT '原始数据(JSON格式)',
  `data_quality` varchar(20) DEFAULT 'good' COMMENT '数据质量(good/fair/poor)',
  
  `create_date` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_user_device_time` (`user_id`, `health_device_id`, `timestamp`),
  KEY `idx_data_type_time` (`data_type`, `timestamp`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_emergency` (`emergency_triggered`, `timestamp`),
  CONSTRAINT `fk_ec_health_data_user_id` FOREIGN KEY (`user_id`) REFERENCES `ec_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ec_health_data_device_id` FOREIGN KEY (`health_device_id`) REFERENCES `ec_health_devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ElderCare健康数据采集表';

-- ========================================
-- 4. 创建提醒管理表（使用现有ai_tts_voice表）
-- ========================================
CREATE TABLE IF NOT EXISTS `ec_reminders` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` bigint(20) NOT NULL COMMENT 'ElderCare用户ID',
  `ai_agent_id` varchar(32) DEFAULT NULL COMMENT 'AI智能体ID（关联ai_agent表）',
  `ai_device_id` varchar(32) DEFAULT NULL COMMENT 'AI设备ID（关联ai_device表）',
  `tts_voice_id` varchar(32) DEFAULT NULL COMMENT 'TTS音色ID（关联ai_tts_voice表，用于语音提醒）',
  
  -- 提醒基本信息
  `reminder_type` varchar(50) NOT NULL COMMENT '提醒类型(medication/blood_pressure/blood_glucose/exercise/meal/appointment/sleep/water)',
  `title` varchar(200) NOT NULL COMMENT '提醒标题',
  `content` text DEFAULT NULL COMMENT '提醒内容',
  `voice_prompt` text DEFAULT NULL COMMENT '语音提醒专用内容（用于TTS合成）',
  
  -- 时间配置
  `scheduled_time` datetime NOT NULL COMMENT '计划时间',
  `repeat_pattern` varchar(50) DEFAULT 'once' COMMENT '重复模式(once/daily/weekly/monthly/custom)',
  `repeat_config` text DEFAULT NULL COMMENT '重复配置(JSON格式：具体时间、间隔等)',
  
  -- TTS语音配置
  `tts_enabled` tinyint(1) DEFAULT 1 COMMENT '是否启用TTS语音提醒(0否 1是)',
  `priority` varchar(20) DEFAULT 'medium' COMMENT '提醒优先级(low/medium/high/urgent)',
  
  -- 状态管理
  `is_completed` tinyint(1) DEFAULT 0 COMMENT '是否完成(0否 1是)',
  `completed_time` datetime DEFAULT NULL COMMENT '完成时间',
  `snooze_count` int(11) DEFAULT 0 COMMENT '推迟次数',
  `last_triggered_time` datetime DEFAULT NULL COMMENT '最后触发时间',
  `status` varchar(20) DEFAULT 'active' COMMENT '状态(active/paused/completed/cancelled)',
  
  -- 系统字段
  `creator` bigint(20) DEFAULT NULL COMMENT '创建者',
  `create_date` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updater` bigint(20) DEFAULT NULL COMMENT '更新者',
  `update_date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_user_type_time` (`user_id`, `reminder_type`, `scheduled_time`),
  KEY `idx_scheduled_time` (`scheduled_time`),
  KEY `idx_status` (`status`),
  KEY `idx_ai_agent` (`ai_agent_id`),
  KEY `idx_tts_voice` (`tts_voice_id`),
  CONSTRAINT `fk_ec_reminders_user_id` FOREIGN KEY (`user_id`) REFERENCES `ec_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ElderCare提醒管理表-集成现有TTS系统';

-- ========================================
-- 5. 创建紧急呼救记录表（增强版）
-- ========================================
CREATE TABLE IF NOT EXISTS `ec_emergency_calls` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` bigint(20) NOT NULL COMMENT 'ElderCare用户ID',
  `health_device_id` bigint(20) DEFAULT NULL COMMENT '触发设备ID（关联ec_health_devices表）',
  `ai_device_id` varchar(32) DEFAULT NULL COMMENT 'AI设备ID（关联ai_device表，用于拨号）',
  
  -- 紧急情况信息
  `emergency_type` varchar(50) NOT NULL COMMENT '紧急类型(fall_detected/heart_rate_abnormal/manual_trigger/no_response/medical_emergency)',
  `trigger_source` varchar(50) NOT NULL COMMENT '触发源(wearable_device/ai_device/manual/sensor)',
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '发生时间',
  
  -- 位置和环境信息
  `location_gps` varchar(100) DEFAULT NULL COMMENT 'GPS位置(经纬度)',
  `location_address` varchar(200) DEFAULT NULL COMMENT '地址信息',
  `indoor_location` varchar(100) DEFAULT NULL COMMENT '室内位置(客厅/卧室/卫生间等)',
  
  -- 生理数据（紧急时刻的）
  `emergency_health_data` text DEFAULT NULL COMMENT '紧急时刻的健康数据快照(JSON格式)',
  `severity_level` tinyint(1) DEFAULT 1 COMMENT '严重程度(1轻微 2中等 3严重 4危急)',
  
  -- 响应处理
  `auto_call_triggered` tinyint(1) DEFAULT 0 COMMENT '是否自动拨号(0否 1是)',
  `call_numbers` text DEFAULT NULL COMMENT '拨号号码列表(JSON格式)',
  `call_results` text DEFAULT NULL COMMENT '拨号结果(JSON格式：成功、失败、接听状态等)',
  
  `response_time` datetime DEFAULT NULL COMMENT '响应时间',
  `status` varchar(20) DEFAULT 'triggered' COMMENT '处理状态(triggered/calling/answered/resolved/false_alarm)',
  `handler_info` text DEFAULT NULL COMMENT '处理人信息(JSON格式)',
  `resolution_notes` text DEFAULT NULL COMMENT '处理结果备注',
  
  `create_date` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_user_type_time` (`user_id`, `emergency_type`, `timestamp`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_status` (`status`),
  KEY `idx_severity` (`severity_level`, `timestamp`),
  CONSTRAINT `fk_ec_emergency_calls_user_id` FOREIGN KEY (`user_id`) REFERENCES `ec_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ec_emergency_calls_device_id` FOREIGN KEY (`health_device_id`) REFERENCES `ec_health_devices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ElderCare紧急呼救记录表';

-- ========================================
-- 6. 创建系统配置表
-- ========================================
CREATE TABLE IF NOT EXISTS `ec_system_config` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `config_key` varchar(100) NOT NULL COMMENT '配置键',
  `config_value` text DEFAULT NULL COMMENT '配置值',
  `config_type` varchar(50) DEFAULT 'string' COMMENT '配置类型(string/number/boolean/json)',
  `description` varchar(500) DEFAULT NULL COMMENT '配置描述',
  `category` varchar(50) DEFAULT 'system' COMMENT '配置分类(system/health/emergency/tts/device)',
  `is_public` tinyint(1) DEFAULT 0 COMMENT '是否公开(0否 1是)',
  `creator` bigint(20) DEFAULT NULL COMMENT '创建者',
  `create_date` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updater` bigint(20) DEFAULT NULL COMMENT '更新者',
  `update_date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ElderCare系统配置表';

-- ========================================
-- 7. 插入系统初始配置
-- ========================================
INSERT IGNORE INTO `ec_system_config` (`config_key`, `config_value`, `config_type`, `description`, `category`) VALUES
-- 系统配置
('system.enable_registration', 'true', 'boolean', '是否允许用户注册', 'system'),
('system.default_ai_agent_model', 'ChatGLM', 'string', '默认AI智能体模型', 'system'),
('system.max_devices_per_user', '5', 'number', '每个用户最大设备数量', 'system'),

-- 健康监控配置
('health.heart_rate_normal_min', '60', 'number', '正常心率下限(次/分)', 'health'),
('health.heart_rate_normal_max', '100', 'number', '正常心率上限(次/分)', 'health'),
('health.blood_pressure_systolic_normal_max', '140', 'number', '正常收缩压上限(mmHg)', 'health'),
('health.blood_pressure_diastolic_normal_max', '90', 'number', '正常舒张压上限(mmHg)', 'health'),
('health.blood_glucose_normal_max', '7.8', 'number', '正常血糖上限(mmol/L)', 'health'),
('health.body_temperature_normal_min', '36.0', 'number', '正常体温下限(°C)', 'health'),
('health.body_temperature_normal_max', '37.5', 'number', '正常体温上限(°C)', 'health'),
('health.blood_oxygen_normal_min', '95', 'number', '正常血氧下限(%)', 'health'),

-- 设备配置
('device.supported_health_devices', '["smart_watch","blood_pressure_monitor","glucose_meter","fitness_tracker","emergency_button"]', 'json', '支持的健康设备类型', 'device'),
('device.auto_sync_interval', '300', 'number', '设备数据自动同步间隔(秒)', 'device'),
('device.connection_timeout', '30', 'number', '设备连接超时时间(秒)', 'device'),

-- 紧急呼叫配置
('emergency.auto_call_enabled', 'true', 'boolean', '是否启用紧急自动拨号', 'emergency'),
('emergency.auto_call_delay', '30', 'number', '紧急情况自动拨号延迟(秒)', 'emergency'),
('emergency.fall_detection_sensitivity', 'medium', 'string', '跌倒检测灵敏度(low/medium/high)', 'emergency'),
('emergency.max_call_attempts', '3', 'number', '紧急呼叫最大尝试次数', 'emergency'),

-- TTS和语音配置
('tts.default_test_text', '您好，我是您的家人，现在正在测试语音克隆功能，请问听起来怎么样？', 'string', '语音测试默认文本', 'tts'),
('tts.voice_quality_threshold', '0.8', 'number', '语音质量合格阈值', 'tts'),
('tts.max_recording_duration', '30', 'number', '最大录音时长(秒)', 'tts'),
('tts.reference_text_examples', '["您好，我是您的家人，这是我的普通话测试部分。", "今天天气不错，记得按时吃药，注意身体健康。", "该起床了，记得先喝一杯温水，对身体有好处。"]', 'json', 'TTS参考文本示例', 'tts'),
('tts.voice_clone_enabled', 'true', 'boolean', '是否启用声音克隆功能', 'tts'),

-- ElderCare默认AI模型配置
('system.default_models', '{"asr_model_id":"ASR_WhisperLocal","vad_model_id":"VAD_SileroVad","llm_model_id":"LLM_ChatGLM","vllm_model_id":"VLLM_ChatGLMVLLM","tts_model_id":"TTS_CosyVoiceClone302AI","tts_voice_id":"TTS_CosyVoiceClone302AI0001","mem_model_id":null,"intent_model_id":null}', 'json', 'ElderCare用户默认AI模型配置', 'system'),
('system.eldercare_agent_prefix', 'EC_', 'string', 'ElderCare用户创建的智能体ID前缀', 'system'),

-- 提醒配置
('reminder.medication_default_times', '["08:00","12:00","18:00","21:00"]', 'json', '用药提醒默认时间', 'reminder'),
('reminder.health_check_times', '["09:00","15:00","21:00"]', 'json', '健康检查提醒时间', 'reminder'),
('reminder.snooze_duration', '5', 'number', '提醒推迟时长(分钟)', 'reminder'),
('reminder.max_snooze_count', '3', 'number', '最大推迟次数', 'reminder');

-- ========================================
-- 8. 创建优化索引（使用IF NOT EXISTS避免重复创建）
-- ========================================
-- Note: MySQL不直接支持CREATE INDEX IF NOT EXISTS，所以我们在这里注释掉
-- 因为表创建时已经包含了必要的索引，这些额外的索引可以在需要时手动添加

-- ec_users表索引（如果需要可以手动添加）
-- CREATE INDEX `idx_ec_users_default_agent` ON `ec_users` (`default_ai_agent_id`);

-- ec_health_devices表索引
-- CREATE INDEX `idx_ec_health_devices_type_status` ON `ec_health_devices` (`device_type`, `connection_status`);
-- CREATE INDEX `idx_ec_health_devices_sync_time` ON `ec_health_devices` (`last_sync_time` DESC);

-- ec_health_data表索引
-- CREATE INDEX `idx_ec_health_data_type_time` ON `ec_health_data` (`data_type`, `timestamp` DESC);
-- CREATE INDEX `idx_ec_health_data_emergency` ON `ec_health_data` (`emergency_triggered`, `timestamp` DESC);

-- ec_reminders表索引
-- CREATE INDEX `idx_ec_reminders_status_time` ON `ec_reminders` (`status`, `scheduled_time`);
-- CREATE INDEX `idx_ec_reminders_type_user` ON `ec_reminders` (`reminder_type`, `user_id`);

-- ec_emergency_calls表索引
-- CREATE INDEX `idx_ec_emergency_calls_type_severity` ON `ec_emergency_calls` (`emergency_type`, `severity_level`, `timestamp` DESC);
-- CREATE INDEX `idx_ec_emergency_calls_status_time` ON `ec_emergency_calls` (`status`, `timestamp` DESC);
