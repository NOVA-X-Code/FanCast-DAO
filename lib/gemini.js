// Calls the Gemini API to turn a raw match event into a short, punchy
// commentary line whose tone depends on the current "hype" level
// (which fans control by sending SOL tips).

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

function hypeLabel(hype) {
  if (hype > 0.8) return "ECSTATIC, screaming, maximum passion, exclamation marks everywhere";
  if (hype > 0.6) return "very excited and energetic";
  if (hype > 0.4) return "engaged and enthusiastic";
  return "calm, measured, professional";
}

async function generateCommentary({ event, matchState, boostedTeam }) {
  if (!GEMINI_API_KEY) {
    // Fallback so the app still runs (and can be demoed) without a key.
    return event.text;
  }

  const hype = boostedTeam === "A" ? matchState.hypeA
    : boostedTeam === "B" ? matchState.hypeB
    : Math.max(matchState.hypeA, matchState.hypeB);

  const systemPrompt = `You are a live football radio commentator for a fan-run broadcast called FanCast DAO.
Match: ${matchState.teamA} vs ${matchState.teamB}, minute ${matchState.minute}, score ${matchState.scoreA}-${matchState.scoreB}.
Your tone right now must be: ${hypeLabel(hype)}.
${boostedTeam ? `Fans just sent a SOL tip to hype up ${boostedTeam === "A" ? matchState.teamA : matchState.teamB} - lean into that team's side.` : ""}
Rules:
- One short spoken commentary line only (max 2 sentences).
- No stage directions, no asterisks, no emojis, just what the commentator would actually say out loud.
- Never mention AI, prompts, or that you are a model.`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: `Event to react to: "${event.text}"` }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 120,
    },
  };

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", res.status, errText);
      return event.text;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join(" ").trim();
    return text || event.text;
  } catch (err) {
    console.error("Gemini call failed:", err);
    return event.text;
  }
}

module.exports = { generateCommentary };
