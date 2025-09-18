package xiaozhi.modules.eldercare.service;

import xiaozhi.common.service.CrudService;
import xiaozhi.modules.eldercare.dto.EcEmergencyCallsDTO;
import xiaozhi.modules.eldercare.entity.EcEmergencyCallsEntity;
import xiaozhi.common.utils.Result;

import java.time.LocalDateTime;
import java.util.List;

/**
 * ElderCare紧急呼救服务
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
public interface EcEmergencyCallsService extends CrudService<EcEmergencyCallsEntity, EcEmergencyCallsDTO> {

    /**
     * 根据用户ID获取紧急记录
     */
    List<EcEmergencyCallsDTO> getByUserId(Long userId);

    /**
     * 触发紧急呼救
     */
    Result<String> triggerEmergencyCall(EcEmergencyCallsDTO dto);

    /**
     * 处理紧急呼救
     */
    Result<String> handleEmergencyCall(Long emergencyId, String handlerInfo, String notes);

    /**
     * 自动拨号
     */
    Result<String> autoCallEmergencyContacts(Long emergencyId);

    /**
     * 获取未处理的紧急呼救
     */
    List<EcEmergencyCallsDTO> getUnresolvedEmergencies();

    /**
     * 根据严重程度查询
     */
    List<EcEmergencyCallsDTO> getBySeverityLevel(Long userId, Integer severityLevel);

    /**
     * 标记为假警报
     */
    Result<String> markAsFalseAlarm(Long emergencyId, String reason);

    /**
     * 更新紧急状态
     */
    Result<String> updateEmergencyStatus(Long emergencyId, String status);

    /**
     * 获取紧急统计信息
     */
    Result<Object> getEmergencyStatistics(Long userId, LocalDateTime startDate, LocalDateTime endDate);
}