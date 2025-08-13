<template>
  <el-dialog
    :visible.sync="localVisible"
    title="音频文件管理 - 音色克隆"
    width="80%"
    :before-close="handleClose"
    :append-to-body="true">
    
    <div class="audio-manager">
      <!-- 上传区域 -->
      <div class="upload-section">
        <el-upload
          ref="audioUpload"
          :action="`${baseApiUrl}/api/audio/upload`"
          :file-list="fileList"
          :data="uploadData"
          :headers="uploadHeaders"
          :before-upload="beforeUpload"
          :on-success="handleUploadSuccess"
          :on-error="handleUploadError"
          :on-remove="handleRemove"
          accept=".wav,.mp3,.m4a,.aac,.ogg,.flac,.wma,.opus,.webm,.amr"
          multiple
          drag
          class="upload-dragger">
          
          <i class="el-icon-upload"></i>
          <div class="el-upload__text">
            将音频文件拖到此处，或<em>点击上传</em>
          </div>
          <div class="el-upload__tip" slot="tip">
            支持 WAV, MP3, M4A, AAC, OGG, FLAC, WMA, OPUS, WebM, AMR 格式，单文件最大 50MB
          </div>
        </el-upload>
        
        <!-- 参考文本输入 -->
        <div class="reference-text-section">
          <el-form-item label="参考文本（批量）">
            <el-input
              v-model="batchReferenceText"
              type="textarea"
              :rows="3"
              placeholder="输入与音频对应的文本内容，将应用到所有上传的音频文件..."
              maxlength="500"
              show-word-limit>
            </el-input>
          </el-form-item>
        </div>
      </div>

      <!-- 文件列表 -->
      <div class="file-list-section">
        <h3>已上传的音频文件</h3>
        
        <div class="toolbar">
          <el-button size="small" type="primary" @click="refreshFileList">
            <i class="el-icon-refresh"></i> 刷新
          </el-button>
          <el-button size="small" type="warning" @click="cleanupTempFiles">
            <i class="el-icon-delete"></i> 清理临时文件
          </el-button>
        </div>

        <el-table
          :data="audioFiles"
          v-loading="loading"
          empty-text="暂无音频文件"
          max-height="400">
          
          <el-table-column label="文件名" prop="original_filename" min-width="150">
            <template slot-scope="scope">
              <i class="el-icon-microphone"></i> {{ scope.row.original_filename }}
            </template>
          </el-table-column>
          
          <el-table-column label="参考文本" min-width="200">
            <template slot-scope="scope">
              <el-input
                v-if="scope.row.editing"
                v-model="scope.row.reference_text"
                type="textarea"
                :rows="2"
                placeholder="输入参考文本..."
                maxlength="500"
                show-word-limit>
              </el-input>
              <div v-else class="reference-text-display">
                {{ scope.row.reference_text || '无参考文本' }}
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="文件信息" width="120">
            <template slot-scope="scope">
              <div class="file-info">
                <div>{{ formatFileSize(scope.row.file_size) }}</div>
                <div>{{ formatDate(scope.row.upload_time) }}</div>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column label="试听" width="80">
            <template slot-scope="scope">
              <audio controls style="width: 60px; height: 30px;">
                <source :src="`${baseApiUrl}/api/audio/download/${scope.row.id}`" :type="scope.row.mime_type">
                不支持音频播放
              </audio>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="150">
            <template slot-scope="scope">
              <el-button
                v-if="!scope.row.editing"
                size="mini"
                type="text"
                @click="editReferenceText(scope.row)">
                编辑
              </el-button>
              <el-button
                v-else
                size="mini"
                type="success"
                @click="saveReferenceText(scope.row)">
                保存
              </el-button>
              <el-button
                size="mini"
                type="text"
                style="color: #f56c6c"
                @click="deleteFile(scope.row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 统计信息 -->
      <div class="stats-section">
        <div class="stat-item">
          <span class="label">总文件数:</span>
          <span class="value">{{ audioFiles.length }}</span>
        </div>
        <div class="stat-item">
          <span class="label">参考文件:</span>
          <span class="value">{{ referenceFilesCount }}</span>
        </div>
        <div class="stat-item">
          <span class="label">总大小:</span>
          <span class="value">{{ formatFileSize(totalSize) }}</span>
        </div>
      </div>
    </div>

    <div slot="footer" class="dialog-footer">
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确认</el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'AudioUploadManager',
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      localVisible: this.visible,
      fileList: [],
      audioFiles: [],
      batchReferenceText: '',
      loading: false,
      baseApiUrl: '',
      uploadData: {
        purpose: 'reference',
        reference_text: ''
      },
      uploadHeaders: {
        'Accept': 'application/json'
      }
    };
  },
  computed: {
    referenceFilesCount() {
      return this.audioFiles.filter(f => f.purpose === 'reference').length;
    },
    totalSize() {
      return this.audioFiles.reduce((sum, f) => sum + f.file_size, 0);
    }
  },
  watch: {
    visible(newVal) {
      this.localVisible = newVal;
      if (newVal) {
        this.refreshFileList();
      }
    }
  },
  created() {
    // 初始化API URL
    this.baseApiUrl = this.getBaseApiUrl();
  },
  methods: {
    getBaseApiUrl() {
      // 音频API运行在 xiaozhi-server 的 http_port (默认8003)
      const { protocol, hostname } = window.location;
      
      // 对于特定的服务器地址，强制使用正确的API地址
      if (hostname === '20.64.152.107') {
        return `${protocol}//20.64.152.107:8003`;
      }
      
      return `${protocol}//${hostname}:8003`;
    },

    beforeUpload(file) {
      const isAudio = /\.(wav|mp3|m4a|aac|ogg|flac|wma|opus|webm|amr)$/i.test(file.name);
      const isLt50M = file.size / 1024 / 1024 < 50;

      if (!isAudio) {
        this.$message.error('只能上传音频文件！');
        return false;
      }
      if (!isLt50M) {
        this.$message.error('上传文件大小不能超过 50MB！');
        return false;
      }

      // 更新上传数据
      this.uploadData = {
        purpose: 'reference',
        reference_text: this.batchReferenceText || ''
      };

      console.log('Upload data:', this.uploadData);
      console.log('Upload URL:', `${this.baseApiUrl}/api/audio/upload`);
      console.log('Upload headers:', this.uploadHeaders);
      console.log('Current location:', window.location.href);
      console.log('Computed API URL:', this.getBaseApiUrl());

      return true;
    },

    handleUploadSuccess(response, file) {
      console.log('Upload success response:', response);
      if (response.success) {
        this.$message.success(`${file.name} 上传成功！`);
        this.refreshFileList();
        // 清空批量参考文本
        this.batchReferenceText = '';
      } else {
        this.$message.error(`${file.name} 上传失败: ${response.error || '未知错误'}`);
      }
    },

    handleUploadError(error, file) {
      console.error('上传失败详细信息:', error);
      console.error('文件信息:', file);
      console.error('当前API URL:', this.baseApiUrl);
      console.error('网络状态:', navigator.onLine ? '在线' : '离线');
      
      let errorMessage = `${file.name} 上传失败`;
      
      // 检查网络错误
      if (!navigator.onLine) {
        errorMessage = `${file.name} 上传失败: 网络连接中断`;
      } else if (error.response) {
        try {
          const errorData = JSON.parse(error.response);
          errorMessage = `${file.name} 上传失败: ${errorData.error || errorData.message || '服务器错误'}`;
        } catch (e) {
          errorMessage = `${file.name} 上传失败: ${error.response}`;
        }
      } else if (error.message) {
        if (error.message.includes('Network Error') || error.message.includes('ERR_NETWORK')) {
          errorMessage = `${file.name} 上传失败: 网络错误，无法连接到服务器 (${this.baseApiUrl})`;
        } else {
          errorMessage = `${file.name} 上传失败: ${error.message}`;
        }
      }
      
      this.$message.error(errorMessage);
    },

    handleRemove(file) {
      // 处理文件移除
    },

    async refreshFileList() {
      this.loading = true;
      try {
        const response = await fetch(`${this.baseApiUrl}/api/audio/list`);
        const data = await response.json();
        
        if (data.success) {
          this.audioFiles = data.files.map(file => ({
            ...file,
            editing: false
          }));
        } else {
          this.$message.error('获取文件列表失败');
        }
      } catch (error) {
        console.error('获取文件列表失败:', error);
        this.$message.error('网络错误');
      } finally {
        this.loading = false;
      }
    },

    editReferenceText(file) {
      file.editing = true;
      this.$set(file, 'originalText', file.reference_text);
    },

    async saveReferenceText(file) {
      try {
        const formData = new FormData();
        formData.append('reference_text', file.reference_text || '');
        
        const response = await fetch(`${this.baseApiUrl}/api/audio/update-text/${file.id}`, {
          method: 'PUT',
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
          file.editing = false;
          this.$message.success('参考文本更新成功');
        } else {
          file.reference_text = file.originalText;
          this.$message.error('更新失败');
        }
      } catch (error) {
        console.error('更新失败:', error);
        file.reference_text = file.originalText;
        this.$message.error('网络错误');
      } finally {
        file.editing = false;
      }
    },

    async deleteFile(file) {
      try {
        await this.$confirm(`确定要删除 "${file.original_filename}" 吗？`, '警告', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });

        const response = await fetch(`${this.baseApiUrl}/api/audio/delete/${file.id}`, {
          method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.$message.success('文件删除成功');
          this.refreshFileList();
        } else {
          this.$message.error('删除失败');
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除失败:', error);
          this.$message.error('删除失败');
        }
      }
    },

    async cleanupTempFiles() {
      try {
        await this.$confirm('确定要清理24小时前的临时文件吗？', '警告', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });

        const response = await fetch(`${this.baseApiUrl}/api/audio/cleanup-temp`, {
          method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.$message.success('临时文件清理完成');
          this.refreshFileList();
        } else {
          this.$message.error('清理失败');
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('清理失败:', error);
          this.$message.error('清理失败');
        }
      }
    },

    formatFileSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString();
    },

    handleClose() {
      this.localVisible = false;
      this.$emit('update:visible', false);
    },

    handleConfirm() {
      this.handleClose();
    }
  }
};
</script>

<style lang="scss" scoped>
.audio-manager {
  .upload-section {
    margin-bottom: 20px;
    
    .upload-dragger {
      width: 100%;
    }
    
    .reference-text-section {
      margin-top: 15px;
    }
  }

  .file-list-section {
    margin-bottom: 20px;
    
    h3 {
      margin-bottom: 10px;
      color: #303133;
    }
    
    .toolbar {
      margin-bottom: 10px;
    }
    
    .reference-text-display {
      max-height: 60px;
      overflow-y: auto;
      line-height: 1.4;
      color: #606266;
    }
    
    .file-info {
      font-size: 12px;
      color: #909399;
      line-height: 1.5;
    }
  }

  .stats-section {
    display: flex;
    gap: 20px;
    padding: 15px;
    background: #f5f7fa;
    border-radius: 4px;
    
    .stat-item {
      .label {
        color: #909399;
        margin-right: 5px;
      }
      
      .value {
        color: #303133;
        font-weight: bold;
      }
    }
  }
}

::v-deep .el-upload-dragger {
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  width: 100%;
  height: 180px;
  text-align: center;
  color: #606266;
  position: relative;
  overflow: hidden;
  background-color: #fafafa;
  transition: border-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
}

::v-deep .el-upload-dragger:hover {
  border-color: #409eff;
}

::v-deep .el-upload-dragger .el-icon-upload {
  font-size: 67px;
  color: #c0c4cc;
  margin: 40px 0 16px;
  line-height: 50px;
}
</style>
