package xiaozhi.modules.eldercare.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import xiaozhi.common.validator.group.AddGroup;
import xiaozhi.common.validator.group.UpdateGroup;
import lombok.Data;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * ElderCare用户DTO（子女家庭账户）
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Data
@Schema(description = "ElderCare用户-子女家庭账户")
public class EcUserDTO {

    @Schema(description = "ElderCare用户ID")
    private Long id;

    @Schema(description = "子女账号用户名")
    @NotBlank(message = "用户名不能为空", groups = {AddGroup.class, UpdateGroup.class})
    private String username;

    @Schema(description = "子女真实姓名")
    private String realName;

    @Schema(description = "子女手机号")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确", groups = {AddGroup.class, UpdateGroup.class})
    private String phone;

    @Schema(description = "子女邮箱")
    @Email(message = "邮箱格式不正确", groups = {AddGroup.class, UpdateGroup.class})
    private String email;

    @Schema(description = "老人姓名")
    private String elderName;

    @Schema(description = "与老人关系(son/daughter/spouse/other)")
    private String elderRelation;

    @Schema(description = "老人档案信息(JSON格式：年龄、性别、身高体重、病史、用药等)")
    private String elderProfile;

    @Schema(description = "家庭联系人信息(JSON格式：紧急联系人、医生信息等)")
    private String familyContacts;

    @Schema(description = "当前使用的AI智能体ID（关联ai_agent表）")
    private String currentAiAgentId;

    @Schema(description = "当前默认设备ID（关联ai_device表）")
    private String currentAiDeviceId;

    @Schema(description = "设备与智能体映射配置(JSON格式)")
    private String deviceAgentMapping;

    @Schema(description = "状态(0禁用 1启用)")
    private Integer status;
}
