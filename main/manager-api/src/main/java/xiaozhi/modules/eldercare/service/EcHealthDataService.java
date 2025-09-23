package xiaozhi.modules.eldercare.service;

import xiaozhi.common.service.CrudService;
import xiaozhi.modules.eldercare.dto.EcHealthDataDTO;
import xiaozhi.modules.eldercare.entity.EcHealthDataEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * ElderCare健康数据
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
public interface EcHealthDataService extends CrudService<EcHealthDataEntity, EcHealthDataDTO> {

    /**
     * 根据用户ID和时间范围查询健康数据
     */
    List<EcHealthDataDTO> getByUserIdAndDateRange(Long userId, LocalDateTime startDate, LocalDateTime endDate);

    /**
     * 获取用户最新的健康数据
     */
    EcHealthDataDTO getLatestByUserId(Long userId);

    /**
     * 根据参数获取用户健康数据（支持天数过滤）
     */
    List<EcHealthDataDTO> getUserHealthData(Map<String, Object> params);

    /**
     * 生成健康报告
     */
    Map<String, Object> generateHealthReport(Map<String, Object> params);
}
