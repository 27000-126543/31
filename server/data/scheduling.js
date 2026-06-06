class ProductionScheduler {
    constructor(simulator) {
        this.simulator = simulator;
        this.weights = [0.45, 0.20, 0.20, 0.15];
        this.lineCapacity = {
            rm_csp: { hourlyOutput: 60, dailyCapacity: 480 },
            rm_heavy: { hourlyOutput: 25, dailyCapacity: 200 }
        };
        this.materialMatrix = {
            DC04: { CSP: 1.0, heavy: 0.3 },
            Q345B: { CSP: 0.3, heavy: 1.0 },
            SPHC: { CSP: 1.0, heavy: 0.3 }
        };
    }

    _getLineCapacity(rmId) {
        return this.lineCapacity[rmId] || { hourlyOutput: 40, dailyCapacity: 320 };
    }

    _estimateWorkHours(order, rmId) {
        const cap = this._getLineCapacity(rmId);
        return (order.quantity / cap.hourlyOutput) * 8;
    }

    _getOrderCreatedAt(order) {
        return order.createdAt || order.assignedAt || (Date.now() - 86400000 * 2);
    }

    _calcF1(order, rm) {
        const [minT, maxT] = rm.thicknessRange;
        const t = order.thickness;
        let thicknessScore = 0;
        if (t >= minT && t <= maxT) {
            const mid = (minT + maxT) / 2;
            const halfRange = (maxT - minT) / 2;
            thicknessScore = 1 - Math.abs(t - mid) / halfRange;
            thicknessScore = Math.max(0, Math.min(1, thicknessScore));
        }
        const materialMap = this.materialMatrix[order.material];
        let materialScore = 0.3;
        if (materialMap && materialMap[rm.lineType] !== undefined) {
            materialScore = materialMap[rm.lineType];
        }
        return 0.6 * thicknessScore + 0.4 * materialScore;
    }

    _calcUtilization(rm, excludeOrderId) {
        const cap = this._getLineCapacity(rm.id);
        const state = this.simulator.state;
        let totalHours = 0;
        for (const o of state.orders) {
            if (!o.assignedLine || o.assignedLine !== rm.id) continue;
            if (excludeOrderId && o.id === excludeOrderId) continue;
            if (o.status === 'completed') continue;
            totalHours += this._estimateWorkHours(o, rm.id);
        }
        return totalHours / cap.dailyCapacity;
    }

    _calcF2(order, rm) {
        const util = this._calcUtilization(rm, order.id);
        const f2 = 1 - Math.abs(util - 0.75) / 0.75;
        return Math.max(0, Math.min(1, f2));
    }

    _getOrderTimeWindow(order, rm) {
        const start = order.assignedAt || Date.now();
        const workHours = this._estimateWorkHours(order, rm.id);
        const end = start + workHours * 3600000;
        return { start, end };
    }

    _calcF3(order, rm) {
        const state = this.simulator.state;
        const { start, end } = this._getOrderTimeWindow(order, rm);
        let minF3 = 1;
        for (const m of state.maintenanceSchedule) {
            if (m.equipment !== rm.name) continue;
            const mStart = m.startTime;
            const mEnd = m.endTime;
            const overlap = !(end < mStart || mEnd < start);
            if (!overlap) continue;
            const fullyContained = (start >= mStart && end <= mEnd);
            if (fullyContained) {
                minF3 = Math.min(minF3, 0);
            } else {
                minF3 = Math.min(minF3, 0.3);
            }
        }
        return minF3;
    }

    _calcF4(order) {
        const now = Date.now();
        const dueDate = order.dueDate;
        const createdAt = this._getOrderCreatedAt(order);
        if (dueDate <= now) return 1;
        if (dueDate <= createdAt) return 1;
        const f4 = 1 - (dueDate - now) / (dueDate - createdAt);
        return Math.max(0, Math.min(1, f4));
    }

    _calcScore(order, rm) {
        const f1 = this._calcF1(order, rm);
        const f2 = this._calcF2(order, rm);
        const f3 = this._calcF3(order, rm);
        const f4 = this._calcF4(order);
        const [w1, w2, w3, w4] = this.weights;
        return {
            total: w1 * f1 + w2 * f2 + w3 * f3 + w4 * f4,
            f1, f2, f3, f4
        };
    }

    matchOrderToLine(order) {
        const state = this.simulator.state;
        const mills = state.rollingMills;
        const candidates = [];

        for (const rm of mills) {
            const scores = this._calcScore(order, rm);
            const hasConflict = scores.f3 < 1;
            candidates.push({
                mill: rm,
                score: scores.total,
                scores,
                conflict: hasConflict
            });
        }

        if (candidates.length === 0) {
            return { success: false, reason: '无合适产线', alternatives: mills.map(m => m.name) };
        }

        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];

        if (best.score < 0.5) {
            return { success: false, reason: '无合适产线', alternatives: mills.map(m => m.name) };
        }

        order.assignedLine = best.mill.id;
        order.status = 'assigned';
        order.assignedAt = Date.now();
        const workHours = this._estimateWorkHours(order, best.mill.id);
        order.plannedCompletion = order.assignedAt + workHours * 3600000;

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

        const rm = state.rollingMills.find(r => r.name === mtn.equipment);
        if (!rm) return { success: true, rescheduledCount: 0, details: [] };

        const affected = state.orders.filter(o => {
            if (!o.assignedLine) return false;
            if (o.assignedLine !== rm.id) return false;
            if (o.status === 'completed') return false;
            const oStart = o.assignedAt || Date.now();
            const oEnd = o.plannedCompletion || oStart;
            return !(oEnd < mtn.startTime || mtn.endTime < oStart);
        });

        const result = [];
        for (const order of affected) {
            const prevLine = order.assignedLine;
            order.assignedLine = null;
            order.status = 'pending';
            const reassigned = this.matchOrderToLine(order);
            result.push({
                order: order.id,
                previousLine: prevLine,
                reassigned
            });
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
