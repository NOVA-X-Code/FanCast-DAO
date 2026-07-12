# 🎙️ FanCast DAO

A decentralized live fan-radio for football matches. **Google Gemini** writes
the commentary, **ElevenLabs** speaks it out loud, and **Solana** lets fans
tip SOL in real time to hype up their team — which instantly changes the
tone of the AI commentary and the energy of the voice.

Built for the DEV "Weekend Challenge: Passion Edition".

## How it works

1. A simulated match engine (`lib/matchSimulator.js`) produces live events
   (goals, fouls, corners, near misses) every ~12 seconds.
2. Each event is sent to **Gemini** (`lib/gemini.js`), which writes a short,
   passionate commentary line whose tone depends on the current "hype" level.
3. That text is sent to **ElevenLabs** (`lib/elevenlabs.js`) for
   text-to-speech, with `voice_settings` tuned to sound calmer or more
   ecstatic depending on hype.
4. The result is pushed to every connected browser instantly over
   **Server-Sent Events** (`/api/stream`).
5. Fans connect a **Phantom** wallet and send a real (devnet) SOL transfer.
   The backend verifies the transaction on-chain (`lib/solana.js`) before
   boosting that team's hype and immediately generating a special,
   more excited commentary line.

## Prerequisites

- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (Gemini)
- An [ElevenLabs](https://elevenlabs.io/app/settings/api-keys) API key
- A Solana **devnet** keypair to act as the tip receiver (any wallet address
  works — e.g. create one in Phantom and switch the network to Devnet)
- [Phantom Wallet](https://phantom.app) browser extension, set to **Devnet**,
  with some devnet SOL from the
  [Solana faucet](https://faucet.solana.com/)

## Local setup

```bash
cp .env.example .env
# edit .env and fill in your real keys + receiver address
npm install
npm start
```

Open http://localhost:3000

## Deploying on Railway

1. Push this project to a GitHub repository.
2. On [railway.app](https://railway.app), click **New Project → Deploy from
   GitHub repo** and select this repo.
3. Railway auto-detects Node.js and runs `npm install && npm start`.
4. Go to your service's **Variables** tab and add:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (optional, defaults to `gemini-2.0-flash`)
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_VOICE_ID` (optional)
   - `ELEVENLABS_MODEL_ID` (optional)
   - `SOLANA_RPC_URL` (use `https://api.devnet.solana.com`)
   - `SOLANA_RECEIVER_ADDRESS` (your devnet public key)
   - Railway sets `PORT` automatically — no need to add it yourself.
5. Click **Deploy**. Railway will give you a public URL
   (e.g. `fancast-dao-production.up.railway.app`).

**Never commit your `.env` file.** `.gitignore` already excludes it.

## Demo script for the judges

1. Load the app, point out the live scoreboard and commentary box.
2. Click **"Trigger next event (demo)"** a couple of times to show the
   Gemini → ElevenLabs pipeline reacting to match events live.
3. Connect Phantom (devnet), send a small SOL tip for one team.
4. Show the on-chain confirmation, then the hype bar jumping and the very
   next commentary line becoming noticeably louder/more excited — that's
   the "wow" moment: **a Solana transaction visibly changing an AI's tone
   and voice in real time.**

## Notes / things to improve with more time

- Swap the simulator for a real live sports-data webhook.
- Stream ElevenLabs audio via websockets instead of base64 chunks for lower
  latency.
- Use fictional commentator personas rather than real people's cloned
  voices to avoid any likeness/rights issues.
- Add a Solana program (smart contract) to track cumulative tips per team
  on-chain instead of only in server memory, for a true "DAO" leaderboard.
