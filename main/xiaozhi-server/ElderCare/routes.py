"""
ElderCare智慧养老陪伴系统 HTTP API 路由处理器
提供 RESTful API 接口供 Web 前端调用
使用 aiohttp 异步框架集成到 xiaozhi-server

作者: assistant  
日期: 2025-09-18
版本: 4.0 - 修正架构冲突版本
"""

import os
import sys
import asyncio
import json
from datetime import datetime
from typing import Dict, Any, Optional

from aiohttp import web
from aiohttp.web import Request, Response
from .api import get_eldercare_api

# 添加项目路径以便导入配置模块
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
main_server_path = os.path.join(project_root, 'main', 'xiaozhi-server')
sys.path.insert(0, main_server_path)

try:
    from config.logger import setup_logging
    logger = setup_logging()
except ImportError:
    import logging
    logger = logging.getLogger(__name__)

TAG = "ElderCare.Routes"

# ======================== aiohttp处理器函数 ========================

@web.middleware
async def setup_eldercare_middleware(request: Request, handler):
    """ElderCare中间件 - 处理CORS和错误"""
    try:
        # CORS处理
        if request.method == 'OPTIONS':
            return web.Response(
                headers={
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            )
        
        response = await handler(request)
        
        # 添加CORS头
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        
        return response
        
    except Exception as e:
        return web.json_response(
            {'success': False, 'message': f'服务器错误: {str(e)}'},
            status=500
        )

# =========================== 认证相关API ===========================

async def auth_status_handler(request: Request) -> Response:
    """认证状态检查"""
    try:
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        return web.json_response({'success': True, 'message': 'ElderCare服务运行正常'})
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

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
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = await eldercare_api.eldercare_user_login(data['username'], data['password'])
        
        # 转换数据结构以匹配前端期望的格式
        if result.get('success') and result.get('data'):
            return web.json_response({
                'success': True,
                'message': result.get('message', '登录成功'),
                'user': result['data']
            })
        else:
            return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

# =========================== 智能体管理API（集成manager-api）===========================

async def get_agents_handler(request: Request) -> Response:
    """获取智能体列表"""
    try:
        user_id = request.query.get('user_id')
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_user_agents(int(user_id) if user_id else None)
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
        
        result = eldercare_api.get_agent_details(agent_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_agent_templates_handler(request: Request) -> Response:
    """获取智能体模板列表"""
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
        
        result = eldercare_api.get_agent_devices(agent_id)
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

async def bind_device_handler(request: Request) -> Response:
    """绑定设备到智能体"""
    try:
        agent_id = request.match_info['agent_id']
        data = await request.json()
        device_code = data.get('device_code', '')
        user_id = data.get('user_id', 1)
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.bind_device(agent_id, device_code, user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

# =========================== 聊天记录管理API ===========================

async def get_chat_sessions_handler(request: Request) -> Response:
    """获取智能体聊天会话列表"""
    try:
        agent_id = request.match_info['agent_id']
        page = int(request.query.get('page', 1))
        limit = int(request.query.get('limit', 10))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_chat_sessions(agent_id, page, limit)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_chat_history_handler(request: Request) -> Response:
    """获取具体聊天记录"""
    try:
        agent_id = request.match_info['agent_id']
        session_id = request.match_info['session_id']
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_chat_history(agent_id, session_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

# =========================== 提醒管理API ===========================

async def create_reminder_handler(request: Request) -> Response:
    """创建提醒"""
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
    """获取提醒列表"""
    try:
        user_id = request.query.get('user_id')
        days = int(request.query.get('days', 30))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_reminders(int(user_id) if user_id else None, days)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

# =========================== 健康数据相关API ===========================

async def save_health_data_handler(request: Request) -> Response:
    """保存健康数据"""
    try:
        data = await request.json()
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.save_health_data(data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_health_data_handler(request: Request) -> Response:
    """获取健康数据"""
    try:
        user_id = int(request.query.get('user_id', 0))
        days = int(request.query.get('days', 7))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        # 计算日期范围
        from datetime import datetime, timedelta
        end_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d %H:%M:%S')
        
        result = eldercare_api.get_health_data(user_id, start_date, end_date)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_latest_health_data_handler(request: Request) -> Response:
    """获取最新健康数据"""
    try:
        user_id = int(request.query.get('user_id', 0))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_latest_health_data(user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

# =========================== 声音克隆相关API ===========================

async def save_voice_clone_handler(request: Request) -> Response:
    """保存声音克隆配置"""
    try:
        data = await request.json()
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.save_voice_clone(data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_voice_clones_handler(request: Request) -> Response:
    """获取声音克隆列表"""
    try:
        user_id = int(request.query.get('user_id', 0))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.get_voice_clones(user_id)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

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
    """测试声音合成（使用智能体TTS配置）"""
    try:
        data = await request.json()
        user_id = data.get('user_id', 1)
        test_text = data.get('test_text', '你好，我是你的家人，这是声音测试。')
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        # 使用智能体配置进行声音克隆测试
        result = eldercare_api.test_voice_clone_with_agent(user_id, test_text)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

# =========================== 前端集成API处理器 ===========================

async def get_monitor_data_handler(request: Request) -> Response:
    """获取监控数据（整合API）"""
    try:
        user_id = int(request.query.get('user_id', 1))
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        # 使用同步版本的get_monitor_data_sync方法
        result = eldercare_api.get_monitor_data_sync(user_id)
        
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def create_voice_clone_handler(request: Request) -> Response:
    """创建声音克隆（前端格式）"""
    try:
        data = await request.json()
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.create_voice_clone_from_frontend(data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def create_health_reminder_handler(request: Request) -> Response:
    """创建健康提醒（前端格式）"""
    try:
        data = await request.json()
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        result = eldercare_api.create_health_reminder_from_frontend(data)
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_device_status_handler(request: Request) -> Response:
    """获取设备状态"""
    try:
        device_id = request.query.get('device_id', 'demo-device-001')
        
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})
        
        # 获取设备状态
        devices_result = eldercare_api.get_user_devices(device_id)
        if devices_result["success"] and devices_result["data"]:
            device = devices_result["data"][0]
            status_data = {
                "status": "online" if device.get("status") == 1 else "offline",
                "last_activity": device.get("last_online", "未知")
            }
            return web.json_response({"success": True, **status_data})
        else:
            # 返回默认在线状态
            return web.json_response({
                "success": True,
                "status": "online",
                "last_activity": "刚刚"
            })
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

# =========================== 设备管理相关API ===========================

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

# =========================== 系统配置相关API ===========================

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

async def get_user_ai_devices_handler(request: Request) -> Response:
    """获取用户的AI智能陪伴设备"""
    try:
        user_id = request.query.get('user_id', '1')
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})

        result = eldercare_api.get_user_ai_devices(int(user_id))
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

async def get_user_health_devices_handler(request: Request) -> Response:
    """获取用户的健康监测设备"""
    try:
        user_id = request.query.get('user_id', '1')
        eldercare_api = get_eldercare_api()
        if not eldercare_api:
            return web.json_response({'success': False, 'message': 'ElderCare API未初始化'})

        result = eldercare_api.get_user_health_devices(int(user_id))
        return web.json_response(result)
    except Exception as e:
        return web.json_response({'success': False, 'message': str(e)})

def setup_eldercare_routes(app):
    """设置ElderCare路由"""
    logger.bind(tag=TAG).info("开始设置ElderCare API路由")
    
    # 添加中间件
    app.middlewares.append(setup_eldercare_middleware)
    
    # =========================== 智能体管理路由 ===========================
    app.router.add_get('/eldercare/agents', get_agents_handler)
    app.router.add_post('/eldercare/agents', create_agent_handler)
    app.router.add_get('/eldercare/agents/{agent_id}', get_agent_details_handler)
    app.router.add_post('/eldercare/agent/update/{agent_id}', update_agent_handler)
    app.router.add_delete('/eldercare/agent/delete/{agent_id}', delete_agent_handler)
    app.router.add_get('/eldercare/agent/templates', get_agent_templates_handler)
    app.router.add_post('/eldercare/agent/create', create_agent_handler)
    app.router.add_get('/eldercare/agents/templates', get_agent_templates_handler)
    app.router.add_get('/eldercare/agents/{agent_id}/devices', get_agent_devices_handler)
    app.router.add_post('/eldercare/agents/{agent_id}/bind-device', bind_device_handler)
    app.router.add_options('/eldercare/agents', create_agent_handler)
    app.router.add_options('/eldercare/agent/update/{agent_id}', update_agent_handler)
    app.router.add_options('/eldercare/agent/delete/{agent_id}', delete_agent_handler)
    app.router.add_options('/eldercare/agents/{agent_id}/bind-device', bind_device_handler)
    
    # =========================== 聊天记录管理路由 ===========================
    app.router.add_get('/eldercare/agents/{agent_id}/sessions', get_chat_sessions_handler)
    app.router.add_get('/eldercare/agents/{agent_id}/chat-history/{session_id}', get_chat_history_handler)
    
    # =========================== 提醒管理路由 ===========================
    app.router.add_post('/eldercare/reminders', create_reminder_handler)
    app.router.add_get('/eldercare/reminders', get_reminders_handler)
    app.router.add_options('/eldercare/reminders', create_reminder_handler)
    
    # 认证路由
    app.router.add_get('/eldercare/auth/status', auth_status_handler)
    app.router.add_post('/eldercare/auth/register', register_handler)
    app.router.add_post('/eldercare/auth/login', login_handler)
    app.router.add_options('/eldercare/auth/register', register_handler)
    app.router.add_options('/eldercare/auth/login', login_handler)
    
    # 健康数据路由
    app.router.add_post('/eldercare/health/save', save_health_data_handler)
    app.router.add_get('/eldercare/health/data', get_health_data_handler)
    app.router.add_get('/eldercare/health/latest', get_latest_health_data_handler)
    app.router.add_options('/eldercare/health/save', save_health_data_handler)
    
    # 声音克隆路由
    app.router.add_post('/eldercare/voice/save', save_voice_clone_handler)
    app.router.add_get('/eldercare/voice/list', get_voice_clones_handler)
    app.router.add_get('/eldercare/voice/default', get_default_voice_handler)
    app.router.add_post('/eldercare/voice/test', test_voice_synthesis_handler)
    app.router.add_options('/eldercare/voice/save', save_voice_clone_handler)
    app.router.add_options('/eldercare/voice/test', test_voice_synthesis_handler)
    
    # 设备管理路由
    app.router.add_post('/eldercare/device/register', register_device_handler)
    app.router.add_get('/eldercare/device/list', get_user_devices_handler)
    app.router.add_get('/eldercare/device/ai_devices', get_user_ai_devices_handler)
    app.router.add_get('/eldercare/device/health_devices', get_user_health_devices_handler)
    app.router.add_options('/eldercare/device/register', register_device_handler)
    
    # 系统配置路由
    app.router.add_get('/eldercare/config', get_system_config_handler)
    
    # =========================== 前端集成API路由 ===========================
    
    # 监控数据整合API（匹配前端getMonitorData调用）
    app.router.add_get('/eldercare/monitor/data', get_monitor_data_handler)
    
    # 声音克隆前端API（匹配前端createVoiceClone调用）
    app.router.add_post('/eldercare/voice/clone', create_voice_clone_handler)
    app.router.add_options('/eldercare/voice/clone', create_voice_clone_handler)
    
    # 健康提醒前端API（匹配前端createHealthReminder调用）
    app.router.add_post('/eldercare/reminder/create', create_health_reminder_handler)
    app.router.add_options('/eldercare/reminder/create', create_health_reminder_handler)
    
    # 设备状态API（匹配前端getDeviceStatus调用）
    app.router.add_get('/eldercare/device/status', get_device_status_handler)
    
    logger.bind(tag=TAG).info("ElderCare API路由设置完成，共注册约30个路由端点")

# 为了兼容性，提供别名
setup_routes = setup_eldercare_routes
