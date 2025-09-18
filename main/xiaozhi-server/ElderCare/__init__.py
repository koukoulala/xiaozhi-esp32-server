"""
ElderCare智慧养老陪伴系统
整合了用户认证、健康监控、声音克隆、提醒系统等功能

作者: assistant  
日期: 2025-08-27
"""

from .api import ElderCareAPI, init_eldercare_api, get_eldercare_api

__all__ = [
    'ElderCareAPI',
    'init_eldercare_api', 
    'get_eldercare_api'
]
