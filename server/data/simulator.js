const { PersonnelSystem } = require('./personnel');

class IndustrialDataSimulator {
    constructor() {
        this._lcgSeed = Date.now() & 0xffffffff;
        this._gaussSpare = null;
        this._gaussSpareAvailable = false;

        this._time = 0;
        this._dt = 1.0;

        this.state = {
            blastFurnaces: [
                {
                    id: 'bf_001', name: '1号高炉',
                    windPressure: 380, hotMetalTemp: 1510, silicon: 0.55,
                    burdenLevel: 72, status: 'running', history: [],
                    _m_iron: 1500, _c_iron: 0.82, _k_loss: 0.45, _A_wall: 280,
                    _m_air: 4.2, _cp_air: 1.005, _T_wind: 1150, _Q_reaction: 2.8e6,
                    _T_ambient: 25
                },
                {
                    id: 'bf_002', name: '2号高炉',
                    windPressure: 365, hotMetalTemp: 1495, silicon: 0.62,
                    burdenLevel: 68, status: 'running', history: [],
                    _m_iron: 1450, _c_iron: 0.82, _k_loss: 0.48, _A_wall: 270,
                    _m_air: 4.0, _cp_air: 1.005, _T_wind: 1120, _Q_reaction: 2.7e6,
                    _T_ambient: 25
                },
                {
                    id: 'bf_003', name: '3号高炉',
                    windPressure: 392, hotMetalTemp: 1525, silicon: 0.48,
                    burdenLevel: 81, status: 'running', history: [],
                    _m_iron: 1550, _c_iron: 0.82, _k_loss: 0.42, _A_wall: 290,
                    _m_air: 4.4, _cp_air: 1.005, _T_wind: 1180, _Q_reaction: 2.9e6,
                    _T_ambient: 25
                }
            ],
            converters: [
                {
                    id: 'conv_001', name: '1号转炉',
                    temp: 1650, flameColor: 0xff6600, carbon: 0.06,
                    manganese: 0.45, phosphorus: 0.018, sulfur: 0.012,
                    status: 'blowing', argonActive: false, bubbleCount: 0,
                    _k_O2: 0.0012, _F_O2: 48000, _F_Ar: 0, _k_Ar: 0.012,
                    _m_steel: 260, _c_steel: 0.69
                },
                {
                    id: 'conv_002', name: '2号转炉',
                    temp: 1680, flameColor: 0xff3300, carbon: 0.04,
                    manganese: 0.38, phosphorus: 0.015, sulfur: 0.009,
                    status: 'blowing', argonActive: false, bubbleCount: 0,
                    _k_O2: 0.0013, _F_O2: 52000, _F_Ar: 0, _k_Ar: 0.012,
                    _m_steel: 280, _c_steel: 0.69
                }
            ],
            casters: [
                {
                    id: 'cast_001', name: '1号连铸机',
                    castingSpeed: 1.8, moldLevel: 45.2, levelVariation: 1.2,
                    status: 'casting', _sigma: 0.27, _levelBase: 45.0
                },
                {
                    id: 'cast_002', name: '2号连铸机',
                    castingSpeed: 1.6, moldLevel: 48.7, levelVariation: 2.1,
                    status: 'casting', _sigma: 0.24, _levelBase: 48.0
                }
            ],
            rollingMills: [
                {
                    id: 'rm_csp', name: 'CSP薄板轧机',
                    rollingForce: 1850, thicknessDeviation: 0.04,
                    targetThickness: 2.0, status: 'rolling',
                    lineType: 'CSP', thicknessRange: [0.8, 6.0],
                    _Y: 180, _L: 1.2, _w: 1.5, _R: 0.35, _dh_prev: 0.04,
                    _h_in: 2.1, _loadFactor: 0.78
                },
                {
                    id: 'rm_heavy', name: '宽厚板轧机',
                    rollingForce: 4200, thicknessDeviation: 0.08,
                    targetThickness: 25.0, status: 'rolling',
                    lineType: 'heavy', thicknessRange: [6.0, 80.0],
                    _Y: 220, _L: 2.4, _w: 2.2, _R: 0.65, _dh_prev: 0.08,
                    _h_in: 26.5, _loadFactor: 0.82
                }
            ],
            rawYard: [
                {
                    id: 'pile_001', name: '焦炭A堆',
                    material: 'Coke', stock: 8500, daysLeft: 12, lowStock: false,
                    position: { x: -40, z: -30 }, color: 0x3a3a3a,
                    _consumption: 680
                },
                {
                    id: 'pile_002', name: '铁矿石B堆',
                    material: 'Iron Ore', stock: 22000, daysLeft: 18, lowStock: false,
                    position: { x: -40, z: -15 }, color: 0x8b4513,
                    _consumption: 1250
                },
                {
                    id: 'pile_003', name: '石灰石C堆',
                    material: 'Limestone', stock: 3200, daysLeft: 5, lowStock: true,
                    position: { x: -40, z: 0 }, color: 0xcfcfcf,
                    _consumption: 520
                }
            ],
            stacks: [
                {
                    id: 'stack_001', name: '高炉区烟囱',
                    so2: 85, nox: 140, so2Limit: 100, noxLimit: 150,
                    overLimit: false, position: { x: 10, z: 35 },
                    _Q_flue: 125000, _eta_desulf: 0.92, _eta_denit: 0.88,
                    _C_so2_in: 1050, _C_nox_in: 1150, _reducing: false,
                    _reductionRate: 0
                },
                {
                    id: 'stack_002', name: '转炉区烟囱',
                    so2: 130, nox: 155, so2Limit: 100, noxLimit: 150,
                    overLimit: true, position: { x: 30, z: 35 },
                    _Q_flue: 148000, _eta_desulf: 0.88, _eta_denit: 0.86,
                    _C_so2_in: 1080, _C_nox_in: 1100, _reducing: true,
                    _reductionRate: 2.5
                }
            ],
            personnel: [
                {
                    id: 'p001', name: '张建国', role: '高炉工',
                    x: 5, z: -8, vx: 0.1, vz: 0.05, inDanger: false, lastUpdate: Date.now(),
                    _target: { x: 5, z: -15 }, _targetIdx: 0,
                    _waypoints: [{ x: 5, z: -8 }, { x: 5, z: -18 }, { x: 12, z: -15 }, { x: 0, z: -10 }]
                },
                {
                    id: 'p002', name: '李明华', role: '炼钢工',
                    x: 25, z: -12, vx: -0.05, vz: 0.08, inDanger: false, lastUpdate: Date.now(),
                    _target: { x: 22, z: -10 }, _targetIdx: 0,
                    _waypoints: [{ x: 25, z: -12 }, { x: 20, z: -8 }, { x: 28, z: -15 }, { x: 22, z: -12 }]
                },
                {
                    id: 'p003', name: '王志强', role: '质检工',
                    x: 45, z: 10, vx: 0.03, vz: -0.06, inDanger: false, lastUpdate: Date.now(),
                    _target: { x: 40, z: 5 }, _targetIdx: 0,
                    _waypoints: [{ x: 45, z: 10 }, { x: 38, z: 15 }, { x: 50, z: 0 }, { x: 42, z: 8 }]
                },
                {
                    id: 'p004', name: '赵伟', role: '连铸工',
                    x: 0, z: 15, vx: 0.07, vz: -0.04, inDanger: false, lastUpdate: Date.now(),
                    _target: { x: 5, z: 12 }, _targetIdx: 0,
                    _waypoints: [{ x: 0, z: 15 }, { x: 8, z: 10 }, { x: -5, z: 20 }, { x: 3, z: 14 }]
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
                    { name: '1号高炉', value: 562, _P_rated: 45, _efficiency: 0.87, _load: 0.82 },
                    { name: '2号高炉', value: 598, _P_rated: 48, _efficiency: 0.84, _load: 0.88 },
                    { name: '3号高炉', value: 555, _P_rated: 44, _efficiency: 0.89, _load: 0.79 }
                ],
                _converterE: [42, 45],
                _casterE: [28, 30],
                _rollingE: [68, 92],
                _auxiliaryE: 185,
                _totalProduction: 2856
            },
            alarms: [],
            dailyStats: {
                production: 2856,
                passRate: 98.6,
                totalEnergy: 586,
                envEvents: 3
            }
        };

        this.personnelSystem = new PersonnelSystem(this.state.dangerZones);

        this._initHistory();
    }

    _lcg() {
        this._lcgSeed = (this._lcgSeed * 1664525 + 1013904223) & 0xffffffff;
        return (this._lcgSeed >>> 0) / 4294967296;
    }

    _lcgSeeded(seed) {
        let s = (seed * 1664525 + 1013904223) & 0xffffffff;
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 4294967296;
    }

    _gauss() {
        if (this._gaussSpareAvailable) {
            this._gaussSpareAvailable = false;
            return this._gaussSpare;
        }
        let u1 = 0, u2 = 0, s = 0;
        while (s >= 1 || s === 0) {
            u1 = 2 * this._lcg() - 1;
            u2 = 2 * this._lcg() - 1;
            s = u1 * u1 + u2 * u2;
        }
        const mul = Math.sqrt(-2 * Math.log(s) / s);
        this._gaussSpare = u2 * mul;
        this._gaussSpareAvailable = true;
        return u1 * mul;
    }

    _gaussSeeded(seed) {
        let s1 = (seed * 1664525 + 1013904223) & 0xffffffff;
        let s2 = (s1 * 1664525 + 1013904223) & 0xffffffff;
        const n1 = (s1 >>> 0) / 4294967296;
        const n2 = (s2 >>> 0) / 4294967296;
        const u1 = 2 * n1 - 1;
        const u2 = 2 * n2 - 1;
        let r = u1 * u1 + u2 * u2;
        if (r >= 1 || r === 0) r = 0.5;
        return u1 * Math.sqrt(-2 * Math.log(r) / r);
    }

    _clamp(v, min, max) {
        return v < min ? min : (v > max ? max : v);
    }

    _initHistory() {
        this.state.blastFurnaces.forEach((bf, idx) => {
            const now = Date.now();
            for (let i = 23; i >= 0; i--) {
                const phase = i * 0.3 + idx * 1.7;
                const tPhase = i * 0.4 + idx * 2.3;
                const sPhase = i * 0.2 + idx * 3.1;
                const g1 = this._gaussSeeded(i * 137 + idx * 7919);
                const g2 = this._gaussSeeded(i * 251 + idx * 6151);
                const g3 = this._gaussSeeded(i * 389 + idx * 5417);
                bf.history.push({
                    time: now - i * 3600000,
                    temp: this._clamp(1500 + Math.sin(phase) * 18 + g1 * 4, 1450, 1550),
                    pressure: this._clamp(380 + Math.sin(tPhase) * 22 + g2 * 3, 350, 420),
                    silicon: this._clamp(0.55 + Math.sin(sPhase) * 0.09 + g3 * 0.02, 0.3, 0.9)
                });
            }
        });
    }

    _updateBlastFurnace(bf) {
        const dt = this._dt;
        bf._T_wind = this._clamp(bf._T_wind + this._gauss() * 8, 1050, 1250);
        bf._m_air = this._clamp(bf._m_air + this._gauss() * 0.08, 3.5, 5.0);

        const Q_wind = bf._m_air * bf._cp_air * bf._T_wind * 600;
        const deltaT = bf.hotMetalTemp - bf._T_ambient;
        const Q_loss = bf._k_loss * bf._A_wall * deltaT;
        const Q_reaction = bf._Q_reaction * (1 + 0.02 * this._gauss());
        const dTdt = (Q_wind - Q_loss - Q_reaction) / (bf._m_iron * bf._c_iron * 1000);

        bf.hotMetalTemp = this._clamp(bf.hotMetalTemp + dTdt * dt, 1450, 1550);

        const T_norm = (bf.hotMetalTemp - 1450) / (1550 - 1450);
        bf.windPressure = this._clamp(350 + T_norm * 70 + this._gauss() * 4, 350, 420);

        const Si_equilibrium = 0.9 - (bf.hotMetalTemp - 1450) * 0.004;
        const dSi = (Si_equilibrium - bf.silicon) * 0.015 * dt;
        bf.silicon = this._clamp(bf.silicon + dSi + this._gauss() * 0.008, 0.3, 0.9);

        bf.burdenLevel = this._clamp(bf.burdenLevel - 0.08 * dt + this._gauss() * 0.15, 50, 95);
        if (bf.burdenLevel < 55) {
            bf.burdenLevel = this._clamp(bf.burdenLevel + 2.0, 50, 95);
        }

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
            bf._Q_reaction *= 1.08;
            this._addAlarm('critical', bf.name + ' 铁水温度低',
                bf.name + ' 铁水温度' + bf.hotMetalTemp.toFixed(1) + '℃，已自动启动加硅增温');
            setTimeout(() => {
                bf._heating = false;
                bf._Q_reaction /= 1.08;
            }, 15000);
        }
    }

    _updateConverter(c) {
        const dt = this._dt;

        if (c.status === 'blowing') {
            c._F_O2 = this._clamp(c._F_O2 + this._gauss() * 1500, 35000, 65000);
            const dTdt = c._k_O2 * c._F_O2 / (c._m_steel * c._c_steel * 1000) * 1000;
            c.temp = this._clamp(c.temp + dTdt * dt, 1600, 1720);

            c.carbon = this._clamp(c.carbon - 0.0008 * dt + this._gauss() * 0.001, 0.03, 0.1);
            c.manganese = this._clamp(c.manganese - 0.003 * dt + this._gauss() * 0.004, 0.3, 0.6);
            c.phosphorus = this._clamp(c.phosphorus - 0.0003 * dt + this._gauss() * 0.0005, 0.01, 0.03);
            c.sulfur = this._clamp(c.sulfur - 0.00015 * dt + this._gauss() * 0.0003, 0.008, 0.02);
        }

        if (c.argonActive) {
            c._F_Ar = this._clamp(c._F_Ar + 50 * dt, 0, 800);
            c.bubbleCount = Math.floor(c._k_Ar * c._F_Ar * (1 + 0.15 * this._gauss()));
            c.temp = this._clamp(c.temp - 0.8 * dt, 1600, 1720);
        } else {
            c._F_Ar = this._clamp(c._F_Ar - 30 * dt, 0, 800);
            c.bubbleCount = Math.floor(c._k_Ar * c._F_Ar);
        }

        if (c.temp < 1650) c.flameColor = 0xffcc00;
        else if (c.temp < 1690) c.flameColor = 0xff6600;
        else c.flameColor = 0xff2200;

        if (c.temp > 1700 && !c.argonActive) {
            c.argonActive = true;
            this._addAlarm('critical', c.name + ' 温度超限',
                c.name + ' 钢水温度' + c.temp.toFixed(0) + '℃，已开启底吹氩气');
            setTimeout(() => { c.argonActive = false; }, 12000);
        }
    }

    _updateCaster(ct) {
        const dt = this._dt;

        ct.castingSpeed = this._clamp(ct.castingSpeed + this._gauss() * 0.03, 1.2, 2.2);
        ct._sigma = 0.15 * ct.castingSpeed;

        const epsilon = this._gauss();
        ct.moldLevel = ct._levelBase + epsilon * ct._sigma * 3;
        ct.moldLevel = this._clamp(ct.moldLevel, 35, 55);

        const sigma_val = ct._sigma;
        const variation_amp = Math.abs(epsilon) * sigma_val * 4;
        ct.levelVariation = this._clamp(variation_amp + 0.3, 0.5, 4.5);

        if (ct.levelVariation > 3) {
            ct.castingSpeed = this._clamp(ct.castingSpeed - 0.02 * dt, 1.2, 2.2);
            if (!ct._alarmed) {
                ct._alarmed = true;
                this._addAlarm('warning', ct.name + ' 液面波动超限',
                    ct.name + ' 结晶器液面波动' + ct.levelVariation.toFixed(1) + 'mm，已自动降速');
                setTimeout(() => { ct._alarmed = false; }, 10000);
            }
        }
    }

    _updateRollingMill(rm) {
        const dt = this._dt;

        rm._h_in = rm.targetThickness + this._clamp(rm._h_in - rm.targetThickness, -2, 2) * 0.98 + this._gauss() * 0.05;
        const delta_h = Math.max(0.1, rm._h_in - rm.targetThickness);
        rm._Y = this._clamp(rm._Y + this._gauss() * 3, rm.lineType === 'CSP' ? 160 : 200, rm.lineType === 'CSP' ? 210 : 260);
        rm._loadFactor = this._clamp(rm._loadFactor + this._gauss() * 0.015, 0.6, 0.95);

        const hillForce = rm._Y * rm._L * rm._w * Math.sqrt(rm._R / delta_h);
        rm.rollingForce = this._clamp(
            hillForce * rm._loadFactor / (rm.lineType === 'CSP' ? 0.28 : 0.18),
            rm.lineType === 'CSP' ? 1200 : 3000,
            rm.lineType === 'CSP' ? 2500 : 5500
        );

        const epsilon = this._gauss() * 0.02;
        const ar1 = 0.85 * rm._dh_prev + 0.15 * epsilon;
        rm._dh_prev = ar1;
        rm.thicknessDeviation = this._clamp(ar1, -0.15, 0.15);

        if (Math.abs(rm.thicknessDeviation) > 0.1 && !rm._advised) {
            rm._advised = true;
            rm._suggestions = this._genRollingSuggestions(rm);
            this._addAlarm('warning', rm.name + ' 厚度偏差超限',
                rm.name + ' 厚度偏差' + rm.thicknessDeviation.toFixed(3) + 'mm，已生成调整建议');
            setTimeout(() => { rm._advised = false; }, 15000);
        }
    }

    _updateRawYard(pile) {
        const dt = this._dt;
        pile._consumption = this._clamp(pile._consumption + this._gauss() * 8,
            pile.material === 'Iron Ore' ? 1000 : pile.material === 'Coke' ? 500 : 400,
            pile.material === 'Iron Ore' ? 1500 : pile.material === 'Coke' ? 850 : 650);

        pile.stock = Math.max(500, pile.stock - pile._consumption / 240 * dt);
        pile.daysLeft = Math.max(0, Math.floor(pile.stock / pile._consumption));
        pile.lowStock = pile.material === 'Coke' && pile.daysLeft < 7;
        if (pile.lowStock && !pile._poNotified) {
            pile._poNotified = true;
            this._addAlarm('warning', pile.name + ' 库存不足',
                pile.name + ' 仅够' + pile.daysLeft + '天用量，已自动生成采购计划');
        }
    }

    _updateStack(st) {
        const dt = this._dt;

        st._Q_flue = this._clamp(st._Q_flue + this._gauss() * 2500, 100000, 180000);

        if (st.overLimit || st._reducing) {
            st._reductionRate = this._clamp(st._reductionRate + 0.02 * dt, 0, 5);
            st._eta_desulf = this._clamp(st._eta_desulf + 0.0005 * st._reductionRate * dt, 0.82, 0.97);
            st._eta_denit = this._clamp(st._eta_denit + 0.0004 * st._reductionRate * dt, 0.80, 0.95);
        } else {
            st._reductionRate = this._clamp(st._reductionRate - 0.03 * dt, 0, 5);
        }

        const Q_ref = 140000;
        const base_so2 = 0.9 * st._C_so2_in * (1 - st._eta_desulf) * Q_ref / st._Q_flue;
        const base_nox = 0.85 * st._C_nox_in * (1 - st._eta_denit) * Q_ref / st._Q_flue;

        st.so2 = this._clamp(base_so2 + this._gauss() * 5, 40, 180);
        st.nox = this._clamp(base_nox + this._gauss() * 7, 60, 200);

        const over = st.so2 > st.so2Limit || st.nox > st.noxLimit;
        if (over && !st.overLimit) {
            st._reducing = true;
            this._addAlarm('critical', st.name + ' 排放超标',
                st.name + ' SO2:' + st.so2.toFixed(0) + '/' + st.so2Limit +
                ' NOx:' + st.nox.toFixed(0) + '/' + st.noxLimit + 'mg/m3，已触发减排');
        }
        if (!over && st._reductionRate < 0.3) {
            st._reducing = false;
        }
        st.overLimit = over;
    }

    _updatePersonnel(p) {
        const dt = this._dt;

        const dx_target = p._target.x - p.x;
        const dz_target = p._target.z - p.z;
        const dist_target = Math.sqrt(dx_target * dx_target + dz_target * dz_target);

        if (dist_target < 2.5) {
            p._targetIdx = (p._targetIdx + 1) % p._waypoints.length;
            p._target.x = p._waypoints[p._targetIdx].x;
            p._target.z = p._waypoints[p._targetIdx].z;
        }

        const nx = dist_target > 0.01 ? dx_target / dist_target : 0;
        const nz = dist_target > 0.01 ? dz_target / dist_target : 0;

        const brownian_x = this._gauss() * 0.05;
        const brownian_z = this._gauss() * 0.05;

        p.vx = 0.95 * p.vx + 0.05 * nx * 0.8 + brownian_x;
        p.vz = 0.95 * p.vz + 0.05 * nz * 0.8 + brownian_z;

        const speed = Math.sqrt(p.vx * p.vx + p.vz * p.vz);
        if (speed > 0.8) {
            p.vx = (p.vx / speed) * 0.8;
            p.vz = (p.vz / speed) * 0.8;
        }

        p.x = this._clamp(p.x + p.vx * dt, -50, 60);
        p.z = this._clamp(p.z + p.vz * dt, -30, 50);
        p.lastUpdate = Date.now();

        p.inDanger = false;
        this.state.dangerZones.forEach(dz => {
            const dx = p.x - dz.x;
            const dz2 = p.z - dz.z;
            const euclid = Math.sqrt(dx * dx + dz2 * dz2);
            if (euclid < dz.radius) {
                p.inDanger = true;
                if (!p._lastAlarm || Date.now() - p._lastAlarm > 8000) {
                    p._lastAlarm = Date.now();
                    this._addAlarm('critical', p.name + ' 进入危险区域',
                        p.name + '(' + p.role + ') 进入' + dz.name + '，请立即撤离');
                }
            }
        });
    }

    _updateEnergy() {
        const dt = this._dt;
        const ec = this.state.energyConsumption;

        let total = 0;
        ec.perFurnace.forEach((pf, idx) => {
            const bf = this.state.blastFurnaces[idx];
            const T_deviation = Math.abs(bf.hotMetalTemp - 1500) / 50;
            pf._load = this._clamp(pf._load + this._gauss() * 0.008 + T_deviation * 0.002, 0.65, 0.95);
            pf._efficiency = this._clamp(pf._efficiency + this._gauss() * 0.003, 0.80, 0.92);

            const hourlyE = pf._P_rated * pf._load / pf._efficiency;
            pf.value = this._clamp(hourlyE * 12.5 + this._gauss() * 8, 530, 610);
            total += pf.value;
        });

        total += ec._converterE[0] + ec._converterE[1];
        total += ec._casterE[0] + ec._casterE[1];
        total += ec._rollingE[0] + ec._rollingE[1];
        total += ec._auxiliaryE;

        const production = this.state.dailyStats.production;
        ec.current = this._clamp(total / production * 1000 + this._gauss() * 4, 520, 620);

        this.state.dailyStats.production = Math.floor(this._clamp(
            this.state.dailyStats.production + this._gauss() * 12, 2600, 3100));
        this.state.dailyStats.passRate = this._clamp(
            this.state.dailyStats.passRate + this._gauss() * 0.15, 96.5, 99.8);
        this.state.dailyStats.totalEnergy = ec.current;
    }

    tick() {
        this._time += this._dt;

        this.state.blastFurnaces.forEach(bf => this._updateBlastFurnace(bf));
        this.state.converters.forEach(c => this._updateConverter(c));
        this.state.casters.forEach(ct => this._updateCaster(ct));
        this.state.rollingMills.forEach(rm => this._updateRollingMill(rm));
        this.state.rawYard.forEach(pile => this._updateRawYard(pile));
        this.state.stacks.forEach(st => this._updateStack(st));

        const prevDanger = {};
        this.state.personnel.forEach(p => { prevDanger[p.id] = p.inDanger; });
        this.personnelSystem.setDangerZones(this.state.dangerZones);
        const personnelState = this.personnelSystem.tick(this.state, this._dt);
        this.state.personnel = personnelState;

        const dangerEvents = this.personnelSystem.getDangerEvents();
        dangerEvents.forEach(evt => {
            if (!prevDanger[evt.workerId]) {
                const alarmLevel = evt.level === 'danger' ? 'critical' : 'warning';
                this._addAlarm(alarmLevel,
                    evt.workerName + ' 进入' + (evt.level === 'danger' ? '危险' : '警告') + '区域',
                    evt.workerName + '(' + evt.workerRole + ') 距离' + evt.zoneName +
                    ' 仅' + evt.distance.toFixed(2) + 'm，请立即撤离');
            }
        });

        this._updateEnergy();

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
        const seedBase = Date.now();
        const randPart = this._lcgSeeded(seedBase).toString(36).slice(2, 6);
        const alarm = {
            id: 'alm_' + seedBase + '_' + randPart,
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

    getPersonnelState() {
        return this.personnelSystem ? this.personnelSystem.getPersonnelState() : this.state.personnel;
    }

    getDangerEvents() {
        return this.personnelSystem ? this.personnelSystem.getDangerEvents() : [];
    }
}

module.exports = IndustrialDataSimulator;
