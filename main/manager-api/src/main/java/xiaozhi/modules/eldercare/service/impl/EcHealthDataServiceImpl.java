package xiaozhi.modules.eldercare.service.impl;

import xiaozhi.common.service.impl.CrudServiceImpl;
import xiaozhi.common.utils.ConvertUtils;
import xiaozhi.modules.eldercare.dao.EcHealthDataDao;
import xiaozhi.modules.eldercare.dto.EcHealthDataDTO;
import xiaozhi.modules.eldercare.entity.EcHealthDataEntity;
import xiaozhi.modules.eldercare.service.EcHealthDataService;

import org.springframework.stereotype.Service;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * ElderCare健康数据服务实现
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Service
public class EcHealthDataServiceImpl extends CrudServiceImpl<EcHealthDataDao, EcHealthDataEntity, EcHealthDataDTO> implements EcHealthDataService {

    @Override
    public QueryWrapper<EcHealthDataEntity> getWrapper(Map<String, Object> params) {
        String userId = (String) params.get("userId");
        String deviceId = (String) params.get("deviceId");
        String dataSource = (String) params.get("dataSource");

        QueryWrapper<EcHealthDataEntity> wrapper = new QueryWrapper<>();
        wrapper.eq(userId != null, "user_id", userId);
        wrapper.eq(deviceId != null, "device_id", deviceId);
        wrapper.eq(dataSource != null, "data_source", dataSource);
        wrapper.orderByDesc("timestamp");

        return wrapper;
    }

    @Override
    public List<EcHealthDataDTO> getByUserIdAndDateRange(Long userId, LocalDateTime startDate, LocalDateTime endDate) {
        List<EcHealthDataEntity> entityList = baseDao.getByUserIdAndDateRange(userId, startDate, endDate);
        return ConvertUtils.sourceToTarget(entityList, EcHealthDataDTO.class);
    }

    @Override
    public EcHealthDataDTO getLatestByUserId(Long userId) {
        EcHealthDataEntity entity = baseDao.getLatestByUserId(userId);
        return ConvertUtils.sourceToTarget(entity, EcHealthDataDTO.class);
    }
}
