<template>
  <el-dialog :visible.sync="localVisible" width="90%" @close="handleClose" :show-close="false" :append-to-body="true"
    :close-on-click-modal="true">
    <button class="custom-close-btn" @click="handleClose">
      ×
    </button>
    <div class="scroll-wrapper">
      <div class="table-container" ref="tableContainer" @scroll="handleScroll">
        <el-table v-loading="loading" :data="filteredTtsModels" style="width: 100%;" class="data-table"
          header-row-class-name="table-header" :fit="true" element-loading-text="拼命加载中"
          element-loading-spinner="el-icon-loading" element-loading-background="rgba(0, 0, 0, 0.8)">
          <el-table-column label="选择" width="50" align="center">
            <template slot-scope="scope">
              <el-checkbox v-model="scope.row.selected"></el-checkbox>
            </template>
          </el-table-column>

          <el-table-column label="音色名称" align="center">
            <template slot-scope="scope">
              <el-input v-if="scope.row.editing" v-model="scope.row.voiceName"></el-input>
              <span v-else>{{ scope.row.voiceName }}</span>
            </template>
          </el-table-column>
          <el-table-column label="语言类型" align="center">
            <template slot-scope="scope">
              <el-input v-if="scope.row.editing" v-model="scope.row.languageType"></el-input>
              <span v-else>{{ scope.row.languageType }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="!showReferenceColumns" label="试听" align="center" class-name="audio-column">
            <template slot-scope="scope">
              <div class="custom-audio-container">
                <el-input v-if="scope.row.editing" v-model="scope.row.voiceDemo" placeholder="请输入MP3地址"
                  class="audio-input">
                </el-input>
                <AudioPlayer v-else-if="isValidAudioUrl(scope.row.voiceDemo)" :audioUrl="scope.row.voiceDemo" />
              </div>
            </template>
          </el-table-column>
          <el-table-column v-if="!showReferenceColumns" label="备注" align="center">
            <template slot-scope="scope">
              <el-input v-if="scope.row.editing" type="textarea" :rows="1" autosize v-model="scope.row.remark"
                placeholder="这里是备注" class="remark-input"></el-input>
              <span v-else>{{ scope.row.remark }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="showReferenceColumns" label="参考音频" align="center" width="250">
            <template slot-scope="scope">
              <div v-if="scope.row.editing" class="audio-select-container">
                <el-select
                  v-model="scope.row.referenceAudio"
                  placeholder="选择参考音频"
                  filterable
                  style="width: 100%"
                  @change="onAudioSelect(scope.row, $event)">
                  <el-option
                    v-for="audio in availableAudioFiles"
                    :key="audio.id"
                    :label="audio.original_filename"
                    :value="audio.id">
                    <span style="float: left">{{ audio.original_filename }}</span>
                    <span style="float: right; color: #8492a6; font-size: 13px">
                      {{ formatFileSize(audio.file_size) }}
                    </span>
                  </el-option>
                </el-select>
                <div v-if="scope.row.selectedAudioInfo" class="selected-audio-info">
                  <small class="audio-info-text">
                    已选择: {{ scope.row.selectedAudioInfo.filename }}
                    ({{ formatFileSize(scope.row.selectedAudioInfo.size) }})
                  </small>
                </div>
              </div>
              <div v-else class="audio-display">
                <span v-if="scope.row.referenceAudio">{{ getAudioDisplayName(scope.row.referenceAudio) }}</span>
                <span v-else class="no-audio">未选择音频</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-if="showReferenceColumns" label="参考文本" align="center" width="300">
            <template slot-scope="scope">
              <div v-if="scope.row.editing">
                <el-select
                  v-model="scope.row.referenceText"
                  placeholder="选择或输入参考文本"
                  filterable
                  allow-create
                  style="width: 100%"
                  @change="onTextSelect(scope.row, $event)">
                  <el-option
                    v-for="text in availableReferenceTexts"
                    :key="text.value"
                    :label="text.label"
                    :value="text.value">
                  </el-option>
                </el-select>
              </div>
              <div v-else class="reference-text-display">
                <el-tooltip placement="top" :content="scope.row.referenceText" :disabled="!scope.row.referenceText || scope.row.referenceText.length <= 30">
                  <span>{{ scope.row.referenceText ? (scope.row.referenceText.length > 30 ? scope.row.referenceText.substring(0, 30) + '...' : scope.row.referenceText) : '无文本' }}</span>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="150">
            <template slot-scope="scope">
              <template v-if="!scope.row.editing">
                <el-button type="text" size="mini" @click="startEdit(scope.row)" class="edit-btn">
                  编辑
                </el-button>
                <el-button type="text" size="mini" @click="deleteRow(scope.row)" class="delete-btn">
                  删除
                </el-button>
              </template>
              <el-button v-else type="success" size="mini" @click="saveEdit(scope.row)" class="save-Tts">保存
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 自定义滚动条 -->
      <div class="custom-scrollbar" ref="scrollbar">
        <div class="custom-scrollbar-track" ref="scrollbarTrack" @click="handleTrackClick">
          <div class="custom-scrollbar-thumb" ref="scrollbarThumb" @mousedown="startDrag"></div>
        </div>
      </div>
    </div>
    <div class="action-buttons">
      <el-button type="primary" size="mini" @click="toggleSelectAll" style="background: #606ff3;border: None">
        {{ selectAll ? '取消全选' : '全选' }}
      </el-button>
      <el-button type="primary" size="mini" @click="addNew" style="background: #5bc98c;border: None;">
        新增
      </el-button>
      <el-button type="primary" size="mini" @click="deleteRow(filteredTtsModels.filter(row => row.selected))"
        style="background: red;border:None">删除
      </el-button>
      <el-button type="primary" size="mini" @click="openAudioManager(null)" 
        style="background: #409EFF;border: None;" icon="el-icon-folder-opened">
        管理音频文件
      </el-button>
    </div>
    
    <!-- 音频文件管理器 -->
    <AudioUploadManager 
      :visible.sync="audioManagerVisible"
      @confirm="handleAudioManagerConfirm" />
      
  </el-dialog>
</template>

<script>
import Api from "@/apis/api";
import AudioPlayer from './AudioPlayer.vue';
import AudioUploadManager from './AudioUploadManager.vue';

export default {
  components: { 
    AudioPlayer,
    AudioUploadManager 
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    ttsModelId: {
      type: String,
      required: true
    },
    modelConfig: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      localVisible: this.visible,
      searchQuery: '',
      editDialogVisible: false,
      editVoiceData: {},
      ttsModels: [],
      currentPage: 1,
      pageSize: 10000,
      total: 0,
      isDragging: false,
      startY: 0,
      scrollTop: 0,
      selectAll: false,
      selectedRows: [],
      loading: false,
      showReferenceColumns: false, // 控制是否显示参考列
      baseApiUrl: this.getBaseApiUrl(), // API 基础地址
      audioManagerVisible: false, // 音频管理器显示状态
      currentEditingRow: null, // 当前编辑的行
      availableAudioFiles: [], // 可用的音频文件列表
      availableReferenceTexts: [], // 可用的参考文本列表
    };
  },
  watch: {
    visible(newVal) {
      this.localVisible = newVal;
      if (newVal) {
        this.currentPage = 1;
        this.updateShowReferenceColumns(); // 更新显示状态
        this.loadData(); // 对话框显示时加载数据
        this.$nextTick(() => {
          this.updateScrollbar();
        });
      }
    },
    modelConfig: {
      handler(newVal) {
        this.updateShowReferenceColumns();
      },
      immediate: true
    },
    filteredTtsModels() {
      this.$nextTick(() => {
        this.updateScrollbar();
      });
    }
  },
  computed: {
    filteredTtsModels() {
      return this.ttsModels.filter(model =>
        model.voiceName.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    }
  },
  mounted() {
    this.updateScrollbar();
    window.addEventListener('resize', this.updateScrollbar);
    window.addEventListener('mouseup', this.stopDrag);
    window.addEventListener('mousemove', this.handleDrag);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateScrollbar);
    window.removeEventListener('mouseup', this.stopDrag);
    window.removeEventListener('mousemove', this.handleDrag);
  },
  methods: {
    // 获取 API 基础地址
    getBaseApiUrl() {
      // 音频API运行在 xiaozhi-server 的 http_port (默认8003)
      const { protocol, hostname } = window.location;
      return `${protocol}//${hostname}:8003`;
    },

    // 音频上传前处理
    beforeAudioUpload(file, row) {
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

      // 添加额外的表单数据
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'reference');
      formData.append('reference_text', row.referenceText || '');

      return true;
    },

    // 音频上传成功处理
    handleAudioUploadSuccess(response, row) {
      if (response.success) {
        row.uploadedAudioId = response.file_id;
        row.uploadedFilename = response.original_filename;
        row.referenceAudio = response.file_id; // 存储文件ID而不是路径
        this.$message.success('音频上传成功！');
      } else {
        this.$message.error(response.detail || '上传失败');
      }
    },

    // 音频上传失败处理
    handleAudioUploadError(error, row) {
      console.error('音频上传失败:', error);
      this.$message.error('音频上传失败，请重试');
    },

    // 打开音频管理器
    openAudioManager(row) {
      this.currentEditingRow = row;
      this.audioManagerVisible = true;
    },

    // 处理音频管理器确认
    handleAudioManagerConfirm() {
      // 重新加载音频文件列表
      this.loadAudioFiles();
      
      if (this.currentEditingRow) {
        // 如果是从编辑行打开的，可以尝试自动选择最新上传的音频
        this.loadRecentUploadedAudio(this.currentEditingRow);
      }
    },

    // 加载最近上传的音频（保留兼容性）
    async loadRecentUploadedAudio(row) {
      try {
        const response = await fetch(`${this.baseApiUrl}/api/audio/list`);
        const data = await response.json();
        
        if (data.success && data.files.length > 0) {
          // 获取最近上传的参考音频
          const referenceFiles = data.files.filter(f => f.purpose === 'reference');
          if (referenceFiles.length > 0) {
            const latestFile = referenceFiles[0]; // 已经按时间排序
            // 自动选择最新上传的音频
            row.referenceAudio = latestFile.id;
            row.selectedAudioInfo = {
              filename: latestFile.original_filename,
              size: latestFile.file_size
            };
            
            // 如果该音频有参考文本且当前没有文本，自动填充
            if (latestFile.reference_text && !row.referenceText) {
              row.referenceText = latestFile.reference_text;
            }
          }
        }
      } catch (error) {
        console.error('加载音频信息失败:', error);
      }
    },

    // 移除已上传的音频
    beforeAudioUpload(file, row) {
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

      // 添加额外的表单数据
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'reference');
      formData.append('reference_text', row.referenceText || '');

      return true;
    },

    // 音频上传成功处理
    handleAudioUploadSuccess(response, row) {
      if (response.success) {
        row.uploadedAudioId = response.file_id;
        row.uploadedFilename = response.original_filename;
        row.referenceAudio = response.file_id; // 存储文件ID而不是路径
        this.$message.success('音频上传成功！');
      } else {
        this.$message.error(response.detail || '上传失败');
      }
    },

    // 音频上传失败处理
    handleAudioUploadError(error, row) {
      console.error('音频上传失败:', error);
      this.$message.error('音频上传失败，请重试');
    },

    // 移除已上传的音频
    removeUploadedAudio(row) {
      if (row.uploadedAudioId) {
        // 调用删除 API
        fetch(`${this.baseApiUrl}/api/audio/delete/${row.uploadedAudioId}`, {
          method: 'DELETE'
        }).then(response => response.json())
        .then(result => {
          if (result.success) {
            row.uploadedAudioId = '';
            row.uploadedFilename = '';
            row.referenceAudio = '';
            this.$message.success('音频删除成功');
          } else {
            this.$message.error('删除失败');
          }
        }).catch(error => {
          console.error('删除音频失败:', error);
          this.$message.error('删除失败');
        });
      }
    },

    // 获取音频显示名称
    getAudioDisplayName(audioRef) {
      if (!audioRef) return '未上传音频';
      
      // 如果是文件ID格式，显示为"已上传音频"
      if (audioRef.length === 32 && /^[a-f0-9]+$/.test(audioRef)) {
        return '已上传音频';
      }
      
      // 如果是路径，显示文件名
      const filename = audioRef.split('/').pop();
      return filename || audioRef;
    },

    // 从参考音频字段中提取音频ID
    extractAudioId(referenceAudio) {
      if (!referenceAudio) return '';
      
      // 如果是32位十六进制字符串，可能是文件ID
      if (referenceAudio.length === 32 && /^[a-f0-9]+$/.test(referenceAudio)) {
        return referenceAudio;
      }
      
      return '';
    },

    // 从参考音频字段中提取文件名
    extractFilename(referenceAudio) {
      if (!referenceAudio) return '';
      
      // 如果是文件ID，返回通用名称
      if (referenceAudio.length === 32 && /^[a-f0-9]+$/.test(referenceAudio)) {
        return '已上传的音频文件';
      }
      
      // 如果是路径，提取文件名
      const filename = referenceAudio.split('/').pop();
      return filename || '';
    },

    // 更新是否显示参考列
    updateShowReferenceColumns() {
      if (this.modelConfig && this.modelConfig.configJson) {
        const providerType = this.modelConfig.configJson.type;
        this.showReferenceColumns = ['fishspeech', 'gpt_sovits_v2', 'gpt_sovits_v3', 'cosyvoice_clone'].includes(providerType);
      } else {
        this.showReferenceColumns = false;
      }
    },

    loadData() {
      this.loading = true;
      const params = {
        ttsModelId: this.ttsModelId,
        page: this.currentPage,
        limit: this.pageSize,
        name: this.searchQuery
      };
      
      // 同时加载音色列表和音频文件列表
      Promise.all([
        this.loadVoiceList(params),
        this.loadAudioFiles()
      ]).finally(() => {
        this.loading = false;
      });
    },

    // 加载音色列表
    loadVoiceList(params) {
      return new Promise((resolve, reject) => {
        Api.timbre.getVoiceList(params, (data) => {
          if (data.code === 0) {
            this.ttsModels = data.data.list
              .map(item => ({
                id: item.id || '',
                voiceCode: item.ttsVoice || '',
                voiceName: item.name || '未命名音色',
                languageType: item.languages || '',
                remark: item.remark || '',
                referenceAudio: item.referenceAudio || '',
                referenceText: item.referenceText || '',
                voiceDemo: item.voiceDemo || '',
                selected: false,
                editing: false,
                sort: Number(item.sort),
                // 添加选中的音频信息字段
                selectedAudioInfo: null
              }))
              .sort((a, b) => a.sort - b.sort);
            this.total = data.total;
            resolve(data);
          } else {
            this.$message.error({
              message: data.msg || '获取音色列表失败',
              showClose: true
            });
            reject(new Error(data.msg));
          }
        }, (err) => {
          console.error('加载失败:', err);
          this.$message.error({
            message: '加载失败',
            showClose: true
          });
          reject(err);
        });
      });
    },

    // 加载音频文件列表
    async loadAudioFiles() {
      try {
        const response = await fetch(`${this.baseApiUrl}/api/audio/list`);
        const data = await response.json();
        
        if (data.success) {
          this.availableAudioFiles = data.files.filter(f => f.purpose === 'reference');
          
          // 构建参考文本列表（去重）
          const textSet = new Set();
          this.availableAudioFiles.forEach(file => {
            if (file.reference_text && file.reference_text.trim()) {
              textSet.add(file.reference_text.trim());
            }
          });
          
          this.availableReferenceTexts = Array.from(textSet).map(text => ({
            label: text.length > 50 ? text.substring(0, 50) + '...' : text,
            value: text
          }));
        } else {
          console.error('获取音频文件列表失败:', data.error);
        }
      } catch (error) {
        console.error('加载音频文件失败:', error);
      }
    },

    // 音频选择事件处理
    onAudioSelect(row, audioId) {
      const selectedAudio = this.availableAudioFiles.find(audio => audio.id === audioId);
      if (selectedAudio) {
        row.selectedAudioInfo = {
          filename: selectedAudio.original_filename,
          size: selectedAudio.file_size
        };
        // 如果该音频有参考文本，自动填充到参考文本字段
        if (selectedAudio.reference_text && !row.referenceText) {
          row.referenceText = selectedAudio.reference_text;
        }
      } else {
        row.selectedAudioInfo = null;
      }
    },

    // 参考文本选择事件处理
    onTextSelect(row, text) {
      // 文本选择后的处理逻辑
      row.referenceText = text;
    },

    // 格式化文件大小
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    handleClose() {
      // 重置状态
      this.ttsModels = [];
      this.currentPage = 1;
      this.total = 0;
      this.selectAll = false;
      this.searchQuery = '';
      this.showReferenceColumns = false;

      this.localVisible = false;
      this.$emit('update:visible', false);
    },

    updateScrollbar() {
      const container = this.$refs.tableContainer;
      const scrollbarThumb = this.$refs.scrollbarThumb;
      const scrollbarTrack = this.$refs.scrollbarTrack;

      if (!container || !scrollbarThumb || !scrollbarTrack) return;

      const { scrollHeight, clientHeight } = container;
      const trackHeight = scrollbarTrack.clientHeight;
      const thumbHeight = Math.max((clientHeight / scrollHeight) * trackHeight, 20);

      scrollbarThumb.style.height = `${thumbHeight}px`;
      this.updateThumbPosition();
    },

    updateThumbPosition() {
      const container = this.$refs.tableContainer;
      const scrollbarThumb = this.$refs.scrollbarThumb;
      const scrollbarTrack = this.$refs.scrollbarTrack;

      if (!container || !scrollbarThumb || !scrollbarTrack) return;

      const { scrollHeight, clientHeight, scrollTop } = container;
      const trackHeight = scrollbarTrack.clientHeight;
      const thumbHeight = scrollbarThumb.clientHeight;
      const maxTop = trackHeight - thumbHeight;
      const thumbTop = (scrollTop / (scrollHeight - clientHeight)) * (trackHeight - thumbHeight);

      scrollbarThumb.style.top = `${Math.min(thumbTop, maxTop)}px`;
    },

    handleScroll() {
      const container = this.$refs.tableContainer;
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
        if (this.currentPage * this.pageSize < this.total) {
          this.currentPage++;
          this.loadData();
        }
      }
      this.updateThumbPosition();
    },

    startDrag(e) {
      this.isDragging = true;
      this.startY = e.clientY;
      this.scrollTop = this.$refs.tableContainer.scrollTop;
      e.preventDefault();
    },

    stopDrag() {
      this.isDragging = false;
    },

    handleDrag(e) {
      if (!this.isDragging) return;

      const container = this.$refs.tableContainer;
      const scrollbarTrack = this.$refs.scrollbarTrack;
      const scrollbarThumb = this.$refs.scrollbarThumb;
      const deltaY = e.clientY - this.startY;
      const trackHeight = scrollbarTrack.clientHeight;
      const thumbHeight = scrollbarThumb.clientHeight;
      const maxScrollTop = container.scrollHeight - container.clientHeight;

      const scrollRatio = (trackHeight - thumbHeight) / maxScrollTop;
      container.scrollTop = this.scrollTop + deltaY / scrollRatio;
    },

    handleTrackClick(e) {
      const container = this.$refs.tableContainer;
      const scrollbarTrack = this.$refs.scrollbarTrack;
      const scrollbarThumb = this.$refs.scrollbarThumb;

      if (!container || !scrollbarTrack || !scrollbarThumb) return;

      const trackRect = scrollbarTrack.getBoundingClientRect();
      const thumbHeight = scrollbarThumb.clientHeight;
      const clickPosition = e.clientY - trackRect.top;
      const thumbCenter = clickPosition - thumbHeight / 2;

      const trackHeight = scrollbarTrack.clientHeight;
      const maxTop = trackHeight - thumbHeight;
      const newTop = Math.max(0, Math.min(thumbCenter, maxTop));

      scrollbarThumb.style.top = `${newTop}px`;
      container.scrollTop = (newTop / (trackHeight - thumbHeight)) * (container.scrollHeight - container.clientHeight);
    },

    startEdit(row) {
      row.editing = true;
      this.$set(row, 'originalData', { ...row });
    },

    saveEdit(row) {
      if (!row.voiceName || !row.languageType) {
        this.$message.error({
          message: '音色名称和语言类型不能为空',
          showClose: true
        });
        return;
      }

      try {
        // 确保voiceCode有值，如果没有则基于voiceName生成
        if (!row.voiceCode && row.voiceName) {
          row.voiceCode = row.voiceName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_') + '_' + Date.now();
        } else if (!row.voiceCode) {
          row.voiceCode = 'voice_' + Date.now();
        }

        const params = {
          id: row.id,
          voiceCode: row.voiceCode,
          voiceName: row.voiceName,
          languageType: row.languageType,
          remark: row.remark,
          ttsModelId: this.ttsModelId,
          voiceDemo: row.voiceDemo || '',
          sort: row.sort
        };

        // 只有在显示参考列的情况下才添加参考字段
        if (this.showReferenceColumns) {
          params.referenceAudio = row.referenceAudio;
          params.referenceText = row.referenceText;
        }

        let res;
        if (row.id) {
          // 已有ID，执行更新操作
          Api.timbre.updateVoice(params, (response) => {
            res = response;
            this.handleResponse(res, row);
          });
        } else {
          // 没有ID，执行新增操作
          Api.timbre.saveVoice(params, (response) => {
            res = response;
            this.handleResponse(res, row);
          });
        }
      } catch (error) {
        console.error('操作失败:', error);
        // 异常情况下也恢复原始数据
        if (row.originalData) {
          Object.assign(row, row.originalData);
          row.editing = false;
          delete row.originalData;
        }
        this.$message.error({
          message: '操作失败，请重试',
          showClose: true
        });
      }
    },

    handleResponse(res, row) {
      if (res.code === 0) {
        this.$message.success({
          message: row.id ? '修改成功' : '保存成功',
          showClose: true
        });
        row.editing = false;
        delete row.originalData;
        this.loadData(); // 刷新数据
      } else {
        // 保存失败时恢复原始数据
        if (row.originalData) {
          Object.assign(row, row.originalData);
          row.editing = false;
          delete row.originalData;
        }
        this.$message.error({
          message: res.msg || (row.id ? '修改失败' : '保存失败'),
          showClose: true
        });
      }
    },

    toggleSelectAll() {
      this.selectAll = !this.selectAll;
      this.filteredTtsModels.forEach(row => {
        row.selected = this.selectAll;
      });
    },

    addNew() {
      const hasEditing = this.ttsModels.some(row => row.editing);
      if (hasEditing) {
        this.$message.warning('请先完成当前编辑再新增');
        return;
      }

      const maxSort = this.ttsModels.length > 0
        ? Math.max(...this.ttsModels.map(item => Number(item.sort) || 0))
        : 0;

      const newRow = {
        voiceCode: 'voice_' + Date.now(), // 自动生成音色编码
        voiceName: '',
        languageType: '中文',
        voiceDemo: '',
        remark: '',
        referenceAudio: '',
        referenceText: '',
        selected: false,
        editing: true,
        sort: maxSort + 1,
        // 音频选择相关字段
        selectedAudioInfo: null
      };

      this.ttsModels.unshift(newRow);
    },

    deleteRow(row) {
      // 处理单个音色或音色数组
      const voices = Array.isArray(row) ? row : [row];

      if (Array.isArray(row) && row.length === 0) {
        this.$message.warning("请先选择需要删除的音色");
        return;
      }


      const voiceCount = voices.length;
      this.$confirm(`确定要删除选中的${voiceCount}个音色吗？`, "警告", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
        distinguishCancelAndClose: true
      }).then(() => {
        const ids = voices.map(voice => voice.id);
        if (ids.some(id => !id)) {
          this.$message.error("存在无效的音色ID");
          return;
        }

        Api.timbre.deleteVoice(ids, ({ data }) => {
          if (data.code === 0) {
            this.$message.success({
              message: `成功删除${voiceCount}个参数`,
              showClose: true
            });
            this.loadData(); // 刷新参数列表
          } else {
            this.$message.error({
              message: data.msg || '删除失败，请重试',
              showClose: true
            });
          }
        });
      }).catch(action => {
        if (action === 'cancel') {
          this.$message({
            type: 'info',
            message: '已取消删除操作',
            duration: 1000
          });
        } else {
          this.$message({
            type: 'info',
            message: '操作已关闭',
            duration: 1000
          });
        }
      });
    },

    isValidAudioUrl(url) {
      return url && (url.endsWith('.mp3') || url.endsWith('.ogg') || url.endsWith('.wav'));
    }
  }
};
</script>

<style lang="scss" scoped>
::v-deep .el-dialog {
  border-radius: 8px !important;
  overflow: hidden;
  top: 1vh !important;
}

::v-deep .el-dialog__header {
  display: none !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* 表格样式 */
::v-deep .data-table .el-table__header th {
  color: black;
  padding: 6px 0 !important;
}

::v-deep .data-table .el-table__row td {
  padding: 8px 0 12px !important;
}

::v-deep .data-table {
  border: none !important;
}

::v-deep .data-table.el-table::before {
  display: none !important;
}

::v-deep .data-table .el-table__header-wrapper {
  border-bottom: 2px solid #f1f2fb !important;
}

::v-deep .data-table .el-table__body-wrapper .el-table__body td {
  border: none !important;
}

/* 关闭按钮 */
.custom-close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid #cfcfcf;
  background: none;
  font-size: 30px;
  font-weight: lighter;
  color: #cfcfcf;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  padding: 0;
  outline: none;
}

.custom-close-btn:hover {
  color: #409EFF;
  border-color: #409EFF;
}

/* 备注文本 */
::v-deep .remark-input .el-textarea__inner {
  border-radius: 4px;
  border: 1px solid #e6e6e6;
  padding: 8px 12px;
  resize: none;
  max-height: 40px !important;
  line-height: 1.5;
  background-color: transparent !important;
}

::v-deep .remark-input .el-textarea__inner:focus {
  border-color: #409EFF !important;
  outline: none;
}

::v-deep .remark-input .el-textarea__inner::placeholder {
  color: #c0c4cc !important;
  opacity: 1;
}


/* 滚动容器 */
.scroll-wrapper {
  display: flex;
  max-height: 55vh;
  position: relative;
}

.table-container {
  flex: 1;
  overflow: auto;
  scrollbar-width: none;
  padding-right: 15px;
  width: calc(100% - 16px);
}

.table-container::-webkit-scrollbar {
  display: none;
}

/* 自定义滚动条 */
.custom-scrollbar {
  width: 8px;
  background: #f1f1f1;
  border-radius: 4px;
  position: relative;
  margin-left: 8px;
  height: 100%;
  top: 55px;
}

.custom-scrollbar-track {
  position: relative;
  height: 380px;
  cursor: pointer;
}

.custom-scrollbar-thumb {
  position: absolute;
  width: 100%;
  background: #9dade7;
  border-radius: 4px;
  cursor: grab;
  transition: background 0.2s;
}

.custom-scrollbar-thumb:hover {
  background: #6b84d9;
}

.custom-scrollbar-thumb:active {
  cursor: grabbing;
}

.save-Tts {
  background: #796dea;
  border: None;
}

.save-Tts:hover {
  background: #8b80f0;
}

.custom-audio-container audio {
  display: none;
}

/* 音频播放器容器样式 */
.custom-audio-container {
  width: 90%;
  margin: 0 auto;
}

.action-buttons .el-button {
  padding: 8px 15px;
  font-size: 11px;
}

.edit-btn,
.delete-btn,
.save-btn {
  margin: 0 8px;
  color: #7079aa !important;
  transition: all 0.3s;
}

.edit-btn:hover,
.delete-btn:hover,
.save-btn:hover {
  color: #5f70f3 !important;
  transform: scale(1.05);
}

.save-btn {
  color: #5cca8e !important;
}

/* 表格单元格自适应 */
::v-deep .el-table__body-wrapper {
  overflow-x: hidden !important;
}

::v-deep .el-table td {
  white-space: pre-wrap !important;
  word-break: break-all !important;
}

/* 按钮组定位调整 */
.action-buttons {
  position: static;
  padding: 15px 0;
  background: white;
}

/* 输入框自适应 */
::v-deep .el-input__inner,
::v-deep .el-textarea__inner {
  width: 100% !important;
  min-width: 120px;
}

/* 音频输入框特殊处理 */
.audio-input ::v-deep .el-input__inner {
  min-width: 200px;
}

/* 操作按钮弹性布局 */
::v-deep .el-table__row .el-button {
  flex-shrink: 0;
  margin: 2px !important;
}

/* 音频上传相关样式 */
.audio-upload-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.audio-uploader ::v-deep .el-upload {
  width: 100%;
}

.uploaded-info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f0f9ff;
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #b3d8ff;
  width: 100%;
  max-width: 200px;
}

.audio-filename {
  font-size: 12px;
  color: #1890ff;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-display {
  text-align: center;
  padding: 8px;
}

.no-audio {
  color: #999;
  font-style: italic;
}

.reference-text-input ::v-deep .el-textarea__inner {
  border-radius: 4px;
  border: 1px solid #e6e6e6;
  padding: 8px 12px;
  resize: none;
  line-height: 1.4;
  background-color: transparent !important;
}

.reference-text-input ::v-deep .el-textarea__inner:focus {
  border-color: #409EFF !important;
  outline: none;
}

/* 音频选择相关样式 */
.audio-select-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-audio-info {
  margin-top: 4px;
}

.audio-info-text {
  color: #666;
  font-size: 12px;
  display: block;
  padding: 4px 8px;
  background: #f0f9ff;
  border-radius: 3px;
  border: 1px solid #d1ecf1;
}

/* 参考文本显示样式优化 */
.reference-text-display {
  text-align: left;
  padding: 8px;
  min-height: 40px;
  word-wrap: break-word;
  line-height: 1.4;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  cursor: pointer;
}

.reference-text-display:hover {
  background: #e9ecef;
}

/* 下拉框样式优化 */
.el-select {
  width: 100%;
}

.el-select .el-input__inner {
  border-radius: 4px;
  border: 1px solid #e6e6e6;
}

.el-select .el-input__inner:focus {
  border-color: #409EFF;
}

/* 操作按钮区域样式调整 */
.action-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  flex-shrink: 0;
}
</style>