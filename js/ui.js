const UI = {
    currentUser: null,
    currentUserRole: null,

    init(user, role) {
        this.currentUser = user;
        this.currentUserRole = role;
        this._setupEventListeners();
        this._updateUserInfo();
        this._renderAlarms();
        this._renderPersonnel();
        this._renderEnvironmental();
        this._renderScheduling();
        this._renderMaintenanceTimeline();
        this._updateHeaderStats();
        this._startTimeUpdatingTime();
    },

    _setupEventListeners() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                SceneControls.moveToArea(btn.dataset.area);
                this._addLog('切换区域', btn.textContent);
            });
        });

        document.getElementById('close-chart').addEventListener('click', () => {
            document.getElementById('chart-modal').classList.remove('active');
        });

        document.getElementById('alert-confirm').addEventListener('click', () => {
            document.getElementById('alert-modal').classList.remove('active');
        });

        document.getElementById('close-suggestion').addEventListener('click', () => {
            document.getElementById('suggestion-modal').classList.remove('active');
        });
        document.getElementById('suggestion-dismiss').addEventListener('click', () => {
            document.getElementById('suggestion-modal').classList.remove('active');
        });
        document.getElementById('suggestion-apply').addEventListener('click', () => {
            document.getElementById('suggestion-modal').classList.remove('active');
            this.showAlert('提示', '调整建议已执行');
            this._addLog('执行调整建议');
        });

        document.getElementById('export-btn').addEventListener('click', () => {
            if (!RolePermissions[this.currentUserRole].canExport) {
                this.showAlert('权限不足', '您没有导出日报的权限');
                return;
            }
            this._exportDailyReport();
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            if (confirm('确认退出登录？')) {
                location.reload();
            }
        });
    },

    _updateUserInfo() {
        const userInfo = document.getElementById('current-user');
        const roleName = RolePermissions[this.currentUserRole].name;
        userInfo.textContent = `👤 ${this.currentUser} (${roleName})`;

        if (!RolePermissions[this.currentUserRole].canExport) {
            document.getElementById('export-btn').style.display = 'none';
        }
        if (!RolePermissions[this.currentUserRole].canViewScheduling) {
            document.querySelector('#scheduling-panel').parentElement.style.display = 'none';
        }
    },

    _startTimeUpdatingTime() {
        const updateTime = () => {
            const now = new Date();
            const timeStr = now.getFullYear() + '-' +
                           (now.getMonth() + 1).toString().padStart(2, '0') + '-' +
                           now.getDate().toString().padStart(2, '0') + ' ' +
                           now.getHours().toString().padStart(2, '0') + ':' +
                           now.getMinutes().toString().padStart(2, '0') + ':' +
                           now.getSeconds().toString().padStart(2, '0');
            document.getElementById('current-time').textContent = timeStr;
        };
        updateTime();
        setInterval(updateTime, 1000);
    },

    _updateHeaderStats() {
        document.getElementById('total-output').textContent = FactoryData.shiftStats.output.toLocaleString();
        document.getElementById('qualified-rate').textContent = FactoryData.shiftStats.qualifiedRate;
        document.getElementById('alarm-count').textContent = FactoryData.alarms.filter(a => a.level === 'critical').length;
        document.getElementById('energy-consumption').textContent = FactoryData.currentEnergy.toFixed(0);
    },

    _renderAlarms() {
        const list = document.getElementById('alarm-list');
        list.innerHTML = '';
        FactoryData.alarms.slice(0, 10).forEach(alarm => {
            const item = document.createElement('div');
            item.className = 'alarm-item ' + alarm.level;
            item.innerHTML = `
                <div class="alarm-title">${alarm.title}</div>
                <div>${alarm.message}</div>
                <div class="alarm-time">${alarm.time}</div>
            `;
            list.appendChild(item);
        });
        this._updateHeaderStats();
    },

    addAlarm(alarm) {
        this._renderAlarms();
        if (alarm.level === 'critical') {
            this.showAlert(alarm.title, alarm.message);
        }
    },

    showAlert(title, message) {
        document.getElementById('alert-title').textContent = title;
        document.getElementById('alert-message').textContent = message;
        document.getElementById('alert-modal').classList.add('active');
    },

    showSuggestions(title, suggestions) {
        document.getElementById('suggestion-title').textContent = title;
        const content = document.getElementById('suggestion-content');
        content.innerHTML = '';
        suggestions.forEach(s => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = s;
            content.appendChild(div);
        });
        document.getElementById('suggestion-modal').classList.add('active');
    },

    _renderPersonnel() {
        const list = document.getElementById('personnel-list');
        list.innerHTML = '';
        FactoryData.personnel.forEach(p => {
            const item = document.createElement('div');
            item.className = 'personnel-item' + (p.inDanger ? ' danger' : '');
            item.innerHTML = `
                <span class="personnel-name">${p.name}${p.inDanger ? ' ⚠️' : ''}</span>
                <span class="personnel-role">${p.role}</span>
            `;
            list.appendChild(item);
        });
    },

    _renderEnvironmental() {
        const container = document.getElementById('environmental-stats');
        container.innerHTML = '';
        FactoryData.environmentalStations.forEach(station => {
            const so2Percent = Math.min(100, (station.so2 / station.so2Limit) * 100);
            const noxPercent = Math.min(100, (station.nox / station.noxLimit) * 100);
            const so2Class = station.so2 > station.so2Limit ? 'danger' : (station.so2 > station.so2Limit * 0.8 ? 'warning' : 'normal');
            const noxClass = station.nox > station.noxLimit ? 'danger' : (station.nox > station.noxLimit * 0.8 ? 'warning' : 'normal');

            const item = document.createElement('div');
            item.className = 'env-item';
            item.innerHTML = `
                <div class="env-header">
                    <span class="env-name">${station.name}</span>
                </div>
                <div style="margin-bottom: 6px;">
                    <div class="env-header">
                        <span style="font-size:11px;color:#6b7280;">SO₂</span>
                        <span style="font-size:11px;color:${so2Class === 'danger' ? '#ef4444' : '#10b981'}">${station.so2.toFixed(0)}/${station.so2Limit} mg/m³</span>
                    </div>
                    <div class="env-bar"><div class="env-bar-fill ${so2Class}" style="width:${so2Percent}%"></div></div>
                </div>
                <div>
                    <div class="env-header">
                        <span style="font-size:11px;color:#6b7280;">NOx</span>
                        <span style="font-size:11px;color:${noxClass === 'danger' ? '#ef4444' : '#10b981'}">${station.nox.toFixed(0)}/${station.noxLimit} mg/m³</span>
                    </div>
                    <div class="env-bar"><div class="env-bar-fill ${noxClass}" style="width:${noxPercent}%"></div></div>
                </div>
            `;
            container.appendChild(item);
        });
    },

    _renderScheduling() {
        const container = document.getElementById('scheduling-panel');
        container.innerHTML = '';
        FactoryData.orders.forEach(order => {
            const lineName = order.line === 'CSP' ? 'CSP薄板线' : '宽厚板线';
            const statusText = { production: '生产中', scheduled: '已排产', queued: '排队中' }[order.status];
            const item = document.createElement('div');
            item.className = 'order-item';
            item.innerHTML = `
                <div class="order-id">${order.id} <span class="order-line">${lineName}</span></div>
                <div class="order-info">
                    ${order.product} ${order.thickness}×${order.width}mm / ${order.quantity}吨 / ${statusText}
                </div>
            `;
            container.appendChild(item);
        });
    },

    _renderMaintenanceTimeline() {
        const container = document.getElementById('maintenance-timeline');
        container.innerHTML = '';
        FactoryData.maintenanceSchedule.forEach(item => {
            const timelineItem = document.createElement('div');
            timelineItem.className = 'timeline-item';
            timelineItem.innerHTML = `
                <div class="timeline-time">${item.time}</div>
                <div class="timeline-title">${item.equipment} - ${item.type} (${item.duration})</div>
            `;
            container.appendChild(timelineItem);
        });
    },

    showEquipmentDetail(objectData) {
        const detail = document.getElementById('equipment-detail');
        const title = document.getElementById('selected-title');
        let html = '';
        const data = objectData.data;

        switch (objectData.type) {
            case 'blastFurnace':
                title.textContent = '🔥 ' + data.name;
                html = this._renderBlastFurnaceDetail(data);
                break;
            case 'converter':
                title.textContent = '⚙️ ' + data.name;
                html = this._renderConverterDetail(data);
                break;
            case 'caster':
                title.textContent = '🔄 ' + data.name;
                html = this._renderCasterDetail(data);
                break;
            case 'rollingMill':
                title.textContent = '🏭 ' + data.name;
                html = this._renderRollingMillDetail(data);
                break;
            case 'rawPile':
                title.textContent = '📦 ' + data.name;
                html = this._renderRawPileDetail(data);
                break;
            case 'warehouse':
                title.textContent = '📦 ' + data.name;
                html = this._renderWarehouseDetail(data);
                break;
            case 'controlRoom':
                title.textContent = '🖥️ ' + data.name;
                html = this._renderControlRoomDetail(data);
                break;
            case 'stack':
                title.textContent = '🌿 ' + data.name;
                html = this._renderStackDetail(data);
                break;
            case 'personnel':
                title.textContent = '👷 ' + data.name;
                html = this._renderPersonnelDetail(data);
                break;
            default:
                title.textContent = '📊 设备详情';
                html = '<p class="placeholder">点击场景中的设备查看详细信息</p>';
        }

        detail.innerHTML = html;

        if (objectData.type === 'blastFurnace') {
            const chartBtn = detail.querySelector('.view-chart-btn');
            if (chartBtn) {
                chartBtn.addEventListener('click', () => {
                    this._showBlastFurnaceChart(data);
                });
            }
        }
    },

    _renderBlastFurnaceDetail(data) {
        const tempClass = data.ironTemp < 1480 ? 'danger' : (data.ironTemp < 1500 ? 'warning' : '');
        return `
            <div class="detail-item">
                <span class="detail-label">运行状态</span>
                <span class="detail-value">${data.status === 'running' ? '正常' : '预警'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">风口风压</span>
                <span class="detail-value">${data.tuyerePressure.toFixed(0)} kPa</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">铁水温度</span>
                <span class="detail-value ${tempClass}">${data.ironTemp.toFixed(1)} ℃</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">硅含量</span>
                <span class="detail-value">${data.siliconContent.toFixed(2)} %</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">炉顶料面</span>
                <span class="detail-value">${data.topLevel.toFixed(1)} m</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">加硅增温</span>
                <span class="detail-value ${data.heatingActive ? 'danger' : ''}">${data.heatingActive ? '运行中 🔥' : '未启动'}</span>
            </div>
            <button class="view-chart-btn">📈 查看近24小时炉况曲线</button>
        `;
    },

    _renderConverterDetail(data) {
        const tempClass = data.steelTemp > 1700 ? 'danger' : '';
        return `
            <div class="detail-item">
                <span class="detail-label">运行状态</span>
                <span class="detail-value">${data.status === 'overheat' ? '超温' : '正常'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">钢水温度</span>
                <span class="detail-value ${tempClass}">${data.steelTemp.toFixed(1)} ℃</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">炉口火焰</span>
                <span class="detail-value" style="color:${data.steelTemp > 1700 ? '#ef4444' : '#f59e0b'};">${data.steelTemp > 1700 ? '亮红色(超温)' : '橙红色'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">碳含量 C</span>
                <span class="detail-value">${data.composition.C.toFixed(3)} %</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">锰含量 Mn</span>
                <span class="detail-value">${data.composition.Mn.toFixed(2)} %</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">磷含量 P</span>
                <span class="detail-value">${data.composition.P.toFixed(3)} %</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">硫含量 S</span>
                <span class="detail-value">${data.composition.S.toFixed(3)} %</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">底吹氩气</span>
                <span class="detail-value ${data.argonBlowing ? 'danger' : ''}">${data.argonBlowing ? '开启中 💨' : '已关闭'}</span>
            </div>
        `;
    },

    _renderCasterDetail(data) {
        const fluctClass = data.levelFluctuation > 3 ? 'danger' : '';
        return `
            <div class="detail-item">
                <span class="detail-label">运行状态</span>
                <span class="detail-value">${data.status === 'warning' ? '波动超限' : '正常'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">拉速</span>
                <span class="detail-value">${data.castingSpeed.toFixed(2)} m/min</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">结晶器液面</span>
                <span class="detail-value">${data.moldLevel.toFixed(1)} mm</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">液面波动</span>
                <span class="detail-value ${fluctClass}">±${data.levelFluctuation.toFixed(1)} mm</span>
            </div>
        `;
    },

    _renderRollingMillDetail(data) {
        const devClass = Math.abs(data.thicknessDeviation) > 0.1 ? 'warning' : '';
        return `
            <div class="detail-item">
                <span class="detail-label">产线类型</span>
                <span class="detail-value">${data.lineType === 'CSP' ? 'CSP薄板线' : '宽厚板线'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">运行状态</span>
                <span class="detail-value">${data.status === 'warning' ? '偏差超限' : '正常'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">轧制力</span>
                <span class="detail-value">${data.rollingForce.toFixed(0)} 吨</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">目标厚度</span>
                <span class="detail-value">${data.targetThickness.toFixed(1)} mm</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">厚度偏差</span>
                <span class="detail-value ${devClass}">${data.thicknessDeviation > 0 ? '+' : ''}${data.thicknessDeviation.toFixed(3)} mm</span>
            </div>
        `;
    },

    _renderRawPileDetail(data) {
        const stockClass = data.lowStock ? 'warning' : '';
        let html = '';
        html += '<div class="detail-item"><span class="detail-label">Material</span><span class="detail-value">' + data.material + '</span></div>';
        html += '<div class="detail-item"><span class="detail-label">Stock</span><span class="detail-value">' + data.stock.toLocaleString() + ' t</span></div>';
        html += '<div class="detail-item"><span class="detail-label">Days</span><span class="detail-value ' + stockClass + '">' + data.storageDays + ' d</span></div>';
        if (data.lowStock) {
            html += '<div class="detail-item"><span class="detail-label">Status</span><span class="detail-value danger">Low stock, PO generated</span></div>';
        }
        return html;
    },

    _renderWarehouseDetail(data) {
        let areasHtml = data.areas.map(area => `
            <div class="detail-item">
                <span class="detail-label">${area.name}</span>
                <span class="detail-value">${area.stock.toLocaleString()} 吨</span>
            </div>
        `).join('');
        return `
            <div class="detail-item">
                <span class="detail-label">总库存</span>
                <span class="detail-value">${data.totalStock.toLocaleString()} 吨</span>
            </div>
            ${areasHtml}
        `;
    },

    _renderControlRoomDetail(data) {
        return `
            <div class="detail-item">
                <span class="detail-label">系统状态</span>
                <span class="detail-value">正常运行</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">在线设备</span>
                <span class="detail-value">${FactoryData.blastFurnaces.length + FactoryData.converters.length + FactoryData.casters.length + FactoryData.rollingMills.length} 台</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">在岗人员</span>
                <span class="detail-value">${FactoryData.personnel.length} 人</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">当前班次</span>
                <span class="detail-value">${FactoryData.shiftStats.shift}</span>
            </div>
        `;
    },

    _renderStackDetail(data) {
        const so2Class = data.so2 > data.so2Limit ? 'danger' : (data.so2 > data.so2Limit * 0.8 ? 'warning' : '');
        const noxClass = data.nox > data.noxLimit ? 'danger' : (data.nox > data.noxLimit * 0.8 ? 'warning' : '');
        const statusClass = data.status === 'overlimit' ? 'danger' : '';
        const statusText = data.status === 'overlimit' ? 'Over Limit' : 'Normal';
        let html = '';
        html += '<div class="detail-item"><span class="detail-label">Status</span><span class="detail-value ' + statusClass + '">' + statusText + '</span></div>';
        html += '<div class="detail-item"><span class="detail-label">SO2</span><span class="detail-value ' + so2Class + '">' + data.so2.toFixed(0) + ' mg/m3</span></div>';
        html += '<div class="detail-item"><span class="detail-label">SO2 Limit</span><span class="detail-value">' + data.so2Limit + ' mg/m3</span></div>';
        html += '<div class="detail-item"><span class="detail-label">NOx</span><span class="detail-value ' + noxClass + '">' + data.nox.toFixed(0) + ' mg/m3</span></div>';
        html += '<div class="detail-item"><span class="detail-label">NOx Limit</span><span class="detail-value">' + data.noxLimit + ' mg/m3</span></div>';
        if (data.status === 'overlimit') {
            html += '<div class="detail-item"><span class="detail-label">Action</span><span class="detail-value danger">Reduction triggered</span></div>';
        }
        return html;
    },

    _renderPersonnelDetail(data) {
        return `
            <div class="detail-item">
                <span class="detail-label">姓名</span>
                <span class="detail-value">${data.name}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">岗位</span>
                <span class="detail-value">${data.role}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">安全状态</span>
                <span class="detail-value ${data.inDanger ? 'danger' : ''}">${data.inDanger ? '⚠️ 危险区域' : '安全'}</span>
            </div>
        `;
    },

    _showBlastFurnaceChart(data) {
        document.getElementById('chart-title').textContent = data.name + ' - 近24小时炉况趋势';
        document.getElementById('chart-modal').classList.add('active');

        const canvas = document.getElementById('chart-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 700;
        canvas.height = 400;
        canvas.style.width = '700px';
        canvas.style.height = '400px';

        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const padding = { top: 40, right: 40, bottom: 60, left: 60 };
        const chartWidth = canvas.width - padding.left - padding.right;
        const chartHeight = canvas.height - padding.top - padding.bottom;

        ctx.strokeStyle = '#1a2332';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(canvas.width - padding.right, y);
            ctx.stroke();
        }

        const drawLine = (dataArr, color, minVal, maxVal) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            dataArr.forEach((point, i) => {
                const x = padding.left + (chartWidth / (dataArr.length - 1)) * i;
                const y = padding.top + chartHeight - ((point - minVal) / (maxVal - minVal)) * chartHeight;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        };

        const tempData = data.history24h.map(h => h.temp);
        drawLine(tempData, '#ff6644', 1450, 1550);

        const pressureData = data.history24h.map(h => h.pressure);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00d4ff';
        ctx.beginPath();
        pressureData.forEach((point, i) => {
            const x = padding.left + (chartWidth / (pressureData.length - 1)) * i;
            const y = padding.top + chartHeight - ((point - 380) / (440 - 380)) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        data.history24h.forEach((h, i) => {
            if (i % 4 === 0) {
                const x = padding.left + (chartWidth / (data.history24h.length - 1)) * i;
                ctx.fillText(h.time, x, canvas.height - 20);
            }
        });

        ctx.fillStyle = '#ff6644';
        ctx.fillRect(padding.left + 10, 20, 20, 10);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText('铁水温度(℃)', padding.left + 35, 28);

        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(padding.left + 150, 20, 20, 10);
        ctx.fillStyle = '#fff';
        ctx.fillText('风口风压(kPa)', padding.left + 175, 28);
    },

    refreshAllPanels() {
        this._renderAlarms();
        this._renderPersonnel();
        this._renderEnvironmental();
        this._updateHeaderStats();
    },

    _addLog(action, detail = '') {
        FactoryData.operationLogs.push({
            time: new Date().toISOString(),
            user: this.currentUser,
            role: this.currentUserRole,
            action,
            detail
        });
    },

    _exportDailyReport() {
        const wb = XLSX.utils.book_new();

        const processData = [
            ['Process', 'Output', 'Qualified', 'Energy'],
            ['BF', 520, 99.2, 185],
            ['BOF', 490, 98.8, 48],
            ['CC', 485, 99.0, 35],
            ['CSP', 260, 98.5, 68],
            ['Heavy Plate', 220, 98.2, 85],
            ['Total', 1975, 98.6, 572]
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(processData);
        XLSX.utils.book_append_sheet(wb, ws1, 'Production');

        const qualityData = [
            ['Date', new Date().toLocaleDateString()],
            ['Shift', FactoryData.shiftStats.shift],
            ['Start Time', FactoryData.shiftStats.startTime],
            ['Total Output', FactoryData.shiftStats.output],
            ['Qualified Rate', FactoryData.shiftStats.qualifiedRate],
            ['Energy', FactoryData.shiftStats.energyConsumption],
            [],
            ['Env Events', FactoryData.shiftStats.envEvents]
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(qualityData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

        const alarmData = [['Time', 'Level', 'Title', 'Detail']];
        FactoryData.alarms.forEach(a => {
            const lvl = a.level === 'critical' ? 'Critical' : a.level === 'warning' ? 'Warning' : 'Info';
            alarmData.push([a.time, lvl, a.title, a.message]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(alarmData), 'Alarms');

        const dateStr = new Date().toISOString().split('T')[0];
        const shiftName = FactoryData.shiftStats.shift;
        const fileName = 'DailyReport_' + dateStr + '_' + shiftName + '.xlsx';
        XLSX.writeFile(wb, fileName);

        this._addLog('Export Report', fileName);
        this.showAlert('Success', 'Report exported: ' + fileName);
    }
};
