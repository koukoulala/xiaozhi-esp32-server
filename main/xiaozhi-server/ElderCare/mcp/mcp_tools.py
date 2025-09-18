"""
ElderCare MCP工具定义
定义健康设备相关的MCP工具和功能

作者: assistant
日期: 2025-01-20
版本: 1.0 - 初始实现
"""

from typing import Dict, List, Any
import json

class ElderCareMCPTools:
    """ElderCare MCP工具集合"""
    
    @staticmethod
    def get_tool_definitions() -> List[Dict[str, Any]]:
        """获取所有工具定义"""
        return [
            # 设备发现工具
            {
                "name": "discover_health_devices",
                "description": "扫描和发现附近的健康设备，支持多种设备类型过滤",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "device_types": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "要扫描的设备类型列表，如血压计、心率监测器等",
                            "default": []
                        },
                        "scan_duration": {
                            "type": "integer",
                            "description": "扫描持续时间（秒）",
                            "default": 30,
                            "minimum": 5,
                            "maximum": 120
                        },
                        "signal_strength_threshold": {
                            "type": "integer",
                            "description": "信号强度阈值（dBm），过滤弱信号设备",
                            "default": -60
                        }
                    },
                    "required": []
                }
            },
            
            # 设备配对工具
            {
                "name": "pair_health_device",
                "description": "将发现的健康设备与用户账户进行配对绑定",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "device_mac": {
                            "type": "string",
                            "description": "设备MAC地址",
                            "pattern": "^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
                        },
                        "user_id": {
                            "type": "integer",
                            "description": "用户ID"
                        },
                        "pairing_code": {
                            "type": "string",
                            "description": "设备配对码或PIN码",
                            "minLength": 4,
                            "maxLength": 8
                        },
                        "device_alias": {
                            "type": "string",
                            "description": "设备别名（可选）",
                            "maxLength": 50
                        }
                    },
                    "required": ["device_mac", "user_id", "pairing_code"]
                }
            },
            
            # 健康数据同步工具
            {
                "name": "sync_health_data",
                "description": "同步设备健康数据到服务器，支持批量上传",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "device_mac": {
                            "type": "string",
                            "description": "设备MAC地址"
                        },
                        "health_data": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "timestamp": {
                                        "type": "string",
                                        "format": "date-time",
                                        "description": "测量时间"
                                    },
                                    "data_type": {
                                        "type": "string",
                                        "enum": ["heart_rate", "blood_pressure", "blood_glucose", "temperature", "weight", "activity", "sleep"],
                                        "description": "数据类型"
                                    },
                                    "heart_rate": {
                                        "type": "integer",
                                        "description": "心率（次/分钟）"
                                    },
                                    "blood_pressure_systolic": {
                                        "type": "integer",
                                        "description": "收缩压（mmHg）"
                                    },
                                    "blood_pressure_diastolic": {
                                        "type": "integer",
                                        "description": "舒张压（mmHg）"
                                    },
                                    "blood_glucose": {
                                        "type": "number",
                                        "description": "血糖值（mg/dL）"
                                    },
                                    "body_temperature": {
                                        "type": "number",
                                        "description": "体温（摄氏度）"
                                    },
                                    "blood_oxygen": {
                                        "type": "integer",
                                        "description": "血氧饱和度（%）"
                                    },
                                    "step_count": {
                                        "type": "integer",
                                        "description": "步数"
                                    },
                                    "distance": {
                                        "type": "number",
                                        "description": "距离（公里）"
                                    },
                                    "calories_burned": {
                                        "type": "integer",
                                        "description": "消耗卡路里"
                                    },
                                    "sleep_duration": {
                                        "type": "integer",
                                        "description": "睡眠时长（分钟）"
                                    },
                                    "raw_data": {
                                        "type": "object",
                                        "description": "原始设备数据"
                                    }
                                }
                            },
                            "description": "健康数据数组"
                        },
                        "sync_mode": {
                            "type": "string",
                            "enum": ["incremental", "full"],
                            "description": "同步模式：增量或全量",
                            "default": "incremental"
                        }
                    },
                    "required": ["device_mac", "health_data"]
                }
            },
            
            # 获取设备状态工具
            {
                "name": "get_device_status",
                "description": "获取健康设备的当前状态和连接信息",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "device_mac": {
                            "type": "string",
                            "description": "设备MAC地址"
                        },
                        "include_details": {
                            "type": "boolean",
                            "description": "是否包含详细信息",
                            "default": false
                        }
                    },
                    "required": ["device_mac"]
                }
            },
            
            # 设备配置工具
            {
                "name": "configure_device",
                "description": "配置健康设备的参数和设置",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "device_mac": {
                            "type": "string",
                            "description": "设备MAC地址"
                        },
                        "configuration": {
                            "type": "object",
                            "properties": {
                                "measurement_interval": {
                                    "type": "integer",
                                    "description": "测量间隔（分钟）",
                                    "minimum": 1,
                                    "maximum": 1440
                                },
                                "auto_sync": {
                                    "type": "boolean",
                                    "description": "是否自动同步数据"
                                },
                                "alert_thresholds": {
                                    "type": "object",
                                    "description": "告警阈值配置",
                                    "properties": {
                                        "heart_rate_high": {"type": "integer"},
                                        "heart_rate_low": {"type": "integer"},
                                        "blood_pressure_high": {"type": "integer"},
                                        "blood_pressure_low": {"type": "integer"},
                                        "blood_glucose_high": {"type": "number"},
                                        "blood_glucose_low": {"type": "number"}
                                    }
                                },
                                "power_saving": {
                                    "type": "boolean",
                                    "description": "是否启用省电模式"
                                }
                            }
                        }
                    },
                    "required": ["device_mac", "configuration"]
                }
            },
            
            # 紧急呼叫触发工具
            {
                "name": "trigger_emergency_call",
                "description": "触发紧急呼叫，用于跌倒检测、异常心率等紧急情况",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "device_mac": {
                            "type": "string",
                            "description": "触发设备的MAC地址"
                        },
                        "user_id": {
                            "type": "integer",
                            "description": "用户ID"
                        },
                        "emergency_type": {
                            "type": "string",
                            "enum": ["fall_detected", "abnormal_heart_rate", "manual_trigger", "low_battery", "device_malfunction"],
                            "description": "紧急情况类型"
                        },
                        "severity_level": {
                            "type": "string",
                            "enum": ["low", "medium", "high", "critical"],
                            "description": "严重程度",
                            "default": "medium"
                        },
                        "sensor_data": {
                            "type": "object",
                            "description": "触发时的传感器数据",
                            "properties": {
                                "accelerometer": {
                                    "type": "object",
                                    "properties": {
                                        "x": {"type": "number"},
                                        "y": {"type": "number"},
                                        "z": {"type": "number"}
                                    }
                                },
                                "gyroscope": {
                                    "type": "object",
                                    "properties": {
                                        "x": {"type": "number"},
                                        "y": {"type": "number"},
                                        "z": {"type": "number"}
                                    }
                                },
                                "heart_rate": {"type": "integer"},
                                "blood_pressure": {
                                    "type": "object",
                                    "properties": {
                                        "systolic": {"type": "integer"},
                                        "diastolic": {"type": "integer"}
                                    }
                                }
                            }
                        },
                        "location_info": {
                            "type": "object",
                            "description": "位置信息",
                            "properties": {
                                "latitude": {"type": "number"},
                                "longitude": {"type": "number"},
                                "address": {"type": "string"},
                                "indoor_location": {"type": "string"}
                            }
                        },
                        "notes": {
                            "type": "string",
                            "description": "附加说明信息",
                            "maxLength": 500
                        }
                    },
                    "required": ["device_mac", "user_id", "emergency_type"]
                }
            },
            
            # 设备心跳工具
            {
                "name": "device_heartbeat",
                "description": "设备心跳检测，维持连接活跃状态",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "device_mac": {
                            "type": "string",
                            "description": "设备MAC地址"
                        },
                        "status": {
                            "type": "object",
                            "description": "设备状态信息",
                            "properties": {
                                "battery_level": {
                                    "type": "integer",
                                    "description": "电池电量（%）",
                                    "minimum": 0,
                                    "maximum": 100
                                },
                                "signal_strength": {
                                    "type": "integer",
                                    "description": "信号强度（dBm）"
                                },
                                "memory_usage": {
                                    "type": "integer",
                                    "description": "内存使用率（%）"
                                },
                                "temperature": {
                                    "type": "number",
                                    "description": "设备温度（摄氏度）"
                                },
                                "error_codes": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "错误代码列表"
                                }
                            }
                        }
                    },
                    "required": ["device_mac"]
                }
            },
            
            # 获取设备列表工具
            {
                "name": "get_device_list",
                "description": "获取用户绑定的健康设备列表",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "user_id": {
                            "type": "integer",
                            "description": "用户ID"
                        },
                        "device_type": {
                            "type": "string",
                            "description": "设备类型过滤",
                            "enum": ["blood_pressure_monitor", "heart_rate_monitor", "blood_glucose_meter", "thermometer", "weight_scale", "pulse_oximeter", "activity_tracker", "fall_detector", "emergency_button", "multi_sensor_device"]
                        },
                        "status": {
                            "type": "string",
                            "enum": ["all", "connected", "disconnected", "paired"],
                            "description": "状态过滤",
                            "default": "all"
                        }
                    },
                    "required": ["user_id"]
                }
            },
            
            # 获取健康数据工具
            {
                "name": "get_health_data",
                "description": "获取用户的健康数据记录",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "user_id": {
                            "type": "integer",
                            "description": "用户ID"
                        },
                        "device_mac": {
                            "type": "string",
                            "description": "设备MAC地址（可选）"
                        },
                        "data_types": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "数据类型过滤"
                        },
                        "start_date": {
                            "type": "string",
                            "format": "date-time",
                            "description": "开始时间"
                        },
                        "end_date": {
                            "type": "string",
                            "format": "date-time",
                            "description": "结束时间"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "返回记录数限制",
                            "default": 100,
                            "maximum": 1000
                        }
                    },
                    "required": ["user_id"]
                }
            },
            
            # 获取健康数据统计工具
            {
                "name": "get_health_statistics",
                "description": "获取健康数据统计分析结果",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "user_id": {
                            "type": "integer",
                            "description": "用户ID"
                        },
                        "days": {
                            "type": "integer",
                            "description": "统计天数",
                            "default": 7,
                            "minimum": 1,
                            "maximum": 365
                        },
                        "metrics": {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "enum": ["heart_rate", "blood_pressure", "blood_glucose", "activity", "sleep"]
                            },
                            "description": "要统计的指标"
                        }
                    },
                    "required": ["user_id"]
                }
            }
        ]
    
    @staticmethod
    def get_tool_by_name(name: str) -> Dict[str, Any]:
        """根据名称获取工具定义"""
        tools = ElderCareMCPTools.get_tool_definitions()
        for tool in tools:
            if tool["name"] == name:
                return tool
        return None
    
    @staticmethod
    def get_tool_names() -> List[str]:
        """获取所有工具名称列表"""
        tools = ElderCareMCPTools.get_tool_definitions()
        return [tool["name"] for tool in tools]
    
    @staticmethod
    def validate_tool_input(tool_name: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """验证工具输入数据"""
        tool = ElderCareMCPTools.get_tool_by_name(tool_name)
        if not tool:
            return {
                "valid": False,
                "error": f"工具不存在: {tool_name}"
            }
        
        # 简单验证必填字段
        required_fields = tool.get("inputSchema", {}).get("required", [])
        missing_fields = []
        
        for field in required_fields:
            if field not in input_data:
                missing_fields.append(field)
        
        if missing_fields:
            return {
                "valid": False,
                "error": f"缺少必填字段: {', '.join(missing_fields)}"
            }
        
        return {
            "valid": True,
            "message": "输入数据验证通过"
        }