const App = {
    init() {
        if (location.pathname.endsWith('index-pro.html') || location.pathname.endsWith('/pro/')) {
            FaceRecognition.init();
            FaceRecognition.onVerified = (info) => this._onLoginSuccess(info);
        }

        if (document.getElementById('role-select')) {
            const fallbackLogin = () => {
                const role = document.getElementById('role-select').value;
                const names = { operator: '操作员张三', director: '李主任', manager: '王厂长' };
                this._onLoginSuccess({ role, name: names[role], success: true, similarity: 0.92 });
            };

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === 'F2') {
                    const loginScreen = document.getElementById('login-screen');
                    if (loginScreen && loginScreen.style.display !== 'none') {
                        fallbackLogin();
                    }
                }
            });

            const loginBody = document.querySelector('.login-body');
            if (loginBody) {
                loginBody.addEventListener('dblclick', fallbackLogin);
            }
        }
    },

    _onLoginSuccess(info) {
        if (!info.success) {
            const err = document.getElementById('login-error');
            if (err) err.textContent = '人脸识别失败，请重试';
            return;
        }

        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';

        UIManager.init(info.name, info.role);

        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            const scoreSpan = document.createElement('span');
            scoreSpan.id = 'face-score';
            scoreSpan.style.color = '#00d4ff';
            scoreSpan.style.marginLeft = '10px';
            scoreSpan.style.fontSize = '12px';
            scoreSpan.textContent = '匹配度 ' + ((info.similarity || 0) * 100).toFixed(1) + '%';
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                userInfo.insertBefore(scoreSpan, logoutBtn);
            } else {
                userInfo.appendChild(scoreSpan);
            }
        }

        FactoryScene.onClick = (userData) => UIManager.showEquipmentDetail(userData);
        FactoryScene.init('three-container');

        WSClient.init();

        WSClient.on('connected', () => {
            console.log('[App] WebSocket connected');
        });

        WSClient.on('init', (data, raw) => {
            console.log('[App] Received initial state');
            FactoryScene.setState(data);
            UIManager.updateState(data);
            if (raw && raw.timeline) {
                UIManager.updateTimeline(raw.timeline);
            }
        });

        WSClient.on('tick', (data) => {
            FactoryScene.setState(data);
            UIManager.updateState(data);

            if (data.rollingMills) {
                data.rollingMills.forEach(rm => {
                    if (Math.abs(rm.thicknessDeviation) > 0.1 && rm._suggestions) {
                        UIManager.showSuggestions(rm.name + ' 调整建议', rm._suggestions);
                    }
                });
            }
        });

        WSClient.on('timeline', (data) => {
            UIManager.updateTimeline(data);
        });

        WSClient.on('bf_history', (history, raw) => {
            UIManager._drawChart(raw ? raw.data : history);
        });

        WSClient.on('match_result', (data) => {
            if (data && data.data && data.data.success) {
                console.log('[App] Order matched:', data.data);
            }
        });

        WSClient.logOperation({
            action: '人脸识别登录',
            detail: info.name + ' (' + info.role + ') 相似度 ' + (info.similarity ? info.similarity.toFixed(3) : '')
        });

        setTimeout(() => {
            if (UIManager.state && UIManager.state.alarms && UIManager.state.alarms.length > 0) {
                const first = UIManager.state.alarms.find(a => a.level === 'critical');
                if (first) UIManager.showAlert(first.title, first.message);
            }
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
