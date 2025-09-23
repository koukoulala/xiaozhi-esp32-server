package xiaozhi.modules.eldercare.service.impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import xiaozhi.modules.eldercare.entity.request.VoiceCloneRequest;
import xiaozhi.modules.eldercare.entity.response.VoiceCloneResponse;
import xiaozhi.modules.eldercare.service.EcVoiceService;
import xiaozhi.modules.timbre.entity.TimbreEntity;
import xiaozhi.modules.timbre.service.TimbreService;
import xiaozhi.modules.timbre.vo.TimbreDetailsVO;
import xiaozhi.modules.timbre.dto.TimbrePageDTO;
import xiaozhi.common.page.PageData;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * 长者护理 - 声音克隆服务实现类
 */
@Service
public class EcVoiceServiceImpl implements EcVoiceService {

    @Autowired
    private TimbreService timbreService;

    @Value("${file.upload.path:/data/audio_uploads/}")
    private String uploadPath;

    @Override
    public VoiceCloneResponse createVoiceClone(VoiceCloneRequest request) throws Exception {
        // 保存音频文件
        String audioFileName = saveAudioFile(request.getAudioFile());
        
        // 创建音色实体
        TimbreEntity timbreEntity = new TimbreEntity();
        timbreEntity.setId(UUID.randomUUID().toString().replaceAll("-", ""));
        timbreEntity.setName(request.getName());
        timbreEntity.setReferenceText(request.getReferenceText());
        timbreEntity.setReferenceAudio(audioFileName);
        timbreEntity.setTtsVoice(UUID.randomUUID().toString().replaceAll("-", ""));
        timbreEntity.setTtsModelId(request.getTtsModelId() != null ? request.getTtsModelId() : "TTS_CosyVoiceClone302AI");
        timbreEntity.setLanguages("zh");
        timbreEntity.setSort(System.currentTimeMillis());
        timbreEntity.setCreator(request.getUserId());
        timbreEntity.setCreateDate(new Date());
        
        // 保存到数据库
        timbreService.insert(timbreEntity);
        
        // 转换为响应对象
        VoiceCloneResponse response = new VoiceCloneResponse();
        response.setId(Long.valueOf(timbreEntity.getId()));
        response.setName(timbreEntity.getName());
        response.setReferenceText(timbreEntity.getReferenceText());
        response.setReferenceAudio(timbreEntity.getReferenceAudio());
        response.setTtsVoice(timbreEntity.getTtsVoice());
        response.setLanguages(timbreEntity.getLanguages());
        response.setCreateDate(timbreEntity.getCreateDate());
        response.setCreatedAt(timbreEntity.getCreateDate());
        
        return response;
    }

    @Override
    public List<VoiceCloneResponse> getVoiceList(Long userId) {
        try {
            // 创建分页查询参数
            TimbrePageDTO pageDTO = new TimbrePageDTO();
            pageDTO.setTtsModelId("TTS_CosyVoiceClone302AI"); // 设置必填的ttsModelId
            pageDTO.setPage("1");
            pageDTO.setLimit("100"); // 获取前100个音色
            
            // 获取音色分页数据
            PageData<TimbreDetailsVO> pageData = timbreService.page(pageDTO);
            
            List<VoiceCloneResponse> responseList = new ArrayList<>();
            if (pageData != null && pageData.getList() != null) {
                for (TimbreDetailsVO timbre : pageData.getList()) {
                    VoiceCloneResponse response = convertToResponse(timbre);
                    responseList.add(response);
                }
            }
            
            return responseList;
        } catch (Exception e) {
            // 如果出错，返回空列表
            return new ArrayList<>();
        }
    }

    private VoiceCloneResponse convertToResponse(TimbreDetailsVO timbre) {
        VoiceCloneResponse response = new VoiceCloneResponse();
        response.setId(Long.valueOf(timbre.getId()));
        response.setName(timbre.getName());
        response.setReferenceText(timbre.getReferenceText());
        response.setReferenceAudio(timbre.getReferenceAudio());
        response.setTtsVoice(timbre.getTtsVoice());
        response.setLanguages(timbre.getLanguages());
        response.setVoiceDemo(timbre.getVoiceDemo());
        response.setCreateDate(new Date()); // TimbreDetailsVO没有createDate字段，使用当前时间
        response.setCreatedAt(new Date());
        
        return response;
    }

    @Override
    public VoiceCloneResponse getVoiceDetails(Long voiceId) {
        try {
            TimbreDetailsVO timbre = timbreService.get(voiceId.toString());
            return timbre != null ? convertToResponse(timbre) : null;
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public boolean deleteVoice(Long voiceId) {
        try {
            timbreService.delete(new String[]{voiceId.toString()});
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public String testVoiceSynthesis(Long voiceId, String testText) throws Exception {
        // TODO: 实现语音合成测试
        // 这里应该调用TTS服务进行语音合成并返回音频URL
        return "test_audio_url.mp3";
    }

    private String saveAudioFile(MultipartFile file) throws IOException {
        // 创建上传目录
        File uploadDir = new File(uploadPath + "reference/");
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        
        // 生成唯一文件名
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        String filename = "voice_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;
        
        // 保存文件
        File destFile = new File(uploadDir, filename);
        file.transferTo(destFile);
        
        return "reference/" + filename;
    }
}