#!/usr/bin/env python3
"""
ElderCare MCP服务启动脚本
独立启动ElderCare健康设备MCP服务

使用方法:
python start_eldercare_mcp.py [--host HOST] [--port PORT] [--config CONFIG_FILE]

作者: assistant
日期: 2025-01-20
版本: 1.0 - 初始实现
"""

import asyncio
import argparse
import json
import signal
import sys
import os
from typing import Dict, Any

# 添加项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
sys.path.insert(0, project_root)

try:
    from config.logger import setup_logging
    logger = setup_logging()
except ImportError:
    import logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

# ElderCare API导入
sys.path.insert(0, os.path.dirname(current_dir))
from api import init_eldercare_api

# MCP组件导入
from mcp.mcp_manager import create_eldercare_mcp_manager

TAG = "ElderCare.MCPLauncher"

class ElderCareMCPLauncher:
    """ElderCare MCP服务启动器"""
    
    def __init__(self):
        self.mcp_manager = None
        self.eldercare_api = None
        self.shutdown_event = asyncio.Event()
        
    def load_config(self, config_file: str = None) -> Dict[str, Any]:
        """加载配置文件"""
        default_config = {
            "database": {
                "host": "localhost",
                "port": 3306,
                "user": "root",
                "password": "password",
                "database": "manager_api"
            },
            "server": {
                "host": "0.0.0.0",
                "port": 8001
            },
            "eldercare": {
                "device_discovery_timeout": 30,
                "heartbeat_interval": 30,
                "data_sync_batch_size": 100,
                "emergency_alert_priority": "high"
            },
            "logging": {
                "level": "INFO",
                "format": "%(asctime)s [%(name)s] %(levelname)s - %(message)s"
            }
        }
        
        if config_file and os.path.exists(config_file):
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    file_config = json.load(f)
                    # 深度合并配置
                    self._deep_merge_config(default_config, file_config)
                    logger.info(f"配置文件加载成功: {config_file}")
            except Exception as e:
                logger.warning(f"配置文件加载失败，使用默认配置: {e}")
        
        return default_config
    
    def _deep_merge_config(self, base: Dict, update: Dict):
        """深度合并配置字典"""
        for key, value in update.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_merge_config(base[key], value)
            else:
                base[key] = value
    
    async def initialize_services(self, config: Dict[str, Any]):
        """初始化服务"""
        try:
            # 初始化ElderCare API
            logger.info("初始化ElderCare数据库连接...")
            self.eldercare_api = init_eldercare_api(config["database"])
            
            # 初始化MCP管理器
            logger.info("初始化ElderCare MCP管理器...")
            self.mcp_manager = await create_eldercare_mcp_manager(
                self.eldercare_api, 
                config
            )
            
            logger.info("ElderCare MCP服务初始化完成")
            return True
            
        except Exception as e:
            logger.error(f"服务初始化失败: {e}")
            return False
    
    async def start_services(self):
        """启动服务"""
        try:
            # MCP管理器已经在创建时启动了
            logger.info("ElderCare MCP服务启动成功")
            
            # 打印服务信息
            mcp_info = self.mcp_manager.get_mcp_info()
            server_info = mcp_info["server_info"]
            
            logger.info("=" * 60)
            logger.info("ElderCare健康设备MCP服务已启动")
            logger.info(f"服务地址: ws://{server_info['host']}:{server_info['port']}")
            logger.info(f"协议版本: {mcp_info['protocol_version']}")
            logger.info(f"可用工具: {len(mcp_info['available_tools'])} 个")
            logger.info("=" * 60)
            
            # 打印可用工具列表
            tools = self.mcp_manager.get_available_tools()
            logger.info("可用MCP工具:")
            for i, tool in enumerate(tools, 1):
                logger.info(f"  {i:2d}. {tool['name']} - {tool['description']}")
            
            logger.info("=" * 60)
            logger.info("服务正在运行，按 Ctrl+C 停止服务")
            
            return True
            
        except Exception as e:
            logger.error(f"服务启动失败: {e}")
            return False
    
    async def stop_services(self):
        """停止服务"""
        try:
            logger.info("正在停止ElderCare MCP服务...")
            
            if self.mcp_manager:
                await self.mcp_manager.stop()
                self.mcp_manager = None
            
            self.eldercare_api = None
            
            logger.info("ElderCare MCP服务已停止")
            
        except Exception as e:
            logger.error(f"服务停止错误: {e}")
    
    def setup_signal_handlers(self):
        """设置信号处理器"""
        def signal_handler(signum, frame):
            logger.info(f"收到信号 {signum}，准备停止服务...")
            self.shutdown_event.set()
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    async def run(self, config: Dict[str, Any]):
        """运行主服务循环"""
        try:
            # 初始化服务
            if not await self.initialize_services(config):
                return False
            
            # 启动服务
            if not await self.start_services():
                await self.stop_services()
                return False
            
            # 设置信号处理
            self.setup_signal_handlers()
            
            # 等待关闭信号
            await self.shutdown_event.wait()
            
            # 停止服务
            await self.stop_services()
            
            return True
            
        except Exception as e:
            logger.error(f"服务运行错误: {e}")
            await self.stop_services()
            return False


def parse_arguments():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description='ElderCare健康设备MCP服务')
    
    parser.add_argument('--host', 
                       default='0.0.0.0',
                       help='WebSocket服务器主机地址 (默认: 0.0.0.0)')
    
    parser.add_argument('--port', 
                       type=int,
                       default=8001,
                       help='WebSocket服务器端口 (默认: 8001)')
    
    parser.add_argument('--config', 
                       help='配置文件路径 (JSON格式)')
    
    parser.add_argument('--db-host',
                       default='localhost',
                       help='数据库主机地址 (默认: localhost)')
    
    parser.add_argument('--db-port',
                       type=int,
                       default=3306,
                       help='数据库端口 (默认: 3306)')
    
    parser.add_argument('--db-user',
                       default='root',
                       help='数据库用户名 (默认: root)')
    
    parser.add_argument('--db-password',
                       help='数据库密码')
    
    parser.add_argument('--db-name',
                       default='manager_api',
                       help='数据库名称 (默认: manager_api)')
    
    parser.add_argument('--log-level',
                       choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                       default='INFO',
                       help='日志级别 (默认: INFO)')
    
    return parser.parse_args()


def main():
    """主函数"""
    args = parse_arguments()
    
    # 创建启动器
    launcher = ElderCareMCPLauncher()
    
    # 加载配置
    config = launcher.load_config(args.config)
    
    # 应用命令行参数覆盖
    config["server"]["host"] = args.host
    config["server"]["port"] = args.port
    
    if args.db_host:
        config["database"]["host"] = args.db_host
    if args.db_port:
        config["database"]["port"] = args.db_port
    if args.db_user:
        config["database"]["user"] = args.db_user
    if args.db_password:
        config["database"]["password"] = args.db_password
    if args.db_name:
        config["database"]["database"] = args.db_name
    
    # 设置日志级别
    import logging
    logging.getLogger().setLevel(getattr(logging, args.log_level))
    
    # 运行服务
    try:
        asyncio.run(launcher.run(config))
        sys.exit(0)
    except KeyboardInterrupt:
        logger.info("收到中断信号，服务停止")
        sys.exit(0)
    except Exception as e:
        logger.error(f"服务运行失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()