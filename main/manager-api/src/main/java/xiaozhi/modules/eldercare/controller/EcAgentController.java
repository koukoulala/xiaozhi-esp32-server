package xiaozhi.modules.eldercare.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import xiaozhi.common.utils.Result;
import xiaozhi.modules.eldercare.service.EcAgentService;
import xiaozhi.modules.eldercare.entity.response.AgentResponse;
import xiaozhi.modules.eldercare.entity.request.UpdateAgentVoiceRequest;

import java.util.List;

/**
 * 长者护理 - AI智能体 Controller
 * 提供智能体管理、音色配置等功能的API接口
 */
@RestController
@RequestMapping("/eldercare/agent")
@CrossOrigin
public class EcAgentController {

    @Autowired
    private EcAgentService agentService;

    /**
     * 获取用户的智能体列表
     */
    @GetMapping("/list")
    public Result<List<AgentResponse>> getUserAgents(@RequestParam("userId") Long userId) {
        try {
            List<AgentResponse> agentList = agentService.getUserAgents(userId);
            return new Result<List<AgentResponse>>().ok(agentList);
        } catch (Exception e) {
            return new Result<List<AgentResponse>>().error(e.getMessage());
        }
    }

    /**
     * 获取智能体详情
     */
    @GetMapping("/{agentId}")
    public Result<AgentResponse> getAgentDetails(@PathVariable Long agentId) {
        try {
            AgentResponse agent = agentService.getAgentDetails(agentId);
            if (agent != null) {
                return new Result<AgentResponse>().ok(agent);
            } else {
                return new Result<AgentResponse>().error("智能体不存在");
            }
        } catch (Exception e) {
            return new Result<AgentResponse>().error(e.getMessage());
        }
    }

    /**
     * 更新智能体音色
     */
    @PutMapping("/{agentId}/voice")
    public Result<String> updateAgentVoice(
            @PathVariable Long agentId, 
            @RequestBody UpdateAgentVoiceRequest request
    ) {
        try {
            boolean success = agentService.updateAgentVoice(agentId, request.getTtsVoiceId());
            if (success) {
                return new Result<String>().ok("更新智能体音色成功");
            } else {
                return new Result<String>().error("更新智能体音色失败");
            }
        } catch (Exception e) {
            return new Result<String>().error(e.getMessage());
        }
    }

    /**
     * 设置默认智能体
     */
    @PutMapping("/{agentId}/default")
    public Result<String> setDefaultAgent(@PathVariable Long agentId, @RequestParam("userId") Long userId) {
        try {
            boolean success = agentService.setDefaultAgent(agentId, userId);
            if (success) {
                return new Result<String>().ok("设置默认智能体成功");
            } else {
                return new Result<String>().error("设置默认智能体失败");
            }
        } catch (Exception e) {
            return new Result<String>().error(e.getMessage());
        }
    }
}