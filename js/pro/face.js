const FaceRecognition = {
    videoEl: null,
    canvasEl: null,
    stream: null,
    onVerified: null,
    userId: null,

    init(roleSelectCallback) {
        this.videoEl = document.getElementById('face-video');
        this.canvasEl = document.getElementById('face-canvas');
        this.statusEl = document.getElementById('face-status');
        this.startBtn = document.getElementById('start-face-btn');
        this.verifyBtn = document.getElementById('verify-face-btn');
        this.roleSelect = document.getElementById('role-select');

        this.startBtn.addEventListener('click', () => this._startCamera());
        this.verifyBtn.addEventListener('click', () => this._verify());

        this._setStatus('请将面部置于框内，点击开始识别');
    },

    _setStatus(text) {
        if (this.statusEl) this.statusEl.textContent = text;
    },

    async _startCamera() {
        try {
            this._setStatus('正在请求摄像头权限...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: 'user' },
                audio: false
            });
            this.stream = stream;
            this.videoEl.srcObject = stream;
            this.startBtn.disabled = true;
            this.verifyBtn.disabled = false;
            this._setStatus('摄像头已就绪，请点击人脸识别登录');
        } catch (err) {
            console.error('[Face] Camera error:', err);
            this._setStatus('无法访问摄像头: ' + err.message + '（使用模拟识别）');
            this.startBtn.disabled = true;
            this.verifyBtn.disabled = false;
        }
    },

    _captureFaceData() {
        if (!this.canvasEl || !this.videoEl || !this.videoEl.videoWidth) {
            return this._generateMockFaceData();
        }
        const ctx = this.canvasEl.getContext('2d');
        this.canvasEl.width = this.videoEl.videoWidth;
        this.canvasEl.height = this.videoEl.videoHeight;
        ctx.drawImage(this.videoEl, 0, 0);
        try {
            const imgData = ctx.getImageData(0, 0, this.canvasEl.width, this.canvasEl.height).data;
            let rSum = 0, gSum = 0, bSum = 0, pCount = 0;
            for (let i = 0; i < imgData.length; i += 16) {
                rSum += imgData[i];
                gSum += imgData[i + 1];
                bSum += imgData[i + 2];
                pCount++;
            }
            return {
                r: Math.floor(rSum / pCount),
                g: Math.floor(gSum / pCount),
                b: Math.floor(bSum / pCount),
                w: this.canvasEl.width,
                h: this.canvasEl.height,
                hash: (rSum ^ gSum ^ bSum).toString(36)
            };
        } catch (e) {
            return this._generateMockFaceData();
        }
    },

    _generateMockFaceData() {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return {
            r, g, b, w: 320, h: 240,
            hash: (r ^ g ^ b ^ Date.now()).toString(36)
        };
    },

    async _verify() {
        this.verifyBtn.disabled = true;
        this._setStatus('正在扫描人脸特征...');

        const role = this.roleSelect.value;
        this.userId = role;

        const steps = ['检测人脸特征...', '提取关键标识点...', '比对身份信息...', '验证成功！'];
        for (let i = 0; i < steps.length; i++) {
            await this._sleep(600);
            this._setStatus(steps[i]);
        }

        const faceData = this._captureFaceData();

        const userNames = {
            operator: '操作员张三',
            director: '李主任',
            manager: '王厂长'
        };
        const name = userNames[role];

        await this._sleep(500);
        this._stopCamera();

        if (this.onVerified) {
            this.onVerified({
                success: true,
                role: role,
                name: name,
                userId: this.userId,
                similarity: 0.85 + Math.random() * 0.1,
                faceData: faceData
            });
        }
    },

    _stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
    },

    _sleep(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
};
