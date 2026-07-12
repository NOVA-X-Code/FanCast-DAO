const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const path = require('path');

const { GeminiCommentaryService } = require('./services/gemini.service');
const { ElevenLabsVoiceService } = require('./services/elevenlabs.service');
const { SolanaTipService } = require('./services/solana.service');
const { WebSocketManager } = require('./websocket/server');

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const geminiService = new GeminiCommentaryService();
const elevenLabsService = new ElevenLabsVoiceService();
const solanaService = new SolanaTipService();
const wsManager = new WebSocketManager(server);

// ============================================
// API ROUTES
// ============================================

app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        clients: wsManager.getClientCount(),
        timestamp: Date.now()
    });
});

app.post('/api/tip', async (req, res) => {
    const { from, amount, matchId } = req.body;
    
    if (!from || !amount || !matchId) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    const result = await solanaService.processTip(from, amount, matchId);
    
    if (result.success) {
        wsManager.broadcastTip(matchId, {
            from,
            amount,
            matchId,
            timestamp: Date.now()
        });
    }

    return res.json(result);
});

app.post('/api/commentary', async (req, res) => {
    const {
        matchEvents = [],
        chatReactions = [],
        tips = [],
        matchContext
    } = req.body;

    try {
        const script = await geminiService.generateCommentary(
            matchEvents,
            chatReactions,
            tips,
            matchContext
        );

        const audioBuffer = await elevenLabsService.generateAudio(script, tips);
        const audioBase64 = audioBuffer.toString('base64');
        
        wsManager.broadcastCommentary(
            matchContext?.id || 'default',
            script,
            `data:audio/mpeg;base64,${audioBase64}`
        );

        return res.json({
            success: true,
            script,
            audio: audioBase64
        });

    } catch (error) {
        console.error('Commentary generation error:', error);
        return res.status(500).json({
            error: 'Failed to generate commentary',
            details: error.message
        });
    }
});

// ============================================
// SERVE STATIC FILES
// ============================================

const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Fallback to index.html
app.get('*', (_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// ============================================
// START SERVER
// ============================================

server.listen(PORT, () => {
    console.log(`🚀 FanCast DAO running on port ${PORT}`);
    console.log(`📡 WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
});
