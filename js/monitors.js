const EquipmentMonitors = {
    updateInterval: null,
    onAlarm: null,
    onDataUpdate: null,

    init(alarmCallback, dataCallback) {
        this.onAlarm = alarmCallback;
        this.onDataUpdate = dataCallback;
    },

    start() {
        this.updateInterval = setInterval(() => this._updateAllData(), 3000);
        this._checkAllEquipment();
    },

    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    },

    _updateAllData() {
        FactoryData.blastFurnaces.forEach(bf => this._updateBlastFurnace(bf));
        FactoryData.converters.forEach(conv => this._updateConverter(conv));
        FactoryData.casters.forEach(caster => this._updateCaster(caster));
        FactoryData.rollingMills.forEach(rm => this._updateRollingMill(rm));
        FactoryData.environmentalStations.forEach(station => this._updateEnvironmental(station));
        this._updateEnergyConsumption();
        this._updatePersonnelPositions();

        if (this.onDataUpdate) {
            this.onDataUpdate();
        }
    },

    _updateBlastFurnace(bf) {
        bf.tuyerePressure = 390 + Math.random() * 40;
        bf.ironTemp = bf.ironTemp + (Math.random() - 0.5) * 10;
        bf.siliconContent = Math.max(0.2, Math.min(0.8, bf.siliconContent + (Math.random() - 0.5) * 0.05));
        bf.topLevel = 5 + Math.random() * 5;

        if (bf.ironTemp < 1480) {
            if (!bf.heatingActive) {
                bf.heatingActive = true;
                bf.status = 'warning';
                this._triggerAlarm({
                    level: 'critical',
                    title: `${bf.name}铁水温度过低`,
                    message: `铁水温度${bf.ironTemp.toFixed(1)}℃低于阈值1480℃，已启动加硅增温程序`
                });
                if (FactoryScene.objects.blastFurnaces && FactoryScene.objects.blastFurnaces[bf.id]) {
                    FactoryScene._addFireEffect(FactoryScene.objects.blastFurnaces[bf.id], 0, 2, 0);
                }
            }
            bf.ironTemp = Math.min(1500, bf.ironTemp + 2);
        } else if (bf.ironTemp > 1520 && bf.heatingActive) {
            bf.heatingActive = false;
            bf.status = 'running';
        }
    },

    _updateConverter(conv) {
        conv.steelTemp = conv.steelTemp + (Math.random() - 0.5) * 15;
        conv.composition.C = 0.05 + Math.random() * 0.1;
        conv.composition.Mn = 0.8 + Math.random() * 0.6;
        conv.composition.P = 0.01 + Math.random() * 0.02;
        conv.composition.S = 0.005 + Math.random() * 0.01;

        if (conv.steelTemp > 1700) {
            conv.status = 'overheat';
            conv.flameColor = 0xff0000;
            if (!conv.argonBlowing) {
                conv.argonBlowing = true;
                this._triggerAlarm({
                    level: 'critical',
                    title: `${conv.name}钢水超温`,
                    message: `钢水温度${conv.steelTemp.toFixed(1)}℃超过1700℃，已开启底吹氩气冷却，已通知炼钢工调整`
                });
                if (FactoryScene.objects.converters && FactoryScene.objects.converters[conv.id]) {
                    FactoryScene._addBubbleEffect(FactoryScene.objects.converters[conv.id], 0, 5, 0);
                }
            }
        } else if (conv.steelTemp < 1680) {
            conv.status = 'running';
            conv.flameColor = 0xff6600;
            conv.argonBlowing = false;
        }
    },

    _updateCaster(caster) {
        caster.castingSpeed = 1.5 + Math.random() * 0.5;
        caster.moldLevel = 45 + Math.random() * 10;
        caster.levelFluctuation = Math.random() * 5;

        if (caster.levelFluctuation > 3) {
            caster.status = 'warning';
            caster.castingSpeed = Math.max(1.0, caster.castingSpeed - 0.3);
            if (!caster.alarmTriggered) {
                caster.alarmTriggered = true;
                this._triggerAlarm({
                    level: 'warning',
                    title: `${caster.name}结晶器液面波动超限`,
                    message: `液面波动${caster.levelFluctuation.toFixed(1)}mm超过±3mm，已自动降速并生成报警记录`
                });
            }
        } else {
            caster.status = 'running';
            caster.alarmTriggered = false;
        }
    },

    _updateRollingMill(rm) {
        rm.rollingForce = rm.lineType === 'CSP' ? 2500 + Math.random() * 600 : 3800 + Math.random() * 800;
        rm.thicknessDeviation = (Math.random() - 0.5) * 0.25;

        if (Math.abs(rm.thicknessDeviation) > 0.1) {
            rm.status = 'warning';
            if (!rm.suggestionShown) {
                rm.suggestionShown = true;
                const suggestions = this._generateRollingSuggestions(rm);
                this._triggerAlarm({
                    level: 'warning',
                    title: `${rm.name}厚度偏差超限`,
                    message: `厚度偏差${rm.thicknessDeviation.toFixed(3)}mm超过±0.1mm，已弹出调整建议并派质检工单`
                });
                if (this.onSuggestion) {
                    this.onSuggestion(rm, suggestions);
                }
            }
        } else {
            rm.status = 'running';
            rm.suggestionShown = false;
        }
    },

    _generateRollingSuggestions(rm) {
        const suggestions = [];
        if (rm.thicknessDeviation > 0) {
            suggestions.push(`增加${rm.lineType === 'CSP' ? 'F4' : '工作辊'}轧制力约50吨`);
            suggestions.push('检查辊缝设置，适当减小辊缝');
        } else {
            suggestions.push(`减小${rm.lineType === 'CSP' ? 'F4' : '工作辊'}轧制力约50吨`);
            suggestions.push('检查辊缝设置，适当增大辊缝');
        }
        suggestions.push('通知质检人员现场测量确认');
        suggestions.push('检查来料厚度是否稳定');
        return suggestions;
    },

    _updateEnvironmental(station) {
        station.so2 = Math.max(40, Math.min(150, station.so2 + (Math.random() - 0.5) * 15));
        station.nox = Math.max(60, Math.min(220, station.nox + (Math.random() - 0.5) * 20));

        if (station.so2 > station.so2Limit || station.nox > station.noxLimit) {
            if (station.status !== 'overlimit') {
                station.status = 'overlimit';
                this._triggerAlarm({
                    level: 'critical',
                    title: `${station.name}排放超标`,
                    message: `SO₂ ${station.so2.toFixed(0)}mg/m³、NOx ${station.nox.toFixed(0)}mg/m³超过排放标准，已触发减排指令并生成整改单`
                });
            }
        } else {
            station.status = 'normal';
        }
    },

    _updateEnergyConsumption() {
        FactoryData.currentEnergy = 550 + Math.random() * 60;
        FactoryData.equipmentEnergy.forEach(eq => {
            eq.consumption = eq.standard * (0.95 + Math.random() * 0.15);
        });

        const highConsumption = FactoryData.equipmentEnergy.filter(eq => eq.consumption > eq.standard * 1.05);
        if (highConsumption.length > 0 && FactoryData.currentEnergy > FactoryData.energyBenchmark * 1.05) {
            if (!FactoryData.energyAlarmShown) {
                FactoryData.energyAlarmShown = true;
                const deviceNames = highConsumption.map(d => d.name).join('、');
                this._triggerAlarm({
                    level: 'warning',
                    title: '综合能耗超标',
                    message: `当前综合能耗${FactoryData.currentEnergy.toFixed(0)}kgce/t超过标杆值5%，高耗设备：${deviceNames}，请查看节能方案`
                });
            }
        }
    },

    _updatePersonnelPositions() {
        FactoryData.personnel.forEach(person => {
            person.position.x += (Math.random() - 0.5) * 2;
            person.position.z += (Math.random() - 0.5) * 2;

            person.position.x = Math.max(-80, Math.min(80, person.position.x));
            person.position.z = Math.max(-50, Math.min(50, person.position.z));

            let inDanger = false;
            FactoryData.dangerZones.forEach(zone => {
                const dist = Math.sqrt(
                    Math.pow(person.position.x - zone.center.x, 2) +
                    Math.pow(person.position.z - zone.center.z, 2)
                );
                if (dist < zone.radius) {
                    inDanger = true;
                }
            });

            if (inDanger && !person.inDanger) {
                person.inDanger = true;
                this._triggerAlarm({
                    level: 'critical',
                    title: '人员进入危险区域',
                    message: `${person.role}${person.name}进入危险区域，请立即撤离`
                });
            } else if (!inDanger) {
                person.inDanger = false;
            }

            if (FactoryScene.objects.personnel && FactoryScene.objects.personnel[person.id]) {
                const mesh = FactoryScene.objects.personnel[person.id];
                mesh.position.x = person.position.x;
                mesh.position.z = person.position.z;
            }
        });
    },

    _triggerAlarm(alarm) {
        const now = new Date();
        alarm.id = 'a' + Date.now();
        alarm.time = now.getHours().toString().padStart(2, '0') + ':' +
                      now.getMinutes().toString().padStart(2, '0') + ':' +
                      now.getSeconds().toString().padStart(2, '0');

        FactoryData.alarms.unshift(alarm);
        if (FactoryData.alarms.length > 50) {
            FactoryData.alarms = FactoryData.alarms.slice(0, 50);
        }

        if (this.onAlarm) {
            this.onAlarm(alarm);
        }
    },

    _checkAllEquipment() {
        FactoryData.rawMaterialYard.forEach(pile => {
            if (pile.material === '焦炭' && pile.storageDays < 7) {
                pile.lowStock = true;
                this._triggerAlarm({
                    level: 'warning',
                    title: '焦炭库存不足',
                    message: `焦炭库存仅够使用${pile.storageDays}天，已自动生成采购计划`
                });
            }
        });
    },

    matchOrderToLine(order) {
        if (order.thickness <= 6) {
            order.line = 'CSP';
        } else {
            order.line = 'heavy';
        }
        return order.line;
    },

    getEnergySavingSuggestions() {
        return [
            '1号高炉热风温度偏低，建议提高热风温度至1200℃以上，可降低焦比约3kg/t',
            '2号转炉余热回收效率不足，建议检查余热锅炉，预计可节能5kgce/t',
            'CSP轧机待温时间过长，建议优化轧制节奏，减少待温能耗',
            '全厂照明系统建议更换为LED灯具，预计年节电约50万kWh'
        ];
    }
};
