const { WebSocketServer } = require('ws');

class WebSocketManager {
    constructor(server) {
        this.wss = new WebSocketServer({ server, path: '/ws' });
        this.clients = new Map();
        this.setupWebSocket();
    }

    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const matchId = url.searchParams.get('matchId') || 'default';
            const userId = url.searchParams.get('userId') || 'anonymous';

            console.log(`🔌 Client connected: ${userId} for match ${matchId}`);

            if (!this.clients.has(matchId)) {
                this.clients.set(matchId, []);
            }
            this.clients.get(matchId).push({ ws, matchId, userId });

            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleMessage(message, matchId);
                } catch (error) {
                    console.error('WebSocket parse error:', error);
                }
            });

            ws.on('close', () => {
                const clients = this.clients.get(matchId) || [];
                this.clients.set(
                    matchId,
                    clients.filter(c => c.ws !== ws)
                );
                console.log(`🔌 Client disconnected: ${userId}`);
            });

            ws.send(JSON.stringify({
                type: 'connected',
                matchId,
                message: '🎙️ Connected to FanCast DAO!',
                timestamp: Date.now()
            }));
        });

        console.log('✅ WebSocket server started on /ws');
    }

    handleMessage(message, matchId) {
        switch (message.type) {
            case 'tip':
                this.broadcastToMatch(matchId, {
                    type: 'tip_received',
                    tip: message.data,
                    timestamp: Date.now()
                });
                break;
            case 'reaction':
                this.broadcastToMatch(matchId, {
                    type: 'reaction',
                    reaction: message.data,
                    timestamp: Date.now()
                });
                break;
            default:
                console.log(`Unhandled message type: ${message.type}`);
        }
    }

    broadcastCommentary(matchId, script, audioUrl) {
        this.broadcastToMatch(matchId, {
            type: 'commentary',
            text: script.commentary,
            tone: script.tone,
            energy: script.energy,
            audioUrl: audioUrl,
            timestamp: Date.now()
        });
    }

    broadcastTip(matchId, tip) {
        this.broadcastToMatch(matchId, {
            type: 'tip',
            tip: tip,
            message: `🔥 ${tip.from.slice(0, 6)}...${tip.from.slice(-4)} sent ${tip.amount} SOL!`,
            timestamp: Date.now()
        });
    }

    broadcastToMatch(matchId, data) {
        const clients = this.clients.get(matchId) || [];
        const message = JSON.stringify(data);

        clients.forEach(client => {
            if (client.ws.readyState === 1) { // WebSocket.OPEN
                client.ws.send(message);
            }
        });
    }

    getClientCount() {
        let count = 0;
        this.clients.forEach(clients => count += clients.length);
        return count;
    }
}

module.exports = { WebSocketManager };
