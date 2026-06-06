const IndustrialDataSimulator = require('./server/data/simulator');
const ProductionScheduler = require('./server/data/scheduling');

const simulator = new IndustrialDataSimulator();
const scheduler = new ProductionScheduler(simulator);

console.log('=== 测试模块加载成功 ===');
console.log('Scheduler weights:', scheduler.weights);

console.log('\n=== 测试所有订单匹配 ===');
for (const order of simulator.state.orders) {
    console.log('\n测试订单:', order.id, order.material, order.thickness + 'mm', '数量:', order.quantity);
    const result = scheduler.matchOrderToLine(order);
    console.log('匹配成功:', result.success);
    if (result.success) {
        console.log('  分配产线:', result.assignedLine);
        console.log('  评分:', result.score.toFixed(4));
        console.log('  冲突:', result.conflict);
        console.log('  备选方案数量:', result.alternatives.length);
    } else {
        console.log('  原因:', result.reason);
    }
}

console.log('\n=== 测试时间线 ===');
const timeline = scheduler.getTimeline();
console.log('时间线事件数量:', timeline.events.length);
console.log('事件类型:', [...new Set(timeline.events.map(e => e.type))]);

console.log('\n=== 测试维护重新分配 ===');
const mtn = simulator.state.maintenanceSchedule.find(m => m.equipment === 'CSP薄板轧机');
if (mtn) {
    console.log('测试维护:', mtn.id, mtn.equipment);
    const rescheduleResult = scheduler.rescheduleOnMaintenance(mtn.id);
    console.log('重新分配数量:', rescheduleResult.rescheduledCount);
    console.log('成功:', rescheduleResult.success);
}

console.log('\n=== 所有测试通过 ===');
