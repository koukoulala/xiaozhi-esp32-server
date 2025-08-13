"""
音频上传处理器（aiohttp版本）
提供音频文件上传、管理、删除等功能
"""

import json
import mimetypes
from pathlib import Path
from aiohttp import web, hdrs
from aiohttp.web_request import Request
from aiohttp.web_response import Response, StreamResponse
from typing import Dict, Any

from core.audio_manager import audio_manager, SUPPORTED_AUDIO_FORMATS, MAX_FILE_SIZE

TAG = __name__

# 简化的日志记录
def log_info(message):
    print(f"[INFO] {TAG}: {message}", flush=True)

def log_error(message):
    print(f"[ERROR] {TAG}: {message}", flush=True)

def log_warning(message):
    print(f"[WARNING] {TAG}: {message}", flush=True)


class AudioHandler:
    """音频文件上传和管理处理器"""
    
    def __init__(self, config: dict):
        self.config = config
    
    def _cors_headers(self) -> Dict[str, str]:
        """返回CORS头"""
        return {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true'
        }
    
    def _json_response(self, data: Any, status: int = 200) -> Response:
        """返回JSON响应"""
        headers = self._cors_headers()
        # 不要同时设置Content-Type头和json_response的默认content_type
        return web.json_response(data, status=status, headers=headers)
    
    def _error_response(self, message: str, status: int = 400) -> Response:
        """返回错误响应"""
        return self._json_response({
            "success": False,
            "error": message
        }, status=status)

    async def handle_options(self, request: Request) -> Response:
        """处理OPTIONS请求（CORS预检）"""
        return Response(headers=self._cors_headers())
    
    async def upload_audio_file(self, request: Request) -> Response:
        """上传音频文件"""
        print(f"[DEBUG] ===== 音频上传请求开始 =====", flush=True)
        try:
            print(f"[DEBUG] 收到上传请求，Content-Type: {request.content_type}", flush=True)
            print(f"[DEBUG] 请求Headers: {dict(request.headers)}", flush=True)
            
            # 检查Content-Type
            if not request.content_type or not request.content_type.startswith('multipart/form-data'):
                print(f"[DEBUG] Content-Type错误: {request.content_type}", flush=True)
                return self._error_response("请求必须是multipart/form-data格式")
            
            # 读取multipart/form-data
            print(f"[DEBUG] 开始读取multipart数据...", flush=True)
            reader = await request.multipart()
            file_content = None
            filename = None
            reference_text = ""
            purpose = "reference"
            
            print(f"[DEBUG] 开始处理multipart字段...", flush=True)
            
            field_count = 0
            while True:
                field = await reader.next()
                if field is None:
                    break
                
                field_count += 1
                print(f"[DEBUG] 处理字段 #{field_count}: {field.name}", flush=True)
                
                if field.name == 'file':
                    filename = field.filename
                    print(f"[DEBUG] 文件名: {filename}", flush=True)
                    
                    if not filename:
                        print(f"[DEBUG] 文件名为空", flush=True)
                        return self._error_response("文件名不能为空")
                    
                    # 验证文件类型
                    file_ext = Path(filename).suffix.lower()
                    print(f"[DEBUG] 文件扩展名: {file_ext}", flush=True)
                    
                    if file_ext not in SUPPORTED_AUDIO_FORMATS:
                        supported = ', '.join(SUPPORTED_AUDIO_FORMATS.keys())
                        print(f"[DEBUG] 不支持的文件格式: {file_ext}", flush=True)
                        return self._error_response(f"不支持的文件格式。支持的格式: {supported}")
                    
                    # 读取文件内容
                    print(f"[DEBUG] 开始读取文件内容...", flush=True)
                    file_content = await field.read()
                    print(f"[DEBUG] 文件大小: {len(file_content)} bytes", flush=True)
                    
                elif field.name == 'reference_text':
                    reference_text = await field.text()
                    print(f"[DEBUG] 参考文本长度: {len(reference_text)}", flush=True)
                elif field.name == 'purpose':
                    purpose = await field.text()
                    print(f"[DEBUG] 用途: {purpose}", flush=True)
            
            print(f"[DEBUG] 处理完成，共处理 {field_count} 个字段", flush=True)
            
            if not file_content or not filename:
                print(f"[DEBUG] 缺少文件或文件内容：filename={filename}, content_size={len(file_content) if file_content else 0}", flush=True)
                return self._error_response("缺少文件或文件内容为空")
            
            # 验证文件大小
            if len(file_content) > MAX_FILE_SIZE:
                return self._error_response(
                    f"文件大小超过限制 ({MAX_FILE_SIZE // (1024*1024)}MB)"
                )
            
            # 保存文件
            file_info = audio_manager.save_audio_file(
                file_content=file_content,
                original_filename=filename,
                reference_text=reference_text,
                purpose=purpose
            )
            
            return self._json_response({
                "success": True,
                "message": "文件上传成功",
                "file_info": file_info
            })
            
        except Exception as e:
            log_error(f"音频上传失败: {str(e)}")
            return self._error_response(f"文件上传失败: {str(e)}", status=500)
    
    async def list_audio_files(self, request: Request) -> Response:
        """获取音频文件列表"""
        try:
            purpose = request.query.get('purpose')
            files = audio_manager.list_audio_files(purpose=purpose)
            
            return self._json_response({
                "success": True,
                "files": files,
                "count": len(files)
            })
            
        except Exception as e:
            log_error(f"获取文件列表失败: {str(e)}")
            return self._error_response(f"获取文件列表失败: {str(e)}", status=500)
    
    async def get_reference_files(self, request: Request) -> Response:
        """获取参考音频文件列表（用于音色克隆配置）"""
        try:
            audio_paths, reference_texts = audio_manager.get_reference_files_for_config()
            
            return self._json_response({
                "success": True,
                "audio_paths": audio_paths,
                "reference_texts": reference_texts,
                "count": len(audio_paths)
            })
            
        except Exception as e:
            log_error(f"获取参考文件失败: {str(e)}")
            return self._error_response(f"获取参考文件失败: {str(e)}", status=500)
    
    async def download_audio_file(self, request: Request) -> Response:
        """下载音频文件"""
        try:
            file_id = request.match_info['file_id']
            file_info = audio_manager.get_audio_file(file_id)
            
            if not file_info:
                return self._error_response("文件不存在", status=404)
            
            file_path = Path(file_info["file_path"])
            if not file_path.exists():
                return self._error_response("文件已被删除", status=404)
            
            # 创建文件响应
            response = web.FileResponse(
                path=str(file_path),
                headers={
                    **self._cors_headers(),
                    'Content-Disposition': f'attachment; filename="{file_info["original_filename"]}"'
                }
            )
            response.content_type = file_info["mime_type"]
            
            return response
            
        except Exception as e:
            log_error(f"下载文件失败: {str(e)}")
            return self._error_response(f"下载文件失败: {str(e)}", status=500)
    
    async def update_reference_text(self, request: Request) -> Response:
        """更新参考文本"""
        try:
            file_id = request.match_info['file_id']
            
            # 读取form data
            data = await request.post()
            reference_text = data.get('reference_text', '')
            
            success = audio_manager.update_reference_text(file_id, reference_text)
            if not success:
                return self._error_response("文件不存在", status=404)
            
            return self._json_response({
                "success": True,
                "message": "参考文本更新成功"
            })
            
        except Exception as e:
            log_error(f"更新参考文本失败: {str(e)}")
            return self._error_response(f"更新参考文本失败: {str(e)}", status=500)
    
    async def delete_audio_file(self, request: Request) -> Response:
        """删除音频文件"""
        try:
            file_id = request.match_info['file_id']
            success = audio_manager.delete_audio_file(file_id)
            
            if not success:
                return self._error_response("文件不存在", status=404)
            
            return self._json_response({
                "success": True,
                "message": "文件删除成功"
            })
            
        except Exception as e:
            log_error(f"删除文件失败: {str(e)}")
            return self._error_response(f"删除文件失败: {str(e)}", status=500)
    
    async def cleanup_temp_files(self, request: Request) -> Response:
        """清理临时文件"""
        try:
            # 从查询参数或POST数据中获取max_age_hours
            if request.method == 'POST':
                data = await request.post()
                max_age_hours = int(data.get('max_age_hours', 24))
            else:
                max_age_hours = int(request.query.get('max_age_hours', 24))
            
            audio_manager.cleanup_temp_files(max_age_hours)
            
            return self._json_response({
                "success": True,
                "message": f"已清理超过{max_age_hours}小时的临时文件"
            })
            
        except Exception as e:
            log_error(f"清理临时文件失败: {str(e)}")
            return self._error_response(f"清理失败: {str(e)}", status=500)
    
    async def get_audio_file_info(self, request: Request) -> Response:
        """获取音频文件详细信息"""
        try:
            file_id = request.match_info['file_id']
            file_info = audio_manager.get_audio_file(file_id)
            
            if not file_info:
                return self._error_response("文件不存在", status=404)
            
            return self._json_response({
                "success": True,
                "file_info": file_info
            })
            
        except Exception as e:
            log_error(f"获取文件信息失败: {str(e)}")
            return self._error_response(f"获取文件信息失败: {str(e)}", status=500)
    
    async def get_supported_formats(self, request: Request) -> Response:
        """获取支持的音频格式列表"""
        try:
            return self._json_response({
                "success": True,
                "supported_formats": SUPPORTED_AUDIO_FORMATS,
                "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024)
            })
            
        except Exception as e:
            log_error(f"获取支持格式失败: {str(e)}")
            return self._error_response(f"获取支持格式失败: {str(e)}", status=500)
