package xiaozhi.modules.eldercare.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import xiaozhi.common.entity.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * ElderCare用户实体（子女家庭账户管理）
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@Data
@EqualsAndHashCode(callSuper=false)
@Schema(description = "ElderCare用户-子女家庭账户")
@TableName("ec_users")
public class EcUserEntity extends BaseEntity {

    @Schema(description = "ElderCare用户ID")
    @TableId
    private Long id;

    @Schema(description = "子女账号用户名")
    private String username;

    @Schema(description = "密码(加密)")
    private String password;

    @Schema(description = "子女真实姓名")
    private String realName;

    @Schema(description = "子女手机号")
    private String phone;

    @Schema(description = "子女邮箱")
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
