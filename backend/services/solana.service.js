import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

export class SolanaTipService {
    constructor() {
        this.connection = new Connection(
            process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
            'confirmed'
        );
        this.treasuryWallet = new PublicKey(process.env.TREASURY_WALLET);
    }

    async processTip(fromPubkey, amount, matchId) {
        try {
            const from = new PublicKey(fromPubkey);
            const lamports = amount * LAMPORTS_PER_SOL;

            const balance = await this.connection.getBalance(from);
            if (balance < lamports) {
                return {
                    success: false,
                    message: `Insufficient balance. You have ${balance / LAMPORTS_PER_SOL} SOL, need ${amount} SOL.`
                };
            }

            // Transaction simulation (en production, envoyer la transaction réelle)
            // const transaction = new Transaction().add(
            //     SystemProgram.transfer({
            //         fromPubkey: from,
            //         toPubkey: this.treasuryWallet,
            //         lamports: lamports,
            //     })
            // );

            const tip = {
                from: fromPubkey,
                amount: amount,
                matchId: matchId,
                timestamp: Date.now()
            };

            await this.storeTip(tip);
            this.emitTipEvent(tip);

            return {
                success: true,
                signature: 'simulated_signature_here',
                message: `💥 PASSION BOOST! ${amount} SOL sent by ${fromPubkey.slice(0, 6)}...${fromPubkey.slice(-4)}!`
            };

        } catch (error) {
            console.error('Solana Error:', error);
            return {
                success: false,
                message: `Error: ${error.message || 'Transaction failed'}`
            };
        }
    }

    async storeTip(tip) {
        console.log(`Tip stored: ${tip.amount} SOL from ${tip.from}`);
    }

    emitTipEvent(tip) {
        console.log(`📡 Tip emitted: ${tip.amount} SOL`);
    }
}
