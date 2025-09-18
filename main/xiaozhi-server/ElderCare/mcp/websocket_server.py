"""
ElderCare健康设备WebSocket服务器
提供健康设备MCP协议的WebSocket服务端点

作者: assistant
日期: 2025-01-20
版本: 1.0 - 初始实现
"""

import asyncio
import json
import websockets
import traceback
from datetime import datetime
from typing import Dict, Any, Optional
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

TAG = "ElderCare.HealthDeviceServer"

class HealthDeviceWebSocketServer:
    """ElderCare健康设备WebSocket服务器"""
    
    def __init__(self, eldercare_api, host: str = "0.0.0.0", port: int = 8001):
        self.eldercare_api = eldercare_api
        self.host = host
        self.port = port
        
        self.device_connector = HealthDeviceConnector(eldercare_api)
        self.server = None
        self.is_running = False
        
        # 连接管理
        self.active_connections: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.connection_metadata: Dict[str, Dict] = {}
        
        logger.info(f"ElderCare健康设备WebSocket服务器初始化: {host}:{port}")
    
    async def start_server(self):
        """启动WebSocket服务器"""
        try:
            self.server = await websockets.serve(
                self.handle_client_connection,
                self.host,
                self.port,
                ping_interval=30,
                ping_timeout=10,
                max_size=1024*1024,  # 1MB
                max_queue=32
            )
            
            self.is_running = True
            logger.info(f"ElderCare健康设备WebSocket服务器已启动: ws://{self.host}:{self.port}")
            
            return self.server
            
        except Exception as e:
            logger.error(f"启动WebSocket服务器失败: {e}")
            raise e
    
    async def stop_server(self):
        """停止WebSocket服务器"""
        try:
            self.is_running = False
            
            if self.server:
                self.server.close()
                await self.server.wait_closed()
            
            # 断开所有客户端连接
            for connection_id in list(self.active_connections.keys()):
                await self._disconnect_client(connection_id)
            
            # 清理设备连接器
            await self.device_connector.cleanup()
            
            logger.info("ElderCare健康设备WebSocket服务器已停止")
            
        except Exception as e:
            logger.error(f"停止WebSocket服务器错误: {e}")
    
    async def handle_client_connection(self, websocket, path):
        """处理客户端连接"""
        connection_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}_{datetime.now().timestamp()}"
        
        logger.info(f"新的健康设备连接: {connection_id} from {websocket.remote_address}")
        
        # 注册连接
        self.active_connections[connection_id] = websocket
        self.connection_metadata[connection_id] = {
            "connected_at": datetime.now(),
            "remote_address": websocket.remote_address,
            "path": path,
            "session_info": {}
        }
        
        try:
            await self._handle_client_messages(connection_id, websocket)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"健康设备连接关闭: {connection_id}")
        except Exception as e:
            logger.error(f"处理健康设备连接错误 {connection_id}: {e}")
            logger.error(traceback.format_exc())
        finally:
            await self._disconnect_client(connection_id)
    
    async def _handle_client_messages(self, connection_id: str, websocket):
        """处理客户端消息"""
        async for message in websocket:
            try:
                # 解析消息
                if isinstance(message, str):
                    data = json.loads(message)
                else:
                    # 处理二进制数据（如果需要）
                    logger.warning(f"收到二进制消息: {connection_id}")
                    continue
                
                logger.debug(f"收到健康设备消息 {connection_id}: {data}")
                
                # 处理MCP消息
                if self._is_mcp_message(data):
                    response = await self.device_connector.handle_mcp_request(websocket, data)
                    if response:
                        await websocket.send(json.dumps(response))
                
                # 处理设备特定消息
                elif data.get("type") == "device_data":
                    await self._handle_device_data(connection_id, websocket, data)
                
                elif data.get("type") == "device_status":
                    await self._handle_device_status(connection_id, websocket, data)
                
                elif data.get("type") == "heartbeat":
                    await self._handle_heartbeat(connection_id, websocket, data)
                
                else:
                    logger.warning(f"未知消息类型 {connection_id}: {data.get('type')}")
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": f"未知消息类型: {data.get('type')}",
                        "timestamp": datetime.now().isoformat()
                    }))
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON解析错误 {connection_id}: {e}")
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "JSON格式错误",
                    "timestamp": datetime.now().isoformat()
                }))
            
            except Exception as e:
                logger.error(f"处理消息错误 {connection_id}: {e}")
                logger.error(traceback.format_exc())
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": f"处理消息失败: {str(e)}",
                    "timestamp": datetime.now().isoformat()
                }))
    
    def _is_mcp_message(self, data: Dict) -> bool:
        """判断是否为MCP协议消息"""
        return (
            "jsonrpc" in data and 
            data.get("jsonrpc") == "2.0" and 
            "method" in data
        )
    
    async def _handle_device_data(self, connection_id: str, websocket, data: Dict):
        """处理设备数据消息"""
        try:
            device_mac = data.get("device_mac")
            health_data = data.get("health_data", [])
            
            if not device_mac or not health_data:
                await websocket.send(json.dumps({
                    "type": "error",
                    "message": "设备MAC地址和健康数据必填",
                    "timestamp": datetime.now().isoformat()
                }))
                return
            
            # 处理健康数据
            result = await self.device_connector._handle_sync_health_data(websocket, {
                "device_mac": device_mac,
                "health_data": health_data
            })
            
            # 发送确认
            await websocket.send(json.dumps({
                "type": "data_sync_response",
                "result": result,
                "timestamp": datetime.now().isoformat()
            }))
            
        except Exception as e:
            logger.error(f"处理设备数据错误: {e}")
            await websocket.send(json.dumps({
                "type": "error",
                "message": f"处理设备数据失败: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }))
    
    async def _handle_device_status(self, connection_id: str, websocket, data: Dict):
        """处理设备状态消息"""
        try:
            device_mac = data.get("device_mac")
            status_info = data.get("status", {})
            
            if device_mac:
                # 更新设备状态
                result = await self.device_connector._handle_heartbeat(websocket, {
                    "device_mac": device_mac,
                    "status": status_info
                })
                
                # 更新连接元数据
                if connection_id in self.connection_metadata:
                    self.connection_metadata[connection_id]["last_status"] = status_info
                    self.connection_metadata[connection_id]["last_status_time"] = datetime.now()
                
                await websocket.send(json.dumps({
                    "type": "status_response",
                    "result": result,
                    "timestamp": datetime.now().isoformat()
                }))
            
        except Exception as e:
            logger.error(f"处理设备状态错误: {e}")
    
    async def _handle_heartbeat(self, connection_id: str, websocket, data: Dict):
        """处理心跳消息"""
        try:
            # 更新连接活跃时间
            if connection_id in self.connection_metadata:
                self.connection_metadata[connection_id]["last_heartbeat"] = datetime.now()
            
            # 发送心跳响应
            await websocket.send(json.dumps({
                "type": "heartbeat_response",
                "server_time": datetime.now().isoformat(),
                "connection_id": connection_id
            }))
            
        except Exception as e:
            logger.error(f"处理心跳错误: {e}")
    
    async def _disconnect_client(self, connection_id: str):
        """断开客户端连接"""
        try:
            if connection_id in self.active_connections:
                websocket = self.active_connections.pop(connection_id)
                try:
                    if not websocket.closed:
                        await websocket.close()
                except:
                    pass
            
            if connection_id in self.connection_metadata:
                metadata = self.connection_metadata.pop(connection_id)
                logger.info(f"客户端连接已清理: {connection_id}, 持续时间: {datetime.now() - metadata['connected_at']}")
            
        except Exception as e:
            logger.error(f"断开客户端连接错误: {e}")
    
    # =========================== 广播功能 ===========================
    
    async def broadcast_message(self, message: Dict[str, Any], target_connections: Optional[list] = None):
        """向指定或所有连接广播消息"""
        message_json = json.dumps(message)
        
        if target_connections is None:
            target_connections = list(self.active_connections.keys())
        
        for connection_id in target_connections:
            if connection_id in self.active_connections:
                try:
                    websocket = self.active_connections[connection_id]
                    await websocket.send(message_json)
                except Exception as e:
                    logger.error(f"广播消息到 {connection_id} 失败: {e}")
    
    async def broadcast_emergency_alert(self, alert_data: Dict[str, Any]):
        """广播紧急警报"""
        alert_message = {
            "type": "emergency_alert",
            "alert_data": alert_data,
            "timestamp": datetime.now().isoformat(),
            "priority": "high"
        }
        
        await self.broadcast_message(alert_message)
        logger.warning(f"紧急警报已广播: {alert_data}")
    
    async def broadcast_device_update(self, device_mac: str, update_data: Dict[str, Any]):
        """广播设备状态更新"""
        update_message = {
            "type": "device_update",
            "device_mac": device_mac,
            "update_data": update_data,
            "timestamp": datetime.now().isoformat()
        }
        
        await self.broadcast_message(update_message)
    
    # =========================== 状态查询 ===========================
    
    def get_server_status(self) -> Dict[str, Any]:
        """获取服务器状态"""
        return {
            "is_running": self.is_running,
            "host": self.host,
            "port": self.port,
            "active_connections": len(self.active_connections),
            "device_connector_stats": self.device_connector.get_connection_stats(),
            "uptime": datetime.now().isoformat()
        }
    
    def get_connection_list(self) -> Dict[str, Any]:
        """获取连接列表"""
        connections = []
        for connection_id, metadata in self.connection_metadata.items():
            connections.append({
                "connection_id": connection_id,
                "remote_address": str(metadata["remote_address"]),
                "connected_at": metadata["connected_at"].isoformat(),
                "last_heartbeat": metadata.get("last_heartbeat", {}).isoformat() if metadata.get("last_heartbeat") else None,
                "last_status_time": metadata.get("last_status_time", {}).isoformat() if metadata.get("last_status_time") else None
            })
        
        return {
            "total_connections": len(connections),
            "connections": connections
        }


# =========================== 工厂函数 ===========================

async def create_health_device_server(eldercare_api, host: str = "0.0.0.0", port: int = 8001) -> HealthDeviceWebSocketServer:
    """创建健康设备WebSocket服务器"""
    server = HealthDeviceWebSocketServer(eldercare_api, host, port)
    await server.start_server()
    return server