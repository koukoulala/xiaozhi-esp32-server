package xiaozhi.modules.eldercare.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import xiaozhi.common.entity.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * ElderCare系统配置实体
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Data
@EqualsAndHashCode(callSuper=false)
@Schema(description = "ElderCare系统配置表")
@TableName("ec_system_config")
public class EcSystemConfigEntity extends BaseEntity {

    @Schema(description = "ID")
    @TableId
    private Long id;

    @Schema(description = "配置键")
    private String configKey;

    @Schema(description = "配置值")
    private String configValue;

    @Schema(description = "配置类型(string/number/boolean/json)")
    private String configType;

    @Schema(description = "配置描述")
    private String description;

    @Schema(description = "配置分类(system/health/emergency/tts/device)")
    private String category;

    @Schema(description = "是否公开(0否 1是)")
    private Integer isPublic;
}