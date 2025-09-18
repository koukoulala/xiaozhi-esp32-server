package xiaozhi.modules.eldercare.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import xiaozhi.common.validator.group.AddGroup;
import xiaozhi.common.validator.group.UpdateGroup;
import lombok.Data;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.Date;

/**
 * ElderCare健康数据DTO
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Data
@Schema(description = "ElderCare健康数据")
public class EcHealthDataDTO {

    @Schema(description = "ID")
    private Long id;

    @Schema(description = "用户ID")
    @NotNull(message = "用户ID不能为空", groups = {AddGroup.class})
    private Long userId;

    @Schema(description = "设备ID")
    @NotNull(message = "设备ID不能为空", groups = {AddGroup.class})
    private String deviceId;

    @Schema(description = "采集时间")
    private Date timestamp;

    @Schema(description = "心率")
    private Integer heartRate;

    @Schema(description = "收缩压")
    private Integer bloodPressureSystolic;

    @Schema(description = "舒张压")
    private Integer bloodPressureDiastolic;

    @Schema(description = "体温")
    private BigDecimal temperature;

    @Schema(description = "血氧")
    private Integer bloodOxygen;

    @Schema(description = "活动水平(low/medium/high)")
    private String activityLevel;

    @Schema(description = "跌倒检测(0否 1是)")
    private Integer fallDetected;

    @Schema(description = "数据来源")
    private String dataSource;

    @Schema(description = "原始数据(JSON)")
    private String rawData;

    @Schema(description = "创建时间")
    private Date createDate;
}
