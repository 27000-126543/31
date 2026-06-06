class ProductionScheduler {
    constructor(simulator) {
        this.simulator = simulator;
    }

    matchOrderToLine(order) {
        const state = this.simulator.state;
        const mills = state.rollingMills;
        const maintenance = state.maintenanceSchedule;

        const candidates = [];

        for (const rm of mills) {
            const [minT, maxT] = rm.thicknessRange;
            if (order.thickness < minT || order.thickness > maxT) continue;

            const mtnWindow = maintenance.find(m => {
                if (m.equipment !== rm.name) return false;
                const orderEst = Date.now() + order.quantity * 120000;
                return !(orderEst < m.startTime || Date.now() > m.endTime);
            });

            let score = 0;
            score += (1 - Math.abs(order.thickness - (minT + maxT) / 2) / (maxT - minT)) * 50;
            score += rm.status === 'rolling' ? 20 : 10;
            score += mtnWindow ? -100 : 0;
            score += rm.lineType === 'CSP' ? (order.thickness <= 4 ? 15 : 0) : 0;
            score += rm.lineType === 'heavy' ? (order.thickness >= 15 ? 15 : 0) : 0;
            score += (order.dueDate - Date.now()) < 86400000 ? 10 : 0;

            candidates.push({ mill: rm, score, conflict: !!mtnWindow });
        }

        if (candidates.length === 0) {
            return { success: false, reason: 'No suitable production line', alternatives: mills.map(m => m.name) };
        }

        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];

        order.assignedLine = best.mill.id;
        order.status = 'assigned';
        order.assignedAt = Date.now();
        order.plannedCompletion = Date.now() + order.quantity * 120000;

        return {
            success: true,
            orderId: order.id,
            assignedLine: best.mill.name,
            score: best.score,
            conflict: best.conflict,
            alternatives: candidates.slice(1).map(c => ({
                line: c.mill.name,
                score: c.score,
                conflict: c.conflict
            }))
        };
    }

    rescheduleOnMaintenance(maintenanceId) {
        const state = this.simulator.state;
        const mtn = state.maintenanceSchedule.find(m => m.id === maintenanceId);
        if (!mtn) return { success: false, error: 'Maintenance not found' };

        const affected = state.orders.filter(o => {
            if (!o.assignedLine) return false;
            const rm = state.rollingMills.find(r => r.name === mtn.equipment);
            return rm && o.assignedLine === rm.id && o.status !== 'completed';
        });

        const result = [];
        for (const order of affected) {
            order.assignedLine = null;
            order.status = 'pending';
            const reassigned = this.matchOrderToLine(order);
            result.push({ order: order.id, reassigned });
        }

        return { success: true, rescheduledCount: result.length, details: result };
    }

    getTimeline() {
        const state = this.simulator.state;
        const now = Date.now();
        const horizon = now + 86400000 * 3;
        const events = [];

        state.maintenanceSchedule.forEach(m => {
            if (m.endTime > now && m.startTime < horizon) {
                events.push({
                    id: m.id,
                    type: 'maintenance',
                    title: m.equipment + ' ' + m.type,
                    startTime: m.startTime,
                    endTime: m.endTime,
                    equipment: m.equipment
                });
            }
        });

        state.orders.forEach(o => {
            if (o.assignedLine && o.status === 'assigned') {
                const rm = state.rollingMills.find(r => r.id === o.assignedLine);
                events.push({
                    id: o.id,
                    type: 'order',
                    title: o.material + ' ' + o.thickness + 'mm x' + o.quantity,
                    startTime: o.assignedAt,
                    endTime: o.plannedCompletion,
                    equipment: rm ? rm.name : 'Unknown',
                    orderId: o.id
                });
            }
        });

        events.sort((a, b) => a.startTime - b.startTime);
        return { now, horizon, events };
    }
}

module.exports = ProductionScheduler;
