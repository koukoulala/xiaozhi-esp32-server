-- 添加CosyVoice音色克隆TTS模型配置 - 本地模型版本
-- 作者: coco
-- 日期: 2025-08-12
-- 说明: 使用本地CosyVoice2模型，无需API密钥

-- 添加CosyVoice Clone TTS Provider配置
delete from `ai_model_provider` where id = 'SYSTEM_TTS_CosyVoiceClone';
INSERT INTO `ai_model_provider` (`id`, `model_type`, `provider_code`, `name`, `fields`, `sort`, `creator`, `create_date`, `updater`, `update_date`) VALUES
('SYSTEM_TTS_CosyVoiceClone', 'TTS', 'cosyvoice_clone', 'CosyVoice音色克隆', '[{"key":"model_dir","label":"模型目录","type":"string","placeholder":"请输入模型目录路径，如：models/CosyVoice2-0.5B"},{"key":"reference_audio","label":"参考音频","type":"string","placeholder":"请输入参考音频文件路径或文件ID列表"},{"key":"reference_text","label":"参考文本","type":"string","placeholder":"请输入与参考音频对应的文本内容"},{"key":"use_audio_manager","label":"使用音频管理器","type":"boolean","placeholder":"是否使用音频管理器动态获取参考音频"},{"key":"streaming","label":"流式输出","type":"boolean","placeholder":"是否启用流式音频生成"},{"key":"load_jit","label":"加载JIT模型","type":"boolean","placeholder":"是否加载JIT优化模型"},{"key":"load_trt","label":"加载TensorRT","type":"boolean","placeholder":"是否加载TensorRT优化模型"},{"key":"load_vllm","label":"加载VLLM","type":"boolean","placeholder":"是否加载VLLM优化模型"},{"key":"fp16","label":"FP16精度","type":"boolean","placeholder":"是否使用FP16半精度加速"},{"key":"output_dir","label":"输出目录","type":"string","placeholder":"音频输出目录"},{"key":"response_format","label":"音频格式","type":"string","placeholder":"音频输出格式，如：wav、mp3"}]', 20, 1, NOW(), 1, NOW());

-- 插入CosyVoice Clone TTS模型配置
delete from `ai_model_config` where id = 'TTS_CosyVoiceClone';
INSERT INTO `ai_model_config` VALUES (
    'TTS_CosyVoiceClone', 
    'TTS', 
    'cosyvoice_clone', 
    'CosyVoice音色克隆', 
    0, 
    1, 
    '{\"type\": \"cosyvoice_clone\", \"model_dir\": \"models/CosyVoice2-0.5B\", \"reference_audio\": \"config/assets/standard_xiaoyu.wav\", \"reference_text\": \"你好，我是晓宇，我是山东滨州人，这是我的普通话测试部分。\", \"use_audio_manager\": false, \"streaming\": false, \"load_jit\": false, \"load_trt\": false, \"load_vllm\": false, \"fp16\": false, \"output_dir\": \"tmp/\", \"response_format\": \"wav\"}', 
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
`doc_link` = 'https://github.com/FunAudioLLM/CosyVoice2',
`remark` = 'CosyVoice音色克隆本地模型配置说明：
1. 确保模型文件已下载到 models/CosyVoice2-0.5B 目录
2. 配置参考音频文件路径和对应的参考文本  
3. 根据硬件情况启用FP16、JIT、TensorRT等优化选项
4. 可启用音频管理器来动态管理参考音频文件
5. 本地模型无需API密钥，直接使用本地推理' WHERE `id` = 'TTS_CosyVoiceClone';

-- 为CosyVoice Clone添加音色选项
delete from `ai_tts_voice` where tts_model_id = 'TTS_CosyVoiceClone';
INSERT INTO `ai_tts_voice` VALUES ('TTS_CosyVoiceClone0001', 'TTS_CosyVoiceClone', '克隆音色', 'clone_voice', '中文', 'https://example.com/cosyvoice/clone.mp3', NULL, NULL, NULL, 1, NULL, NULL, NULL, NULL);
