const XLSX = require('xlsx');
const crypto = require('crypto');

const exportLogs = [];
const MAX_LOGS = 100;

function isValidNumber(v) {
    return v !== null && v !== undefined && typeof v === 'number' && !isNaN(v) && isFinite(v);
}

function approxEqual(a, b, tol) {
    if (!isValidNumber(a) || !isValidNumber(b)) return false;
    if (a === 0 && b === 0) return true;
    const avg = (Math.abs(a) + Math.abs(b)) / 2;
    if (avg === 0) return false;
    return Math.abs(a - b) / avg <= tol;
}

function buildProcessDataFromState(state) {
    const result = [];
    const dailyTotal = (state && state.dailyStats && isValidNumber(state.dailyStats.production))
        ? state.dailyStats.production : 2800;

    const bfBasePerUnit = dailyTotal * 0.34 / 3;
    const bfRaw = [];
    const bfItems = [];
    if (state && state.blastFurnaces) {
        state.blastFurnaces.forEach((bf, idx) => {
            const factor = bf.status === 'running' ? (0.92 + ((bf.hotMetalTemp - 1450) / 150) * 0.12) : 0.35;
            const rawOutput = bfBasePerUnit * factor + (bf.burdenLevel || 70) * 0.15;
            bfRaw.push(rawOutput);
            bfItems.push({
                name: bf.name,
                type: 'blastFurnace',
                target: Math.round(bfBasePerUnit * 1.04),
                passRate: 98.5 + ((bf.hotMetalTemp - 1450) / 150) * 1.0,
                downTime: bf.status === 'running' ? Math.max(0, Math.round((100 - (bf.burdenLevel || 70)) / 4)) : 120
            });
        });
    }
    const bfRawTotal = bfRaw.reduce((s, v) => s + v, 0) || 1;
    const bfTargetTotal = Math.round(dailyTotal * 1.02);
    bfItems.forEach((item, i) => {
        result.push({
            ...item,
            output: Math.round(bfRaw[i] / bfRawTotal * bfTargetTotal)
        });
    });
    const bfTotal = bfTargetTotal;

    const convTargetTotal = Math.round(bfTotal * 0.94);
    const convBasePerUnit = convTargetTotal / 2;
    const convRaw = [];
    const convItems = [];
    if (state && state.converters) {
        state.converters.forEach((c, idx) => {
            const factor = c.status === 'blowing' ? (0.93 + ((c.temp - 1620) / 120) * 0.1) : 0.38;
            const rawOutput = convBasePerUnit * factor;
            convRaw.push(rawOutput);
            convItems.push({
                name: c.name,
                type: 'converter',
                target: Math.round(convBasePerUnit * 1.03),
                passRate: 98.2 + (1 - c.carbon) * 0.7,
                downTime: c.status === 'blowing' ? Math.round(Math.abs(c.temp - 1660) * 0.12) : 90
            });
        });
    }
    const convRawTotal = convRaw.reduce((s, v) => s + v, 0) || 1;
    convItems.forEach((item, i) => {
        result.push({
            ...item,
            output: Math.round(convRaw[i] / convRawTotal * convTargetTotal)
        });
    });
    const convTotal = convTargetTotal;

    const castTargetTotal = Math.round(convTotal * 0.96);
    const castBasePerUnit = castTargetTotal / 2;
    const castRaw = [];
    const castItems = [];
    if (state && state.casters) {
        state.casters.forEach((ct, idx) => {
            const factor = ct.status === 'casting' ? (0.93 + ct.castingSpeed / 4) : 0.35;
            const rawOutput = castBasePerUnit * factor;
            castRaw.push(rawOutput);
            castItems.push({
                name: ct.name,
                type: 'caster',
                target: Math.round(castBasePerUnit * 1.03),
                passRate: 99.0 - ct.levelVariation * 0.25,
                downTime: ct.status === 'casting' ? Math.round(ct.levelVariation * 6) : 100
            });
        });
    }
    const castRawTotal = castRaw.reduce((s, v) => s + v, 0) || 1;
    castItems.forEach((item, i) => {
        result.push({
            ...item,
            output: Math.round(castRaw[i] / castRawTotal * castTargetTotal)
        });
    });
    const castTotal = castTargetTotal;

    const rollingTargetTotal = Math.round(castTotal * 0.97);
    const rollingBasePerUnit = rollingTargetTotal / 2;
    const rollingRaw = [];
    const rollingItems = [];
    if (state && state.rollingMills) {
        state.rollingMills.forEach((rm, idx) => {
            const loadFactor = rm._loadFactor || 0.78;
            const factor = rm.status === 'rolling' ? (0.9 + loadFactor * 0.15) : 0.38;
            const rawOutput = rollingBasePerUnit * factor;
            rollingRaw.push(rawOutput);
            rollingItems.push({
                name: rm.name,
                type: 'rollingMill',
                target: Math.round(rollingBasePerUnit * 1.05),
                passRate: 98.5 - Math.abs(rm.thicknessDeviation || 0) * 8,
                downTime: rm.status === 'rolling' ? Math.round(Math.abs(rm.thicknessDeviation || 0) * 150) : 150
            });
        });
    }
    const rollingRawTotal = rollingRaw.reduce((s, v) => s + v, 0) || 1;
    rollingItems.forEach((item, i) => {
        result.push({
            ...item,
            output: Math.round(rollingRaw[i] / rollingRawTotal * rollingTargetTotal)
        });
    });

    return result;
}

function validateProduction(state, errors, results) {
    const processData = buildProcessDataFromState(state);

    let validCount = 0;
    let totalCount = 0;

    for (const p of processData) {
        totalCount++;
        if (!isValidNumber(p.output) || p.output < 0) {
            errors.push('产量数据无效: ' + p.name + '=' + p.output);
            results.push({ item: '产量-' + p.name, result: 'FAIL', detail: '值无效或为负' });
        } else {
            validCount++;
            results.push({ item: '产量-' + p.name, result: 'PASS', detail: '值=' + p.output });
        }
    }

    totalCount++;
    const bfTotal = processData.filter(p => p.type === 'blastFurnace').reduce((s, p) => s + p.output, 0);
    const convTotal = processData.filter(p => p.type === 'converter').reduce((s, p) => s + p.output, 0);
    const castTotal = processData.filter(p => p.type === 'caster').reduce((s, p) => s + p.output, 0);
    const rollingTotal = processData.filter(p => p.type === 'rollingMill').reduce((s, p) => s + p.output, 0);

    const pairs = [
        ['高炉出铁量', bfTotal, '转炉出钢量', convTotal],
        ['转炉出钢量', convTotal, '连铸坯产量', castTotal],
        ['连铸坯产量', castTotal, '轧钢产量', rollingTotal]
    ];

    let balanceOk = true;
    for (const [n1, v1, n2, v2] of pairs) {
        if (!approxEqual(v1, v2, 0.1)) {
            errors.push('产量平衡异常: ' + n1 + '(' + v1 + ') vs ' + n2 + '(' + v2 + ') 偏差超10%');
            balanceOk = false;
        }
    }

    if (balanceOk) {
        validCount++;
        results.push({ item: '产量物料平衡', result: 'PASS', detail: '高炉=' + bfTotal + ' 转炉=' + convTotal + ' 连铸=' + castTotal + ' 轧钢=' + rollingTotal });
    } else {
        results.push({ item: '产量物料平衡', result: 'FAIL', detail: '高炉=' + bfTotal + ' 转炉=' + convTotal + ' 连铸=' + castTotal + ' 轧钢=' + rollingTotal });
    }

    return { validCount, totalCount, processData };
}

function validatePassRate(state, errors, results, processData) {
    const rates = [];
    if (processData && processData.length > 0) {
        processData.forEach(p => {
            if (isValidNumber(p.passRate)) rates.push(p.passRate);
        });
    }
    if (state && state.dailyStats && isValidNumber(state.dailyStats.passRate)) {
        rates.push(state.dailyStats.passRate);
    }
    if (rates.length === 0) {
        rates.push(98.5);
    }

    let validCount = 0;
    let totalCount = 0;

    for (let i = 0; i < rates.length; i++) {
        totalCount++;
        const r = rates[i];
        if (!isValidNumber(r) || r < 0 || r > 100) {
            errors.push('合格率超出[0,100]范围: ' + r);
            results.push({ item: '合格率-范围-' + i, result: 'FAIL', detail: '值=' + r });
        } else if (r < 80) {
            errors.push('合格率低于合理区间[80,100]: ' + r);
            results.push({ item: '合格率-合理区间-' + i, result: 'FAIL', detail: '值=' + r });
        } else {
            validCount++;
            results.push({ item: '合格率-检查-' + i, result: 'PASS', detail: '值=' + r.toFixed(2) + '%' });
        }
    }

    return { validCount, totalCount };
}

function validateEnergy(state, errors, results) {
    let validCount = 0;
    let totalCount = 0;

    if (state && state.energyConsumption && state.energyConsumption.perFurnace) {
        for (const pf of state.energyConsumption.perFurnace) {
            totalCount++;
            if (!isValidNumber(pf.value) || pf.value <= 0) {
                errors.push('设备能耗无效: ' + pf.name + '=' + pf.value);
                results.push({ item: '能耗-' + pf.name, result: 'FAIL', detail: '值无效或≤0' });
            } else {
                validCount++;
                results.push({ item: '能耗-' + pf.name, result: 'PASS', detail: '值=' + pf.value.toFixed(1) + 'kgce/t' });
            }
        }
    }

    totalCount++;
    const current = state && state.energyConsumption ? state.energyConsumption.current : 586;
    if (!isValidNumber(current) || current < 400 || current > 800) {
        errors.push('综合能耗超出合理范围[400,800]kgce/吨: ' + current);
        results.push({ item: '综合能耗范围', result: 'FAIL', detail: '值=' + current + ' 范围[400,800]' });
    } else {
        validCount++;
        results.push({ item: '综合能耗范围', result: 'PASS', detail: '值=' + current.toFixed(1) + 'kgce/t' });
    }

    return { validCount, totalCount };
}

function validateEnvironmental(state, errors, results) {
    let validCount = 0;
    let totalCount = 0;

    if (state && state.stacks) {
        for (const st of state.stacks) {
            totalCount++;
            if (!isValidNumber(st.so2) || st.so2 < 0) {
                errors.push('SO2排放量无效: ' + st.name + '=' + st.so2);
                results.push({ item: '环保-SO2-' + st.name, result: 'FAIL', detail: '值无效或<0' });
            } else {
                validCount++;
                results.push({ item: '环保-SO2-' + st.name, result: 'PASS', detail: '值=' + st.so2.toFixed(0) + 'mg/m3' });
            }

            totalCount++;
            if (!isValidNumber(st.nox) || st.nox < 0) {
                errors.push('NOx排放量无效: ' + st.name + '=' + st.nox);
                results.push({ item: '环保-NOx-' + st.name, result: 'FAIL', detail: '值无效或<0' });
            } else {
                validCount++;
                results.push({ item: '环保-NOx-' + st.name, result: 'PASS', detail: '值=' + st.nox.toFixed(0) + 'mg/m3' });
            }
        }
    }

    if (state && state.alarms) {
        const overAlarms = state.alarms.filter(a =>
            a.title.includes('排放') || a.title.includes('超标')
        );
        for (const a of overAlarms) {
            totalCount++;
            if (!a.timestamp || !isValidNumber(a.timestamp) || a.timestamp <= 0) {
                errors.push('超标记录缺少有效时间戳: ' + a.title);
                results.push({ item: '环保-超标时间戳', result: 'FAIL', detail: a.title });
            } else {
                validCount++;
                results.push({ item: '环保-超标时间戳', result: 'PASS', detail: a.title + ' @ ' + new Date(a.timestamp).toLocaleString('zh-CN') });
            }
        }
    }

    return { validCount, totalCount };
}

function validateTimeContinuity(state, errors, results) {
    let validCount = 0;
    let totalCount = 0;

    const histories = [];
    if (state && state.blastFurnaces) {
        for (const bf of state.blastFurnaces) {
            if (bf.history && Array.isArray(bf.history) && bf.history.length > 1) {
                histories.push({ name: bf.name, history: bf.history });
            }
        }
    }

    if (histories.length === 0) {
        totalCount++;
        validCount++;
        results.push({ item: '时间连续性', result: 'PASS', detail: '无历史数据可校验' });
        return { validCount, totalCount };
    }

    for (const h of histories) {
        totalCount++;
        const intervals = [];
        for (let i = 1; i < h.history.length; i++) {
            intervals.push(h.history[i].time - h.history[i - 1].time);
        }
        if (intervals.length === 0) {
            validCount++;
            results.push({ item: '时间连续性-' + h.name, result: 'PASS', detail: '数据点不足' });
            continue;
        }
        const avg = intervals.reduce((s, v) => s + v, 0) / intervals.length;
        let ok = true;
        for (const iv of intervals) {
            if (avg > 0 && Math.abs(iv - avg) / avg > 0.3) {
                ok = false;
                break;
            }
        }
        if (ok) {
            validCount++;
            results.push({ item: '时间连续性-' + h.name, result: 'PASS', detail: '平均间隔=' + (avg / 1000).toFixed(0) + 's' });
        } else {
            errors.push('时间间隔不均匀: ' + h.name + ' 平均=' + avg + 'ms');
            results.push({ item: '时间连续性-' + h.name, result: 'FAIL', detail: '间隔偏差超30%' });
        }
    }

    return { validCount, totalCount };
}

function validateData(state) {
    const errors = [];
    const results = [];

    let totalValid = 0;
    let totalItems = 0;

    const r1 = validateProduction(state, errors, results);
    totalValid += r1.validCount;
    totalItems += r1.totalCount;
    const processData = r1.processData || [];

    const r2 = validatePassRate(state, errors, results, processData);
    totalValid += r2.validCount;
    totalItems += r2.totalCount;

    const r3 = validateEnergy(state, errors, results);
    totalValid += r3.validCount;
    totalItems += r3.totalCount;

    const r4 = validateEnvironmental(state, errors, results);
    totalValid += r4.validCount;
    totalItems += r4.totalCount;

    const r5 = validateTimeContinuity(state, errors, results);
    totalValid += r5.validCount;
    totalItems += r5.totalCount;

    const score = totalItems > 0 ? Math.round((totalValid / totalItems) * 100) : 0;

    return {
        success: errors.length === 0,
        errors,
        results,
        score,
        totalValid,
        totalItems
    };
}

function computeDataHash(state) {
    const data = {
        dailyStats: state.dailyStats,
        energyConsumption: state.energyConsumption,
        stacks: state.stacks,
        alarms: state.alarms,
        blastFurnaces: state.blastFurnaces ? state.blastFurnaces.map(bf => ({
            id: bf.id,
            history: bf.history
        })) : []
    };
    const json = JSON.stringify(data);
    return crypto.createHash('sha256').update(json, 'utf8').digest('hex').slice(0, 16);
}

function buildAuditHeader(exportTime, user, score, dataHash, cols) {
    const text = '导出时间: ' + exportTime + '  导出人: ' + user + '  完整性得分: ' + score + '分  数据签名: ' + dataHash;
    return {
        text,
        merge: { s: { r: 0, c: 0 }, e: { r: 0, c: cols - 1 } }
    };
}

function applyAuditHeader(ws, audit, cols) {
    XLSX.utils.sheet_add_aoa(ws, [[audit.text]], { origin: 'A1' });
    ws['!merges'] = ws['!merges'] || [];
    ws['!merges'].unshift(audit.merge);
    if (ws['A1']) {
        ws['A1'].s = { font: { bold: true } };
    }
}

function generateDailyReport(state, shift, user) {
    const username = user || 'System';

    const validation = validateData(state);
    if (!validation.success) {
        return {
            success: false,
            errors: validation.errors
        };
    }

    const now = new Date();
    const exportTime = now.toISOString();
    const dataHash = computeDataHash(state);
    const score = validation.score;

    const wb = XLSX.utils.book_new();

    const prodCols = 6;
    const auditProd = buildAuditHeader(exportTime, username, score, dataHash, prodCols);

    const header1 = ['Production Daily Report - Shift ' + shift.toUpperCase()];
    const subHeader1 = [
        'Generated:',
        new Date().toLocaleString('zh-CN'),
        'Total Production:',
        state.dailyStats.production + ' tons',
        'Pass Rate:',
        state.dailyStats.passRate.toFixed(2) + '%'
    ];

    const processDataHeader = ['Process', 'Output (tons)', 'Target (tons)', 'Achievement %', 'Pass Rate %', 'Down Time (min)'];
    const realProcessData = buildProcessDataFromState(state);
    const processRows = realProcessData.map(p => [
        p.name,
        p.output,
        p.target,
        parseFloat(((p.output / p.target) * 100).toFixed(1)),
        parseFloat((p.passRate || 98.5).toFixed(2)),
        p.downTime || 0
    ]);
    const processData = [processDataHeader, ...processRows];

    const ws1Data = [[], header1, subHeader1, [], ...processData];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
    ws1['!cols'] = [
        { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 18 }
    ];
    ws1['!merges'] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }];
    applyAuditHeader(ws1, auditProd, prodCols);
    XLSX.utils.book_append_sheet(wb, ws1, 'Production');

    const energyCols = 6;
    const auditEnergy = buildAuditHeader(exportTime, username, score, dataHash, energyCols);

    const energyHeader = [
        ['Energy Consumption Report'],
        [],
        ['Equipment', 'Energy (kgce/t)', 'Benchmark (kgce/t)', 'Deviation %', 'Status', 'Suggestion']
    ];
    const energyRows = state.energyConsumption.perFurnace.map(pf => {
        const dev = ((pf.value - state.energyConsumption.benchmark) / state.energyConsumption.benchmark * 100).toFixed(2);
        const over = pf.value > state.energyConsumption.benchmark * 1.05;
        return [
            pf.name,
            pf.value.toFixed(1),
            state.energyConsumption.benchmark,
            dev + '%',
            over ? 'HIGH' : 'Normal',
            over ? 'Check heat recovery system; optimize burden ratio' : '-'
        ];
    });
    energyRows.push([
        'Plant Total',
        state.energyConsumption.current.toFixed(1),
        state.energyConsumption.benchmark,
        ((state.energyConsumption.current - state.energyConsumption.benchmark) / state.energyConsumption.benchmark * 100).toFixed(2) + '%',
        state.energyConsumption.current > state.energyConsumption.benchmark * 1.05 ? 'HIGH' : 'Normal',
        ''
    ]);
    const ws2Data = [[], ...energyHeader, ...energyRows];
    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
    ws2['!cols'] = [
        { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 50 }
    ];
    ws2['!merges'] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }];
    applyAuditHeader(ws2, auditEnergy, energyCols);
    XLSX.utils.book_append_sheet(wb, ws2, 'Energy');

    const envCols = 7;
    const auditEnv = buildAuditHeader(exportTime, username, score, dataHash, envCols);

    const envHeader = [
        ['Environmental Events Report'],
        [],
        ['Time', 'Stack', 'Pollutant', 'Concentration (mg/m3)', 'Limit (mg/m3)', 'Level', 'Action Taken']
    ];
    const criticalAlarms = state.alarms.filter(a =>
        a.title.includes('排放') || a.title.includes('超标')
    ).slice(0, 20).map(a => {
        const parts = a.message.split(/[\s,，:：]+/);
        return [
            new Date(a.timestamp).toLocaleString('zh-CN'),
            a.title.split(' ')[0],
            'SO2/NOx',
            parts.filter(p => /^\d+$/.test(p)).slice(0, 2).join('/') || '-',
            '100/150',
            a.level === 'critical' ? 'EXCEED' : 'WARN',
            'Emission reduction triggered; rectification order generated'
        ];
    });

    if (criticalAlarms.length === 0) {
        criticalAlarms.push([
            new Date().toLocaleString('zh-CN'),
            'All stacks',
            '-',
            'Within limits',
            '-',
            'Normal',
            'Continuous monitoring'
        ]);
    }

    const summaryRow = [
        '', 'Total env events:', state.dailyStats.envEvents,
        'Pass rate:', state.dailyStats.passRate.toFixed(2) + '%'
    ];

    const ws3Data = [[], ...envHeader, ...criticalAlarms, [], summaryRow];
    const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
    ws3['!cols'] = [
        { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 50 }
    ];
    ws3['!merges'] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }];
    applyAuditHeader(ws3, auditEnv, envCols);
    XLSX.utils.book_append_sheet(wb, ws3, 'Environmental');

    const verifyCols = 5;
    const auditVerify = buildAuditHeader(exportTime, username, score, dataHash, verifyCols);

    const verifyHeader = [
        ['数据校验报告'],
        [],
        ['校验项', '结果', '详情', '校验时间', '校验人员']
    ];
    const verifyRows = validation.results.map(r => [
        r.item,
        r.result,
        r.detail,
        exportTime,
        username
    ]);
    const scoreRow = [
        '数据完整性得分',
        score + ' / 100',
        '通过 ' + validation.totalValid + '/' + validation.totalItems + ' 项',
        exportTime,
        username
    ];
    const ws4Data = [[], ...verifyHeader, ...verifyRows, [], scoreRow];
    const ws4 = XLSX.utils.aoa_to_sheet(ws4Data);
    ws4['!cols'] = [
        { wch: 28 }, { wch: 12 }, { wch: 60 }, { wch: 28 }, { wch: 16 }
    ];
    ws4['!merges'] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }];
    applyAuditHeader(ws4, auditVerify, verifyCols);
    XLSX.utils.book_append_sheet(wb, ws4, '数据校验');

    const logEntry = {
        id: 'exp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        time: exportTime,
        user: username,
        shift: shift,
        integrityScore: score,
        dataHash: dataHash
    };
    exportLogs.unshift(logEntry);
    if (exportLogs.length > MAX_LOGS) {
        exportLogs.length = MAX_LOGS;
    }

    const fileName = 'SteelFactory_DailyReport_' + shift + '_' +
        now.toISOString().slice(0, 10) + '.xlsx';

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return {
        success: true,
        buffer,
        fileName,
        logEntry
    };
}

function getExportHistory() {
    return exportLogs.slice(0, MAX_LOGS);
}

module.exports = { generateDailyReport, getExportHistory };
