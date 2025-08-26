-- 添加CosyVoice音色克隆TTS模型配置 (基于302.ai API)
-- 作者: assistant
-- 日期: 2025-08-26

-- 添加CosyVoice Clone 302AI TTS Provider配置
delete from `ai_model_provider` where id = 'SYSTEM_TTS_CosyVoiceClone302AI';
INSERT INTO `ai_model_provider` (`id`, `model_type`, `provider_code`, `name`, `fields`, `sort`, `creator`, `create_date`, `updater`, `update_date`) VALUES
('SYSTEM_TTS_CosyVoiceClone302AI', 'TTS', 'cosyvoice_clone_302ai', 'CosyVoice音色克隆(302AI)', '[{"key":"api_key","label":"API密钥","type":"string"},{"key":"api_url","label":"API地址","type":"string"},{"key":"upload_ref_audio_url","label":"参考音频上传地址","type":"string"},{"key":"model","label":"模型名称","type":"string"},{"key":"voice","label":"默认音色","type":"string"},{"key":"response_format","label":"音频格式","type":"string"},{"key":"sample_rate","label":"采样率","type":"number"},{"key":"stream","label":"流式输出","type":"boolean"},{"key":"speed","label":"语速","type":"number"},{"key":"gain","label":"音量增益","type":"number"},{"key":"reference_audio","label":"参考音频","type":"string"},{"key":"reference_text","label":"参考文本","type":"string"},{"key":"use_audio_manager","label":"使用音频管理器","type":"boolean"},{"key":"output_dir","label":"输出目录","type":"string"}]', 21, 1, NOW(), 1, NOW());

-- 插入CosyVoice Clone 302AI TTS模型配置
delete from `ai_model_config` where id = 'TTS_CosyVoiceClone302AI';
INSERT INTO `ai_model_config` VALUES (
    'TTS_CosyVoiceClone302AI', 
    'TTS', 
    'CosyVoiceClone302AI', 
    'CosyVoice音色克隆(302AI)', 
    0, 
    1, 
    '{\"type\": \"cosyvoice_clone_302ai\", \"model\": \"FunAudioLLM/CosyVoice2-0.5B\", \"api_key\": \"\", \"api_url\": \"https://api.302.ai/siliconflow/v1/audio/speech\", \"upload_ref_audio_url\": \"https://api.302.ai/siliconflow/v1/uploads/audio/voice\", \"voice\": \"FunAudioLLM/CosyVoice2-0.5B:diana\", \"response_format\": \"wav\", \"sample_rate\": 44100, \"stream\": false, \"speed\": 1.0, \"gain\": 0, \"reference_audio\": [\"config/assets/standard_xiaoyu.wav\"], \"reference_text\": [\"你好，我是晓宇，我是山东滨州人，这是我的普通话测试部分。\"], \"use_audio_manager\": true, \"output_dir\": \"tmp/\"}', 
    NULL, 
    NULL, 
    2, 
    NULL, 
    NULL, 
    NULL, 
    NULL
);

-- CosyVoice音色克隆(302AI)TTS配置说明
UPDATE `ai_model_config` SET 
`doc_link` = 'https://302.ai/',
`remark` = 'CosyVoice音色克隆TTS配置说明(基于302AI API)：
1. 访问 https://302.ai/
2. 注册并获取API密钥
3. 填入配置文件中
4. 支持参考音频上传和音色克隆
5. 可设置语速、音量增益等参数
6. 启用音频管理器可通过Web界面上传音频' WHERE `id` = 'TTS_CosyVoiceClone302AI';

-- 为CosyVoice Clone 302AI添加音色选项
delete from `ai_tts_voice` where tts_model_id = 'TTS_CosyVoiceClone302AI';
INSERT INTO `ai_tts_voice` VALUES ('TTS_CosyVoiceClone302AI0001', 'TTS_CosyVoiceClone302AI', '克隆音色(302AI)', 'clone_voice_302ai', '中文', 'https://example.com/cosyvoice/clone_302ai.wav', NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL);
INSERT INTO `ai_tts_voice` VALUES ('TTS_CosyVoiceClone302AI0002', 'TTS_CosyVoiceClone302AI', 'Diana(默认)', 'FunAudioLLM/CosyVoice2-0.5B:diana', '中文', 'https://example.com/cosyvoice/diana.wav', NULL, NULL, NULL, 2, NULL, NULL, NULL, NULL);
INSERT INTO `ai_tts_voice` VALUES ('TTS_CosyVoiceClone302AI0003', 'TTS_CosyVoiceClone302AI', 'Alex', 'FunAudioLLM/CosyVoice2-0.5B:alex', '中文', 'https://example.com/cosyvoice/alex.wav', NULL, NULL, NULL, 3, NULL, NULL, NULL, NULL);
