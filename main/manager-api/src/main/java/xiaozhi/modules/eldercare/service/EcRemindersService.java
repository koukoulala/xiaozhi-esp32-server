package xiaozhi.modules.eldercare.service;

import xiaozhi.common.service.CrudService;
import xiaozhi.modules.eldercare.dto.EcRemindersDTO;
import xiaozhi.modules.eldercare.entity.EcRemindersEntity;
import xiaozhi.common.utils.Result;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * ElderCare提醒管理服务
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
public interface EcRemindersService extends CrudService<EcRemindersEntity, EcRemindersDTO> {

    /**
     * 根据用户ID获取提醒列表
     */
    List<EcRemindersDTO> getByUserId(Long userId);

    /**
     * 创建提醒
     */
    Result<String> createReminder(EcRemindersDTO dto);

    /**
     * 完成提醒
     */
    Result<String> completeReminder(Long reminderId);

    /**
     * 推迟提醒
     */
    Result<String> snoozeReminder(Long reminderId, Integer minutes);

    /**
     * 获取待处理的提醒
     */
    List<EcRemindersDTO> getPendingReminders();

    /**
     * 根据提醒类型查询
     */
    List<EcRemindersDTO> getByReminderType(Long userId, String reminderType);

    /**
     * 触发提醒（发送TTS语音）
     */
    Result<String> triggerReminder(Long reminderId);

    /**
     * 获取今日提醒
     */
    List<EcRemindersDTO> getTodayReminders(Long userId);

    /**
     * 暂停提醒
     */
    Result<String> pauseReminder(Long reminderId);

    /**
     * 恢复提醒
     */
    Result<String> resumeReminder(Long reminderId);

    /**
     * 根据参数获取用户提醒数据（支持天数过滤）
     */
    List<EcRemindersDTO> getUserReminders(Map<String, Object> params);
}