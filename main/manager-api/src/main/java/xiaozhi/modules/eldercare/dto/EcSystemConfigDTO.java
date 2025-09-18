package xiaozhi.modules.eldercare.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.io.Serializable;

/**
 * ElderCare系统配置DTO
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Data
@Schema(description = "ElderCare系统配置")
public class EcSystemConfigDTO implements Serializable {
    
    private static final long serialVersionUID = 1L;

    @Schema(description = "配置键")
    @NotBlank(message = "配置键不能为空")
    @Pattern(regexp = "^[a-zA-Z0-9_.]+$", message = "配置键只能包含字母、数字、下划线和点号")
    private String configKey;

    @Schema(description = "配置值")
    private String configValue;

    @Schema(description = "配置类型", allowableValues = {"string", "number", "boolean", "json"})
    @NotBlank(message = "配置类型不能为空")
    private String configType;

    @Schema(description = "配置描述")
    private String description;

    @Schema(description = "配置分类", allowableValues = {"system", "health", "emergency", "tts", "device", "reminder"})
    private String category;

    @Schema(description = "是否公开(0否 1是)")
    private Integer isPublic;

    @Schema(description = "配置值(解析为字符串)")
    public String getValueAsString() {
        return configValue;
    }

    @Schema(description = "配置值(解析为数字)")
    public Integer getValueAsInteger() {
        if (configValue == null || configValue.trim().isEmpty()) {
            return null;
        }
        try {
            return Integer.parseInt(configValue.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @Schema(description = "配置值(解析为布尔)")
    public Boolean getValueAsBoolean() {
        if (configValue == null || configValue.trim().isEmpty()) {
            return null;
        }
        return "true".equalsIgnoreCase(configValue.trim()) || 
               "1".equals(configValue.trim()) || 
               "yes".equalsIgnoreCase(configValue.trim());
    }

    @Schema(description = "配置值(解析为双精度)")
    public Double getValueAsDouble() {
        if (configValue == null || configValue.trim().isEmpty()) {
            return null;
        }
        try {
            return Double.parseDouble(configValue.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}