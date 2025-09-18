package xiaozhi.modules.eldercare.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import xiaozhi.common.entity.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * ElderCare提醒管理实体（简化版）
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Data
@EqualsAndHashCode(callSuper=false)
@Schema(description = "ElderCare提醒管理表")
@TableName("ec_reminders")
public class EcRemindersEntity extends BaseEntity {

    @Schema(description = "ID")
    @TableId
    private Long id;

    @Schema(description = "ElderCare用户ID")
    private Long userId;

    @Schema(description = "AI智能体ID（用于TTS语音提醒）")
    private String aiAgentId;

    @Schema(description = "提醒类型(medication/blood_pressure/blood_glucose/exercise/meal/appointment/sleep/water)")
    private String reminderType;

    @Schema(description = "提醒标题")
    private String title;

    @Schema(description = "提醒内容")
    private String content;

    @Schema(description = "语音提醒内容（用于TTS）")
    private String voiceContent;

    @Schema(description = "计划时间")
    private LocalDateTime scheduledTime;

    @Schema(description = "重复模式(once/daily/weekly/monthly/custom)")
    private String repeatPattern;

    @Schema(description = "重复配置(JSON格式：具体时间、间隔等)")
    private String repeatConfig;

    @Schema(description = "是否完成(0否 1是)")
    private Integer isCompleted;

    @Schema(description = "完成时间")
    private LocalDateTime completedTime;

    @Schema(description = "推迟次数")
    private Integer snoozeCount;

    @Schema(description = "最后触发时间")
    private LocalDateTime lastTriggeredTime;

    @Schema(description = "状态(active/paused/completed/cancelled)")
    private String status;
}