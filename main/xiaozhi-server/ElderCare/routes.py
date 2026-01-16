"""
ElderCare智慧养老陪伴系统 HTTP API 路由处理器
提供 RESTful API 接口供 Web 前端调用
使用 aiohttp 异步框架集成到 xiaozhi-server

作者: assistant  
日期: 2025-09-18
版本: 5.0 - 完整API端点版本
"""

import os
import sys
import asyncio
import json
from datetime import datetime
from typing import Dict, Any, Optional

from aiohttp import web
from aiohttp.web import Request, Response

from .api import ElderCareAPI, get_eldercare_api
from loguru import logger

TAG = "ElderCareRoutes"

# =========================== 认证API路由 ===========================

async def register_handler(request: Request) -> Response:
    """用户注册"""
    try:
        data = await request.json()
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = await eldercare_api.register_eldercare_user(data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def login_handler(request: Request) -> Response:
    """用户登录"""
    try:
        data = await request.json()
        username = data.get('username', '')
        password = data.get('password', '')
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = await eldercare_api.eldercare_user_login(username, password)
        
        # 格式化返回结果以匹配前端期望
        if result.get('success') and result.get('data'):
            return web.json_response({
                'success': True,
                'message': '登录成功',
                'user': result['data'],
                'data': result['data']
            })
        
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def auth_status_handler(request: Request) -> Response:
    """认证状态检查"""
    try:
        # 简单返回服务可用状态
        return web.json_response({'success': True, 'message': 'ElderCare API服务可用'})
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

# =========================== 智能体管理API ===========================

async def get_agents_handler(request: Request) -> Response:
    """获取用户智能体列表（匹配前端getUserAgents调用）"""
    try:
        user_id = int(request.query.get('user_id', 0))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_user_agents(user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def create_agent_handler(request: Request) -> Response:
    """创建智能体"""
    try:
        data = await request.json()
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = await eldercare_api.create_agent(data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_agent_details_handler(request: Request) -> Response:
    """获取智能体详情"""
    try:
        agent_id = request.match_info['agent_id']
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = await eldercare_api.get_agent_details(agent_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def update_agent_handler(request: Request) -> Response:
    """更新智能体"""
    try:
        agent_id = request.match_info['agent_id']
        data = await request.json()
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = await eldercare_api.update_agent(agent_id, data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def delete_agent_handler(request: Request) -> Response:
    """删除智能体"""
    try:
        agent_id = request.match_info['agent_id']
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = await eldercare_api.delete_agent(agent_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def set_default_agent_handler(request: Request) -> Response:
    """设置默认智能体（匹配前端setDefaultAgent调用）"""
    try:
        data = await request.json()
        user_id = int(data.get('user_id', 0))
        agent_id = data.get('agent_id', '')
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = await eldercare_api.set_default_agent(user_id, agent_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_agent_templates_handler(request: Request) -> Response:
    """获取智能体模板（匹配前端getAgentTemplates调用）"""
    try:
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = await eldercare_api.get_agent_templates()
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_agent_devices_handler(request: Request) -> Response:
    """获取智能体设备列表"""
    try:
        agent_id = request.match_info['agent_id']
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = await eldercare_api.get_agent_devices(agent_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def bind_device_handler(request: Request) -> Response:
    """绑定设备到智能体"""
    try:
        agent_id = request.match_info['agent_id']
        data = await request.json()
        device_code = data.get('device_code', '')
        user_id = int(data.get('user_id', 0))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = await eldercare_api.bind_device(agent_id, device_code, user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def bind_device_with_code_handler(request: Request) -> Response:
    """使用6位验证码绑定设备到智能体（匹配前端 bindDeviceWithCode 调用）"""
    try:
        agent_id = request.match_info['agent_id']
        device_code = request.match_info['device_code']
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        # 从请求头或查询参数获取 user_id（可选，主要用于权限验证）
        user_id = int(request.query.get('user_id', 0))
        
        result = await eldercare_api.bind_device(agent_id, device_code, user_id)
        return web.json_response(result)
    except Exception as e:
        logger.bind(tag=TAG).error(f"设备绑定错误: {e}")
        return web.json_response({'success': False, 'message': str(e)})

async def get_chat_sessions_handler(request: Request) -> Response:
    """获取聊天会话列表"""
    try:
        agent_id = request.match_info['agent_id']
        page = int(request.query.get('page', 1))
        limit = int(request.query.get('limit', 10))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = await eldercare_api.get_chat_sessions(agent_id, page, limit)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_chat_history_handler(request: Request) -> Response:
    """获取聊天记录"""
    try:
        agent_id = request.match_info['agent_id']
        session_id = request.match_info['session_id']
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = await eldercare_api.get_chat_history(agent_id, session_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

# =========================== 核心API路由 ===========================

async def get_chat_response_handler(request: Request) -> Response:
    """处理聊天请求"""
    try:
        data = await request.json()
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_chat_response(data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_user_info_handler(request: Request) -> Response:
    """获取用户信息"""
    try:
        user_id = int(request.query.get('user_id', 0))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_user_info(user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def update_user_info_handler(request: Request) -> Response:
    """更新用户信息"""
    # 处理CORS预检请求
    if request.method == 'OPTIONS':
        return web.json_response({})
    
    try:
        data = await request.json()
        user_id = int(data.get('user_id', 0))
        
        if not user_id:
            return web.json_response({'success': False, 'message': '用户ID不能为空'})
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.update_user_info(user_id, data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def change_password_handler(request: Request) -> Response:
    """修改用户密码"""
    # 处理CORS预检请求
    if request.method == 'OPTIONS':
        return web.json_response({})
    
    try:
        data = await request.json()
        user_id = int(data.get('user_id', 0))
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        
        if not user_id:
            return web.json_response({'success': False, 'message': '用户ID不能为空'})
        if not current_password:
            return web.json_response({'success': False, 'message': '请输入当前密码'})
        if not new_password:
            return web.json_response({'success': False, 'message': '请输入新密码'})
        if len(new_password) < 6:
            return web.json_response({'success': False, 'message': '新密码长度至少6位'})
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.change_password(user_id, current_password, new_password)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_health_data_handler(request: Request) -> Response:
    """获取健康数据"""
    try:
        user_id = int(request.query.get('user_id', 0))
        
        # 处理days参数或日期范围参数
        start_date = request.query.get('start_date')
        end_date = request.query.get('end_date')
        days = request.query.get('days')
        data_type = request.query.get('data_type')
        
        # 如果提供了days参数但没有start_date/end_date，则计算日期范围
        if days and not start_date and not end_date:
            from datetime import datetime, timedelta
            end_datetime = datetime.now()
            start_datetime = end_datetime - timedelta(days=int(days))
            start_date = start_datetime.strftime('%Y-%m-%d')
            end_date = end_datetime.strftime('%Y-%m-%d')
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_health_data(user_id, start_date, end_date, data_type)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_latest_health_data_handler(request: Request) -> Response:
    """获取最新健康数据"""
    try:
        # 支持userId和user_id两种参数名
        user_id = int(request.query.get('userId', request.query.get('user_id', 0)))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_latest_health_data(user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def generate_health_report_handler(request: Request) -> Response:
    """生成健康报告"""
    try:
        data = await request.json()
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.generate_health_report(data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

# =========================== 设备管理API ===========================

async def get_user_ai_devices_handler(request: Request) -> Response:
    """获取用户AI设备列表（匹配前端getUserAIDevices调用）"""
    try:
        user_id = int(request.query.get('user_id', 0))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_user_ai_devices(user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_user_health_devices_handler(request: Request) -> Response:
    """获取用户健康设备列表（匹配前端getUserHealthDevices调用）"""
    try:
        user_id = int(request.query.get('user_id', 0))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_user_health_devices(user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def add_device_handler(request: Request) -> Response:
    """添加设备（匹配前端addDevice调用）"""
    try:
        data = await request.json()
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.register_device(data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def delete_device_handler(request: Request) -> Response:
    """删除设备（匹配前端deleteDevice调用）"""
    try:
        device_id = request.match_info.get('device_id')
        user_id = int(request.query.get('user_id', 0))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.delete_device(device_id, user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def update_device_handler(request: Request) -> Response:
    """更新设备（匹配前端updateDevice调用）"""
    try:
        device_id = request.match_info['device_id']
        data = await request.json()
        user_id = int(data.get('user_id', 0))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.update_device(int(device_id), data, user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_device_details_handler(request: Request) -> Response:
    """获取设备详细信息（匹配前端getDeviceDetails调用）"""
    try:
        device_id = request.match_info['device_id']
        device_type = request.query.get('device_type', 'ai')
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})

        result = await eldercare_api.get_device_details(int(device_id), device_type)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def update_device_config_handler(request: Request) -> Response:
    """更新设备配置（匹配前端updateDeviceConfig调用）"""
    try:
        device_id = request.match_info['device_id']
        data = await request.json()
        device_type = data.get('device_type', 'ai')
        config_data = data.get('config_data', {})
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})

        result = await eldercare_api.update_device_config(int(device_id), config_data, device_type)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_monitor_data_handler(request: Request) -> Response:
    """获取监控数据"""
    try:
        user_id = int(request.query.get('user_id', 0))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_monitor_data(user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

# =========================== 声音克隆API ===========================

async def get_voice_clones_handler(request: Request) -> Response:
    """获取声音克隆列表（支持按智能体筛选）"""
    try:
        user_id = int(request.query.get('user_id', 0))
        agent_id = request.query.get('agent_id')  # 可选的智能体ID参数
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_voice_clones(user_id, agent_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def create_voice_clone_handler(request: Request) -> Response:
    """创建声音克隆（前端格式，支持文件上传）"""
    try:
        # 检查Content-Type是否为multipart/form-data
        content_type = request.headers.get('Content-Type', '')
        
        if 'multipart/form-data' in content_type:
            # 处理文件上传的FormData
            reader = await request.multipart()
            
            data = {}
            audio_file_data = None
            audio_filename = 'voice.wav'
            
            async for field in reader:
                if field.name == 'audioFile':
                    # 处理音频文件
                    audio_file_data = await field.read()
                    if hasattr(field, 'filename') and field.filename:
                        audio_filename = field.filename
                else:
                    # 处理其他字段
                    data[field.name] = await field.text()
            
            # 保存音频文件到临时位置并更新数据
            if audio_file_data:
                import tempfile
                import os
                
                # 创建临时文件
                temp_dir = tempfile.mkdtemp()
                temp_file_path = os.path.join(temp_dir, audio_filename)
                
                with open(temp_file_path, 'wb') as f:
                    f.write(audio_file_data)
                
                data['audio_file_path'] = temp_file_path
            
        else:
            # 处理JSON格式
            data = await request.json()
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        # 使用正确的方法名
        result = eldercare_api.create_voice_clone_from_file(data)
        
        # 清理临时文件
        if 'audio_file_path' in data:
            try:
                os.remove(data['audio_file_path'])
                os.rmdir(os.path.dirname(data['audio_file_path']))
            except:
                pass
                
        return web.json_response(result)
        
    except Exception as e:
        import traceback
        logger.error(f"创建声音克隆失败: {e}")
        logger.error(traceback.format_exc())
        return web.json_response({'success': False, 'message': f'创建声音克隆失败: {str(e)}'})

# =========================== 音色管理API ===========================

async def set_default_voice_handler(request: Request) -> Response:
    """设置默认音色（支持指定智能体）"""
    try:
        data = await request.json()
        user_id = int(data.get('user_id', 0))
        voice_id = data.get('voice_id', '')
        agent_id = data.get('agent_id')  # 可选参数：指定智能体ID
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.set_default_voice(user_id, voice_id, agent_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def delete_voice_handler(request: Request) -> Response:
    """删除音色"""
    try:
        user_id = int(request.query.get('user_id', 0))
        voice_id = request.query.get('voice_id', '')
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.delete_voice(user_id, voice_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def update_voice_handler(request: Request) -> Response:
    """更新音色"""
    try:
        # 检查Content-Type是否为multipart/form-data
        content_type = request.headers.get('Content-Type', '')
        
        if 'multipart/form-data' in content_type:
            # 处理文件上传的FormData
            reader = await request.multipart()
            
            data = {}
            audio_file = None
            
            async for field in reader:
                if field.name == 'audioFile':
                    # 处理音频文件
                    audio_data = await field.read()
                    # 从headers获取content_type，BodyPartReader没有直接的content_type属性
                    field_content_type = field.headers.get('Content-Type', 'audio/webm')
                    audio_file = {
                        'data': audio_data,
                        'filename': field.filename,
                        'content_type': field_content_type
                    }
                else:
                    # 处理其他字段
                    data[field.name] = await field.text()
            
            # 保存音频文件到临时位置并更新数据
            if audio_file:
                import tempfile
                import os
                
                # 创建临时文件
                temp_dir = tempfile.mkdtemp()
                temp_file_path = os.path.join(temp_dir, audio_file['filename'])
                
                with open(temp_file_path, 'wb') as f:
                    f.write(audio_file['data'])
                
                data['audio_file_path'] = temp_file_path
        else:
            # 处理JSON格式
            data = await request.json()
        
        user_id = int(data.get('user_id', 0))
        voice_id = data.get('voice_id', '')
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.update_voice(user_id, voice_id, data)
        
        # 清理临时文件
        if 'audio_file_path' in data:
            try:
                os.remove(data['audio_file_path'])
                os.rmdir(os.path.dirname(data['audio_file_path']))
            except:
                pass
        
        return web.json_response(result)
    except Exception as e:
        import traceback
        logger.error(f"更新音色失败: {e}")
        logger.error(traceback.format_exc())
        return web.json_response({'success': False, 'message': str(e)})

# =========================== 提醒管理API ===========================

async def generate_voice_prompt_handler(request: Request) -> Response:
    """根据提醒类型和内容自动生成语音播报文本（供前端实时预览）"""
    try:
        data = await request.json()
        reminder_type = data.get('reminder_type', 'other')
        title = data.get('title', '')
        content = data.get('content', '')
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        voice_prompt = eldercare_api._generate_voice_prompt(reminder_type, title, content)
        return web.json_response({
            'success': True, 
            'data': {
                'voice_prompt': voice_prompt
            }
        })
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def create_reminder_handler(request: Request) -> Response:
    """创建提醒（匹配前端createHealthReminder调用）"""
    try:
        data = await request.json()
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.create_reminder(data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_reminders_handler(request: Request) -> Response:
    """获取提醒列表（匹配前端getHealthReminders调用）"""
    try:
        user_id = int(request.query.get('user_id', 0))
        days = int(request.query.get('days', 7))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_reminders(user_id, days)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def update_reminder_handler(request: Request) -> Response:
    """更新提醒"""
    try:
        reminder_id = int(request.match_info['reminder_id'])
        data = await request.json()
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.update_reminder(reminder_id, data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def delete_reminder_handler(request: Request) -> Response:
    """删除提醒"""
    try:
        reminder_id = int(request.match_info['reminder_id'])
        user_id = int(request.query.get('user_id', 0))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.delete_reminder(reminder_id, user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def update_reminder_status_handler(request: Request) -> Response:
    """更新提醒完成状态（前端点击对号按钮调用）"""
    try:
        reminder_id = int(request.match_info['reminder_id'])
        data = await request.json()
        is_completed = data.get('is_completed', True)
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.complete_reminder(reminder_id, is_completed)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

# =========================== 其他API ===========================

async def get_default_voice_handler(request: Request) -> Response:
    """获取默认声音"""
    try:
        user_id = int(request.query.get('user_id', 0))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_default_voice(user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def test_voice_synthesis_handler(request: Request) -> Response:
    """测试声音合成（使用指定音色）"""
    try:
        data = await request.json()
        user_id = int(data.get('user_id', 0))
        voice_id = data.get('voice_id', '')
        test_text = data.get('test_text', '')
        
        if not voice_id:
            return web.json_response({'success': False, 'message': '请指定音色ID'})
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.test_voice_clone_with_agent(user_id, voice_id, test_text if test_text else None)
        return web.json_response(result)
    except Exception as e:
        import traceback
        print(f"测试语音合成错误: {traceback.format_exc()}")
        return web.json_response({'success': False, 'message': str(e)})

async def create_health_reminder_handler(request: Request) -> Response:
    """创建健康提醒（前端格式）"""
    try:
        data = await request.json()
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.create_health_reminder_frontend(data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def register_device_handler(request: Request) -> Response:
    """注册设备"""
    try:
        data = await request.json()
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.register_device(data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_user_devices_handler(request: Request) -> Response:
    """获取用户设备列表"""
    try:
        user_id = int(request.query.get('user_id', 0))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_user_devices(user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_system_config_handler(request: Request) -> Response:
    """获取系统配置"""
    try:
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        # 简化返回，避免调用复杂方法
        return web.json_response({'success': True, 'data': {}})
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_device_status_handler(request: Request) -> Response:
    """获取设备状态"""
    try:
        user_id = int(request.query.get('user_id', 0))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_device_status(user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

# =========================== 路由设置 ===========================

def setup_eldercare_routes(app: web.Application):
    """设置ElderCare API路由 - 完整版本"""
    logger.bind(tag=TAG).info("设置ElderCare API路由...")
    
    # =========================== 认证相关API ===========================
    app.router.add_get('/eldercare/auth/status', auth_status_handler)
    app.router.add_post('/eldercare/auth/register', register_handler)
    app.router.add_post('/eldercare/auth/login', login_handler)
    app.router.add_options('/eldercare/auth/register', register_handler)
    app.router.add_options('/eldercare/auth/login', login_handler)
    
    # =========================== 智能体管理API ===========================
    # 主要路由（匹配前端API调用）
    app.router.add_get('/eldercare/agents', get_agents_handler)  # 匹配getUserAgents
    app.router.add_post('/eldercare/agents', create_agent_handler)  # 匹配createAgent
    app.router.add_get('/eldercare/agents/{agent_id}', get_agent_details_handler)
    app.router.add_post('/eldercare/agent/update/{agent_id}', update_agent_handler)  # 匹配updateAgent
    app.router.add_delete('/eldercare/agent/delete/{agent_id}', delete_agent_handler)  # 匹配deleteAgent
    app.router.add_post('/eldercare/agent/set-default', set_default_agent_handler)  # 匹配setDefaultAgent
    app.router.add_get('/eldercare/agent/templates', get_agent_templates_handler)  # 匹配getAgentTemplates
    
    # 额外路由别名
    app.router.add_post('/eldercare/agent/create', create_agent_handler)
    app.router.add_get('/eldercare/agents/templates', get_agent_templates_handler)
    app.router.add_get('/eldercare/agents/{agent_id}/devices', get_agent_devices_handler)
    app.router.add_post('/eldercare/agents/{agent_id}/bind-device', bind_device_handler)
    
    # OPTIONS支持
    app.router.add_options('/eldercare/agents', create_agent_handler)
    app.router.add_options('/eldercare/agent/update/{agent_id}', update_agent_handler)
    app.router.add_options('/eldercare/agent/delete/{agent_id}', delete_agent_handler)
    app.router.add_options('/eldercare/agent/set-default', set_default_agent_handler)
    app.router.add_options('/eldercare/agents/{agent_id}/bind-device', bind_device_handler)
    
    # =========================== 聊天记录管理API ===========================
    app.router.add_get('/eldercare/agents/{agent_id}/sessions', get_chat_sessions_handler)
    app.router.add_get('/eldercare/agents/{agent_id}/chat-history/{session_id}', get_chat_history_handler)
    
    # =========================== 设备管理API ===========================
    # 用户设备列表（匹配前端API调用）
    app.router.add_get('/eldercare/user/devices', get_user_devices_handler)  # 匹配getUserDevices
    app.router.add_get('/eldercare/user/ai-devices', get_user_ai_devices_handler)  # 匹配getUserAIDevices
    app.router.add_get('/eldercare/device/ai_devices', get_user_ai_devices_handler)  # 别名
    app.router.add_get('/eldercare/device/health_devices', get_user_health_devices_handler)  # 匹配getUserHealthDevices
    
    # 设备操作
    app.router.add_post('/eldercare/device/register', register_device_handler)
    app.router.add_post('/eldercare/device/add', add_device_handler)  # 匹配addDevice
    app.router.add_post('/eldercare/device/bind/{agent_id}/{device_code}', bind_device_with_code_handler)  # 匹配 bindDeviceWithCode
    app.router.add_delete('/eldercare/device/delete/{device_id}', delete_device_handler)  # 匹配deleteDevice
    app.router.add_post('/eldercare/device/update/{device_id}', update_device_handler)  # 匹配updateDevice
    app.router.add_get('/eldercare/device/details/{device_id}', get_device_details_handler)  # 匹配getDeviceDetails
    app.router.add_post('/eldercare/device/config/{device_id}', update_device_config_handler)  # 匹配updateDeviceConfig
    app.router.add_get('/eldercare/device/status', get_device_status_handler)
    app.router.add_get('/eldercare/device/list', get_user_devices_handler)  # 别名
    
    # OPTIONS 支持
    app.router.add_options('/eldercare/device/bind/{agent_id}/{device_code}', bind_device_with_code_handler)
    
    # =========================== 健康数据API ===========================
    app.router.add_get('/eldercare/health/data', get_health_data_handler)  # 匹配getHealthData
    app.router.add_get('/eldercare/health/latest', get_latest_health_data_handler)  # 匹配getLatestHealthData
    app.router.add_post('/eldercare/health/report', generate_health_report_handler)  # 匹配generateHealthReport
    
    # =========================== 监控数据API ===========================
    app.router.add_get('/eldercare/monitor/data', get_monitor_data_handler)  # 匹配getMonitorData
    
    # =========================== 声音克隆和音色管理API ===========================
    # 声音克隆
    app.router.add_get('/eldercare/voice/list', get_voice_clones_handler)  # 匹配getVoiceClones
    app.router.add_post('/eldercare/voice/clone', create_voice_clone_handler)  # 匹配createVoiceClone
    app.router.add_get('/eldercare/voice/default', get_default_voice_handler)
    app.router.add_post('/eldercare/voice/test', test_voice_synthesis_handler)
    
    # 音色管理
    app.router.add_post('/eldercare/voice/set_default', set_default_voice_handler)  # 匹配setDefaultVoice
    app.router.add_delete('/eldercare/voice/delete', delete_voice_handler)  # 匹配deleteVoice
    app.router.add_post('/eldercare/voice/update', update_voice_handler)  # 匹配updateVoice
    
    # OPTIONS支持
    app.router.add_options('/eldercare/voice/clone', create_voice_clone_handler)
    app.router.add_options('/eldercare/voice/test', test_voice_synthesis_handler)
    
    # =========================== 提醒管理API ===========================
    app.router.add_post('/eldercare/reminders', create_reminder_handler)  # 匹配createHealthReminder
    app.router.add_get('/eldercare/reminders', get_reminders_handler)  # 匹配getHealthReminders
    app.router.add_post('/eldercare/reminder/create', create_health_reminder_handler)  # 别名
    app.router.add_post('/eldercare/reminder/update/{reminder_id}', update_reminder_handler)
    app.router.add_delete('/eldercare/reminder/delete/{reminder_id}', delete_reminder_handler)
    app.router.add_post('/eldercare/reminder/update-status/{reminder_id}', update_reminder_status_handler)  # 更新完成状态
    app.router.add_post('/eldercare/reminder/generate-voice-prompt', generate_voice_prompt_handler)  # 生成语音文本
    
    # OPTIONS支持
    app.router.add_options('/eldercare/reminders', create_reminder_handler)
    app.router.add_options('/eldercare/reminder/create', create_health_reminder_handler)
    app.router.add_options('/eldercare/reminder/update/{reminder_id}', update_reminder_handler)
    app.router.add_options('/eldercare/reminder/delete/{reminder_id}', delete_reminder_handler)
    app.router.add_options('/eldercare/reminder/update-status/{reminder_id}', update_reminder_status_handler)
    app.router.add_options('/eldercare/reminder/generate-voice-prompt', generate_voice_prompt_handler)
    
    # =========================== 用户信息API ===========================
    app.router.add_get('/eldercare/user/info', get_user_info_handler)
    app.router.add_put('/eldercare/user/update', update_user_info_handler)
    app.router.add_post('/eldercare/user/change_password', change_password_handler)
    app.router.add_options('/eldercare/user/update', update_user_info_handler)
    app.router.add_options('/eldercare/user/change_password', change_password_handler)
    
    # =========================== 聊天对话API ===========================
    app.router.add_post('/eldercare/chat/response', get_chat_response_handler)
    
    # =========================== 系统配置API ===========================
    app.router.add_get('/eldercare/system/config', get_system_config_handler)
    app.router.add_get('/eldercare/config', get_system_config_handler)  # 别名，匹配前端检测
    
    logger.bind(tag=TAG).info("ElderCare API路由设置完成，共注册约60个路由端点")
    logger.bind(tag=TAG).info("支持的主要功能: 认证、智能体管理、设备管理、健康监控、声音克隆、提醒管理")

# 为了兼容性，提供别名
setup_routes = setup_eldercare_routes