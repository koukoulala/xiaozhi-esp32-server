package xiaozhi.modules.eldercare.service;

import xiaozhi.common.service.CrudService;
import xiaozhi.modules.eldercare.dto.EcHealthDataDTO;
import xiaozhi.modules.eldercare.entity.EcHealthDataEntity;

import java.time.LocalDateTime;
import java.util.List;

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
}
