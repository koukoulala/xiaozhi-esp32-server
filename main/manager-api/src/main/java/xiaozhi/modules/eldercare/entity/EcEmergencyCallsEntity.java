package xiaozhi.modules.eldercare.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import xiaozhi.common.entity.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * ElderCare紧急呼救记录实体（增强版）
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Data
@EqualsAndHashCode(callSuper=false)
@Schema(description = "ElderCare紧急呼救记录表")
@TableName("ec_emergency_calls")
public class EcEmergencyCallsEntity extends BaseEntity {

    @Schema(description = "ID")
    @TableId
    private Long id;

    @Schema(description = "ElderCare用户ID")
    private Long userId;

    @Schema(description = "触发设备ID（关联ec_health_devices表）")
    private Long healthDeviceId;

    @Schema(description = "AI设备ID（关联ai_device表，用于拨号）")
    private String aiDeviceId;

    @Schema(description = "紧急类型(fall_detected/heart_rate_abnormal/manual_trigger/no_response/medical_emergency)")
    private String emergencyType;

    @Schema(description = "触发源(wearable_device/ai_device/manual/sensor)")
    private String triggerSource;

    @Schema(description = "发生时间")
    private LocalDateTime timestamp;

    @Schema(description = "GPS位置(经纬度)")
    private String locationGps;

    @Schema(description = "地址信息")
    private String locationAddress;

    @Schema(description = "室内位置(客厅/卧室/卫生间等)")
    private String indoorLocation;

    @Schema(description = "紧急时刻的健康数据快照(JSON格式)")
    private String emergencyHealthData;

    @Schema(description = "严重程度(1轻微 2中等 3严重 4危急)")
    private Integer severityLevel;

    @Schema(description = "是否自动拨号(0否 1是)")
    private Integer autoCallTriggered;

    @Schema(description = "拨号号码列表(JSON格式)")
    private String callNumbers;

    @Schema(description = "拨号结果(JSON格式：成功、失败、接听状态等)")
    private String callResults;

    @Schema(description = "响应时间")
    private LocalDateTime responseTime;

    @Schema(description = "处理状态(triggered/calling/answered/resolved/false_alarm)")
    private String status;

    @Schema(description = "处理人信息(JSON格式)")
    private String handlerInfo;

    @Schema(description = "处理结果备注")
    private String resolutionNotes;
}