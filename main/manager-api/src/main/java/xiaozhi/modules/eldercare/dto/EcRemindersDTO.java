package xiaozhi.modules.eldercare.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * ElderCare提醒记录DTO
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Data
@Schema(description = "ElderCare提醒记录")
public class EcRemindersDTO implements Serializable {
    
    private static final long serialVersionUID = 1L;

    @Schema(description = "用户ID")
    @NotNull(message = "用户ID不能为空")
    private Long userId;

    @Schema(description = "AI智能体ID")
    private String aiAgentId;

    @Schema(description = "AI设备ID")
    private String aiDeviceId;

    @Schema(description = "TTS音色ID")
    private String ttsVoiceId;

    @Schema(description = "提醒类型")
    @NotBlank(message = "提醒类型不能为空")
    private String reminderType;

    @Schema(description = "提醒标题")
    @NotBlank(message = "提醒标题不能为空")
    private String title;

    @Schema(description = "提醒内容")
    private String content;

    @Schema(description = "语音提示")
    private String voicePrompt;

    @Schema(description = "计划时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @NotNull(message = "计划时间不能为空")
    private LocalDateTime scheduledTime;

    @Schema(description = "重复模式")
    private String repeatPattern;

    @Schema(description = "重复配置(JSON)")
    private String repeatConfig;

    @Schema(description = "是否启用TTS")
    private Boolean ttsEnabled;

    @Schema(description = "优先级")
    private String priority;

    @Schema(description = "是否完成")
    private Boolean isCompleted;

    @Schema(description = "状态")
    private String status;

    @Schema(description = "实际执行时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime executedTime;

    @Schema(description = "执行结果")
    private String executionResult;

    @Schema(description = "推迟次数")
    private Integer snoozeCount;

    @Schema(description = "下次提醒时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime nextRemindTime;
}