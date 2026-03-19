// === PARTICLES ===
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let particles = [];

function initParticles() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles = [];
    for (let i = 0; i < 40; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5 + 0.5,
            dx: (Math.random() - 0.5) * 0.3,
            dy: (Math.random() - 0.5) * 0.3,
            alpha: Math.random() * 0.3 + 0.1
        });
    }
}

function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(169, 96, 255, ${p.alpha})`;
        ctx.fill();
    });
    requestAnimationFrame(drawParticles);
}

initParticles();
drawParticles();
window.addEventListener('resize', initParticles);

// === CHAINLINK PRICE FEEDS (SEPOLIA) ===
const PRICE_FEEDS = {
    ETH: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
    BTC: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
    LINK: '0xc59E3633BAAC79493d908e63626716e204A45EdF'
};

const ABI = [
    'function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)',
    'function decimals() view returns (uint8)'
];

const RPC_URLS = [
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://rpc.sepolia.org',
    'https://sepolia.gateway.tenderly.co',
    'https://1rpc.io/sepolia'
];

let readProvider = null;
let prices = { ETH: 0, BTC: 0, LINK: 0 };
let selectedCoin = 'ETH';
let selectedLev = 10;
let totalPot = 0;
let signer = null;
let isConnected = false;

// roasts
const ROASTS = [
    "shouldve used 1x leverage clairo... oh wait that doesnt exist",
    "the market said no",
    "you thought you were different huh",
    "another one bites the dust",
    "your portfolio called. it filed for divorce",
    "even my grandma trades better than this",
    "you just donated to the market. how generous",
    "skill issue tbh",
    "maybe try a savings account next time",
    "the candle that burns twice as bright gets liquidated twice as fast",
    "congrats you just speedran poverty"
];

const LINK_ROASTS = [
    "i bought LINK at $30 and now im the one building on it. life is cruel",
    "chainlink powering this game is the only thing LINK is good for rn",
    "imagine buying LINK at $30 and then using it to build a game where everyone loses. thats my life",
    "LINK holders and users of this game have one thing in common: they both lose money"
];

// === INIT PROVIDER ===
async function initProvider() {
    for (const url of RPC_URLS) {
        try {
            const p = new ethers.providers.JsonRpcProvider(url);
            await p.getBlockNumber();
            readProvider = p;
            console.log('connected to:', url);
            return;
        } catch (e) {
            console.log('rpc failed:', url);
        }
    }
    console.error('all rpcs failed');
}

// === FETCH ALL PRICES ===
async function fetchAllPrices() {
    if (!readProvider) return;

    for (const coin of ['ETH', 'BTC', 'LINK']) {
        try {
            const feed = new ethers.Contract(PRICE_FEEDS[coin], ABI, readProvider);
            const [, answer] = await feed.latestRoundData();
            const decimals = await feed.decimals();
            prices[coin] = parseFloat(ethers.utils.formatUnits(answer, decimals));

            const priceEl = document.getElementById(coin.toLowerCase() + 'Price');
            const statusEl = document.getElementById(coin.toLowerCase() + 'Status');

            priceEl.textContent = '$' + prices[coin].toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            statusEl.textContent = 'live';
            statusEl.classList.add('live');
        } catch (e) {
            console.error('failed to fetch', coin, e);
            document.getElementById(coin.toLowerCase() + 'Status').textContent = 'error';
        }
    }
}

// === PRICE TILE CLICKS ===
document.querySelectorAll('.price-tile').forEach(tile => {
    tile.addEventListener('click', () => {
        const coin = tile.dataset.coin;
        selectedCoin = coin;
        document.querySelectorAll('[data-coin]').forEach(el => {
            if (el.classList.contains('btn-select')) {
                el.classList.toggle('active', el.dataset.coin === coin);
            }
        });
    });
});

// === COIN BUTTONS ===
document.querySelectorAll('.btn-select[data-coin]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-select[data-coin]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedCoin = btn.dataset.coin;
    });
});

// === LEVERAGE BUTTONS ===
document.querySelectorAll('.btn-select[data-lev]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-select[data-lev]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedLev = parseInt(btn.dataset.lev);
    });
});

// === CONNECT WALLET ===
document.getElementById('connectBtn').addEventListener('click', async () => {
    const walletProvider = window.ethereum || window.okxwallet;
    if (!walletProvider) {
        alert('install metamask or okx wallet first clairo');
        return;
    }

    try {
        await walletProvider.request({ method: 'eth_requestAccounts' });

        try {
            await walletProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }]
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                await walletProvider.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0xaa36a7',
                        chainName: 'Sepolia',
                        rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
                        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
                    }]
                });
            }
        }

        const provider = new ethers.providers.Web3Provider(walletProvider);
        signer = provider.getSigner();
        const addr = await signer.getAddress();

        document.getElementById('walletAddr').textContent = addr.slice(0, 6) + '...' + addr.slice(-4);
        const btn = document.getElementById('connectBtn');
        btn.textContent = 'connected';
        btn.classList.add('connected');
        isConnected = true;
    } catch (err) {
        console.error('wallet connect failed:', err);
    }
});

// === START GAME ===
async function startGame(direction) {
    if (!isConnected) {
        alert('connect ur wallet first clairo');
        return;
    }

    if (prices[selectedCoin] === 0) {
        alert('prices not loaded yet wait a sec');
        return;
    }

    const entry = parseFloat(document.getElementById('entryAmount').value);
    if (isNaN(entry) || entry <= 0) {
        alert('put in a valid amount');
        return;
    }

    // send entry to dead address
    try {
        const tx = await signer.sendTransaction({
            to: '0x000000000000000000000000000000000000dEaD',
            value: ethers.utils.parseEther(entry.toString())
        });
        await tx.wait();
    } catch (err) {
        console.error('tx failed:', err);
        alert('transaction failed. get some sepolia eth from a faucet');
        return;
    }

    totalPot += entry;
    document.getElementById('potValue').textContent = totalPot.toFixed(3) + ' ETH';

    // show simulation
    document.querySelector('.game-box').classList.add('hidden');
    document.getElementById('result').classList.add('hidden');
    const sim = document.getElementById('simulation');
    sim.classList.remove('hidden');

    document.getElementById('simCoin').textContent = selectedCoin + '/USD';
    document.getElementById('simLev').textContent = selectedLev + 'x';
    const dirEl = document.getElementById('simDir');
    dirEl.textContent = direction;
    dirEl.className = 'sim-dir ' + direction.toLowerCase();

    const entryPrice = prices[selectedCoin];
    const liqPercent = 100 / selectedLev;
    const liqPrice = direction === 'LONG'
        ? entryPrice * (1 - liqPercent / 100)
        : entryPrice * (1 + liqPercent / 100);

    document.getElementById('simEntry').textContent = 'entry: $' + entryPrice.toFixed(2);
    document.getElementById('simLiq').textContent = 'liq: $' + liqPrice.toFixed(2);

    await runSimulation(entryPrice, liqPrice, direction, entry);
}

// === RIGGED SIMULATION ===
async function runSimulation(entryPrice, liqPrice, direction, entry) {
    const pnlEl = document.getElementById('pnlValue');
    const pnlPctEl = document.getElementById('pnlPercent');
    const barFill = document.getElementById('barFill');
    const marker = document.getElementById('priceMarker');
    const simCurrent = document.getElementById('simCurrent');

    const steps = 35 + Math.floor(Math.random() * 25);
    const liqPercent = 100 / selectedLev;

    for (let i = 0; i <= steps; i++) {
        await sleep(120 + Math.random() * 180);

        let progress = i / steps;
        let movePercent;

        if (progress < 0.3) {
            // go green, build hope
            movePercent = Math.sin(progress * Math.PI * 3) * liqPercent * 0.4;
            if (direction === 'SHORT') movePercent *= -1;
        } else if (progress < 0.55) {
            // peak profit moment
            const peak = 1 - Math.abs((progress - 0.42) / 0.13);
            movePercent = liqPercent * 0.7 * peak;
            if (direction === 'SHORT') movePercent *= -1;
        } else if (progress < 0.7) {
            // start dropping
            const drop = (progress - 0.55) / 0.15;
            movePercent = liqPercent * 0.3 * (1 - drop * 2);
            if (direction === 'SHORT') movePercent *= -1;
        } else {
            // crash to liquidation
            const crash = (progress - 0.7) / 0.3;
            movePercent = -liqPercent * crash * 1.1;
            if (direction === 'SHORT') movePercent *= -1;
        }

        // noise
        movePercent += (Math.random() - 0.5) * liqPercent * 0.08;

        const simPrice = entryPrice * (1 + movePercent / 100);
        const pnl = direction === 'LONG'
            ? ((simPrice - entryPrice) / entryPrice) * selectedLev * entry
            : ((entryPrice - simPrice) / entryPrice) * selectedLev * entry;
        const pnlPct = direction === 'LONG'
            ? ((simPrice - entryPrice) / entryPrice) * selectedLev * 100
            : ((entryPrice - simPrice) / entryPrice) * selectedLev * 100;

        simCurrent.textContent = 'current: $' + simPrice.toFixed(2);

        if (pnl >= 0) {
            pnlEl.textContent = '+$' + pnl.toFixed(4);
            pnlEl.classList.remove('negative');
            pnlPctEl.textContent = '+' + pnlPct.toFixed(2) + '%';
            pnlPctEl.style.color = '#00c853';
        } else {
            pnlEl.textContent = '-$' + Math.abs(pnl).toFixed(4);
            pnlEl.classList.add('negative');
            pnlPctEl.textContent = pnlPct.toFixed(2) + '%';
            pnlPctEl.style.color = '#ff4444';
        }

        const barPct = Math.max(3, Math.min(97, 50 + pnlPct * 0.5));
        barFill.style.width = barPct + '%';
        marker.style.left = barPct + '%';
    }

    // always liquidated
    pnlEl.textContent = '-$' + entry.toFixed(4);
    pnlEl.classList.add('negative');
    pnlPctEl.textContent = '-100.00%';
    pnlPctEl.style.color = '#ff4444';
    barFill.style.width = '2%';
    marker.style.left = '2%';

    await sleep(600);
    showResult(entry);
}

function showResult(entry) {
    document.getElementById('simulation').classList.add('hidden');

    const roasts = selectedCoin === 'LINK' ? LINK_ROASTS : ROASTS;
    document.getElementById('liqAmount').textContent = '-' + entry.toFixed(4) + ' ETH';
    document.getElementById('liqRoast').textContent = roasts[Math.floor(Math.random() * roasts.length)];

    const res = document.getElementById('result');
    res.classList.remove('hidden');
    res.style.animation = 'none';
    res.offsetHeight;
    res.style.animation = '';
}

// === BUTTON LISTENERS ===
document.getElementById('btnLong').addEventListener('click', () => startGame('LONG'));
document.getElementById('btnShort').addEventListener('click', () => startGame('SHORT'));

document.getElementById('btnAgain').addEventListener('click', () => {
    document.getElementById('result').classList.add('hidden');
    document.querySelector('.game-box').classList.remove('hidden');
});

// === UTILS ===
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// === INIT ===
(async () => {
    await initProvider();
    await fetchAllPrices();
    // refresh prices every 30s
    setInterval(fetchAllPrices, 30000);
})();
