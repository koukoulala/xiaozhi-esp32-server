package xiaozhi.modules.eldercare.dao;

import xiaozhi.common.dao.BaseDao;
import xiaozhi.modules.eldercare.entity.EcHealthDevicesEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * ElderCare健康设备
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Mapper
public interface EcHealthDevicesDao extends BaseDao<EcHealthDevicesEntity> {

    /**
     * 根据用户ID查询设备
     */
    List<EcHealthDevicesEntity> getByUserId(@Param("userId") Long userId);

    /**
     * 根据MAC地址查询设备
     */
    EcHealthDevicesEntity getByMacAddress(@Param("macAddress") String macAddress);

    /**
     * 根据设备类型查询设备
     */
    List<EcHealthDevicesEntity> getByDeviceType(@Param("deviceType") String deviceType);

    /**
     * 根据AI智能体ID查询设备
     */
    List<EcHealthDevicesEntity> getByAiAgentId(@Param("aiAgentId") String aiAgentId);

    /**
     * 查询在线设备
     */
    List<EcHealthDevicesEntity> getConnectedDevices(@Param("userId") Long userId);
}