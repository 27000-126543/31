const WSClient = {
    socket: null,
    url: null,
    reconnectTimer: null,
    reconnectDelay: 2000,
    listeners: {},
    lastMessageTime: 0,

    init(wsUrl) {
        this.url = wsUrl || ('ws://' + window.location.host + '/ws');
        this._connect();
    },

    _connect() {
        try {
            this.socket = new WebSocket(this.url);

            this.socket.onopen = () => {
                console.log('[WS] Connected to', this.url);
                this._updateStatus(true);
                this._emit('connected');
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
            };

            this.socket.onmessage = (evt) => {
                this.lastMessageTime = Date.now();
                try {
                    const msg = JSON.parse(evt.data);
                    this._emit(msg.type, msg.data, msg);
                } catch (e) {
                    console.warn('[WS] Parse error:', e.message);
                }
            };

            this.socket.onerror = (err) => {
                console.error('[WS] Socket error:', err);
                this._updateStatus(false);
            };

            this.socket.onclose = () => {
                console.warn('[WS] Disconnected, retrying in', this.reconnectDelay, 'ms');
                this._updateStatus(false);
                this._emit('disconnected');
                this.reconnectTimer = setTimeout(() => this._connect(), this.reconnectDelay);
            };
        } catch (e) {
            console.error('[WS] Connection failed:', e.message);
            this.reconnectTimer = setTimeout(() => this._connect(), this.reconnectDelay);
        }
    },

    _updateStatus(connected) {
        const el = document.getElementById('ws-status');
        if (!el) return;
        if (connected) {
            el.textContent = '● 已连接';
            el.className = 'ws-status ws-connected';
        } else {
            el.textContent = '● 已断开';
            el.className = 'ws-status ws-disconnected';
        }
    },

    send(type, data) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('[WS] Cannot send, socket not ready');
            return false;
        }
        this.socket.send(JSON.stringify({ type, ...data }));
        return true;
    },

    on(type, callback) {
        if (!this.listeners[type]) this.listeners[type] = [];
        this.listeners[type].push(callback);
    },

    off(type, callback) {
        if (!this.listeners[type]) return;
        this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
    },

    _emit(type, ...args) {
        if (!this.listeners[type]) return;
        this.listeners[type].forEach(cb => {
            try { cb(...args); } catch (e) { console.error('[WS listener]', type, e); }
        });
    },

    requestHistory(id) { this.send('getBlastFurnaceHistory', { id }); },
    requestMatchOrder(orderId) { this.send('matchOrder', { orderId }); },
    requestTimeline() { this.send('getTimeline'); },
    logOperation(data) { this.send('logOperation', { data }); },
    verifyFace(userId, faceData) { this.send('verifyFace', { userId, faceData }); }
};
