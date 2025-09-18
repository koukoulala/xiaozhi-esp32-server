package xiaozhi.modules.eldercare.service;

import xiaozhi.common.service.CrudService;
import xiaozhi.modules.eldercare.dto.EcHealthDevicesDTO;
import xiaozhi.modules.eldercare.entity.EcHealthDevicesEntity;
import xiaozhi.common.utils.Result;

import java.util.List;

/**
 * ElderCare健康设备服务
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
public interface EcHealthDevicesService extends CrudService<EcHealthDevicesEntity, EcHealthDevicesDTO> {

    /**
     * 根据用户ID获取设备列表
     */
    List<EcHealthDevicesDTO> getByUserId(Long userId);

    /**
     * 设备配对
     */
    Result<String> pairDevice(EcHealthDevicesDTO dto);

    /**
     * 设备连接
     */
    Result<String> connectDevice(Long deviceId);

    /**
     * 设备断开
     */
    Result<String> disconnectDevice(Long deviceId);

    /**
     * 更新设备状态
     */
    Result<String> updateDeviceStatus(Long deviceId, String status, Integer batteryLevel);

    /**
     * 获取在线设备
     */
    List<EcHealthDevicesDTO> getConnectedDevices(Long userId);

    /**
     * 根据MAC地址查询设备
     */
    EcHealthDevicesEntity getByMacAddress(String macAddress);

    /**
     * 同步设备数据
     */
    Result<String> syncDeviceData(Long deviceId);
}