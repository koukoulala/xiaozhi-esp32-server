package xiaozhi.modules.eldercare.service;

import xiaozhi.modules.eldercare.entity.request.VoiceCloneRequest;
import xiaozhi.modules.eldercare.entity.response.VoiceCloneResponse;

import java.util.List;

/**
 * 长者护理 - 声音克隆服务接口
 */
public interface EcVoiceService {
    
    /**
     * 创建声音克隆
     */
    VoiceCloneResponse createVoiceClone(VoiceCloneRequest request) throws Exception;
    
    /**
     * 获取用户的声音列表
     */
    List<VoiceCloneResponse> getVoiceList(Long userId);
    
    /**
     * 获取声音详情
     */
    VoiceCloneResponse getVoiceDetails(Long voiceId);
    
    /**
     * 删除声音克隆
     */
    boolean deleteVoice(Long voiceId);
    
    /**
     * 测试声音合成
     */
    String testVoiceSynthesis(Long voiceId, String testText) throws Exception;
}