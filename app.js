// chainlink price feed addresses on sepolia
const PRICE_FEEDS = {
    ETH: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
    BTC: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
    LINK: '0xc59E3633BAAC79493d908e63626716e204A45EdF'
};

const AGGREGATOR_ABI = [
    'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
    'function decimals() view returns (uint8)'
];

const SEPOLIA_RPC = 'https://rpc.sepolia.org';

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
    "the candle that burns twice as bright gets liquidated twice as fast"
];

const LINK_ROASTS = [
    "i bought LINK at $30 and now im the one building on it. life is cruel",
    "chainlink powering this game is the only thing LINK is good for rn",
    "imagine buying LINK at $30 and then using it to build a game where everyone loses. thats my life",
    "LINK holders and users of this game have one thing in common: they both lose money"
];

let provider;
let signer;
let selectedCoin = 'ETH';
let selectedLev = 10;
let currentPrice = 0;
let totalPot = 0;
let isConnected = false;

// elements
const connectBtn = document.getElementById('connectBtn');
const walletAddr = document.getElementById('walletAddr');
const gameSection = document.getElementById('gameSection');
const coinLabel = document.getElementById('coinLabel');
const coinPrice = document.getElementById('coinPrice');
const simulation = document.getElementById('simulation');
const result = document.getElementById('result');
const btnLong = document.getElementById('btnLong');
const btnShort = document.getElementById('btnShort');
const btnAgain = document.getElementById('btnAgain');
const potValue = document.getElementById('potValue');
const entryAmount = document.getElementById('entryAmount');

// coin buttons
document.querySelectorAll('.btn-coin').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-coin').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedCoin = btn.dataset.coin;
        fetchPrice();
    });
});

// leverage buttons
document.querySelectorAll('.btn-lev').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-lev').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedLev = parseInt(btn.dataset.lev);
    });
});

// connect wallet
connectBtn.addEventListener('click', async () => {
    if (!window.ethereum) {
        alert('install metamask first clairo');
        return;
    }

    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        // switch to sepolia
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }]
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0xaa36a7',
                        chainName: 'Sepolia',
                        rpcUrls: ['https://rpc.sepolia.org'],
                        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
                    }]
                });
            }
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        const addr = await signer.getAddress();
        walletAddr.textContent = addr.slice(0, 6) + '...' + addr.slice(-4);
        connectBtn.textContent = 'connected';
        connectBtn.style.borderColor = '#00c853';
        connectBtn.style.color = '#00c853';
        connectBtn.disabled = true;
        isConnected = true;
        gameSection.classList.remove('hidden');
        fetchPrice();
    } catch (err) {
        console.error(err);
    }
});

// fetch price from chainlink
async function fetchPrice() {
    try {
        const readProvider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
        const feed = new ethers.Contract(PRICE_FEEDS[selectedCoin], AGGREGATOR_ABI, readProvider);
        const [, answer] = await feed.latestRoundData();
        const decimals = await feed.decimals();
        currentPrice = parseFloat(ethers.utils.formatUnits(answer, decimals));

        coinLabel.textContent = selectedCoin + '/USD';
        coinPrice.textContent = '$' + currentPrice.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        // update source text for LINK
        const source = document.querySelector('.price-source');
        if (selectedCoin === 'LINK') {
            source.textContent = 'i bought this at $30. look at it now. pain.';
        } else {
            source.textContent = 'powered by chainlink (i bought LINK at $30 worst decision of my life)';
        }
    } catch (err) {
        console.error('price fetch failed:', err);
        coinPrice.textContent = 'error';
    }
}

// start game
async function startGame(direction) {
    if (!isConnected) return;

    const entry = parseFloat(entryAmount.value);
    if (isNaN(entry) || entry <= 0) {
        alert('put in a valid entry amount');
        return;
    }

    // send entry fee (just burns test eth to simulate pot)
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
    potValue.textContent = totalPot.toFixed(4) + ' ETH';

    // hide controls show simulation
    document.querySelector('.controls').classList.add('hidden');
    result.classList.add('hidden');
    simulation.classList.remove('hidden');

    document.getElementById('simCoin').textContent = selectedCoin + '/USD';
    document.getElementById('simLev').textContent = selectedLev + 'x';
    document.getElementById('simDir').textContent = direction;

    const entryPrice = currentPrice;
    const liqPercent = 100 / selectedLev;
    const liqPrice = direction === 'LONG'
        ? entryPrice * (1 - liqPercent / 100)
        : entryPrice * (1 + liqPercent / 100);

    document.getElementById('simEntry').textContent = 'entry: $' + entryPrice.toFixed(2);
    document.getElementById('simLiq').textContent = 'liq: $' + liqPrice.toFixed(2);

    // run rigged simulation
    await runSimulation(entryPrice, liqPrice, direction, entry);
}

async function runSimulation(entryPrice, liqPrice, direction, entry) {
    const pnlEl = document.getElementById('pnlValue');
    const barFill = document.getElementById('barFill');
    const priceMarker = document.getElementById('priceMarker');
    const simCurrent = document.getElementById('simCurrent');

    const steps = 30 + Math.floor(Math.random() * 20);
    const liqPercent = 100 / selectedLev;

    for (let i = 0; i <= steps; i++) {
        await sleep(150 + Math.random() * 200);

        let progress = i / steps;
        let movePercent;

        if (progress < 0.4) {
            // start positive to build hope
            movePercent = Math.sin(progress * Math.PI * 2) * liqPercent * 0.5 * (direction === 'LONG' ? 1 : -1);
        } else if (progress < 0.7) {
            // go really positive, give them hope
            const hopeFactor = 1 - ((progress - 0.4) / 0.3);
            movePercent = liqPercent * 0.6 * hopeFactor * (direction === 'LONG' ? 1 : -1);
        } else {
            // crash towards liquidation
            const crashProgress = (progress - 0.7) / 0.3;
            movePercent = -liqPercent * crashProgress * 1.05 * (direction === 'LONG' ? 1 : -1);
        }

        // add noise
        movePercent += (Math.random() - 0.5) * liqPercent * 0.1;

        const simPrice = entryPrice * (1 + movePercent / 100);
        const pnl = direction === 'LONG'
            ? ((simPrice - entryPrice) / entryPrice) * selectedLev * entry
            : ((entryPrice - simPrice) / entryPrice) * selectedLev * entry;

        const pnlPercent = direction === 'LONG'
            ? ((simPrice - entryPrice) / entryPrice) * selectedLev * 100
            : ((entryPrice - simPrice) / entryPrice) * selectedLev * 100;

        simCurrent.textContent = 'current: $' + simPrice.toFixed(2);

        if (pnl >= 0) {
            pnlEl.textContent = '+$' + pnl.toFixed(4);
            pnlEl.classList.remove('negative');
        } else {
            pnlEl.textContent = '-$' + Math.abs(pnl).toFixed(4);
            pnlEl.classList.add('negative');
        }

        // bar position
        const barPercent = Math.max(5, Math.min(95, 50 + pnlPercent));
        barFill.style.width = barPercent + '%';
        priceMarker.style.left = barPercent + '%';

        if (barPercent < 20) {
            barFill.classList.add('danger');
        } else {
            barFill.classList.remove('danger');
        }
    }

    // always end in liquidation
    pnlEl.textContent = '-$' + entry.toFixed(4);
    pnlEl.classList.add('negative');
    barFill.style.width = '3%';
    barFill.classList.add('danger');
    priceMarker.style.left = '3%';

    await sleep(500);
    showResult(entry);
}

function showResult(entry) {
    simulation.classList.add('hidden');

    const roastList = selectedCoin === 'LINK' ? LINK_ROASTS : ROASTS;
    const roast = roastList[Math.floor(Math.random() * roastList.length)];

    document.getElementById('liqAmount').textContent = '-' + entry.toFixed(4) + ' ETH';
    document.getElementById('liqRoast').textContent = roast;

    result.classList.remove('hidden');
    // re-trigger shake animation
    result.style.animation = 'none';
    result.offsetHeight;
    result.style.animation = '';
}

btnLong.addEventListener('click', () => startGame('LONG'));
btnShort.addEventListener('click', () => startGame('SHORT'));

btnAgain.addEventListener('click', () => {
    result.classList.add('hidden');
    document.querySelector('.controls').classList.remove('hidden');
    fetchPrice();
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// auto refresh price
setInterval(() => {
    if (isConnected && !simulation.classList.contains('hidden') === false) {
        fetchPrice();
    }
}, 30000);
