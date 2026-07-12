const { Connection, PublicKey, LAMPORTS_PER_SOL } = require("@solana/web3.js");

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const RECEIVER = process.env.SOLANA_RECEIVER_ADDRESS;

const connection = new Connection(RPC_URL, "confirmed");

/**
 * Verifies that a given transaction signature is a real, confirmed devnet
 * transfer of SOL to our receiver address, and returns the amount + sender.
 * This prevents someone from just POSTing a fake signature to /api/tip.
 */
async function verifyTip(signature) {
  if (!RECEIVER) {
    throw new Error("SOLANA_RECEIVER_ADDRESS is not configured on the server");
  }

  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  if (!tx) {
    throw new Error("Transaction not found (it may still be confirming, try again in a few seconds)");
  }
  if (tx.meta?.err) {
    throw new Error("Transaction failed on-chain");
  }

  const receiverPubkey = new PublicKey(RECEIVER);
  const accountKeys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toString());
  const receiverIndex = accountKeys.indexOf(receiverPubkey.toString());

  if (receiverIndex === -1) {
    throw new Error("This transaction does not involve the tip receiver address");
  }

  const preBalance = tx.meta.preBalances[receiverIndex];
  const postBalance = tx.meta.postBalances[receiverIndex];
  const lamportsReceived = postBalance - preBalance;

  if (lamportsReceived <= 0) {
    throw new Error("No SOL was transferred to the tip receiver in this transaction");
  }

  const sender = accountKeys[0];
  const solAmount = lamportsReceived / LAMPORTS_PER_SOL;

  return { sender, solAmount, signature };
}

module.exports = { verifyTip, connection };
