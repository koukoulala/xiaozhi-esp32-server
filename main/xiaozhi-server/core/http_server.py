import asyncio
from aiohttp import web
from config.logger import setup_logging
from core.api.ota_handler import OTAHandler
from core.api.vision_handler import VisionHandler
from core.api.audio_handler import AudioHandler

TAG = __name__


class SimpleHttpServer:
    def __init__(self, config: dict):
        self.config = config
        self.logger = setup_logging()
        self.ota_handler = OTAHandler(config)
        self.vision_handler = VisionHandler(config)
        self.audio_handler = AudioHandler(config)

    def _get_websocket_url(self, local_ip: str, port: int) -> str:
        """获取websocket地址

        Args:
            local_ip: 本地IP地址
            port: 端口号

        Returns:
            str: websocket地址
        """
        server_config = self.config["server"]
        websocket_config = server_config.get("websocket")

        if websocket_config and "你" not in websocket_config:
            return websocket_config
        else:
            return f"ws://{local_ip}:{port}/xiaozhi/v1/"

    async def start(self):
        server_config = self.config["server"]
        read_config_from_api = self.config.get("read_config_from_api", False)
        host = server_config.get("ip", "0.0.0.0")
        port = int(server_config.get("http_port", 8003))

        if port:
            app = web.Application()

            if not read_config_from_api:
                # 如果没有开启智控台，只是单模块运行，就需要再添加简单OTA接口，用于下发websocket接口
                app.add_routes(
                    [
                        web.get("/xiaozhi/ota/", self.ota_handler.handle_get),
                        web.post("/xiaozhi/ota/", self.ota_handler.handle_post),
                        web.options("/xiaozhi/ota/", self.ota_handler.handle_post),
                    ]
                )
            
            # 添加基础路由
            app.add_routes(
                [
                    web.get("/mcp/vision/explain", self.vision_handler.handle_get),
                    web.post("/mcp/vision/explain", self.vision_handler.handle_post),
                    web.options("/mcp/vision/explain", self.vision_handler.handle_post),
                ]
            )
            
            # 添加音频上传和管理API路由
            app.add_routes([
                web.post("/api/audio/upload", self.audio_handler.upload_audio_file),
                web.get("/api/audio/list", self.audio_handler.list_audio_files),
                web.get("/api/audio/reference-files", self.audio_handler.get_reference_files),
                web.get("/api/audio/download/{file_id}", self.audio_handler.download_audio_file),
                web.put("/api/audio/update-text/{file_id}", self.audio_handler.update_reference_text),
                web.delete("/api/audio/delete/{file_id}", self.audio_handler.delete_audio_file),
                web.post("/api/audio/cleanup-temp", self.audio_handler.cleanup_temp_files),
                web.get("/api/audio/info/{file_id}", self.audio_handler.get_audio_file_info),
                web.get("/api/audio/supported-formats", self.audio_handler.get_supported_formats),
                # CORS支持
                web.options("/api/audio/upload", self.audio_handler.handle_options),
                web.options("/api/audio/list", self.audio_handler.handle_options),
                web.options("/api/audio/reference-files", self.audio_handler.handle_options),
                web.options("/api/audio/download/{file_id}", self.audio_handler.handle_options),
                web.options("/api/audio/update-text/{file_id}", self.audio_handler.handle_options),
                web.options("/api/audio/delete/{file_id}", self.audio_handler.handle_options),
                web.options("/api/audio/cleanup-temp", self.audio_handler.handle_options),
                web.options("/api/audio/info/{file_id}", self.audio_handler.handle_options),
                web.options("/api/audio/supported-formats", self.audio_handler.handle_options),
            ])

            # 运行服务
            runner = web.AppRunner(app)
            await runner.setup()
            site = web.TCPSite(runner, host, port)
            await site.start()

            # 保持服务运行
            while True:
                await asyncio.sleep(3600)  # 每隔 1 小时检查一次
