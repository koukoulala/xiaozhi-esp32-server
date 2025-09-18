package xiaozhi.modules.eldercare.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import xiaozhi.modules.eldercare.dto.EcHealthDataDTO;
import xiaozhi.modules.eldercare.service.EcHealthDataService;
import xiaozhi.common.utils.Result;
import xiaozhi.common.page.PageData;
import xiaozhi.common.validator.AssertUtils;
import xiaozhi.common.validator.ValidatorUtils;
import xiaozhi.common.validator.group.AddGroup;
import xiaozhi.common.validator.group.UpdateGroup;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * ElderCare健康数据控制器
 *
 * @author assistant
 * @since 1.0.0 2025-08-27
 */
@RestController
@RequestMapping("/eldercare/health")
@Tag(name="ElderCare健康数据")
public class EcHealthController {

    @Autowired
    private EcHealthDataService ecHealthDataService;

    @GetMapping("page")
    @Operation(summary = "分页查询")
    public Result<PageData<EcHealthDataDTO>> page(@RequestParam Map<String, Object> params) {
        PageData<EcHealthDataDTO> page = ecHealthDataService.page(params);
        return new Result<PageData<EcHealthDataDTO>>().ok(page);
    }

    @GetMapping("{id}")
    @Operation(summary = "信息")
    public Result<EcHealthDataDTO> get(@PathVariable("id") Long id) {
        EcHealthDataDTO data = ecHealthDataService.get(id);
        return new Result<EcHealthDataDTO>().ok(data);
    }

    @PostMapping
    @Operation(summary = "保存")
    public Result<String> save(@RequestBody EcHealthDataDTO dto) {
        ValidatorUtils.validateEntity(dto, AddGroup.class);
        ecHealthDataService.save(dto);
        return new Result<String>().ok("保存成功");
    }

    @PutMapping
    @Operation(summary = "修改")
    public Result<String> update(@RequestBody EcHealthDataDTO dto) {
        ValidatorUtils.validateEntity(dto, UpdateGroup.class);
        ecHealthDataService.update(dto);
        return new Result<String>().ok("修改成功");
    }

    @DeleteMapping
    @Operation(summary = "删除")
    public Result<String> delete(@RequestBody Long[] ids) {
        AssertUtils.isArrayEmpty(ids, "id");
        ecHealthDataService.delete(ids);
        return new Result<String>().ok("删除成功");
    }
}
