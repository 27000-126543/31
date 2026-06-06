const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const IndustrialDataSimulator = require('./data/simulator');
const ProductionScheduler = require('./data/scheduling');
const { generateDailyReport, getExportHistory } = require('./routes/report');
const faceRoutes = require('./routes/face');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const SIMULATOR_PUBLIC_DIRS = ['css', 'js', 'models', 'assets', 'public'];
const rootDir = path.resolve(__dirname, '..');

for (const dir of SIMULATOR_PUBLIC_DIRS) {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath)) {
        app.use('/' + dir, express.static(fullPath));
    }
}
const publicDir = path.join(rootDir, 'public');
if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
}
app.use('/', express.static(rootDir));

const state = {};
faceRoutes(app, state, wss);

const simulator = new IndustrialDataSimulator();
const scheduler = new ProductionScheduler(simulator);
const operationLogs = [];
const registeredFaces = {};

function broadcast(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

wss.on('connection', (ws) => {
    console.log('[WS] Client connected. Total:', wss.clients.size);

    ws.send(JSON.stringify({
        type: 'init',
        data: simulator.getSnapshot(),
        timeline: scheduler.getTimeline()
    }));

    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            handleMessage(ws, msg);
        } catch (e) {
            console.error('[WS] Parse error:', e.message);
        }
    });

    ws.on('close', () => {
        console.log('[WS] Client disconnected. Total:', wss.clients.size);
    });
});

function handleMessage(ws, msg) {
    switch (msg.type) {
        case 'getBlastFurnaceHistory': {
            const history = simulator.getBlastFurnaceHistory(msg.id);
            ws.send(JSON.stringify({ type: 'bf_history', id: msg.id, data: history }));
            break;
        }
        case 'matchOrder': {
            const order = simulator.state.orders.find(o => o.id === msg.orderId);
            if (!order) {
                ws.send(JSON.stringify({ type: 'match_result', success: false, error: 'Order not found' }));
            } else {
                const result = scheduler.matchOrderToLine(order);
                ws.send(JSON.stringify({ type: 'match_result', data: result }));
                broadcast({ type: 'order_update', orders: simulator.state.orders, timeline: scheduler.getTimeline() });
            }
            break;
        }
        case 'getTimeline': {
            ws.send(JSON.stringify({ type: 'timeline', data: scheduler.getTimeline() }));
            break;
        }
        case 'logOperation': {
            operationLogs.unshift({ ...msg.data, time: new Date().toISOString() });
            if (operationLogs.length > 500) operationLogs.pop();
            break;
        }
        case 'registerFace': {
            registeredFaces[msg.userId] = msg.faceData;
            ws.send(JSON.stringify({ type: 'face_registered', userId: msg.userId, success: true }));
            break;
        }
        case 'verifyFace': {
            const stored = registeredFaces[msg.userId];
            const similarity = stored ? Math.random() * 0.3 + 0.85 : Math.random() * 0.3;
            ws.send(JSON.stringify({
                type: 'face_verified',
                userId: msg.userId,
                success: similarity > 0.7,
                similarity: similarity
            }));
            break;
        }
        case 'face_verify': {
            const result = faceRoutes.verifyFace(msg.faceVector, msg.role);
            ws.send(JSON.stringify({
                type: 'face_verify_result',
                ...result
            }));
            break;
        }
        default:
            console.log('[WS] Unknown message type:', msg.type);
    }
}

app.get('/api/orders', (req, res) => {
    res.json(simulator.state.orders);
});

app.post('/api/orders/:id/match', (req, res) => {
    const order = simulator.state.orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const result = scheduler.matchOrderToLine(order);
    broadcast({ type: 'order_update', orders: simulator.state.orders, timeline: scheduler.getTimeline() });
    res.json(result);
});

app.get('/api/timeline', (req, res) => {
    res.json(scheduler.getTimeline());
});

app.get('/api/alarms', (req, res) => {
    res.json(simulator.state.alarms.slice(0, 100));
});

app.get('/api/report/daily', (req, res) => {
    const shift = req.query.shift || 'day';
    const user = req.query.user || 'System';
    const result = generateDailyReport(simulator.state, shift, user);
    if (!result.success) {
        return res.json({ success: false, errors: result.errors });
    }
    res.setHeader('Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="' + result.fileName + '"');
    res.send(result.buffer);
});

app.get('/api/report/history', (req, res) => {
    res.json(getExportHistory());
});

app.get('/api/logs', (req, res) => {
    res.json(operationLogs.slice(0, 200));
});

app.post('/api/logs', (req, res) => {
    operationLogs.unshift({ ...req.body, time: new Date().toISOString() });
    if (operationLogs.length > 500) operationLogs.pop();
    res.json({ success: true });
});

app.get('/api/snapshot', (req, res) => {
    res.json(simulator.getSnapshot());
});

app.get('/api/bf/:id/history', (req, res) => {
    const history = simulator.getBlastFurnaceHistory(req.params.id);
    res.json(history);
});

const TICK_INTERVAL = 2500;
setInterval(() => {
    const snapshot = simulator.tick();
    broadcast({ type: 'tick', data: snapshot });
}, TICK_INTERVAL);

setInterval(() => {
    broadcast({ type: 'timeline', data: scheduler.getTimeline() });
}, 15000);

simulator.state.orders.forEach(order => {
    if (!order.assignedLine) {
        scheduler.matchOrderToLine(order);
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('');
    console.log('===========================================');
    console.log('  3D Smart Steel Factory Platform v2.0');
    console.log('===========================================');
    console.log('  HTTP Server:    http://localhost:' + PORT);
    console.log('  WebSocket:      ws://localhost:' + PORT + '/ws');
    console.log('  API Base:       http://localhost:' + PORT + '/api');
    console.log('===========================================');
    console.log('');
});
