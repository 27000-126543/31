const Sim = require('./server/data/simulator.js');
const sim = new Sim();
console.log('人员数: ' + sim.state.personnel.length);
console.log('人员列表: ' + sim.state.personnel.map(p => p.name).join(','));
for (let i = 0; i < 20; i++) {
  sim.tick();
  console.log('tick ' + (i+1) + ':');
  sim.state.personnel.forEach(p => {
    const v = Math.sqrt(p.vx*p.vx + p.vz*p.vz);
    console.log('  ' + p.name + ' |v|=' + v.toFixed(4) + ' vx=' + p.vx.toFixed(4) + ' vz=' + p.vz.toFixed(4));
  });
}
