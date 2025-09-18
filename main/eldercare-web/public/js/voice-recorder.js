/**
 * ElderCare Web录音功能JavaScript实现
 * 支持浏览器录音、实时播放、上传处理
 * 
 * 作者: assistant
 * 日期: 2025-09-18
 * 版本: 1.0
 */

class ElderCareVoiceRecorder {
    constructor(config = {}) {
        this.config = {
            sampleRate: 16000,
            channels: 1,
            bitsPerSample: 16,
            format: 'wav',
            maxDuration: 30, // 最大录音时长（秒）
            minDuration: 3,  // 最小录音时长（秒）
            apiEndpoint: '/eldercare/api/voice/upload-recording',
            ...config
        };
        
        this.mediaRecorder = null;
        this.audioContext = null;
        this.stream = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.recordStartTime = null;
        this.recordingTimer = null;
        
        // 事件回调
        this.onRecordStart = config.onRecordStart || (() => {});
        this.onRecordStop = config.onRecordStop || (() => {});
        this.onRecordProgress = config.onRecordProgress || (() => {});
        this.onUploadProgress = config.onUploadProgress || (() => {});
        this.onUploadComplete = config.onUploadComplete || (() => {});
        this.onError = config.onError || ((error) => console.error('Recording Error:', error));
        
        this.init();
    }
    
    async init() {
        try {
            // 检查浏览器兼容性
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('浏览器不支持录音功能，请使用现代浏览器');
            }
            
            if (!window.MediaRecorder) {
                throw new Error('浏览器不支持MediaRecorder API');
            }
            
            console.log('ElderCare Voice Recorder初始化成功');
        } catch (error) {
            this.onError(error);
        }
    }
    
    /**
     * 开始录音
     */
    async startRecording() {
        try {
            if (this.isRecording) {
                throw new Error('正在录音中，请先停止当前录音');
            }
            
            // 获取麦克风权限
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.config.sampleRate,
                    channelCount: this.config.channels,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            // 创建MediaRecorder
            const options = {
                mimeType: 'audio/webm;codecs=opus'
            };
            
            // 检查支持的格式
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                if (MediaRecorder.isTypeSupported('audio/webm')) {
                    options.mimeType = 'audio/webm';
                } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    options.mimeType = 'audio/mp4';
                } else {
                    options.mimeType = 'audio/wav';
                }
            }
            
            this.mediaRecorder = new MediaRecorder(this.stream, options);
            this.audioChunks = [];
            
            // 设置录音事件处理
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.handleRecordingComplete();
            };
            
            this.mediaRecorder.onerror = (event) => {
                this.onError(new Error(`录音错误: ${event.error}`));
                this.stopRecording();
            };
            
            // 开始录音
            this.mediaRecorder.start(100); // 每100ms收集一次数据
            this.isRecording = true;
            this.recordStartTime = Date.now();
            
            // 开始录音进度计时器
            this.startProgressTimer();
            
            this.onRecordStart();
            
            // 设置最大录音时长保护
            setTimeout(() => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            }, this.config.maxDuration * 1000);
            
        } catch (error) {
            this.onError(error);
        }
    }
    
    /**
     * 停止录音
     */
    stopRecording() {
        try {
            if (!this.isRecording || !this.mediaRecorder) {
                return;
            }
            
            const recordDuration = (Date.now() - this.recordStartTime) / 1000;
            
            if (recordDuration < this.config.minDuration) {
                throw new Error(`录音时长至少需要${this.config.minDuration}秒`);
            }
            
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // 停止录音计时器
            if (this.recordingTimer) {
                clearInterval(this.recordingTimer);
                this.recordingTimer = null;
            }
            
            // 停止音频流
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            
            this.onRecordStop({
                duration: recordDuration
            });
            
        } catch (error) {
            this.onError(error);
        }
    }
    
    /**
     * 开始录音进度计时器
     */
    startProgressTimer() {
        this.recordingTimer = setInterval(() => {
            if (this.isRecording && this.recordStartTime) {
                const duration = (Date.now() - this.recordStartTime) / 1000;
                this.onRecordProgress({
                    duration: duration,
                    remaining: Math.max(0, this.config.maxDuration - duration)
                });
            }
        }, 100);
    }
    
    /**
     * 处理录音完成
     */
    async handleRecordingComplete() {
        try {
            if (this.audioChunks.length === 0) {
                throw new Error('录音数据为空');
            }
            
            // 创建音频Blob
            const audioBlob = new Blob(this.audioChunks, {
                type: this.mediaRecorder.mimeType || 'audio/wav'
            });
            
            // 转换为Base64格式
            const base64Audio = await this.blobToBase64(audioBlob);
            
            // 创建音频URL用于播放预览
            const audioUrl = URL.createObjectURL(audioBlob);
            
            const recordingData = {
                audioBlob: audioBlob,
                base64Audio: base64Audio,
                audioUrl: audioUrl,
                duration: (Date.now() - this.recordStartTime) / 1000,
                size: audioBlob.size,
                mimeType: this.mediaRecorder.mimeType || 'audio/wav'
            };
            
            // 可以在这里添加音频预览功能
            this.showRecordingPreview(recordingData);
            
        } catch (error) {
            this.onError(error);
        }
    }
    
    /**
     * 显示录音预览
     */
    showRecordingPreview(recordingData) {
        // 创建音频预览元素
        const audioElement = document.createElement('audio');
        audioElement.src = recordingData.audioUrl;
        audioElement.controls = true;
        audioElement.style.marginTop = '10px';
        
        // 可以插入到页面指定位置
        const previewContainer = document.getElementById('recording-preview');
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.appendChild(audioElement);
            
            // 添加上传按钮
            const uploadBtn = document.createElement('button');
            uploadBtn.textContent = '上传录音';
            uploadBtn.className = 'btn btn-primary';
            uploadBtn.style.marginLeft = '10px';
            uploadBtn.onclick = () => this.uploadRecording(recordingData);
            previewContainer.appendChild(uploadBtn);
            
            // 添加重新录制按钮
            const retryBtn = document.createElement('button');
            retryBtn.textContent = '重新录制';
            retryBtn.className = 'btn btn-secondary';
            retryBtn.style.marginLeft = '10px';
            retryBtn.onclick = () => {
                previewContainer.innerHTML = '';
                URL.revokeObjectURL(recordingData.audioUrl);
            };
            previewContainer.appendChild(retryBtn);
        }
    }
    
    /**
     * 上传录音到服务器
     */
    async uploadRecording(recordingData, voiceInfo = {}) {
        try {
            const uploadData = {
                user_id: voiceInfo.user_id || this.config.userId,
                audio_data: recordingData.base64Audio,
                format: this.getAudioFormat(recordingData.mimeType),
                family_member_name: voiceInfo.family_member_name || '家人',
                relationship: voiceInfo.relationship || 'family',
                reference_text: voiceInfo.reference_text || '您好，我是您的家人，这是我的普通话测试部分。'
            };
            
            this.onUploadProgress({ progress: 0, status: '开始上传...' });
            
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(uploadData)
            });
            
            this.onUploadProgress({ progress: 50, status: '处理中...' });
            
            const result = await response.json();
            
            this.onUploadProgress({ progress: 100, status: '上传完成' });
            
            if (result.success) {
                this.onUploadComplete({
                    success: true,
                    voice_id: result.voice_id,
                    tts_model_id: result.tts_model_id,
                    audio_file_path: result.audio_file_path,
                    message: result.message
                });
            } else {
                throw new Error(result.message || '上传失败');
            }
            
            // 清理预览资源
            URL.revokeObjectURL(recordingData.audioUrl);
            
        } catch (error) {
            this.onError(error);
            this.onUploadProgress({ progress: 0, status: '上传失败' });
        }
    }
    
    /**
     * Blob转Base64
     */
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    /**
     * 获取音频格式
     */
    getAudioFormat(mimeType) {
        if (mimeType.includes('webm')) return 'webm';
        if (mimeType.includes('mp4')) return 'mp4';
        if (mimeType.includes('wav')) return 'wav';
        return 'wav';
    }
    
    /**
     * 检查录音权限
     */
    async checkPermissions() {
        try {
            const result = await navigator.permissions.query({ name: 'microphone' });
            return result.state; // 'granted', 'denied', 'prompt'
        } catch (error) {
            console.warn('无法检查麦克风权限:', error);
            return 'unknown';
        }
    }
    
    /**
     * 清理资源
     */
    destroy() {
        if (this.isRecording) {
            this.stopRecording();
        }
        
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

/**
 * ElderCare录音UI组件
 */
class ElderCareRecordingUI {
    constructor(containerId, config = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`找不到容器元素: ${containerId}`);
        }
        
        this.config = {
            userId: null,
            showWaveform: true,
            showTimer: true,
            ...config
        };
        
        this.recorder = null;
        this.isRecording = false;
        
        this.render();
        this.initRecorder();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="eldercare-recording-panel">
                <div class="recording-status">
                    <div id="recording-indicator" class="recording-indicator hidden">
                        <span class="recording-dot"></span>
                        <span class="recording-text">录音中...</span>
                    </div>
                    <div id="recording-timer" class="recording-timer hidden">00:00</div>
                </div>
                
                <div class="recording-controls">
                    <button id="record-btn" class="record-button">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="8"/>
                        </svg>
                        <span>开始录音</span>
                    </button>
                    
                    <button id="stop-btn" class="stop-button hidden">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="6" width="12" height="12"/>
                        </svg>
                        <span>停止录音</span>
                    </button>
                </div>
                
                <div class="recording-settings">
                    <div class="form-group">
                        <label for="family-name">家人姓名:</label>
                        <input type="text" id="family-name" placeholder="如：妈妈" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="relationship">关系:</label>
                        <select id="relationship">
                            <option value="family">家人</option>
                            <option value="son">儿子</option>
                            <option value="daughter">女儿</option>
                            <option value="spouse">配偶</option>
                            <option value="parent">父母</option>
                            <option value="sibling">兄弟姐妹</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="reference-text">参考文本:</label>
                        <textarea id="reference-text" rows="3" placeholder="请说出这段文字以训练声音模型...">您好，我是您的家人，这是我的普通话测试部分。</textarea>
                    </div>
                </div>
                
                <div id="recording-preview" class="recording-preview"></div>
                
                <div id="upload-progress" class="upload-progress hidden">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-text">准备上传...</div>
                </div>
            </div>
        `;
        
        // 添加样式
        this.addStyles();
        
        // 绑定事件
        this.bindEvents();
    }
    
    initRecorder() {
        this.recorder = new ElderCareVoiceRecorder({
            userId: this.config.userId,
            onRecordStart: () => this.onRecordStart(),
            onRecordStop: (data) => this.onRecordStop(data),
            onRecordProgress: (data) => this.onRecordProgress(data),
            onUploadProgress: (data) => this.onUploadProgress(data),
            onUploadComplete: (data) => this.onUploadComplete(data),
            onError: (error) => this.onError(error)
        });
    }
    
    bindEvents() {
        document.getElementById('record-btn').onclick = () => this.startRecording();
        document.getElementById('stop-btn').onclick = () => this.stopRecording();
    }
    
    async startRecording() {
        try {
            // 验证表单
            const familyName = document.getElementById('family-name').value.trim();
            if (!familyName) {
                throw new Error('请输入家人姓名');
            }
            
            await this.recorder.startRecording();
        } catch (error) {
            this.onError(error);
        }
    }
    
    stopRecording() {
        this.recorder.stopRecording();
    }
    
    onRecordStart() {
        this.isRecording = true;
        document.getElementById('record-btn').classList.add('hidden');
        document.getElementById('stop-btn').classList.remove('hidden');
        document.getElementById('recording-indicator').classList.remove('hidden');
        document.getElementById('recording-timer').classList.remove('hidden');
    }
    
    onRecordStop(data) {
        this.isRecording = false;
        document.getElementById('record-btn').classList.remove('hidden');
        document.getElementById('stop-btn').classList.add('hidden');
        document.getElementById('recording-indicator').classList.add('hidden');
        document.getElementById('recording-timer').classList.add('hidden');
    }
    
    onRecordProgress(data) {
        const timer = document.getElementById('recording-timer');
        const minutes = Math.floor(data.duration / 60);
        const seconds = Math.floor(data.duration % 60);
        timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    onUploadProgress(data) {
        const progressContainer = document.getElementById('upload-progress');
        const progressFill = progressContainer.querySelector('.progress-fill');
        const progressText = progressContainer.querySelector('.progress-text');
        
        progressContainer.classList.remove('hidden');
        progressFill.style.width = `${data.progress}%`;
        progressText.textContent = data.status;
        
        if (data.progress >= 100) {
            setTimeout(() => {
                progressContainer.classList.add('hidden');
            }, 2000);
        }
    }
    
    onUploadComplete(data) {
        if (data.success) {
            alert(`声音克隆创建成功！\n音色ID: ${data.voice_id}\nTTS模型: ${data.tts_model_id}`);
            
            // 清理预览
            document.getElementById('recording-preview').innerHTML = '';
            
            // 重置表单
            document.getElementById('family-name').value = '';
            document.getElementById('reference-text').value = '您好，我是您的家人，这是我的普通话测试部分。';
        } else {
            this.onError(new Error(data.message || '上传失败'));
        }
    }
    
    onError(error) {
        console.error('Recording Error:', error);
        alert(`录音错误: ${error.message}`);
        
        // 重置UI状态
        this.isRecording = false;
        document.getElementById('record-btn').classList.remove('hidden');
        document.getElementById('stop-btn').classList.add('hidden');
        document.getElementById('recording-indicator').classList.add('hidden');
        document.getElementById('recording-timer').classList.add('hidden');
    }
    
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .eldercare-recording-panel {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background: #f9f9f9;
            }
            
            .recording-status {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .recording-indicator {
                display: flex;
                align-items: center;
                color: #e74c3c;
                font-weight: bold;
            }
            
            .recording-dot {
                width: 12px;
                height: 12px;
                background: #e74c3c;
                border-radius: 50%;
                margin-right: 8px;
                animation: pulse 1s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .recording-timer {
                font-family: monospace;
                font-size: 18px;
                font-weight: bold;
                color: #2c3e50;
            }
            
            .recording-controls {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .record-button, .stop-button {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 12px 24px;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .record-button {
                background: #27ae60;
                color: white;
            }
            
            .record-button:hover {
                background: #229954;
            }
            
            .stop-button {
                background: #e74c3c;
                color: white;
            }
            
            .stop-button:hover {
                background: #c0392b;
            }
            
            .recording-settings {
                display: grid;
                gap: 15px;
                margin-bottom: 20px;
            }
            
            .form-group {
                display: flex;
                flex-direction: column;
            }
            
            .form-group label {
                margin-bottom: 5px;
                font-weight: bold;
                color: #2c3e50;
            }
            
            .form-group input, .form-group select, .form-group textarea {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .recording-preview {
                margin: 20px 0;
                padding: 15px;
                border: 1px dashed #ccc;
                border-radius: 4px;
                text-align: center;
                background: white;
            }
            
            .upload-progress {
                margin-top: 20px;
            }
            
            .progress-bar {
                width: 100%;
                height: 20px;
                background: #ecf0f1;
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 10px;
            }
            
            .progress-fill {
                height: 100%;
                background: #3498db;
                transition: width 0.3s;
            }
            
            .progress-text {
                text-align: center;
                font-size: 14px;
                color: #7f8c8d;
            }
            
            .hidden {
                display: none !important;
            }
        `;
        
        document.head.appendChild(style);
    }
}

// 导出类供其他地方使用
window.ElderCareVoiceRecorder = ElderCareVoiceRecorder;
window.ElderCareRecordingUI = ElderCareRecordingUI;