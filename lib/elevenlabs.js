// Turns commentary text into audio. Voice "excitement" is mapped from the
// current hype level via ElevenLabs voice_settings (lower stability + higher
// style = more energetic, less flat delivery).

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";

function voiceSettingsForHype(hype) {
  // hype: 0..1
  return {
    stability: Math.max(0.15, 0.6 - hype * 0.45),
    similarity_boost: 0.8,
    style: Math.min(1, 0.3 + hype * 0.7),
    use_speaker_boost: true,
  };
}

async function textToSpeech(text, hype = 0.5) {
  if (!ELEVENLABS_API_KEY) {
    return null; // no key configured, run without audio
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: voiceSettingsForHype(hype),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("ElevenLabs API error:", res.status, errText);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:audio/mpeg;base64,${base64}`;
  } catch (err) {
    console.error("ElevenLabs call failed:", err);
    return null;
  }
}

module.exports = { textToSpeech };
