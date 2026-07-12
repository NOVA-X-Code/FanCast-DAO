// ============================================
// STATE
// ============================================
let ws = null;
let walletAddress = null;
let isConnected = false;

const state = {
    matchId: 'worldcup_final',
    homeTeam: 'France',
    awayTeam: 'Brazil',
    score: '2 - 1',
    minute: 67,
    status: 'live',
    commentary: '🎙️ Waiting for the match to start...',
    energy: 50,
    tone: 'neutral',
    tips: []
};

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
    
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        isConnected = true;
        dom.connectionDot.className = 'dot online';
        dom.connectionStatus.textContent = 'Live';
        dom.connectionStatus.style.color = '#00ff88';
        console.log('✅ WebSocket connected');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };

    ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
    };

    ws.onclose = () => {
        isConnected = false;
        dom.connectionDot.className = 'dot offline';
        dom.connectionStatus.textContent = 'Offline';
        dom.connectionStatus.style.color = '#ff4444';
        console.log('🔌 WebSocket disconnected');
        
        // Auto-reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
    };
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'commentary':
            state.commentary = data.text;
            state.energy = data.energy;
            state.tone = data.tone;
            updateCommentary();
            
            if (data.audioUrl) {
                dom.audioPlayer.src = data.audioUrl;
                dom.audioPlayer.play().catch(() => {});
            }
            break;

        case 'tip':
            state.tips.unshift(data.tip);
            if (state.tips.length > 20) state.tips.pop();
            updateTips();
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
    dom.matchStatus.className = state.status === 'live' ? 'live' : '';
}

// ============================================
// WALLET
// ============================================
async function connectWallet() {
    try {
        if (window.solana && window.solana.isPhantom) {
            const response = await window.solana.connect();
            walletAddress = response.publicKey.toString();
            dom.walletBtn.textContent = `🔗 ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
            dom.walletBtn.className = 'wallet-btn connected';
            
            // Reconnect WebSocket with wallet address
            if (ws) ws.close();
            setTimeout(connectWebSocket, 500);
        } else {
            alert('Please install Phantom Wallet: https://phantom.app/');
        }
    } catch (error) {
        console.error('Wallet connection error:', error);
    }
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
        } else {
            alert(`❌ ${result.message}`);
        }
    } catch (error) {
        console.error('Tip error:', error);
        alert('❌ Error sending tip');
    }
}

// ============================================
// SIMULATION
// ============================================
function simulateEvent() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Not connected to server');
        return;
    }
    
    const events = ['goal', 'foul', 'yellow_card', 'substitution'];
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    
    ws.send(JSON.stringify({
        type: 'match_event',
        data: { event: randomEvent }
    }));
    
    // Visual feedback
    dom.commentaryText.textContent = `⚡ Simulating: ${randomEvent.toUpperCase()}...`;
    setTimeout(() => {
        // Will be updated by WebSocket message
    }, 100);
}

// ============================================
// INIT
// ============================================
connectWebSocket();

// Auto-connect wallet if Phantom is available
if (window.solana && window.solana.isPhantom) {
    window.solana.on('connect', () => {
        walletAddress = window.solana.publicKey.toString();
        dom.walletBtn.textContent = `🔗 ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        dom.walletBtn.className = 'wallet-btn connected';
    });
}
