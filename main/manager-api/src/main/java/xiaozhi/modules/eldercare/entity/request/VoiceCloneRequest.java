package xiaozhi.modules.eldercare.entity.request;

import org.springframework.web.multipart.MultipartFile;

/**
 * 声音克隆请求实体
 */
public class VoiceCloneRequest {
    private Long userId;
    private String name;
    private String referenceText;
    private MultipartFile audioFile;
    private String ttsModelId;

    // Getters and Setters
    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getReferenceText() {
        return referenceText;
    }

    public void setReferenceText(String referenceText) {
        this.referenceText = referenceText;
    }

    public MultipartFile getAudioFile() {
        return audioFile;
    }

    public void setAudioFile(MultipartFile audioFile) {
        this.audioFile = audioFile;
    }

    public String getTtsModelId() {
        return ttsModelId;
    }

    public void setTtsModelId(String ttsModelId) {
        this.ttsModelId = ttsModelId;
    }
}