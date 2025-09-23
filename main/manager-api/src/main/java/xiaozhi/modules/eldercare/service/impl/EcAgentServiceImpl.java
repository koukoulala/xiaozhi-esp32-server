package xiaozhi.modules.eldercare.service.impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import xiaozhi.modules.eldercare.entity.response.AgentResponse;
import xiaozhi.modules.eldercare.service.EcAgentService;
import xiaozhi.modules.agent.service.AgentService;
import xiaozhi.modules.agent.entity.AgentEntity;
import xiaozhi.modules.agent.dto.AgentDTO;

import java.util.ArrayList;
import java.util.List;

/**
 * 长者护理 - AI智能体服务实现类
 */
@Service
public class EcAgentServiceImpl implements EcAgentService {

    @Autowired
    private AgentService agentService;

    @Override
    public List<AgentResponse> getUserAgents(Long userId) {
        // 获取用户的智能体列表
        List<AgentDTO> agentDTOList = agentService.getUserAgents(userId);
        
        List<AgentResponse> responseList = new ArrayList<>();
        for (AgentDTO agentDTO : agentDTOList) {
            AgentResponse response = convertToResponse(agentDTO);
            responseList.add(response);
        }
        
        return responseList;
    }

    @Override
    public AgentResponse getAgentDetails(Long agentId) {
        AgentEntity agent = agentService.selectById(agentId.toString());
        return agent != null ? convertToResponse(agent) : null;
    }

    @Override
    public boolean updateAgentVoice(Long agentId, Long ttsVoiceId) {
        try {
            AgentEntity agent = agentService.selectById(agentId.toString());
            if (agent != null) {
                agent.setTtsVoiceId(ttsVoiceId.toString());
                return agentService.updateById(agent);
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean setDefaultAgent(Long agentId, Long userId) {
        try {
            // 这里应该更新用户表的default_ai_agent_id字段
            // 由于没有用户实体，先返回true
            // TODO: 实现设置默认智能体的逻辑
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private AgentResponse convertToResponse(AgentDTO agentDTO) {
        AgentResponse response = new AgentResponse();
        response.setId(Long.valueOf(agentDTO.getId()));
        response.setAgentName(agentDTO.getAgentName());
        response.setName(agentDTO.getAgentName());
        response.setTtsVoiceId(null); // AgentDTO没有ttsVoiceId字段，使用null
        response.setTtsModelId(null); // AgentDTO没有ttsModelId字段，使用null
        response.setIsDefault(false); // TODO: 从用户表获取是否为默认智能体
        response.setCreatedAt(agentDTO.getLastConnectedAt()); // 使用lastConnectedAt作为临时代替
        response.setCreateDate(agentDTO.getLastConnectedAt());
        
        return response;
    }

    private AgentResponse convertToResponse(AgentEntity agent) {
        AgentResponse response = new AgentResponse();
        response.setId(Long.valueOf(agent.getId()));
        response.setAgentName(agent.getAgentName());
        response.setName(agent.getAgentName());
        response.setTtsVoiceId(agent.getTtsVoiceId() != null ? Long.valueOf(agent.getTtsVoiceId()) : null);
        response.setTtsModelId(agent.getTtsModelId());
        response.setIsDefault(false); // TODO: 从用户表获取是否为默认智能体
        response.setCreatedAt(agent.getCreatedAt());
        response.setCreateDate(agent.getCreatedAt());
        
        return response;
    }
}