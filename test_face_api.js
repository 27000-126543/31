const fs = require('fs');
const path = require('path');
const http = require('http');

const dbPath = path.join(__dirname, 'server', 'data', 'face_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

function httpPost(path, data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

(async () => {
    const testUser = db[0];
    console.log('=== Test 1: Verify with correct faceVector for', testUser.name, '===');
    const result1 = await httpPost('/api/face/verify', { faceVector: testUser.faceVector, role: testUser.role });
    console.log(JSON.stringify(result1, null, 2));

    console.log('\n=== Test 2: Verify with correct faceVector but wrong role ===');
    const result2 = await httpPost('/api/face/verify', { faceVector: testUser.faceVector, role: 'manager' });
    console.log(JSON.stringify(result2, null, 2));

    console.log('\n=== Test 3: Verify with random faceVector ===');
    const randomVec = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
    const norm = Math.sqrt(randomVec.reduce((s, v) => s + v * v, 0));
    const normalized = randomVec.map(v => v / norm);
    const result3 = await httpPost('/api/face/verify', { faceVector: normalized });
    console.log(JSON.stringify(result3, null, 2));
})();
