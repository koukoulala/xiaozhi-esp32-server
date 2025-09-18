package xiaozhi.modules.eldercare.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import xiaozhi.common.entity.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * ElderCare健康设备实体（与AI Agent插件集成）
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Data
@EqualsAndHashCode(callSuper=false)
@Schema(description = "ElderCare健康设备-与AI Agent插件集成")
@TableName("ec_health_devices")
public class EcHealthDevicesEntity extends BaseEntity {

    @Schema(description = "ID")
    @TableId
    private Long id;

    @Schema(description = "ElderCare用户ID")
    private Long userId;

    @Schema(description = "AI智能体ID（关联ai_agent表）")
    private String aiAgentId;

    @Schema(description = "健康设备插件ID（用于ai_agent_plugin_mapping）")
    private String pluginId;

    @Schema(description = "设备名称（如：Apple Watch Series 8）")
    private String deviceName;

    @Schema(description = "设备类型(smart_watch/blood_pressure_monitor/glucose_meter/fitness_tracker)")
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