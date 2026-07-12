import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiCommentaryService {
    constructor() {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.9,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 200,
            }
        });
        this.lastCommentary = '';
        this.tipInfluence = 0;
    }

    async generateCommentary(matchEvents, chatReactions, tips, matchContext) {
        const eventSummary = matchEvents.length > 0
            ? matchEvents.map(e => `${e.minute}' - ${e.type} by ${e.player} (${e.team})`).join('\n')
            : 'No recent events.';

        const sentiment = this.analyzeSentiment(chatReactions);
        const tipBoost = this.calculateTipInfluence(tips);
        this.tipInfluence = Math.min(1, tipBoost / 100);

        const toneInstruction = this.tipInfluence > 0.5
            ? 'Fans are paying for DRAMA! Be EXCITED, BIASED, and EMOTIONAL! Use UPPERCASE and exclamation marks!!!'
            : 'Be passionate but measured with sustained energy.';

        const prompt = `
            You are the lead commentator for FanCast DAO, a decentralized radio platform for football fans.

            MATCH CONTEXT:
            ${matchContext.homeTeam} ${matchContext.score} ${matchContext.awayTeam}
            Minute: ${matchContext.minute}'

            RECENT EVENTS:
            ${eventSummary}

            FAN REACTIONS:
            Overall sentiment: ${sentiment}
            Reaction count: ${chatReactions.length}
            Passion level: ${tipBoost > 50 ? '🔊 UNLEASHED' : '🎯 Focused'}

            TONE TO ADOPT:
            ${toneInstruction}
            Tip influence: ${Math.round(this.tipInfluence * 100)}%

            Generate a 2-3 sentence commentary for this moment.

            RULES:
            - Be dramatic and immersive
            - Mention players by name when possible
            - React to recent events
            - Adapt energy to fan passion level

            Required JSON format:
            {
                "commentary": "The commentary text",
                "tone": "excited|dramatic|angry|celebratory|neutral",
                "energy": 0-100
            }
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();
            const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanedText);
            this.lastCommentary = parsed.commentary;
            return parsed;
        } catch (error) {
            console.error('Gemini Error:', error);
            return {
                commentary: this.lastCommentary || "🎙️ Moments of intense passion on the pitch!",
                tone: 'neutral',
                energy: 50
            };
        }
    }

    calculateTipInfluence(tips) {
        const totalTips = tips.reduce((sum, tip) => sum + tip.amount, 0);
        return Math.min(100, totalTips * 100);
    }

    analyzeSentiment(reactions) {
        if (reactions.length === 0) return 'neutral';
        const positive = reactions.filter(r => r.type === '🔥' || r.type === '⚽' || r.type === '❤️').length;
        const negative = reactions.filter(r => r.type === '💀').length;

        if (positive > negative * 2) return 'explosive';
        if (positive > negative) return 'positive';
        if (negative > positive) return 'tense';
        return 'mixed';
    }
}
