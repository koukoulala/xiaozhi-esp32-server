package xiaozhi.modules.eldercare.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import xiaozhi.common.validator.group.AddGroup;
import xiaozhi.common.validator.group.UpdateGroup;
import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * ElderCare健康设备DTO
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Data
@Schema(description = "ElderCare健康设备-与AI Agent插件集成")
public class EcHealthDevicesDTO {

    @Schema(description = "ID")
    private Long id;

    @Schema(description = "ElderCare用户ID")
    @NotNull(message = "用户ID不能为空", groups = {AddGroup.class, UpdateGroup.class})
    private Long userId;

    @Schema(description = "AI智能体ID（关联ai_agent表）")
    private String aiAgentId;

    @Schema(description = "健康设备插件ID（用于ai_agent_plugin_mapping）")
    private String pluginId;

    @Schema(description = "设备名称（如：Apple Watch Series 8）")
    @NotBlank(message = "设备名称不能为空", groups = {AddGroup.class, UpdateGroup.class})
    private String deviceName;

    @Schema(description = "设备类型(smart_watch/blood_pressure_monitor/glucose_meter/fitness_tracker)")
    @NotBlank(message = "设备类型不能为空", groups = {AddGroup.class, UpdateGroup.class})
    private String deviceType;

    @Schema(description = "设备品牌(apple/huawei/xiaomi/omron)")
    private String deviceBrand;

    @Schema(description = "设备型号")
    private String deviceModel;

    @Schema(description = "MAC地址或设备标识符")
    private String macAddress;

    @Schema(description = "健康监控功能(JSON格式：心率、血压、血氧、体温、步数、睡眠、跌倒检测等)")
    private String healthFeatures;

    @Schema(description = "传感器配置(JSON格式：采样频率、阈值设置等)")
    private String sensorConfig;

    @Schema(description = "数据同步配置(JSON格式：同步频率、数据格式等)")
    private String dataSyncConfig;

    @Schema(description = "连接状态(connected/disconnected/pairing)")
    private String connectionStatus;

    @Schema(description = "电池电量百分比")
    private Integer batteryLevel;

    @Schema(description = "固件版本")
    private String firmwareVersion;

    @Schema(description = "最后同步时间")
    private LocalDateTime lastSyncTime;

    @Schema(description = "是否激活(0否 1是)")
    private Integer isActive;
}