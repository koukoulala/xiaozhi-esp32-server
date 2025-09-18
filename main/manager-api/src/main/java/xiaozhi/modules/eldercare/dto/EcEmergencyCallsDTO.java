package xiaozhi.modules.eldercare.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * ElderCare紧急呼救记录DTO
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Data
@Schema(description = "ElderCare紧急呼救记录")
public class EcEmergencyCallsDTO implements Serializable {
    
    private static final long serialVersionUID = 1L;

    @Schema(description = "用户ID")
    @NotNull(message = "用户ID不能为空")
    private Long userId;

    @Schema(description = "健康设备ID")
    private Long healthDeviceId;

    @Schema(description = "AI设备ID")
    private String aiDeviceId;

    @Schema(description = "紧急类型")
    @NotBlank(message = "紧急类型不能为空")
    private String emergencyType;

    @Schema(description = "触发源")
    @NotBlank(message = "触发源不能为空")
    private String triggerSource;

    @Schema(description = "发生时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @NotNull(message = "发生时间不能为空")
    private LocalDateTime timestamp;

    @Schema(description = "GPS位置")
    private String locationGps;

    @Schema(description = "地址描述")
    private String locationAddress;

    @Schema(description = "室内位置")
    private String indoorLocation;

    @Schema(description = "紧急健康数据(JSON)")
    private String emergencyHealthData;

    @Schema(description = "严重级别(1-5)")
    private Integer severityLevel;

    @Schema(description = "是否自动拨号")
    private Boolean autoCallTriggered;

    @Schema(description = "拨打号码列表(JSON)")
    private String callNumbers;

    @Schema(description = "拨打结果(JSON)")
    private String callResults;

    @Schema(description = "响应时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime responseTime;

    @Schema(description = "状态")
    private String status;

    @Schema(description = "处理人员信息(JSON)")
    private String handlerInfo;

    @Schema(description = "解决记录")
    private String resolutionNotes;
}