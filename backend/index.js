import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

import { GeminiCommentaryService } from './services/gemini.service.js';
import { ElevenLabsVoiceService } from './services/elevenlabs.service.js';
import { SolanaTipService } from './services/solana.service.js';
import { WebSocketManager } from './websocket/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Services
const geminiService = new GeminiCommentaryService();
const elevenLabsService = new ElevenLabsVoiceService();
const solanaService = new SolanaTipService();
const wsManager = new WebSocketManager(server);

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        clients: wsManager.getClientCount(),
        timestamp: Date.now()
    });
});

// Send a tip
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

// Generate commentary
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
        console.error('Commentary error:', error);
        return res.status(500).json({
            error: 'Failed to generate commentary',
            details: error.message
        });
    }
});

// ============================================
// SERVE FRONTEND STATIC FILES
// ============================================

const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Fallback to index.html for SPA routing
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
