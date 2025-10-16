"""
CosyVoice TTS with voice cloning capabilities using 302.ai API
Based on the 302.ai API documentation for FunAudioLLM/CosyVoice2-0.5B

Features:
- Voice cloning with reference audio and text
- URI caching in database voice_demo field to avoid re-uploading
- Automatic retry mechanism for failed requests
- Clean error handling and logging
"""

import os
import json
import base64
import traceback
import asyncio
from pathlib import Path
from typing import Optional, Dict, List
from core.providers.tts.base import TTSProviderBase
from core.utils.tts import MarkdownCleaner
from config.logger import setup_logging

logger = setup_logging()
TAG = __name__


def audio_to_bytes(audio_path):
    """Convert audio file to bytes from file path"""
    try:
        # 处理文件路径
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
    """Read reference text from file or return as string"""
    try:
        if isinstance(text_path, str):
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
        
        # Handle both string and list inputs
        self.reference_audio = [ref_audio] if isinstance(ref_audio, str) else ref_audio
        self.reference_text = [ref_text] if isinstance(ref_text, str) else ref_text
        
        # Voice demo URIs (cached URIs from previous uploads)
        self.voice_demo = config.get("voice_demo", None)  # Can be a single URI string or list of URIs
        
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
        self.tts_voice_id = config.get("tts_voice_id", None)  # Voice ID for database update
        self._upload_reference_audios()
        
        logger.bind(tag=TAG).info(f"CosyVoice Clone 302.ai TTS initialized with model: {self.model}")
        logger.bind(tag=TAG).info(f"Reference audio files: {len(self.reference_audio)}")
        logger.bind(tag=TAG).info(f"Reference texts: {len(self.reference_text)}")
        logger.bind(tag=TAG).info(f"Pre-uploaded reference audio URIs: {len(self.reference_audio_uris)}")
        if self.tts_voice_id:
            logger.bind(tag=TAG).info(f"TTS Voice ID: {self.tts_voice_id}")

    def _upload_reference_audios(self):
        """
        Upload all reference audios during initialization to get URIs for later use.
        Check voice_demo cache first to avoid re-uploading.
        """
        try:
            import requests
            
            # Check if we have cached URI from voice_demo
            if self.voice_demo and isinstance(self.voice_demo, str) and self.voice_demo.strip():
                # Use cached URI directly (voice_demo is VARCHAR field storing single URL)
                self.reference_audio_uris = [self.voice_demo]
                logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Using cached URI from voice_demo, skipping upload: {self.voice_demo}")
                return
            
            # Get reference texts
            ref_texts = [read_ref_text(ref_text) for ref_text in self.reference_text]
            
            # Upload each reference audio
            for i, (ref_audio_path, ref_text) in enumerate(zip(self.reference_audio, ref_texts)):
                try:
                    logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Uploading reference audio {i+1}/{len(self.reference_audio)}")
                    
                    # 使用 audio_to_bytes 函数获取音频数据
                    audio_bytes = audio_to_bytes(ref_audio_path)
                    if not audio_bytes:
                        logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Failed to read reference audio file: {ref_audio_path}")
                        continue
                    
                    # 根据文件扩展名设置正确的MIME类型
                    file_ext = os.path.splitext(str(ref_audio_path))[1].lower()
                    mime_type = 'audio/mp3' if file_ext == '.mp3' else 'audio/wav'
                    
                    # 将音频数据转换为base64编码
                    base64_audio = base64.b64encode(audio_bytes).decode('utf-8')
                    
                    # 准备 multipart/form-data 数据
                    files = {
                        'model': (None, self.model),
                        'customName': (None, f"ref_{i+1}"),
                        'text': (None, ref_text),
                        'audio': (None, f"data:{mime_type};base64,{base64_audio}")
                    }
                    
                    headers = {
                        "Authorization": f"Bearer {self.api_key}",
                    }
                    
                    logger.bind(tag=TAG).debug(f"[COSYVOICE_302AI] Audio size: {len(audio_bytes)} bytes, Text: '{ref_text[:30]}...'")
                    
                    response = requests.post(
                        self.upload_ref_audio_url,
                        files=files,
                        headers=headers,
                        timeout=60
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        audio_uri = result.get('uri')
                        if audio_uri:
                            self.reference_audio_uris.append(audio_uri)
                            logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Reference audio {i+1} uploaded successfully")
                        else:
                            logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] No URI returned for reference audio {i+1}")
                    else:
                        logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] Failed to upload reference audio {i+1}: {response.status_code}")
                            
                except Exception as e:
                    logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] Error uploading reference audio {i+1}: {e}")
                    continue
            
            if not self.reference_audio_uris:
                logger.bind(tag=TAG).warning("[COSYVOICE_302AI] No reference audios uploaded successfully, will use default voice")
            else:
                # Save URIs to database voice_demo field
                self._save_uris_to_database()
                
        except Exception as e:
            logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] Error during reference audio upload initialization: {e}")
    
    async def _download_audio_from_response(self, response, output_file):
        """
        Download audio from API response
        
        Returns:
            Audio data as bytes, or None if failed
        """
        try:
            import requests
            
            result = response.json()
            audio_url = result.get('url')
            
            if not audio_url:
                logger.bind(tag=TAG).error("[COSYVOICE_302AI] No audio URL in response")
                return None
            
            # Download audio from URL
            audio_response = requests.get(audio_url, timeout=30)
            if audio_response.status_code == 200:
                audio_data = audio_response.content
                self._save_audio_to_file(audio_data, output_file)
                return audio_data
            else:
                logger.bind(tag=TAG).error(
                    f"[COSYVOICE_302AI] Failed to download audio: {audio_response.status_code}"
                )
                return None
                
        except Exception as e:
            logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] Error downloading audio: {e}")
            return None
    
    async def _handle_streaming_response(self, url, request_data, headers, output_file, attempt, max_retries, retry_delay):
        """
        Handle streaming API response
        
        Returns:
            Audio data as bytes, or None if retry is needed
        """
        try:
            import requests
            
            response = requests.post(
                url,
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
                
                self._save_audio_to_file(audio_data, output_file)
                return audio_data
            else:
                logger.bind(tag=TAG).error(
                    f"[COSYVOICE_302AI] Streaming request failed: {response.status_code}"
                )
                if attempt < max_retries - 1:
                    logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Retrying in {retry_delay}s...")
                    return None
                raise Exception(f"Streaming failed with status {response.status_code}")
                
        except Exception as e:
            logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] Streaming error: {e}")
            if attempt < max_retries - 1:
                return None
            raise
    
    def _save_audio_to_file(self, audio_data, output_file):
        """Save audio data to file"""
        if output_file and audio_data:
            try:
                os.makedirs(os.path.dirname(output_file), exist_ok=True)
                with open(output_file, "wb") as f:
                    f.write(audio_data)
                logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Audio saved to: {output_file}")
            except Exception as e:
                logger.bind(tag=TAG).error(f"[COSYVOICE_302AI] Failed to save audio file: {e}")
    
    def _save_uris_to_database(self):
        """Save uploaded URI to database voice_demo field (first URI only)"""
        if not self.tts_voice_id or not self.reference_audio_uris:
            logger.bind(tag=TAG).debug("[COSYVOICE_302AI] No tts_voice_id or URIs to save, skipping database update")
            return
        
        try:
            import mysql.connector
            from mysql.connector import Error
            
            # Get database config from ElderCare module if available
            try:
                # Try to import ElderCare config
                eldercare_config_path = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                    'ElderCare',
                    'config.json'
                )
                
                if os.path.exists(eldercare_config_path):
                    with open(eldercare_config_path, 'r') as f:
                        config = json.load(f)
                        db_config = config.get('database', {})
                else:
                    logger.bind(tag=TAG).debug("[COSYVOICE_302AI] No ElderCare config found, skipping database update")
                    return
                
                # Connect to database
                conn = mysql.connector.connect(
                    host=db_config.get('host', 'localhost'),
                    port=db_config.get('port', 3306),
                    user=db_config.get('user', 'root'),
                    password=db_config.get('password', ''),
                    database=db_config.get('database', 'xiaozhi'),
                    charset='utf8mb4',
                    collation='utf8mb4_unicode_ci'
                )
                
                cursor = conn.cursor()
                
                # Store first URI only (VARCHAR(500) field)
                first_uri = self.reference_audio_uris[0]
                
                cursor.execute(
                    "UPDATE ai_tts_voice SET voice_demo = %s, update_date = NOW() WHERE id = %s",
                    (first_uri, self.tts_voice_id)
                )
                
                conn.commit()
                cursor.close()
                conn.close()
                
                logger.bind(tag=TAG).info(f"[COSYVOICE_302AI] Saved URI to database voice_demo field: {first_uri}")
                
            except (ImportError, FileNotFoundError, KeyError) as e:
                logger.bind(tag=TAG).debug(f"[COSYVOICE_302AI] Could not access database config: {e}, skipping save")
                
        except Exception as e:
            logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Failed to save URI to database: {e}")

    async def text_to_speak(self, text, output_file):
        """
        Generate speech using CosyVoice with voice cloning via 302.ai API
        
        Args:
            text: Text to synthesize
            output_file: Path to save the audio file (optional)
            
        Returns:
            Audio data as bytes
        """
        max_retries = 3
        retry_delay = 1  # Initial retry delay in seconds
        
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
                    audio_data = await self._handle_streaming_response(
                        self.api_url, request_data, headers, output_file, attempt, max_retries, retry_delay
                    )
                    if audio_data is None:
                        # Retry needed
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2
                        continue
                    return audio_data
                else:
                    # Handle non-streaming response
                    response = requests.post(
                        self.api_url,
                        json=request_data,
                        headers=headers,
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        audio_data = await self._download_audio_from_response(response, output_file)
                        if audio_data:
                            return audio_data
                        else:
                            # Retry needed
                            if attempt < max_retries - 1:
                                logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Retrying in {retry_delay}s...")
                                await asyncio.sleep(retry_delay)
                                retry_delay *= 2
                                continue
                            raise Exception("No audio data received")
                    elif response.status_code == 500:
                        # 302.ai API sometimes returns 500 with valid response
                        logger.bind(tag=TAG).warning("[COSYVOICE_302AI] Received 500 status, attempting to parse response")
                        audio_data = await self._download_audio_from_response(response, output_file)
                        if audio_data:
                            logger.bind(tag=TAG).info("[COSYVOICE_302AI] Successfully recovered audio from 500 response")
                            return audio_data
                        
                        # Real 500 error - retry
                        if attempt < max_retries - 1:
                            logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Retrying in {retry_delay}s...")
                            await asyncio.sleep(retry_delay)
                            retry_delay *= 2
                            continue
                        raise Exception(f"API error 500: {response.text}")
                    elif response.status_code == 400:
                        # 400 error might be expired URI - re-upload and retry
                        if attempt < max_retries - 1 and self.reference_audio_uris:
                            logger.bind(tag=TAG).warning("[COSYVOICE_302AI] 400 error, re-uploading reference audio...")
                            self.reference_audio_uris = []
                            self._upload_reference_audios()
                            await asyncio.sleep(retry_delay)
                            retry_delay *= 2
                            continue
                        raise Exception(f"Bad request: {response.status_code} - {response.text}")
                    else:
                        # Other errors
                        logger.bind(tag=TAG).error(
                            f"[COSYVOICE_302AI] Request failed: {response.status_code}"
                        )
                        if attempt < max_retries - 1:
                            logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Retrying in {retry_delay}s...")
                            await asyncio.sleep(retry_delay)
                            retry_delay *= 2
                            continue
                        raise Exception(f"API error {response.status_code}: {response.text}")
                        
            except Exception as e:
                logger.bind(tag=TAG).error(
                    f"[COSYVOICE_302AI] Attempt {attempt + 1}/{max_retries} failed: {e}"
                )
                if attempt < max_retries - 1:
                    logger.bind(tag=TAG).warning(f"[COSYVOICE_302AI] Retrying in {retry_delay}s...")
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    logger.bind(tag=TAG).error(
                        f"[COSYVOICE_302AI] All {max_retries} attempts failed. Traceback:\n{traceback.format_exc()}"
                    )
                    raise
