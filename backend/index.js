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

app.use(cors());
app.use(express.json());

const geminiService = new GeminiCommentaryService();
const elevenLabsService = new ElevenLabsVoiceService();
const solanaService = new SolanaTipService();
const wsManager = new WebSocketManager(server);

// API Routes...
// (même code mais avec import/export)
