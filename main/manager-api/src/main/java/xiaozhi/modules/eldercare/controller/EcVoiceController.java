package xiaozhi.modules.eldercare.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import xiaozhi.common.utils.Result;
import xiaozhi.modules.eldercare.service.EcVoiceService;
import xiaozhi.modules.eldercare.entity.response.VoiceCloneResponse;
import xiaozhi.modules.eldercare.entity.request.VoiceCloneRequest;

import java.util.List;

/**
 * 长者护理 - 声音克隆 Controller
 * 提供声音克隆、音色管理等功能的API接口
 */
@RestController
@RequestMapping("/eldercare/voice")
@CrossOrigin
public class EcVoiceController {

    @Autowired
    private EcVoiceService voiceService;

    /**
     * 创建声音克隆
     */
    @PostMapping("/clone")
    public Result<VoiceCloneResponse> createVoiceClone(
            @RequestParam("userId") Long userId,
            @RequestParam("name") String name,
            @RequestParam("referenceText") String referenceText,
            @RequestParam("audioFile") MultipartFile audioFile,
            @RequestParam(value = "ttsModelId", required = false) String ttsModelId
    ) {
        try {
            VoiceCloneRequest request = new VoiceCloneRequest();
            request.setUserId(userId);
            request.setName(name);
            request.setReferenceText(referenceText);
            request.setAudioFile(audioFile);
            request.setTtsModelId(ttsModelId);
            
            VoiceCloneResponse response = voiceService.createVoiceClone(request);
            return new Result<VoiceCloneResponse>().ok(response);
        } catch (Exception e) {
            return new Result<VoiceCloneResponse>().error(e.getMessage());
        }
    }

    /**
     * 获取用户的声音列表
     */
    @GetMapping("/list")
    public Result<List<VoiceCloneResponse>> getVoiceList(@RequestParam("userId") Long userId) {
        try {
            List<VoiceCloneResponse> voiceList = voiceService.getVoiceList(userId);
            return new Result<List<VoiceCloneResponse>>().ok(voiceList);
        } catch (Exception e) {
            return new Result<List<VoiceCloneResponse>>().error(e.getMessage());
        }
    }

    /**
     * 获取声音详情
     */
    @GetMapping("/{voiceId}")
    public Result<VoiceCloneResponse> getVoiceDetails(@PathVariable Long voiceId) {
        try {
            VoiceCloneResponse voice = voiceService.getVoiceDetails(voiceId);
            if (voice != null) {
                return new Result<VoiceCloneResponse>().ok(voice);
            } else {
                return new Result<VoiceCloneResponse>().error("声音不存在");
            }
        } catch (Exception e) {
            return new Result<VoiceCloneResponse>().error(e.getMessage());
        }
    }

    /**
     * 删除声音克隆
     */
    @DeleteMapping("/{voiceId}")
    public Result<String> deleteVoice(@PathVariable Long voiceId) {
        try {
            boolean success = voiceService.deleteVoice(voiceId);
            if (success) {
                return new Result<String>().ok("删除声音成功");
            } else {
                return new Result<String>().error("删除声音失败");
            }
        } catch (Exception e) {
            return new Result<String>().error(e.getMessage());
        }
    }

    /**
     * 测试声音合成
     */
    @PostMapping("/test")
    public Result<String> testVoiceSynthesis(
            @RequestParam("voiceId") Long voiceId,
            @RequestParam("testText") String testText
    ) {
        try {
            String audioUrl = voiceService.testVoiceSynthesis(voiceId, testText);
            return new Result<String>().ok(audioUrl);
        } catch (Exception e) {
            return new Result<String>().error(e.getMessage());
        }
    }
}