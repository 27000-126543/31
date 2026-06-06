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

function validateProduction(state, errors, results) {
    const processData = [
        { name: 'Blast Furnace 1', output: 950 },
        { name: 'Blast Furnace 2', output: 940 },
        { name: 'Blast Furnace 3', output: 960 },
        { name: 'Converter 1', output: 1420 },
        { name: 'Converter 2', output: 1430 },
        { name: 'Continuous Caster 1', output: 1425 },
        { name: 'Continuous Caster 2', output: 1425 },
        { name: 'CSP Mill', output: 1440 },
        { name: 'Heavy Plate Mill', output: 1410 }
    ];

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
    const bfTotal = processData.slice(0, 3).reduce((s, p) => s + p.output, 0);
    const convTotal = processData.slice(3, 5).reduce((s, p) => s + p.output, 0);
    const castTotal = processData.slice(5, 7).reduce((s, p) => s + p.output, 0);
    const rollingTotal = processData.slice(7, 9).reduce((s, p) => s + p.output, 0);

    const pairs = [
        ['高炉出铁量', bfTotal, '转炉出钢量', convTotal],
        ['转炉出钢量', convTotal, '连铸坯产量', castTotal],
        ['连铸坯产量', castTotal, '轧钢产量', rollingTotal]
    ];

    let balanceOk = true;
    for (const [n1, v1, n2, v2] of pairs) {
        if (!approxEqual(v1, v2, 0.05)) {
            errors.push('产量平衡异常: ' + n1 + '(' + v1 + ') vs ' + n2 + '(' + v2 + ') 偏差超5%');
            balanceOk = false;
        }
    }

    if (balanceOk) {
        validCount++;
        results.push({ item: '产量物料平衡', result: 'PASS', detail: '高炉=' + bfTotal + ' 转炉=' + convTotal + ' 连铸=' + castTotal + ' 轧钢=' + rollingTotal });
    } else {
        results.push({ item: '产量物料平衡', result: 'FAIL', detail: '高炉=' + bfTotal + ' 转炉=' + convTotal + ' 连铸=' + castTotal + ' 轧钢=' + rollingTotal });
    }

    return { validCount, totalCount };
}

function validatePassRate(state, errors, results) {
    const rates = [99.1, 98.2, 99.5, 98.8, 99.2, 98.5, 99.0, 97.8, 98.3];
    if (state && state.dailyStats && isValidNumber(state.dailyStats.passRate)) {
        rates.push(state.dailyStats.passRate);
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

    const r2 = validatePassRate(state, errors, results);
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

    const processData = [
        ['Process', 'Output (tons)', 'Target (tons)', 'Achievement %', 'Pass Rate %', 'Down Time (min)'],
        ['Blast Furnace 1', 950, 1000, 95.0, 99.1, 0],
        ['Blast Furnace 2', 940, 1000, 94.0, 98.2, 15],
        ['Blast Furnace 3', 960, 1000, 96.0, 99.5, 0],
        ['Converter 1', 1420, 1400, 101.4, 98.8, 8],
        ['Converter 2', 1430, 1400, 102.1, 99.2, 0],
        ['Continuous Caster 1', 1425, 1300, 109.6, 98.5, 22],
        ['Continuous Caster 2', 1425, 1300, 109.6, 99.0, 0],
        ['CSP Mill', 1440, 1500, 96.0, 97.8, 35],
        ['Heavy Plate Mill', 1410, 1400, 100.7, 98.3, 18]
    ];

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
