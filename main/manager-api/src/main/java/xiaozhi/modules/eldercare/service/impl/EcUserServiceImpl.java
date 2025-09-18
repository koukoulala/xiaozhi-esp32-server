package xiaozhi.modules.eldercare.service.impl;

import xiaozhi.common.service.impl.CrudServiceImpl;
import xiaozhi.modules.eldercare.dao.EcUserDao;
import xiaozhi.modules.eldercare.dto.EcLoginDTO;
import xiaozhi.modules.eldercare.dto.EcRegisterDTO;
import xiaozhi.modules.eldercare.dto.EcUserDTO;
import xiaozhi.modules.eldercare.entity.EcUserEntity;
import xiaozhi.modules.eldercare.service.EcUserService;
import xiaozhi.common.utils.Result;
import xiaozhi.common.utils.ConvertUtils;
import xiaozhi.modules.security.password.PasswordUtils;

import org.springframework.stereotype.Service;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;

import java.util.Map;

/**
 * ElderCare用户服务实现
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Service
public class EcUserServiceImpl extends CrudServiceImpl<EcUserDao, EcUserEntity, EcUserDTO> implements EcUserService {

    @Override
    public QueryWrapper<EcUserEntity> getWrapper(Map<String, Object> params) {
        String username = (String) params.get("username");
        String phone = (String) params.get("phone");
        String status = (String) params.get("status");

        QueryWrapper<EcUserEntity> wrapper = new QueryWrapper<>();
        wrapper.like(username != null, "username", username);
        wrapper.eq(phone != null, "phone", phone);
        wrapper.eq(status != null, "status", status);

        return wrapper;
    }

    @Override
    public Result<String> register(EcRegisterDTO dto) {
        // 验证确认密码
        if (!dto.getPassword().equals(dto.getConfirmPassword())) {
            return new Result<String>().error("两次密码不一致");
        }

        // 检查用户名是否已存在
        if (getByUsername(dto.getUsername()) != null) {
            return new Result<String>().error("用户名已存在");
        }

        // 检查手机号是否已存在
        if (getByPhone(dto.getPhone()) != null) {
            return new Result<String>().error("手机号已注册");
        }

        // 检查邮箱是否已存在
        if (dto.getEmail() != null && !dto.getEmail().isEmpty() && getByEmail(dto.getEmail()) != null) {
            return new Result<String>().error("邮箱已注册");
        }

        // 创建用户实体
        EcUserEntity user = new EcUserEntity();
        user.setUsername(dto.getUsername());
        user.setPassword(encryptPassword(dto.getPassword()));
        user.setRealName(dto.getRealName());
        user.setPhone(dto.getPhone());
        user.setEmail(dto.getEmail());
        user.setElderName(dto.getElderName());
        user.setElderProfile(dto.getElderInfo()); // DTO中叫elderInfo，Entity中叫elderProfile
        user.setStatus(1); // 默认启用

        insert(user);
        return new Result<String>().ok("注册成功");
    }

    @Override
    public Result<EcUserDTO> login(EcLoginDTO dto) {
        // 根据用户名/手机号/邮箱查询用户
        EcUserEntity user = getByUsername(dto.getUsername());
        if (user == null) {
            user = getByPhone(dto.getUsername());
        }
        if (user == null) {
            user = getByEmail(dto.getUsername());
        }

        if (user == null) {
            return new Result<EcUserDTO>().error("用户不存在");
        }

        // 验证密码
        if (!verifyPassword(dto.getPassword(), user.getPassword())) {
            return new Result<EcUserDTO>().error("密码错误");
        }

        // 检查用户状态
        if (user.getStatus() != 1) {
            return new Result<EcUserDTO>().error("账号已被禁用");
        }

        // 转换为DTO
        EcUserDTO userDTO = ConvertUtils.sourceToTarget(user, EcUserDTO.class);
        return new Result<EcUserDTO>().ok(userDTO);
    }

    @Override
    public EcUserEntity getByUsername(String username) {
        return baseDao.getByUsername(username);
    }

    @Override
    public EcUserEntity getByPhone(String phone) {
        return baseDao.getByPhone(phone);
    }

    @Override
    public EcUserEntity getByEmail(String email) {
        return baseDao.getByEmail(email);
    }

    @Override
    public boolean verifyPassword(String password, String hashedPassword) {
        return PasswordUtils.matches(password, hashedPassword);
    }

    @Override
    public String encryptPassword(String password) {
        return PasswordUtils.encode(password);
    }
}
