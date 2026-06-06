const FactoryData = {
    blastFurnaces: [
        {
            id: 'bf1',
            name: '1号高炉',
            position: { x: -30, y: 0, z: -20 },
            tuyerePressure: 415,
            ironTemp: 1505,
            siliconContent: 0.52,
            topLevel: 8.2,
            status: 'running',
            history24h: [],
            heatingActive: false
        },
        {
            id: 'bf2',
            name: '2号高炉',
            position: { x: -30, y: 0, z: 10 },
            tuyerePressure: 408,
            ironTemp: 1470,
            siliconContent: 0.38,
            topLevel: 7.5,
            status: 'warning',
            history24h: [],
            heatingActive: true
        }
    ],

    converters: [
        {
            id: 'conv1',
            name: '1号转炉',
            position: { x: 0, y: 0, z: -20 },
            steelTemp: 1680,
            flameColor: 0xff6600,
            composition: { C: 0.08, Mn: 1.2, P: 0.015, S: 0.008 },
            argonBlowing: false,
            status: 'running'
        },
        {
            id: 'conv2',
            name: '2号转炉',
            position: { x: 0, y: 0, z: 10 },
            steelTemp: 1720,
            flameColor: 0xff0000,
            composition: { C: 0.12, Mn: 1.0, P: 0.02, S: 0.01 },
            argonBlowing: true,
            status: 'overheat'
        }
    ],

    casters: [
        {
            id: 'caster1',
            name: '1号连铸机',
            position: { x: 30, y: 0, z: -20 },
            castingSpeed: 1.8,
            moldLevel: 50,
            levelFluctuation: 1.2,
            status: 'running'
        },
        {
            id: 'caster2',
            name: '2号连铸机',
            position: { x: 30, y: 0, z: 10 },
            castingSpeed: 1.5,
            moldLevel: 48,
            levelFluctuation: 4.5,
            status: 'warning'
        }
    ],

    rollingMills: [
        {
            id: 'rm1',
            name: 'CSP薄板轧机',
            position: { x: 55, y: 0, z: -15 },
            rollingForce: 2850,
            thicknessDeviation: 0.05,
            targetThickness: 2.0,
            status: 'running',
            lineType: 'CSP'
        },
        {
            id: 'rm2',
            name: '宽厚板轧机',
            position: { x: 55, y: 0, z: 15 },
            rollingForce: 4200,
            thicknessDeviation: 0.15,
            targetThickness: 20.0,
            status: 'warning',
            lineType: 'heavy'
        }
    ],

    rawMaterialYard: [
        {
            id: 'pile1',
            name: '铁矿石A堆',
            material: '铁矿石',
            position: { x: -60, y: 0, z: -30 },
            stock: 8500,
            storageDays: 12,
            color: 0x8B4513
        },
        {
            id: 'pile2',
            name: '铁矿石B堆',
            material: '铁矿石',
            position: { x: -60, y: 0, z: -15 },
            stock: 6200,
            storageDays: 8,
            color: 0xA0522D
        },
        {
            id: 'pile3',
            name: '焦炭堆',
            material: '焦炭',
            position: { x: -60, y: 0, z: 0 },
            stock: 1800,
            storageDays: 5,
            color: 0x2C2C2C,
            lowStock: true
        },
        {
            id: 'pile4',
            name: '石灰石堆',
            material: '石灰石',
            position: { x: -60, y: 0, z: 15 },
            stock: 4500,
            storageDays: 20,
            color: 0xD3D3D3
        },
        {
            id: 'pile5',
            name: '废钢堆',
            material: '废钢',
            position: { x: -60, y: 0, z: 30 },
            stock: 3200,
            storageDays: 15,
            color: 0x708090
        }
    ],

    finishedWarehouse: {
        id: 'warehouse',
        name: '成品库',
        position: { x: 75, y: 0, z: 0 },
        totalStock: 12580,
        areas: [
            { name: '薄板区', stock: 4200, position: { x: 70, y: 0, z: -15 } },
            { name: '厚板区', stock: 3800, position: { x: 70, y: 0, z: -5 } },
            { name: '型材区', stock: 2800, position: { x: 70, y: 0, z: 5 } },
            { name: '待检区', stock: 1780, position: { x: 70, y: 0, z: 15 } }
        ]
    },

    controlRoom: {
        id: 'control',
        name: '中央控制室',
        position: { x: 0, y: 0, z: 40 }
    },

    environmentalStations: [
        {
            id: 'stack1',
            name: '高炉区烟囱',
            position: { x: -20, y: 15, z: -35 },
            so2: 85,
            nox: 120,
            so2Limit: 100,
            noxLimit: 150,
            status: 'normal'
        },
        {
            id: 'stack2',
            name: '转炉区烟囱',
            position: { x: 10, y: 15, z: -35 },
            so2: 115,
            nox: 180,
            so2Limit: 100,
            noxLimit: 150,
            status: 'overlimit'
        },
        {
            id: 'stack3',
            name: '轧钢区烟囱',
            position: { x: 50, y: 15, z: -35 },
            so2: 60,
            nox: 95,
            so2Limit: 100,
            noxLimit: 150,
            status: 'normal'
        }
    ],

    personnel: [
        { id: 'p1', name: '张师傅', role: '高炉工', position: { x: -35, z: -15 }, inDanger: false },
        { id: 'p2', name: '李工', role: '炼钢工', position: { x: 5, z: -18 }, inDanger: true },
        { id: 'p3', name: '王班长', role: '连铸工', position: { x: 35, z: -15 }, inDanger: false },
        { id: 'p4', name: '刘技术员', role: '质检员', position: { x: 58, z: 10 }, inDanger: false },
        { id: 'p5', name: '陈主任', role: '车间主任', position: { x: -50, z: 25 }, inDanger: false },
        { id: 'p6', name: '赵安全', role: '安全员', position: { x: 2, z: 5 }, inDanger: false }
    ],

    orders: [
        { id: 'ORD202406001', product: '热轧薄板', thickness: 2.0, width: 1250, quantity: 500, line: 'CSP', status: 'production' },
        { id: 'ORD202406002', product: '宽厚板', thickness: 20.0, width: 2500, quantity: 200, line: 'heavy', status: 'scheduled' },
        { id: 'ORD202406003', product: '热轧薄板', thickness: 3.0, width: 1500, quantity: 380, line: 'CSP', status: 'scheduled' },
        { id: 'ORD202406004', product: '宽厚板', thickness: 30.0, width: 2200, quantity: 150, line: 'heavy', status: 'queued' }
    ],

    maintenanceSchedule: [
        { time: '2024-06-06 14:00', equipment: '1号连铸机', type: '定期检修', duration: '4小时' },
        { time: '2024-06-07 08:00', equipment: 'CSP薄板轧机', type: '辊系更换', duration: '8小时' },
        { time: '2024-06-08 22:00', equipment: '2号高炉', type: '风口检查', duration: '6小时' }
    ],

    energyBenchmark: 580,
    currentEnergy: 572,
    equipmentEnergy: [
        { id: 'bf1', name: '1号高炉', consumption: 185, standard: 180 },
        { id: 'bf2', name: '2号高炉', consumption: 198, standard: 180 },
        { id: 'conv1', name: '1号转炉', consumption: 45, standard: 42 },
        { id: 'conv2', name: '2号转炉', consumption: 52, standard: 42 },
        { id: 'rm1', name: 'CSP薄板轧机', consumption: 68, standard: 65 },
        { id: 'rm2', name: '宽厚板轧机', consumption: 85, standard: 80 }
    ],

    alarms: [
        { id: 'a1', title: '2号高炉铁水温度过低', level: 'critical', time: '10:32:15', message: '铁水温度1470℃低于阈值1480℃，已启动加硅增温程序' },
        { id: 'a2', title: '2号转炉钢水超温', level: 'critical', time: '10:28:42', message: '钢水温度1720℃超过1700℃，已开启底吹氩气冷却' },
        { id: 'a3', title: '焦炭库存不足', level: 'warning', time: '10:15:00', message: '焦炭库存仅够使用5天，已自动生成采购计划' },
        { id: 'a4', title: '转炉区排放超标', level: 'critical', time: '10:05:22', message: 'SO₂ 115mg/m³、NOx 180mg/m³超过排放标准，已触发减排指令' }
    ],

    operationLogs: [],
    shiftStats: {
        shift: '甲班',
        startTime: '08:00',
        output: 2856,
        qualifiedRate: 98.6,
        energyConsumption: 572,
        envEvents: 3
    },

    dangerZones: [
        { name: '转炉平台', center: { x: 0, z: -20 }, radius: 8 },
        { name: '高炉出铁场', center: { x: -30, z: -20 }, radius: 10 },
        { name: '高压配电室', center: { x: 20, z: 30 }, radius: 5 }
    ]
};

function generateHistory24h() {
    const now = Date.now();
    FactoryData.blastFurnaces.forEach(bf => {
        bf.history24h = [];
        for (let i = 23; i >= 0; i--) {
            const time = new Date(now - i * 3600000);
            bf.history24h.push({
                time: time.getHours() + ':00',
                temp: 1480 + Math.random() * 60,
                pressure: 390 + Math.random() * 40,
                silicon: 0.3 + Math.random() * 0.5
            });
        }
    });
}
generateHistory24h();

const RolePermissions = {
    operator: {
        name: '操作员',
        canView: true,
        canControlEquipment: true,
        canExport: false,
        canViewScheduling: false
    },
    director: {
        name: '车间主任',
        canView: true,
        canControlEquipment: true,
        canExport: true,
        canViewScheduling: true
    },
    manager: {
        name: '厂长',
        canView: true,
        canControlEquipment: true,
        canExport: true,
        canViewScheduling: true
    }
};
