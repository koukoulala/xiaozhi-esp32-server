package xiaozhi.modules.eldercare.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import jakarta.validation.constraints.NotBlank;

/**
 * ElderCare登录DTO
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Data
@Schema(description = "ElderCare登录")
public class EcLoginDTO {

    @Schema(description = "用户名/手机号/邮箱")
    @NotBlank(message = "用户名不能为空")
    private String username;

    @Schema(description = "密码")
    @NotBlank(message = "密码不能为空")
    private String password;
}
