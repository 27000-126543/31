const THREE = require('three');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const code = fs.readFileSync(path.join(__dirname, 'generate_models.js'), 'utf8');
const sandbox = {
    require: require,
    console: console,
    module: { exports: {} },
    exports: {},
    __dirname: __dirname,
    __filename: path.join(__dirname, 'generate_models.js'),
    Buffer: Buffer,
    global: global,
    process: process
};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const creators = {
    blast_furnace: sandbox.createBlastFurnace,
    converter: sandbox.createConverter,
    rolling_mill: sandbox.createRollingMill,
    caster: sandbox.createCaster,
    stack: sandbox.createStack,
    reclaimer: sandbox.createReclaimer,
    worker: sandbox.createWorker
};

const dirs = [
    path.join(__dirname, '..', '..', 'models'),
    path.join(__dirname, '..', '..', 'public', 'models')
];
dirs.forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

for (const [name, fn] of Object.entries(creators)) {
    if (!fn) { console.log('Missing creator:', name); continue; }
    const scene = fn();
    const json = scene.toJSON();
    const str = JSON.stringify(json);
    dirs.forEach(d => {
        fs.writeFileSync(path.join(d, name + '.json'), str);
    });
    console.log('Generated:', name + '.json', str.length, 'bytes');
}
console.log('All JSON models generated!');
