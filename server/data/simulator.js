class IndustrialDataSimulator {
    constructor() {
        this.state = {
            blastFurnaces: [
                {
                    id: 'bf_001', name: '1号高炉',
                    windPressure: 380, hotMetalTemp: 1510, silicon: 0.55,
                    burdenLevel: 72, status: 'running', history: []
                },
                {
                    id: 'bf_002', name: '2号高炉',
                    windPressure: 365, hotMetalTemp: 1495, silicon: 0.62,
                    burdenLevel: 68, status: 'running', history: []
                },
                {
                    id: 'bf_003', name: '3号高炉',
                    windPressure: 392, hotMetalTemp: 1525, silicon: 0.48,
                    burdenLevel: 81, status: 'running', history: []
                }
            ],
            converters: [
                {
                    id: 'conv_001', name: '1号转炉',
                    temp: 1650, flameColor: 0xff6600, carbon: 0.06,
                    manganese: 0.45, phosphorus: 0.018, sulfur: 0.012,
                    status: 'blowing', argonActive: false
                },
                {
                    id: 'conv_002', name: '2号转炉',
                    temp: 1680, flameColor: 0xff3300, carbon: 0.04,
                    manganese: 0.38, phosphorus: 0.015, sulfur: 0.009,
                    status: 'blowing', argonActive: false
                }
            ],
            casters: [
                {
                    id: 'cast_001', name: '1号连铸机',
                    castingSpeed: 1.8, moldLevel: 45.2, levelVariation: 1.2,
                    status: 'casting'
                },
                {
                    id: 'cast_002', name: '2号连铸机',
                    castingSpeed: 1.6, moldLevel: 48.7, levelVariation: 2.1,
                    status: 'casting'
                }
            ],
            rollingMills: [
                {
                    id: 'rm_csp', name: 'CSP薄板轧机',
                    rollingForce: 1850, thicknessDeviation: 0.04,
                    targetThickness: 2.0, status: 'rolling',
                    lineType: 'CSP', thicknessRange: [0.8, 6.0]
                },
                {
                    id: 'rm_heavy', name: '宽厚板轧机',
                    rollingForce: 4200, thicknessDeviation: 0.08,
                    targetThickness: 25.0, status: 'rolling',
                    lineType: 'heavy', thicknessRange: [6.0, 80.0]
                }
            ],
            rawYard: [
                {
                    id: 'pile_001', name: '焦炭A堆',
                    material: 'Coke', stock: 8500, daysLeft: 12, lowStock: false,
                    position: { x: -40, z: -30 }, color: 0x3a3a3a
                },
                {
                    id: 'pile_002', name: '铁矿石B堆',
                    material: 'Iron Ore', stock: 22000, daysLeft: 18, lowStock: false,
                    position: { x: -40, z: -15 }, color: 0x8b4513
                },
                {
                    id: 'pile_003', name: '石灰石C堆',
                    material: 'Limestone', stock: 3200, daysLeft: 5, lowStock: true,
                    position: { x: -40, z: 0 }, color: 0xcfcfcf
                }
            ],
            stacks: [
                {
                    id: 'stack_001', name: '高炉区烟囱',
                    so2: 85, nox: 140, so2Limit: 100, noxLimit: 150,
                    overLimit: false, position: { x: 10, z: 35 }
                },
                {
                    id: 'stack_002', name: '转炉区烟囱',
                    so2: 130, nox: 155, so2Limit: 100, noxLimit: 150,
                    overLimit: true, position: { x: 30, z: 35 }
                }
            ],
            personnel: [
                {
                    id: 'p001', name: '张建国', role: '高炉工',
                    x: 5, z: -8, inDanger: false, lastUpdate: Date.now()
                },
                {
                    id: 'p002', name: '李明华', role: '炼钢工',
                    x: 25, z: -12, inDanger: false, lastUpdate: Date.now()
                },
                {
                    id: 'p003', name: '王志强', role: '质检工',
                    x: 45, z: 10, inDanger: false, lastUpdate: Date.now()
                },
                {
                    id: 'p004', name: '赵伟', role: '连铸工',
                    x: 0, z: 15, inDanger: false, lastUpdate: Date.now()
                }
            ],
            dangerZones: [
                { id: 'dz_conv', name: '转炉平台', x: 22, z: -15, radius: 8 },
                { id: 'dz_bf', name: '高炉风口区', x: 5, z: -20, radius: 6 },
                { id: 'dz_stack', name: '烟囱排放区', x: 20, z: 32, radius: 10 }
            ],
            orders: [
                {
                    id: 'ord_001', material: 'DC04', thickness: 2.0,
                    width: 1250, length: 3000, quantity: 500,
                    dueDate: Date.now() + 86400000 * 2,
                    assignedLine: null, status: 'pending'
                },
                {
                    id: 'ord_002', material: 'Q345B', thickness: 25.0,
                    width: 2200, length: 8000, quantity: 120,
                    dueDate: Date.now() + 86400000 * 3,
                    assignedLine: null, status: 'pending'
                },
                {
                    id: 'ord_003', material: 'SPHC', thickness: 3.5,
                    width: 1500, length: 4500, quantity: 280,
                    dueDate: Date.now() + 86400000 * 1,
                    assignedLine: null, status: 'pending'
                }
            ],
            maintenanceSchedule: [
                {
                    id: 'mt_001', equipment: '1号连铸机',
                    startTime: Date.now() + 3600000 * 2,
                    endTime: Date.now() + 3600000 * 6,
                    type: '定期检修'
                },
                {
                    id: 'mt_002', equipment: 'CSP薄板轧机',
                    startTime: Date.now() + 86400000 + 3600000 * 8,
                    endTime: Date.now() + 86400000 + 3600000 * 16,
                    type: '辊系更换'
                }
            ],
            energyConsumption: {
                benchmark: 550,
                current: 586,
                perFurnace: [
                    { name: '1号高炉', value: 562 },
                    { name: '2号高炉', value: 598 },
                    { name: '3号高炉', value: 555 }
                ]
            },
            alarms: [],
            dailyStats: {
                production: 2856,
                passRate: 98.6,
                totalEnergy: 586,
                envEvents: 3
            }
        };

        this._initHistory();
    }

    _initHistory() {
        this.state.blastFurnaces.forEach(bf => {
            const now = Date.now();
            for (let i = 23; i >= 0; i--) {
                bf.history.push({
                    time: now - i * 3600000,
                    temp: 1500 + Math.sin(i * 0.3) * 15 + Math.random() * 5,
                    pressure: 375 + Math.sin(i * 0.4) * 18 + Math.random() * 4,
                    silicon: 0.55 + Math.sin(i * 0.2) * 0.08 + Math.random() * 0.03
                });
            }
        });
    }

    _walk(value, min, max, step) {
        const change = (Math.random() - 0.5) * step;
        let newValue = value + change;
        if (newValue < min) newValue = min;
        if (newValue > max) newValue = max;
        return newValue;
    }

    tick() {
        const s = this.state;

        s.blastFurnaces.forEach(bf => {
            bf.windPressure = this._walk(bf.windPressure, 320, 420, 5);
            bf.hotMetalTemp = this._walk(bf.hotMetalTemp, 1450, 1550, 3);
            bf.silicon = this._walk(bf.silicon, 0.3, 0.9, 0.02);
            bf.burdenLevel = this._walk(bf.burdenLevel, 50, 95, 2);

            if (bf.history.length > 0) {
                const last = bf.history[bf.history.length - 1];
                if (Date.now() - last.time >= 3600000) {
                    bf.history.push({
                        time: Date.now(),
                        temp: bf.hotMetalTemp,
                        pressure: bf.windPressure,
                        silicon: bf.silicon
                    });
                    if (bf.history.length > 24) bf.history.shift();
                }
            }

            if (bf.hotMetalTemp < 1480 && !bf._heating) {
                bf._heating = true;
                this._addAlarm('critical', bf.name + ' 铁水温度低',
                    bf.name + ' 铁水温度' + bf.hotMetalTemp.toFixed(1) + '℃，已自动启动加硅增温');
                setTimeout(() => { bf._heating = false; }, 15000);
            }
        });

        s.converters.forEach(c => {
            c.temp = this._walk(c.temp, 1600, 1720, 8);
            c.carbon = this._walk(c.carbon, 0.03, 0.1, 0.005);
            c.manganese = this._walk(c.manganese, 0.3, 0.6, 0.02);
            c.phosphorus = this._walk(c.phosphorus, 0.01, 0.03, 0.002);
            c.sulfur = this._walk(c.sulfur, 0.008, 0.02, 0.001);

            if (c.temp < 1650) c.flameColor = 0xffcc00;
            else if (c.temp < 1690) c.flameColor = 0xff6600;
            else c.flameColor = 0xff2200;

            if (c.temp > 1700 && !c.argonActive) {
                c.argonActive = true;
                this._addAlarm('critical', c.name + ' 温度超限',
                    c.name + ' 钢水温度' + c.temp.toFixed(0) + '℃，已开启底吹氩气');
                setTimeout(() => { c.argonActive = false; }, 12000);
            }
        });

        s.casters.forEach(ct => {
            ct.castingSpeed = this._walk(ct.castingSpeed, 1.2, 2.2, 0.08);
            ct.moldLevel = this._walk(ct.moldLevel, 35, 55, 1.2);
            ct.levelVariation = this._walk(ct.levelVariation, 0.5, 4.5, 0.4);

            if (ct.levelVariation > 3) {
                ct.castingSpeed = Math.max(1.2, ct.castingSpeed - 0.2);
                if (!ct._alarmed) {
                    ct._alarmed = true;
                    this._addAlarm('warning', ct.name + ' 液面波动超限',
                        ct.name + ' 结晶器液面波动' + ct.levelVariation.toFixed(1) + 'mm，已自动降速');
                    setTimeout(() => { ct._alarmed = false; }, 10000);
                }
            }
        });

        s.rollingMills.forEach(rm => {
            rm.rollingForce = this._walk(rm.rollingForce,
                rm.lineType === 'CSP' ? 1200 : 3000,
                rm.lineType === 'CSP' ? 2500 : 5500, 80);
            rm.thicknessDeviation = this._walk(rm.thicknessDeviation, -0.15, 0.15, 0.015);

            if (Math.abs(rm.thicknessDeviation) > 0.1 && !rm._advised) {
                rm._advised = true;
                rm._suggestions = this._genRollingSuggestions(rm);
                this._addAlarm('warning', rm.name + ' 厚度偏差超限',
                    rm.name + ' 厚度偏差' + rm.thicknessDeviation.toFixed(3) + 'mm，已生成调整建议');
                setTimeout(() => { rm._advised = false; }, 15000);
            }
        });

        s.rawYard.forEach(pile => {
            pile.stock = Math.max(500, pile.stock - Math.random() * 15);
            pile.daysLeft = Math.max(0, Math.floor(pile.stock / (300 + Math.random() * 200)));
            pile.lowStock = pile.material === 'Coke' && pile.daysLeft < 7;
            if (pile.lowStock && !pile._poNotified) {
                pile._poNotified = true;
                this._addAlarm('warning', pile.name + ' 库存不足',
                    pile.name + ' 仅够' + pile.daysLeft + '天用量，已自动生成采购计划');
            }
        });

        s.stacks.forEach(st => {
            st.so2 = this._walk(st.so2, 40, 180, 6);
            st.nox = this._walk(st.nox, 60, 200, 8);
            const over = st.so2 > st.so2Limit || st.nox > st.noxLimit;
            if (over && !st.overLimit) {
                this._addAlarm('critical', st.name + ' 排放超标',
                    st.name + ' SO2:' + st.so2.toFixed(0) + '/' + st.so2Limit +
                    ' NOx:' + st.nox.toFixed(0) + '/' + st.noxLimit + 'mg/m3，已触发减排');
            }
            st.overLimit = over;
        });

        s.personnel.forEach(p => {
            const angle = (Date.now() / 5000 + p.id.charCodeAt(1) * 0.5) % (Math.PI * 2);
            const radius = 8 + (p.id.charCodeAt(2) % 5) * 4;
            p.x = 15 + Math.cos(angle + p.id.charCodeAt(1)) * radius;
            p.z = -5 + Math.sin(angle + p.id.charCodeAt(2)) * radius;
            p.lastUpdate = Date.now();

            p.inDanger = false;
            s.dangerZones.forEach(dz => {
                const dx = p.x - dz.x;
                const dz2 = p.z - dz.z;
                if (Math.sqrt(dx * dx + dz2 * dz2) < dz.radius) {
                    p.inDanger = true;
                    if (!p._lastAlarm || Date.now() - p._lastAlarm > 8000) {
                        p._lastAlarm = Date.now();
                        this._addAlarm('critical', p.name + ' 进入危险区域',
                            p.name + '(' + p.role + ') 进入' + dz.name + '，请立即撤离');
                    }
                }
            });
        });

        s.energyConsumption.current = this._walk(
            s.energyConsumption.current, 520, 620, 8);
        s.energyConsumption.perFurnace.forEach(pf => {
            pf.value = this._walk(pf.value, 530, 610, 6);
        });

        s.dailyStats.production = Math.floor(2800 + Math.random() * 200);
        s.dailyStats.passRate = 97.5 + Math.random() * 2;

        return this.getSnapshot();
    }

    _genRollingSuggestions(rm) {
        const dir = rm.thicknessDeviation > 0 ? '减小' : '增大';
        const delta = Math.abs(rm.thicknessDeviation);
        return [
            dir + 'F4轧制力约' + Math.floor(delta * 800) + '吨',
            '检查辊缝设置，适当' + dir + '辊缝约' + (delta * 0.8).toFixed(3) + 'mm',
            '通知质检人员现场测量确认',
            '检查来料厚度是否稳定'
        ];
    }

    _addAlarm(level, title, message) {
        const alarm = {
            id: 'alm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            level, title, message,
            time: new Date().toISOString(),
            timestamp: Date.now()
        };
        this.state.alarms.unshift(alarm);
        if (this.state.alarms.length > 100) this.state.alarms.pop();
        return alarm;
    }

    getSnapshot() {
        return JSON.parse(JSON.stringify(this.state));
    }

    getBlastFurnaceHistory(id) {
        const bf = this.state.blastFurnaces.find(f => f.id === id);
        return bf ? bf.history : [];
    }
}

module.exports = IndustrialDataSimulator;
