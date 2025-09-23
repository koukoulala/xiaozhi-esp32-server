package xiaozhi.modules.eldercare.service;

import xiaozhi.modules.eldercare.entity.response.AgentResponse;

import java.util.List;

/**
 * 长者护理 - AI智能体服务接口
 */
public interface EcAgentService {
    
    /**
     * 获取用户的智能体列表
     */
    List<AgentResponse> getUserAgents(Long userId);
    
    /**
     * 获取智能体详情
     */
    AgentResponse getAgentDetails(Long agentId);
    
    /**
     * 更新智能体音色
     */
    boolean updateAgentVoice(Long agentId, Long ttsVoiceId);
    
    /**
     * 设置默认智能体
     */
    boolean setDefaultAgent(Long agentId, Long userId);
}