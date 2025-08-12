-- 添加CosyVoice音色克隆TTS模型配置
-- 作者: coco
-- 日期: 2025-08-12

-- 添加CosyVoice Clone TTS Provider配置
delete from `ai_model_provider` where id = 'SYSTEM_TTS_CosyVoiceClone';
INSERT INTO `ai_model_provider` (`id`, `model_type`, `provider_code`, `name`, `fields`, `sort`, `creator`, `create_date`, `updater`, `update_date`) VALUES
('SYSTEM_TTS_CosyVoiceClone', 'TTS', 'cosyvoice_clone', 'CosyVoice音色克隆', '[{"key":"api_key","label":"API密钥","type":"string"},{"key":"api_url","label":"API地址","type":"string"},{"key":"model","label":"模型名称","type":"string"},{"key":"output_dir","label":"输出目录","type":"string"},{"key":"response_format","label":"音频格式","type":"string"},{"key":"reference_audio","label":"参考音频","type":"string"},{"key":"reference_text","label":"参考文本","type":"string"},{"key":"normalize","label":"标准化","type":"boolean"},{"key":"max_new_tokens","label":"最大生成Token","type":"number"},{"key":"chunk_length","label":"分块长度","type":"number"},{"key":"top_p","label":"Top P","type":"number"},{"key":"repetition_penalty","label":"重复惩罚","type":"number"},{"key":"temperature","label":"温度","type":"number"},{"key":"streaming","label":"流式输出","type":"boolean"},{"key":"use_memory_cache","label":"内存缓存","type":"string"},{"key":"seed","label":"随机种子","type":"number"},{"key":"channels","label":"声道数","type":"number"},{"key":"rate","label":"采样率","type":"number"}]', 20, 1, NOW(), 1, NOW());

-- 插入CosyVoice Clone TTS模型配置
delete from `ai_model_config` where id = 'TTS_CosyVoiceClone';
INSERT INTO `ai_model_config` VALUES (
    'TTS_CosyVoiceClone', 
    'TTS', 
    'CosyVoiceClone', 
    'CosyVoice音色克隆', 
    0, 
    1, 
    '{\"type\": \"cosyvoice_clone\", \"model\": \"FunAudioLLM/CosyVoice2-0.5B\", \"api_key\": \"\", \"api_url\": \"https://api.siliconflow.cn/v1/audio/speech\", \"output_dir\": \"tmp/\", \"response_format\": \"wav\", \"reference_audio\": [\"config/assets/wakeup_words.wav\"], \"reference_text\": [\"哈啰啊，我是小智啦，声音好听的台湾女孩一枚，超开心认识你耶，最近在忙啥，别忘了给我来点有趣的料哦，我超爱听八卦的啦\"], \"normalize\": true, \"max_new_tokens\": 1024, \"chunk_length\": 200, \"top_p\": 0.7, \"repetition_penalty\": 1.2, \"temperature\": 0.7, \"streaming\": false, \"use_memory_cache\": \"on\", \"seed\": null, \"channels\": 1, \"rate\": 44100}', 
    NULL, 
    NULL, 
    2, 
    NULL, 
    NULL, 
    NULL, 
    NULL
);

-- CosyVoice音色克隆TTS配置说明
UPDATE `ai_model_config` SET 
`doc_link` = 'https://cloud.siliconflow.cn/account/ak',
`remark` = 'CosyVoice音色克隆TTS配置说明：
1. 访问 https://cloud.siliconflow.cn/account/ak
2. 注册并获取API密钥
3. 填入配置文件中' WHERE `id` = 'TTS_CosyVoiceClone';

-- 为CosyVoice Clone添加音色选项
delete from `ai_tts_voice` where tts_model_id = 'TTS_CosyVoiceClone';
INSERT INTO `ai_tts_voice` VALUES ('TTS_CosyVoiceClone0001', 'TTS_CosyVoiceClone', '克隆音色', 'clone_voice', '中文', 'https://example.com/cosyvoice/clone.mp3', NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL);
