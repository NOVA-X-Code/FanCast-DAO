class ElevenLabsVoiceService {
    constructor() {
        this.apiKey = process.env.ELEVENLABS_API_KEY;
        this.voiceMap = {
            excited: 'EXCITED_VOICE_ID',
            dramatic: 'DRAMATIC_VOICE_ID',
            angry: 'ANGRY_VOICE_ID',
            celebratory: 'CELEBRATORY_VOICE_ID',
            neutral: '21m00Tcm4TlvDq8ikWAM'
        };
    }

    async generateAudio(script, tips) {
        const energy = script.energy;
        const tipCount = tips.length;

        const voiceSettings = {
            stability: Math.max(0.2, 0.7 - (energy / 100) * 0.5),
            similarity_boost: Math.min(1, 0.8 + (energy / 100) * 0.2),
            style: Math.min(1, (energy / 100) * 1.5),
            use_speaker_boost: energy > 70
        };

        const voiceId = this.voiceMap[script.tone] || this.voiceMap.neutral;
        const text = tipCount > 5
            ? `${script.commentary} 🔊 THE CROWD IS UNLEASHED!`
            : script.commentary;

        try {
            const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': this.apiKey
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: voiceSettings
                })
            });

            const audioBuffer = await response.arrayBuffer();
            return Buffer.from(audioBuffer);
        } catch (error) {
            console.error('ElevenLabs Error:', error);
            return Buffer.from('');
        }
    }
}

module.exports = { ElevenLabsVoiceService };
