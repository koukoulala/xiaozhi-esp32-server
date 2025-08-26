"""
CosyVoice TTS with voice cloning capabilities using 302.ai API
Based on the 302.ai API documentation for FunAudioLLM/CosyVoice2-0.5B
"""

import os
import json
import base64
import tempfile
import traceback
import asyncio
from pathlib import Path
from typing import Optional, Dict, Union
from core.providers.tts.base import TTSProviderBase
from core.utils.tts import MarkdownCleaner
from config.logger import setup_logging

logger = setup_logging()
TAG = __name__


def audio_to_bytes(audio_path):
    """Convert audio file to bytes, supports both file paths and file IDs"""
    try:
        # 首先尝试从音频管理器根据文件ID获取
        if isinstance(audio_path, str):
            try:
                from core.audio_manager import audio_manager
                actual_path = audio_manager.get_audio_file_path(audio_path)
                if actual_path and os.path.exists(actual_path):
                    with open(actual_path, 'rb') as f:
                        return f.read()
            except Exception as e:
                logger.bind(tag=TAG).debug(f"Not a valid file ID or file not found: {audio_path}")
        
        # 尝试作为文件路径处理
        if isinstance(audio_path, (str, Path)):
            # 如果是相对路径，转换为绝对路径
            if not os.path.isabs(audio_path):
                # 获取项目根目录
                project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
                audio_path = os.path.join(project_root, audio_path)
            
            if os.path.exists(audio_path):
                with open(audio_path, 'rb') as f:
                    return f.read()
        
        logger.bind(tag=TAG).warning(f"Audio file not found: {audio_path}")
        return b""
    except Exception as e:
        logger.bind(tag=TAG).error(f"Failed to read audio file {audio_path}: {e}")
        return b""


def read_ref_text(text_path):
    """Read reference text from file, file ID, or return as string"""
    try:
        if isinstance(text_path, str):
            # 首先尝试从音频管理器根据文件ID获取参考文本
            try:
                from core.audio_manager import audio_manager
                file_info = audio_manager.get_audio_file(text_path)
                if file_info and file_info.get("reference_text"):
                    return file_info["reference_text"].strip()
            except Exception as e:
                logger.bind(tag=TAG).debug(f"Not a valid file ID: {text_path}")
            
            # 尝试作为文件路径
            if os.path.exists(text_path):
                with open(text_path, 'r', encoding='utf-8') as f:
                    return f.read().strip()
            else:
                # 作为普通字符串返回
                return text_path.strip()
        return str(text_path).strip()
    except Exception as e:
        logger.bind(tag=TAG).error(f"Failed to read reference text {text_path}: {e}")
        return ""


class TTSProvider(TTSProviderBase):
    """CosyVoice TTS provider with voice cloning capabilities using 302.ai API"""
    
    def __init__(self, config, delete_audio_file):
        super().__init__(config, delete_audio_file)
        
        # Basic configuration
        self.model = config.get("model", "FunAudioLLM/CosyVoice2-0.5B")
        self.api_key = config.get("api_key", "")
        self.api_url = config.get("api_url", "https://api.302.ai/siliconflow/v1/audio/speech")
        self.voice = config.get("voice", "FunAudioLLM/CosyVoice2-0.5B:diana")
        self.response_format = config.get("response_format", "wav")
        self.audio_file_type = config.get("response_format", "wav")
        
        # Voice cloning configuration
        ref_audio = config.get("reference_audio", ["config/assets/standard_xiaoyu.wav"])
        ref_text = config.get("reference_text", ["你好，我是晓宇，我是山东滨州人，这是我的普通话测试部分。"])
        
        # 检查是否使用音频管理器
        use_audio_manager = config.get("use_audio_manager", False)  # 默认禁用音频管理器
        '''
        if use_audio_manager:
            # 从音频管理器获取参考文件
            try:
                from core.audio_manager import audio_manager
                audio_paths, reference_texts = audio_manager.get_reference_files_for_config()
                if audio_paths and reference_texts:
                    ref_audio = audio_paths
                    ref_text = reference_texts
                    logger.bind(tag=TAG).info(f"从音频管理器加载了 {len(audio_paths)} 个参考文件")
                else:
                    logger.bind(tag=TAG).warning("音频管理器中没有找到参考文件，使用默认配置")
            except Exception as e:
                logger.bind(tag=TAG).error(f"从音频管理器加载参考文件失败: {e}")
        else:
            logger.bind(tag=TAG).info("音频管理器已禁用，使用配置文件中的参考音频")
        '''
        
        # Handle both string and list inputs
        self.reference_audio = [ref_audio] if isinstance(ref_audio, str) else ref_audio
        self.reference_text = [ref_text] if isinstance(ref_text, str) else ref_text
        
        # Audio settings (302.ai API parameters)
        self.sample_rate = int(config.get("sample_rate", "44100")) if config.get("sample_rate") else 44100
        self.stream = str(config.get("stream", "false")).lower() in ("true", "1", "yes")
        self.speed = float(config.get("speed", "1.0")) if config.get("speed") else 1.0
        self.gain = float(config.get("gain", "0")) if config.get("gain") else 0.0
        
        # Reference audio upload endpoint
        self.upload_ref_audio_url = config.get("upload_ref_audio_url", "https://api.302.ai/siliconflow/v1/uploads/audio/voice")
        
        if not self.api_key:
            raise ValueError("CosyVoice Clone 302.ai API key not found")
        
        # Pre-upload reference audios during initialization
        self.reference_audio_uris = []
        self._upload_reference_audios()
        
        logger.bind(tag=TAG).info(f"CosyVoice Clone 302.ai TTS initialized with model: {self.model}")
        logger.bind(tag=TAG).info(f"Reference audio files: {len(self.reference_audio)}")
        logger.bind(tag=TAG).info(f"Reference texts: {len(self.reference_text)}")
        logger.bind(tag=TAG).info(f"Pre-uploaded reference audio URIs: {len(self.reference_audio_uris)}")

    def _upload_reference_audios(self):
        """
        Upload all reference audios during initialization to get URIs for later use
        """
        try:
            import requests
            
            # Get reference texts
            ref_texts = [read_ref_text(ref_text) for ref_text in self.reference_text]
            
            # Upload each reference audio
            for i, (ref_audio_path, ref_text) in enumerate(zip(self.reference_audio, ref_texts)):
                try:
                    # 添加调试信息
                    logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Checking reference audio path: {ref_audio_path}")
                    logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Path exists: {os.path.exists(ref_audio_path)}")
                    logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Current working directory: {os.getcwd()}")
                    
                    # 使用 audio_to_bytes 函数获取音频数据
                    audio_bytes = audio_to_bytes(ref_audio_path)
                    if not audio_bytes:
                        logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Failed to read reference audio file: {ref_audio_path}")
                        continue
                    
                    # 根据文件扩展名设置正确的MIME类型
                    file_ext = os.path.splitext(ref_audio_path)[1].lower()
                    if file_ext == '.mp3':
                        mime_type = 'audio/mp3'
                    elif file_ext == '.wav':
                        mime_type = 'audio/wav'
                    else:
                        mime_type = 'audio/wav'
                    
                    # 将音频数据转换为base64编码
                    import base64
                    base64_audio = base64.b64encode(audio_bytes).decode('utf-8')
                    
                    # 准备 multipart/form-data 数据，使用正确的格式
                    files = {
                        'model': (None, self.model),
                        'customName': (None, f"ref_{i+1}"),
                        'text': (None, ref_text),
                        'audio': (None, f"data:{mime_type};base64,{base64_audio}")
                    }
                    
                    headers = {
                        "Authorization": f"Bearer {self.api_key}",
                    }
                    
                    logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Uploading reference audio {i+1}/{len(self.reference_audio)} from {ref_audio_path} with text: '{ref_text[:50]}...'")
                    logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Audio data size: {len(audio_bytes)} bytes")
                    logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Base64 size: {len(base64_audio)} characters")
                    
                    response = requests.post(
                        self.upload_ref_audio_url,
                        files=files,
                        headers=headers,
                        timeout=60  # 增加超时时间
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        audio_uri = result.get('uri')
                        if audio_uri:
                            self.reference_audio_uris.append(audio_uri)
                            logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Reference audio {i+1} uploaded successfully, URI: {audio_uri}")
                        else:
                            logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] No URI returned for reference audio {i+1}")
                    else:
                        logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] Failed to upload reference audio {i+1}: {response.status_code} - {response.text}")
                            
                except Exception as e:
                    logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] Error uploading reference audio {i+1}: {e}")
                    # 如果是网络错误，继续尝试下一个文件
                    continue
            
            if not self.reference_audio_uris:
                logger.bind(tag=TAG).warning("[COSYVOICE_302AI] No reference audios uploaded successfully, will use default voice")
                
        except Exception as e:
            logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] Error during reference audio upload initialization: {e}")

    async def text_to_speak(self, text, output_file):
        """
        Generate speech using CosyVoice with voice cloning via 302.ai API
        """
        max_retries = 3  # 最大重试次数
        retry_delay = 1  # 重试延迟（秒）
        
        for attempt in range(max_retries):
            try:
                # Clean text
                text = MarkdownCleaner.clean_markdown(text)
                
                # Use pre-uploaded reference audio URIs
                if self.reference_audio_uris:
                    # Use the first reference audio URI as voice
                    voice_to_use = self.reference_audio_uris[0]
                    logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Using pre-uploaded reference audio URI: {voice_to_use}")
                else:
                    logger.bind(tag=TAG).warning("[COSYVOICE_302AI] No pre-uploaded reference audio URIs available, using default voice")
                    voice_to_use = self.voice
                
                # Prepare request data for 302.ai API
                request_data = {
                    "model": self.model,
                    "input": text,
                    "voice": voice_to_use,
                    "response_format": self.response_format,
                    "sample_rate": self.sample_rate,
                    "stream": self.stream,
                    "speed": self.speed,
                    "gain": self.gain
                }
                
                # Prepare headers
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                }
                
                logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Sending TTS request for text: '{text[:50]}...' (attempt {attempt + 1}/{max_retries})")
                logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Using voice: {voice_to_use}")
                
                # Make request
                import requests
                
                if self.stream:
                    # Handle streaming response
                    response = requests.post(
                        self.api_url,
                        json=request_data,
                        headers=headers,
                        stream=True,
                        timeout=60
                    )
                    
                    if response.status_code == 200:
                        audio_data = b""
                        for chunk in response.iter_content(chunk_size=8192):
                            if chunk:
                                audio_data += chunk
                        
                        if output_file:
                            # Ensure output directory exists
                            os.makedirs(os.path.dirname(output_file), exist_ok=True)
                            with open(output_file, "wb") as f:
                                f.write(audio_data)
                            logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Audio saved to: {output_file}")
                        return audio_data
                    else:
                        error_msg = f"Streaming API request failed with status {response.status_code}: {response.text}"
                        logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] {error_msg}")
                        if attempt < max_retries - 1:
                            logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Retrying in {retry_delay} seconds...")
                            await asyncio.sleep(retry_delay)
                            continue
                        raise Exception(error_msg)
                else:
                    # Handle non-streaming response
                    response = requests.post(
                        self.api_url,
                        json=request_data,
                        headers=headers,
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        audio_url = result.get('url')
                        
                        if audio_url:
                            # Download audio from URL
                            audio_response = requests.get(audio_url, timeout=30)
                            if audio_response.status_code == 200:
                                audio_data = audio_response.content
                                
                                if output_file:
                                    # Ensure output directory exists
                                    os.makedirs(os.path.dirname(output_file), exist_ok=True)
                                    with open(output_file, "wb") as f:
                                        f.write(audio_data)
                                    logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Audio saved to: {output_file}")
                                return audio_data
                            else:
                                error_msg = f"Failed to download audio from URL: {audio_url}"
                                logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] {error_msg}")
                                if attempt < max_retries - 1:
                                    logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Retrying in {retry_delay} seconds...")
                                    await asyncio.sleep(retry_delay)
                                    continue
                                raise Exception(error_msg)
                        else:
                            error_msg = "No audio URL returned from API"
                            logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] {error_msg}")
                            if attempt < max_retries - 1:
                                logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Retrying in {retry_delay} seconds...")
                                await asyncio.sleep(retry_delay)
                                continue
                            raise Exception(error_msg)
                    elif response.status_code == 500:
                        # 302.ai API 有时返回500状态码但包含正确结果
                        try:
                            result = response.json()
                            audio_url = result.get('url')
                            
                            if audio_url:
                                logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] API returned 500 but has audio URL, proceeding")
                                # Download audio from URL
                                audio_response = requests.get(audio_url, timeout=30)
                                if audio_response.status_code == 200:
                                    audio_data = audio_response.content
                                    
                                    if output_file:
                                        # Ensure output directory exists
                                        os.makedirs(os.path.dirname(output_file), exist_ok=True)
                                        with open(output_file, "wb") as f:
                                            f.write(audio_data)
                                        logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Audio saved to: {output_file}")
                                    return audio_data
                                else:
                                    error_msg = f"Failed to download audio from URL: {audio_url}"
                                    logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] {error_msg}")
                                    if attempt < max_retries - 1:
                                        logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Retrying in {retry_delay} seconds...")
                                        await asyncio.sleep(retry_delay)
                                        continue
                                    raise Exception(error_msg)
                            else:
                                # 真正的500错误
                                error_msg = f"API request failed with status {response.status_code}: {response.text}"
                                logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] {error_msg}")
                                if attempt < max_retries - 1:
                                    logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Retrying in {retry_delay} seconds...")
                                    await asyncio.sleep(retry_delay)
                                    continue
                                raise Exception(error_msg)
                        except json.JSONDecodeError:
                            # 无法解析JSON，真正的500错误
                            error_msg = f"API request failed with status {response.status_code}: {response.text}"
                            logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] {error_msg}")
                            if attempt < max_retries - 1:
                                logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Retrying in {retry_delay} seconds...")
                                await asyncio.sleep(retry_delay)
                                continue
                            raise Exception(error_msg)
                    elif response.status_code == 400:
                        # 400错误可能是URI过期，尝试重新上传参考音频
                        if attempt < max_retries - 1 and self.reference_audio_uris:
                            logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] 400 error, possibly expired URI. Retrying with fresh upload...")
                            # 重新上传参考音频
                            self.reference_audio_uris = []
                            self._upload_reference_audios()
                            await asyncio.sleep(retry_delay)
                            continue
                        else:
                            # 真正的400错误
                            error_msg = f"API request failed with status {response.status_code}: {response.text}"
                            logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] {error_msg}")
                            if attempt < max_retries - 1:
                                logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Retrying in {retry_delay} seconds...")
                                await asyncio.sleep(retry_delay)
                                continue
                            raise Exception(error_msg)
                    else:
                        error_msg = f"API request failed with status {response.status_code}: {response.text}"
                        logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] {error_msg}")
                        if attempt < max_retries - 1:
                            logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Retrying in {retry_delay} seconds...")
                            await asyncio.sleep(retry_delay)
                            continue
                        raise Exception(error_msg)
                        
            except Exception as e:
                logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] TTS generation failed on attempt {attempt + 1}: {e}")
                if attempt < max_retries - 1:
                    logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Retrying in {retry_delay} seconds...")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # 指数退避
                else:
                    logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] All {max_retries} attempts failed")
                    logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] Full traceback: {traceback.format_exc()}")
                    raise
