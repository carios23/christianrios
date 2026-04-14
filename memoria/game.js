const CARD_WIDTH = 120;
const CARD_HEIGHT = 120;
const COLS = 4;
const ROWS = 4;
const TOTAL_PAIRS = (COLS * ROWS) / 2;
const PADDING = 14;
const HEADER_HEIGHT = 100;

const GAME_WIDTH = COLS * (CARD_WIDTH + PADDING) + PADDING;
const GAME_HEIGHT = ROWS * (CARD_HEIGHT + PADDING) + PADDING + HEADER_HEIGHT;

// Ranking API endpoint — change this to your hosted URL
const RANKING_URL = 'ranking.php';

// Valle de la Luna - blue moonlit desert palette
const COLORS = {
    bg: 0x0a1628,
    cardBack: 0x132744,
    cardBorder: 0x3a7bd5,
    cardHover: 0x1a3a5c,
    accent: 0x5ba3e6,
    gold: 0xe8c84c,
    star: 0xcde0f5,
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
};

let gameInstance = null;
let playerName = '';

// --- Name overlay logic ---
const overlay = document.getElementById('name-overlay');
const nameInput = document.getElementById('player-name');
const startBtn = document.getElementById('start-btn');

// Restore last used name
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
nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame();
});
nameInput.addEventListener('input', () => {
    nameInput.style.borderColor = '#3a7bd5';
});

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#0a1628',
    scene: { preload, create, update },
};

// --- Game state ---
let cards = [];
let firstCard = null;
let secondCard = null;
let canPick = true;
let matchesFound;
let startTime = null; // set on first card click
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
        const url = URL.createObjectURL(blob);
        this.load.image(key, url);
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
    for (let i = 0; i < 70; i++) {
        const sx = Phaser.Math.Between(0, GAME_WIDTH);
        const sy = Phaser.Math.Between(0, GAME_HEIGHT);
        const size = Phaser.Math.FloatBetween(0.5, 2);
        const alpha = Phaser.Math.FloatBetween(0.15, 0.6);
        const star = this.add.circle(sx, sy, size, COLORS.star, alpha);
        this.tweens.add({
            targets: star,
            alpha: alpha * 0.2,
            duration: Phaser.Math.Between(1500, 4000),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    // Rock silhouette
    const horizon = this.add.graphics();
    horizon.fillStyle(0x061020, 0.7);
    const rockY = GAME_HEIGHT - 20;
    horizon.beginPath();
    horizon.moveTo(0, rockY);
    horizon.lineTo(30, rockY - 15);
    horizon.lineTo(70, rockY - 40);
    horizon.lineTo(100, rockY - 25);
    horizon.lineTo(140, rockY - 55);
    horizon.lineTo(180, rockY - 30);
    horizon.lineTo(230, rockY - 45);
    horizon.lineTo(280, rockY - 20);
    horizon.lineTo(330, rockY - 60);
    horizon.lineTo(380, rockY - 35);
    horizon.lineTo(430, rockY - 50);
    horizon.lineTo(480, rockY - 25);
    horizon.lineTo(GAME_WIDTH, rockY - 15);
    horizon.lineTo(GAME_WIDTH, GAME_HEIGHT);
    horizon.lineTo(0, GAME_HEIGHT);
    horizon.closePath();
    horizon.fill();

    // Moon glow
    this.add.circle(GAME_WIDTH - 60, 35, 20, COLORS.gold, 0.1);
    this.add.circle(GAME_WIDTH - 60, 35, 14, COLORS.gold, 0.2);

    // Title
    this.add.text(GAME_WIDTH / 2, 18, 'JUEGO DE MEMORIA', {
        fontSize: '24px', fontFamily: 'Georgia, serif',
        color: CSS.title, fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 42, 'Valle de la Luna', {
        fontSize: '14px', fontFamily: 'Georgia, serif',
        color: CSS.subtitle, fontStyle: 'italic',
    }).setOrigin(0.5);

    // Timer display (left)
    timerText = this.add.text(20, 68, 'Tiempo: 0:00', {
        fontSize: '16px', fontFamily: 'Georgia, serif', color: CSS.text,
    });

    // Matches display (right)
    matchesText = this.add.text(GAME_WIDTH - 20, 68, `Parejas: 0 / ${TOTAL_PAIRS}`, {
        fontSize: '16px', fontFamily: 'Georgia, serif', color: CSS.text,
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

    // Game over text (hidden)
    gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, '', {
        fontSize: '26px', fontFamily: 'Georgia, serif',
        color: CSS.winText, backgroundColor: CSS.winBg,
        padding: { x: 20, y: 10 }, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10).setVisible(false);

    // Ranking container (hidden, will be populated on win)
    this.rankingTexts = [];

    this.restartBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 130, 'JUGAR DE NUEVO', {
        fontSize: '18px', fontFamily: 'Georgia, serif',
        color: CSS.text, backgroundColor: CSS.cardBackHex,
        padding: { x: 14, y: 8 }, fontStyle: 'bold',
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
        fontSize: '40px', color: CSS.gold,
    }).setOrigin(0.5).setAlpha(0.4);

    const backContainer = scene.add.container(x, y, [back, moonIcon]);

    const frontBg = scene.add.graphics();
    frontBg.fillStyle(COLORS.cardBack);
    frontBg.fillRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 10);
    frontBg.setVisible(false);

    const photo = scene.add.image(x, y, `card${cardId}`);
    const fitSize = CARD_WIDTH - 12;
    const coverScale = Math.max(fitSize / photo.width, fitSize / photo.height);
    photo.setScale(coverScale);
    photo.setVisible(false);

    const maskGfx = scene.add.graphics();
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRoundedRect(x - fitSize / 2, y - fitSize / 2, fitSize, fitSize, 8);
    maskGfx.setVisible(false);
    photo.setMask(maskGfx.createGeometryMask());

    const border = scene.add.graphics();
    border.lineStyle(2, COLORS.accent);
    border.strokeRoundedRect(x - CARD_WIDTH / 2, y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 10);
    border.setVisible(false);

    const card = {
        back: backContainer,
        frontBg, photo, border, maskGfx,
        x, y, cardId,
        revealed: false,
        matched: false,
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
    gfx.fillRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 10);
    gfx.lineStyle(2, hovered ? COLORS.accent : COLORS.cardBorder);
    gfx.strokeRoundedRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 10);
}

function revealCard(scene, card) {
    card.revealed = true;
    card.back.setVisible(false);
    card.frontBg.setVisible(true);
    card.photo.setVisible(true);
    card.border.setVisible(true);

    card.photo.setScale(0);
    const fitSize = CARD_WIDTH - 12;
    const src = scene.textures.get(`card${card.cardId}`).getSourceImage();
    const targetScale = Math.max(fitSize / src.width, fitSize / src.height);
    scene.tweens.add({
        targets: card.photo,
        scaleX: targetScale,
        scaleY: targetScale,
        duration: 250,
        ease: 'Back.easeOut',
    });
}

function hideCard(scene, card) {
    scene.tweens.add({
        targets: card.photo,
        scaleX: 0,
        scaleY: 0,
        duration: 180,
        ease: 'Quad.easeIn',
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

    // Start timer on first ever click
    if (!startTime) {
        startTime = Date.now();
    }

    revealCard(scene, card);

    if (!firstCard) {
        firstCard = card;
        return;
    }

    secondCard = card;
    canPick = false;

    if (firstCard.cardId === secondCard.cardId) {
        firstCard.matched = true;
        secondCard.matched = true;
        matchesFound++;
        updateUI();

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

function updateUI() {
    matchesText.setText(`Parejas: ${matchesFound} / ${TOTAL_PAIRS}`);
}

async function showGameOver(scene) {
    const finalTime = elapsed;

    gameOverText.setText(`\u00a1GANASTE!  ${formatTime(finalTime)}`);
    gameOverText.setVisible(true);
    scene.restartBtn.setVisible(true);

    // Submit ranking
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
        // If ranking fails (e.g. no PHP), show offline message
        showRankingOffline(scene, finalTime);
    }
}

function showRanking(scene, rankings, myTime) {
    const baseY = GAME_HEIGHT / 2 - 10;
    const myTimeRounded = Math.round(myTime * 100) / 100;

    scene.add.text(GAME_WIDTH / 2, baseY, 'RANKING', {
        fontSize: '18px', fontFamily: 'Georgia, serif',
        color: CSS.gold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    const top = rankings.slice(0, 10);
    top.forEach((entry, i) => {
        const y = baseY + 22 + i * 20;
        const pos = `#${i + 1}`;
        const time = formatTime(entry.time);
        const isMe = entry.name === playerName && Math.abs(entry.time - myTimeRounded) < 0.1;
        const color = isMe ? CSS.gold : CSS.text;
        const prefix = isMe ? '\u25B6 ' : '  ';

        scene.add.text(GAME_WIDTH / 2, y, `${prefix}${pos}  ${entry.name}  ${time}`, {
            fontSize: '14px', fontFamily: 'Georgia, serif',
            color: color,
        }).setOrigin(0.5).setDepth(10);
    });
}

function showRankingOffline(scene, myTime) {
    const baseY = GAME_HEIGHT / 2 - 10;

    scene.add.text(GAME_WIDTH / 2, baseY, `${playerName}  -  ${formatTime(myTime)}`, {
        fontSize: '16px', fontFamily: 'Georgia, serif',
        color: CSS.text,
    }).setOrigin(0.5).setDepth(10);

    scene.add.text(GAME_WIDTH / 2, baseY + 24, 'Ranking no disponible', {
        fontSize: '12px', fontFamily: 'Georgia, serif',
        color: CSS.subtitle, fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(10);
}
