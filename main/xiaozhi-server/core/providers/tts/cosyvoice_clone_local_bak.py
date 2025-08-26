"""
CosyVoice TTS with voice cloning capabilities using local model
Based on CosyVoice2 local inference implementation
"""

import os
import tempfile
import traceback
import torchaudio
from pathlib import Path
from typing import Optional, Dict, Union, List
from core.providers.tts.base import TTSProviderBase
from core.utils.tts import MarkdownCleaner
from config.logger import setup_logging

logger = setup_logging()
TAG = __name__

# Required imports for CosyVoice2 local inference
try:
    import torch
    import numpy as np
    import soundfile as sf
    
    # Import CosyVoice2 directly from the model directory
    try:
        import sys
        
        # Try to add CosyVoice path if it exists locally
        cosyvoice_paths = [
            'third_party/Matcha-TTS',
            '/opt/CosyVoice/third_party/Matcha-TTS',
            '../third_party/Matcha-TTS',
            './CosyVoice/third_party/Matcha-TTS'
        ]
        
        for path in cosyvoice_paths:
            if os.path.exists(path):
                sys.path.append(path)
                logger.bind(tag=TAG).info(f"Added CosyVoice path: {path}")
                break
        
        from cosyvoice.cli.cosyvoice import CosyVoice2
        from cosyvoice.utils.file_utils import load_wav
        COSYVOICE_AVAILABLE = True
        logger.bind(tag=TAG).info("CosyVoice2 successfully imported")
    except ImportError as e:
        COSYVOICE_AVAILABLE = False
        logger.bind(tag=TAG).warning(f"Failed to import CosyVoice2: {e}")
        logger.bind(tag=TAG).warning("Please install CosyVoice from https://github.com/FunAudioLLM/CosyVoice")
        logger.bind(tag=TAG).info("Installation steps:")
        logger.bind(tag=TAG).info("1. git clone --recursive https://github.com/FunAudioLLM/CosyVoice.git")
        logger.bind(tag=TAG).info("2. cd CosyVoice")
        logger.bind(tag=TAG).info("3. conda create -n cosyvoice python=3.10")
        logger.bind(tag=TAG).info("4. conda activate cosyvoice")
        logger.bind(tag=TAG).info("5. pip install -r requirements.txt")
        
    HAS_AUDIO_LIBS = True
except ImportError as e:
    HAS_AUDIO_LIBS = False
    COSYVOICE_AVAILABLE = False
    logger.bind(tag=TAG).error(f"Required audio libraries not available: {e}")
    logger.bind(tag=TAG).error("Please install: pip install torch torchaudio numpy soundfile")


def validate_model_directory(model_dir: str):
    """Validate that the model directory exists and has required files"""
    try:
        if not os.path.exists(model_dir):
            logger.bind(tag=TAG).error(f"Model directory not found: {model_dir}")
            return False
        
        # Check for key model files (CosyVoice2 uses different file structure)
        key_files = ["cosyvoice.yaml", "configuration.json"]  # These are typical CosyVoice2 files
        for file in key_files:
            file_path = os.path.join(model_dir, file)
            if os.path.exists(file_path):
                logger.bind(tag=TAG).info(f"Found model file: {file_path}")
                return True
        
        # If specific files not found, check if directory has any model files
        files = os.listdir(model_dir)
        if len(files) > 0:
            logger.bind(tag=TAG).info(f"Model directory contains {len(files)} files")
            return True
        
        logger.bind(tag=TAG).error(f"Model directory {model_dir} exists but appears empty")
        return False
        
    except Exception as e:
        logger.bind(tag=TAG).error(f"Failed to validate model directory {model_dir}: {e}")
        return False


def load_reference_audio(audio_path: str, target_sr: int = 16000):
    """Load reference audio for CosyVoice2 inference"""
    try:
        # 首先尝试从音频管理器获取
        try:
            from core.audio_manager import audio_manager
            actual_path = audio_manager.get_audio_file_path(audio_path)
            if actual_path and os.path.exists(actual_path):
                audio_path = actual_path
        except Exception:
            pass
        
        # 检查文件是否存在
        if not os.path.exists(audio_path):
            logger.bind(tag=TAG).error(f"Reference audio file not found: {audio_path}")
            return None
        
        # 使用CosyVoice的load_wav函数加载音频
        if COSYVOICE_AVAILABLE:
            try:
                audio_tensor = load_wav(audio_path, target_sr)
                return audio_tensor
            except Exception as e:
                logger.bind(tag=TAG).error(f"Failed to load audio with CosyVoice load_wav: {e}")
        
        # 备用方法：使用torchaudio加载
        try:
            waveform, sample_rate = torchaudio.load(audio_path)
            
            # 转换为单声道
            if waveform.size(0) > 1:
                waveform = torch.mean(waveform, dim=0, keepdim=True)
            
            # 重采样到目标采样率
            if sample_rate != target_sr:
                resampler = torchaudio.transforms.Resample(sample_rate, target_sr)
                waveform = resampler(waveform)
            
            return waveform.squeeze(0)  # Remove channel dimension
        except Exception as e:
            logger.bind(tag=TAG).error(f"Failed to load audio with torchaudio: {e}")
            return None
            
    except Exception as e:
        logger.bind(tag=TAG).error(f"Failed to load reference audio {audio_path}: {e}")
        return None


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


def save_audio_tensor(audio_tensor: torch.Tensor, output_path: str, sample_rate: int = 24000):
    """Save audio tensor to file"""
    try:
        # 确保输出目录存在
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # 使用torchaudio保存音频
        if audio_tensor.dim() == 1:
            audio_tensor = audio_tensor.unsqueeze(0)  # Add channel dimension
        
        torchaudio.save(output_path, audio_tensor, sample_rate, bits_per_sample=16)
        logger.bind(tag=TAG).info(f"Audio saved to: {output_path}")
        return True
    except Exception as e:
        logger.bind(tag=TAG).error(f"Failed to save audio to {output_path}: {e}")
        return False


class CosyVoiceModelWrapper:
    """Wrapper for CosyVoice2 model to handle local inference"""
    
    def __init__(self, model_dir: str = "models/CosyVoice2-0.5B"):
        self.model_dir = model_dir
        self.model = None
        self.sample_rate = 24000
        
    def load_model(self, **kwargs):
        """Load CosyVoice2 model"""
        try:
            # Check if CosyVoice is available
            if not COSYVOICE_AVAILABLE:
                raise Exception("CosyVoice2 not available - please install from official repository")
            
            # Validate model directory exists
            if not validate_model_directory(self.model_dir):
                raise Exception(f"Model directory validation failed: {self.model_dir}")
            
            logger.bind(tag=TAG).info(f"Loading CosyVoice2 model from {self.model_dir}")
            
            # Initialize CosyVoice2 model
            self.model = CosyVoice2(
                self.model_dir,
                load_jit=kwargs.get('load_jit', False),
                load_trt=kwargs.get('load_trt', False), 
                load_vllm=kwargs.get('load_vllm', False),
                fp16=kwargs.get('fp16', False)
            )
            
            logger.bind(tag=TAG).info("CosyVoice2 model loaded successfully")
            return True
            
        except Exception as e:
            logger.bind(tag=TAG).error(f"Failed to load CosyVoice2 model: {e}")
            logger.bind(tag=TAG).error(f"Full traceback: {traceback.format_exc()}")
            
            if not COSYVOICE_AVAILABLE:
                logger.bind(tag=TAG).error("Installation guide:")
                logger.bind(tag=TAG).error("1. git clone --recursive https://github.com/FunAudioLLM/CosyVoice.git")
                logger.bind(tag=TAG).error("2. cd CosyVoice && conda activate xiaozhi")
                logger.bind(tag=TAG).error("3. pip install -r requirements.txt")
                logger.bind(tag=TAG).error("4. Add 'sys.path.append(\"/path/to/CosyVoice/third_party/Matcha-TTS\")' to your code")
            
            return False
    
    def inference_zero_shot(self, text: str, ref_text: str, ref_audio: torch.Tensor, 
                           stream: bool = False) -> List[Dict]:
        """Perform zero-shot inference with reference audio and text"""
        try:
            if self.model is None:
                raise Exception("Model not loaded. Please call load_model() first.")
            
            results = []
            
            # Handle streaming vs non-streaming
            if stream:
                # For streaming, collect all chunks
                for i, result in enumerate(self.model.inference_zero_shot(
                    text, ref_text, ref_audio, stream=True
                )):
                    results.append({
                        'index': i,
                        'tts_speech': result['tts_speech'],
                        'sample_rate': self.sample_rate,
                        'is_chunk': True
                    })
            else:
                # For non-streaming, get single result
                for i, result in enumerate(self.model.inference_zero_shot(
                    text, ref_text, ref_audio, stream=False
                )):
                    results.append({
                        'index': i,
                        'tts_speech': result['tts_speech'],
                        'sample_rate': self.sample_rate,
                        'is_chunk': False
                    })
            
            return results
            
        except Exception as e:
            logger.bind(tag=TAG).error(f"Zero-shot inference failed: {e}")
            raise
    
    def save_spkinfo(self):
        """Save speaker info if model supports it"""
        try:
            if self.model and hasattr(self.model, 'save_spkinfo'):
                self.model.save_spkinfo()
        except Exception as e:
            logger.bind(tag=TAG).warning(f"Failed to save speaker info: {e}")
    
    def add_zero_shot_spk(self, ref_text: str, ref_audio: torch.Tensor, spk_id: str):
        """Add zero-shot speaker if model supports it"""
        try:
            if self.model and hasattr(self.model, 'add_zero_shot_spk'):
                return self.model.add_zero_shot_spk(ref_text, ref_audio, spk_id)
            return False
        except Exception as e:
            logger.bind(tag=TAG).warning(f"Failed to add zero-shot speaker: {e}")
            return False


class TTSProvider(TTSProviderBase):
    """CosyVoice TTS provider with voice cloning capabilities using local model"""
    
    def __init__(self, config, delete_audio_file):
        super().__init__(config, delete_audio_file)
        
        # Model configuration
        self.model_dir = config.get("model_dir", "models/CosyVoice2-0.5B")
        self.model_wrapper = None
        
        # Audio format configuration
        self.audio_file_type = config.get("response_format", "wav")
        
        # Voice cloning configuration
        ref_audio = config.get("reference_audio", ["config/assets/standard_xiaoyu.wav"])
        ref_text = config.get("reference_text", ["你好，我是晓宇，我是山东滨州人，这是我的普通话测试部分。"])
        
        # 检查是否使用音频管理器
        use_audio_manager = config.get("use_audio_manager", False)
        if use_audio_manager:
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
        
        # Handle both string and list inputs
        self.reference_audio = [ref_audio] if isinstance(ref_audio, str) else ref_audio
        self.reference_text = [ref_text] if isinstance(ref_text, str) else ref_text
        
        # TTS generation parameters
        self.streaming = config.get("streaming", False)
        
        # Model loading parameters
        self.load_jit = config.get("load_jit", False)
        self.load_trt = config.get("load_trt", False)
        self.load_vllm = config.get("load_vllm", False)
        self.fp16 = config.get("fp16", False)
        
        # Initialize model wrapper
        self._initialize_model()
        
        logger.bind(tag=TAG).info(f"CosyVoice local TTS initialized with model: {self.model_dir}")
        logger.bind(tag=TAG).info(f"Reference audio files: {len(self.reference_audio)}")
        logger.bind(tag=TAG).info(f"Reference texts: {len(self.reference_text)}")
    
    def _initialize_model(self):
        """Initialize the CosyVoice2 model"""
        try:
            # Check if CosyVoice is available
            if not COSYVOICE_AVAILABLE:
                logger.bind(tag=TAG).error("CosyVoice2 is not available. Please install from official repository:")
                logger.bind(tag=TAG).error("https://github.com/FunAudioLLM/CosyVoice")
                logger.bind(tag=TAG).error("Note: pip install cosyvoice installs a different package, not the official one")
                raise Exception("CosyVoice2 not available - please install from official repository")
            
            logger.bind(tag=TAG).info("Initializing CosyVoice2 model...")
            
            # Check if required libraries are available
            if not HAS_AUDIO_LIBS:
                raise Exception("Required audio libraries (torch, torchaudio, numpy, soundfile) not available")
            
            # Validate model directory path
            abs_model_dir = os.path.abspath(self.model_dir)
            if not os.path.exists(os.path.dirname(abs_model_dir)):
                os.makedirs(os.path.dirname(abs_model_dir), exist_ok=True)
                logger.bind(tag=TAG).info(f"Created model directory: {os.path.dirname(abs_model_dir)}")
            
            self.model_wrapper = CosyVoiceModelWrapper(abs_model_dir)
            success = self.model_wrapper.load_model(
                load_jit=self.load_jit,
                load_trt=self.load_trt,
                load_vllm=self.load_vllm,
                fp16=self.fp16
            )
            
            if not success:
                logger.bind(tag=TAG).warning("CosyVoice2 model initialization failed, will retry on first inference")
                self.model_wrapper = None
            else:
                logger.bind(tag=TAG).info("CosyVoice2 model initialized successfully")
                
        except Exception as e:
            logger.bind(tag=TAG).error(f"Model initialization failed: {e}")
            logger.bind(tag=TAG).warning("Will attempt to initialize model on first inference")
            self.model_wrapper = None
    
    async def text_to_speak(self, text, output_file):
        """
        Generate speech using CosyVoice2 with voice cloning
        """
        try:
            # Lazy initialization if model failed to load initially
            if self.model_wrapper is None:
                logger.bind(tag=TAG).info("Attempting delayed model initialization...")
                self._initialize_model()
                
                if self.model_wrapper is None:
                    raise Exception("CosyVoice2 model initialization failed")
            
            # Clean text
            text = MarkdownCleaner.clean_markdown(text)
            if not text.strip():
                raise Exception("Empty text after cleaning")
            
            # Load reference audio and text
            ref_audios = []
            ref_texts = []
            
            for i, (ref_audio_path, ref_text) in enumerate(zip(self.reference_audio, self.reference_text)):
                # Load reference audio
                logger.bind(tag=TAG).debug(f"Loading reference audio {i}: {ref_audio_path}")
                audio_tensor = load_reference_audio(ref_audio_path, target_sr=16000)
                if audio_tensor is None:
                    logger.bind(tag=TAG).warning(f"Failed to load reference audio {i}: {ref_audio_path}")
                    continue
                
                # Get reference text
                ref_text_str = read_ref_text(ref_text)
                if not ref_text_str:
                    logger.bind(tag=TAG).warning(f"Empty reference text {i}: {ref_text}")
                    continue
                
                ref_audios.append(audio_tensor)
                ref_texts.append(ref_text_str)
                logger.bind(tag=TAG).debug(f"Loaded reference {i}: text length={len(ref_text_str)}, audio shape={audio_tensor.shape}")
            
            if not ref_audios or not ref_texts:
                raise Exception("No valid reference audio/text pairs found. Please check your reference files.")
            
            # Use the first reference for inference (CosyVoice2 typically uses one reference)
            ref_audio = ref_audios[0]
            ref_text = ref_texts[0]
            
            logger.bind(tag=TAG).info(f"[COSYVOICE_LOCAL] Generating speech for: '{text[:50]}...'")
            logger.bind(tag=TAG).info(f"[COSYVOICE_LOCAL] Using reference text: '{ref_text[:50]}...'")
            logger.bind(tag=TAG).info(f"[COSYVOICE_LOCAL] Reference audio shape: {ref_audio.shape}")
            
            # Perform zero-shot inference
            results = self.model_wrapper.inference_zero_shot(
                text=text,
                ref_text=ref_text,
                ref_audio=ref_audio,
                stream=self.streaming
            )
            
            if not results:
                raise Exception("No audio generated from inference")
            
            # Handle streaming vs non-streaming results
            if self.streaming and len(results) > 1:
                # Concatenate streaming chunks
                audio_chunks = [result['tts_speech'] for result in results]
                audio_tensor = torch.cat(audio_chunks, dim=-1)
                sample_rate = results[0]['sample_rate']
                logger.bind(tag=TAG).info(f"[COSYVOICE_LOCAL] Concatenated {len(audio_chunks)} audio chunks")
            else:
                # Use single result
                audio_tensor = results[0]['tts_speech']
                sample_rate = results[0]['sample_rate']
            
            logger.bind(tag=TAG).info(f"[COSYVOICE_LOCAL] Generated audio shape: {audio_tensor.shape}, sample_rate: {sample_rate}")
            
            # Save or return audio
            if output_file:
                # Save audio to file
                success = save_audio_tensor(audio_tensor, output_file, sample_rate)
                if not success:
                    raise Exception(f"Failed to save audio to {output_file}")
                
                # Read file as bytes to return
                with open(output_file, 'rb') as f:
                    audio_data = f.read()
                
                logger.bind(tag=TAG).info(f"[COSYVOICE_LOCAL] Audio saved to: {output_file} ({len(audio_data)} bytes)")
                return audio_data
            else:
                # Convert tensor to bytes without saving file
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                    tmp_path = tmp_file.name
                
                try:
                    success = save_audio_tensor(audio_tensor, tmp_path, sample_rate)
                    if not success:
                        raise Exception("Failed to create temporary audio file")
                    
                    with open(tmp_path, 'rb') as f:
                        audio_data = f.read()
                    
                    logger.bind(tag=TAG).info(f"[COSYVOICE_LOCAL] Generated audio data: {len(audio_data)} bytes")
                    return audio_data
                finally:
                    # Clean up temporary file
                    try:
                        os.unlink(tmp_path)
                    except Exception:
                        pass
                
        except Exception as e:
            logger.bind(tag=TAG).error(f"[COSYVOICE_LOCAL] TTS generation failed: {e}")
            logger.bind(tag=TAG).error(f"[COSYVOICE_LOCAL] Full traceback: {traceback.format_exc()}")
            raise
