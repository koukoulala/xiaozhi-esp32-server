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
                pool_size=25,  # 增加连接池大小
                pool_reset_session=True,
                host=self.db_config['host'],
                port=self.db_config['port'],
                user=self.db_config['user'],
                password=self.db_config['password'],
                database=self.db_config['database'],
                charset='utf8mb4',
                collation='utf8mb4_unicode_ci',
                autocommit=True,
                # 添加连接超时设置
                connection_timeout=10,  # 连接超时10秒
                get_warnings=True,
                raise_on_warnings=True
            )
            logger.info(f"ElderCare数据库连接池初始化成功 (连接池大小: 25)")
        except Exception as e:
            logger.error(f"ElderCare数据库连接池初始化失败: {e}")
            raise e
    
    def get_connection(self):
        """从连接池获取数据库连接"""
        return self.connection_pool.get_connection()
    
    def execute_with_connection(self, operation_func, *args, **kwargs):
        """执行数据库操作的统一方法，确保连接正确释放"""
        conn = None
        cursor = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            return operation_func(cursor, *args, **kwargs)
        except Exception as e:
            logger.error(f"数据库操作错误: {e}")
            raise e
        finally:
            try:
                if cursor:
                    cursor.close()
                if conn:
                    conn.close()
            except Exception as cleanup_error:
                logger.error(f"数据库连接清理错误: {cleanup_error}")

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
    
    async def _create_agent_from_template(self, user_id: int, elder_info: Dict[str, Any]) -> Dict[str, Any]:
        """使用ai_agent_template中的ElderCare模板创建智能体"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 获取ElderCare模板
            cursor.execute(
                "SELECT * FROM ai_agent_template WHERE agent_code = %s LIMIT 1",
                ('ElderCare',)
            )
            template = cursor.fetchone()
            
            if not template:
                cursor.close()
                conn.close()
                logger.error("ElderCare模板不存在")
                return {"success": False, "message": "ElderCare模板不存在"}
            
            # 获取用户信息用于生成智能体代码和名称
            cursor.execute("SELECT owned_ai_agents FROM ec_users WHERE id = %s", (user_id,))
            user_info = cursor.fetchone()
            
            # 解析已有智能体列表
            try:
                owned_agents = json.loads(user_info.get('owned_ai_agents', '[]'))
            except:
                owned_agents = []
            
            # 生成AI Agent ID
            agent_id = f"EC_{str(uuid.uuid4()).replace('-', '')[:24]}"
            
            # 超级管理员用户ID（用于creator和updater）
            super_admin_id = 1959601708862038018
            
            # 生成个性化的智能体名称和代码
            elder_name = elder_info.get('name', '老人')
            agent_name = f"{elder_name}的智能助手"
            agent_code = f"eldercare_{user_id}_{len(owned_agents)+1}"
            
            # 使用模板信息创建智能体，同时个性化系统提示词
            system_prompt = self._get_default_eldercare_prompt({'elder_name': elder_name})
            
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
                super_admin_id,  # 使用超级管理员ID作为技术所有者
                agent_code,
                agent_name,
                
                # 使用模板中的模型配置
                template.get('asr_model_id'),
                template.get('vad_model_id'), 
                template.get('llm_model_id'),
                template.get('vllm_model_id'),
                template.get('tts_model_id'),
                template.get('tts_voice_id'),
                template.get('mem_model_id'),
                template.get('intent_model_id'),
                
                system_prompt,
                template.get('summary_memory', ''),
                template.get('chat_history_conf', 1),
                template.get('lang_code', 'zh-CN'),
                template.get('language', 'zh-CN'),
                len(owned_agents),
                super_admin_id,
                super_admin_id
            ))
            
            # 更新用户的智能体列表
            owned_agents.append(agent_id)
            cursor.execute(
                "UPDATE ec_users SET owned_ai_agents = %s, default_ai_agent_id = %s, update_date = NOW() WHERE id = %s", 
                (json.dumps(owned_agents), agent_id, user_id)
            )
            
            cursor.close()
            conn.close()
            
            logger.info(f"为用户{user_id}从ElderCare模板创建AI智能体成功: {agent_id}")
            return {
                "success": True, 
                "message": "AI智能体创建成功", 
                "agent_id": agent_id,
                "agent_name": agent_name,
                "template_id": template['id']
            }
            
        except Exception as e:
            logger.error(f"从ElderCare模板创建AI智能体错误: {e}")
            return {"success": False, "message": f"创建失败: {str(e)}"}
    
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
            
            # 处理前端发送的嵌套数据结构
            elder_info = user_data.get('elderInfo', {})
            family_info = user_data.get('familyInfo', {})
            health_profile = user_data.get('healthProfile', {})
            life_habits = user_data.get('lifeHabits', {})
            device_info = user_data.get('deviceInfo', {})
            
            # 构建elder_profile JSON
            elder_profile = {
                'name': elder_info.get('name', ''),
                'age': elder_info.get('age'),
                'gender': elder_info.get('gender', ''),
                'idCard': elder_info.get('idCard', ''),
                'phone': elder_info.get('phone', ''),
                'healthProfile': health_profile,
                'lifeHabits': life_habits,
                'deviceInfo': device_info
            }
            
            # 构建family_contacts JSON
            family_contacts = {
                'primary': {
                    'name': family_info.get('name', ''),
                    'phone': family_info.get('phone', ''),
                    'relationship': family_info.get('relationship', ''),
                    'address': family_info.get('address', '')
                }
            }
            
            sql = """
            INSERT INTO ec_users (
                username, password, real_name, phone, email,
                elder_name, elder_relation, elder_profile, family_contacts,
                status, create_date, update_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 1, NOW(), NOW())
            """
            
            cursor.execute(sql, (
                user_data['username'],
                password_hash,
                family_info.get('name', ''),
                family_info.get('phone', ''),
                user_data.get('email', ''),
                elder_info.get('name', ''),
                family_info.get('relationship', 'family'),
                json.dumps(elder_profile, ensure_ascii=False),
                json.dumps(family_contacts, ensure_ascii=False)
            ))
            
            user_id = cursor.lastrowid
            cursor.close()
            conn.close()
            
            # 自动创建默认AI智能体，使用ai_agent_template中的ElderCare模板
            if user_data.get('create_default_agent', True):
                agent_result = await self._create_agent_from_template(user_id, elder_info)
                
                if not agent_result['success']:
                    logger.warning(f"用户{user_id}注册成功但默认智能体创建失败: {agent_result['message']}")
            
            logger.info(f"ElderCare用户注册成功: {user_data['username']} (ID: {user_id})")
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
    
    def get_user_info(self, user_id: int) -> Dict[str, Any]:
        """获取用户详细信息"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            sql = """
            SELECT id, username, real_name, phone, email, 
                   elder_name, elder_relation, elder_profile,
                   family_contacts, default_ai_agent_id, permission_level,
                   create_date, update_date
            FROM ec_users 
            WHERE id = %s AND status = 1
            """
            cursor.execute(sql, (user_id,))
            user = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if not user:
                return {"success": False, "message": "用户不存在"}
            
            # 格式化日期字段
            if user.get('create_date'):
                user['create_date'] = user['create_date'].isoformat()
            if user.get('update_date'):
                user['update_date'] = user['update_date'].isoformat()
            
            return {"success": True, "data": user}
            
        except Exception as e:
            logger.error(f"获取用户信息错误: {e}")
            return {"success": False, "message": f"获取失败: {str(e)}"}
    
    def update_user_info(self, user_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """更新用户信息"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 构建更新字段
            update_fields = []
            update_values = []
            
            # 可更新的字段映射
            allowed_fields = {
                'real_name': 'real_name',
                'phone': 'phone', 
                'email': 'email',
                'elder_name': 'elder_name',
                'elder_relation': 'elder_relation',
                'elder_profile': 'elder_profile',
                'family_contacts': 'family_contacts'
            }
            
            for field_key, db_field in allowed_fields.items():
                if field_key in data:
                    update_fields.append(f"{db_field} = %s")
                    update_values.append(data[field_key])
            
            if not update_fields:
                return {"success": False, "message": "没有可更新的字段"}
            
            # 添加更新时间
            update_fields.append("update_date = NOW()")
            
            # 执行更新
            sql = f"UPDATE ec_users SET {', '.join(update_fields)} WHERE id = %s"
            update_values.append(user_id)
            
            cursor.execute(sql, tuple(update_values))
            conn.commit()
            
            cursor.close()
            conn.close()
            
            return {"success": True, "message": "用户信息更新成功"}
            
        except Exception as e:
            logger.error(f"更新用户信息错误: {e}")
            return {"success": False, "message": f"更新失败: {str(e)}"}
    
    def change_password(self, user_id: int, current_password: str, new_password: str) -> Dict[str, Any]:
        """修改用户密码"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 获取当前密码
            cursor.execute("SELECT password FROM ec_users WHERE id = %s AND status = 1", (user_id,))
            user = cursor.fetchone()
            
            if not user:
                cursor.close()
                conn.close()
                return {"success": False, "message": "用户不存在"}
            
            # 验证当前密码
            if not bcrypt.checkpw(current_password.encode('utf-8'), user['password'].encode('utf-8')):
                cursor.close()
                conn.close()
                return {"success": False, "message": "当前密码错误"}
            
            # 加密新密码
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
            
            # 更新密码
            cursor.execute(
                "UPDATE ec_users SET password = %s, update_date = NOW() WHERE id = %s",
                (hashed_password.decode('utf-8'), user_id)
            )
            conn.commit()
            
            cursor.close()
            conn.close()
            
            return {"success": True, "message": "密码修改成功"}
            
        except Exception as e:
            logger.error(f"修改密码错误: {e}")
            return {"success": False, "message": f"修改失败: {str(e)}"}
    
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
                "UPDATE ec_users SET default_ai_agent_id = %s WHERE id = %s", 
                (agent_id, user_id)
            )
            
            conn.commit()
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

    # 同步方法别名，兼容路由调用
    def get_voice_clones(self, user_id: int, agent_id: str = None) -> Dict[str, Any]:
        """获取用户声音克隆列表（根据用户ID和智能体ID）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 如果没有指定agent_id，获取用户的默认智能体
            if not agent_id:
                cursor.execute("SELECT default_ai_agent_id FROM ec_users WHERE id = %s", (user_id,))
                user_result = cursor.fetchone()
                
                if not user_result or not user_result['default_ai_agent_id']:
                    # 如果没有默认智能体，返回该用户所有的声音克隆
                    sql = """
                    SELECT v.id, v.name, v.reference_audio, v.reference_text, 
                           v.creator, v.updater, v.tts_model_id, v.create_date, v.update_date, v.remark
                    FROM ai_tts_voice v
                    WHERE v.creator = %s
                    ORDER BY v.create_date DESC
                    """
                    cursor.execute(sql, (user_id,))
                    voice_clones = cursor.fetchall()
                else:
                    agent_id = user_result['default_ai_agent_id']
            
            # 如果有agent_id，根据智能体获取tts_model_id
            if agent_id:
                cursor.execute("SELECT tts_model_id FROM ai_agent WHERE id = %s", (agent_id,))
                agent_result = cursor.fetchone()
                
                if not agent_result:
                    return {"success": False, "message": "智能体不存在"}
                
                tts_model_id = agent_result['tts_model_id'] or 'TTS_CosyVoiceClone302AI'
                
                # 根据tts_model_id和creator获取音色列表
                sql = """
                SELECT v.id, v.name, v.reference_audio, v.reference_text, 
                       v.creator, v.updater, v.tts_model_id, v.create_date, v.update_date, v.remark
                FROM ai_tts_voice v
                WHERE v.tts_model_id = %s AND v.creator = %s
                ORDER BY v.create_date DESC
                """
                
                cursor.execute(sql, (tts_model_id, user_id))
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
                            clone['audio_file_size'] = os.path.getsize(audio_full_path)
                        except:
                            clone['audio_file_size'] = 0
                else:
                    clone['audio_file_exists'] = False
                    clone['audio_file_size'] = 0
            
            return {"success": True, "data": voice_clones}
            
        except Exception as e:
            logger.error(f"获取声音克隆列表错误: {e}")
            return {"success": False, "message": f"获取失败: {str(e)}"}

    def upload_voice_recording_sync(self, recording_data: Dict[str, Any]) -> Dict[str, Any]:
        """处理网页录音上传（Base64格式）- 同步版本"""
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
            result = self.create_voice_clone_sync(voice_clone_data)
            
            if result['success']:
                result['audio_file_path'] = f'/data/audio_uploads/reference/{filename}'
                result['audio_size'] = len(audio_bytes)
                result['duration_estimate'] = len(audio_bytes) / 16000  # 粗略估算（假设16kHz采样率）
            
            return result
            
        except Exception as e:
            logger.error(f"上传录音错误: {e}")
            return {"success": False, "message": f"上传失败: {str(e)}"}

    def create_voice_clone_sync(self, voice_data: Dict[str, Any]) -> Dict[str, Any]:
        """为用户创建新的声音克隆（同步版本）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 生成新的音色ID
            voice_id = f"TTS_ElderCare_{str(uuid.uuid4()).replace('-', '')[:16]}"
            
            # 获取用户的当前TTS模型ID - 使用同步版本
            user_agent_info = self.get_user_agent_info_sync(voice_data['user_id'])
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
            logger.error(f"获取用户智能体信息错误: {e}")
            return {"success": False, "message": f"获取失败: {str(e)}"}

    def create_voice_clone_from_frontend(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """从前端格式创建声音克隆（同步版本）"""
        try:
            # 检查是否是录音上传格式
            if 'audio_data' in data:
                return self.upload_voice_recording_sync(data)
            elif 'audio_file_path' in data:
                # 处理文件上传格式
                return self.create_voice_clone_from_file(data)
            else:
                return self.create_voice_clone_sync(data)
        except Exception as e:
            logger.error(f"创建声音克隆错误: {e}")
            return {"success": False, "message": f"创建失败: {str(e)}"}

    def create_voice_clone_from_file(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """从文件路径创建声音克隆 - 保存到ai_tts_voice表，并上传到TTS服务"""
        try:
            import uuid
            from datetime import datetime
            import shutil
            from core.utils.tts import create_instance as create_tts_instance
            
            # 获取参数
            user_id = int(data.get('userId', 1))
            voice_name = data.get('name', '未命名音色')
            reference_text = data.get('referenceText', '')
            audio_file_path = data.get('audio_file_path')
            family_member_name = data.get('family_member_name', voice_name)
            relationship = data.get('relationship', 'family')
            agent_id = data.get('agent_id')  # 获取指定的智能体ID
            
            if not audio_file_path or not os.path.exists(audio_file_path):
                return {"success": False, "message": "音频文件不存在"}
            
            # 获取数据库连接
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 获取tts_model_id和模型配置
            tts_model_id = 'TTS_CosyVoiceSiliconflow'  # 默认值
            tts_config = None
            
            if agent_id:
                # 如果指定了智能体ID，获取其tts_model_id
                cursor.execute("SELECT tts_model_id FROM ai_agent WHERE id = %s", (agent_id,))
                agent_result = cursor.fetchone()
                if agent_result and agent_result['tts_model_id']:
                    tts_model_id = agent_result['tts_model_id']
            else:
                # 如果没有指定智能体，获取用户的默认智能体
                cursor.execute("SELECT default_ai_agent_id FROM ec_users WHERE id = %s", (user_id,))
                user_result = cursor.fetchone()
                
                if user_result and user_result['default_ai_agent_id']:
                    cursor.execute("SELECT tts_model_id FROM ai_agent WHERE id = %s", 
                                 (user_result['default_ai_agent_id'],))
                    agent_result = cursor.fetchone()
                    if agent_result and agent_result['tts_model_id']:
                        tts_model_id = agent_result['tts_model_id']
            
            # 获取TTS模型配置
            cursor.execute("SELECT config_json FROM ai_model_config WHERE id = %s", (tts_model_id,))
            model_config_result = cursor.fetchone()
            if model_config_result and model_config_result['config_json']:
                tts_config = model_config_result['config_json']
                if isinstance(tts_config, str):
                    tts_config = json.loads(tts_config)
            
            # 生成唯一的文件名
            file_extension = os.path.splitext(audio_file_path)[1] or '.webm'
            unique_filename = f"user_{user_id}_{uuid.uuid4().hex[:12]}{file_extension}"
            
            # 设置目标文件路径
            voice_dir = os.path.join(current_dir, '..', 'data', 'voices')
            os.makedirs(voice_dir, exist_ok=True)
            target_path = os.path.join(voice_dir, unique_filename)
            
            # 复制音频文件到目标位置（不是移动，以便后续上传）
            shutil.copy(audio_file_path, target_path)
            
            # 生成voice_id（确保长度不超过数据库限制）
            voice_id = f"TTS_User{user_id}_{uuid.uuid4().hex[:8]}"
            
            # 尝试上传音色到TTS服务
            uploaded_voice_uri = None
            if tts_config:
                tts_type = tts_config.get('type', '')
                # 检查是否支持音色上传（目前支持siliconflow）
                if tts_type in ['siliconflow', 'cosyvoice_siliconflow']:
                    try:
                        logger.info(f"正在上传音色到硅基流动TTS服务: {voice_name}")
                        tts_provider = create_tts_instance(tts_type, tts_config, delete_audio_file=True)
                        upload_result = tts_provider.upload_voice(target_path, voice_name, reference_text)
                        
                        if upload_result.get('success'):
                            uploaded_voice_uri = upload_result.get('voice_id')
                            logger.info(f"音色上传成功，获得URI: {uploaded_voice_uri}")
                        else:
                            logger.warning(f"音色上传失败: {upload_result.get('message')}")
                    except Exception as upload_error:
                        logger.error(f"音色上传异常: {upload_error}")
            
            # 生成remark字段（包含家庭成员信息）
            remark_data = {
                'family_member_name': family_member_name,
                'relationship': relationship,
                'voice_description': f'{family_member_name}的声音'
            }
            remark = json.dumps(remark_data, ensure_ascii=False)
            
            # 插入到ai_tts_voice表
            # 如果上传成功，将URI存储到tts_voice字段
            insert_sql = """
            INSERT INTO ai_tts_voice 
            (id, name, tts_voice, reference_audio, reference_text, creator, updater, tts_model_id, 
             create_date, update_date, remark)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            now = datetime.now()
            # 使用相对路径存储（相对于项目根目录）
            relative_audio_path = f"data/voices/{unique_filename}"
            
            # tts_voice字段：如果上传成功则使用URI，否则使用voice_id
            tts_voice_value = uploaded_voice_uri if uploaded_voice_uri else voice_id.lower()
            
            cursor.execute(insert_sql, (
                voice_id, voice_name, tts_voice_value, relative_audio_path, reference_text, 
                user_id, user_id, tts_model_id, now, now, remark
            ))
            
            conn.commit()
            
            # 删除临时上传的文件
            if os.path.exists(audio_file_path) and audio_file_path != target_path:
                try:
                    os.remove(audio_file_path)
                except:
                    pass
            
            cursor.close()
            conn.close()
            
            return {
                "success": True, 
                "message": "音色上传成功" + ("，已同步到TTS服务" if uploaded_voice_uri else ""),
                "data": {
                    "voice_id": voice_id,
                    "name": voice_name,
                    "tts_voice": tts_voice_value,
                    "reference_audio": relative_audio_path,
                    "reference_text": reference_text,
                    "family_member_name": family_member_name,
                    "relationship": relationship,
                    "tts_model_id": tts_model_id,
                    "uploaded_to_tts": bool(uploaded_voice_uri)
                }
            }
            
        except Exception as e:
            logger.error(f"创建音色失败: {e}")
            import traceback
            logger.error(f"错误堆栈: {traceback.format_exc()}")
            return {"success": False, "message": f"创建失败: {str(e)}"}

    def save_voice_clone(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """保存声音克隆（同步版本）"""
        try:
            # 检查是否是录音上传格式
            if 'audio_data' in data:
                return self.upload_voice_recording_sync(data)
            else:
                return self.create_voice_clone_sync(data)
        except Exception as e:
            logger.error(f"保存声音克隆错误: {e}")
            return {"success": False, "message": f"保存失败: {str(e)}"}

    def get_default_voice(self, user_id: int) -> Dict[str, Any]:
        """获取用户默认声音（同步版本）"""
        try:
            result = self.get_user_agent_info_sync(user_id)
            
            if result.get('success'):
                agent_data = result.get('data', {})
                return {
                    "success": True,
                    "data": {
                        "tts_voice_id": agent_data.get('tts_voice_id'),
                        "tts_voice_name": agent_data.get('tts_voice_name'),
                        "tts_model_name": agent_data.get('tts_model_name')
                    }
                }
            else:
                return result
        except Exception as e:
            logger.error(f"获取默认声音错误: {e}")
            return {"success": False, "message": f"获取失败: {str(e)}"}

    def set_default_voice(self, user_id: int, voice_id: str, agent_id: str = None) -> Dict[str, Any]:
        """设置默认音色（支持指定智能体）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 如果没有指定智能体ID，则使用用户的默认智能体
            if not agent_id:
                cursor.execute("SELECT default_ai_agent_id FROM ec_users WHERE id = %s", (user_id,))
                user_result = cursor.fetchone()
                
                if not user_result or not user_result['default_ai_agent_id']:
                    return {"success": False, "message": "用户没有默认智能体"}
                
                agent_id = user_result['default_ai_agent_id']
            
            # 验证智能体是否属于该用户（通过ec_users表的owned_ai_agents字段）
            cursor.execute("SELECT owned_ai_agents FROM ec_users WHERE id = %s", (user_id,))
            user_result = cursor.fetchone()
            
            if not user_result:
                cursor.close()
                conn.close()
                return {"success": False, "message": "用户不存在"}
            
            # 解析用户拥有的智能体列表
            owned_agents = json.loads(user_result.get('owned_ai_agents', '[]'))
            if agent_id not in owned_agents:
                cursor.close()
                conn.close()
                return {"success": False, "message": "智能体不存在或无权限"}
            
            # 验证智能体在ai_agent表中存在
            cursor.execute("SELECT * FROM ai_agent WHERE id = %s", (agent_id,))
            agent_result = cursor.fetchone()
            
            if not agent_result:
                cursor.close()
                conn.close()
                return {"success": False, "message": "智能体不存在"}
            
            # 验证音色是否存在且属于用户
            cursor.execute("SELECT * FROM ai_tts_voice WHERE id = %s AND creator = %s", (voice_id, user_id))
            voice_result = cursor.fetchone()
            
            if not voice_result:
                return {"success": False, "message": "音色不存在或无权限"}
            
            # 更新指定智能体的默认音色
            cursor.execute("UPDATE ai_agent SET tts_voice_id = %s, updated_at = NOW() WHERE id = %s", (voice_id, agent_id))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return {"success": True, "message": "默认音色设置成功", "agent_id": agent_id}
            
        except Exception as e:
            logger.error(f"设置默认音色失败: {e}")
            return {"success": False, "message": f"设置失败: {str(e)}"}

    def delete_voice(self, user_id: int, voice_id: str) -> Dict[str, Any]:
        """删除音色"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 验证音色是否存在且属于用户
            cursor.execute("SELECT * FROM ai_tts_voice WHERE id = %s AND creator = %s", (voice_id, user_id))
            voice_result = cursor.fetchone()
            
            if not voice_result:
                return {"success": False, "message": "音色不存在或无权限"}
            
            # 删除音频文件
            if voice_result.get('reference_audio') and os.path.exists(voice_result['reference_audio']):
                try:
                    os.remove(voice_result['reference_audio'])
                except:
                    pass  # 文件删除失败不影响数据库删除
            
            # 删除数据库记录
            cursor.execute("DELETE FROM ai_tts_voice WHERE id = %s", (voice_id,))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return {"success": True, "message": "音色删除成功"}
            
        except Exception as e:
            logger.error(f"删除音色失败: {e}")
            return {"success": False, "message": f"删除失败: {str(e)}"}

    def update_voice(self, user_id: int, voice_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """编辑音色（支持上传到TTS服务）"""
        try:
            import uuid
            import shutil
            from core.utils.tts import create_instance as create_tts_instance
            
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 验证音色是否存在且属于用户
            cursor.execute("SELECT * FROM ai_tts_voice WHERE id = %s AND creator = %s", (voice_id, user_id))
            voice_result = cursor.fetchone()
            
            if not voice_result:
                return {"success": False, "message": "音色不存在或无权限"}
            
            # 获取TTS模型配置
            tts_model_id = voice_result.get('tts_model_id')
            tts_config = None
            if tts_model_id:
                cursor.execute("SELECT config_json FROM ai_model_config WHERE id = %s", (tts_model_id,))
                model_config_result = cursor.fetchone()
                if model_config_result and model_config_result['config_json']:
                    tts_config = model_config_result['config_json']
                    if isinstance(tts_config, str):
                        tts_config = json.loads(tts_config)
            
            # 更新字段
            update_fields = []
            update_values = []
            uploaded_voice_uri = None
            
            voice_name = data.get('name', voice_result.get('name'))
            reference_text = data.get('referenceText', voice_result.get('reference_text', ''))
            
            if 'name' in data:
                update_fields.append('name = %s')
                update_values.append(data['name'])
            
            if 'referenceText' in data:
                update_fields.append('reference_text = %s')
                update_values.append(data['referenceText'])
            
            # 处理音频文件更新
            if 'audio_file_path' in data:
                audio_file_path = data['audio_file_path']
                if os.path.exists(audio_file_path):
                    # 生成新的文件名
                    file_extension = os.path.splitext(audio_file_path)[1] or '.webm'
                    unique_filename = f"user_{user_id}_{uuid.uuid4().hex[:12]}{file_extension}"
                    
                    # 设置目标路径
                    voice_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'voices')
                    os.makedirs(voice_dir, exist_ok=True)
                    target_path = os.path.join(voice_dir, unique_filename)
                    
                    # 删除旧文件
                    old_audio_path = voice_result.get('reference_audio')
                    if old_audio_path:
                        # 处理相对路径
                        if not os.path.isabs(old_audio_path):
                            old_audio_path = os.path.join(os.path.dirname(__file__), '..', old_audio_path)
                        if os.path.exists(old_audio_path):
                            try:
                                os.remove(old_audio_path)
                            except:
                                pass
                    
                    # 复制新文件（不是移动，以便后续上传）
                    shutil.copy(audio_file_path, target_path)
                    
                    # 尝试上传音色到TTS服务
                    if tts_config:
                        tts_type = tts_config.get('type', '')
                        # 检查是否支持音色上传（目前支持siliconflow）
                        if tts_type in ['siliconflow', 'cosyvoice_siliconflow']:
                            try:
                                logger.info(f"正在上传更新的音色到硅基流动TTS服务: {voice_name}")
                                tts_provider = create_tts_instance(tts_type, tts_config, delete_audio_file=True)
                                upload_result = tts_provider.upload_voice(target_path, voice_name, reference_text)
                                
                                if upload_result.get('success'):
                                    uploaded_voice_uri = upload_result.get('voice_id')
                                    logger.info(f"音色上传成功，获得URI: {uploaded_voice_uri}")
                                else:
                                    logger.warning(f"音色上传失败: {upload_result.get('message')}")
                            except Exception as upload_error:
                                logger.error(f"音色上传异常: {upload_error}")
                    
                    # 使用相对路径存储
                    relative_audio_path = f"data/voices/{unique_filename}"
                    update_fields.append('reference_audio = %s')
                    update_values.append(relative_audio_path)
                    
                    # 删除临时上传的文件
                    if os.path.exists(audio_file_path) and audio_file_path != target_path:
                        try:
                            os.remove(audio_file_path)
                        except:
                            pass
            
            # 如果上传了新的音色URI，更新tts_voice字段
            if uploaded_voice_uri:
                update_fields.append('tts_voice = %s')
                update_values.append(uploaded_voice_uri)
            
            if update_fields:
                from datetime import datetime
                update_fields.append('update_date = %s')
                update_values.append(datetime.now())
                update_values.append(voice_id)
                
                sql = f"UPDATE ai_tts_voice SET {', '.join(update_fields)} WHERE id = %s"
                cursor.execute(sql, update_values)
                
                conn.commit()
            
            cursor.close()
            conn.close()
            
            message = "音色更新成功"
            if uploaded_voice_uri:
                message += "，已同步到TTS服务"
            
            return {"success": True, "message": message, "uploaded_to_tts": bool(uploaded_voice_uri)}
            
        except Exception as e:
            logger.error(f"更新音色失败: {e}")
            import traceback
            logger.error(f"错误堆栈: {traceback.format_exc()}")
            return {"success": False, "message": f"更新失败: {str(e)}"}

    def test_voice_clone_with_agent(self, user_id: int, voice_id: str, test_text: str = None) -> Dict[str, Any]:
        """使用指定音色测试声音合成，返回音频数据"""
        try:
            import base64
            import uuid
            from core.utils.tts import create_instance as create_tts_instance
            
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 获取指定的音色信息
            cursor.execute("""
                SELECT v.*, m.config_json as tts_config 
                FROM ai_tts_voice v
                LEFT JOIN ai_model_config m ON v.tts_model_id = m.id
                WHERE v.id = %s
            """, (voice_id,))
            voice_result = cursor.fetchone()
            
            if not voice_result:
                return {"success": False, "message": "找不到指定的音色"}
            
            # 解析TTS配置
            tts_config = voice_result.get('tts_config')
            if isinstance(tts_config, str):
                tts_config = json.loads(tts_config)
            
            if not tts_config:
                return {"success": False, "message": "TTS配置不存在"}
            
            # 获取tts_voice（上传后的URI）
            tts_voice = voice_result.get('tts_voice', '')
            
            # 默认测试文本
            test_text = '您好，这是一段语音合成测试。'
            
            cursor.close()
            conn.close()
            
            # 创建TTS实例并生成音频
            tts_type = tts_config.get('type', '')
            logger.info(f"测试语音合成: type={tts_type}, voice={tts_voice}, text={test_text}")
            
            try:
                import requests
                
                # 直接使用 requests 同步调用 TTS API（避免 asyncio 嵌套问题）
                if tts_type in ['siliconflow', 'cosyvoice_siliconflow']:
                    api_url = "https://api.siliconflow.cn/v1/audio/speech"
                    access_token = tts_config.get('access_token', '')
                    model = tts_config.get('model', 'FunAudioLLM/CosyVoice2-0.5B')
                    response_format = tts_config.get('response_format', 'mp3')
                    
                    request_json = {
                        "model": model,
                        "input": test_text,
                        "voice": tts_voice,
                        "response_format": response_format,
                    }
                    headers = {
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                    }
                    
                    logger.info(f"调用硅基流动TTS API: model={model}, voice={tts_voice}")
                    response = requests.post(api_url, json=request_json, headers=headers, timeout=60)
                    
                    if response.status_code == 200:
                        audio_data = response.content
                    else:
                        logger.error(f"TTS API调用失败: {response.status_code} - {response.text}")
                        return {"success": False, "message": f"TTS调用失败: {response.text}"}
                else:
                    return {"success": False, "message": f"不支持的TTS类型: {tts_type}"}
                
                if audio_data:
                    # 转换为base64
                    audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                    
                    return {
                        "success": True, 
                        "message": "语音合成成功",
                        "audio_base64": audio_base64,
                        "audio_format": response_format,
                        "voice_name": voice_result.get('name'),
                        "test_text": test_text
                    }
                else:
                    return {"success": False, "message": "TTS生成无音频数据"}
                    
            except Exception as tts_error:
                logger.error(f"TTS生成失败: {tts_error}")
                import traceback
                logger.error(f"TTS错误堆栈: {traceback.format_exc()}")
                return {"success": False, "message": f"语音合成失败: {str(tts_error)}"}
            
        except Exception as e:
            logger.error(f"测试声音合成错误: {e}")
            import traceback
            logger.error(f"错误堆栈: {traceback.format_exc()}")
            return {"success": False, "message": f"测试失败: {str(e)}"}

    def get_monitor_data_sync(self, user_id: int) -> Dict[str, Any]:
        """获取监控数据（同步版本，整合前端所需的所有数据）"""
        try:
            # 获取健康数据
            health_data = self.get_latest_health_data(user_id)
            
            # 获取提醒数据
            reminders_data = self.get_reminders(user_id, days=7)
            
            # 获取设备数据
            devices_data = self.get_user_devices(user_id)
            
            # 整合数据
            result = {
                "success": True,
                "data": {
                    "health_data": health_data.get('data', {}),
                    "reminders": reminders_data.get('data', []),
                    "devices": devices_data.get('data', []),
                    "last_update": datetime.now().isoformat()
                }
            }
            
            return result
        except Exception as e:
            logger.error(f"获取监控数据错误: {e}")
            return {"success": False, "message": f"获取失败: {str(e)}"}

    def create_health_reminder_from_frontend(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """从前端创建健康提醒（同步版本）"""
        try:
            # 转换前端数据格式到后端格式
            reminder_data = {
                'user_id': data.get('user_id', 1),
                'reminder_type': 'health',
                'title': data.get('title', '健康提醒'),
                'content': data.get('content', ''),
                'scheduled_time': data.get('scheduled_time'),
                'repeat_pattern': data.get('repeat_pattern', 'once'),
                'repeat_config': data.get('repeat_config', {}),
                'tts_enabled': data.get('tts_enabled', 1),
                'priority': data.get('priority', 'medium')
            }
            
            return self.create_reminder(reminder_data)
        except Exception as e:
            logger.error(f"创建健康提醒错误: {e}")
            return {"success": False, "message": f"创建失败: {str(e)}"}

    # =========================== 智能提醒管理 ===========================
    
    async def create_reminder_with_voice(self, reminder_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建智能提醒（异步版本）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 处理时间格式
            scheduled_time = reminder_data.get('scheduled_time')
            if isinstance(scheduled_time, str):
                scheduled_time = datetime.fromisoformat(scheduled_time.replace('Z', '+00:00'))
            
            # voice_prompt 由前端根据提醒内容自动生成
            voice_prompt = reminder_data.get('voice_prompt', '')
            if not voice_prompt:
                voice_prompt = self._generate_voice_prompt(
                    reminder_data.get('reminder_type', 'other'),
                    reminder_data.get('title', ''),
                    reminder_data.get('content', '')
                )
            
            sql = """
            INSERT INTO ec_reminders (
                user_id, reminder_type, title, content, voice_prompt,
                scheduled_time, repeat_pattern, repeat_config, tts_enabled, priority, 
                is_completed, status, create_date, update_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, 'active', NOW(), NOW())
            """
            
            cursor.execute(sql, (
                reminder_data['user_id'],
                reminder_data['reminder_type'],
                reminder_data['title'],
                reminder_data.get('content', ''),
                voice_prompt,
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
                "reminder_id": reminder_id,
                "voice_prompt": voice_prompt
            }
            
        except Exception as e:
            logger.error(f"创建提醒错误: {e}")
            return {"success": False, "message": f"创建失败: {str(e)}"}
    
    async def get_user_reminders_with_voice(self, user_id: int, status: str = None, limit: int = 50) -> Dict[str, Any]:
        """获取用户提醒列表"""
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
            SELECT r.*
            FROM ec_reminders r
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

    def get_reminders(self, user_id: int, days: int = 7) -> Dict[str, Any]:
        """获取用户提醒（简化版，不包含语音信息）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 获取指定天数内的提醒（包括已完成的）
            sql = """
            SELECT 
                id, user_id, reminder_type, title, content, voice_prompt,
                scheduled_time, repeat_pattern, priority, is_completed, status,
                create_date
            FROM ec_reminders 
            WHERE user_id = %s 
            AND scheduled_time >= DATE_SUB(NOW(), INTERVAL %s DAY)
            AND status IN ('active', 'completed')
            ORDER BY is_completed ASC, scheduled_time ASC
            LIMIT 50
            """
            
            cursor.execute(sql, (user_id, days))
            reminders = cursor.fetchall()
            
            # 格式化时间字段
            for reminder in reminders:
                if reminder['scheduled_time']:
                    reminder['scheduled_time'] = reminder['scheduled_time'].strftime('%Y-%m-%d %H:%M:%S')
                if reminder['create_date']:
                    reminder['create_date'] = reminder['create_date'].strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.close()
            conn.close()
            
            return {"success": True, "data": reminders}
            
        except Exception as e:
            logger.error(f"获取用户提醒错误: {e}")
            return {"success": False, "message": f"获取失败: {str(e)}"}

    async def get_user_emergency_calls(self, user_id: int, days: int = 7) -> List[Dict[str, Any]]:
        """获取用户紧急呼救记录"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            sql = """
            SELECT 
                id, user_id, ai_device_id, emergency_type as call_type, timestamp, 
                location_address as location, resolution_notes as notes, status,
                severity_level, trigger_source, create_date as created_at
            FROM ec_emergency_calls 
            WHERE user_id = %s 
            AND timestamp >= DATE_SUB(NOW(), INTERVAL %s DAY)
            ORDER BY timestamp DESC
            LIMIT 50
            """
            
            cursor.execute(sql, (user_id, days))
            emergency_calls = cursor.fetchall()
            
            # 格式化时间字段
            for call in emergency_calls:
                if call['timestamp']:
                    call['timestamp'] = call['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
                if call['created_at']:
                    call['created_at'] = call['created_at'].strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.close()
            conn.close()
            
            return emergency_calls
            
        except Exception as e:
            logger.error(f"获取紧急呼救记录错误: {e}")
            return []

    def get_user_emergency_calls_sync(self, user_id: int, days: int = 7) -> List[Dict[str, Any]]:
        """获取用户紧急呼救记录（同步版本）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            sql = """
            SELECT 
                id, user_id, ai_device_id, emergency_type as call_type, timestamp, 
                location_address as location, resolution_notes as notes, status,
                severity_level, trigger_source, create_date as created_at
            FROM ec_emergency_calls 
            WHERE user_id = %s 
            AND timestamp >= DATE_SUB(NOW(), INTERVAL %s DAY)
            ORDER BY timestamp DESC
            LIMIT 50
            """
            
            cursor.execute(sql, (user_id, days))
            emergency_calls = cursor.fetchall()
            
            # 格式化时间字段
            for call in emergency_calls:
                if call['timestamp']:
                    call['timestamp'] = call['timestamp'].strftime('%Y-%m-%d %H:%M:%S')
                if call['created_at']:
                    call['created_at'] = call['created_at'].strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.close()
            conn.close()
            
            return emergency_calls
            
        except Exception as e:
            logger.error(f"获取紧急呼救记录错误: {e}")
            return []

    def create_reminder(self, reminder_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建提醒（同步版本，兼容路由调用）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            user_id = reminder_data.get('user_id')
            
            # 处理时间格式
            scheduled_time = reminder_data.get('scheduled_time')
            if isinstance(scheduled_time, str):
                # 处理前端发来的datetime-local格式
                if 'T' in scheduled_time:
                    scheduled_time = datetime.fromisoformat(scheduled_time.replace('Z', ''))
                else:
                    scheduled_time = datetime.strptime(scheduled_time, '%Y-%m-%d %H:%M:%S')
            elif scheduled_time is None:
                return {"success": False, "message": "必须提供提醒时间"}

            # 处理repeat_config
            repeat_config = reminder_data.get('repeat_config', {})
            if isinstance(repeat_config, dict):
                repeat_config = json.dumps(repeat_config, ensure_ascii=False)
            elif repeat_config is None:
                repeat_config = '{}'

            # 处理repeat_pattern (前端可能传repeat_interval)
            repeat_pattern = reminder_data.get('repeat_pattern') or reminder_data.get('repeat_interval', 'none')
            if repeat_pattern == 'none':
                repeat_pattern = 'once'
            
            # voice_prompt 由前端根据提醒内容自动生成，用户也可以修改
            voice_prompt = reminder_data.get('voice_prompt', '')
            
            # 如果前端没有传voice_prompt，根据提醒内容自动生成
            if not voice_prompt:
                voice_prompt = self._generate_voice_prompt(
                    reminder_data.get('reminder_type', 'other'),
                    reminder_data.get('title', ''),
                    reminder_data.get('content', '')
                )

            sql = """
            INSERT INTO ec_reminders (
                user_id, reminder_type, title, content, voice_prompt,
                scheduled_time, repeat_pattern, repeat_config,
                tts_enabled, priority, is_completed, status, 
                create_date, update_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, 'active', NOW(), NOW())
            """
            
            cursor.execute(sql, (
                user_id,
                reminder_data.get('reminder_type', 'other'),
                reminder_data['title'],
                reminder_data.get('content', ''),
                voice_prompt,
                scheduled_time,
                repeat_pattern,
                repeat_config,
                reminder_data.get('tts_enabled', 1),
                reminder_data.get('priority', 'medium')
            ))
            
            reminder_id = cursor.lastrowid
            cursor.close()
            conn.close()
            
            logger.info(f"创建提醒成功: ID={reminder_id}, 用户={user_id}")
            return {
                "success": True, 
                "message": "提醒创建成功", 
                "reminder_id": reminder_id,
                "voice_prompt": voice_prompt  # 返回生成的语音文本供前端显示
            }
            
        except Exception as e:
            logger.error(f"创建提醒错误: {e}")
            return {"success": False, "message": f"创建失败: {str(e)}"}
    
    def _generate_voice_prompt(self, reminder_type: str, title: str, content: str) -> str:
        """
        根据提醒类型和内容自动生成语音播报文本
        """
        templates = {
            'medication': "您好，现在是{title}时间了。{content}请记得按时服药，保持身体健康。",
            'health_check': "您好，{title}的时间到了。{content}定期检查有助于了解您的身体状况。",
            'exercise': "您好，是时候{title}了。{content}适当运动有益身心健康。",
            'meal': "您好，{title}时间到了。{content}按时用餐很重要，祝您用餐愉快。",
            'water': "您好，该喝水了。{content}保持充足的水分摄入对健康很重要。",
            'rest': "您好，{title}时间到了。{content}充足的休息对身体恢复很重要。",
            'appointment': "您好，提醒您{title}。{content}请做好准备，不要错过。",
            'other': "您好，{title}。{content}"
        }
        
        template = templates.get(reminder_type, templates['other'])
        
        # 处理内容
        if content and content.strip():
            content = content.strip()
            if not content.endswith('。') and not content.endswith('！') and not content.endswith('？'):
                content += '。'
        else:
            content = ''
        
        voice_text = template.format(title=title, content=content)
        voice_text = voice_text.replace('。。', '。').replace('  ', ' ').strip()
        
        return voice_text
    
    def update_reminder(self, reminder_id: int, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新提醒"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 构建更新字段
            update_fields = []
            values = []
            
            allowed_fields = ['title', 'content', 'voice_prompt', 'reminder_type', 'scheduled_time', 'repeat_pattern', 'priority', 'is_completed', 'status']
            
            for field in allowed_fields:
                if field in update_data:
                    update_fields.append(f"{field} = %s")
                    values.append(update_data[field])
            
            if not update_fields:
                return {"success": False, "message": "没有可更新的字段"}
            
            values.append(reminder_id)
            sql = f"UPDATE ec_reminders SET {', '.join(update_fields)}, update_date = NOW() WHERE id = %s"
            
            cursor.execute(sql, values)
            conn.commit()  # 确保提交事务
            
            if cursor.rowcount > 0:
                cursor.close()
                conn.close()
                return {"success": True, "message": "提醒更新成功"}
            else:
                cursor.close()
                conn.close()
                return {"success": False, "message": "提醒不存在"}
                
        except Exception as e:
            logger.error(f"更新提醒错误: {e}")
            return {"success": False, "message": f"更新失败: {str(e)}"}
    
    def complete_reminder(self, reminder_id: int, is_completed: bool = True) -> Dict[str, Any]:
        """
        标记提醒完成状态（前端点击对号按钮调用）
        
        Args:
            reminder_id: 提醒ID
            is_completed: 是否完成，True=完成，False=取消完成
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            if is_completed:
                sql = """
                UPDATE ec_reminders 
                SET is_completed = 1, 
                    completed_time = NOW(),
                    status = 'completed',
                    update_date = NOW() 
                WHERE id = %s
                """
            else:
                sql = """
                UPDATE ec_reminders 
                SET is_completed = 0, 
                    completed_time = NULL,
                    status = 'active',
                    update_date = NOW() 
                WHERE id = %s
                """
            
            cursor.execute(sql, (reminder_id,))
            conn.commit()  # 确保提交事务
            
            if cursor.rowcount > 0:
                cursor.close()
                conn.close()
                action = "已完成" if is_completed else "已恢复"
                logger.info(f"提醒 #{reminder_id} {action}")
                return {"success": True, "message": f"提醒{action}"}
            else:
                cursor.close()
                conn.close()
                return {"success": False, "message": "提醒不存在"}
                
        except Exception as e:
            logger.error(f"更新提醒完成状态错误: {e}")
            return {"success": False, "message": f"操作失败: {str(e)}"}
    
    def mark_reminder_triggered(self, reminder_id: int) -> Dict[str, Any]:
        """
        标记提醒已触发（调度器播报后调用）
        更新last_triggered_time和snooze_count
        """
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            sql = """
            UPDATE ec_reminders 
            SET last_triggered_time = NOW(),
                snooze_count = snooze_count + 1,
                update_date = NOW() 
            WHERE id = %s
            """
            
            cursor.execute(sql, (reminder_id,))
            cursor.close()
            conn.close()
            
            return {"success": True}
                
        except Exception as e:
            logger.error(f"标记提醒已触发错误: {e}")
            return {"success": False, "message": str(e)}
    
    def delete_reminder(self, reminder_id: int, user_id: int = None) -> Dict[str, Any]:
        """删除提醒"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # 如果指定了用户ID，增加用户验证
            if user_id:
                sql = "DELETE FROM ec_reminders WHERE id = %s AND user_id = %s"
                cursor.execute(sql, (reminder_id, user_id))
            else:
                sql = "DELETE FROM ec_reminders WHERE id = %s"
                cursor.execute(sql, (reminder_id,))
            
            if cursor.rowcount > 0:
                cursor.close()
                conn.close()
                return {"success": True, "message": "提醒删除成功"}
            else:
                cursor.close()
                conn.close()
                return {"success": False, "message": "提醒不存在或无权删除"}
                
        except Exception as e:
            logger.error(f"删除提醒错误: {e}")
            return {"success": False, "message": f"删除失败: {str(e)}"}

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
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 获取用户信息，包括拥有的智能体列表和默认智能体ID
            cursor.execute("""
                SELECT owned_ai_agents, default_ai_agent_id 
                FROM ec_users 
                WHERE id = %s
            """, (user_id,))
            user_info = cursor.fetchone()
            
            if not user_info:
                cursor.close()
                conn.close()
                return {"success": False, "message": "用户不存在"}
            
            # 解析用户拥有的智能体列表
            try:
                owned_agents = json.loads(user_info.get('owned_ai_agents', '[]'))
            except:
                owned_agents = []
            
            if not owned_agents:
                cursor.close()
                conn.close()
                return {"success": True, "data": []}
            
            # 获取智能体详细信息
            placeholders = ','.join(['%s'] * len(owned_agents))
            query = f"""
                SELECT id, agent_name, agent_code, system_prompt, 
                       lang_code, language, sort, created_at, updated_at
                FROM ai_agent 
                WHERE id IN ({placeholders})
                ORDER BY sort ASC, created_at DESC
            """
            
            cursor.execute(query, owned_agents)
            agents = cursor.fetchall()
            
            # 添加是否为默认智能体的标识
            default_agent_id = user_info.get('default_ai_agent_id')
            for agent in agents:
                agent['is_default'] = agent['id'] == default_agent_id
                # 确保日期字段可以JSON序列化
                if agent.get('created_at'):
                    agent['created_at'] = agent['created_at'].isoformat() if hasattr(agent['created_at'], 'isoformat') else str(agent['created_at'])
                if agent.get('updated_at'):
                    agent['updated_at'] = agent['updated_at'].isoformat() if hasattr(agent['updated_at'], 'isoformat') else str(agent['updated_at'])
            
            cursor.close()
            conn.close()
            
            return {"success": True, "data": agents}
            
        except Exception as e:
            logger.error(f"获取用户智能体列表失败: {e}")
            return {"success": False, "message": str(e)}
    
    async def create_agent(self, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建智能体（路由接口）"""
        # 处理前端数据格式
        user_id = agent_data.get('userId', agent_data.get('user_id', 1))
        
        # 转换前端字段名到数据库字段名 - 只包含数据库实际存在的字段
        normalized_data = {
            'agent_name': agent_data.get('agentName', agent_data.get('agent_name', '')),
            'agent_code': agent_data.get('agentCode', agent_data.get('agent_code', '')),
            'system_prompt': agent_data.get('systemPrompt', agent_data.get('system_prompt', '')),
            'lang_code': agent_data.get('langCode', agent_data.get('lang_code', 'zh-CN')),
            'language': agent_data.get('language', 'zh-CN'),
            'sort': agent_data.get('sort', 0)
        }
        
        return await self.create_eldercare_ai_agent(user_id, normalized_data)
    
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
            
            # 字段映射 (前端字段 -> 数据库字段) - 只包含数据库实际存在的字段
            field_mapping = {
                'agentName': 'agent_name',
                'agent_name': 'agent_name',
                'agentCode': 'agent_code',
                'agent_code': 'agent_code',
                'systemPrompt': 'system_prompt',
                'system_prompt': 'system_prompt',
                'template_id': 'template_id',
                'langCode': 'lang_code',
                'lang_code': 'lang_code',
                'language': 'language',
                'sort': 'sort'
            }
            
            for frontend_field, db_field in field_mapping.items():
                if frontend_field in agent_data:
                    update_fields.append(f"{db_field} = %s")
                    values.append(agent_data[frontend_field])
            
            if not update_fields:
                return {"success": False, "message": "没有可更新的字段"}
            
            values.append(agent_id)
            
            query = f"""
                UPDATE ai_agent 
                SET {', '.join(update_fields)}, updated_at = NOW()
                WHERE id = %s
            """
            
            # print(f"执行SQL: {query}")
            # print(f"参数: {values}")
            
            cursor.execute(query, values)
            
            conn.commit()
            
            if cursor.rowcount > 0:
                # print(f"更新成功，影响行数: {cursor.rowcount}")
                cursor.close()
                conn.close()
                return {"success": True, "message": "智能体更新成功"}
            else:
                # print(f"未找到智能体，agent_id: {agent_id}")
                cursor.close()
                conn.close()
                return {"success": False, "message": "智能体不存在"}
            
        except Exception as e:
            logger.error(f"更新智能体失败: {e}")
            # print(f"更新智能体错误: {e}")
            return {"success": False, "message": str(e)}

    async def delete_agent(self, agent_id: str) -> Dict[str, Any]:
        """删除智能体"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 先查找拥有该智能体的用户
            cursor.execute("""
                SELECT u.id, u.owned_ai_agents, u.default_ai_agent_id 
                FROM ec_users u 
                WHERE JSON_CONTAINS(u.owned_ai_agents, JSON_QUOTE(%s))
            """, (agent_id,))
            user_info = cursor.fetchone()
            
            if not user_info:
                cursor.close()
                conn.close()
                return {"success": False, "message": "智能体不存在或不属于任何用户"}
            
            # 删除智能体记录
            cursor.execute("DELETE FROM ai_agent WHERE id = %s", (agent_id,))
            
            if cursor.rowcount == 0:
                cursor.close()
                conn.close()
                return {"success": False, "message": "智能体不存在"}
            
            # 更新用户的owned_ai_agents列表
            try:
                owned_agents = json.loads(user_info.get('owned_ai_agents', '[]'))
            except:
                owned_agents = []
            
            if agent_id in owned_agents:
                owned_agents.remove(agent_id)
                cursor.execute(
                    "UPDATE ec_users SET owned_ai_agents = %s, update_date = NOW() WHERE id = %s", 
                    (json.dumps(owned_agents), user_info['id'])
                )
            
            # 如果删除的是默认智能体，需要重新设置默认智能体
            if user_info.get('default_ai_agent_id') == agent_id:
                new_default_id = owned_agents[0] if owned_agents else None
                cursor.execute(
                    "UPDATE ec_users SET default_ai_agent_id = %s WHERE id = %s", 
                    (new_default_id, user_info['id'])
                )
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return {"success": True, "message": "智能体删除成功"}
            
        except Exception as e:
            logger.error(f"删除智能体失败: {e}")
            return {"success": False, "message": str(e)}

    async def set_default_agent(self, user_id: int, agent_id: str) -> Dict[str, Any]:
        """设置默认智能体"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 首先检查用户是否存在以及其拥有的智能体列表
            cursor.execute("SELECT owned_ai_agents FROM ec_users WHERE id = %s", (user_id,))
            user_info = cursor.fetchone()
            
            if not user_info:
                cursor.close()
                conn.close()
                return {"success": False, "message": "用户不存在"}
            
            # 解析用户拥有的智能体列表
            try:
                owned_agents = json.loads(user_info.get('owned_ai_agents', '[]'))
            except:
                owned_agents = []
            
            # 检查agent_id是否在用户拥有的智能体列表中
            if agent_id not in owned_agents:
                cursor.close()
                conn.close()
                return {"success": False, "message": "该智能体不属于当前用户"}
            
            # 检查智能体是否存在
            cursor.execute("SELECT id FROM ai_agent WHERE id = %s", (agent_id,))
            agent_exists = cursor.fetchone()
            
            if not agent_exists:
                cursor.close()
                conn.close()
                return {"success": False, "message": "智能体不存在"}
            
            # 更新用户的默认智能体
            cursor.execute(
                "UPDATE ec_users SET default_ai_agent_id = %s, update_date = NOW() WHERE id = %s", 
                (agent_id, user_id)
            )
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return {"success": True, "message": "默认智能体设置成功"}
            
        except Exception as e:
            logger.error(f"设置默认智能体失败: {e}")
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
        """使用6位验证码绑定AI陪伴设备到智能体
        
        这个方法对接 manager-api 的设备激活流程：
        1. 从 Redis 获取设备ID（通过6位验证码）
        2. 获取设备详细信息（从Redis缓存）
        3. 验证激活码
        4. 在 ai_device 表中创建设备记录并绑定到智能体
        
        注意：此方法需要 Redis 连接和 manager-api 的激活码机制支持
        """
        # 导入必要的模块（在方法顶部导入，避免except块引用问题）
        import redis
        
        redis_client = None
        conn = None
        cursor = None
        
        try:
            # 初始化 Redis 连接（使用与 manager-api 相同的配置）
            redis_password = self.db_config.get('redis_password', '')
            redis_client = redis.Redis(
                host=self.db_config.get('redis_host', '127.0.0.1'),
                port=self.db_config.get('redis_port', 6379),
                db=self.db_config.get('redis_db', 0),
                password=redis_password if redis_password else None,
                decode_responses=True
            )
            
            # 测试Redis连接
            redis_client.ping()
            logger.info(f"Redis连接成功: {self.db_config.get('redis_host')}:{self.db_config.get('redis_port')}")
            
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 1. 从 Redis 获取MAC地址（通过验证码）
            # 注意：manager-api使用的key格式是 ota:activation:code:{code}
            device_key = f"ota:activation:code:{device_code}"
            mac_address = redis_client.get(device_key)
            
            if not mac_address:
                logger.error(f"验证码 {device_code} 未找到或已过期，Redis key: {device_key}")
                # 列出所有相关的key用于调试
                all_codes = redis_client.keys("ota:activation:code:*")
                logger.error(f"当前Redis中所有验证码key: {all_codes[:10] if all_codes else '无'}")
                return {"success": False, "message": "验证码错误或已过期，请在设备控制台重新获取验证码"}
            
            logger.info(f"从Redis获取到MAC地址: {mac_address}")
            
            # 2. 处理MAC地址（移除JSON引号）
            if mac_address.startswith('"') and mac_address.endswith('"'):
                mac_address = mac_address[1:-1]
            
            # 生成设备ID（格式：MAC地址转小写并替换冒号为下划线）
            device_id = mac_address.replace(":", "_").lower()
            logger.info(f"生成设备ID: {device_id}")
            
            # 3. 获取设备详细信息（从Redis缓存）
            # manager-api的格式：ota:activation:data:{safe_device_id}
            cache_device_key = f"ota:activation:data:{device_id}"
            device_data_str = redis_client.get(cache_device_key)
            
            if not device_data_str:
                logger.error(f"设备数据未找到: {device_id}, Redis key: {cache_device_key}")
                return {"success": False, "message": "设备数据未找到，请确保设备已上线并生成了验证码"}
            
            # 解析JSON数据
            device_data = json.loads(device_data_str)
            logger.info(f"从Redis获取到设备数据: {device_data}")
            
            # 4. 验证激活码
            cached_code = device_data.get('activation_code')
            if cached_code and cached_code != device_code:
                logger.error(f"激活码不匹配: {cached_code} != {device_code}")
                return {"success": False, "message": "验证码错误"}
            
            # 5. 检查设备是否已激活
            cursor.execute("SELECT id FROM ai_device WHERE id = %s", (device_id,))
            existing_device = cursor.fetchone()
            
            if existing_device:
                logger.error(f"设备已被激活: {device_id}")
                return {"success": False, "message": "设备已被激活，请不要重复绑定"}
            
            # 6. 获取智能体的 user_id
            cursor.execute("SELECT user_id FROM ai_agent WHERE id = %s", (agent_id,))
            agent_result = cursor.fetchone()
            
            if not agent_result:
                logger.error(f"智能体不存在: {agent_id}")
                return {"success": False, "message": "智能体不存在"}
            
            agent_user_id = agent_result['user_id']
            
            # 7. 创建设备记录并绑定到智能体
            # 从device_data获取board和app_version，如果没有则使用默认值
            board = device_data.get('board', 'ESP32')
            app_version = device_data.get('app_version', '1.0.0')
            
            insert_sql = """
            INSERT INTO ai_device (
                id, user_id, agent_id, mac_address, board, app_version,
                auto_update, last_connected_at, creator, create_date, updater, update_date
            ) VALUES (%s, %s, %s, %s, %s, %s, 1, NOW(), %s, NOW(), %s, NOW())
            """
            
            cursor.execute(insert_sql, (
                device_id,
                agent_user_id,
                agent_id,
                mac_address,
                board,
                app_version,
                user_id,
                user_id
            ))
            
            conn.commit()
            
            # 8. 清理 Redis 缓存
            redis_client.delete(device_key)
            redis_client.delete(cache_device_key)
            
            # 9. 清除智能体设备数量缓存（与manager-api保持一致）
            agent_device_count_key = f"agent:device:count:{agent_id}"
            redis_client.delete(agent_device_count_key)
            
            logger.info(f"设备绑定成功: device_id={device_id}, agent_id={agent_id}")
            return {
                "success": True, 
                "message": "设备绑定成功",
                "device_id": device_id,
                "agent_id": agent_id
            }
                
        except redis.ConnectionError as e:
            logger.error(f"Redis 连接失败: {e}")
            return {"success": False, "message": "Redis服务连接失败，请检查Redis是否正常运行"}
        except redis.ResponseError as e:
            logger.error(f"Redis 响应错误: {e}")
            return {"success": False, "message": "Redis服务响应错误"}
        except Exception as e:
            logger.error(f"绑定设备失败: {e}")
            import traceback
            logger.error(f"错误详情: {traceback.format_exc()}")
            return {"success": False, "message": f"绑定失败: {str(e)}"}
        finally:
            # 确保资源被正确释放
            if cursor:
                cursor.close()
            if conn:
                conn.close()
            if redis_client:
                redis_client.close()
    
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
            # 如果device_id看起来像是用户ID（纯数字），直接使用
            if device_id.isdigit():
                user_id = int(device_id)
            else:
                # 否则根据device_id查找对应的用户ID
                try:
                    conn = self.get_connection()
                    cursor = conn.cursor()
                    
                    # 先在ai_device表中查找
                    cursor.execute("SELECT user_id FROM ai_device WHERE mac_address = %s OR alias = %s LIMIT 1", (device_id, device_id))
                    result = cursor.fetchone()
                    
                    if not result:
                        # 如果ai_device表中没有，在ec_health_devices表中查找
                        cursor.execute("SELECT user_id FROM ec_health_devices WHERE device_name = %s LIMIT 1", (device_id,))
                        result = cursor.fetchone()
                    
                    cursor.close()
                    conn.close()
                    
                    if result:
                        user_id = result[0]
                    else:
                        # 如果找不到对应的设备，使用默认用户ID
                        user_id = 1
                        logger.warning(f"找不到设备ID {device_id} 对应的用户，使用默认用户ID 1")
                        
                except Exception as e:
                    logger.error(f"查找设备用户ID失败: {e}")
                    user_id = 1  # 默认用户ID
            
            # 获取健康数据
            health_result = self.get_health_data(user_id)
            health_data = health_result.get("data", []) if health_result.get("success") else []
            
            # 获取提醒数据
            reminders_result = await self.get_user_reminders_with_voice(user_id)
            reminders = reminders_result.get("data", []) if reminders_result.get("success") else []
            
            # 获取真实紧急呼救数据
            emergency_calls = await self.get_user_emergency_calls(user_id, days=7)
            
            return {
                "success": True,
                "health_data": health_data,
                "reminders": reminders,
                "emergency_calls": emergency_calls
            }
            
        except Exception as e:
            logger.error(f"获取监控数据失败: {e}")
            return {"success": False, "message": str(e)}
    
# 删除重复的异步版本，使用同步版本
    
    async def create_health_reminder_from_frontend(self, reminder_data: Dict[str, Any]) -> Dict[str, Any]:
        """从前端创建健康提醒"""
        return await self.create_reminder_with_voice(reminder_data)
    
    async def register_device(self, device_data: Dict[str, Any]) -> Dict[str, Any]:
        """注册设备"""
        return await self.register_health_device(device_data)
    
    async def update_device(self, device_id: int, device_data: Dict[str, Any], device_type: str = "ai") -> Dict[str, Any]:
        """更新设备信息"""
        try:
            conn = await self.get_connection()
            cursor = await conn.cursor()
            
            if device_type == "ai":
                # 构建AI设备更新SQL
                update_fields = []
                values = []
                
                if 'alias' in device_data:
                    update_fields.append("alias = %s")
                    values.append(device_data['alias'])
                
                if 'mac_address' in device_data:
                    update_fields.append("mac_address = %s")
                    values.append(device_data['mac_address'])
                
                if 'auto_update' in device_data:
                    update_fields.append("auto_update = %s")
                    values.append(device_data['auto_update'])
                
                if update_fields:
                    update_fields.append("update_date = NOW()")
                    values.append(device_id)
                    
                    sql = f"UPDATE ai_device SET {', '.join(update_fields)} WHERE id = %s"
                    await cursor.execute(sql, values)
            else:
                # 构建健康设备更新SQL
                update_fields = []
                values = []
                
                if 'device_name' in device_data:
                    update_fields.append("device_name = %s")
                    values.append(device_data['device_name'])
                
                if 'device_type' in device_data:
                    update_fields.append("device_type = %s")
                    values.append(device_data['device_type'])
                
                if 'device_config' in device_data:
                    update_fields.append("device_config = %s")
                    values.append(device_data['device_config'])
                
                if 'ai_agent_id' in device_data:
                    update_fields.append("ai_agent_id = %s")
                    values.append(device_data['ai_agent_id'])
                
                if 'plugin_id' in device_data:
                    update_fields.append("plugin_id = %s")
                    values.append(device_data['plugin_id'])
                
                if update_fields:
                    update_fields.append("update_date = NOW()")
                    values.append(device_id)
                    
                    sql = f"UPDATE ec_health_devices SET {', '.join(update_fields)} WHERE id = %s"
                    await cursor.execute(sql, values)
            
            await conn.commit()
            affected_rows = cursor.rowcount
            
            if affected_rows > 0:
                return {
                    "success": True,
                    "message": "设备更新成功"
                }
            else:
                return {
                    "success": False,
                    "message": "设备不存在或未更新"
                }
            
        except Exception as e:
            logger.error(f"更新设备失败: {str(e)}")
            return {
                "success": False,
                "message": f"更新设备失败: {str(e)}"
            }
        finally:
            if 'cursor' in locals():
                await cursor.close()
            if 'conn' in locals():
                await self.return_connection(conn)
    
    async def get_device_details(self, device_id: int, device_type: str = "ai") -> Dict[str, Any]:
        """获取设备详细信息"""
        try:
            conn = await self.get_connection()
            cursor = await conn.cursor(DictCursor)
            
            if device_type == "ai":
                sql = """
                SELECT id, user_id, alias, mac_address, last_connected_at, 
                       board, app_version, auto_update, create_date, update_date, creator
                FROM ai_device 
                WHERE id = %s
                """
            else:
                sql = """
                SELECT id, user_id, device_name, device_type, device_config, 
                       ai_agent_id, plugin_id, create_date, update_date, creator
                FROM ec_health_devices 
                WHERE id = %s
                """
            
            await cursor.execute(sql, (device_id,))
            device = await cursor.fetchone()
            
            if device:
                # 计算设备状态
                if device_type == "ai" and device.get('last_connected_at'):
                    now = datetime.now()
                    last_connected = device['last_connected_at']
                    if isinstance(last_connected, str):
                        last_connected = datetime.fromisoformat(last_connected)
                    
                    time_diff = (now - last_connected).total_seconds()
                    device['status'] = 'online' if time_diff <= 300 else 'offline'  # 5分钟内算在线
                else:
                    device['status'] = 'offline'
                
                return {
                    "success": True,
                    "device": device
                }
            else:
                return {
                    "success": False,
                    "message": "设备不存在"
                }
            
        except Exception as e:
            logger.error(f"获取设备详情失败: {str(e)}")
            return {
                "success": False,
                "message": f"获取设备详情失败: {str(e)}"
            }
        finally:
            if 'cursor' in locals():
                await cursor.close()
            if 'conn' in locals():
                await self.return_connection(conn)
    
    async def update_device_config(self, device_id: int, config_data: Dict[str, Any], device_type: str = "ai") -> Dict[str, Any]:
        """更新设备配置"""
        try:
            conn = await self.get_connection()
            cursor = await conn.cursor()
            
            if device_type == "ai":
                # AI设备配置更新
                sql = """
                UPDATE ai_device 
                SET device_config = %s, update_date = NOW()
                WHERE id = %s
                """
                config_json = json.dumps(config_data, ensure_ascii=False)
                await cursor.execute(sql, (config_json, device_id))
            else:
                # 健康设备配置更新
                sql = """
                UPDATE ec_health_devices 
                SET device_config = %s, update_date = NOW()
                WHERE id = %s
                """
                config_json = json.dumps(config_data, ensure_ascii=False)
                await cursor.execute(sql, (config_json, device_id))
            
            await conn.commit()
            affected_rows = cursor.rowcount
            
            if affected_rows > 0:
                return {
                    "success": True,
                    "message": "设备配置更新成功"
                }
            else:
                return {
                    "success": False,
                    "message": "设备不存在或未更新"
                }
            
        except Exception as e:
            logger.error(f"更新设备配置失败: {str(e)}")
            return {
                "success": False,
                "message": f"更新设备配置失败: {str(e)}"
            }
        finally:
            if 'cursor' in locals():
                await cursor.close()
            if 'conn' in locals():
                await self.return_connection(conn)
    
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
            
            # 从ec_users表中获取用户拥有的智能体ID列表和默认智能体ID
            cursor.execute("SELECT owned_ai_agents, default_ai_agent_id FROM ec_users WHERE id = %s", (user_id,))
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
            
            default_agent_id = user_data.get('default_ai_agent_id')
            
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
            
            # 添加是否为默认智能体的标识
            for agent in agents:
                agent['is_default'] = agent['id'] == default_agent_id
                # print(f"Agent {agent['id']}, default_agent_id: {default_agent_id}, is_default: {agent['is_default']}")
            
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
            
            # 转换datetime对象为字符串
            health_data = self._convert_datetime_to_string(health_data)
            
            return {"success": True, "data": health_data}
        except Exception as e:
            return {"success": False, "message": f"获取健康数据失败: {str(e)}"}
    
    def get_latest_health_data(self, user_id: int) -> Dict[str, Any]:
        """获取用户的最新健康数据"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 获取最新的健康数据记录
            sql = """
            SELECT hd.*, hdev.device_name, hdev.device_type, hdev.device_brand, hdev.device_model
            FROM ec_health_data hd
            LEFT JOIN ec_health_devices hdev ON hd.health_device_id = hdev.id
            WHERE hd.user_id = %s
            ORDER BY hd.timestamp DESC
            LIMIT 1
            """
            
            cursor.execute(sql, (user_id,))
            latest_data = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if latest_data:
                # 转换datetime对象为字符串
                latest_data = self._convert_datetime_to_string([latest_data])[0]
                return {"success": True, "data": latest_data}
            else:
                return {"success": True, "data": None}
        except Exception as e:
            return {"success": False, "message": f"获取最新健康数据失败: {str(e)}"}
    
    def get_user_ai_devices(self, user_id: int) -> Dict[str, Any]:
        """获取用户的AI智能陪伴设备"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 首先获取用户的所有智能体ID
            cursor.execute("SELECT owned_ai_agents, default_ai_agent_id FROM ec_users WHERE id = %s", (user_id,))
            user_result = cursor.fetchone()
            
            if not user_result:
                return {"success": False, "message": "用户不存在"}
            
            # 获取用户的智能体ID列表，确保转换为字符串类型
            agent_ids = []
            if user_result['owned_ai_agents']:
                try:
                    import json
                    raw_ids = json.loads(user_result['owned_ai_agents'])
                    agent_ids = [str(agent_id) for agent_id in raw_ids]
                except:
                    agent_ids = []
            
            # 如果有default_ai_agent_id，也加入列表，确保是字符串类型
            if user_result['default_ai_agent_id']:
                default_agent_str = str(user_result['default_ai_agent_id'])
                if default_agent_str not in agent_ids:
                    agent_ids.append(default_agent_str)
            
            if not agent_ids:
                return {"success": True, "data": []}
            
            # 为SQL查询准备参数
            placeholders = ','.join(['%s'] * len(agent_ids))
            
            sql = f"""
            SELECT 
                ad.id, ad.user_id, ad.mac_address, ad.alias as device_name,
                ad.last_connected_at as last_online, ad.board, ad.app_version,
                ad.create_date, ad.update_date, aa.agent_name, ad.agent_id,
                CASE 
                    WHEN ad.last_connected_at IS NULL THEN 0
                    WHEN ad.last_connected_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1
                    ELSE 0
                END as status,
                'ai_companion' as device_type,
                COALESCE(ad.alias, '未命名AI设备') as location
            FROM ai_device ad
            LEFT JOIN ai_agent aa ON ad.agent_id = aa.id
            WHERE ad.agent_id IN ({placeholders})
            ORDER BY ad.create_date DESC
            """
            
            cursor.execute(sql, agent_ids)
            devices = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            # 处理设备信息
            for device in devices:
                if not device.get('device_name'):
                    device['device_name'] = f"AI设备 {device['id'][:8]}"
            
            # 转换datetime对象
            devices = self._convert_datetime_to_string(devices)
            
            return {"success": True, "data": devices}
        except Exception as e:
            logger.error(f"获取AI设备失败: {e}")
            return {"success": False, "message": f"获取AI设备失败: {str(e)}"}
    
    def get_user_health_devices(self, user_id: int) -> Dict[str, Any]:
        """获取用户的健康监测设备 - 根据用户ID和AI设备ID关联查找"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 查询方式1：获取该用户的健康设备，以及关联的AI设备信息
            sql = """
            SELECT 
                hd.id, hd.user_id, hd.ai_agent_id, hd.ai_device_id, 
                hd.plugin_id, hd.device_name, hd.device_type, hd.device_brand, 
                hd.device_model, hd.mac_address, hd.health_features, 
                hd.sensor_config, hd.data_sync_config, hd.connection_status,
                hd.battery_level, hd.firmware_version, hd.last_sync_time,
                hd.is_active, hd.create_date, hd.update_date,
                ad.alias as ai_device_name, ad.agent_id as ai_agent_id_ref
            FROM ec_health_devices hd
            LEFT JOIN ai_device ad ON hd.ai_device_id = ad.id
            WHERE hd.user_id = %s AND hd.is_active = 1
            ORDER BY hd.create_date DESC
            """
            
            cursor.execute(sql, (user_id,))
            devices = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            # 转换datetime对象
            devices = self._convert_datetime_to_string(devices)
            
            return {"success": True, "data": devices}
        except Exception as e:
            logger.error(f"获取健康设备失败: {e}")
            return {"success": False, "message": f"获取健康设备失败: {str(e)}"}

    def get_user_id_by_device(self, device_id: str) -> Dict[str, Any]:
        """根据设备ID（MAC地址）获取用户ID"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 首先在ai_device表中查找设备
            # device_id可能是MAC地址格式（如 3D:11:F1:48:6C:44）
            cursor.execute("""
                SELECT d.id, d.agent_id, d.mac_address, a.creator as user_id
                FROM ai_device d
                LEFT JOIN ai_agent a ON d.agent_id = a.id
                WHERE d.id = %s OR d.mac_address = %s
                LIMIT 1
            """, (device_id, device_id))
            
            device_result = cursor.fetchone()
            
            if device_result and device_result.get('user_id'):
                cursor.close()
                conn.close()
                return {
                    "success": True, 
                    "user_id": device_result['user_id'],
                    "device_id": device_result['id'],
                    "agent_id": device_result.get('agent_id')
                }
            
            # 如果在ai_device中没找到，尝试在ec_health_devices中查找
            cursor.execute("""
                SELECT id, user_id, device_name, mac_address
                FROM ec_health_devices
                WHERE mac_address = %s AND is_active = 1
                LIMIT 1
            """, (device_id,))
            
            health_device = cursor.fetchone()
            
            cursor.close()
            conn.close()
            
            if health_device and health_device.get('user_id'):
                return {
                    "success": True,
                    "user_id": health_device['user_id'],
                    "device_id": health_device['id']
                }
            
            return {"success": False, "message": "未找到设备记录"}
            
        except Exception as e:
            logger.error(f"根据设备ID获取用户失败: {e}")
            return {"success": False, "message": f"查询失败: {str(e)}"}

    def get_user_devices(self, user_id: int) -> Dict[str, Any]:
        """获取用户的所有设备（AI设备 + 健康设备）"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 首先获取用户的智能体ID列表
            cursor.execute("SELECT owned_ai_agents, default_ai_agent_id FROM ec_users WHERE id = %s", (user_id,))
            user_result = cursor.fetchone()
            
            ai_devices = []
            if user_result:
                agent_ids = []
                if user_result['owned_ai_agents']:
                    try:
                        import json
                        agent_ids = json.loads(user_result['owned_ai_agents'])
                    except:
                        agent_ids = []
                
                # 如果有default_ai_agent_id，也加入列表
                if user_result['default_ai_agent_id'] and user_result['default_ai_agent_id'] not in agent_ids:
                    agent_ids.append(user_result['default_ai_agent_id'])
                
                if agent_ids:
                    # 为SQL查询准备参数
                    placeholders = ','.join(['%s'] * len(agent_ids))
                    
                    # 获取AI智能陪伴设备 - 通过agent_id查找
                    ai_devices_sql = f"""
                    SELECT 
                        id, id as device_code, alias as device_name, mac_address,
                        'ai_companion' as device_type, 'companion' as category,
                        CASE 
                            WHEN last_connected_at IS NULL THEN 0
                            WHEN last_connected_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1
                            ELSE 0
                        END as status,
                        last_connected_at as last_online,
                        create_date, update_date, board, app_version,
                        COALESCE(alias, '未命名设备') as location, agent_id
                    FROM ai_device 
                    WHERE agent_id IN ({placeholders})
                    ORDER BY create_date DESC
                    """
                    
                    cursor.execute(ai_devices_sql, agent_ids)
                    ai_devices = cursor.fetchall()
            
            # 获取健康监测设备
            health_devices_sql = """
            SELECT 
                id, device_name, device_type, device_brand, device_model,
                CASE 
                    WHEN connection_status = 'connected' THEN 1
                    ELSE 0
                END as status,
                last_sync_time as last_online,
                create_date, update_date, 'health_monitor' as category,
                mac_address, battery_level, firmware_version
            FROM ec_health_devices
            WHERE user_id = %s AND is_active = 1
            ORDER BY create_date DESC
            """
            
            cursor.execute(health_devices_sql, [user_id])
            health_devices = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            # 合并设备列表并标准化格式
            all_devices = []
            
            # 处理AI设备
            for device in ai_devices:
                # 确保device_name字段存在
                if not device.get('device_name'):
                    device['device_name'] = device.get('alias') or f"AI设备 {device['id'][:8]}"
                
                # 添加位置信息
                if not device.get('location'):
                    device['location'] = '未指定位置'
                    
                all_devices.append(device)
            
            # 处理健康设备
            for device in health_devices:
                device['category'] = 'health_monitor'
                # 状态标准化
                if device['status'] == 'connected':
                    device['status'] = 1
                else:
                    device['status'] = 0
                all_devices.append(device)
            
            # 转换datetime对象
            all_devices = self._convert_datetime_to_string(all_devices)
            
            return {"success": True, "data": all_devices}
            
        except Exception as e:
            logger.error(f"获取用户设备失败: {e}")
            return {"success": False, "message": f"获取设备失败: {str(e)}"}
    
    def register_device(self, device_data: Dict[str, Any]) -> Dict[str, Any]:
        """注册新设备（统一处理AI设备和健康设备）"""
        try:
            device_type = device_data.get('deviceType', 'health_monitor')
            user_id = device_data.get('userId', device_data.get('user_id', 1))
            
            conn = self.get_connection()
            cursor = conn.cursor()
            
            if device_type == 'companion':
                # 注册为AI智能陪伴设备 - 使用正确的表结构
                device_id = f"AI_{str(uuid.uuid4()).replace('-', '')[:16]}"
                
                # 获取用户的默认智能体ID
                cursor.execute("SELECT default_ai_agent_id FROM ec_users WHERE id = %s", (user_id,))
                user_result = cursor.fetchone()
                default_agent_id = user_result[0] if user_result and user_result[0] else None
                
                sql = """
                INSERT INTO ai_device (
                    id, user_id, alias, mac_address, agent_id, create_date, update_date,
                    creator
                ) VALUES (%s, %s, %s, %s, %s, NOW(), NOW(), %s)
                """
                
                cursor.execute(sql, (
                    device_id,
                    user_id,
                    device_data.get('deviceName', 'AI设备'),
                    f"MAC_{str(uuid.uuid4()).replace('-', '')[:12]}",  # 生成模拟MAC地址
                    default_agent_id,
                    user_id
                ))
                
            else:
                # 注册为健康监测设备
                # 从前端获取选择的AI设备ID
                ai_device_id = device_data.get('aiDeviceId') or device_data.get('ai_device_id')
                
                if not ai_device_id:
                    cursor.close()
                    conn.close()
                    return {"success": False, "message": "必须选择关联的AI陪伴设备"}
                
                # 获取该AI设备关联的智能体ID
                cursor.execute("SELECT agent_id, user_id FROM ai_device WHERE id = %s", [ai_device_id])
                ai_device_result = cursor.fetchone()
                
                if not ai_device_result:
                    cursor.close()
                    conn.close()
                    return {"success": False, "message": "选择的AI设备不存在"}
                
                ai_agent_id = ai_device_result['agent_id'] if ai_device_result['agent_id'] else f"EC_default_{user_id}"
                
                # 检查用户是否拥有该AI设备（安全性检查）
                if ai_device_result['user_id'] != user_id:
                    cursor.close()
                    conn.close()
                    return {"success": False, "message": "无权访问该AI设备"}
                
                # 插入健康设备记录，包含ai_device_id
                sql = """
                INSERT INTO ec_health_devices (
                    user_id, ai_agent_id, ai_device_id, plugin_id, device_name, device_type, 
                    device_brand, device_model, connection_status, 
                    health_features, mac_address, creator
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                
                health_features = json.dumps({
                    "heart_rate": True,
                    "blood_pressure": True,
                    "blood_oxygen": True,
                    "temperature": True,
                    "steps": True,
                    "sleep": True
                }, ensure_ascii=False)
                
                # 生成插件ID
                plugin_id = f"HEALTH_{device_data.get('deviceType', 'MONITOR')}_{str(uuid.uuid4()).replace('-', '')[:8]}"
                
                # 获取设备名称和类型
                device_name = device_data.get('deviceName', '').strip()
                if not device_name:
                    device_name = '健康监测设备'
                
                # 设置设备类型（根据前端传递的deviceType或使用默认值）
                device_type_mapping = {
                    'health': 'smart_watch',
                    'health_monitor': 'smart_watch',
                    'watch': 'smart_watch',
                    'blood_pressure': 'blood_pressure_monitor',
                    'glucose': 'glucose_meter',
                    'fitness': 'fitness_tracker'
                }
                
                raw_device_type = device_data.get('deviceType', 'health')
                device_type = device_type_mapping.get(raw_device_type, 'health')
                
                # 设置连接状态为connected（因为是用户主动添加的）
                connection_status = 'connected'
                
                cursor.execute(sql, (
                    user_id,
                    ai_agent_id,
                    ai_device_id,  # 正确绑定AI设备ID
                    plugin_id,
                    device_name,
                    device_type,
                    device_data.get('deviceBrand', '未知品牌'),
                    device_data.get('deviceModel', '未知型号'),
                    connection_status,
                    health_features,
                    f"MAC_{str(uuid.uuid4()).replace('-', '')[:12]}",  # 生成模拟MAC地址
                    user_id
                ))
            
            device_id = cursor.lastrowid
            cursor.close()
            conn.close()
            
            logger.info(f"设备注册成功: ID={device_id}, 类型={device_type}")
            return {
                "success": True, 
                "message": "设备注册成功", 
                "device_id": device_id
            }
            
        except Exception as e:
            logger.error(f"注册设备错误: {e}")
            return {"success": False, "message": f"注册失败: {str(e)}"}
    
    def delete_device(self, device_id, user_id: int = None) -> Dict[str, Any]:
        """删除设备"""
        conn = None
        cursor = None
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 先查找设备是在哪个表中
            # ai_device表的id是字符串类型，ec_health_devices表的id是数字类型
            ai_device_sql = "SELECT id FROM ai_device WHERE id = %s"
            health_device_sql = "SELECT id FROM ec_health_devices WHERE id = %s"
            
            # 先尝试作为字符串查找AI设备
            cursor.execute(ai_device_sql, (str(device_id),))
            ai_device = cursor.fetchone()
            
            if ai_device:
                # 删除AI设备（使用字符串类型的device_id）
                if user_id:
                    delete_sql = "DELETE FROM ai_device WHERE id = %s AND user_id = %s"
                    cursor.execute(delete_sql, (str(device_id), user_id))
                else:
                    delete_sql = "DELETE FROM ai_device WHERE id = %s"
                    cursor.execute(delete_sql, (str(device_id),))
                
                if cursor.rowcount > 0:
                    conn.commit()
                    return {"success": True, "message": "AI设备删除成功"}
            else:
                # 检查健康设备（尝试作为数字ID）
                try:
                    device_id_int = int(device_id)
                    cursor.execute(health_device_sql, (device_id_int,))
                    health_device = cursor.fetchone()
                    
                    if health_device:
                        # 软删除健康设备（设置is_active=0）
                        if user_id:
                            update_sql = "UPDATE ec_health_devices SET is_active = 0 WHERE id = %s AND user_id = %s"
                            cursor.execute(update_sql, (device_id_int, user_id))
                        else:
                            update_sql = "UPDATE ec_health_devices SET is_active = 0 WHERE id = %s"
                            cursor.execute(update_sql, (device_id_int,))
                        
                        if cursor.rowcount > 0:
                            conn.commit()
                            return {"success": True, "message": "健康设备删除成功"}
                except (ValueError, TypeError):
                    # 如果device_id不是数字，则不是健康设备
                    pass
            
            return {"success": False, "message": "设备不存在或无权删除"}
            
        except Exception as e:
            logger.error(f"删除设备错误: {e}")
            return {"success": False, "message": f"删除失败: {str(e)}"}
        finally:
            # 确保资源正确释放
            try:
                if cursor:
                    cursor.close()
                if conn:
                    conn.close()
            except Exception as cleanup_error:
                logger.error(f"数据库连接清理错误: {cleanup_error}")
    
    def update_device(self, device_id: int, update_data: Dict[str, Any], user_id: int = None) -> Dict[str, Any]:
        """更新设备信息"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor(dictionary=True)
            
            # 先确定设备类型
            ai_device_sql = "SELECT id FROM ai_device WHERE id = %s"
            cursor.execute(ai_device_sql, (device_id,))
            is_ai_device = cursor.fetchone() is not None
            
            if is_ai_device:
                # 更新AI设备
                update_fields = []
                values = []
                
                allowed_fields = ['device_name', 'alias', 'location', 'status']
                for field in allowed_fields:
                    if field in update_data:
                        update_fields.append(f"{field} = %s")
                        values.append(update_data[field])
                
                if update_fields:
                    values.append(device_id)
                    if user_id:
                        sql = f"UPDATE ai_device SET {', '.join(update_fields)}, update_date = NOW() WHERE id = %s AND user_id = %s"
                        values.append(user_id)
                    else:
                        sql = f"UPDATE ai_device SET {', '.join(update_fields)}, update_date = NOW() WHERE id = %s"
                    
                    cursor.execute(sql, values)
                    
            else:
                # 更新健康设备
                update_fields = []
                values = []
                
                allowed_fields = ['device_name', 'device_type', 'device_brand', 'device_model', 'connection_status']
                for field in allowed_fields:
                    if field in update_data:
                        update_fields.append(f"{field} = %s")
                        values.append(update_data[field])
                
                if update_fields:
                    values.append(device_id)
                    if user_id:
                        sql = f"UPDATE ec_health_devices SET {', '.join(update_fields)}, update_date = NOW() WHERE id = %s AND user_id = %s"
                        values.append(user_id)
                    else:
                        sql = f"UPDATE ec_health_devices SET {', '.join(update_fields)}, update_date = NOW() WHERE id = %s"
                    
                    cursor.execute(sql, values)
            
            if cursor.rowcount > 0:
                cursor.close()
                conn.close()
                return {"success": True, "message": "设备更新成功"}
            else:
                cursor.close()
                conn.close()
                return {"success": False, "message": "设备不存在或无权更新"}
                
        except Exception as e:
            logger.error(f"更新设备错误: {e}")
            return {"success": False, "message": f"更新失败: {str(e)}"}

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
            
            # 获取紧急呼救记录 (从数据库获取真实数据)
            emergency_calls = self.get_user_emergency_calls_sync(user_id, days=7)
            
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