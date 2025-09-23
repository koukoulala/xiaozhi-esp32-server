package xiaozhi.modules.eldercare.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import xiaozhi.modules.eldercare.dto.EcHealthDataDTO;
import xiaozhi.modules.eldercare.dto.EcRemindersDTO;
import xiaozhi.modules.eldercare.service.EcHealthDataService;
import xiaozhi.modules.eldercare.service.EcRemindersService;
import xiaozhi.common.utils.Result;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;
import java.util.HashMap;
import java.util.ArrayList;
import java.time.LocalDateTime;

/**
 * ElderCare监控数据控制器 - 整合各种监控数据
 *
 * @author assistant
 * @since 1.0.0 2025-09-22
 */
@RestController
@RequestMapping("/eldercare/monitor")
@Tag(name="ElderCare监控数据")
public class EcMonitorController {

    @Autowired
    private EcHealthDataService ecHealthDataService;

    @Autowired
    private EcRemindersService ecRemindersService;

    @GetMapping("/data")
    @Operation(summary = "获取综合监控数据")
    public Result<Map<String, Object>> getMonitorData(
            @RequestParam("user_id") Long userId,
            @RequestParam(value = "days", defaultValue = "7") Integer days) {
        
        Map<String, Object> result = new HashMap<>();
        
        try {
            // 获取健康数据
            Map<String, Object> healthParams = new HashMap<>();
            healthParams.put("user_id", userId);
            healthParams.put("days", days);
            List<EcHealthDataDTO> healthData = ecHealthDataService.getUserHealthData(healthParams);
            
            // 获取提醒数据
            Map<String, Object> reminderParams = new HashMap<>();
            reminderParams.put("user_id", userId);
            reminderParams.put("days", days);
            List<EcRemindersDTO> reminders = ecRemindersService.getUserReminders(reminderParams);
            
            // 构建返回数据
            result.put("success", true);
            result.put("health_data", healthData != null ? healthData : new ArrayList<>());
            result.put("reminders", reminders != null ? reminders : new ArrayList<>());
            result.put("emergency_calls", new ArrayList<>()); // 暂时返回空数组，后续可以扩展
            
            // 设备状态 - 简单的模拟逻辑
            String deviceStatus = "offline";
            String lastActivity = "未知";
            
            if (healthData != null && !healthData.isEmpty()) {
                deviceStatus = "online";
                EcHealthDataDTO latest = healthData.get(0);
                if (latest.getTimestamp() != null) {
                    lastActivity = latest.getTimestamp().toString();
                }
            }
            
            result.put("device_status", deviceStatus);
            result.put("last_activity", lastActivity);
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "获取监控数据失败: " + e.getMessage());
            result.put("health_data", new ArrayList<>());
            result.put("reminders", new ArrayList<>());
            result.put("emergency_calls", new ArrayList<>());
            result.put("device_status", "offline");
            result.put("last_activity", "未知");
        }
        
        return new Result<Map<String, Object>>().ok(result);
    }

    @GetMapping("/status")
    @Operation(summary = "获取设备状态")
    public Result<Map<String, Object>> getDeviceStatus(@RequestParam("device_id") String deviceId) {
        Map<String, Object> status = new HashMap<>();
        
        // 简单的设备状态检查逻辑
        // 实际项目中这里应该查询设备表或缓存
        status.put("status", "online");
        status.put("last_activity", LocalDateTime.now().toString());
        status.put("device_id", deviceId);
        
        return new Result<Map<String, Object>>().ok(status);
    }
}