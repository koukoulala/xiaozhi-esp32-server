package xiaozhi.modules.eldercare.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import xiaozhi.modules.eldercare.dto.EcLoginDTO;
import xiaozhi.modules.eldercare.dto.EcRegisterDTO;
import xiaozhi.modules.eldercare.dto.EcUserDTO;
import xiaozhi.modules.eldercare.service.EcUserService;
import xiaozhi.common.utils.Result;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

/**
 * ElderCare认证控制器
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@RestController
@RequestMapping("/eldercare/auth")
@Tag(name="ElderCare认证")
public class EcAuthController {

    @Autowired
    private EcUserService ecUserService;

    @PostMapping("register")
    @Operation(summary = "用户注册")
    public Result<String> register(@RequestBody @Valid EcRegisterDTO dto) {
        return ecUserService.register(dto);
    }

    @PostMapping("login")
    @Operation(summary = "用户登录")
    public Result<EcUserDTO> login(@RequestBody @Valid EcLoginDTO dto) {
        return ecUserService.login(dto);
    }

    @PostMapping("logout")
    @Operation(summary = "用户退出")
    public Result<String> logout() {
        return new Result<String>().ok("退出成功");
    }
}
