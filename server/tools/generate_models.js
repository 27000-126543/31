const { Blob } = require('buffer');
global.Blob = Blob;
global.FileReader = class {
    constructor() {
        this.readyState = 0;
        this.result = null;
        this.error = null;
        this.onloadstart = null;
        this.onprogress = null;
        this.onload = null;
        this.onabort = null;
        this.onerror = null;
        this.onloadend = null;
    }
    async _readBlob(blob, asDataURL) {
        this.readyState = 1;
        this.onloadstart && this.onloadend({ type: 'loadstart' });
        try {
            const buf = await blob.arrayBuffer();
            this.readyState = 2;
            if (asDataURL) {
                const base64 = Buffer.from(buf).toString('base64');
                this.result = 'data:application/octet-stream;base64,' + base64;
            } else {
                this.result = buf;
            }
            this.onload && this.onload({ type: 'load' });
        } catch (e) {
            this.readyState = 2;
            this.error = e;
            this.onerror && this.onerror({ type: 'error' });
        } finally {
            this.onloadend && this.onloadend({ type: 'loadend' });
        }
    }
    readAsArrayBuffer(blob) {
        this._readBlob(blob, false);
    }
    readAsDataURL(blob) {
        this._readBlob(blob, true);
    }
};
const THREE = require('three');
const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter.js');
const fs = require('fs');
const path = require('path');

const COLOR_STEEL = 0x6b7280;
const COLOR_DARK = 0x374151;
const COLOR_RUST = 0x991b1b;
const COLOR_SAFETY = 0xf59e0b;
const COLOR_COOL = 0x3b82f6;

const matSteel = new THREE.MeshStandardMaterial({ color: COLOR_STEEL, metalness: 0.8, roughness: 0.4 });
const matDark = new THREE.MeshStandardMaterial({ color: COLOR_DARK, metalness: 0.7, roughness: 0.5 });
const matRust = new THREE.MeshStandardMaterial({ color: COLOR_RUST, metalness: 0.5, roughness: 0.7 });
const matSafety = new THREE.MeshStandardMaterial({ color: COLOR_SAFETY, metalness: 0.4, roughness: 0.6 });
const matCool = new THREE.MeshStandardMaterial({ color: COLOR_COOL, metalness: 0.6, roughness: 0.3, emissive: COLOR_COOL, emissiveIntensity: 0.1 });
const matGlow = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 0.8, metalness: 0.3, roughness: 0.4 });
const matHelmet = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.3, roughness: 0.5 });
const matSkin = new THREE.MeshStandardMaterial({ color: 0xfcd5b5, metalness: 0.0, roughness: 0.8 });
const matCloth = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.1, roughness: 0.9 });
const matTransparent = new THREE.MeshStandardMaterial({ color: 0x60a5fa, metalness: 0.2, roughness: 0.3, transparent: true, opacity: 0.35 });

const MODELS_DIR_PUBLIC = path.join(__dirname, '..', '..', 'public', 'models');
const MODELS_DIR_ROOT = path.join(__dirname, '..', '..', 'models');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function writeToBoth(filename, data, isBinary) {
    ensureDir(MODELS_DIR_PUBLIC);
    ensureDir(MODELS_DIR_ROOT);
    const buf = isBinary ? (data instanceof Buffer ? data : Buffer.from(data)) : Buffer.from(data, 'utf-8');
    fs.writeFileSync(path.join(MODELS_DIR_PUBLIC, filename), buf);
    fs.writeFileSync(path.join(MODELS_DIR_ROOT, filename), buf);
}

function exportGLB(scene, filename) {
    return new Promise((resolve, reject) => {
        const exporter = new GLTFExporter();
        exporter.parse(scene, (result) => {
            try {
                const buf = result instanceof ArrayBuffer ? Buffer.from(result) : Buffer.from(JSON.stringify(result));
                writeToBoth(filename, buf, true);
                console.log(`Generated: ${filename}`);
                resolve();
            } catch (e) {
                reject(e);
            }
        }, (error) => {
            reject(error);
        }, { binary: true });
    });
}

function exportJSON(scene, filename) {
    const json = scene.toJSON();
    const jsonStr = JSON.stringify(json);
    writeToBoth(filename, jsonStr, false);
    console.log(`Generated: ${filename}`);
}

function createMaterial(color) {
    return new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.4 });
}

async function generateAll() {
    console.log('Starting model generation...');
    try {
        const models = [
            { fn: createBlastFurnace, name: 'blast_furnace' },
            { fn: createConverter, name: 'converter' },
            { fn: createRollingMill, name: 'rolling_mill' },
            { fn: createCaster, name: 'caster' },
            { fn: createStack, name: 'stack' },
            { fn: createReclaimer, name: 'reclaimer' },
            { fn: createWorker, name: 'worker' }
        ];
        for (const m of models) {
            const scene = m.fn();
            await exportGLB(scene, m.name + '.glb');
            exportJSON(scene, m.name + '.json');
        }
        console.log('All 7 models generated successfully!');
    } catch (err) {
        console.error('Error generating models:', err);
        throw err;
    }
}

function createBlastFurnace() {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.userData = { type: 'blastFurnace' };

    const baseGeo = new THREE.CylinderGeometry(6, 7, 1.5, 48);
    const base = new THREE.Mesh(baseGeo, matDark);
    base.position.y = 0.75;
    group.add(base);

    const hearthGeo = new THREE.CylinderGeometry(4.5, 5, 3, 48);
    const hearth = new THREE.Mesh(hearthGeo, matRust);
    hearth.position.y = 1.5 + 1.5;
    group.add(hearth);

    const bellyGeo = new THREE.CylinderGeometry(4.5, 3.5, 2, 48);
    const belly = new THREE.Mesh(bellyGeo, matRust);
    belly.position.y = 4.5 + 1;
    group.add(belly);

    const shaftGeo = new THREE.CylinderGeometry(3.5, 2.8, 6, 48);
    const shaft = new THREE.Mesh(shaftGeo, matSteel);
    shaft.position.y = 6.5 + 3;
    group.add(shaft);

    const topConeGeo = new THREE.CylinderGeometry(2.8, 1.2, 2.5, 48);
    const topCone = new THREE.Mesh(topConeGeo, matSteel);
    topCone.position.y = 12.5 + 1.25;
    group.add(topCone);

    for (let i = 0; i < 4; i++) {
        const ringGeo = new THREE.TorusGeometry(3.5 - i * 0.2, 0.08, 12, 48);
        const ring = new THREE.Mesh(ringGeo, matCool);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 5 + i * 1.5;
        group.add(ring);
    }

    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const tuyereGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.2, 16);
        const tuyere = new THREE.Mesh(tuyereGeo, matDark);
        tuyere.rotation.z = Math.PI / 2;
        tuyere.position.set(Math.cos(angle) * 5.2, 3.5, Math.sin(angle) * 5.2);
        tuyere.rotation.y = -angle;
        group.add(tuyere);
    }

    const stackGeo = new THREE.CylinderGeometry(0.8, 1.0, 3.5, 24);
    const stack = new THREE.Mesh(stackGeo, matDark);
    stack.position.y = 16.25;
    group.add(stack);

    const platformGeo = new THREE.CylinderGeometry(8, 8, 0.3, 64);
    const platform = new THREE.Mesh(platformGeo, matSteel);
    platform.position.y = 8.5;
    group.add(platform);

    for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const pillarGeo = new THREE.CylinderGeometry(0.18, 0.18, 8, 12);
        const pillar = new THREE.Mesh(pillarGeo, matSteel);
        pillar.position.set(Math.cos(angle) * 7.2, 4.25, Math.sin(angle) * 7.2);
        group.add(pillar);
    }

    const railGeo = new THREE.TorusGeometry(7.5, 0.1, 8, 64);
    const rail = new THREE.Mesh(railGeo, matSafety);
    rail.rotation.x = Math.PI / 2;
    rail.position.y = 9.2;
    group.add(rail);

    const rail2Geo = new THREE.TorusGeometry(7.5, 0.1, 8, 64);
    const rail2 = new THREE.Mesh(rail2Geo, matSafety);
    rail2.rotation.x = Math.PI / 2;
    rail2.position.y = 9.7;
    group.add(rail2);

    scene.add(group);
    return scene;
}

function createConverter() {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.userData = { type: 'converter' };

    const baseGeo = new THREE.BoxGeometry(14, 1, 10);
    const base = new THREE.Mesh(baseGeo, matDark);
    base.position.y = 0.5;
    group.add(base);

    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 2; j++) {
            const pillarGeo = new THREE.CylinderGeometry(0.25, 0.25, 5, 12);
            const pillar = new THREE.Mesh(pillarGeo, matSteel);
            pillar.position.set(-6 + i * 2.4, 3.5, -3.5 + j * 7);
            group.add(pillar);
        }
    }

    const upperGeo = new THREE.BoxGeometry(14, 0.4, 10);
    const upper = new THREE.Mesh(upperGeo, matSteel);
    upper.position.y = 6.2;
    group.add(upper);

    const trunnionLGeo = new THREE.CylinderGeometry(0.6, 0.6, 2, 16);
    const trunnionL = new THREE.Mesh(trunnionLGeo, matDark);
    trunnionL.rotation.z = Math.PI / 2;
    trunnionL.position.set(-7.5, 7.5, 0);
    group.add(trunnionL);

    const trunnionRGeo = new THREE.CylinderGeometry(0.6, 0.6, 2, 16);
    const trunnionR = new THREE.Mesh(trunnionRGeo, matDark);
    trunnionR.rotation.z = Math.PI / 2;
    trunnionR.position.set(7.5, 7.5, 0);
    group.add(trunnionR);

    const shellGeo = new THREE.CylinderGeometry(3.2, 2.8, 5, 32);
    const shell = new THREE.Mesh(shellGeo, matRust);
    shell.position.y = 8.5;
    group.add(shell);

    const lowerSphereGeo = new THREE.SphereGeometry(3.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const lowerSphere = new THREE.Mesh(lowerSphereGeo, matRust);
    lowerSphere.position.y = 6;
    group.add(lowerSphere);

    const mouthGeo = new THREE.TorusGeometry(2.0, 0.25, 12, 32);
    const mouth = new THREE.Mesh(mouthGeo, matDark);
    mouth.rotation.x = Math.PI / 2;
    mouth.position.y = 11.2;
    group.add(mouth);

    const ringGeo = new THREE.TorusGeometry(3.8, 0.3, 12, 48);
    const ring = new THREE.Mesh(ringGeo, matSteel);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 7.5;
    group.add(ring);

    const hoodGeo = new THREE.CylinderGeometry(2.8, 1.2, 3, 32);
    const hood = new THREE.Mesh(hoodGeo, matSteel);
    hood.position.y = 13.8;
    group.add(hood);

    const flue1Geo = new THREE.CylinderGeometry(1.0, 1.0, 4, 20);
    const flue1 = new THREE.Mesh(flue1Geo, matDark);
    flue1.position.set(2.5, 16.8, 0);
    flue1.rotation.z = Math.PI / 4;
    group.add(flue1);

    const flue2Geo = new THREE.CylinderGeometry(1.0, 1.0, 2.5, 20);
    const flue2 = new THREE.Mesh(flue2Geo, matDark);
    flue2.position.set(4.5, 18.5, 0);
    group.add(flue2);

    const flameGeo = new THREE.ConeGeometry(1.2, 3, 16);
    const flame = new THREE.Mesh(flameGeo, matGlow);
    flame.position.y = 17;
    group.add(flame);

    const flame2Geo = new THREE.ConeGeometry(0.6, 2, 16);
    const flame2 = new THREE.Mesh(flame2Geo, matGlow);
    flame2.position.y = 18.5;
    group.add(flame2);

    scene.add(group);
    return scene;
}

function createRollingMill() {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.userData = { type: 'rollingMill' };

    for (let i = 0; i < 5; i++) {
        const shape = new THREE.Shape();
        const w = 1.2, h = 6, t = 0.35;
        shape.moveTo(-w / 2, -h / 2);
        shape.lineTo(w / 2, -h / 2);
        shape.lineTo(w / 2, -h / 2 + t);
        shape.lineTo(t, -h / 2 + t);
        shape.lineTo(t, h / 2 - t);
        shape.lineTo(w / 2, h / 2 - t);
        shape.lineTo(w / 2, h / 2);
        shape.lineTo(-w / 2, h / 2);
        shape.lineTo(-w / 2, h / 2 - t);
        shape.lineTo(-t, h / 2 - t);
        shape.lineTo(-t, -h / 2 + t);
        shape.lineTo(-w / 2, -h / 2 + t);
        shape.lineTo(-w / 2, -h / 2);
        const extrudeSettings = { depth: 0.5, bevelEnabled: false };
        const housingGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const housing = new THREE.Mesh(housingGeo, matSteel);
        housing.rotation.y = Math.PI / 2;
        housing.position.set(-4 + i * 2, 4, 0);
        group.add(housing);
    }

    const workRollTopGeo = new THREE.CylinderGeometry(0.5, 0.5, 10, 32);
    const workRollTop = new THREE.Mesh(workRollTopGeo, matDark);
    workRollTop.rotation.z = Math.PI / 2;
    workRollTop.position.y = 4.8;
    group.add(workRollTop);

    const workRollBotGeo = new THREE.CylinderGeometry(0.5, 0.5, 10, 32);
    const workRollBot = new THREE.Mesh(workRollBotGeo, matDark);
    workRollBot.rotation.z = Math.PI / 2;
    workRollBot.position.y = 3.2;
    group.add(workRollBot);

    for (let i = 0; i < 2; i++) {
        const screwGeo = new THREE.CylinderGeometry(0.3, 0.3, 2, 16);
        const screw = new THREE.Mesh(screwGeo, matSteel);
        screw.position.set(-4 + i * 8, 7, 0);
        group.add(screw);
    }

    const coilerGeo = new THREE.BoxGeometry(4, 4, 5);
    const coiler = new THREE.Mesh(coilerGeo, matDark);
    coiler.position.set(10, 2.5, 0);
    group.add(coiler);

    for (let i = 0; i < 8; i++) {
        const rollGeo = new THREE.CylinderGeometry(0.2, 0.2, 5, 16);
        const roll = new THREE.Mesh(rollGeo, matSteel);
        roll.rotation.z = Math.PI / 2;
        roll.position.set(4 + i * 1.2, 1, 0);
        group.add(roll);
    }

    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 2; j++) {
            const colGeo = new THREE.CylinderGeometry(0.18, 0.18, 4, 12);
            const col = new THREE.Mesh(colGeo, matSteel);
            col.position.set(2 + i * 1.8, 2, -2.2 + j * 4.4);
            group.add(col);
        }
    }

    const beamGeo = new THREE.BoxGeometry(18, 0.6, 1);
    const beam = new THREE.Mesh(beamGeo, matSteel);
    beam.position.y = 10;
    group.add(beam);

    const railTGeo = new THREE.BoxGeometry(18, 0.15, 0.25);
    const railT = new THREE.Mesh(railTGeo, matSafety);
    railT.position.y = 10.4;
    group.add(railT);

    scene.add(group);
    return scene;
}

function createCaster() {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.userData = { type: 'caster' };

    const tundishGeo = new THREE.CylinderGeometry(2.2, 1.5, 1.8, 8);
    const tundish = new THREE.Mesh(tundishGeo, matRust);
    tundish.position.y = 11.5;
    group.add(tundish);

    const moldGeo = new THREE.BoxGeometry(1.2, 2.2, 1.2);
    const mold = new THREE.Mesh(moldGeo, matCool);
    mold.position.y = 9.5;
    group.add(mold);

    const moldSlotGeo = new THREE.BoxGeometry(0.5, 2.4, 0.5);
    const moldSlot = new THREE.Mesh(moldSlotGeo, matDark);
    moldSlot.position.y = 9.5;
    group.add(moldSlot);

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 2; j++) {
            const rollGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.8, 12);
            const roll = new THREE.Mesh(rollGeo, matSteel);
            roll.rotation.z = Math.PI / 2;
            roll.position.set(-0.6 + j * 1.2, 8 - i * 0.9, 0);
            group.add(roll);
        }
    }

    const sprayGeo = new THREE.BoxGeometry(3, 5, 2.5);
    const spray = new THREE.Mesh(sprayGeo, matDark);
    spray.position.y = 4.5;
    group.add(spray);

    const sprayShellGeo = new THREE.BoxGeometry(3.1, 5.1, 2.6);
    const sprayShell = new THREE.Mesh(sprayShellGeo, matTransparent);
    sprayShell.position.y = 4.5;
    group.add(sprayShell);

    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 2; j++) {
            const supGeo = new THREE.CylinderGeometry(0.2, 0.2, 3, 12);
            const sup = new THREE.Mesh(supGeo, matSteel);
            sup.position.set(-2.5 + i * 1.25, 1.5, -1.8 + j * 3.6);
            group.add(sup);
        }
    }

    const slabGeo = new THREE.BoxGeometry(0.6, 10, 0.6);
    const slab = new THREE.Mesh(slabGeo, matGlow);
    slab.position.y = 4;
    group.add(slab);

    scene.add(group);
    return scene;
}

function createStack() {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.userData = { type: 'stack' };

    const baseGeo = new THREE.CylinderGeometry(2.5, 3, 1, 32);
    const base = new THREE.Mesh(baseGeo, matDark);
    base.position.y = 0.5;
    group.add(base);

    const towerGeo = new THREE.CylinderGeometry(1.2, 1.8, 15, 32);
    const tower = new THREE.Mesh(towerGeo, matRust);
    tower.position.y = 8.5;
    group.add(tower);

    for (let i = 0; i < 7; i++) {
        const r = 1.8 - i * 0.09;
        const ringGeo = new THREE.TorusGeometry(r, 0.12, 10, 32);
        const ring = new THREE.Mesh(ringGeo, matSteel);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 2.5 + i * 2;
        group.add(ring);
    }

    const topGeo = new THREE.CylinderGeometry(1.4, 1.2, 0.4, 32);
    const top = new THREE.Mesh(topGeo, matDark);
    top.position.y = 16.2;
    group.add(top);

    const warn1Geo = new THREE.TorusGeometry(1.3, 0.15, 10, 32);
    const warn1 = new THREE.Mesh(warn1Geo, new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 }));
    warn1.rotation.x = Math.PI / 2;
    warn1.position.y = 14.8;
    group.add(warn1);

    const warn2Geo = new THREE.TorusGeometry(1.35, 0.15, 10, 32);
    const warn2 = new THREE.Mesh(warn2Geo, new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.8 }));
    warn2.rotation.x = Math.PI / 2;
    warn2.position.y = 15.5;
    group.add(warn2);

    scene.add(group);
    return scene;
}

function createReclaimer() {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.userData = { type: 'reclaimer' };

    for (let i = 0; i < 2; i++) {
        const legGeo = new THREE.BoxGeometry(0.6, 5, 0.6);
        const leg = new THREE.Mesh(legGeo, matSteel);
        leg.position.set(-3 + i * 6, 2.5, 0);
        group.add(leg);
    }

    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const legGeo2 = new THREE.BoxGeometry(0.5, 5, 0.5);
            const leg2 = new THREE.Mesh(legGeo2, matSteel);
            leg2.position.set(-3 + i * 6, 2.5, -3 + j * 6);
            if (j !== 0) group.add(leg2);
        }
    }

    const gantryTopGeo = new THREE.BoxGeometry(7, 0.5, 4);
    const gantryTop = new THREE.Mesh(gantryTopGeo, matSteel);
    gantryTop.position.y = 5.5;
    group.add(gantryTop);

    for (let i = 0; i < 2; i++) {
        const trackGeo = new THREE.BoxGeometry(7, 0.25, 0.3);
        const track = new THREE.Mesh(trackGeo, matDark);
        track.position.set(0, 0.15, -1.5 + i * 3);
        group.add(track);
    }

    const armGeo = new THREE.BoxGeometry(1.2, 0.6, 10);
    const arm = new THREE.Mesh(armGeo, matSteel);
    arm.position.set(0, 6.5, 3);
    arm.rotation.x = -0.25;
    group.add(arm);

    const wheelGeo = new THREE.CylinderGeometry(2, 2, 1.2, 32);
    const wheel = new THREE.Mesh(wheelGeo, matDark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, 6, 8);
    group.add(wheel);

    for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const toothGeo = new THREE.BoxGeometry(0.5, 0.4, 0.3);
        const tooth = new THREE.Mesh(toothGeo, matSteel);
        const x = Math.cos(angle) * 2.15;
        const z = Math.sin(angle) * 2.15;
        tooth.position.set(x, 6, 8 + z);
        tooth.rotation.y = angle;
        group.add(tooth);
    }

    const cabGeo = new THREE.BoxGeometry(1.5, 1.5, 2);
    const cab = new THREE.Mesh(cabGeo, matSafety);
    cab.position.set(2.5, 6.2, 0);
    group.add(cab);

    const cabWinGeo = new THREE.BoxGeometry(1.55, 0.9, 1.6);
    const cabWin = new THREE.Mesh(cabWinGeo, matTransparent);
    cabWin.position.set(2.5, 6.5, 0.15);
    group.add(cabWin);

    scene.add(group);
    return scene;
}

function createWorker() {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.userData = { type: 'worker' };

    for (let i = 0; i < 2; i++) {
        const legGeo = new THREE.CylinderGeometry(0.25, 0.28, 1.8, 12);
        const leg = new THREE.Mesh(legGeo, matDark);
        leg.position.set(-0.22 + i * 0.44, 0.9, 0);
        group.add(leg);
    }

    for (let i = 0; i < 2; i++) {
        const footGeo = new THREE.BoxGeometry(0.35, 0.15, 0.55);
        const foot = new THREE.Mesh(footGeo, matDark);
        foot.position.set(-0.22 + i * 0.44, 0.075, 0.05);
        group.add(foot);
    }

    const bodyMat = matCloth;
    const bodyGeo = new THREE.CapsuleGeometry(0.45, 1.0, 8, 16);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 2.8;
    group.add(body);

    const beltGeo = new THREE.TorusGeometry(0.48, 0.06, 8, 24);
    const belt = new THREE.Mesh(beltGeo, matSafety);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 2.1;
    group.add(belt);

    for (let i = 0; i < 2; i++) {
        const armGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.3, 10);
        const arm = new THREE.Mesh(armGeo, bodyMat);
        arm.position.set(-0.65 + i * 1.3, 3.1, 0);
        group.add(arm);
    }

    const neckGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.2, 10);
    const neck = new THREE.Mesh(neckGeo, matSkin);
    neck.position.y = 3.75;
    group.add(neck);

    const headGeo = new THREE.SphereGeometry(0.35, 20, 16);
    const head = new THREE.Mesh(headGeo, matSkin);
    head.position.y = 4.25;
    group.add(head);

    const helmetGeo = new THREE.SphereGeometry(0.38, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const helmet = new THREE.Mesh(helmetGeo, matHelmet);
    helmet.position.y = 4.3;
    group.add(helmet);

    const brimGeo = new THREE.TorusGeometry(0.4, 0.04, 6, 24);
    const brim = new THREE.Mesh(brimGeo, matHelmet);
    brim.rotation.x = Math.PI / 2;
    brim.position.y = 4.3;
    group.add(brim);

    scene.add(group);
    return scene;
}

async function generateAll() {
    console.log('Starting model generation...');
    try {
        await exportGLB(createBlastFurnace(), 'blast_furnace.glb');
        await exportGLB(createConverter(), 'converter.glb');
        await exportGLB(createRollingMill(), 'rolling_mill.glb');
        await exportGLB(createCaster(), 'caster.glb');
        await exportGLB(createStack(), 'stack.glb');
        await exportGLB(createReclaimer(), 'reclaimer.glb');
        await exportGLB(createWorker(), 'worker.glb');
        console.log('All 7 models generated successfully!');
    } catch (err) {
        console.error('Error generating models:', err);
        throw err;
    }
}

if (require.main === module) {
    generateAll().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { generateAll };
