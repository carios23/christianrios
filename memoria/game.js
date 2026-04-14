// --- Responsive sizing ---
const COLS = 4;
const ROWS = 4;
const TOTAL_PAIRS = (COLS * ROWS) / 2;

// Fit to screen width (max 536px for desktop, scale down for mobile)
const MAX_WIDTH = 536;
const SCREEN_W = Math.min(window.innerWidth, MAX_WIDTH);
const PADDING = Math.round(SCREEN_W * 0.026);
const CARD_WIDTH = Math.floor((SCREEN_W - PADDING * (COLS + 1)) / COLS);
const CARD_HEIGHT = CARD_WIDTH;
const HEADER_HEIGHT = Math.round(SCREEN_W * 0.17);

const GAME_WIDTH = COLS * (CARD_WIDTH + PADDING) + PADDING;
const GAME_HEIGHT = ROWS * (CARD_HEIGHT + PADDING) + PADDING + HEADER_HEIGHT;

// Font sizes scale with card size
const FONT = {
    title: Math.round(CARD_WIDTH * 0.2) + 'px',
    subtitle: Math.round(CARD_WIDTH * 0.11) + 'px',
    hud: Math.round(CARD_WIDTH * 0.13) + 'px',
    moon: Math.round(CARD_WIDTH * 0.33) + 'px',
    win: Math.round(CARD_WIDTH * 0.2) + 'px',
    rank: Math.round(CARD_WIDTH * 0.13) + 'px',
    rankHead: Math.round(CARD_WIDTH * 0.15) + 'px',
    btn: Math.round(CARD_WIDTH * 0.14) + 'px',
};

// Ranking API endpoint
const RANKING_URL = 'ranking.php';

// Valle de la Luna - blue palette
const COLORS = {
    bg: 0x0a1628,
    cardBack: 0x132744,
    cardBorder: 0x3a7bd5,
    cardHover: 0x1a3a5c,
    accent: 0x5ba3e6,
    gold: 0xe8c84c,
    star: 0xcde0f5,
    rankBg: 0x0e1e38,
    rankRow: 0x162d50,
    rankRowAlt: 0x132744,
    rankHighlight: 0x2a4a70,
};

const CSS = {
    title: '#5ba3e6',
    subtitle: '#8ab8d9',
    text: '#c0d8ef',
    accent: '#5ba3e6',
    gold: '#e8c84c',
    winBg: '#5ba3e6',
    winText: '#0a1628',
    cardBackHex: '#132744',
    dim: '#6a8aaa',
};

let gameInstance = null;
let playerName = '';

// --- Name overlay ---
const overlay = document.getElementById('name-overlay');
const nameInput = document.getElementById('player-name');
const startBtn = document.getElementById('start-btn');

const savedName = localStorage.getItem('memoria_player_name');
if (savedName) nameInput.value = savedName;

function startGame() {
    const name = nameInput.value.trim();
    if (!name) {
        nameInput.style.borderColor = '#e85050';
        nameInput.focus();
        return;
    }
    playerName = name;
    localStorage.setItem('memoria_player_name', name);
    overlay.classList.add('hidden');

    if (!gameInstance) {
        gameInstance = new Phaser.Game(config);
    } else {
        gameInstance.scene.scenes[0].scene.restart();
    }
}

startBtn.addEventListener('click', startGame);
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') startGame(); });
nameInput.addEventListener('input', () => { nameInput.style.borderColor = '#3a7bd5'; });

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#0a1628',
    scene: { preload, create, update },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
};

// --- Game state ---
let cards = [];
let firstCard = null;
let secondCard = null;
let canPick = true;
let matchesFound;
let startTime = null;
let elapsed = 0;
let gameFinished = false;
let timerText, matchesText, gameOverText;

function preload() {
    for (let i = 1; i <= TOTAL_PAIRS; i++) {
        const key = `card${i}`;
        const dataUri = CARD_IMAGES[key];
        const byteString = atob(dataUri.split(',')[1]);
        const mimeType = dataUri.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let j = 0; j < byteString.length; j++) {
            ia[j] = byteString.charCodeAt(j);
        }
        const blob = new Blob([ab], { type: mimeType });
        this.load.image(key, URL.createObjectURL(blob));
    }
}

function create() {
    matchesFound = 0;
    firstCard = null;
    secondCard = null;
    canPick = true;
    startTime = null;
    elapsed = 0;
    gameFinished = false;
    cards = [];

    // Starfield
    for (let i = 0; i < 50; i++) {
        const sx = Phaser.Math.Between(0, GAME_WIDTH);
        const sy = Phaser.Math.Between(0, GAME_HEIGHT);
        const size = Phaser.Math.FloatBetween(0.5, 1.5);
        const alpha = Phaser.Math.FloatBetween(0.15, 0.5);
        const star = this.add.circle(sx, sy, size, COLORS.star, alpha);
        this.tweens.add({
            targets: star, alpha: alpha * 0.2,
            duration: Phaser.Math.Between(1500, 4000),
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
    }

    // Moon glow
    this.add.circle(GAME_WIDTH - 40, 25, 14, COLORS.gold, 0.1);
    this.add.circle(GAME_WIDTH - 40, 25, 10, COLORS.gold, 0.2);

    // Title
    this.add.text(GAME_WIDTH / 2, HEADER_HEIGHT * 0.2, 'JUEGO DE MEMORIA', {
        fontSize: FONT.title, fontFamily: 'Georgia, serif',
        color: CSS.title, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, HEADER_HEIGHT * 0.45, 'Valle de la Luna', {
        fontSize: FONT.subtitle, fontFamily: 'Georgia, serif',
        color: CSS.subtitle, fontStyle: 'italic',
    }).setOrigin(0.5);

    timerText = this.add.text(PADDING, HEADER_HEIGHT * 0.72, 'Tiempo: 0:00', {
        fontSize: FONT.hud, fontFamily: 'Georgia, serif', color: CSS.text,
    });

    matchesText = this.add.text(GAME_WIDTH - PADDING, HEADER_HEIGHT * 0.72, `Parejas: 0/${TOTAL_PAIRS}`, {
        fontSize: FONT.hud, fontFamily: 'Georgia, serif', color: CSS.text,
    }).setOrigin(1, 0);

    // Build deck
    let deck = [];
    for (let i = 1; i <= TOTAL_PAIRS; i++) deck.push(i, i);
    Phaser.Utils.Array.Shuffle(deck);

    const startX = PADDING + CARD_WIDTH / 2;
    const startY = HEADER_HEIGHT + PADDING + CARD_HEIGHT / 2;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const x = startX + c * (CARD_WIDTH + PADDING);
            const y = startY + r * (CARD_HEIGHT + PADDING);
            createCard(this, x, y, deck[r * COLS + c]);
        }
    }

    // Win text (hidden)
    gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - CARD_HEIGHT * 1.6, '', {
        fontSize: FONT.win, fontFamily: 'Georgia, serif',
        color: CSS.winText, backgroundColor: CSS.winBg,
        padding: { x: 16, y: 8 }, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10).setVisible(false);

    // Replay button (hidden)
    this.restartBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + CARD_HEIGHT * 1.8, 'JUGAR DE NUEVO', {
        fontSize: FONT.btn, fontFamily: 'Georgia, serif',
        color: CSS.text, backgroundColor: CSS.cardBackHex,
        padding: { x: 12, y: 6 }, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10).setVisible(false).setInteractive({ useHandCursor: true });

    this.restartBtn.on('pointerover', () => this.restartBtn.setStyle({ color: CSS.accent }));
    this.restartBtn.on('pointerout', () => this.restartBtn.setStyle({ color: CSS.text }));
    this.restartBtn.on('pointerdown', () => this.scene.restart());
}

function update() {
    if (startTime && !gameFinished) {
        elapsed = (Date.now() - startTime) / 1000;
        timerText.setText(`Tiempo: ${formatTime(elapsed)}`);
    }
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function createCard(scene, x, y, cardId) {
    const back = scene.add.graphics();
    drawCardBack(back, false);

    const moonIcon = scene.add.text(0, 0, '\u263D', {
        fontSize: FONT.moon, color: CSS.gold,
    }).setOrigin(0.5).setAlpha(0.4);

    const backContainer = scene.add.container(x, y, [back, moonIcon]);

    const frontBg = scene.add.graphics();
    frontBg.fillStyle(COLORS.cardBack);
    frontBg.fillRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8);
    frontBg.setVisible(false);

    const photo = scene.add.image(x, y, `card${cardId}`);
    const fitSize = CARD_WIDTH - 10;
    const coverScale = Math.max(fitSize / photo.width, fitSize / photo.height);
    photo.setScale(coverScale);
    photo.setVisible(false);

    const maskGfx = scene.add.graphics();
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRoundedRect(x - fitSize / 2, y - fitSize / 2, fitSize, fitSize, 6);
    maskGfx.setVisible(false);
    photo.setMask(maskGfx.createGeometryMask());

    const border = scene.add.graphics();
    border.lineStyle(2, COLORS.accent);
    border.strokeRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8);
    border.setVisible(false);

    const card = {
        back: backContainer, frontBg, photo, border, maskGfx,
        x, y, cardId, revealed: false, matched: false,
    };

    backContainer.setSize(CARD_WIDTH, CARD_HEIGHT);
    backContainer.setInteractive({ useHandCursor: true });
    backContainer.on('pointerdown', () => onCardClick(scene, card));
    backContainer.on('pointerover', () => {
        if (!card.revealed && !card.matched && canPick) drawCardBack(back, true);
    });
    backContainer.on('pointerout', () => {
        if (!card.revealed && !card.matched) drawCardBack(back, false);
    });

    cards.push(card);
}

function drawCardBack(gfx, hovered) {
    gfx.clear();
    gfx.fillStyle(hovered ? COLORS.cardHover : COLORS.cardBack);
    gfx.fillRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8);
    gfx.lineStyle(2, hovered ? COLORS.accent : COLORS.cardBorder);
    gfx.strokeRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 8);
}

function revealCard(scene, card) {
    card.revealed = true;
    card.back.setVisible(false);
    card.frontBg.setVisible(true);
    card.photo.setVisible(true);
    card.border.setVisible(true);

    card.photo.setScale(0);
    const fitSize = CARD_WIDTH - 10;
    const src = scene.textures.get(`card${card.cardId}`).getSourceImage();
    const targetScale = Math.max(fitSize / src.width, fitSize / src.height);
    scene.tweens.add({
        targets: card.photo,
        scaleX: targetScale, scaleY: targetScale,
        duration: 250, ease: 'Back.easeOut',
    });
}

function hideCard(scene, card) {
    scene.tweens.add({
        targets: card.photo, scaleX: 0, scaleY: 0,
        duration: 180, ease: 'Quad.easeIn',
        onComplete: () => {
            card.revealed = false;
            card.photo.setVisible(false);
            card.border.setVisible(false);
            card.frontBg.setVisible(false);
            card.back.setVisible(true);
        },
    });
}

function onCardClick(scene, card) {
    if (!canPick || card.revealed || card.matched || gameFinished) return;
    if (!startTime) startTime = Date.now();

    revealCard(scene, card);

    if (!firstCard) { firstCard = card; return; }

    secondCard = card;
    canPick = false;

    if (firstCard.cardId === secondCard.cardId) {
        firstCard.matched = true;
        secondCard.matched = true;
        matchesFound++;
        matchesText.setText(`Parejas: ${matchesFound}/${TOTAL_PAIRS}`);

        scene.tweens.add({ targets: firstCard.photo, alpha: 0.55, duration: 400 });
        scene.tweens.add({ targets: secondCard.photo, alpha: 0.55, duration: 400 });

        firstCard = null;
        secondCard = null;
        canPick = true;

        if (matchesFound === TOTAL_PAIRS) {
            gameFinished = true;
            showGameOver(scene);
        }
    } else {
        scene.time.delayedCall(900, () => {
            hideCard(scene, firstCard);
            hideCard(scene, secondCard);
            scene.time.delayedCall(250, () => {
                firstCard = null;
                secondCard = null;
                canPick = true;
            });
        });
    }
}

// --- Dim overlay behind ranking ---
function addDimOverlay(scene) {
    const dim = scene.add.graphics();
    dim.fillStyle(0x000000, 0.65);
    dim.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    dim.setDepth(9);
}

async function showGameOver(scene) {
    const finalTime = elapsed;

    addDimOverlay(scene);

    gameOverText.setText(`\u00a1GANASTE!  ${formatTime(finalTime)}`);
    gameOverText.setVisible(true);
    scene.restartBtn.setVisible(true);

    try {
        const res = await fetch(RANKING_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: playerName, time: Math.round(finalTime * 100) / 100 }),
        });
        const data = await res.json();
        if (data.rankings) {
            showRanking(scene, data.rankings, finalTime);
        }
    } catch (e) {
        showRankingOffline(scene, finalTime);
    }
}

function showRanking(scene, rankings, myTime) {
    const top = rankings.slice(0, 10);
    const myTimeRounded = Math.round(myTime * 100) / 100;

    const tableW = GAME_WIDTH * 0.82;
    const rowH = Math.round(CARD_WIDTH * 0.22);
    const headerH = Math.round(rowH * 1.1);
    const tableH = headerH + top.length * rowH;
    const tableX = (GAME_WIDTH - tableW) / 2;
    const tableY = GAME_HEIGHT / 2 - tableH / 2 - rowH * 0.3;

    const gfx = scene.add.graphics().setDepth(10);

    // Table background
    gfx.fillStyle(COLORS.rankBg);
    gfx.fillRoundedRect(tableX, tableY, tableW, tableH + 4, 8);

    // Header
    gfx.fillStyle(0x1a3a5c);
    gfx.fillRoundedRect(tableX, tableY, tableW, headerH, { tl: 8, tr: 8, bl: 0, br: 0 });

    const colPos = tableX + 10;
    const colName = tableX + tableW * 0.15;
    const colTime = tableX + tableW * 0.78;
    const fontSize = parseInt(FONT.rank);

    scene.add.text(colPos, tableY + headerH / 2, '#', {
        fontSize: FONT.rank, fontFamily: 'Georgia, serif',
        color: CSS.gold, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(10);

    scene.add.text(colName, tableY + headerH / 2, 'Jugador', {
        fontSize: FONT.rank, fontFamily: 'Georgia, serif',
        color: CSS.gold, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(10);

    scene.add.text(colTime, tableY + headerH / 2, 'Tiempo', {
        fontSize: FONT.rank, fontFamily: 'Georgia, serif',
        color: CSS.gold, fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(10);

    // Rows
    top.forEach((entry, i) => {
        const rowY = tableY + headerH + i * rowH;
        const isMe = entry.name === playerName && Math.abs(entry.time - myTimeRounded) < 0.1;
        const isLast = i === top.length - 1;

        // Row background
        const rowColor = isMe ? COLORS.rankHighlight : (i % 2 === 0 ? COLORS.rankRow : COLORS.rankRowAlt);
        gfx.fillStyle(rowColor);
        if (isLast) {
            gfx.fillRoundedRect(tableX, rowY, tableW, rowH, { tl: 0, tr: 0, bl: 8, br: 8 });
        } else {
            gfx.fillRect(tableX, rowY, tableW, rowH);
        }

        const textColor = isMe ? CSS.gold : CSS.text;
        const cy = rowY + rowH / 2;

        scene.add.text(colPos, cy, `${i + 1}`, {
            fontSize: FONT.rank, fontFamily: 'Georgia, serif',
            color: isMe ? CSS.gold : CSS.dim,
        }).setOrigin(0, 0.5).setDepth(10);

        scene.add.text(colName, cy, entry.name, {
            fontSize: FONT.rank, fontFamily: 'Georgia, serif',
            color: textColor, fontStyle: isMe ? 'bold' : 'normal',
        }).setOrigin(0, 0.5).setDepth(10);

        scene.add.text(colTime, cy, formatTime(entry.time), {
            fontSize: FONT.rank, fontFamily: 'Georgia, serif',
            color: textColor, fontStyle: isMe ? 'bold' : 'normal',
        }).setOrigin(0, 0.5).setDepth(10);
    });
}

function showRankingOffline(scene, myTime) {
    const cy = GAME_HEIGHT / 2;

    scene.add.text(GAME_WIDTH / 2, cy, `${playerName}  -  ${formatTime(myTime)}`, {
        fontSize: FONT.hud, fontFamily: 'Georgia, serif', color: CSS.text,
    }).setOrigin(0.5).setDepth(10);

    scene.add.text(GAME_WIDTH / 2, cy + 22, 'Ranking no disponible', {
        fontSize: FONT.subtitle, fontFamily: 'Georgia, serif',
        color: CSS.subtitle, fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(10);
}
