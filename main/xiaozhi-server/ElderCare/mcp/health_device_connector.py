"""
ElderCare健康设备MCP连接器
负责健康设备的发现、配对、数据同步和实时监控

作者: assistant
日期: 2025-01-20
版本: 1.0 - 初始实现
"""

import asyncio
import json
import uuid
import websockets
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
import logging
from concurrent.futures import Future

# 添加项目路径以便导入配置模块
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

TAG = "ElderCare.HealthDeviceConnector"

class HealthDeviceStatus:
    """健康设备状态枚举"""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    PAIRING = "pairing"
    PAIRED = "paired"
    SYNCING = "syncing"
    ERROR = "error"

class HealthDeviceType:
    """健康设备类型定义"""
    BLOOD_PRESSURE = "blood_pressure_monitor"
    HEART_RATE = "heart_rate_monitor"
    BLOOD_GLUCOSE = "blood_glucose_meter"
    TEMPERATURE = "thermometer"
    WEIGHT_SCALE = "weight_scale"
    PULSE_OXIMETER = "pulse_oximeter"
    ACTIVITY_TRACKER = "activity_tracker"
    FALL_DETECTOR = "fall_detector"
    EMERGENCY_BUTTON = "emergency_button"
    MULTI_SENSOR = "multi_sensor_device"

class HealthDeviceConnector:
    """ElderCare健康设备MCP连接器"""
    
    def __init__(self, eldercare_api, config: Dict[str, Any] = None):
        self.eldercare_api = eldercare_api
        self.config = config or {}
        
        # 设备管理
        self.discovered_devices: Dict[str, Dict] = {}  # MAC地址 -> 设备信息
        self.connected_devices: Dict[str, Dict] = {}   # MAC地址 -> 连接信息
        self.device_connections: Dict[str, websockets.WebSocketServerProtocol] = {}  # 设备连接
        
        # MCP协议支持
        self.mcp_handlers: Dict[str, Callable] = {}
        self.active_sessions: Dict[str, Dict] = {}
        self.pending_calls: Dict[int, Future] = {}
        self.call_id_counter = 1
        
        # 实时数据流
        self.data_subscribers: Dict[str, List[Callable]] = {}
        self.health_data_buffer: Dict[str, List[Dict]] = {}
        
        # 设备配对状态
        self.pairing_requests: Dict[str, Dict] = {}
        
        self._init_mcp_handlers()
        logger.info("ElderCare健康设备连接器初始化完成")
    
    def _init_mcp_handlers(self):
        """初始化MCP协议处理器"""
        self.mcp_handlers = {
            "initialize": self._handle_initialize,
            "device_discovery": self._handle_device_discovery,
            "device_pair": self._handle_device_pair,
            "device_connect": self._handle_device_connect,
            "device_disconnect": self._handle_device_disconnect,
            "sync_health_data": self._handle_sync_health_data,
            "get_device_status": self._handle_get_device_status,
            "configure_device": self._handle_configure_device,
            "emergency_trigger": self._handle_emergency_trigger,
            "heartbeat": self._handle_heartbeat
        }
    
    # =========================== MCP协议处理 ===========================
    
    async def handle_mcp_request(self, websocket, message: Dict[str, Any]) -> Dict[str, Any]:
        """处理MCP请求"""
        try:
            method = message.get("method")
            params = message.get("params", {})
            request_id = message.get("id")
            
            if method not in self.mcp_handlers:
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}"
                    }
                }
            
            handler = self.mcp_handlers[method]
            result = await handler(websocket, params)
            
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": result
            }
            
        except Exception as e:
            logger.error(f"处理MCP请求错误: {e}")
            return {
                "jsonrpc": "2.0",
                "id": message.get("id"),
                "error": {
                    "code": -32603,
                    "message": f"Internal error: {str(e)}"
                }
            }
    
    async def _handle_initialize(self, websocket, params: Dict) -> Dict[str, Any]:
        """处理初始化请求"""
        client_info = params.get("clientInfo", {})
        capabilities = params.get("capabilities", {})
        
        # 记录会话信息
        session_id = str(uuid.uuid4())
        self.active_sessions[session_id] = {
            "websocket": websocket,
            "client_info": client_info,
            "capabilities": capabilities,
            "created_at": datetime.now(),
            "session_id": session_id
        }
        
        logger.info(f"健康设备MCP会话初始化: {client_info.get('name', 'Unknown')}")
        
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "device_discovery": True,
                "device_pairing": True,
                "real_time_data": True,
                "emergency_alerts": True,
                "health_monitoring": True,
                "data_synchronization": True
            },
            "serverInfo": {
                "name": "ElderCare Health Device Server",
                "version": "1.0.0",
                "description": "智慧养老健康设备管理服务"
            },
            "session_id": session_id
        }
    
    async def _handle_device_discovery(self, websocket, params: Dict) -> Dict[str, Any]:
        """处理设备发现请求"""
        device_types = params.get("device_types", [])
        scan_duration = params.get("scan_duration", 30)  # 扫描时长（秒）
        
        logger.info(f"开始设备发现扫描，类型过滤: {device_types}, 时长: {scan_duration}秒")
        
        # 模拟设备发现过程
        discovered = await self._scan_for_devices(device_types, scan_duration)
        
        return {
            "discovered_devices": discovered,
            "scan_duration": scan_duration,
            "total_found": len(discovered)
        }
    
    async def _handle_device_pair(self, websocket, params: Dict) -> Dict[str, Any]:
        """处理设备配对请求"""
        device_mac = params.get("device_mac")
        user_id = params.get("user_id")
        pairing_code = params.get("pairing_code")
        
        if not device_mac or not user_id:
            raise ValueError("设备MAC地址和用户ID必填")
        
        # 检查设备是否可配对
        if device_mac not in self.discovered_devices:
            return {
                "success": False,
                "error": "设备未发现，请先进行设备扫描"
            }
        
        device_info = self.discovered_devices[device_mac]
        
        # 开始配对流程
        pairing_result = await self._pair_device(device_mac, user_id, pairing_code, device_info)
        
        if pairing_result["success"]:
            # 保存设备配对信息到数据库
            device_data = {
                "user_id": user_id,
                "device_name": device_info["name"],
                "device_type": device_info["type"],
                "device_brand": device_info.get("brand", "Unknown"),
                "device_model": device_info.get("model", "Unknown"),
                "mac_address": device_mac,
                "health_features": device_info.get("features", {}),
                "sensor_config": device_info.get("sensor_config", {}),
                "connection_status": HealthDeviceStatus.PAIRED,
                "battery_level": device_info.get("battery_level", 100),
                "firmware_version": device_info.get("firmware_version", "1.0.0")
            }
            
            db_result = await self.eldercare_api.register_health_device(device_data)
            if db_result["success"]:
                pairing_result["device_id"] = db_result["device_id"]
        
        return pairing_result
    
    async def _handle_device_connect(self, websocket, params: Dict) -> Dict[str, Any]:
        """处理设备连接请求"""
        device_mac = params.get("device_mac")
        
        if device_mac not in self.connected_devices:
            return {
                "success": False,
                "error": "设备未配对或不可连接"
            }
        
        # 建立设备连接
        connection_result = await self._connect_device(device_mac, websocket)
        
        if connection_result["success"]:
            # 更新数据库设备状态
            # TODO: 根据MAC地址查找device_id并更新状态
            pass
        
        return connection_result
    
    async def _handle_device_disconnect(self, websocket, params: Dict) -> Dict[str, Any]:
        """处理设备断开请求"""
        device_mac = params.get("device_mac")
        
        if device_mac in self.device_connections:
            await self._disconnect_device(device_mac)
        
        return {"success": True, "message": "设备已断开连接"}
    
    async def _handle_sync_health_data(self, websocket, params: Dict) -> Dict[str, Any]:
        """处理健康数据同步"""
        device_mac = params.get("device_mac")
        health_data = params.get("health_data", [])
        
        if not device_mac or not health_data:
            raise ValueError("设备MAC地址和健康数据必填")
        
        # 处理健康数据
        processed_count = 0
        errors = []
        
        for data_point in health_data:
            try:
                # 添加设备信息和时间戳
                data_point["device_mac"] = device_mac
                if "timestamp" not in data_point:
                    data_point["timestamp"] = datetime.now()
                
                # 保存到数据库
                result = await self.eldercare_api.save_health_data(data_point)
                if result["success"]:
                    processed_count += 1
                    
                    # 实时数据推送
                    await self._broadcast_health_data(device_mac, data_point)
                else:
                    errors.append(f"数据点保存失败: {result.get('message', 'Unknown error')}")
                    
            except Exception as e:
                errors.append(f"处理数据点错误: {str(e)}")
        
        return {
            "success": True,
            "processed_count": processed_count,
            "total_count": len(health_data),
            "errors": errors
        }
    
    async def _handle_get_device_status(self, websocket, params: Dict) -> Dict[str, Any]:
        """获取设备状态"""
        device_mac = params.get("device_mac")
        
        if device_mac in self.connected_devices:
            device_info = self.connected_devices[device_mac]
            return {
                "device_mac": device_mac,
                "status": device_info.get("status", HealthDeviceStatus.DISCONNECTED),
                "battery_level": device_info.get("battery_level"),
                "signal_strength": device_info.get("signal_strength"),
                "last_sync_time": device_info.get("last_sync_time"),
                "connection_quality": device_info.get("connection_quality", "good")
            }
        
        return {
            "device_mac": device_mac,
            "status": HealthDeviceStatus.DISCONNECTED,
            "message": "设备未连接"
        }
    
    async def _handle_configure_device(self, websocket, params: Dict) -> Dict[str, Any]:
        """配置设备参数"""
        device_mac = params.get("device_mac")
        configuration = params.get("configuration", {})
        
        if device_mac not in self.connected_devices:
            return {
                "success": False,
                "error": "设备未连接"
            }
        
        # 发送配置到设备
        config_result = await self._send_device_configuration(device_mac, configuration)
        
        return config_result
    
    async def _handle_emergency_trigger(self, websocket, params: Dict) -> Dict[str, Any]:
        """处理紧急情况触发"""
        device_mac = params.get("device_mac")
        emergency_type = params.get("emergency_type", "manual")
        sensor_data = params.get("sensor_data", {})
        location_info = params.get("location_info", {})
        
        # 创建紧急呼叫记录
        emergency_data = {
            "user_id": params.get("user_id"),
            "call_type": emergency_type,
            "trigger_source": "health_device",
            "sensor_data": sensor_data,
            "location_info": location_info,
            "auto_detected": 1 if emergency_type in ["fall_detected", "abnormal_heart_rate"] else 0,
            "severity_level": params.get("severity_level", "high"),
            "notes": f"健康设备{device_mac}触发紧急情况"
        }
        
        result = await self.eldercare_api.trigger_emergency_call(emergency_data)
        
        # 通知所有订阅者
        await self._broadcast_emergency_alert(device_mac, emergency_data)
        
        return result
    
    async def _handle_heartbeat(self, websocket, params: Dict) -> Dict[str, Any]:
        """处理心跳包"""
        device_mac = params.get("device_mac")
        
        if device_mac in self.connected_devices:
            self.connected_devices[device_mac]["last_heartbeat"] = datetime.now()
            
            # 更新设备状态
            status_data = params.get("status", {})
            if status_data:
                self.connected_devices[device_mac].update(status_data)
        
        return {
            "success": True,
            "server_time": datetime.now().isoformat(),
            "next_heartbeat": 30  # 下次心跳间隔（秒）
        }
    
    # =========================== 设备发现和配对 ===========================
    
    async def _scan_for_devices(self, device_types: List[str], duration: int) -> List[Dict]:
        """扫描可用的健康设备"""
        # 模拟设备发现过程
        await asyncio.sleep(2)  # 模拟扫描时间
        
        mock_devices = [
            {
                "mac_address": "AA:BB:CC:DD:EE:01",
                "name": "智能血压计",
                "type": HealthDeviceType.BLOOD_PRESSURE,
                "brand": "Omron",
                "model": "HEM-7156T",
                "signal_strength": -45,
                "battery_level": 85,
                "firmware_version": "2.1.3",
                "features": {
                    "bluetooth": True,
                    "memory_storage": True,
                    "irregular_heartbeat_detection": True,
                    "average_calculation": True
                },
                "sensor_config": {
                    "measurement_range": "0-300 mmHg",
                    "accuracy": "±3 mmHg",
                    "cuff_size": "22-42 cm"
                },
                "discovered_at": datetime.now().isoformat()
            },
            {
                "mac_address": "AA:BB:CC:DD:EE:02",
                "name": "心率监测器",
                "type": HealthDeviceType.HEART_RATE,
                "brand": "Polar",
                "model": "H10",
                "signal_strength": -38,
                "battery_level": 92,
                "firmware_version": "3.0.35",
                "features": {
                    "bluetooth": True,
                    "ant_plus": True,
                    "real_time_monitoring": True,
                    "hrv_analysis": True
                },
                "sensor_config": {
                    "measurement_range": "15-240 bpm",
                    "accuracy": "±1 bpm",
                    "sampling_rate": "1000 Hz"
                },
                "discovered_at": datetime.now().isoformat()
            },
            {
                "mac_address": "AA:BB:CC:DD:EE:03",
                "name": "血糖仪",
                "type": HealthDeviceType.BLOOD_GLUCOSE,
                "brand": "OneTouch",
                "model": "Verio IQ",
                "signal_strength": -52,
                "battery_level": 78,
                "firmware_version": "1.5.12",
                "features": {
                    "bluetooth": True,
                    "test_strips": True,
                    "color_range_indicator": True,
                    "meal_markers": True
                },
                "sensor_config": {
                    "measurement_range": "20-600 mg/dL",
                    "test_time": "5 seconds",
                    "sample_size": "0.4 μL"
                },
                "discovered_at": datetime.now().isoformat()
            },
            {
                "mac_address": "AA:BB:CC:DD:EE:04",
                "name": "智能体温计",
                "type": HealthDeviceType.TEMPERATURE,
                "brand": "Braun",
                "model": "ThermoScan 7",
                "signal_strength": -41,
                "battery_level": 88,
                "firmware_version": "1.2.8",
                "features": {
                    "infrared_sensor": True,
                    "age_precision": True,
                    "memory_storage": True,
                    "fever_guidance": True
                },
                "sensor_config": {
                    "measurement_range": "32.0-42.2°C",
                    "accuracy": "±0.2°C",
                    "response_time": "1 second"
                },
                "discovered_at": datetime.now().isoformat()
            },
            {
                "mac_address": "AA:BB:CC:DD:EE:05",
                "name": "跌倒检测器",
                "type": HealthDeviceType.FALL_DETECTOR,
                "brand": "SafelyYou",
                "model": "Guardian Pro",
                "signal_strength": -33,
                "battery_level": 95,
                "firmware_version": "4.2.1",
                "features": {
                    "accelerometer": True,
                    "gyroscope": True,
                    "emergency_button": True,
                    "gps_location": True,
                    "two_way_communication": True
                },
                "sensor_config": {
                    "fall_sensitivity": "adjustable",
                    "detection_algorithm": "AI-based",
                    "false_positive_filter": True
                },
                "discovered_at": datetime.now().isoformat()
            }
        ]
        
        # 根据类型过滤
        if device_types:
            mock_devices = [d for d in mock_devices if d["type"] in device_types]
        
        # 保存发现的设备
        for device in mock_devices:
            self.discovered_devices[device["mac_address"]] = device
        
        logger.info(f"设备发现完成，找到 {len(mock_devices)} 个设备")
        return mock_devices
    
    async def _pair_device(self, device_mac: str, user_id: int, pairing_code: str, device_info: Dict) -> Dict[str, Any]:
        """配对设备"""
        try:
            # 模拟配对过程
            await asyncio.sleep(3)
            
            # 验证配对码（简单示例）
            if pairing_code and len(pairing_code) >= 4:
                # 配对成功
                self.connected_devices[device_mac] = {
                    **device_info,
                    "user_id": user_id,
                    "paired_at": datetime.now(),
                    "status": HealthDeviceStatus.PAIRED,
                    "pairing_code": pairing_code
                }
                
                logger.info(f"设备配对成功: {device_mac} -> 用户 {user_id}")
                
                return {
                    "success": True,
                    "message": "设备配对成功",
                    "device_mac": device_mac,
                    "paired_at": datetime.now().isoformat()
                }
            else:
                return {
                    "success": False,
                    "error": "配对码无效或格式错误"
                }
                
        except Exception as e:
            logger.error(f"设备配对失败: {e}")
            return {
                "success": False,
                "error": f"配对失败: {str(e)}"
            }
    
    async def _connect_device(self, device_mac: str, websocket) -> Dict[str, Any]:
        """连接设备"""
        try:
            # 保存WebSocket连接
            self.device_connections[device_mac] = websocket
            
            # 更新设备状态
            if device_mac in self.connected_devices:
                self.connected_devices[device_mac]["status"] = HealthDeviceStatus.CONNECTED
                self.connected_devices[device_mac]["connected_at"] = datetime.now()
                self.connected_devices[device_mac]["websocket"] = websocket
            
            logger.info(f"设备连接成功: {device_mac}")
            
            return {
                "success": True,
                "message": "设备连接成功",
                "connection_time": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"设备连接失败: {e}")
            return {
                "success": False,
                "error": f"连接失败: {str(e)}"
            }
    
    async def _disconnect_device(self, device_mac: str):
        """断开设备连接"""
        try:
            if device_mac in self.device_connections:
                websocket = self.device_connections.pop(device_mac)
                try:
                    await websocket.close()
                except:
                    pass
            
            if device_mac in self.connected_devices:
                self.connected_devices[device_mac]["status"] = HealthDeviceStatus.DISCONNECTED
                self.connected_devices[device_mac]["disconnected_at"] = datetime.now()
                self.connected_devices[device_mac].pop("websocket", None)
            
            logger.info(f"设备已断开连接: {device_mac}")
            
        except Exception as e:
            logger.error(f"断开设备连接错误: {e}")
    
    # =========================== 实时数据处理 ===========================
    
    async def _broadcast_health_data(self, device_mac: str, health_data: Dict):
        """广播健康数据给订阅者"""
        subscribers = self.data_subscribers.get(device_mac, [])
        if subscribers:
            for callback in subscribers:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(device_mac, health_data)
                    else:
                        callback(device_mac, health_data)
                except Exception as e:
                    logger.error(f"广播健康数据到订阅者失败: {e}")
    
    async def _broadcast_emergency_alert(self, device_mac: str, emergency_data: Dict):
        """广播紧急警报"""
        alert_message = {
            "type": "emergency_alert",
            "device_mac": device_mac,
            "emergency_data": emergency_data,
            "timestamp": datetime.now().isoformat()
        }
        
        # 发送给所有连接的会话
        for session_id, session in self.active_sessions.items():
            try:
                websocket = session["websocket"]
                await websocket.send(json.dumps(alert_message))
            except Exception as e:
                logger.error(f"发送紧急警报到会话 {session_id} 失败: {e}")
    
    async def _send_device_configuration(self, device_mac: str, configuration: Dict) -> Dict[str, Any]:
        """向设备发送配置"""
        if device_mac not in self.device_connections:
            return {
                "success": False,
                "error": "设备未连接"
            }
        
        try:
            websocket = self.device_connections[device_mac]
            config_message = {
                "type": "device_configuration",
                "configuration": configuration,
                "timestamp": datetime.now().isoformat()
            }
            
            await websocket.send(json.dumps(config_message))
            
            return {
                "success": True,
                "message": "配置发送成功"
            }
            
        except Exception as e:
            logger.error(f"发送设备配置失败: {e}")
            return {
                "success": False,
                "error": f"配置发送失败: {str(e)}"
            }
    
    # =========================== 订阅管理 ===========================
    
    def subscribe_health_data(self, device_mac: str, callback: Callable):
        """订阅设备健康数据"""
        if device_mac not in self.data_subscribers:
            self.data_subscribers[device_mac] = []
        
        self.data_subscribers[device_mac].append(callback)
        logger.info(f"健康数据订阅添加: {device_mac}")
    
    def unsubscribe_health_data(self, device_mac: str, callback: Callable):
        """取消订阅设备健康数据"""
        if device_mac in self.data_subscribers:
            try:
                self.data_subscribers[device_mac].remove(callback)
                logger.info(f"健康数据订阅移除: {device_mac}")
            except ValueError:
                pass
    
    # =========================== 状态管理 ===========================
    
    def get_device_list(self) -> Dict[str, List]:
        """获取设备列表"""
        return {
            "discovered_devices": list(self.discovered_devices.values()),
            "connected_devices": list(self.connected_devices.values()),
            "active_connections": len(self.device_connections)
        }
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """获取连接统计"""
        return {
            "total_discovered": len(self.discovered_devices),
            "total_connected": len(self.connected_devices),
            "active_sessions": len(self.active_sessions),
            "data_subscribers": sum(len(subs) for subs in self.data_subscribers.values()),
            "uptime": datetime.now().isoformat()
        }
    
    async def cleanup(self):
        """清理资源"""
        try:
            # 断开所有设备连接
            for device_mac in list(self.device_connections.keys()):
                await self._disconnect_device(device_mac)
            
            # 清空数据结构
            self.discovered_devices.clear()
            self.connected_devices.clear()
            self.device_connections.clear()
            self.active_sessions.clear()
            self.data_subscribers.clear()
            self.health_data_buffer.clear()
            
            logger.info("ElderCare健康设备连接器资源清理完成")
            
        except Exception as e:
            logger.error(f"资源清理错误: {e}")