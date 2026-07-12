require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const matchSimulator = require("./lib/matchSimulator");
const { generateCommentary } = require("./lib/gemini");
const { textToSpeech } = require("./lib/elevenlabs");
const { verifyTip } = require("./lib/solana");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// --- Server-Sent Events: broadcast live commentary to every connected client ---
let clients = [];

function broadcast(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((res) => res.write(data));
}

app.get("/api/stream", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: "connected", state: matchSimulator.getState() })}\n\n`);

  clients.push(res);
  req.on("close", () => {
    clients = clients.filter((c) => c !== res);
  });
});

app.get("/api/state", (req, res) => {
  res.json(matchSimulator.getState());
});

// --- Core pipeline: event -> Gemini script -> ElevenLabs audio -> broadcast ---
async function processEvent(event, boostedTeam = null) {
  const matchState = matchSimulator.getState();
  const commentaryText = await generateCommentary({ event, matchState, boostedTeam });
  const hypeForAudio = boostedTeam === "A" ? matchState.hypeA
    : boostedTeam === "B" ? matchState.hypeB
    : Math.max(matchState.hypeA, matchState.hypeB);
  const audio = await textToSpeech(commentaryText, hypeForAudio);

  broadcast({
    type: "commentary",
    event,
    text: commentaryText,
    audio, // base64 data URL, or null if ElevenLabs isn't configured
    state: matchState,
    boostedTeam,
  });
}

// Simulated match tick, every 12 seconds
const TICK_MS = Number(process.env.TICK_MS || 12000);
setInterval(async () => {
  try {
    const event = matchSimulator.nextEvent();
    await processEvent(event);
  } catch (err) {
    console.error("Tick error:", err);
  }
}, TICK_MS);

// Manual trigger, handy for demoing without waiting for the timer
app.post("/api/control/next-event", async (req, res) => {
  try {
    const event = matchSimulator.nextEvent();
    await processEvent(event);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Tip Jar: verify a Solana devnet tip, boost hype, trigger a special line ---
app.post("/api/tip", async (req, res) => {
  const { signature, team } = req.body;
  if (!signature || !["A", "B"].includes(team)) {
    return res.status(400).json({ ok: false, error: "signature and team ('A' or 'B') are required" });
  }

  try {
    const tipInfo = await verifyTip(signature);

    // Scale hype boost with tip size, capped so a single tip can't max it out
    const boostAmount = Math.min(0.35, 0.08 + tipInfo.solAmount * 0.1);
    matchSimulator.boostHype(team, boostAmount);

    const matchState = matchSimulator.getState();
    const teamName = team === "A" ? matchState.teamA : matchState.teamB;

    const tipEvent = {
      minute: matchState.minute,
      type: "tip_boost",
      team,
      text: `Fans just sent a ${tipInfo.solAmount.toFixed(3)} SOL fervor boost for ${teamName}!`,
    };

    await processEvent(tipEvent, team);

    res.json({ ok: true, tip: tipInfo, state: matchSimulator.getState() });
  } catch (err) {
    console.error("Tip verification failed:", err.message);
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Public info the frontend needs to build the transfer transaction.
// The receiver address is a public key - safe to expose.
app.get("/api/tip-config", (req, res) => {
  res.json({ receiver: process.env.SOLANA_RECEIVER_ADDRESS || null });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`FanCast DAO server running on port ${PORT}`);
});
