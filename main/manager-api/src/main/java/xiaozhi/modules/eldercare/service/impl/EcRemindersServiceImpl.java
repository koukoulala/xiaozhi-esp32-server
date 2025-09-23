package xiaozhi.modules.eldercare.service.impl;

import xiaozhi.common.service.impl.CrudServiceImpl;
import xiaozhi.common.utils.ConvertUtils;
import xiaozhi.common.utils.Result;
import xiaozhi.modules.eldercare.dao.EcRemindersDao;
import xiaozhi.modules.eldercare.dto.EcRemindersDTO;
import xiaozhi.modules.eldercare.entity.EcRemindersEntity;
import xiaozhi.modules.eldercare.service.EcRemindersService;

import org.springframework.stereotype.Service;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * ElderCare提醒管理服务实现
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Service
public class EcRemindersServiceImpl extends CrudServiceImpl<EcRemindersDao, EcRemindersEntity, EcRemindersDTO> implements EcRemindersService {

    @Override
    public QueryWrapper<EcRemindersEntity> getWrapper(Map<String, Object> params) {
        String userId = (String) params.get("userId");
        String reminderType = (String) params.get("reminderType");
        String status = (String) params.get("status");

        QueryWrapper<EcRemindersEntity> wrapper = new QueryWrapper<>();
        wrapper.eq(userId != null, "user_id", userId);
        wrapper.eq(reminderType != null, "reminder_type", reminderType);
        wrapper.eq(status != null, "status", status);
        wrapper.orderByAsc("scheduled_time");

        return wrapper;
    }

    @Override
    public List<EcRemindersDTO> getByUserId(Long userId) {
        QueryWrapper<EcRemindersEntity> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId);
        wrapper.orderByAsc("scheduled_time");
        
        List<EcRemindersEntity> entityList = baseDao.selectList(wrapper);
        return ConvertUtils.sourceToTarget(entityList, EcRemindersDTO.class);
    }

    @Override
    public Result<String> createReminder(EcRemindersDTO dto) {
        try {
            EcRemindersEntity entity = ConvertUtils.sourceToTarget(dto, EcRemindersEntity.class);
            entity.setCreateDate(new java.util.Date()); // 使用Date类型
            entity.setStatus("pending");
            baseDao.insert(entity);
            return new Result<String>().ok("提醒创建成功");
        } catch (Exception e) {
            return new Result<String>().error("提醒创建失败: " + e.getMessage());
        }
    }

    @Override
    public Result<String> completeReminder(Long reminderId) {
        try {
            EcRemindersEntity entity = baseDao.selectById(reminderId);
            if (entity != null) {
                entity.setStatus("completed");
                entity.setCompletedTime(LocalDateTime.now()); // 使用实体中定义的字段
                baseDao.updateById(entity);
                return new Result<String>().ok("提醒已完成");
            }
            return new Result<String>().error("提醒不存在");
        } catch (Exception e) {
            return new Result<String>().error("完成提醒失败: " + e.getMessage());
        }
    }

    @Override
    public Result<String> snoozeReminder(Long reminderId, Integer minutes) {
        try {
            EcRemindersEntity entity = baseDao.selectById(reminderId);
            if (entity != null) {
                entity.setScheduledTime(entity.getScheduledTime().plusMinutes(minutes));
                baseDao.updateById(entity);
                return new Result<String>().ok("提醒已推迟" + minutes + "分钟");
            }
            return new Result<String>().error("提醒不存在");
        } catch (Exception e) {
            return new Result<String>().error("推迟提醒失败: " + e.getMessage());
        }
    }

    @Override
    public List<EcRemindersDTO> getPendingReminders() {
        QueryWrapper<EcRemindersEntity> wrapper = new QueryWrapper<>();
        wrapper.eq("status", "pending");
        wrapper.le("scheduled_time", LocalDateTime.now());
        wrapper.orderByAsc("scheduled_time");
        
        List<EcRemindersEntity> entityList = baseDao.selectList(wrapper);
        return ConvertUtils.sourceToTarget(entityList, EcRemindersDTO.class);
    }

    @Override
    public List<EcRemindersDTO> getByReminderType(Long userId, String reminderType) {
        QueryWrapper<EcRemindersEntity> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId);
        wrapper.eq("reminder_type", reminderType);
        wrapper.orderByAsc("scheduled_time");
        
        List<EcRemindersEntity> entityList = baseDao.selectList(wrapper);
        return ConvertUtils.sourceToTarget(entityList, EcRemindersDTO.class);
    }

    @Override
    public Result<String> triggerReminder(Long reminderId) {
        // TODO: 实现TTS语音提醒功能
        // 这里应该调用TTS服务发送语音提醒
        try {
            EcRemindersEntity entity = baseDao.selectById(reminderId);
            if (entity != null) {
                entity.setStatus("triggered");
                entity.setLastTriggeredTime(LocalDateTime.now()); // 使用实体中定义的字段
                baseDao.updateById(entity);
                return new Result<String>().ok("语音提醒已发送");
            }
            return new Result<String>().error("提醒不存在");
        } catch (Exception e) {
            return new Result<String>().error("发送提醒失败: " + e.getMessage());
        }
    }

    @Override
    public List<EcRemindersDTO> getTodayReminders(Long userId) {
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        
        QueryWrapper<EcRemindersEntity> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId);
        wrapper.ge("scheduled_time", startOfDay);
        wrapper.lt("scheduled_time", endOfDay);
        wrapper.orderByAsc("scheduled_time");
        
        List<EcRemindersEntity> entityList = baseDao.selectList(wrapper);
        return ConvertUtils.sourceToTarget(entityList, EcRemindersDTO.class);
    }

    @Override
    public Result<String> pauseReminder(Long reminderId) {
        try {
            EcRemindersEntity entity = baseDao.selectById(reminderId);
            if (entity != null) {
                entity.setStatus("paused");
                baseDao.updateById(entity);
                return new Result<String>().ok("提醒已暂停");
            }
            return new Result<String>().error("提醒不存在");
        } catch (Exception e) {
            return new Result<String>().error("暂停提醒失败: " + e.getMessage());
        }
    }

    @Override
    public Result<String> resumeReminder(Long reminderId) {
        try {
            EcRemindersEntity entity = baseDao.selectById(reminderId);
            if (entity != null) {
                entity.setStatus("pending");
                baseDao.updateById(entity);
                return new Result<String>().ok("提醒已恢复");
            }
            return new Result<String>().error("提醒不存在");
        } catch (Exception e) {
            return new Result<String>().error("恢复提醒失败: " + e.getMessage());
        }
    }

    @Override
    public List<EcRemindersDTO> getUserReminders(Map<String, Object> params) {
        Long userId = Long.valueOf(params.get("user_id").toString());
        Integer days = Integer.valueOf(params.get("days").toString());
        
        LocalDateTime endDate = LocalDateTime.now();
        LocalDateTime startDate = endDate.minusDays(days);
        
        QueryWrapper<EcRemindersEntity> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId);
        wrapper.ge("scheduled_time", startDate);
        wrapper.le("scheduled_time", endDate);
        wrapper.orderByDesc("scheduled_time");
        wrapper.last("LIMIT " + (days * 10)); // 限制数据量
        
        List<EcRemindersEntity> entityList = baseDao.selectList(wrapper);
        return ConvertUtils.sourceToTarget(entityList, EcRemindersDTO.class);
    }
}