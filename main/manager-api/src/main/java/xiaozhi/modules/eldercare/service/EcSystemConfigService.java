package xiaozhi.modules.eldercare.service;

import xiaozhi.common.service.CrudService;
import xiaozhi.modules.eldercare.dto.EcSystemConfigDTO;
import xiaozhi.modules.eldercare.entity.EcSystemConfigEntity;
import xiaozhi.common.utils.Result;

import java.util.List;
import java.util.Map;

/**
 * ElderCare系统配置服务
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
public interface EcSystemConfigService extends CrudService<EcSystemConfigEntity, EcSystemConfigDTO> {

    /**
     * 根据配置键获取配置
     */
    EcSystemConfigDTO getByConfigKey(String configKey);

    /**
     * 根据分类获取配置
     */
    List<EcSystemConfigDTO> getByCategory(String category);

    /**
     * 获取公开配置
     */
    List<EcSystemConfigDTO> getPublicConfigs();

    /**
     * 更新配置值
     */
    Result<String> updateConfigValue(String configKey, String configValue);

    /**
     * 批量更新配置
     */
    Result<String> batchUpdateConfigs(Map<String, String> configMap);

    /**
     * 获取配置值（字符串）
     */
    String getConfigValueAsString(String configKey, String defaultValue);

    /**
     * 获取配置值（数字）
     */
    Integer getConfigValueAsInteger(String configKey, Integer defaultValue);

    /**
     * 获取配置值（布尔）
     */
    Boolean getConfigValueAsBoolean(String configKey, Boolean defaultValue);

    /**
     * 获取配置值（JSON对象）
     */
    <T> T getConfigValueAsObject(String configKey, Class<T> clazz);

    /**
     * 验证配置值
     */
    Result<String> validateConfigValue(String configKey, String configValue, String configType);
}