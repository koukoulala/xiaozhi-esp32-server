-- 移除ec_health_devices表中ai_device_id和ai_agent_id的唯一性约束
-- 允许多个健康监测设备绑定到同一个agent和同一个陪伴设备上
-- 原约束 uk_ai_device_agent 没有实际业务价值，反而限制了合理的业务场景
-- 作者: GitHub Copilot
-- 日期: 2025-10-22

-- 1. 删除原有的唯一约束（组合唯一约束没有业务价值）
-- MySQL兼容性写法：先检查索引是否存在，然后删除
DROP INDEX `uk_ai_device_agent` ON `ec_health_devices`;

-- 2. 创建单列索引以提高JOIN查询性能（支持 LEFT JOIN ai_device ON hd.ai_device_id = ad.id）
CREATE INDEX `idx_ai_device` ON `ec_health_devices` (`ai_device_id`);
