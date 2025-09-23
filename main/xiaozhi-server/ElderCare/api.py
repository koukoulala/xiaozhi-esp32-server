"""
ElderCare智慧养老陪伴系统API - 统一优化版本
集成现有AI Agent架构，使用ai_tts_voice表实现声音克隆功能
添加Web录音功能支持

作者: assistant  
日期: 2025-09-18
版本: 6.0 - 统一优化版本
"""

import hashlib
import json
import os
import sys
import uuid
import base64
import bcrypt
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import mysql.connector
from mysql.connector import pooling
import asyncio

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

TAG = "ElderCare.api_unified"

class ElderCareAPI:
    """ElderCare智慧养老陪伴系统API - 统一优化版本"""
    
    def __init__(self, db_config: Dict[str, Any]):
        self.db_config = db_config
        self.connection_pool = None
        self._init_connection_pool()
    
    def _init_connection_pool(self):
        """初始化数据库连接池"""
        try:
            self.connection_pool = pooling.MySQLConnectionPool(
                pool_name="eldercare_pool",
                pool_size=15,
                pool_reset_session=True,
                host=self.db_config['host'],
                port=self.db_config['port'],
                user=self.db_config['user'],
                password=self.db_config['password'],
                database=self.db_config['database'],
                charset='utf8mb4',
                collation='utf8mb4_unicode_ci',
                autocommit=True
            )
            logger.info("ElderCare数据库连接池初始化成功")
        except Exception as e:
            logger.error(f"ElderCare数据库连接池初始化失败: {e}")
            raise e
    
    def get_connection(self):
        """从连接池获取数据库连接"""
        return self.connection_pool.get_connection()

    # =========================== AI智能体管理（ElderCare用户权限控制）===========================
    
    async def create_eldercare_ai_agent(self, user_id: int, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """为ElderCare用户创建AI智能体（权限受限）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 检查用户权限和创建限制
            cursor.execute("SELECT agent_creation_limit, owned_ai_agents, can_modify_models FROM ec_users WHERE id = %s", (user_id,))
            user_info = cursor.fetchone()
            
            if not user_info:
                return {"success": False, "message": "用户不存在"}
            
            # 解析已有的智能体列表
            try:
                owned_agents = json.loads(user_info.get('owned_ai_agents', '[]'))
            except:
                owned_agents = []
            
            # 检查创建限制
            if len(owned_agents) >= user_info['agent_creation_limit']:
                return {"success": False, "message": f"已达到智能体创建限制({user_info['agent_creation_limit']}个)"}
            
            # 生成AI Agent ID
            agent_id = f"EC_{str(uuid.uuid4()).replace('-', '')[:24]}"
            
            # ElderCare用户只能配置基础设置，模型配置使用默认值
            default_models = await self._get_default_models()
            
            # 创建AI智能体记录
            sql = """
            INSERT INTO ai_agent (
                id, user_id, agent_code, agent_name, 
                asr_model_id, vad_model_id, llm_model_id, vllm_model_id, 
                tts_model_id, tts_voice_id, mem_model_id, intent_model_id,
                system_prompt, summary_memory, 
                chat_history_conf, lang_code, language, sort,
                creator, created_at, updater, updated_at
            ) VALUES (
                %s, %s, %s, %s, 
                %s, %s, %s, %s, 
                %s, %s, %s, %s,
                %s, %s, 
                %s, %s, %s, %s,
                %s, NOW(), %s, NOW()
            )
            """
            
            cursor.execute(sql, (
                agent_id,
                user_info.get('ai_user_id'),  # 如果有关联的ai_user_id则使用，否则为NULL
                f"eldercare_{user_id}_{len(owned_agents)+1}",
                agent_data.get('agent_name', f"{user_info.get('elder_name', '老人')}的智能助手"),
                
                # 模型配置：ElderCare用户不能修改，使用默认值
                default_models.get('asr_model_id'),
                default_models.get('vad_model_id'), 
                default_models.get('llm_model_id'),
                default_models.get('vllm_model_id'),
                default_models.get('tts_model_id'),
                agent_data.get('tts_voice_id', default_models.get('tts_voice_id')),  # TTS音色可以选择
                default_models.get('mem_model_id'),
                default_models.get('intent_model_id'),
                
                agent_data.get('system_prompt', self._get_default_eldercare_prompt(user_info)),
                agent_data.get('summary_memory', ''),
                agent_data.get('chat_history_conf', 1),
                agent_data.get('lang_code', 'zh-CN'),
                agent_data.get('language', 'zh-CN'),
                len(owned_agents),
                user_id,
                user_id
            ))
            
            # 更新用户的智能体列表
            owned_agents.append(agent_id)
            cursor.execute(
                "UPDATE ec_users SET owned_ai_agents = %s, update_date = NOW() WHERE id = %s", 
                (json.dumps(owned_agents), user_id)
            )
            
            # 如果是第一个智能体，设为默认
            if len(owned_agents) == 1:
                cursor.execute(
                    "UPDATE ec_users SET default_ai_agent_id = %s WHERE id = %s", 
                    (agent_id, user_id)
                )
            
            cursor.close()
            conn.close()
            
            logger.info(f"为ElderCare用户{user_id}创建AI智能体成功: {agent_id}")
            return {
                "success": True, 
                "message": "AI智能体创建成功", 
                "agent_id": agent_id,
                "agent_name": agent_data.get('agent_name', f"{user_info.get('elder_name', '老人')}的智能助手")
            }
            
        except Exception as e:
            logger.error(f"创建ElderCare AI智能体错误: {e}")
            return {"success": False, "message": f"创建失败: {str(e)}"}
    
    async def _get_default_models(self) -> Dict[str, str]:
        """获取默认模型配置"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 从系统配置获取默认模型
            cursor.execute("SELECT config_value FROM ec_system_config WHERE config_key = 'system.default_models'")
            result = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if result and result['config_value']:
                return json.loads(result['config_value'])
            else:
                # 硬编码默认值
                return {
                    "asr_model_id": "ASR_WhisperLocal",
                    "vad_model_id": "VAD_SileroVad",
                    "llm_model_id": "LLM_ChatGLM",
                    "vllm_model_id": "VLLM_ChatGLMVLLM",
                    "tts_model_id": "TTS_CosyVoiceClone302AI",
                    "tts_voice_id": "TTS_CosyVoiceClone302AI0001",
                    "mem_model_id": None,
                    "intent_model_id": None
                }
        except Exception as e:
            logger.error(f"获取默认模型配置错误: {e}")
            return {}
    
    def _get_default_eldercare_prompt(self, user_info: Dict[str, Any]) -> str:
        """生成默认的ElderCare系统提示词"""
        elder_name = user_info.get('elder_name', '老人家')
        
        return f"""你是{elder_name}的专属智能陪伴助手，具有以下特征和功能：

1. 身份角色：
   - 你是一个温馨、耐心、专业的智能陪伴助手
   - 专门为老年人提供贴心的日常生活帮助和健康管理服务
   - 始终以温和、尊敬的语气与{elder_name}交流

2. 核心功能：
   - 健康监控：关注血压、心率、血糖等生命体征，及时提醒异常
   - 用药提醒：准确提醒服药时间和剂量，确保用药安全
   - 生活照料：提醒日常活动如用餐、喝水、运动、休息
   - 情感陪伴：倾听、聊天、缓解孤独感，提供正能量
   - 紧急响应：识别紧急情况，立即联系家人或医疗机构

3. 交流准则：
   - 使用简单清晰的语言，避免复杂词汇
   - 语速适中，语音温和亲切
   - 耐心重复重要信息，确保理解
   - 主动关心身体状况和情绪变化
   - 及时表扬和鼓励积极行为

4. 安全原则：
   - 健康异常时立即警觉并通知家人
   - 不提供具体医疗诊断，建议咨询专业医生
   - 紧急情况优先处理，确保{elder_name}安全

记住：你的使命是让{elder_name}感受到温暖的陪伴，过上更健康、更安心的生活。"""

    async def update_eldercare_agent_config(self, user_id: int, agent_id: str, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新ElderCare用户的AI智能体配置（权限受限）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 验证用户权限
            cursor.execute(
                "SELECT can_modify_models, owned_ai_agents FROM ec_users WHERE id = %s", 
                (user_id,)
            )
            user_info = cursor.fetchone()
            
            if not user_info:
                return {"success": False, "message": "用户不存在"}
            
            try:
                owned_agents = json.loads(user_info.get('owned_ai_agents', '[]'))
            except:
                owned_agents = []
            
            if agent_id not in owned_agents:
                return {"success": False, "message": "无权限修改此智能体"}
            
            # 构建更新SQL - ElderCare用户只能修改部分字段
            update_fields = []
            update_values = []
            
            # 允许修改的字段
            allowed_fields = {
                'agent_name': 'agent_name',
                'system_prompt': 'system_prompt',
                'tts_voice_id': 'tts_voice_id',  # 可以更换TTS音色
                'lang_code': 'lang_code',
                'language': 'language'
            }
            
            for config_key, db_field in allowed_fields.items():
                if config_key in config_data:
                    update_fields.append(f"{db_field} = %s")
                    update_values.append(config_data[config_key])
            
            if not update_fields:
                return {"success": False, "message": "没有可更新的字段"}
            
            # 禁止修改模型配置（除TTS音色外）
            if user_info['can_modify_models'] == 0:
                restricted_fields = ['asr_model_id', 'llm_model_id', 'vllm_model_id', 'tts_model_id', 'mem_model_id', 'intent_model_id']
                for field in restricted_fields:
                    if field in config_data:
                        return {"success": False, "message": f"ElderCare用户无权修改{field}"}
            
            update_values.extend([user_id, agent_id])
            sql = f"UPDATE ai_agent SET {', '.join(update_fields)}, updater = %s, updated_at = NOW() WHERE id = %s"
            
            cursor.execute(sql, update_values)
            
            cursor.close()
            conn.close()
            
            return {"success": True, "message": "智能体配置更新成功"}
            
        except Exception as e:
            logger.error(f"更新ElderCare智能体配置错误: {e}")
            return {"success": False, "message": f"更新失败: {str(e)}"}

    # =========================== 用户管理 ===========================
    
    async def register_eldercare_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """ElderCare用户注册（子女账户），自动创建默认AI智能体"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 使用bcrypt加密密码（与manager-api保持一致）
            password_hash = bcrypt.hashpw(user_data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            sql = """
            INSERT INTO ec_users (
                ai_user_id, username, password, real_name, phone, email,
                elder_name, elder_relation, elder_profile, family_contacts,
                default_ai_agent_id, owned_ai_agents, agent_creation_limit, can_modify_models, permission_level,
                status, create_date, update_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1, NOW(), NOW())
            """
            
            cursor.execute(sql, (
                user_data.get('ai_user_id'),  # 可选的高级用户关联
                user_data['username'],
                password_hash,
                user_data.get('real_name', ''),
                user_data.get('phone', ''),
                user_data.get('email', ''),
                user_data.get('elder_name', ''),
                user_data.get('elder_relation', 'family'),
                json.dumps(user_data.get('elder_profile', {}), ensure_ascii=False),
                json.dumps(user_data.get('family_contacts', {}), ensure_ascii=False),
                None,  # default_ai_agent_id，稍后创建
                '[]',  # owned_ai_agents，空数组
                user_data.get('agent_creation_limit', 3),
                user_data.get('can_modify_models', 0),  # 默认不允许修改模型
                user_data.get('permission_level', 'eldercare')
            ))
            
            user_id = cursor.lastrowid
            cursor.close()
            conn.close()
            
            # 自动创建默认AI智能体
            if user_data.get('create_default_agent', True):
                agent_result = await self.create_eldercare_ai_agent(user_id, {
                    'agent_name': f"{user_data.get('elder_name', '老人')}的智能助手",
                    'system_prompt': None,  # 使用默认提示词
                    'tts_voice_id': user_data.get('preferred_tts_voice_id')  # 可选的偏好音色
                })
                
                if not agent_result['success']:
                    logger.warning(f"用户{user_id}注册成功但默认智能体创建失败: {agent_result['message']}")
            
            logger.info(f"ElderCare用户注册成功: {user_data['username']}")
            return {"success": True, "message": "用户注册成功", "user_id": user_id}
            
        except mysql.connector.IntegrityError as e:
            logger.error(f"ElderCare用户注册失败，用户名或邮箱已存在: {e}")
            return {"success": False, "message": "用户名或邮箱已存在"}
        except Exception as e:
            logger.error(f"ElderCare用户注册错误: {e}")
            return {"success": False, "message": f"注册失败: {str(e)}"}
    
    async def eldercare_user_login(self, username: str, password: str) -> Dict[str, Any]:
        """ElderCare用户登录，包含智能体信息"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            sql = """
            SELECT ec.*, a.agent_name, a.system_prompt, a.tts_voice_id, 
                   tv.name as tts_voice_name, tv.tts_voice as tts_voice_code
            FROM ec_users ec
            LEFT JOIN ai_agent a ON ec.default_ai_agent_id = a.id
            LEFT JOIN ai_tts_voice tv ON a.tts_voice_id = tv.id
            WHERE ec.username = %s AND ec.status = 1
            """
            cursor.execute(sql, (username,))
            user = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if not user:
                return {"success": False, "message": "用户名或密码错误"}
            
            # 使用bcrypt验证密码（与manager-api保持一致）
            if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
                return {"success": False, "message": "用户名或密码错误"}
            
            # 移除密码字段，格式化数据
            user.pop('password', None)
            if user['create_date']:
                user['create_date'] = user['create_date'].isoformat()
            if user['update_date']:
                user['update_date'] = user['update_date'].isoformat()
            
            # 解析JSON字段
            try:
                user['elder_profile'] = json.loads(user.get('elder_profile', '{}'))
                user['family_contacts'] = json.loads(user.get('family_contacts', '{}'))
                user['owned_ai_agents'] = json.loads(user.get('owned_ai_agents', '[]'))
            except:
                pass
            
            return {"success": True, "data": user}
            
        except Exception as e:
            logger.error(f"ElderCare用户登录错误: {e}")
            return {"success": False, "message": f"登录失败: {str(e)}"}
    
    async def get_user_agent_info(self, user_id: int) -> Dict[str, Any]:
        """获取用户的AI智能体信息（更新版，支持多个智能体）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 获取用户的所有智能体信息
            sql = """
            SELECT u.default_ai_agent_id, u.owned_ai_agents, u.can_modify_models, u.permission_level,
                   a.id as agent_id, a.agent_name, a.tts_model_id, a.tts_voice_id,
                   tm.model_name as tts_model_name, tv.name as tts_voice_name,
                   a.system_prompt, a.lang_code, a.language
            FROM ec_users u
            LEFT JOIN ai_agent a ON u.default_ai_agent_id = a.id
            LEFT JOIN ai_model_config tm ON a.tts_model_id = tm.id
            LEFT JOIN ai_tts_voice tv ON a.tts_voice_id = tv.id
            WHERE u.id = %s
            """
            
            cursor.execute(sql, (user_id,))
            agent_info = cursor.fetchone()
            
            if agent_info:
                # 获取用户拥有的所有智能体列表
                try:
                    owned_agents = json.loads(agent_info.get('owned_ai_agents', '[]'))
                except:
                    owned_agents = []
                
                # 查询所有智能体的详细信息
                if owned_agents:
                    placeholders = ','.join(['%s'] * len(owned_agents))
                    sql_all_agents = f"""
                    SELECT a.id, a.agent_name, a.tts_voice_id, tv.name as tts_voice_name,
                           a.system_prompt, a.created_at
                    FROM ai_agent a
                    LEFT JOIN ai_tts_voice tv ON a.tts_voice_id = tv.id
                    WHERE a.id IN ({placeholders})
                    ORDER BY a.created_at
                    """
                    cursor.execute(sql_all_agents, owned_agents)
                    all_agents = cursor.fetchall()
                    
                    # 格式化时间
                    for agent in all_agents:
                        if agent['created_at']:
                            agent['created_at'] = agent['created_at'].isoformat()
                else:
                    all_agents = []
                
                result_data = {
                    "default_ai_agent_id": agent_info['default_ai_agent_id'],
                    "can_modify_models": bool(agent_info['can_modify_models']),
                    "permission_level": agent_info['permission_level'],
                    "default_agent_info": {
                        "agent_id": agent_info['agent_id'],
                        "agent_name": agent_info['agent_name'],
                        "tts_model_id": agent_info['tts_model_id'],
                        "tts_voice_id": agent_info['tts_voice_id'],
                        "tts_model_name": agent_info['tts_model_name'],
                        "tts_voice_name": agent_info['tts_voice_name'],
                        "system_prompt": agent_info['system_prompt'],
                        "lang_code": agent_info['lang_code'],
                        "language": agent_info['language']
                    },
                    "all_agents": all_agents,
                    "agent_count": len(all_agents)
                }
                
                cursor.close()
                conn.close()
                return {"success": True, "data": result_data}
            else:
                cursor.close()
                conn.close()
                return {"success": False, "message": "用户或智能体信息不存在"}
            
        except Exception as e:
            logger.error(f"获取用户智能体信息错误: {e}")
            return {"success": False, "message": f"获取失败: {str(e)}"}

    async def set_default_agent(self, user_id: int, agent_id: str) -> Dict[str, Any]:
        """设置用户的默认AI智能体"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 验证智能体归属
            cursor.execute("SELECT owned_ai_agents FROM ec_users WHERE id = %s", (user_id,))
            user_info = cursor.fetchone()
            
            if not user_info:
                return {"success": False, "message": "用户不存在"}
            
            try:
                owned_agents = json.loads(user_info.get('owned_ai_agents', '[]'))
            except:
                owned_agents = []
            
            if agent_id not in owned_agents:
                return {"success": False, "message": "智能体不属于当前用户"}
            
            # 更新默认智能体
            cursor.execute(
                "UPDATE ec_users SET default_ai_agent_id = %s, updated_at = NOW() WHERE id = %s", 
                (agent_id, user_id)
            )
            
            cursor.close()
            conn.close()
            
            return {"success": True, "message": "默认智能体设置成功"}
            
        except Exception as e:
            logger.error(f"设置默认智能体错误: {e}")
            return {"success": False, "message": f"设置失败: {str(e)}"}
    
    async def get_user_agent_info(self, user_id: int) -> Dict[str, Any]:
        """获取用户的AI智能体信息（核心方法）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            sql = """
            SELECT u.default_ai_agent_id, NULL as current_ai_device_id,
                   a.agent_name, a.tts_model_id, a.tts_voice_id,
                   tm.model_name as tts_model_name, tv.name as tts_voice_name
            FROM ec_users u
            LEFT JOIN ai_agent a ON u.default_ai_agent_id = a.id
            LEFT JOIN ai_model_config tm ON a.tts_model_id = tm.id
            LEFT JOIN ai_tts_voice tv ON a.tts_voice_id = tv.id
            WHERE u.id = %s
            """
            
            cursor.execute(sql, (user_id,))
            agent_info = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if agent_info:
                return {"success": True, "data": agent_info}
            else:
                return {"success": False, "message": "用户不存在或未配置AI智能体"}
            
        except Exception as e:
            logger.error(f"获取用户智能体信息错误: {e}")
            return {"success": False, "message": f"获取失败: {str(e)}"}

    # =========================== 声音克隆管理（基于现有ai_tts_voice表）===========================
    
    async def create_voice_clone(self, voice_data: Dict[str, Any]) -> Dict[str, Any]:
        """为用户创建新的声音克隆（在ai_tts_voice表中增加一行）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 生成新的音色ID
            voice_id = f"TTS_ElderCare_{str(uuid.uuid4()).replace('-', '')[:16]}"
            
            # 获取用户的当前TTS模型ID - 关键：确保映射对应
            user_agent_info = await self.get_user_agent_info(voice_data['user_id'])
            if not user_agent_info.get('success'):
                return {"success": False, "message": "获取用户AI智能体信息失败"}
            
            tts_model_id = user_agent_info['data'].get('tts_model_id', 'TTS_CosyVoiceClone302AI')
            
            # 在ai_tts_voice表中插入新的音色记录
            sql = """
            INSERT INTO ai_tts_voice (
                id, tts_model_id, name, tts_voice, languages, voice_demo,
                reference_audio, reference_text, remark, sort, creator, create_date, updater, update_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s, NOW())
            """
            
            cursor.execute(sql, (
                voice_id,
                tts_model_id,  # 使用智能体真实的TTS模型ID
                voice_data.get('voice_name', '家人音色'),
                voice_data.get('voice_code', voice_id.lower()),
                voice_data.get('languages', '中文'),
                voice_data.get('voice_demo', ''),  # 可以存储测试音频URL
                voice_data.get('reference_audio', ''),  # 参考音频文件路径
                voice_data.get('reference_text', '您好，我是您的家人，这是我的普通话测试部分。'),
                f"ElderCare用户{voice_data['user_id']}的家人音色 - {voice_data.get('family_member_name', '未知')}({voice_data.get('relationship', 'family')})",
                voice_data.get('sort', 999),
                voice_data['user_id'],
                voice_data['user_id']
            ))
            
            cursor.close()
            conn.close()
            
            return {
                "success": True, 
                "message": "声音克隆创建成功", 
                "voice_id": voice_id,
                "tts_model_id": tts_model_id
            }
            
        except Exception as e:
            logger.error(f"创建声音克隆错误: {e}")
            return {"success": False, "message": f"创建失败: {str(e)}"}
    
    async def upload_voice_recording(self, recording_data: Dict[str, Any]) -> Dict[str, Any]:
        """处理网页录音上传（Base64格式）"""
        try:
            user_id = recording_data['user_id']
            audio_base64 = recording_data['audio_data']  # Base64编码的音频数据
            audio_format = recording_data.get('format', 'wav')
            family_member_name = recording_data.get('family_member_name', '家人')
            relationship = recording_data.get('relationship', 'family')
            
            # 验证Base64数据
            if not audio_base64 or not audio_base64.startswith('data:audio/'):
                return {"success": False, "message": "无效的音频数据格式"}
            
            # 解析Base64数据
            try:
                # 格式: data:audio/wav;base64,XXXXX
                header, audio_data = audio_base64.split(',', 1)
                audio_bytes = base64.b64decode(audio_data)
            except:
                return {"success": False, "message": "音频数据解码失败"}
            
            # 生成文件名和保存路径
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"eldercare_voice_{user_id}_{timestamp}.{audio_format}"
            
            # 确保上传目录存在
            upload_dir = os.path.join(current_dir, '../../../data/audio_uploads/reference')
            os.makedirs(upload_dir, exist_ok=True)
            
            file_path = os.path.join(upload_dir, filename)
            
            # 保存音频文件
            with open(file_path, 'wb') as f:
                f.write(audio_bytes)
            
            # 创建声音克隆记录
            voice_clone_data = {
                'user_id': user_id,
                'voice_name': f'{family_member_name}的声音',
                'family_member_name': family_member_name,
                'relationship': relationship,
                'reference_audio': f'/data/audio_uploads/reference/{filename}',
                'reference_text': recording_data.get('reference_text', '您好，我是您的家人，这是我的普通话测试部分。'),
                'languages': '中文'
            }
            
            # 调用创建声音克隆
            result = await self.create_voice_clone(voice_clone_data)
            
            if result['success']:
                result['audio_file_path'] = f'/data/audio_uploads/reference/{filename}'
                result['audio_size'] = len(audio_bytes)
                result['duration_estimate'] = len(audio_bytes) / 16000  # 粗略估算（假设16kHz采样率）
            
            return result
            
        except Exception as e:
            logger.error(f"上传录音错误: {e}")
            return {"success": False, "message": f"上传失败: {str(e)}"}
    
    async def get_user_voice_clones(self, user_id: int) -> Dict[str, Any]:
        """获取用户的所有声音克隆列表"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 通过用户创建的音色记录获取声音克隆列表
            sql = """
            SELECT v.*, tm.model_name as tts_model_name
            FROM ai_tts_voice v
            LEFT JOIN ai_model_config tm ON v.tts_model_id = tm.id
            WHERE v.creator = %s AND v.remark LIKE 'ElderCare用户%'
            ORDER BY v.create_date DESC
            """
            
            cursor.execute(sql, (user_id,))
            voice_clones = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            # 格式化数据
            for clone in voice_clones:
                if clone['create_date']:
                    clone['create_date'] = clone['create_date'].isoformat()
                if clone['update_date']:
                    clone['update_date'] = clone['update_date'].isoformat()
                
                # 解析备注信息获取家庭成员信息
                remark = clone.get('remark', '')
                family_info = self._parse_family_info_from_remark(remark)
                clone.update(family_info)
                
                # 检查音频文件是否存在
                reference_audio = clone.get('reference_audio', '')
                if reference_audio:
                    audio_full_path = os.path.join(current_dir, '../../../', reference_audio.lstrip('/'))
                    clone['audio_file_exists'] = os.path.exists(audio_full_path)
                    if clone['audio_file_exists']:
                        try:
                            file_size = os.path.getsize(audio_full_path)
                            clone['audio_file_size'] = file_size
                        except:
                            clone['audio_file_size'] = 0
                else:
                    clone['audio_file_exists'] = False
                    clone['audio_file_size'] = 0
            
            return {"success": True, "data": voice_clones}
            
        except Exception as e:
            logger.error(f"获取用户声音克隆列表错误: {e}")
            return {"success": False, "message": f"获取失败: {str(e)}"}
    
    def _parse_family_info_from_remark(self, remark: str) -> Dict[str, str]:
        """从备注信息中解析家庭成员信息"""
        family_info = {
            "family_member_name": "未知",
            "relationship": "family"
        }
        
        try:
            # 解析格式："ElderCare用户1的家人音色 - 张三(son)"
            if " - " in remark and "(" in remark and ")" in remark:
                info_part = remark.split(" - ")[1]
                name_part, relation_part = info_part.rsplit("(", 1)
                family_info["family_member_name"] = name_part.strip()
                family_info["relationship"] = relation_part.rstrip(")").strip()
        except:
            pass
        
        return family_info
    
    async def set_default_voice_for_agent(self, user_id: int, voice_id: str) -> Dict[str, Any]:
        """为用户的AI智能体设置默认声音克隆"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 获取用户的AI智能体ID
            user_agent_info = await self.get_user_agent_info(user_id)
            if not user_agent_info.get('success'):
                return {"success": False, "message": "获取用户AI智能体信息失败"}
            
            agent_id = user_agent_info['data'].get('default_ai_agent_id')
            if not agent_id:
                return {"success": False, "message": "用户没有配置AI智能体"}
            
            # 更新ai_agent表的tts_voice_id字段
            cursor.execute("UPDATE ai_agent SET tts_voice_id = %s, updated_at = NOW() WHERE id = %s", (voice_id, agent_id))
            
            cursor.close()
            conn.close()
            
            return {"success": True, "message": "默认声音设置成功", "agent_id": agent_id}
            
        except Exception as e:
            logger.error(f"设置默认声音错误: {e}")
            return {"success": False, "message": f"设置失败: {str(e)}"}
    
    async def get_tts_reference_text_examples(self) -> Dict[str, Any]:
        """获取TTS参考文本示例"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 从系统配置获取参考文本示例
            cursor.execute("SELECT config_value FROM ec_system_config WHERE config_key = 'tts.reference_text_examples'")
            result = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if result and result['config_value']:
                examples = json.loads(result['config_value'])
                return {"success": True, "examples": examples}
            else:
                # 默认示例
                default_examples = [
                    "您好，我是您的家人，这是我的普通话测试部分。",
                    "今天天气不错，记得按时吃药，注意身体健康。",
                    "该起床了，记得先喝一杯温水，对身体有好处。",
                    "晚饭时间到了，今天准备了您最喜欢的菜。"
                ]
                return {"success": True, "examples": default_examples}
            
        except Exception as e:
            logger.error(f"获取参考文本示例错误: {e}")
            return {"success": False, "message": f"获取失败: {str(e)}"}
    
    async def delete_voice_clone(self, voice_id: str, user_id: int) -> Dict[str, Any]:
        """删除用户的声音克隆"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 先获取音频文件路径用于删除
            cursor.execute("SELECT reference_audio FROM ai_tts_voice WHERE id = %s AND creator = %s", (voice_id, user_id))
            voice_info = cursor.fetchone()
            
            if not voice_info:
                return {"success": False, "message": "声音克隆不存在或无权删除"}
            
            # 删除数据库记录
            cursor.execute("DELETE FROM ai_tts_voice WHERE id = %s AND creator = %s", (voice_id, user_id))
            
            if cursor.rowcount > 0:
                # 删除音频文件
                reference_audio = voice_info.get('reference_audio', '')
                if reference_audio:
                    audio_full_path = os.path.join(current_dir, '../../../', reference_audio.lstrip('/'))
                    try:
                        if os.path.exists(audio_full_path):
                            os.remove(audio_full_path)
                            logger.info(f"删除音频文件: {audio_full_path}")
                    except Exception as e:
                        logger.warning(f"删除音频文件失败: {e}")
                
                cursor.close()
                conn.close()
                return {"success": True, "message": "声音克隆删除成功"}
            else:
                cursor.close()
                conn.close()
                return {"success": False, "message": "删除失败"}
            
        except Exception as e:
            logger.error(f"删除声音克隆错误: {e}")
            return {"success": False, "message": f"删除失败: {str(e)}"}

    # =========================== 智能提醒管理（集成TTS声音克隆）===========================
    
    async def create_reminder_with_voice(self, reminder_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建智能提醒（支持指定TTS声音克隆）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 如果没有指定TTS声音，使用用户的默认声音
            if not reminder_data.get('tts_voice_id'):
                user_agent_info = await self.get_user_agent_info(reminder_data['user_id'])
                if user_agent_info.get('success'):
                    reminder_data['tts_voice_id'] = user_agent_info['data'].get('tts_voice_id')
            
            sql = """
            INSERT INTO ec_reminders (
                user_id, ai_agent_id, ai_device_id, tts_voice_id, reminder_type, title, content, voice_prompt,
                scheduled_time, repeat_pattern, repeat_config, tts_enabled, priority, is_completed, status, 
                create_date, update_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, 'active', NOW(), NOW())
            """
            
            # 处理时间格式
            scheduled_time = reminder_data.get('scheduled_time')
            if isinstance(scheduled_time, str):
                scheduled_time = datetime.fromisoformat(scheduled_time.replace('Z', '+00:00'))
            
            cursor.execute(sql, (
                reminder_data['user_id'],
                reminder_data.get('ai_agent_id'),
                reminder_data.get('ai_device_id'),
                reminder_data.get('tts_voice_id'),
                reminder_data['reminder_type'],
                reminder_data['title'],
                reminder_data.get('content', ''),
                reminder_data.get('voice_prompt', ''),  # 专门的语音提醒内容
                scheduled_time,
                reminder_data.get('repeat_pattern', 'once'),
                json.dumps(reminder_data.get('repeat_config', {}), ensure_ascii=False),
                reminder_data.get('tts_enabled', 1),
                reminder_data.get('priority', 'medium')
            ))
            
            reminder_id = cursor.lastrowid
            cursor.close()
            conn.close()
            
            return {
                "success": True, 
                "message": "智能提醒创建成功", 
                "reminder_id": reminder_id
            }
            
        except Exception as e:
            logger.error(f"创建提醒错误: {e}")
            return {"success": False, "message": f"创建失败: {str(e)}"}
    
    async def get_user_reminders_with_voice(self, user_id: int, status: str = None, limit: int = 50) -> Dict[str, Any]:
        """获取用户提醒列表（包含TTS声音信息）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            where_conditions = ["r.user_id = %s"]
            params = [user_id]
            
            if status == 'active':
                where_conditions.append("r.is_completed = 0 AND r.status = 'active'")
            elif status == 'completed':
                where_conditions.append("r.is_completed = 1")
            
            sql = f"""
            SELECT r.*, a.agent_name, d.alias as device_name,
                   v.name as tts_voice_name, v.tts_voice as voice_code,
                   tm.model_name as tts_model_name
            FROM ec_reminders r
            LEFT JOIN ai_agent a ON r.ai_agent_id = a.id
            LEFT JOIN ai_device d ON r.ai_device_id = d.id
            LEFT JOIN ai_tts_voice v ON r.tts_voice_id = v.id
            LEFT JOIN ai_model_config tm ON v.tts_model_id = tm.id
            WHERE {' AND '.join(where_conditions)}
            ORDER BY r.scheduled_time ASC, r.priority DESC
            LIMIT %s
            """
            params.append(limit)
            
            cursor.execute(sql, params)
            reminders = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            # 格式化数据
            for reminder in reminders:
                if reminder['scheduled_time']:
                    reminder['scheduled_time'] = reminder['scheduled_time'].isoformat()
                if reminder['completed_time']:
                    reminder['completed_time'] = reminder['completed_time'].isoformat()
                if reminder['create_date']:
                    reminder['create_date'] = reminder['create_date'].isoformat()
                if reminder['update_date']:
                    reminder['update_date'] = reminder['update_date'].isoformat()
                
                # 解析JSON字段
                try:
                    reminder['repeat_config'] = json.loads(reminder['repeat_config']) if reminder['repeat_config'] else {}
                except:
                    reminder['repeat_config'] = {}
            
            return {"success": True, "data": reminders}
            
        except Exception as e:
            logger.error(f"获取提醒列表错误: {e}")
            return {"success": False, "message": f"获取失败: {str(e)}"}

    # =========================== 健康设备管理 ===========================
    
    async def register_health_device(self, device_data: Dict[str, Any]) -> Dict[str, Any]:
        """注册健康设备（与AI Agent插件集成）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            sql = """
            INSERT INTO ec_health_devices (
                user_id, ai_agent_id, plugin_id, device_name, device_type, device_brand, device_model,
                mac_address, health_features, sensor_config, data_sync_config,
                connection_status, battery_level, firmware_version, last_sync_time, is_active,
                create_date, update_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), 1, NOW(), NOW())
            """
            
            cursor.execute(sql, (
                device_data['user_id'],
                device_data.get('ai_agent_id'),
                device_data.get('plugin_id', 'HEALTH_DEVICE_GENERIC'),
                device_data['device_name'],
                device_data['device_type'],
                device_data.get('device_brand', ''),
                device_data.get('device_model', ''),
                device_data.get('mac_address', ''),
                json.dumps(device_data.get('health_features', {}), ensure_ascii=False),
                json.dumps(device_data.get('sensor_config', {}), ensure_ascii=False),
                json.dumps(device_data.get('data_sync_config', {}), ensure_ascii=False),
                device_data.get('connection_status', 'disconnected'),
                device_data.get('battery_level'),
                device_data.get('firmware_version', '1.0.0')
            ))
            
            device_id = cursor.lastrowid
            cursor.close()
            conn.close()
            
            return {
                "success": True, 
                "message": "健康设备注册成功", 
                "device_id": device_id
            }
            
        except Exception as e:
            logger.error(f"注册健康设备错误: {e}")
            return {"success": False, "message": f"注册失败: {str(e)}"}
    
    async def get_user_health_devices(self, user_id: int) -> Dict[str, Any]:
        """获取用户的健康设备列表"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            sql = """
            SELECT hd.*, a.agent_name
            FROM ec_health_devices hd
            LEFT JOIN ai_agent a ON hd.ai_agent_id = a.id
            WHERE hd.user_id = %s AND hd.is_active = 1
            ORDER BY hd.create_date DESC
            """
            
            cursor.execute(sql, (user_id,))
            devices = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            # 格式化数据
            for device in devices:
                if device['create_date']:
                    device['create_date'] = device['create_date'].isoformat()
                if device['update_date']:
                    device['update_date'] = device['update_date'].isoformat()
                if device['last_sync_time']:
                    device['last_sync_time'] = device['last_sync_time'].isoformat()
                
                # 解析JSON字段
                try:
                    device['health_features'] = json.loads(device['health_features']) if device['health_features'] else {}
                    device['sensor_config'] = json.loads(device['sensor_config']) if device['sensor_config'] else {}
                    device['data_sync_config'] = json.loads(device['data_sync_config']) if device['data_sync_config'] else {}
                except:
                    pass
            
            return {"success": True, "data": devices}
            
        except Exception as e:
            logger.error(f"获取用户健康设备列表错误: {e}")
            return {"success": False, "message": f"获取失败: {str(e)}"}

    # =========================== 健康数据管理 ===========================
    
    async def save_health_data(self, health_data: Dict[str, Any]) -> Dict[str, Any]:
        """保存健康数据到数据库"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            sql = """
            INSERT INTO ec_health_data (
                user_id, health_device_id, ai_device_id, timestamp, data_type,
                heart_rate, blood_pressure_systolic, blood_pressure_diastolic, 
                blood_glucose, body_temperature, blood_oxygen,
                step_count, distance, calories_burned, activity_level, exercise_duration,
                sleep_duration, deep_sleep_duration, light_sleep_duration, sleep_quality_score,
                fall_detected, abnormal_heart_rate, emergency_triggered,
                data_source, raw_data, data_quality, create_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """
            
            # 处理时间戳
            timestamp = health_data.get('timestamp')
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            elif timestamp is None:
                timestamp = datetime.now()
            
            cursor.execute(sql, (
                health_data['user_id'],
                health_data.get('health_device_id'),
                health_data.get('ai_device_id'),
                timestamp,
                health_data['data_type'],
                health_data.get('heart_rate'),
                health_data.get('blood_pressure_systolic'),
                health_data.get('blood_pressure_diastolic'),
                health_data.get('blood_glucose'),
                health_data.get('body_temperature'),
                health_data.get('blood_oxygen'),
                health_data.get('step_count'),
                health_data.get('distance'),
                health_data.get('calories_burned'),
                health_data.get('activity_level'),
                health_data.get('exercise_duration'),
                health_data.get('sleep_duration'),
                health_data.get('deep_sleep_duration'),
                health_data.get('light_sleep_duration'),
                health_data.get('sleep_quality_score'),
                health_data.get('fall_detected', 0),
                health_data.get('abnormal_heart_rate', 0),
                health_data.get('emergency_triggered', 0),
                health_data.get('data_source', 'health_device'),
                json.dumps(health_data.get('raw_data', {}), ensure_ascii=False),
                health_data.get('data_quality', 'good')
            ))
            
            health_id = cursor.lastrowid
            cursor.close()
            conn.close()
            
            return {
                "success": True, 
                "message": "健康数据保存成功", 
                "health_id": health_id
            }
            
        except Exception as e:
            logger.error(f"保存健康数据错误: {e}")
            return {"success": False, "message": f"保存失败: {str(e)}"}

    # =========================== 系统配置管理 ===========================
    
    async def get_system_configuration(self) -> Dict[str, Any]:
        """获取系统配置"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("SELECT * FROM ec_system_config WHERE is_public = 1 ORDER BY category, config_key")
            configs = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            # 按分类组织配置
            config_by_category = {}
            for config in configs:
                category = config['category']
                if category not in config_by_category:
                    config_by_category[category] = {}
                
                # 解析配置值
                config_value = config['config_value']
                if config['config_type'] == 'json':
                    try:
                        config_value = json.loads(config_value)
                    except:
                        pass
                elif config['config_type'] == 'number':
                    try:
                        config_value = float(config_value)
                    except:
                        pass
                elif config['config_type'] == 'boolean':
                    config_value = config_value.lower() in ['true', '1', 'yes']
                
                config_by_category[category][config['config_key']] = {
                    'value': config_value,
                    'description': config['description'],
                    'type': config['config_type']
                }
            
            return {"success": True, "data": config_by_category}
            
        except Exception as e:
            logger.error(f"获取系统配置错误: {e}")
            return {"success": False, "message": f"获取失败: {str(e)}"}

    # =========================== 路由集成方法（为routes.py提供的简化接口）===========================
    
    async def register_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """用户注册（路由接口）"""
        return await self.register_eldercare_user(user_data)
    
    async def login_user(self, username: str, password: str) -> Dict[str, Any]:
        """用户登录（路由接口）"""
        return await self.eldercare_user_login(username, password)
    
    async def get_user_agents(self, user_id: int) -> Dict[str, Any]:
        """获取用户智能体列表（路由接口）"""
        return await self.get_user_agent_info(user_id)
    
    async def create_agent(self, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建智能体（路由接口）"""
        user_id = agent_data.get('user_id', 1)
        return await self.create_eldercare_ai_agent(user_id, agent_data)
    
    async def get_agent_details(self, agent_id: str) -> Dict[str, Any]:
        """获取智能体详情（路由接口）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("SELECT * FROM ai_agent WHERE id = %s", (agent_id,))
            agent = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if agent:
                return {"success": True, "data": agent}
            else:
                return {"success": False, "message": "智能体不存在"}
                
        except Exception as e:
            logger.error(f"获取智能体详情失败: {e}")
            return {"success": False, "message": str(e)}
    
    async def get_agent_templates(self) -> Dict[str, Any]:
        """获取智能体模板（从数据库获取真实模板）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT id, agent_name, system_prompt 
                FROM ai_agent_template 
                WHERE 1=1 
                ORDER BY sort ASC
            """)
            templates = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            # 处理模板数据
            formatted_templates = []
            for template in templates:
                formatted_templates.append({
                    "id": template["id"],
                    "agent_name": template["agent_name"],
                    "system_prompt": template["system_prompt"]
                })
            
            return {"success": True, "data": formatted_templates}
            
        except Exception as e:
            logger.error(f"获取智能体模板失败: {e}")
            return {"success": False, "message": str(e)}

    async def update_agent(self, agent_id: str, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新智能体"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            update_fields = []
            values = []
            
            if 'agent_name' in agent_data:
                update_fields.append("agent_name = %s")
                values.append(agent_data['agent_name'])
            
            if 'system_prompt' in agent_data:
                update_fields.append("system_prompt = %s")
                values.append(agent_data['system_prompt'])
            
            if 'template_id' in agent_data:
                update_fields.append("template_id = %s")
                values.append(agent_data['template_id'])
            
            values.append(agent_id)
            
            cursor.execute(f"""
                UPDATE ai_agent 
                SET {', '.join(update_fields)}, updated_at = NOW()
                WHERE id = %s
            """, values)
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return {"success": True, "message": "智能体更新成功"}
            
        except Exception as e:
            logger.error(f"更新智能体失败: {e}")
            return {"success": False, "message": str(e)}

    async def delete_agent(self, agent_id: str) -> Dict[str, Any]:
        """删除智能体"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM ai_agent WHERE id = %s", (agent_id,))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return {"success": True, "message": "智能体删除成功"}
            
        except Exception as e:
            logger.error(f"删除智能体失败: {e}")
            return {"success": False, "message": str(e)}

    async def get_agent_templates_old(self) -> Dict[str, Any]:
        """获取智能体模板（路由接口）"""
        try:
            # 返回预设模板
            templates = [
                {
                    "id": "eldercare_companion",
                    "template_name": "智慧陪伴助手",
                    "description": "专为老年人设计的温馨陪伴AI助手",
                    "system_prompt": self._get_default_eldercare_prompt({"elder_name": "老人家"})
                },
                {
                    "id": "health_monitor",
                    "template_name": "健康监护助手", 
                    "description": "专注健康数据监测和提醒的AI助手",
                    "system_prompt": "你是专业的健康监护助手，专注于老人的健康数据监测和及时提醒。"
                }
            ]
            return {"success": True, "data": templates}
            
        except Exception as e:
            logger.error(f"获取智能体模板失败: {e}")
            return {"success": False, "message": str(e)}
    
    async def get_agent_devices(self, agent_id: str) -> Dict[str, Any]:
        """获取智能体设备列表（路由接口）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute("""
                SELECT d.*, u.real_name as user_name 
                FROM ec_health_devices d
                JOIN ec_users u ON d.user_id = u.id 
                WHERE d.ai_agent_id = %s AND d.is_active = 1
            """, (agent_id,))
            devices = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            return {"success": True, "data": devices}
            
        except Exception as e:
            logger.error(f"获取智能体设备失败: {e}")
            return {"success": False, "message": str(e)}
    
    async def bind_device(self, agent_id: str, device_code: str, user_id: int) -> Dict[str, Any]:
        """绑定设备到智能体（路由接口）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 更新设备绑定
            cursor.execute("""
                UPDATE ec_health_devices 
                SET ai_agent_id = %s, updated_at = NOW()
                WHERE device_name LIKE %s AND user_id = %s
            """, (agent_id, f"%{device_code}%", user_id))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            if cursor.rowcount > 0:
                return {"success": True, "message": "设备绑定成功"}
            else:
                return {"success": False, "message": "设备绑定失败，未找到匹配的设备"}
                
        except Exception as e:
            logger.error(f"绑定设备失败: {e}")
            return {"success": False, "message": str(e)}
    
    async def get_chat_sessions(self, agent_id: str, page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """获取聊天会话列表（路由接口）"""
        try:
            # 模拟聊天会话数据
            sessions = [
                {
                    "id": f"session_{i}",
                    "session_id": f"sess_{agent_id}_{i}",
                    "agent_id": agent_id,
                    "created_at": "2025-09-18T10:00:00Z",
                    "message_count": 10 + i,
                    "last_message": f"会话 {i} 的最后一条消息",
                    "status": "active"
                }
                for i in range(1, limit + 1)
            ]
            
            return {"success": True, "data": sessions}
            
        except Exception as e:
            logger.error(f"获取聊天会话失败: {e}")
            return {"success": False, "message": str(e)}
    
    async def get_chat_history(self, agent_id: str, session_id: str) -> Dict[str, Any]:
        """获取聊天记录（路由接口）"""
        try:
            # 模拟聊天记录数据
            messages = [
                {
                    "id": f"msg_{i}",
                    "session_id": session_id,
                    "sender": "user" if i % 2 == 0 else "assistant",
                    "message": f"这是第 {i} 条消息",
                    "timestamp": "2025-09-18T10:00:00Z"
                }
                for i in range(1, 11)
            ]
            
            return {"success": True, "data": messages}
            
        except Exception as e:
            logger.error(f"获取聊天记录失败: {e}")
            return {"success": False, "message": str(e)}
    
    async def get_monitor_data(self, device_id: str, days: int = 7) -> Dict[str, Any]:
        """获取监控数据（整合接口）"""
        try:
            # 获取健康数据
            health_result = await self.get_health_data(1, days)  # 使用默认用户ID
            health_data = health_result.get("data", []) if health_result.get("success") else []
            
            # 获取提醒数据
            reminders_result = await self.get_user_reminders_with_voice(1)
            reminders = reminders_result.get("data", []) if reminders_result.get("success") else []
            
            # 生成模拟紧急呼救数据
            emergency_calls = [
                {
                    "id": 1,
                    "timestamp": "2025-09-17T15:30:00Z",
                    "notes": "心率异常检测",
                    "status": "resolved"
                }
            ]
            
            return {
                "success": True,
                "health_data": health_data,
                "reminders": reminders,
                "emergency_calls": emergency_calls
            }
            
        except Exception as e:
            logger.error(f"获取监控数据失败: {e}")
            return {"success": False, "message": str(e)}
    
    async def create_voice_clone_from_frontend(self, voice_data: Dict[str, Any]) -> Dict[str, Any]:
        """从前端创建声音克隆"""
        return await self.create_voice_clone(voice_data)
    
    async def create_health_reminder_from_frontend(self, reminder_data: Dict[str, Any]) -> Dict[str, Any]:
        """从前端创建健康提醒"""
        return await self.create_reminder_with_voice(reminder_data)
    
    async def register_device(self, device_data: Dict[str, Any]) -> Dict[str, Any]:
        """注册设备"""
        return await self.register_health_device(device_data)
    
    # ===== 路由集成方法 - 用于注册到xiaozhi-server路由系统 =====
    
    def register_user(self, username: str, password: str, real_name: str, phone: str, email: str, elder_info: dict = None) -> Dict[str, Any]:
        """路由集成方法：用户注册"""
        return self.create_user(username, password, real_name, phone, email, elder_info)
    
    def login_user(self, username: str, password: str) -> Dict[str, Any]:
        """路由集成方法：用户登录"""
        return self.authenticate_user(username, password)
    
    def get_user_agents(self, user_id: int) -> Dict[str, Any]:
        """路由集成方法：获取用户的所有智能体"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 从ec_users表中获取用户拥有的智能体ID列表
            cursor.execute("SELECT owned_ai_agents FROM ec_users WHERE id = %s", (user_id,))
            user_data = cursor.fetchone()
            
            if not user_data:
                return {"success": False, "message": "用户不存在"}
            
            # 解析智能体ID列表
            try:
                agent_ids = json.loads(user_data['owned_ai_agents'] or '[]')
            except:
                agent_ids = []
            
            if not agent_ids:
                return {"success": True, "data": []}
            
            # 获取智能体详情
            placeholders = ','.join(['%s'] * len(agent_ids))
            sql = f"""
            SELECT id, agent_code, agent_name, system_prompt,
                   tts_model_id, tts_voice_id, llm_model_id,
                   created_at, updated_at
            FROM ai_agent 
            WHERE id IN ({placeholders})
            ORDER BY created_at DESC
            """
            
            cursor.execute(sql, agent_ids)
            agents = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            # 转换datetime对象
            agents = self._convert_datetime_to_string(agents)
            
            return {"success": True, "data": agents}
            
        except Exception as e:
            logger.error(f"获取用户智能体失败: {e}")
            return {"success": False, "message": f"获取失败: {str(e)}"}
    
    def get_user_agent_info_sync(self, user_id: int) -> Dict[str, Any]:
        """获取用户的AI智能体信息（同步版本）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            sql = """
            SELECT u.default_ai_agent_id, NULL as current_ai_device_id,
                   a.agent_name, a.tts_model_id, a.tts_voice_id,
                   tm.model_name as tts_model_name, tv.name as tts_voice_name
            FROM ec_users u
            LEFT JOIN ai_agent a ON u.default_ai_agent_id = a.id
            LEFT JOIN ai_model_config tm ON a.tts_model_id = tm.id
            LEFT JOIN ai_tts_voice tv ON a.tts_voice_id = tv.id
            WHERE u.id = %s
            """
            
            cursor.execute(sql, (user_id,))
            agent_info = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if agent_info:
                return {"success": True, "data": agent_info}
            else:
                return {"success": False, "message": "用户不存在或未配置AI智能体"}
        except Exception as e:
            return {"success": False, "message": f"获取失败: {str(e)}"}
    
    def get_system_configuration(self) -> Dict[str, Any]:
        """路由集成方法：获取系统配置"""
        return {"success": True, "data": {}}
    
    def get_health_data(self, user_id: int, start_date: str = None, end_date: str = None, data_type: str = None) -> Dict[str, Any]:
        """路由集成方法：获取健康数据"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            sql = """
            SELECT hd.*, hdev.device_name, hdev.device_type, hdev.device_brand, hdev.device_model
            FROM ec_health_data hd
            LEFT JOIN ec_health_devices hdev ON hd.health_device_id = hdev.id
            WHERE hd.user_id = %s
            """
            params = [user_id]
            
            if start_date:
                sql += " AND hd.timestamp >= %s"
                params.append(start_date)
            if end_date:
                sql += " AND hd.timestamp <= %s"
                params.append(end_date)
            if data_type:
                sql += " AND hd.data_type = %s"
                params.append(data_type)
            
            sql += " ORDER BY hd.timestamp DESC LIMIT 100"
            
            cursor.execute(sql, params)
            health_data = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            return {"success": True, "data": health_data}
        except Exception as e:
            return {"success": False, "message": f"获取健康数据失败: {str(e)}"}
    
    def get_user_ai_devices(self, user_id: int) -> Dict[str, Any]:
        """获取用户的AI智能陪伴设备"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            sql = """
            SELECT ad.*, aa.agent_name
            FROM ai_device ad
            LEFT JOIN ai_agent aa ON ad.agent_id = aa.id
            WHERE ad.user_id = %s
            ORDER BY ad.create_date DESC
            """
            
            cursor.execute(sql, [user_id])
            devices = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            # 转换datetime对象
            devices = self._convert_datetime_to_string(devices)
            
            return {"success": True, "data": devices}
        except Exception as e:
            return {"success": False, "message": f"获取AI设备失败: {str(e)}"}
    
    def get_user_health_devices(self, user_id: int) -> Dict[str, Any]:
        """获取用户的健康监测设备"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            sql = """
            SELECT * FROM ec_health_devices
            WHERE user_id = %s
            ORDER BY create_date DESC
            """
            
            cursor.execute(sql, [user_id])
            devices = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            # 转换datetime对象
            devices = self._convert_datetime_to_string(devices)
            
            return {"success": True, "data": devices}
        except Exception as e:
            return {"success": False, "message": f"获取健康设备失败: {str(e)}"}

    def _convert_datetime_to_string(self, data):
        """递归转换数据中的datetime对象和Decimal对象为字符串"""
        import decimal
        if isinstance(data, list):
            return [self._convert_datetime_to_string(item) for item in data]
        elif isinstance(data, dict):
            return {key: self._convert_datetime_to_string(value) for key, value in data.items()}
        elif hasattr(data, 'strftime'):  # datetime对象
            return data.strftime("%Y-%m-%d %H:%M:%S")
        elif isinstance(data, decimal.Decimal):  # Decimal对象
            return float(data)
        else:
            return data
    
    def get_monitor_data_sync(self, user_id: int) -> Dict[str, Any]:
        """路由集成方法：获取监控数据（整合版）- 同步版本"""
        try:
            # 获取最新健康数据
            health_result = self.get_health_data(user_id)
            health_data = health_result.get("data", []) if health_result.get("success") else []
            
            # 获取用户信息和智能体信息（使用同步版本）
            user_result = self.get_user_agent_info_sync(user_id)
            user_info = user_result.get("data", {}) if user_result.get("success") else {}
            
            # 获取提醒数据（如果方法存在的话）
            reminders = []
            try:
                reminders_result = self.get_reminders(user_id)
                reminders = reminders_result.get("data", []) if reminders_result.get("success") else []
            except:
                # 如果get_reminders方法不存在，使用空列表
                pass
            
            # 获取紧急呼救记录 (目前使用模拟数据)
            emergency_calls = [
                {
                    "id": 1,
                    "timestamp": "2025-09-21 14:30:00",
                    "notes": "检测到心率异常",
                    "status": "resolved"
                },
                {
                    "id": 2, 
                    "timestamp": "2025-09-20 10:15:00",
                    "notes": "紧急按钮被按下",
                    "status": "resolved"
                }
            ]
            
            # 确定设备状态和最后活动时间
            device_status = "online" if health_data else "offline"
            last_activity = health_data[0]["timestamp"] if health_data else "未知"
            
            # 整合监控数据
            monitor_data = {
                "success": True,
                "health_data": health_data,
                "reminders": reminders,
                "emergency_calls": emergency_calls,
                "user_info": user_info,
                "device_status": device_status,
                "last_activity": last_activity
            }
            
            # 转换所有datetime对象为字符串，确保JSON序列化
            monitor_data = self._convert_datetime_to_string(monitor_data)
            
            return monitor_data
            
        except Exception as e:
            return {"success": False, "message": f"获取监控数据失败: {str(e)}"}


# =========================== 全局API实例管理 ===========================

# 全局ElderCare API实例
_eldercare_api_instance = None

def init_eldercare_api(db_config: Dict[str, Any]) -> ElderCareAPI:
    """初始化统一版ElderCare API实例"""
    global _eldercare_api_instance
    try:
        _eldercare_api_instance = ElderCareAPI(db_config)
        logger.info("统一版ElderCare API初始化成功")
        return _eldercare_api_instance
    except Exception as e:
        logger.error(f"统一版ElderCare API初始化失败: {e}")
        raise e

def get_eldercare_api() -> Optional[ElderCareAPI]:
    """获取统一版ElderCare API实例"""
    global _eldercare_api_instance
    return _eldercare_api_instance