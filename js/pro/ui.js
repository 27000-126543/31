const UIManager = {
    state: null,
    user: null,
    role: null,
    currentDetail: null,
    seenAlarmIds: {},
    timelineData: null,

    init(user, role) {
        this.user = user;
        this.role = role;

        document.getElementById('current-user').textContent = user;
        const roleLabels = { operator: '操作员', director: '车间主任', manager: '厂长' };
        document.getElementById('current-role').textContent = roleLabels[role] || role;

        document.getElementById('logout-btn').addEventListener('click', () => location.reload());
        document.getElementById('export-btn').addEventListener('click', () => this._exportReport());

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                FactoryScene.focusArea(btn.dataset.area);
                WSClient.logOperation({ action: '导航切换', detail: btn.dataset.area });
            });
        });

        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById(btn.dataset.close).style.display = 'none';
            });
        });

        document.getElementById('execute-suggestion').addEventListener('click', () => {
            document.getElementById('suggestion-modal').style.display = 'none';
            WSClient.logOperation({ action: '执行调整建议', detail: this.currentDetail ? this.currentDetail.type : '' });
        });

        this._startClock();
    },

    _startClock() {
        const el = document.getElementById('clock');
        const tick = () => {
            const d = new Date();
            el.textContent = d.toLocaleString('zh-CN', { hour12: false });
        };
        tick();
        setInterval(tick, 1000);
    },

    updateState(state) {
        this.state = state;

        document.getElementById('stat-production').textContent = state.dailyStats.production;
        document.getElementById('stat-pass-rate').textContent = state.dailyStats.passRate.toFixed(1) + '%';
        document.getElementById('stat-alarms').textContent = state.alarms.length;
        document.getElementById('stat-energy').textContent = state.dailyStats.totalEnergy.toFixed(0);

        this._renderAlarms(state.alarms);
        this._renderEnvironmental(state.stacks);
        this._renderPersonnel(state.personnel);

        if (this.currentDetail) {
            this.showEquipmentDetail(this.currentDetail, true);
        }
    },

    updateTimeline(tl) {
        this.timelineData = tl;
        this._renderTimeline(tl);
    },

    _renderAlarms(alarms) {
        const list = document.getElementById('alarm-list');
        if (!alarms || alarms.length === 0) {
            list.innerHTML = '<div class="empty-hint">暂无报警</div>';
            return;
        }

        list.innerHTML = '';
        alarms.slice(0, 20).forEach(a => {
            const item = document.createElement('div');
            item.className = 'alarm-item ' + a.level;
            const t = new Date(a.timestamp).toLocaleTimeString('zh-CN', { hour12: false });
            item.innerHTML =
                '<div class="alarm-title">' + a.title + '</div>' +
                '<div class="alarm-message">' + a.message + '</div>' +
                '<div class="alarm-time">' + t + '</div>';
            list.appendChild(item);

            if (!this.seenAlarmIds[a.id]) {
                this.seenAlarmIds[a.id] = true;
                if (a.level === 'critical') {
                    this.showAlert(a.title, a.message);
                }
            }
        });
    },

    _renderEnvironmental(stacks) {
        const container = document.getElementById('environmental-stats');
        container.innerHTML = '';
        stacks.forEach(st => {
            const so2Pct = Math.min(100, (st.so2 / st.so2Limit) * 100);
            const noxPct = Math.min(100, (st.nox / st.noxLimit) * 100);
            const so2Cls = st.so2 > st.so2Limit ? 'danger' : (st.so2 > st.so2Limit * 0.8 ? 'warning' : '');
            const noxCls = st.nox > st.noxLimit ? 'danger' : (st.nox > st.noxLimit * 0.8 ? 'warning' : '');

            const div = document.createElement('div');
            div.className = 'env-item';
            div.innerHTML =
                '<div class="env-name">' + st.name + (st.overLimit ? ' ⚠️ 超标' : '') + '</div>' +
                '<div class="env-row">' +
                    '<span>SO₂</span>' +
                    '<div class="env-bar-wrap"><div class="env-bar ' + so2Cls + '" style="width:' + so2Pct + '%"></div></div>' +
                    '<span>' + st.so2.toFixed(0) + '/' + st.so2Limit + '</span>' +
                '</div>' +
                '<div class="env-row">' +
                    '<span>NOx</span>' +
                    '<div class="env-bar-wrap"><div class="env-bar ' + noxCls + '" style="width:' + noxPct + '%"></div></div>' +
                    '<span>' + st.nox.toFixed(0) + '/' + st.noxLimit + '</span>' +
                '</div>';
            container.appendChild(div);
        });
    },

    _renderPersonnel(personnel) {
        const list = document.getElementById('personnel-list');
        list.innerHTML = '';
        personnel.forEach(p => {
            const item = document.createElement('div');
            item.className = 'personnel-item' + (p.inDanger ? ' danger' : '');
            item.innerHTML =
                '<span class="personnel-name">' + p.name + (p.inDanger ? ' ⚠️' : '') + '</span>' +
                '<span class="personnel-role">' + p.role + '</span>';
            list.appendChild(item);
        });
    },

    _renderTimeline(tl) {
        const container = document.getElementById('timeline');
        if (!tl || !tl.events) { container.innerHTML = '<div class="empty-hint">暂无计划</div>'; return; }
        container.innerHTML = '';
        tl.events.forEach(ev => {
            const fmt = t => new Date(t).toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            const div = document.createElement('div');
            div.className = 'timeline-item ' + ev.type;
            div.innerHTML =
                '<div class="timeline-title">' + ev.title + '</div>' +
                '<div class="timeline-meta">' + ev.equipment + '</div>' +
                '<div class="timeline-time">' + fmt(ev.startTime) + ' ~ ' + fmt(ev.endTime) + '</div>';
            container.appendChild(div);
        });
    },

    showEquipmentDetail(userData, isRefresh) {
        if (!userData || !userData.type || !userData.data) return;
        if (!isRefresh) this.currentDetail = userData;

        const d = userData.data;
        const container = document.getElementById('equipment-detail');
        let html = '';

        if (userData.type === 'blastFurnace') {
            const tempCls = d.hotMetalTemp < 1480 ? 'danger' : (d.hotMetalTemp < 1495 ? 'warning' : 'success');
            html += this._row('设备名称', d.name);
            html += this._row('运行状态', '运行中', 'success');
            html += '<div class="detail-section-title">核心参数</div>';
            html += this._row('铁水温度', d.hotMetalTemp.toFixed(1) + ' ℃', tempCls);
            html += this._row('风口风压', d.windPressure.toFixed(0) + ' kPa');
            html += this._row('硅含量', d.silicon.toFixed(3) + ' %');
            html += this._row('炉顶料面', d.burdenLevel.toFixed(0) + ' %');
            if (d.hotMetalTemp < 1480) {
                html += this._row('状态', '加硅增温中', 'danger');
            }
            html += '<button class="detail-chart-btn" id="bf-chart-btn">📈 查看近24小时炉况曲线</button>';
        } else if (userData.type === 'converter') {
            const tCls = d.temp > 1700 ? 'danger' : (d.temp > 1680 ? 'warning' : 'success');
            html += this._row('设备名称', d.name);
            html += this._row('运行状态', d.status === 'blowing' ? '吹炼中' : d.status, 'success');
            html += '<div class="detail-section-title">温度与成分</div>';
            html += this._row('钢水温度', d.temp.toFixed(0) + ' ℃', tCls);
            html += this._row('碳 C', d.carbon.toFixed(3) + ' %');
            html += this._row('锰 Mn', d.manganese.toFixed(3) + ' %');
            html += this._row('磷 P', d.phosphorus.toFixed(3) + ' %');
            html += this._row('硫 S', d.sulfur.toFixed(3) + ' %');
            if (d.temp > 1700) {
                html += this._row('底吹氩气', '已启动', 'warning');
            }
        } else if (userData.type === 'caster') {
            const vCls = d.levelVariation > 3 ? 'danger' : (d.levelVariation > 2.2 ? 'warning' : 'success');
            html += this._row('设备名称', d.name);
            html += this._row('运行状态', d.status === 'casting' ? '浇注中' : d.status, 'success');
            html += '<div class="detail-section-title">工艺参数</div>';
            html += this._row('拉速', d.castingSpeed.toFixed(2) + ' m/min');
            html += this._row('结晶器液面', d.moldLevel.toFixed(1) + ' mm');
            html += this._row('液面波动', d.levelVariation.toFixed(1) + ' mm', vCls);
            if (d.levelVariation > 3) {
                html += this._row('状态', '自动降速中', 'danger');
            }
        } else if (userData.type === 'rollingMill') {
            const dev = Math.abs(d.thicknessDeviation);
            const devCls = dev > 0.1 ? 'danger' : (dev > 0.07 ? 'warning' : 'success');
            html += this._row('设备名称', d.name);
            html += this._row('产线类型', d.lineType === 'CSP' ? 'CSP薄板线' : '宽厚板线');
            html += this._row('运行状态', d.status === 'rolling' ? '轧制中' : d.status, 'success');
            html += '<div class="detail-section-title">轧制参数</div>';
            html += this._row('轧制力', d.rollingForce.toFixed(0) + ' 吨');
            html += this._row('目标厚度', d.targetThickness.toFixed(2) + ' mm');
            html += this._row('厚度偏差', d.thicknessDeviation.toFixed(3) + ' mm', devCls);
            html += this._row('厚度范围', d.thicknessRange[0] + ' ~ ' + d.thicknessRange[1] + ' mm');
        } else if (userData.type === 'rawPile') {
            const stockCls = d.lowStock ? 'danger' : 'success';
            html += this._row('料堆名称', d.name);
            html += this._row('物料品种', d.material);
            html += '<div class="detail-section-title">库存信息</div>';
            html += this._row('当前库存', Math.floor(d.stock) + ' 吨');
            html += this._row('预计可用', d.daysLeft + ' 天', stockCls);
            if (d.lowStock) {
                html += this._row('状态', '库存不足，已生成采购计划', 'danger');
            }
        } else if (userData.type === 'stack') {
            const over = d.overLimit;
            html += this._row('烟囱名称', d.name);
            html += this._row('排放状态', over ? '超标' : '正常', over ? 'danger' : 'success');
            html += '<div class="detail-section-title">排放浓度</div>';
            html += this._row('SO₂', d.so2.toFixed(0) + ' / ' + d.so2Limit + ' mg/m³', d.so2 > d.so2Limit ? 'danger' : '');
            html += this._row('NOx', d.nox.toFixed(0) + ' / ' + d.noxLimit + ' mg/m³', d.nox > d.noxLimit ? 'danger' : '');
            if (over) {
                html += this._row('减排措施', '已触发减排指令，整改单已生成', 'danger');
            }
        } else if (userData.type === 'personnel') {
            html += this._row('姓名', d.name);
            html += this._row('岗位', d.role);
            html += '<div class="detail-section-title">位置信息</div>';
            html += this._row('X 坐标', d.x.toFixed(1));
            html += this._row('Z 坐标', d.z.toFixed(1));
            html += this._row('状态', d.inDanger ? '⚠️ 在危险区' : '正常', d.inDanger ? 'danger' : 'success');
        } else {
            html = '<div class="empty-hint">选择设备查看详情</div>';
        }

        container.innerHTML = html;

        const bfBtn = document.getElementById('bf-chart-btn');
        if (bfBtn && userData.type === 'blastFurnace') {
            bfBtn.addEventListener('click', () => this._showBFChart(d));
        }

        if (!isRefresh) {
            WSClient.logOperation({ action: '查看设备', detail: d.name || userData.type });
        }
    },

    _row(label, value, cls) {
        return '<div class="detail-item"><span class="detail-label">' + label + '</span><span class="detail-value ' + (cls || '') + '">' + value + '</span></div>';
    },

    showAlert(title, message) {
        document.getElementById('alert-title').textContent = title;
        document.getElementById('alert-message').textContent = message;
        document.getElementById('alert-modal').style.display = 'flex';
    },

    showSuggestions(title, suggestions) {
        document.getElementById('suggestion-title').textContent = title;
        const list = document.getElementById('suggestion-list');
        list.innerHTML = '';
        suggestions.forEach(s => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = s;
            list.appendChild(div);
        });
        document.getElementById('suggestion-modal').style.display = 'flex';
    },

    _showBFChart(data) {
        document.getElementById('chart-title').textContent = data.name + ' - 近24小时炉况曲线';
        document.getElementById('chart-modal').style.display = 'flex';
        WSClient.requestHistory(data.id);

        WSClient.on('bf_history', (history) => {
            this._drawChart(history);
        });
    },

    _drawChart(history) {
        if (!history || history.length === 0) return;
        const canvas = document.getElementById('chart-canvas');
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        ctx.fillStyle = '#05080d';
        ctx.fillRect(0, 0, W, H);

        const padL = 60, padR = 20, padT = 30, padB = 40;
        const chartW = W - padL - padR, chartH = H - padT - padB;

        ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padT + (chartH / 5) * i;
            ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
        }

        const tempMin = 1440, tempMax = 1560;
        const xStep = chartW / (history.length - 1);

        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        history.forEach((p, i) => {
            const x = padL + i * xStep;
            const y = padT + chartH - ((p.temp - tempMin) / (tempMax - tempMin)) * chartH;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 2;
        ctx.beginPath();
        history.forEach((p, i) => {
            const x = padL + i * xStep;
            const prsMin = 300, prsMax = 450;
            const y = padT + chartH - ((p.pressure - prsMin) / (prsMax - prsMin)) * chartH;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = '#00d4ff';
        ctx.font = '12px sans-serif';
        ctx.fillText('温度 (℃)', padL, padT - 10);
        ctx.fillStyle = '#ff6b35';
        ctx.fillText('风压 (kPa)', padL + 100, padT - 10);

        ctx.fillStyle = '#6b7280';
        ctx.font = '10px sans-serif';
        for (let i = 0; i <= 5; i++) {
            const y = padT + (chartH / 5) * i;
            ctx.fillText((tempMax - (tempMax - tempMin) * i / 5).toFixed(0), 10, y + 4);
        }
        history.forEach((p, i) => {
            if (i % 4 === 0) {
                const t = new Date(p.time);
                const x = padL + i * xStep;
                ctx.fillStyle = '#6b7280';
                ctx.fillText(t.getHours() + ':00', x - 12, H - padB + 18);
            }
        });
    },

    async _exportReport() {
        try {
            const shift = 'day';
            const res = await fetch('/api/report/daily?shift=' + shift);
            const buf = await res.arrayBuffer();
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'SteelFactory_DailyReport_' + shift + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';
            a.click();
            URL.revokeObjectURL(url);
            WSClient.logOperation({ action: '导出日报', detail: shift + ' 班' });
        } catch (e) {
            console.error('Export failed:', e);
            this.showAlert('导出失败', e.message);
        }
    }
};
