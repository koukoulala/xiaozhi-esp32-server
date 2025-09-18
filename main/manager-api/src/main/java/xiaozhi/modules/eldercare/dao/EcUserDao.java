package xiaozhi.modules.eldercare.dao;

import xiaozhi.common.dao.BaseDao;
import xiaozhi.modules.eldercare.entity.EcUserEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * ElderCare用户
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Mapper
public interface EcUserDao extends BaseDao<EcUserEntity> {

    /**
     * 根据用户名查询用户
     */
    EcUserEntity getByUsername(@Param("username") String username);

    /**
     * 根据手机号查询用户
     */
    EcUserEntity getByPhone(@Param("phone") String phone);

    /**
     * 根据邮箱查询用户
     */
    EcUserEntity getByEmail(@Param("email") String email);
}
