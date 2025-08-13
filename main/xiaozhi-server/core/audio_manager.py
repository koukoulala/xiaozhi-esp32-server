"""
音频文件上传和管理模块
支持多种音频格式的上传、存储和管理
"""

import os
import uuid
import hashlib
import mimetypes
from pathlib import Path
from typing import List, Dict, Optional
import json
import shutil
from datetime import datetime

# 支持的音频格式
SUPPORTED_AUDIO_FORMATS = {
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.wma': 'audio/x-ms-wma',
    '.opus': 'audio/opus',
    '.webm': 'audio/webm',
    '.amr': 'audio/amr'
}

# 最大文件大小 (50MB)
MAX_FILE_SIZE = 50 * 1024 * 1024

class AudioFileManager:
    """音频文件管理器"""
    
    def __init__(self, upload_dir: str = "data/audio_uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # 创建子目录
        self.reference_dir = self.upload_dir / "reference"
        self.temp_dir = self.upload_dir / "temp"
        self.reference_dir.mkdir(exist_ok=True)
        self.temp_dir.mkdir(exist_ok=True)
        
        # 音频文件索引
        self.index_file = self.upload_dir / "audio_index.json"
        self.load_index()
    
    def load_index(self):
        """加载音频文件索引"""
        if self.index_file.exists():
            try:
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    self.audio_index = json.load(f)
            except:
                self.audio_index = {}
        else:
            self.audio_index = {}
    
    def save_index(self):
        """保存音频文件索引"""
        with open(self.index_file, 'w', encoding='utf-8') as f:
            json.dump(self.audio_index, f, indent=2, ensure_ascii=False)
    
    def validate_audio_file(self, file_path: str, file_size: int) -> tuple[bool, str]:
        """验证音频文件"""
        # 检查文件大小
        if file_size > MAX_FILE_SIZE:
            return False, f"文件大小超过限制 ({MAX_FILE_SIZE // (1024*1024)}MB)"
        
        # 检查文件扩展名
        file_ext = Path(file_path).suffix.lower()
        if file_ext not in SUPPORTED_AUDIO_FORMATS:
            supported_formats = ', '.join(SUPPORTED_AUDIO_FORMATS.keys())
            return False, f"不支持的音频格式。支持的格式: {supported_formats}"
        
        return True, "验证通过"
    
    def generate_file_id(self, original_filename: str, file_content: bytes) -> str:
        """生成唯一文件ID"""
        # 使用文件内容的哈希值 + 时间戳生成唯一ID
        content_hash = hashlib.md5(file_content).hexdigest()[:8]
        timestamp = str(int(datetime.now().timestamp()))
        return f"{content_hash}_{timestamp}"
    
    def save_audio_file(self, file_content: bytes, original_filename: str, 
                       reference_text: str = "", purpose: str = "reference") -> Dict:
        """保存音频文件"""
        # 验证文件
        is_valid, message = self.validate_audio_file(original_filename, len(file_content))
        if not is_valid:
            raise ValueError(message)
        
        # 生成文件ID和路径
        file_id = self.generate_file_id(original_filename, file_content)
        file_ext = Path(original_filename).suffix.lower()
        
        if purpose == "reference":
            save_dir = self.reference_dir
        else:
            save_dir = self.temp_dir
            
        saved_filename = f"{file_id}{file_ext}"
        save_path = save_dir / saved_filename
        
        # 保存文件
        with open(save_path, 'wb') as f:
            f.write(file_content)
        
        # 更新索引
        file_info = {
            "id": file_id,
            "original_filename": original_filename,
            "saved_filename": saved_filename,
            "file_path": str(save_path),
            "relative_path": str(save_path.relative_to(self.upload_dir.parent)) if save_path.is_absolute() else str(save_path),
            "file_size": len(file_content),
            "mime_type": SUPPORTED_AUDIO_FORMATS[file_ext],
            "reference_text": reference_text,
            "purpose": purpose,
            "upload_time": datetime.now().isoformat(),
            "file_hash": hashlib.md5(file_content).hexdigest()
        }
        
        self.audio_index[file_id] = file_info
        self.save_index()
        
        return file_info
    
    def get_audio_file(self, file_id: str) -> Optional[Dict]:
        """获取音频文件信息"""
        return self.audio_index.get(file_id)
    
    def list_audio_files(self, purpose: str = None) -> List[Dict]:
        """列出音频文件"""
        files = list(self.audio_index.values())
        if purpose:
            files = [f for f in files if f.get("purpose") == purpose]
        
        # 按上传时间倒序排列
        files.sort(key=lambda x: x.get("upload_time", ""), reverse=True)
        return files
    
    def delete_audio_file(self, file_id: str) -> bool:
        """删除音频文件"""
        if file_id not in self.audio_index:
            return False
        
        file_info = self.audio_index[file_id]
        file_path = Path(file_info["file_path"])
        
        # 删除物理文件
        if file_path.exists():
            file_path.unlink()
        
        # 从索引中移除
        del self.audio_index[file_id]
        self.save_index()
        
        return True
    
    def update_reference_text(self, file_id: str, reference_text: str) -> bool:
        """更新参考文本"""
        if file_id not in self.audio_index:
            return False
        
        self.audio_index[file_id]["reference_text"] = reference_text
        self.save_index()
        return True
    
    def get_audio_file_path(self, file_id: str) -> Optional[str]:
        """通过文件ID获取音频文件路径"""
        file_info = self.get_audio_file(file_id)
        if file_info and Path(file_info["file_path"]).exists():
            return file_info["file_path"]
        return None
    
    def get_reference_files_for_config(self) -> tuple[List[str], List[str]]:
        """获取用于配置的参考文件列表"""
        reference_files = self.list_audio_files(purpose="reference")
        
        audio_paths = []
        reference_texts = []
        
        for file_info in reference_files:
            audio_paths.append(file_info["relative_path"])
            reference_texts.append(file_info.get("reference_text", ""))
        
        return audio_paths, reference_texts
    
    def cleanup_temp_files(self, max_age_hours: int = 24):
        """清理临时文件"""
        current_time = datetime.now()
        temp_files = self.list_audio_files(purpose="temp")
        
        for file_info in temp_files:
            upload_time = datetime.fromisoformat(file_info["upload_time"])
            age_hours = (current_time - upload_time).total_seconds() / 3600
            
            if age_hours > max_age_hours:
                self.delete_audio_file(file_info["id"])

# 全局音频文件管理器实例
audio_manager = AudioFileManager()


def convert_audio_to_wav(input_path: str, output_path: str) -> bool:
    """将音频文件转换为WAV格式（可选功能，需要ffmpeg）"""
    try:
        import subprocess
        
        # 使用ffmpeg转换音频格式
        cmd = [
            'ffmpeg', '-i', input_path, 
            '-ar', '44100',  # 采样率
            '-ac', '1',      # 单声道
            '-y',            # 覆盖输出文件
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.returncode == 0
        
    except Exception as e:
        print(f"音频转换失败: {e}")
        return False


def validate_audio_format(file_path: str) -> bool:
    """验证音频格式（使用文件头检测）"""
    try:
        with open(file_path, 'rb') as f:
            header = f.read(12)
        
        # 检查常见音频格式的文件头
        if header.startswith(b'RIFF') and b'WAVE' in header:
            return True  # WAV
        elif header.startswith(b'ID3') or header.startswith(b'\xff\xfb'):
            return True  # MP3
        elif header.startswith(b'fLaC'):
            return True  # FLAC
        elif header.startswith(b'OggS'):
            return True  # OGG
        elif header[4:8] == b'ftyp':
            return True  # MP4/M4A
        
        return False
        
    except Exception:
        return False
