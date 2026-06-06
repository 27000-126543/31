const App = {
    isLoggedIn: false,
    currentUser: null,
    currentRole: null,
    faceScanTimer: null,

    init() {
        this._setupLoginScreen();
    },

    _setupLoginScreen() {
        const loginBtn = document.getElementById('login-btn');
        const roleSelect = document.getElementById('role-select');
        const faceStatus = document.getElementById('face-status');
        const loginError = document.getElementById('login-error');

        let scanStep = 0;
        const scanMessages = ['正在识别...', '检测人脸特征...', '验证身份信息...', '登录成功！'];

        loginBtn.addEventListener('click', () => {
            loginBtn.disabled = true;
            loginError.textContent = '';
            scanStep = 0;

            this.faceScanTimer = setInterval(() => {
                scanStep++;
                if (scanStep < scanMessages.length) {
                    faceStatus.textContent = scanMessages[scanStep];
                } else {
                    clearInterval(this.faceScanTimer);
                    this._doLogin(roleSelect.value);
                }
            }, 600);
        });
    },

    _doLogin(role) {
        const userNames = {
            operator: '操作员张三',
            director: '李主任',
            manager: '王厂长'
        };

        this.currentUser = userNames[role];
        this.currentRole = role;
        this.isLoggedIn = true;

        FactoryData.operationLogs.push({
            time: new Date().toISOString(),
            user: this.currentUser,
            role: role,
            action: '人脸识别登录',
            detail: '登录成功'
        });

        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';

        this._startApp();
    },

    _startApp() {
        FactoryScene.init('three-container');
        SceneControls.init((objectData) => {
            this._onObjectClick(objectData);
        });
        UI.init(this.currentUser, this.currentRole);

        EquipmentMonitors.init(
            (alarm) => UI.addAlarm(alarm),
            () => UI.refreshAllPanels()
        );
        EquipmentMonitors.onSuggestion = (rm, suggestions) => {
            UI.showSuggestions(rm.name + ' 调整建议', suggestions);
        };
        EquipmentMonitors.start();

        FactoryData.orders.forEach(order => {
            EquipmentMonitors.matchOrderToLine(order);
        });

        this._animate();

        setTimeout(() => {
            if (FactoryData.alarms.length > 0) {
                const firstAlarm = FactoryData.alarms.find(a => a.level === 'critical');
                if (firstAlarm) {
                    UI.showAlert(firstAlarm.title, firstAlarm.message);
                }
            }
        }, 2000);
    },

    _onObjectClick(objectData) {
        if (objectData && objectData.data && objectData.data.position) {
            SceneControls.focusOnObject(objectData.data.position);
        }
        UI.showEquipmentDetail(objectData);

        FactoryData.operationLogs.push({
            time: new Date().toISOString(),
            user: this.currentUser,
            role: this.currentRole,
            action: '查看设备',
            detail: objectData.data ? objectData.data.name || objectData.type : objectData.type
        });
    },

    _animate(timestamp) {
        const t = timestamp ? timestamp : 0;
        requestAnimationFrame(function(ts) { App._animate(ts); });
        if (FactoryScene.renderer) {
            FactoryScene.render(t);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
