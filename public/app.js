const RECEIVER_ADDRESS_ENDPOINT = "/api/state"; // receiver is enforced server-side
let connection = null;
let provider = null;
let publicKey = null;

// devnet connection for building/sending the transfer transaction client-side
connection = new solanaWeb3.Connection("https://api.devnet.solana.com", "confirmed");

const els = {
  connectBtn: document.getElementById("connectBtn"),
  walletAddr: document.getElementById("walletAddr"),
  tipBtn: document.getElementById("tipBtn"),
  nextEventBtn: document.getElementById("nextEventBtn"),
  teamSelect: document.getElementById("teamSelect"),
  tipAmount: document.getElementById("tipAmount"),
  tipStatus: document.getElementById("tipStatus"),
  currentText: document.getElementById("currentText"),
  log: document.getElementById("log"),
  teamAName: document.getElementById("teamAName"),
  teamBName: document.getElementById("teamBName"),
  scoreA: document.getElementById("scoreA"),
  scoreB: document.getElementById("scoreB"),
  hypeA: document.getElementById("hypeA"),
  hypeB: document.getElementById("hypeB"),
  minute: document.getElementById("minute"),
  optA: document.getElementById("optA"),
  optB: document.getElementById("optB"),
};

function setStatus(msg, type = "") {
  els.tipStatus.textContent = msg;
  els.tipStatus.className = "status " + type;
}

function updateScoreboard(state) {
  els.teamAName.textContent = state.teamA;
  els.teamBName.textContent = state.teamB;
  els.optA.textContent = state.teamA;
  els.optB.textContent = state.teamB;
  els.scoreA.textContent = state.scoreA;
  els.scoreB.textContent = state.scoreB;
  els.hypeA.style.width = Math.round(state.hypeA * 100) + "%";
  els.hypeB.style.width = Math.round(state.hypeB * 100) + "%";
  els.minute.textContent = state.minute + "'";
}

function addLogLine(text, meta) {
  const item = document.createElement("div");
  item.className = "log-item";
  item.innerHTML = `<b>${meta}'</b> — ${text}`;
  els.log.prepend(item);
  while (els.log.children.length > 20) els.log.removeChild(els.log.lastChild);
}

// --- Wallet connection (Phantom) ---
els.connectBtn.addEventListener("click", async () => {
  if (!window.solana || !window.solana.isPhantom) {
    setStatus("Phantom wallet not found. Install it from phantom.app, set it to Devnet, then reload.", "error");
    return;
  }
  try {
    provider = window.solana;
    const resp = await provider.connect();
    publicKey = resp.publicKey;
    els.walletAddr.textContent = publicKey.toString().slice(0, 4) + "..." + publicKey.toString().slice(-4);
    els.tipBtn.disabled = false;
    setStatus("Wallet connected. Make sure Phantom is set to Devnet.", "success");
  } catch (err) {
    setStatus("Connection cancelled or failed.", "error");
  }
});

// --- Send tip transaction ---
els.tipBtn.addEventListener("click", async () => {
  if (!publicKey) return;
  const amount = parseFloat(els.tipAmount.value);
  const team = els.teamSelect.value;

  if (!amount || amount <= 0) {
    setStatus("Enter a valid SOL amount.", "error");
    return;
  }

  try {
    els.tipBtn.disabled = true;
    setStatus("Fetching tip receiver address...");

    const metaRes = await fetch("/api/tip-config");
    const meta = await metaRes.json();
    if (!meta.receiver) {
      setStatus("Server has no SOLANA_RECEIVER_ADDRESS configured.", "error");
      els.tipBtn.disabled = false;
      return;
    }

    const receiverPubkey = new solanaWeb3.PublicKey(meta.receiver);
    const lamports = Math.round(amount * solanaWeb3.LAMPORTS_PER_SOL);

    setStatus("Building transaction...");
    const { blockhash } = await connection.getLatestBlockhash();
    const tx = new solanaWeb3.Transaction({
      feePayer: publicKey,
      recentBlockhash: blockhash,
    }).add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: receiverPubkey,
        lamports,
      })
    );

    setStatus("Waiting for wallet approval...");
    const signed = await provider.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signed.serialize());

    setStatus("Confirming on devnet...");
    await connection.confirmTransaction(signature, "confirmed");

    setStatus("Confirmed! Boosting the hype...");
    const res = await fetch("/api/tip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature, team }),
    });
    const data = await res.json();

    if (data.ok) {
      setStatus(`Tip of ${data.tip.solAmount.toFixed(3)} SOL confirmed! Crowd is going wild.`, "success");
    } else {
      setStatus("Tip verification failed: " + data.error, "error");
    }
  } catch (err) {
    console.error(err);
    setStatus("Transaction failed or was rejected.", "error");
  } finally {
    els.tipBtn.disabled = false;
  }
});

els.nextEventBtn.addEventListener("click", async () => {
  await fetch("/api/control/next-event", { method: "POST" });
});

// --- Live stream of commentary ---
const evtSource = new EventSource("/api/stream");
evtSource.onmessage = (e) => {
  const payload = JSON.parse(e.data);
  if (payload.type === "connected") {
    updateScoreboard(payload.state);
    return;
  }
  if (payload.type === "commentary") {
    updateScoreboard(payload.state);
    els.currentText.textContent = payload.text;
    addLogLine(payload.text, payload.state.minute);
    if (payload.audio) {
      const audio = new Audio(payload.audio);
      audio.play().catch(() => {});
    }
  }
};
