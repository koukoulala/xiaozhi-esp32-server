"""
ElderCare MCP管理器
统一管理健康设备MCP协议服务、工具调用和WebSocket通信

作者: assistant
日期: 2025-01-20
版本: 1.0 - 初始实现
"""

import asyncio
import json
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime
import logging

# 添加项目路径
import os
import sys
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
sys.path.insert(0, project_root)

try:
    from config.logger import setup_logging
    logger = setup_logging()
except ImportError:
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

from .health_device_connector import HealthDeviceConnector
from .websocket_server import HealthDeviceWebSocketServer
from .mcp_tools import ElderCareMCPTools

TAG = "ElderCare.MCPManager"

class ElderCareMCPManager:
    """ElderCare MCP协议管理器"""
    
    def __init__(self, eldercare_api, config: Dict[str, Any] = None):
        self.eldercare_api = eldercare_api
        self.config = config or {}
        
        # 核心组件
        self.device_connector = HealthDeviceConnector(eldercare_api, config)
        self.websocket_server: Optional[HealthDeviceWebSocketServer] = None
        self.mcp_tools = ElderCareMCPTools()
        
        # 配置参数
        self.server_config = self.config.get("server", {})
        self.host = self.server_config.get("host", "0.0.0.0")
        self.port = self.server_config.get("port", 8001)
        
        # 工具处理器映射
        self.tool_handlers: Dict[str, Callable] = {}
        self._init_tool_handlers()
        
        # 状态管理
        self.is_running = False
        self.start_time = None
        
        logger.info("ElderCare MCP管理器初始化完成")
    
    def _init_tool_handlers(self):
        """初始化工具处理器映射"""
        self.tool_handlers = {
            "discover_health_devices": self._handle_discover_devices,
            "pair_health_device": self._handle_pair_device,
            "sync_health_data": self._handle_sync_data,
            "get_device_status": self._handle_get_device_status,
            "configure_device": self._handle_configure_device,
            "trigger_emergency_call": self._handle_emergency_call,
            "device_heartbeat": self._handle_device_heartbeat,
            "get_device_list": self._handle_get_device_list,
            "get_health_data": self._handle_get_health_data,
            "get_health_statistics": self._handle_get_health_statistics
        }
    
    async def start(self):
        """启动MCP管理器和所有服务"""
        try:
            self.start_time = datetime.now()
            
            # 启动WebSocket服务器
            self.websocket_server = HealthDeviceWebSocketServer(
                self.eldercare_api, 
                self.host, 
                self.port
            )
            await self.websocket_server.start_server()
            
            # 设置设备连接器回调
            self._setup_device_connector_callbacks()
            
            self.is_running = True
            logger.info(f"ElderCare MCP管理器启动成功: ws://{self.host}:{self.port}")
            
            return True
            
        except Exception as e:
            logger.error(f"启动MCP管理器失败: {e}")
            await self.stop()
            raise e
    
    async def stop(self):
        """停止MCP管理器和所有服务"""
        try:
            self.is_running = False
            
            # 停止WebSocket服务器
            if self.websocket_server:
                await self.websocket_server.stop_server()
                self.websocket_server = None
            
            # 清理设备连接器
            await self.device_connector.cleanup()
            
            logger.info("ElderCare MCP管理器已停止")
            
        except Exception as e:
            logger.error(f"停止MCP管理器错误: {e}")
    
    def _setup_device_connector_callbacks(self):
        """设置设备连接器回调函数"""
        # 订阅紧急警报
        async def emergency_callback(device_mac: str, emergency_data: Dict):
            if self.websocket_server:
                await self.websocket_server.broadcast_emergency_alert({
                    "device_mac": device_mac,
                    "emergency_data": emergency_data
                })
        
        # 订阅设备状态更新
        async def status_callback(device_mac: str, status_data: Dict):
            if self.websocket_server:
                await self.websocket_server.broadcast_device_update(device_mac, status_data)
        
        # 这里可以添加更多回调订阅
        # self.device_connector.subscribe_emergency_alerts(emergency_callback)
        # self.device_connector.subscribe_status_updates(status_callback)
    
    # =========================== MCP工具调用处理 ===========================
    
    async def handle_tool_call(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """处理MCP工具调用"""
        try:
            # 验证工具存在
            if tool_name not in self.tool_handlers:
                return {
                    "success": False,
                    "error": f"未知工具: {tool_name}",
                    "available_tools": list(self.tool_handlers.keys())
                }
            
            # 验证输入参数
            validation_result = self.mcp_tools.validate_tool_input(tool_name, arguments)
            if not validation_result["valid"]:
                return {
                    "success": False,
                    "error": f"参数验证失败: {validation_result['error']}"
                }
            
            # 调用工具处理器
            handler = self.tool_handlers[tool_name]
            result = await handler(arguments)
            
            logger.info(f"MCP工具调用成功: {tool_name}")
            return result
            
        except Exception as e:
            logger.error(f"MCP工具调用错误 {tool_name}: {e}")
            return {
                "success": False,
                "error": f"工具调用失败: {str(e)}"
            }
    
    # =========================== 具体工具处理器实现 ===========================
    
    async def _handle_discover_devices(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """处理设备发现工具"""
        device_types = arguments.get("device_types", [])
        scan_duration = arguments.get("scan_duration", 30)
        signal_threshold = arguments.get("signal_strength_threshold", -60)
        
        # 调用设备连接器的发现功能
        discovered = await self.device_connector._scan_for_devices(device_types, scan_duration)
        
        # 根据信号强度过滤
        if signal_threshold:
            discovered = [
                device for device in discovered 
                if device.get("signal_strength", -100) >= signal_threshold
            ]
        
        return {
            "success": True,
            "discovered_devices": discovered,
            "scan_duration": scan_duration,
            "total_found": len(discovered),
            "filtered_by_signal": signal_threshold
        }
    
    async def _handle_pair_device(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """处理设备配对工具"""
        device_mac = arguments["device_mac"]
        user_id = arguments["user_id"]
        pairing_code = arguments["pairing_code"]
        device_alias = arguments.get("device_alias")
        
        # 检查设备是否已发现
        if device_mac not in self.device_connector.discovered_devices:
            return {
                "success": False,
                "error": "设备未发现，请先进行设备扫描"
            }
        
        device_info = self.device_connector.discovered_devices[device_mac]
        
        # 如果有别名，更新设备信息
        if device_alias:
            device_info["alias"] = device_alias
        
        # 执行配对
        result = await self.device_connector._pair_device(
            device_mac, user_id, pairing_code, device_info
        )
        
        if result["success"]:
            # 保存设备到数据库
            device_data = {
                "user_id": user_id,
                "device_name": device_info.get("alias") or device_info["name"],
                "device_type": device_info["type"],
                "device_brand": device_info.get("brand", "Unknown"),
                "device_model": device_info.get("model", "Unknown"),
                "mac_address": device_mac,
                "health_features": device_info.get("features", {}),
                "sensor_config": device_info.get("sensor_config", {}),
                "connection_status": "paired",
                "battery_level": device_info.get("battery_level", 100),
                "firmware_version": device_info.get("firmware_version", "1.0.0")
            }
            
            db_result = await self.eldercare_api.register_health_device(device_data)
            if db_result["success"]:
                result["device_id"] = db_result["device_id"]
            else:
                result["database_warning"] = db_result.get("message", "数据库保存警告")
        
        return result
    
    async def _handle_sync_data(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """处理健康数据同步工具"""
        device_mac = arguments["device_mac"]
        health_data = arguments["health_data"]
        sync_mode = arguments.get("sync_mode", "incremental")
        
        # 验证设备是否已连接
        if device_mac not in self.device_connector.connected_devices:
            return {
                "success": False,
                "error": "设备未配对或未连接"
            }
        
        # 处理每个数据点
        processed_count = 0
        errors = []
        saved_data = []
        
        for data_point in health_data:
            try:
                # 补充必要信息
                if "user_id" not in data_point:
                    data_point["user_id"] = self.device_connector.connected_devices[device_mac]["user_id"]
                
                data_point["device_mac"] = device_mac
                
                # 保存到数据库
                result = await self.eldercare_api.save_health_data(data_point)
                if result["success"]:
                    processed_count += 1
                    saved_data.append({
                        "health_id": result.get("health_id"),
                        "timestamp": data_point.get("timestamp"),
                        "data_type": data_point.get("data_type")
                    })
                    
                    # 实时广播数据
                    await self.device_connector._broadcast_health_data(device_mac, data_point)
                else:
                    errors.append(f"保存失败: {result.get('message', 'Unknown error')}")
                    
            except Exception as e:
                errors.append(f"处理数据点错误: {str(e)}")
        
        return {
            "success": True,
            "sync_mode": sync_mode,
            "processed_count": processed_count,
            "total_count": len(health_data),
            "saved_data": saved_data,
            "errors": errors
        }
    
    async def _handle_get_device_status(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """处理获取设备状态工具"""
        device_mac = arguments["device_mac"]
        include_details = arguments.get("include_details", False)
        
        # 调用设备连接器获取状态
        websocket = None  # 这里需要获取实际的websocket连接
        status_result = await self.device_connector._handle_get_device_status(websocket, {
            "device_mac": device_mac
        })
        
        if include_details and device_mac in self.device_connector.connected_devices:
            device_info = self.device_connector.connected_devices[device_mac]
            status_result["device_details"] = {
                "device_name": device_info.get("name"),
                "device_type": device_info.get("type"),
                "brand": device_info.get("brand"),
                "model": device_info.get("model"),
                "features": device_info.get("features", {}),
                "paired_at": device_info.get("paired_at", "").isoformat() if device_info.get("paired_at") else None
            }
        
        return {
            "success": True,
            "status": status_result
        }
    
    async def _handle_configure_device(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """处理设备配置工具"""
        device_mac = arguments["device_mac"]
        configuration = arguments["configuration"]
        
        # 调用设备连接器配置设备
        websocket = None  # 这里需要获取实际的websocket连接
        result = await self.device_connector._handle_configure_device(websocket, {
            "device_mac": device_mac,
            "configuration": configuration
        })
        
        return result
    
    async def _handle_emergency_call(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """处理紧急呼叫工具"""
        # 调用设备连接器处理紧急情况
        websocket = None  # 这里需要获取实际的websocket连接
        result = await self.device_connector._handle_emergency_trigger(websocket, arguments)
        
        return result
    
    async def _handle_device_heartbeat(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """处理设备心跳工具"""
        # 调用设备连接器处理心跳
        websocket = None  # 这里需要获取实际的websocket连接
        result = await self.device_connector._handle_heartbeat(websocket, arguments)
        
        return result
    
    async def _handle_get_device_list(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """处理获取设备列表工具"""
        user_id = arguments["user_id"]
        device_type = arguments.get("device_type")
        status_filter = arguments.get("status", "all")
        
        # 从数据库获取用户设备
        db_result = await self.eldercare_api.get_user_health_devices(user_id)
        
        if not db_result["success"]:
            return {
                "success": False,
                "error": db_result.get("message", "获取设备列表失败")
            }
        
        devices = db_result["data"]
        
        # 应用过滤条件
        if device_type:
            devices = [d for d in devices if d.get("device_type") == device_type]
        
        if status_filter != "all":
            if status_filter == "connected":
                devices = [d for d in devices if d.get("mac_address") in self.device_connector.connected_devices]
            elif status_filter == "disconnected":
                devices = [d for d in devices if d.get("mac_address") not in self.device_connector.connected_devices]
            elif status_filter == "paired":
                devices = [d for d in devices if d.get("connection_status") == "paired"]
        
        # 添加实时状态信息
        for device in devices:
            mac_address = device.get("mac_address")
            if mac_address in self.device_connector.connected_devices:
                conn_info = self.device_connector.connected_devices[mac_address]
                device["real_time_status"] = {
                    "is_connected": True,
                    "last_heartbeat": conn_info.get("last_heartbeat", "").isoformat() if conn_info.get("last_heartbeat") else None,
                    "connection_quality": conn_info.get("connection_quality", "unknown")
                }
            else:
                device["real_time_status"] = {
                    "is_connected": False
                }
        
        return {
            "success": True,
            "total_devices": len(devices),
            "devices": devices,
            "filter_applied": {
                "device_type": device_type,
                "status": status_filter
            }
        }
    
    async def _handle_get_health_data(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """处理获取健康数据工具"""
        user_id = arguments["user_id"]
        data_types = arguments.get("data_types", [])
        limit = arguments.get("limit", 100)
        
        # 从数据库获取健康数据
        db_result = await self.eldercare_api.get_latest_health_data(user_id, data_types)
        
        if not db_result["success"]:
            return {
                "success": False,
                "error": db_result.get("message", "获取健康数据失败")
            }
        
        health_data = db_result["data"]
        
        # 应用限制
        if limit and len(health_data) > limit:
            health_data = health_data[:limit]
        
        return {
            "success": True,
            "total_records": len(health_data),
            "health_data": health_data,
            "query_params": {
                "user_id": user_id,
                "data_types": data_types,
                "limit": limit
            }
        }
    
    async def _handle_get_health_statistics(self, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """处理获取健康数据统计工具"""
        user_id = arguments["user_id"]
        days = arguments.get("days", 7)
        
        # 从数据库获取统计数据
        db_result = await self.eldercare_api.get_health_data_statistics(user_id, days)
        
        if not db_result["success"]:
            return {
                "success": False,
                "error": db_result.get("message", "获取健康数据统计失败")
            }
        
        return {
            "success": True,
            "statistics": db_result["data"],
            "analysis_period": f"{days} 天",
            "generated_at": datetime.now().isoformat()
        }
    
    # =========================== 状态和信息查询 ===========================
    
    def get_mcp_info(self) -> Dict[str, Any]:
        """获取MCP服务信息"""
        return {
            "service_name": "ElderCare Health Device MCP Service",
            "version": "1.0.0",
            "protocol_version": "2024-11-05",
            "server_info": {
                "host": self.host,
                "port": self.port,
                "is_running": self.is_running,
                "start_time": self.start_time.isoformat() if self.start_time else None
            },
            "capabilities": {
                "device_discovery": True,
                "device_pairing": True,
                "real_time_data": True,
                "emergency_alerts": True,
                "health_monitoring": True,
                "data_synchronization": True
            },
            "available_tools": self.mcp_tools.get_tool_names(),
            "statistics": self.get_statistics()
        }
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取服务统计信息"""
        device_stats = self.device_connector.get_connection_stats()
        server_stats = self.websocket_server.get_server_status() if self.websocket_server else {}
        
        return {
            "device_connector": device_stats,
            "websocket_server": {
                "active_connections": server_stats.get("active_connections", 0),
                "is_running": server_stats.get("is_running", False)
            },
            "tools": {
                "total_available": len(self.mcp_tools.get_tool_names()),
                "handlers_registered": len(self.tool_handlers)
            }
        }
    
    def get_available_tools(self) -> List[Dict[str, Any]]:
        """获取可用工具列表"""
        return self.mcp_tools.get_tool_definitions()


# =========================== 工厂函数 ===========================

async def create_eldercare_mcp_manager(eldercare_api, config: Dict[str, Any] = None) -> ElderCareMCPManager:
    """创建ElderCare MCP管理器"""
    manager = ElderCareMCPManager(eldercare_api, config)
    await manager.start()
    return manager