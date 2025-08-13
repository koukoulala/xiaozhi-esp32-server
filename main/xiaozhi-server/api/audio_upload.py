"""
音频上传相关的 API 端点
提供音频文件上传、管理、删除等功能
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse
from typing import List, Optional
import json
from pathlib import Path

from core.audio_manager import audio_manager, SUPPORTED_AUDIO_FORMATS, MAX_FILE_SIZE

router = APIRouter(prefix="/api/audio", tags=["音频管理"])


@router.post("/upload")
async def upload_audio_file(
    file: UploadFile = File(...),
    reference_text: str = Form(""),
    purpose: str = Form("reference")  # "reference" 或 "temp"
):
    """
    上传音频文件
    
    参数:
    - file: 音频文件
    - reference_text: 参考文本（用于音色克隆）
    - purpose: 用途（reference=参考音频, temp=临时文件）
    """
    # 验证文件类型
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in SUPPORTED_AUDIO_FORMATS:
        supported = ', '.join(SUPPORTED_AUDIO_FORMATS.keys())
        raise HTTPException(
            status_code=400, 
            detail=f"不支持的文件格式。支持的格式: {supported}"
        )
    
    # 读取文件内容
    try:
        file_content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件读取失败: {str(e)}")
    
    # 验证文件大小
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail=f"文件大小超过限制 ({MAX_FILE_SIZE // (1024*1024)}MB)"
        )
    
    # 保存文件
    try:
        file_info = audio_manager.save_audio_file(
            file_content=file_content,
            original_filename=file.filename,
            reference_text=reference_text,
            purpose=purpose
        )
        
        return {
            "success": True,
            "message": "文件上传成功",
            "file_info": file_info
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件保存失败: {str(e)}")


@router.get("/list")
async def list_audio_files(purpose: Optional[str] = None):
    """
    获取音频文件列表
    
    参数:
    - purpose: 过滤用途（可选）
    """
    try:
        files = audio_manager.list_audio_files(purpose=purpose)
        return {
            "success": True,
            "files": files,
            "count": len(files)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取文件列表失败: {str(e)}")


@router.get("/reference-files")
async def get_reference_files():
    """获取参考音频文件列表（用于音色克隆配置）"""
    try:
        audio_paths, reference_texts = audio_manager.get_reference_files_for_config()
        return {
            "success": True,
            "audio_paths": audio_paths,
            "reference_texts": reference_texts,
            "count": len(audio_paths)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取参考文件失败: {str(e)}")


@router.get("/download/{file_id}")
async def download_audio_file(file_id: str):
    """
    下载音频文件
    
    参数:
    - file_id: 文件ID
    """
    file_info = audio_manager.get_audio_file(file_id)
    if not file_info:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    file_path = Path(file_info["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件已被删除")
    
    return FileResponse(
        path=str(file_path),
        filename=file_info["original_filename"],
        media_type=file_info["mime_type"]
    )


@router.put("/update-text/{file_id}")
async def update_reference_text(file_id: str, reference_text: str = Form(...)):
    """
    更新参考文本
    
    参数:
    - file_id: 文件ID
    - reference_text: 新的参考文本
    """
    success = audio_manager.update_reference_text(file_id, reference_text)
    if not success:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    return {
        "success": True,
        "message": "参考文本更新成功"
    }


@router.delete("/delete/{file_id}")
async def delete_audio_file(file_id: str):
    """
    删除音频文件
    
    参数:
    - file_id: 文件ID
    """
    success = audio_manager.delete_audio_file(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    return {
        "success": True,
        "message": "文件删除成功"
    }


@router.post("/cleanup-temp")
async def cleanup_temp_files(max_age_hours: int = 24):
    """
    清理临时文件
    
    参数:
    - max_age_hours: 最大保留时间（小时）
    """
    try:
        audio_manager.cleanup_temp_files(max_age_hours)
        return {
            "success": True,
            "message": f"已清理超过{max_age_hours}小时的临时文件"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清理失败: {str(e)}")


@router.get("/info/{file_id}")
async def get_audio_file_info(file_id: str):
    """
    获取音频文件详细信息
    
    参数:
    - file_id: 文件ID
    """
    file_info = audio_manager.get_audio_file(file_id)
    if not file_info:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    return {
        "success": True,
        "file_info": file_info
    }


@router.get("/supported-formats")
async def get_supported_formats():
    """获取支持的音频格式列表"""
    return {
        "success": True,
        "supported_formats": SUPPORTED_AUDIO_FORMATS,
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024)
    }
