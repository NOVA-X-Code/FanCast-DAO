// ============================================
// STATE
// ============================================
const state = {
    matchId: 'worldcup_final',
    homeTeam: 'France',
    awayTeam: 'Maroc',
    score: '2 - 0',
    minute: 67,
    status: 'live',
    commentary: '🎙️ Waiting for the match to start...',
    energy: 50,
    tone: 'neutral',
    tips: []
};

let ws = null;
let walletAddress = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// ============================================
// DOM REFS
// ============================================
const dom = {
    connectionDot: document.getElementById('connectionDot'),
    connectionStatus: document.getElementById('connectionStatus'),
    matchTitle: document.getElementById('matchTitle'),
    matchScore: document.getElementById('matchScore'),
    matchMinute: document.getElementById('matchMinute'),
    matchStatus: document.getElementById('matchStatus'),
    commentaryText: document.getElementById('commentaryText'),
    energyFill: document.getElementById('energyFill'),
    energyLabel: document.getElementById('energyLabel'),
    toneEmoji: document.getElementById('toneEmoji'),
    toneLabel: document.getElementById('toneLabel'),
    tipsList: document.getElementById('tipsList'),
    walletBtn: document.getElementById('walletBtn'),
    audioPlayer: document.getElementById('audioPlayer')
};

// ============================================
// WEBSOCKET
// ============================================
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?matchId=${state.matchId}&userId=${walletAddress || 'anonymous'}`;

    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            isConnected = true;
            reconnectAttempts = 0;
            updateConnectionStatus(true);
            console.log('✅ WebSocket connected');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('Message parse error:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };

        ws.onclose = () => {
            isConnected = false;
            updateConnectionStatus(false);
            console.log('🔌 WebSocket disconnected');

            // Auto-reconnect with exponential backoff
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                reconnectAttempts++;
                setTimeout(connectWebSocket, delay);
            }
        };
    } catch (error) {
        console.error('WebSocket connection error:', error);
        setTimeout(connectWebSocket, 3000);
    }
}

function updateConnectionStatus(connected) {
    dom.connectionDot.className = `dot ${connected ? 'online' : 'offline'}`;
    dom.connectionStatus.textContent = connected ? 'Live' : 'Offline';
    dom.connectionStatus.style.color = connected ? '#00ff88' : '#ff4444';
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'commentary':
            state.commentary = data.text;
            state.energy = data.energy;
            state.tone = data.tone;
            updateCommentary();

            if (data.audioUrl && dom.audioPlayer) {
                dom.audioPlayer.src = data.audioUrl;
                dom.audioPlayer.play().catch(() => {
                    // Auto-play prevented by browser
                });
            }
            break;

        case 'tip':
            state.tips.unshift(data.tip);
            if (state.tips.length > 20) state.tips.pop();
            updateTips();
            break;

        case 'tip_received':
            // Visual feedback for tip
            const tipMessage = data.tip || {};
            showTipNotification(tipMessage);
            break;

        case 'connected':
            console.log('📡', data.message);
            break;

        case 'match_event':
            if (data.event) {
                updateMatch(data.event);
            }
            break;

        default:
            console.log('Unrecognized message:', data.type);
    }
}

// ============================================
// UI UPDATES
// ============================================
function updateCommentary() {
    const toneEmojis = {
        excited: '🔥',
        dramatic: '🎭',
        angry: '💢',
        celebratory: '🎉',
        neutral: '🎙️'
    };

    dom.commentaryText.textContent = `"${state.commentary}"`;
    dom.energyFill.style.width = `${state.energy}%`;
    dom.energyLabel.textContent = `${state.energy}%`;
    dom.toneEmoji.textContent = toneEmojis[state.tone] || '🎙️';
    dom.toneLabel.textContent = state.tone.charAt(0).toUpperCase() + state.tone.slice(1);
}

function updateTips() {
    if (state.tips.length === 0) {
        dom.tipsList.innerHTML = '<p class="empty">No tips yet. Be the first!</p>';
        return;
    }

    dom.tipsList.innerHTML = state.tips.map(tip => `
        <div class="tip-item">
            <span>${tip.from.slice(0, 6)}...${tip.from.slice(-4)}</span>
            <span class="amount">🔥 ${tip.amount} SOL</span>
        </div>
    `).join('');
}

function updateMatch(event) {
    if (event.homeTeam) state.homeTeam = event.homeTeam;
    if (event.awayTeam) state.awayTeam = event.awayTeam;
    if (event.score) state.score = event.score;
    if (event.minute) state.minute = event.minute;
    if (event.status) state.status = event.status;

    dom.matchTitle.textContent = `${state.homeTeam} 🆚 ${state.awayTeam}`;
    dom.matchScore.textContent = state.score;
    dom.matchMinute.textContent = `⏱️ ${state.minute}'`;

    const statusLabels = {
        live: '🔴 LIVE',
        finished: '🏁 FINISHED',
        upcoming: '⏳ UPCOMING'
    };
    dom.matchStatus.textContent = statusLabels[state.status] || '🔴 LIVE';
    dom.matchStatus.className = state.status === 'live' ? 'live' : 'finished';
}

function showTipNotification(tip) {
    // Simple visual feedback
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff6b35, #ff4500);
        color: white;
        padding: 15px 25px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 14px;
        box-shadow: 0 10px 40px rgba(255, 69, 0, 0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;

    const amount = tip.amount || '0.01';
    notification.textContent = `🔥 TIP RECEIVED! ${amount} SOL`;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// ============================================
// WALLET
// ============================================
function connectWallet() {
    if (window.solana && window.solana.isPhantom) {
        window.solana.connect()
            .then(response => {
                walletAddress = response.publicKey.toString();
                dom.walletBtn.textContent = `🔗 ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
                dom.walletBtn.className = 'wallet-btn connected';
                console.log('✅ Wallet connected:', walletAddress);

                // Reconnect WebSocket with wallet
                if (ws) ws.close();
                setTimeout(connectWebSocket, 500);
            })
            .catch(error => {
                console.error('Wallet connection rejected:', error);
            });
    } else {
        alert('Please install Phantom Wallet:\nhttps://phantom.app/');
        window.open('https://phantom.app/', '_blank');
    }
}

// Auto-detect Phantom wallet
if (window.solana && window.solana.isPhantom) {
    window.solana.on('connect', () => {
        walletAddress = window.solana.publicKey.toString();
        dom.walletBtn.textContent = `🔗 ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        dom.walletBtn.className = 'wallet-btn connected';
        console.log('✅ Wallet auto-connected');
    });

    window.solana.on('disconnect', () => {
        walletAddress = null;
        dom.walletBtn.textContent = '🔗 Connect Wallet';
        dom.walletBtn.className = 'wallet-btn';
        console.log('🔌 Wallet disconnected');
    });
}

// ============================================
// TIPS
// ============================================
async function sendTip(amount) {
    if (!walletAddress) {
        alert('🔗 Please connect your Solana wallet first!');
        return;
    }

    try {
        const response = await fetch('/api/tip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: walletAddress,
                amount: amount,
                matchId: state.matchId
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log(`🔥 Tip sent: ${amount} SOL`);

            // Optimistic UI update
            state.tips.unshift({
                from: walletAddress,
                amount: amount,
                timestamp: Date.now()
            });
            if (state.tips.length > 20) state.tips.pop();
            updateTips();

            // Play sound effect
            showTipNotification({ amount: amount });
        } else {
            alert(`❌ ${result.message}`);
        }
    } catch (error) {
        console.error('Tip error:', error);
        alert('❌ Error sending tip. Please try again.');
    }
}

// ============================================
// SIMULATION
// ============================================
function simulateEvent() {
    if (!ws || ws.readyState !== 1) {
        alert('⚠️ Not connected to server. Please wait...');
        return;
    }

    const events = ['goal', 'foul', 'yellow_card', 'substitution', 'offside'];
    const randomEvent = events[Math.floor(Math.random() * events.length)];

    ws.send(JSON.stringify({
        type: 'match_event',
        data: { event: randomEvent }
    }));

    // Visual feedback
    dom.commentaryText.textContent = `⚡ Simulating: ${randomEvent.toUpperCase()}...`;

    // Auto-update commentary after simulation
    setTimeout(() => {
        // Commentary will be updated by WebSocket message
        // This is just a visual placeholder
        const eventMessages = {
            goal: '⚽ GOAL! The crowd goes wild!',
            foul: '🟨 Foul! The referee calls it!',
            yellow_card: '🟨 Yellow card shown!',
            substitution: '🔄 Substitution being made!',
            offside: '🚩 Offside! The linesman raises the flag!'
        };
        dom.commentaryText.textContent = `"⚡ ${eventMessages[randomEvent] || 'Match event simulated!'}"`;
    }, 500);
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
    if (e.key === '1') sendTip(0.01);
    if (e.key === '2') sendTip(0.05);
    if (e.key === '3') sendTip(0.1);
    if (e.key === 's') simulateEvent();
    if (e.key === 'w') connectWallet();
});

// ============================================
// CSS ANIMATIONS (injected)
// ============================================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    .tip-btn:active {
        animation: pulse 0.3s ease;
    }
`;
document.head.appendChild(style);

// ============================================
// INIT
// ============================================
console.log('🎙️ FanCast DAO loaded');
connectWebSocket();

// Auto-connect wallet if Phantom is available and trusted
if (window.solana && window.solana.isPhantom && window.solana.publicKey) {
    walletAddress = window.solana.publicKey.toString();
    dom.walletBtn.textContent = `🔗 ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    dom.walletBtn.className = 'wallet-btn connected';
    console.log('✅ Wallet already connected');
}
