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
        console.log('FileReader._readBlob called, blob.size =', blob.size);
        this.readyState = 1;
        this.onloadstart && this.onloadstart({ type: 'loadstart' });
        try {
            const buf = await blob.arrayBuffer();
            console.log('FileReader got arrayBuffer, byteLength =', buf.byteLength);
            this.readyState = 2;
            if (asDataURL) {
                const base64 = Buffer.from(buf).toString('base64');
                this.result = 'data:application/octet-stream;base64,' + base64;
            } else {
                this.result = buf;
            }
            this.onload && this.onload({ type: 'load' });
        } catch (e) {
            console.error('FileReader error:', e);
            this.readyState = 2;
            this.error = e;
            this.onerror && this.onerror({ type: 'error' });
        } finally {
            console.log('FileReader calling onloadend, result type:', typeof this.result);
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

console.log('Testing simple scene export...');

const scene = new THREE.Scene();
const geo = new THREE.BoxGeometry(1, 1, 1);
const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const mesh = new THREE.Mesh(geo, mat);
mesh.position.y = 0.5;
scene.add(mesh);

const exporter = new GLTFExporter();
console.log('Calling exporter.parse...');

const timeout = setTimeout(() => {
    console.error('TIMEOUT: parse callback not called within 10s');
    process.exit(1);
}, 10000);

exporter.parse(scene, (result) => {
    clearTimeout(timeout);
    console.log('SUCCESS! Got result, type:', typeof result, 'isArrayBuffer:', result instanceof ArrayBuffer);
    if (result instanceof ArrayBuffer) {
        const outPath = path.join(__dirname, '..', '..', 'public', 'models', 'test.glb');
        fs.writeFileSync(outPath, Buffer.from(result));
        console.log('Wrote to', outPath, 'size =', Buffer.from(result).length);
    }
    process.exit(0);
}, (err) => {
    clearTimeout(timeout);
    console.error('ERROR in parse:', err);
    process.exit(1);
}, { binary: true });
