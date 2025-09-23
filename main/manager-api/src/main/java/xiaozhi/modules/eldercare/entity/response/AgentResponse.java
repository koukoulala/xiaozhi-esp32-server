package xiaozhi.modules.eldercare.entity.response;

import java.util.Date;

/**
 * 智能体响应实体
 */
public class AgentResponse {
    private Long id;
    private String agentName;
    private String name;
    private Long ttsVoiceId;
    private String ttsModelId;
    private Boolean isDefault;
    private Date createDate;
    private Date createdAt;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAgentName() {
        return agentName;
    }

    public void setAgentName(String agentName) {
        this.agentName = agentName;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getTtsVoiceId() {
        return ttsVoiceId;
    }

    public void setTtsVoiceId(Long ttsVoiceId) {
        this.ttsVoiceId = ttsVoiceId;
    }

    public String getTtsModelId() {
        return ttsModelId;
    }

    public void setTtsModelId(String ttsModelId) {
        this.ttsModelId = ttsModelId;
    }

    public Boolean getIsDefault() {
        return isDefault;
    }

    public void setIsDefault(Boolean isDefault) {
        this.isDefault = isDefault;
    }

    public Date getCreateDate() {
        return createDate;
    }

    public void setCreateDate(Date createDate) {
        this.createDate = createDate;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }
}