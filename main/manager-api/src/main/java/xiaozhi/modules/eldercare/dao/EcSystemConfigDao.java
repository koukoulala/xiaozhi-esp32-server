package xiaozhi.modules.eldercare.dao;

import xiaozhi.common.dao.BaseDao;
import xiaozhi.modules.eldercare.entity.EcSystemConfigEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * ElderCare系统配置
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Mapper
public interface EcSystemConfigDao extends BaseDao<EcSystemConfigEntity> {

    /**
     * 根据配置键查询配置
     */
    EcSystemConfigEntity getByConfigKey(@Param("configKey") String configKey);

    /**
     * 根据分类查询配置
     */
    List<EcSystemConfigEntity> getByCategory(@Param("category") String category);

    /**
     * 查询公开配置
     */
    List<EcSystemConfigEntity> getPublicConfigs();

    /**
     * 根据配置类型查询配置
     */
    List<EcSystemConfigEntity> getByConfigType(@Param("configType") String configType);
}