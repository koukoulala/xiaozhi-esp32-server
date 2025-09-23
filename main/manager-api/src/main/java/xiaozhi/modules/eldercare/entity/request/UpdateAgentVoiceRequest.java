package xiaozhi.modules.eldercare.entity.request;

/**
 * 更新智能体音色请求实体
 */
public class UpdateAgentVoiceRequest {
    private Long ttsVoiceId;

    // Getters and Setters
    public Long getTtsVoiceId() {
        return ttsVoiceId;
    }

    public void setTtsVoiceId(Long ttsVoiceId) {
        this.ttsVoiceId = ttsVoiceId;
    }
}