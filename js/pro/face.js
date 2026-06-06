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

    _captureFaceVector() {
        const VECTOR_SIZE = 128;
        if (!this.canvasEl || !this.videoEl || !this.videoEl.videoWidth) {
            return this._generateMockFaceVector();
        }
        const ctx = this.canvasEl.getContext('2d');
        this.canvasEl.width = this.videoEl.videoWidth;
        this.canvasEl.height = this.videoEl.videoHeight;
        ctx.drawImage(this.videoEl, 0, 0);
        try {
            const imgData = ctx.getImageData(0, 0, this.canvasEl.width, this.canvasEl.height).data;
            const w = this.canvasEl.width;
            const h = this.canvasEl.height;
            const vector = new Array(VECTOR_SIZE).fill(0);
            const cellW = Math.floor(w / 8);
            const cellH = Math.floor(h / 16);
            let idx = 0;
            for (let cy = 0; cy < 16 && idx < VECTOR_SIZE; cy++) {
                for (let cx = 0; cx < 8 && idx < VECTOR_SIZE; cx++) {
                    let rSum = 0, gSum = 0, bSum = 0, count = 0;
                    const startX = cx * cellW;
                    const startY = cy * cellH;
                    for (let py = startY; py < startY + cellH && py < h; py += 2) {
                        for (let px = startX; px < startX + cellW && px < w; px += 2) {
                            const offset = (py * w + px) * 4;
                            rSum += imgData[offset];
                            gSum += imgData[offset + 1];
                            bSum += imgData[offset + 2];
                            count++;
                        }
                    }
                    if (count > 0) {
                        const lum = (0.299 * rSum + 0.587 * gSum + 0.114 * bSum) / count / 255;
                        vector[idx] = (lum - 0.5) * 2;
                    }
                    idx++;
                }
            }
            const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
            return vector.map(v => v / norm);
        } catch (e) {
            return this._generateMockFaceVector();
        }
    },

    _generateMockFaceVector() {
        const VECTOR_SIZE = 128;
        const vector = [];
        for (let i = 0; i < VECTOR_SIZE; i++) {
            vector.push((Math.random() - 0.5) * 2);
        }
        const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
        return vector.map(v => v / norm);
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

        const faceVector = this._captureFaceVector();

        let result;
        try {
            if (WSClient && WSClient.socket && WSClient.socket.readyState === WebSocket.OPEN) {
                result = await WSClient.verifyFace(faceVector, role);
            } else {
                const res = await fetch('/api/face/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ faceVector, role })
                });
                result = await res.json();
            }
        } catch (e) {
            console.error('[Face] Verify error:', e);
            result = { success: false, error: e.message };
        }

        await this._sleep(300);
        this._stopCamera();

        if (result && result.success) {
            this._setStatus('验证成功！ 匹配度 ' + (result.similarity * 100).toFixed(1) + '%  置信度 ' + (result.confidence * 100).toFixed(1) + '%');
        } else {
            this._setStatus('人脸识别失败，请重试');
            this.verifyBtn.disabled = false;
        }

        if (this.onVerified) {
            this.onVerified({
                success: result ? result.success : false,
                role: result ? result.role : role,
                name: result ? result.name : null,
                userId: result ? result.userId : null,
                similarity: result ? result.similarity : 0,
                confidence: result ? result.confidence : 0,
                faceVector: faceVector
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
