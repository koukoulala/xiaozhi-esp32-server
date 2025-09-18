package xiaozhi.modules.eldercare.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ElderCare健康数据采集实体
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Data
@Schema(description = "ElderCare健康数据采集表")
@TableName("ec_health_data")
public class EcHealthDataEntity {

    @Schema(description = "ID")
    @TableId
    private Long id;

    @Schema(description = "ElderCare用户ID")
    private Long userId;

    @Schema(description = "健康设备ID（关联ec_health_devices表）")
    private Long healthDeviceId;

    @Schema(description = "AI设备ID（关联ai_device表）")
    private String aiDeviceId;

    @Schema(description = "数据采集时间")
    private LocalDateTime timestamp;

    @Schema(description = "数据类型(heart_rate/blood_pressure/glucose/temperature/oxygen/activity/sleep)")
    private String dataType;

    // 生命体征数据
    @Schema(description = "心率(次/分)")
    private Integer heartRate;

    @Schema(description = "收缩压(mmHg)")
    private Integer bloodPressureSystolic;

    @Schema(description = "舒张压(mmHg)")
    private Integer bloodPressureDiastolic;

    @Schema(description = "血糖值(mmol/L)")
    private BigDecimal bloodGlucose;

    @Schema(description = "体温(°C)")
    private BigDecimal bodyTemperature;

    @Schema(description = "血氧饱和度(%)")
    private Integer bloodOxygen;

    // 运动和活动数据
    @Schema(description = "步数")
    private Integer stepCount;

    @Schema(description = "距离(km)")
    private BigDecimal distance;

    @Schema(description = "消耗卡路里")
    private Integer caloriesBurned;

    @Schema(description = "活动水平(low/medium/high)")
    private String activityLevel;

    @Schema(description = "运动时长(分钟)")
    private Integer exerciseDuration;

    // 睡眠数据
    @Schema(description = "睡眠时长(分钟)")
    private Integer sleepDuration;

    @Schema(description = "深度睡眠时长(分钟)")
    private Integer deepSleepDuration;

    @Schema(description = "浅睡眠时长(分钟)")
    private Integer lightSleepDuration;

    @Schema(description = "睡眠质量评分(0-100)")
    private Integer sleepQualityScore;

    // 异常检测
    @Schema(description = "跌倒检测(0否 1是)")
    private Integer fallDetected;

    @Schema(description = "心率异常(0否 1是)")
    private Integer abnormalHeartRate;

    @Schema(description = "紧急情况触发(0否 1是)")
    private Integer emergencyTriggered;

    // 数据元信息
    @Schema(description = "数据来源(health_device/manual_input/ai_device)")
    private String dataSource;

    @Schema(description = "原始数据(JSON格式)")
    private String rawData;

    @Schema(description = "数据质量(good/fair/poor)")
    private String dataQuality;

    @Schema(description = "创建时间")
    private LocalDateTime createDate;
}
