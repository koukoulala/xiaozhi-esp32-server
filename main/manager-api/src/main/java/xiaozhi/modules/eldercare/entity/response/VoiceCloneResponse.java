package xiaozhi.modules.eldercare.entity.response;

import java.util.Date;

/**
 * 声音克隆响应实体
 */
public class VoiceCloneResponse {
    private Long id;
    private String name;
    private String languages;
    private String ttsVoice;
    private String referenceText;
    private String referenceAudio;
    private String voiceDemo;
    private Date createDate;
    private Date createdAt;

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLanguages() {
        return languages;
    }

    public void setLanguages(String languages) {
        this.languages = languages;
    }

    public String getTtsVoice() {
        return ttsVoice;
    }

    public void setTtsVoice(String ttsVoice) {
        this.ttsVoice = ttsVoice;
    }

    public String getReferenceText() {
        return referenceText;
    }

    public void setReferenceText(String referenceText) {
        this.referenceText = referenceText;
    }

    public String getReferenceAudio() {
        return referenceAudio;
    }

    public void setReferenceAudio(String referenceAudio) {
        this.referenceAudio = referenceAudio;
    }

    public String getVoiceDemo() {
        return voiceDemo;
    }

    public void setVoiceDemo(String voiceDemo) {
        this.voiceDemo = voiceDemo;
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