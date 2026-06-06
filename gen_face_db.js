function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function mulberry32(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function generateFaceVector(name) {
    const seed = hashString(name);
    const rand = mulberry32(seed);
    const vec = [];
    let norm = 0;
    for (let i = 0; i < 128; i++) {
        const v = (rand() * 2 - 1);
        vec.push(v);
        norm += v * v;
    }
    norm = Math.sqrt(norm);
    for (let i = 0; i < 128; i++) {
        vec[i] = parseFloat((vec[i] / norm).toFixed(8));
    }
    return vec;
}

const users = [
    { id: 'user_001', role: 'operator', name: 'operator张三', faceVector: generateFaceVector('operator张三'), registeredAt: new Date().toISOString() },
    { id: 'user_002', role: 'director', name: 'director李主任', faceVector: generateFaceVector('director李主任'), registeredAt: new Date().toISOString() },
    { id: 'user_003', role: 'manager', name: 'manager王厂长', faceVector: generateFaceVector('manager王厂长'), registeredAt: new Date().toISOString() }
];

const fs = require('fs');
const path = require('path');
const dir = '/Users/mac/Desktop/6.5项目/31/server/data';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'face_db.json'), JSON.stringify(users, null, 2));
console.log('face_db.json created');
