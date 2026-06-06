const fs = require('fs');
const path = require('path');

const THRESHOLD = 0.75;
const DB_PATH = path.join(__dirname, '..', 'data', 'face_db.json');

function loadFaceDB() {
    try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function cosineSimilarity(a, b) {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(1, sim));
}

function verifyFace(faceVector, role) {
    const startTime = Date.now();
    const users = loadFaceDB();
    const candidates = role ? users.filter(u => u.role === role) : users;

    let bestMatch = null;
    let bestSimilarity = 0;

    for (const user of candidates) {
        const sim = cosineSimilarity(user.faceVector, faceVector);
        if (sim > bestSimilarity) {
            bestSimilarity = sim;
            bestMatch = user;
        }
    }

    const matchTime = Date.now() - startTime;
    const success = bestMatch && bestSimilarity >= THRESHOLD;
    const confidence = success
        ? Math.max(0, Math.min(1, (bestSimilarity - THRESHOLD) / (1 - THRESHOLD)))
        : 0;

    return {
        success,
        role: bestMatch ? bestMatch.role : null,
        name: bestMatch ? bestMatch.name : null,
        userId: bestMatch ? bestMatch.id : null,
        similarity: parseFloat(bestSimilarity.toFixed(6)),
        confidence: parseFloat(confidence.toFixed(6)),
        threshold: THRESHOLD,
        matchTime
    };
}

function getUsers() {
    const users = loadFaceDB();
    return users.map(({ id, role, name, registeredAt }) => ({
        id, role, name, registeredAt
    }));
}

module.exports = function(app, state, wss) {
    app.post('/api/face/verify', (req, res) => {
        const { faceVector, role } = req.body || {};
        if (!Array.isArray(faceVector) || faceVector.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid faceVector' });
        }
        const result = verifyFace(faceVector, role);
        res.json(result);
    });

    app.get('/api/face/users', (req, res) => {
        res.json(getUsers());
    });
};

module.exports.verifyFace = verifyFace;
module.exports.getUsers = getUsers;
