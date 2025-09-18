package xiaozhi.modules.eldercare.service;

import xiaozhi.common.service.CrudService;
import xiaozhi.modules.eldercare.dto.EcUserDTO;
import xiaozhi.modules.eldercare.dto.EcLoginDTO;
import xiaozhi.modules.eldercare.dto.EcRegisterDTO;
import xiaozhi.modules.eldercare.entity.EcUserEntity;
import xiaozhi.common.utils.Result;

/**
 * ElderCare用户
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
public interface EcUserService extends CrudService<EcUserEntity, EcUserDTO> {

    /**
     * 用户注册
     */
    Result<String> register(EcRegisterDTO dto);

    /**
     * 用户登录
     */
    Result<EcUserDTO> login(EcLoginDTO dto);

    /**
     * 根据用户名查询用户
     */
    EcUserEntity getByUsername(String username);

    /**
     * 根据手机号查询用户
     */
    EcUserEntity getByPhone(String phone);

    /**
     * 根据邮箱查询用户
     */
    EcUserEntity getByEmail(String email);

    /**
     * 验证密码
     */
    boolean verifyPassword(String password, String hashedPassword);

    /**
     * 加密密码
     */
    String encryptPassword(String password);
}
