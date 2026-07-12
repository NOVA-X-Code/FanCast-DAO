# 🎙️ FanCast DAO — Decentralized Fan Radio

## What is FanCast DAO?

FanCast DAO is a decentralized broadcasting platform where passionate fans create, fund, and host ultra-engaged live match radios in real time.

> *"The passion of the stands, amplified by AI and powered by blockchain."*

## How It Works

1. **Google AI** analyzes match events and fan reactions to generate dynamic commentary
2. **ElevenLabs** transforms scripts into expressive audio with cloned commentator voices
3. **Solana** enables micro-payments (tips) that influence the AI's energy in real time

## Prize Categories Targeted

- ✅ **Best Use of Google AI** — Gemini for real-time commentary
- ✅ **Best Use of ElevenLabs** — TTS for dynamic voiceovers
- ✅ **Best Use of Solana** — Micro-payments for "passion boosts"

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (optional)
- API Keys: Gemini, ElevenLabs, Solana

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/fancast-dao.git
cd fancast-dao

# Install dependencies
cd backend && npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Start the server
npm start
