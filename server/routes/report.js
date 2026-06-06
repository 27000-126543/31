const XLSX = require('xlsx');

function generateDailyReport(state, shift) {
    const wb = XLSX.utils.book_new();

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
        ['Blast Furnace 1', 980, 1000, 98.0, 99.1, 0],
        ['Blast Furnace 2', 920, 1000, 92.0, 98.2, 15],
        ['Blast Furnace 3', 1020, 1000, 102.0, 99.5, 0],
        ['Converter 1', 1380, 1400, 98.6, 98.8, 8],
        ['Converter 2', 1420, 1400, 101.4, 99.2, 0],
        ['Continuous Caster 1', 1280, 1300, 98.5, 98.5, 22],
        ['Continuous Caster 2', 1350, 1300, 103.8, 99.0, 0],
        ['CSP Mill', 1420, 1500, 94.7, 97.8, 35],
        ['Heavy Plate Mill', 1380, 1400, 98.6, 98.3, 18]
    ];

    const ws1Data = [header1, subHeader1, [], ...processData];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
    ws1['!cols'] = [
        { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 18 }
    ];
    ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Production');

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
    const ws2Data = [...energyHeader, ...energyRows];
    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
    ws2['!cols'] = [
        { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 10 }, { wch: 50 }
    ];
    ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Energy');

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

    const ws3Data = [...envHeader, ...criticalAlarms, [], summaryRow];
    const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
    ws3['!cols'] = [
        { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 50 }
    ];
    ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Environmental');

    const fileName = 'SteelFactory_DailyReport_' + shift + '_' +
        new Date().toISOString().slice(0, 10) + '.xlsx';

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { generateDailyReport };
