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
import java.util.HashMap;
import java.util.ArrayList;

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

    @Override
    public List<EcHealthDataDTO> getUserHealthData(Map<String, Object> params) {
        Long userId = Long.valueOf(params.get("user_id").toString());
        Integer days = Integer.valueOf(params.get("days").toString());
        
        LocalDateTime endDate = LocalDateTime.now();
        LocalDateTime startDate = endDate.minusDays(days);
        
        QueryWrapper<EcHealthDataEntity> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", userId);
        wrapper.ge("timestamp", startDate);
        wrapper.le("timestamp", endDate);
        wrapper.orderByDesc("timestamp");
        wrapper.last("LIMIT " + (days * 24)); // 限制数据量，避免过多数据
        
        List<EcHealthDataEntity> entityList = baseDao.selectList(wrapper);
        return ConvertUtils.sourceToTarget(entityList, EcHealthDataDTO.class);
    }

    @Override
    public Map<String, Object> generateHealthReport(Map<String, Object> params) {
        Long userId = Long.valueOf(params.get("user_id").toString());
        String startDate = params.get("start_date").toString();
        String endDate = params.get("end_date").toString();
        
        // 获取时间范围内的健康数据
        LocalDateTime start = LocalDateTime.parse(startDate + "T00:00:00");
        LocalDateTime end = LocalDateTime.parse(endDate + "T23:59:59");
        
        List<EcHealthDataDTO> healthData = getByUserIdAndDateRange(userId, start, end);
        
        // 生成统计报告
        Map<String, Object> report = new HashMap<>();
        report.put("user_id", userId);
        report.put("start_date", startDate);
        report.put("end_date", endDate);
        report.put("data_count", healthData.size());
        report.put("report_generated_at", LocalDateTime.now().toString());
        
        if (!healthData.isEmpty()) {
            // 计算平均值等统计信息
            double avgHeartRate = healthData.stream()
                .filter(h -> h.getHeartRate() != null)
                .mapToDouble(h -> h.getHeartRate().doubleValue())
                .average().orElse(0.0);
            
            double avgSystolic = healthData.stream()
                .filter(h -> h.getBloodPressureSystolic() != null)
                .mapToDouble(h -> h.getBloodPressureSystolic().doubleValue())
                .average().orElse(0.0);
                
            double avgTemperature = healthData.stream()
                .filter(h -> h.getTemperature() != null)
                .mapToDouble(h -> h.getTemperature().doubleValue())
                .average().orElse(0.0);
            
            Map<String, Object> statistics = new HashMap<>();
            statistics.put("average_heart_rate", Math.round(avgHeartRate * 100.0) / 100.0);
            statistics.put("average_systolic_bp", Math.round(avgSystolic * 100.0) / 100.0);
            statistics.put("average_temperature", Math.round(avgTemperature * 100.0) / 100.0);
            
            report.put("statistics", statistics);
            report.put("health_status", avgHeartRate > 0 ? "normal" : "no_data");
        } else {
            report.put("statistics", new HashMap<>());
            report.put("health_status", "no_data");
        }
        
        return report;
    }
}
