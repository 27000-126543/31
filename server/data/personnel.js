function gaussRandom(mean, std) {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z * std;
}

const FACTORY_PATH_POINTS = {
    blastFurnaceArea: { x: 5, z: -20, name: '高炉旁' },
    converterControl: { x: 22, z: -12, name: '转炉操作室' },
    centralControl: { x: 0, z: 0, name: '中控室' },
    restRoom: { x: -30, z: 10, name: '休息室' },
    casterPlatform: { x: 15, z: 15, name: '连铸平台' },
    qualityLab: { x: 40, z: 5, name: '质检室' },
    rawYard: { x: -40, z: -15, name: '原料堆场' },
    rollingMill: { x: 35, z: 20, name: '轧钢车间' }
};

const WORKER_CONFIGS = [
    {
        id: 'p001', name: '张建国', role: '高炉工',
        homeX: 5, homeZ: -8, speed: 0.8,
        paths: ['blastFurnaceArea', 'centralControl', 'restRoom', 'rawYard', 'casterPlatform']
    },
    {
        id: 'p002', name: '李明华', role: '炼钢工',
        homeX: 25, homeZ: -12, speed: 0.9,
        paths: ['converterControl', 'blastFurnaceArea', 'qualityLab', 'centralControl', 'restRoom']
    },
    {
        id: 'p003', name: '王志强', role: '质检工',
        homeX: 45, homeZ: 10, speed: 0.7,
        paths: ['qualityLab', 'casterPlatform', 'rollingMill', 'converterControl', 'centralControl']
    },
    {
        id: 'p004', name: '赵伟', role: '连铸工',
        homeX: 0, homeZ: 15, speed: 0.85,
        paths: ['casterPlatform', 'rollingMill', 'centralControl', 'restRoom', 'qualityLab']
    },
    {
        id: 'p005', name: '刘芳', role: '中控操作员',
        homeX: 2, homeZ: 2, speed: 0.6,
        paths: ['centralControl', 'converterControl', 'blastFurnaceArea', 'restRoom', 'casterPlatform', 'qualityLab']
    },
    {
        id: 'p006', name: '陈刚', role: '原料工',
        homeX: -35, homeZ: -20, speed: 1.0,
        paths: ['rawYard', 'blastFurnaceArea', 'restRoom', 'centralControl']
    }
];

class Worker {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.role = config.role;
        this.x = config.homeX;
        this.z = config.homeZ;
        this.vx = 0;
        this.vz = 0;
        this.homeX = config.homeX;
        this.homeZ = config.homeZ;
        this.speed = config.speed;
        this.inDanger = false;
        this.dangerDistance = Infinity;
        this.dangerLevel = 'safe';
        this.pathPoints = config.paths.map(key => ({
            key,
            x: FACTORY_PATH_POINTS[key].x,
            z: FACTORY_PATH_POINTS[key].z,
            name: FACTORY_PATH_POINTS[key].name
        }));
        const firstTarget = this.pathPoints[Math.floor(Math.random() * this.pathPoints.length)];
        this.targetX = firstTarget.x;
        this.targetZ = firstTarget.z;
        this.targetName = firstTarget.name;
        this.lastRetarget = Date.now();
        this.enteredDangerAt = null;
        this.currentDangerZone = null;
    }

    update(dt, dangerZones) {
        const speedFactor = this.speed * 0.15;
        this.vx = 0.9 * this.vx + 0.1 * (this.targetX - this.x) * speedFactor + gaussRandom(0, 0.02);
        this.vz = 0.9 * this.vz + 0.1 * (this.targetZ - this.z) * speedFactor + gaussRandom(0, 0.02);

        this.x += this.vx;
        this.z += this.vz;

        const distToTarget = Math.sqrt(
            Math.pow(this.x - this.targetX, 2) + Math.pow(this.z - this.targetZ, 2)
        );

        const now = Date.now();
        if (distToTarget < 0.5 || now - this.lastRetarget > 30000) {
            const currentIdx = this.pathPoints.findIndex(
                p => p.x === this.targetX && p.z === this.targetZ
            );
            let nextIdx;
            do {
                nextIdx = Math.floor(Math.random() * this.pathPoints.length);
            } while (nextIdx === currentIdx && this.pathPoints.length > 1);
            const next = this.pathPoints[nextIdx];
            this.targetX = next.x;
            this.targetZ = next.z;
            this.targetName = next.name;
            this.lastRetarget = now;
        }

        let minDist = Infinity;
        let nearestZone = null;
        for (const dz of dangerZones) {
            const d = Math.sqrt(Math.pow(this.x - dz.x, 2) + Math.pow(this.z - dz.z, 2));
            if (d < minDist) {
                minDist = d;
                nearestZone = dz;
            }
        }

        this.dangerDistance = minDist;

        if (minDist <= 1.5) {
            this.dangerLevel = 'danger';
            this.inDanger = true;
            if (!this.enteredDangerAt) {
                this.enteredDangerAt = now;
                this.currentDangerZone = nearestZone;
            }
        } else if (minDist <= 3) {
            this.dangerLevel = 'warning';
            this.inDanger = false;
            this.enteredDangerAt = null;
            this.currentDangerZone = null;
        } else {
            this.dangerLevel = 'safe';
            this.inDanger = false;
            this.enteredDangerAt = null;
            this.currentDangerZone = null;
        }
    }

    getState() {
        return {
            id: this.id,
            name: this.name,
            role: this.role,
            x: this.x,
            z: this.z,
            vx: this.vx,
            vz: this.vz,
            homeX: this.homeX,
            homeZ: this.homeZ,
            targetX: this.targetX,
            targetZ: this.targetZ,
            targetName: this.targetName,
            speed: this.speed,
            inDanger: this.inDanger,
            dangerDistance: this.dangerDistance,
            dangerLevel: this.dangerLevel,
            lastUpdate: Date.now()
        };
    }
}

class PersonnelSystem {
    constructor(dangerZones) {
        this.workers = WORKER_CONFIGS.map(cfg => new Worker(cfg));
        this.dangerZones = dangerZones || [];
        this.dangerEvents = [];
        this._lastEventCheck = {};
    }

    setDangerZones(zones) {
        this.dangerZones = zones;
    }

    tick(state, dt) {
        if (state && state.dangerZones) {
            this.dangerZones = state.dangerZones;
        }

        this.workers.forEach(w => w.update(dt, this.dangerZones));

        this.workers.forEach(w => {
            const now = Date.now();
            if (w.inDanger && w.currentDangerZone) {
                const eventKey = w.id + '_' + w.currentDangerZone.id;
                if (!this._lastEventCheck[eventKey] || now - this._lastEventCheck[eventKey] > 8000) {
                    this._lastEventCheck[eventKey] = now;
                    this.dangerEvents.unshift({
                        id: 'evt_' + now + '_' + Math.random().toString(36).slice(2, 6),
                        workerId: w.id,
                        workerName: w.name,
                        workerRole: w.role,
                        zoneId: w.currentDangerZone.id,
                        zoneName: w.currentDangerZone.name,
                        distance: w.dangerDistance,
                        level: w.dangerLevel,
                        enteredAt: w.enteredDangerAt,
                        timestamp: now
                    });
                    if (this.dangerEvents.length > 50) {
                        this.dangerEvents.pop();
                    }
                }
            }
        });

        return this.getPersonnelState();
    }

    getPersonnelState() {
        return this.workers.map(w => w.getState());
    }

    getDangerEvents() {
        return this.dangerEvents.slice();
    }
}

module.exports = { PersonnelSystem, Worker, FACTORY_PATH_POINTS };
