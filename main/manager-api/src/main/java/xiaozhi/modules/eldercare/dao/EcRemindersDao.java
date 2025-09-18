package xiaozhi.modules.eldercare.dao;

import xiaozhi.common.dao.BaseDao;
import xiaozhi.modules.eldercare.entity.EcRemindersEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * ElderCare提醒管理
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Mapper
public interface EcRemindersDao extends BaseDao<EcRemindersEntity> {

    /**
     * 根据用户ID查询提醒
     */
    List<EcRemindersEntity> getByUserId(@Param("userId") Long userId);

    /**
     * 根据提醒类型查询提醒
     */
    List<EcRemindersEntity> getByReminderType(@Param("userId") Long userId, 
                                            @Param("reminderType") String reminderType);

    /**
     * 查询待处理的提醒
     */
    List<EcRemindersEntity> getPendingReminders(@Param("currentTime") LocalDateTime currentTime);

    /**
     * 查询指定时间范围内的提醒
     */
    List<EcRemindersEntity> getByTimeRange(@Param("userId") Long userId,
                                         @Param("startTime") LocalDateTime startTime,
                                         @Param("endTime") LocalDateTime endTime);

    /**
     * 查询活跃状态的提醒
     */
    List<EcRemindersEntity> getActiveReminders(@Param("userId") Long userId);
}