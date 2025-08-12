"""
CosyVoice TTS with voice cloning capabilities
Based on cosyvoice_tts.py implementation adapted for the xiaozhi TTS framework
"""

import os
import time
import json
import base64
import tempfile
import traceback
from pathlib import Path
from typing import Optional, Dict, Union
from core.providers.tts.base import TTSProviderBase
from core.utils.tts import MarkdownCleaner
from config.logger import setup_logging

logger = setup_logging()
TAG = __name__

# Optional imports - will work without numpy/soundfile for basic functionality
try:
    import numpy as np
    import soundfile as sf
    HAS_AUDIO_LIBS = True
except ImportError:
    HAS_AUDIO_LIBS = False
    logger.bind(tag=TAG).warning("Audio processing libraries not available, using basic mode")


def audio_to_bytes(audio_path):
    """Convert audio file to bytes"""
    try:
        if isinstance(audio_path, (str, Path)) and os.path.exists(audio_path):
            with open(audio_path, 'rb') as f:
                return f.read()
        return b""
    except Exception as e:
        logger.bind(tag=TAG).error(f"Failed to read audio file {audio_path}: {e}")
        return b""


def read_ref_text(text_path):
    """Read reference text from file or return as string"""
    try:
        if isinstance(text_path, str):
            if os.path.exists(text_path):
                with open(text_path, 'r', encoding='utf-8') as f:
                    return f.read().strip()
            else:
                return text_path.strip()
        return str(text_path).strip()
    except Exception as e:
        logger.bind(tag=TAG).error(f"Failed to read reference text {text_path}: {e}")
        return ""


def wav_to_base64(wav_file_path: Union[str, Path]) -> str:
    """Convert WAV file to base64 string"""
    try:
        with open(wav_file_path, "rb") as wav_file:
            wav_data = wav_file.read()
            base64_data = base64.b64encode(wav_data).decode("utf-8")
            return base64_data
    except Exception as e:
        logger.bind(tag=TAG).error(f"Failed to convert WAV to base64: {e}")
        raise


def safe_temp_file_operation(audio_data: bytes) -> Optional[str]:
    """
    Safely create a temporary file for audio data and return base64 encoding
    
    Args:
        audio_data: Audio data as bytes
        
    Returns:
        Base64 encoded audio data or None if failed
    """
    tmp_path = None
    
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            tmp_path = tmp_file.name
        
        # Write audio data
        with open(tmp_path, 'wb') as f:
            f.write(audio_data)
        
        # Small delay to ensure file is fully written
        time.sleep(0.1)
        
        # Convert to base64
        base64_data = wav_to_base64(tmp_path)
        
        return base64_data
        
    except Exception as e:
        logger.bind(tag=TAG).error(f"Failed to process temporary audio file: {e}")
        return None
        
    finally:
        # Cleanup temporary file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception as e:
                logger.bind(tag=TAG).warning(f"Could not delete temp file {tmp_path}: {e}")


class TTSProvider(TTSProviderBase):
    """CosyVoice TTS provider with voice cloning capabilities"""
    
    def __init__(self, config, delete_audio_file):
        super().__init__(config, delete_audio_file)
        
        # Basic configuration
        self.model = config.get("model", "FunAudioLLM/CosyVoice2-0.5B")
        self.api_key = config.get("api_key", "")
        self.api_url = config.get("api_url", "https://api.siliconflow.cn/v1/audio/speech")
        self.response_format = config.get("response_format", "wav")
        self.audio_file_type = config.get("response_format", "wav")
        
        # Voice cloning configuration
        ref_audio = config.get("reference_audio", ["config/assets/wakeup_words.wav"])
        ref_text = config.get("reference_text", ["哈啰啊，我是小智啦"])
        
        # Handle both string and list inputs
        self.reference_audio = [ref_audio] if isinstance(ref_audio, str) else ref_audio
        self.reference_text = [ref_text] if isinstance(ref_text, str) else ref_text
        
        # TTS parameters
        self.normalize = str(config.get("normalize", True)).lower() in ("true", "1", "yes")
        self.max_new_tokens = int(config.get("max_new_tokens", "1024")) if config.get("max_new_tokens") else 1024
        self.chunk_length = int(config.get("chunk_length", "200")) if config.get("chunk_length") else 200
        
        # Float parameters
        top_p = config.get("top_p", "0.7")
        temperature = config.get("temperature", "0.7")
        repetition_penalty = config.get("repetition_penalty", "1.2")
        
        self.top_p = float(top_p) if top_p else 0.7
        self.temperature = float(temperature) if temperature else 0.7
        self.repetition_penalty = float(repetition_penalty) if repetition_penalty else 1.2
        
        # Other parameters
        self.streaming = str(config.get("streaming", False)).lower() in ("true", "1", "yes")
        self.use_memory_cache = config.get("use_memory_cache", "on")
        self.seed = int(config.get("seed")) if config.get("seed") else None
        
        # Audio settings
        self.channels = int(config.get("channels", "1")) if config.get("channels") else 1
        self.rate = int(config.get("rate", "44100")) if config.get("rate") else 44100
        
        if not self.api_key:
            raise ValueError("CosyVoice Clone API key not found")
        
        logger.bind(tag=TAG).info(f"CosyVoice Clone TTS initialized with model: {self.model}")
        logger.bind(tag=TAG).info(f"Reference audio files: {len(self.reference_audio)}")
        logger.bind(tag=TAG).info(f"Reference texts: {len(self.reference_text)}")

    async def text_to_speak(self, text, output_file):
        """
        Generate speech using CosyVoice with voice cloning
        """
        try:
            # Clean text
            text = MarkdownCleaner.clean_markdown(text)
            
            # Prepare reference data
            byte_audios = [audio_to_bytes(ref_audio) for ref_audio in self.reference_audio]
            ref_texts = [read_ref_text(ref_text) for ref_text in self.reference_text]
            
            # Prepare references for API
            references = []
            for ref_text, byte_audio in zip(ref_texts, byte_audios):
                if byte_audio:
                    # Convert audio bytes to base64
                    base64_audio = safe_temp_file_operation(byte_audio)
                    if base64_audio:
                        references.append({
                            "audio": f"data:audio/wav;base64,{base64_audio}",
                            "text": ref_text
                        })
            
            # Prepare request data
            request_data = {
                "model": self.model,
                "voice": "",  # Empty for voice cloning
                "input": text,
                "response_format": self.response_format,
                "extra_body": {
                    "references": references,
                    "normalize": self.normalize,
                    "max_new_tokens": self.max_new_tokens,
                    "chunk_length": self.chunk_length,
                    "top_p": self.top_p,
                    "temperature": self.temperature,
                    "repetition_penalty": self.repetition_penalty,
                    "streaming": self.streaming,
                    "use_memory_cache": self.use_memory_cache,
                    "channels": self.channels,
                    "rate": self.rate
                }
            }
            
            if self.seed is not None:
                request_data["extra_body"]["seed"] = self.seed
            
            # Prepare headers
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            
            logger.bind(tag=TAG).info(f"[COSYVOICE_CLONE] Sending TTS request for text: '{text[:50]}...'")
            logger.bind(tag=TAG).info(f"[COSYVOICE_CLONE] Using {len(references)} reference(s)")
            
            # Make request
            import requests
            response = requests.post(
                self.api_url,
                json=request_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                audio_data = response.content
                if output_file:
                    # Ensure output directory exists
                    os.makedirs(os.path.dirname(output_file), exist_ok=True)
                    with open(output_file, "wb") as f:
                        f.write(audio_data)
                    logger.bind(tag=TAG).info(f"[COSYVOICE_CLONE] Audio saved to: {output_file}")
                return audio_data
            else:
                error_msg = f"API request failed with status {response.status_code}: {response.text}"
                logger.bind(tag=TAG).error(f"[COSYVOICE_CLONE] {error_msg}")
                raise Exception(error_msg)
                
        except Exception as e:
            logger.bind(tag=TAG).error(f"[COSYVOICE_CLONE] TTS generation failed: {e}")
            logger.bind(tag=TAG).error(f"[COSYVOICE_CLONE] Full traceback: {traceback.format_exc()}")
            raise

    def to_tts(self, text: str) -> list:
        """
        Non-streaming TTS processing for testing and saving audio files
        
        Args:
            text: Text to convert
            
        Returns:
            list: List of audio data (empty for non-opus implementations)
        """
        try:
            import asyncio
            
            # Generate unique filename
            output_file = os.path.join(
                self.output_file,
                f"cosyvoice_clone_{int(time.time() * 1000)}.{self.audio_file_type}"
            )
            
            # Run async function
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                audio_data = loop.run_until_complete(self.text_to_speak(text, output_file))
                return [output_file] if audio_data else []
            finally:
                loop.close()
                
        except Exception as e:
            logger.bind(tag=TAG).error(f"[COSYVOICE_CLONE] to_tts failed: {e}")
            return []
