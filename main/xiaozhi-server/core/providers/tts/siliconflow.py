import os
import base64
import requests
from config.logger import setup_logging
from core.providers.tts.base import TTSProviderBase

TAG = __name__
logger = setup_logging()


class TTSProvider(TTSProviderBase):
    def __init__(self, config, delete_audio_file):
        super().__init__(config, delete_audio_file)
        self.model = config.get("model")
        self.access_token = config.get("access_token")
        if config.get("private_voice"):
            self.voice = config.get("private_voice")
        else:
            self.voice = config.get("voice")
        self.response_format = config.get("response_format", "mp3")
        self.audio_file_type = config.get("response_format", "mp3")
        self.sample_rate = config.get("sample_rate")
        self.speed = float(config.get("speed", 1.0))
        self.gain = config.get("gain")

        self.host = "api.siliconflow.cn"
        self.api_url = f"https://{self.host}/v1/audio/speech"
        self.upload_url = f"https://{self.host}/v1/uploads/audio/voice"

    def upload_voice(self, audio_file_path: str, custom_name: str, reference_text: str) -> dict:
        """上传音色到硅基流动并获取音色ID
        
        Args:
            audio_file_path: 参考音频文件路径
            custom_name: 自定义音色名称
            reference_text: 参考音频的文字内容
            
        Returns:
            dict: {"success": bool, "voice_id": str, "message": str}
        """
        try:
            # 检查文件是否存在
            if not os.path.exists(audio_file_path):
                return {
                    "success": False,
                    "voice_id": None,
                    "message": f"音频文件不存在: {audio_file_path}"
                }
            
            # 检查并转换音频格式：硅基流动只支持 wav/mp3/pcm/opus
            import subprocess
            import tempfile
            
            file_ext = os.path.splitext(audio_file_path)[1].lower()
            supported_formats = ['.wav', '.mp3', '.pcm', '.opus']
            
            converted_file = None
            upload_file_path = audio_file_path
            
            if file_ext not in supported_formats:
                # 需要转换格式，使用 ffmpeg 转换为 wav
                logger.bind(tag=TAG).info(f"[硅基流动] 音频格式 {file_ext} 不支持，正在转换为 wav...")
                try:
                    # 创建临时文件
                    temp_dir = tempfile.mkdtemp()
                    converted_file = os.path.join(temp_dir, "converted.wav")
                    
                    # 使用 ffmpeg 转换
                    cmd = [
                        'ffmpeg', '-y', '-i', audio_file_path,
                        '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
                        converted_file
                    ]
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                    
                    if result.returncode == 0 and os.path.exists(converted_file):
                        upload_file_path = converted_file
                        logger.bind(tag=TAG).info(f"[硅基流动] 音频格式转换成功")
                    else:
                        logger.bind(tag=TAG).error(f"[硅基流动] ffmpeg转换失败: {result.stderr}")
                        return {
                            "success": False,
                            "voice_id": None,
                            "message": f"音频格式转换失败: {result.stderr}"
                        }
                except FileNotFoundError:
                    logger.bind(tag=TAG).error("[硅基流动] ffmpeg未安装，无法转换音频格式")
                    return {
                        "success": False,
                        "voice_id": None,
                        "message": "ffmpeg未安装，无法转换音频格式。请安装ffmpeg或上传wav/mp3格式的音频。"
                    }
                except Exception as conv_err:
                    logger.bind(tag=TAG).error(f"[硅基流动] 音频转换异常: {conv_err}")
                    return {
                        "success": False,
                        "voice_id": None,
                        "message": f"音频转换失败: {str(conv_err)}"
                    }
            
            # 处理音色名称：硅基流动只支持字母、数字、下划线和连字符，不超过64字符
            # 如果包含中文等非法字符，转换为拼音或使用UUID
            import re
            import uuid
            
            # 检查是否包含非法字符
            if not re.match(r'^[a-zA-Z0-9_-]+$', custom_name):
                # 尝试使用拼音转换（如果可用）
                try:
                    from pypinyin import pinyin, Style
                    pinyin_name = ''.join([p[0] for p in pinyin(custom_name, style=Style.NORMAL)])
                    # 移除非法字符并限制长度
                    safe_name = re.sub(r'[^a-zA-Z0-9_-]', '', pinyin_name)
                    if safe_name:
                        custom_name = safe_name[:64]
                    else:
                        custom_name = f"voice_{uuid.uuid4().hex[:12]}"
                except ImportError:
                    # 如果没有pypinyin，使用UUID
                    custom_name = f"voice_{uuid.uuid4().hex[:12]}"
                
                logger.bind(tag=TAG).info(f"[硅基流动] 音色名称转换为: {custom_name}")
            
            # 确保长度不超过64字符
            custom_name = custom_name[:64]
            
            headers = {
                "Authorization": f"Bearer {self.access_token}"
            }
            
            try:
                # 使用文件上传方式
                with open(upload_file_path, 'rb') as audio_file:
                    files = {
                        "file": (os.path.basename(upload_file_path), audio_file)
                    }
                    data = {
                        "model": self.model,
                        "customName": custom_name,
                        "text": reference_text
                    }
                    
                    logger.bind(tag=TAG).info(f"[硅基流动] 正在上传音色: {custom_name}, 文件: {upload_file_path}")
                    
                    response = requests.post(
                        self.upload_url,
                        headers=headers,
                        files=files,
                        data=data,
                        timeout=60
                    )
                
                if response.status_code == 200:
                    result = response.json()
                    voice_uri = result.get('uri')
                    
                    if voice_uri:
                        logger.bind(tag=TAG).info(f"[硅基流动] 音色上传成功: {voice_uri}")
                        return {
                            "success": True,
                            "voice_id": voice_uri,
                            "message": "音色上传成功"
                        }
                    else:
                        logger.bind(tag=TAG).error(f"[硅基流动] 上传响应中没有uri: {result}")
                        return {
                            "success": False,
                            "voice_id": None,
                            "message": "上传响应中没有返回uri"
                        }
                else:
                    error_msg = f"HTTP {response.status_code}: {response.text}"
                    logger.bind(tag=TAG).error(f"[硅基流动] 音色上传失败: {error_msg}")
                    return {
                        "success": False,
                        "voice_id": None,
                        "message": error_msg
                    }
            finally:
                # 清理临时转换的文件
                if converted_file and os.path.exists(converted_file):
                    try:
                        os.remove(converted_file)
                        os.rmdir(os.path.dirname(converted_file))
                    except:
                        pass
                
        except Exception as e:
            logger.bind(tag=TAG).error(f"[硅基流动] 音色上传异常: {e}")
            return {
                "success": False,
                "voice_id": None,
                "message": str(e)
            }

    async def text_to_speak(self, text, output_file):
        request_json = {
            "model": self.model,
            "input": text,
            "voice": self.voice,
            "response_format": self.response_format,
        }
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        try:
            response = requests.request(
                "POST", self.api_url, json=request_json, headers=headers
            )
            data = response.content
            if output_file:
                with open(output_file, "wb") as file_to_save:
                    file_to_save.write(data)
            else:
                return data
        except Exception as e:
            raise Exception(f"{__name__} error: {e}")
