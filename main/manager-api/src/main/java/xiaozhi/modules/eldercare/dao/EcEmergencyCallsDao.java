package xiaozhi.modules.eldercare.dao;

import xiaozhi.common.dao.BaseDao;
import xiaozhi.modules.eldercare.entity.EcEmergencyCallsEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * ElderCare紧急呼救记录
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Mapper
public interface EcEmergencyCallsDao extends BaseDao<EcEmergencyCallsEntity> {

    /**
     * 根据用户ID查询紧急呼救记录
     */
    List<EcEmergencyCallsEntity> getByUserId(@Param("userId") Long userId);

    /**
     * 根据紧急类型查询记录
     */
    List<EcEmergencyCallsEntity> getByEmergencyType(@Param("userId") Long userId, 
                                                  @Param("emergencyType") String emergencyType);

    /**
     * 根据严重程度查询记录
     */
    List<EcEmergencyCallsEntity> getBySeverityLevel(@Param("userId") Long userId,
                                                  @Param("severityLevel") Integer severityLevel);

    /**
     * 查询未处理的紧急呼救
     */
    List<EcEmergencyCallsEntity> getUnresolvedEmergencies();

    /**
     * 查询指定时间范围内的紧急记录
     */
    List<EcEmergencyCallsEntity> getByTimeRange(@Param("userId") Long userId,
                                              @Param("startTime") LocalDateTime startTime,
                                              @Param("endTime") LocalDateTime endTime);

    /**
     * 查询最新的紧急记录
     */
    EcEmergencyCallsEntity getLatestByUserId(@Param("userId") Long userId);
}