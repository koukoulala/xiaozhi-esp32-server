package xiaozhi.modules.eldercare.dao;

import xiaozhi.common.dao.BaseDao;
import xiaozhi.modules.eldercare.entity.EcHealthDataEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * ElderCare健康数据采集
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Mapper
public interface EcHealthDataDao extends BaseDao<EcHealthDataEntity> {

    /**
     * 根据用户ID和时间范围查询健康数据
     */
    List<EcHealthDataEntity> getByUserIdAndDateRange(@Param("userId") Long userId, 
                                                    @Param("startDate") LocalDateTime startDate, 
                                                    @Param("endDate") LocalDateTime endDate);

    /**
     * 根据用户ID和数据类型查询健康数据
     */
    List<EcHealthDataEntity> getByUserIdAndDataType(@Param("userId") Long userId, 
                                                   @Param("dataType") String dataType,
                                                   @Param("limit") Integer limit);

    /**
     * 获取用户最新的健康数据
     */
    EcHealthDataEntity getLatestByUserId(@Param("userId") Long userId);

    /**
     * 根据健康设备ID查询数据
     */
    List<EcHealthDataEntity> getByHealthDeviceId(@Param("healthDeviceId") Long healthDeviceId,
                                               @Param("startDate") LocalDateTime startDate,
                                               @Param("endDate") LocalDateTime endDate);

    /**
     * 查询紧急情况数据
     */
    List<EcHealthDataEntity> getEmergencyData(@Param("userId") Long userId,
                                            @Param("startDate") LocalDateTime startDate,
                                            @Param("endDate") LocalDateTime endDate);
}
