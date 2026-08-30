// ========== CONFIGURATION ==========
const EMOJIS = ['🎮', '🎯', '🎲', '🎨', '🎭', '🎪', '🎤', '🎵'];
const TOTAL_PAIRS = 8;
const TOTAL_CARDS = TOTAL_PAIRS * 2;

// ========== SOUND MANAGER ==========
const SoundManager = {
  audioCtx: null,

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  playTone(freq, duration, type = 'sine', volume = 0.2) {
    try {
      this.init();
      const oscillator = this.audioCtx.createOscillator();
      const gainNode = this.audioCtx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = freq;
      gainNode.gain.value = volume;
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      oscillator.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      oscillator.start();
      oscillator.stop(this.audioCtx.currentTime + duration);
    } catch (e) { /* silent fail */ }
  },

  flip() {
    this.playTone(600, 0.08, 'sine', 0.15);
  },

  match() {
    this.playTone(880, 0.15, 'sine', 0.2);
    setTimeout(() => this.playTone(1100, 0.15, 'sine', 0.2), 100);
  },

  mismatch() {
    this.playTone(300, 0.3, 'sawtooth', 0.1);
  },

  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.15), i * 120);
    });
  }
};

// ========== CONFETTI ==========
function createConfetti() {
  const container = document.body;
  const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#5f27cd', '#ff9ff3', '#f368e0', '#00d2d3'];
  const confettiCount = 150;

  for (let i = 0; i < confettiCount; i++) {
    const el = document.createElement('div');
    const size = Math.random() * 8 + 4;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 1.5;
    const duration = Math.random() * 2 + 2;
    const rotateStart = Math.random() * 360;

    el.style.cssText = `
      position: fixed;
      width: ${size}px;
      height: ${size * 0.6}px;
      background: ${color};
      left: ${left}%;
      top: -20px;
      border-radius: 2px;
      transform: rotate(${rotateStart}deg);
      pointer-events: none;
      z-index: 9999;
      animation: confettiFall ${duration}s ease-in ${delay}s forwards;
    `;
    container.appendChild(el);
  }

  // Add keyframes once
  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.textContent = `
      @keyframes confettiFall {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Cleanup after animation
  setTimeout(() => {
    document.querySelectorAll('[style*="confettiFall"]').forEach(el => el.remove());
  }, 4000);
}

// ========== STATE ==========
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timer = 0;
let timerInterval = null;
let isLocked = false;
let bestScore = localStorage.getItem('memoryMatchBest') || null;

// ========== DOM REFS ==========
const board = document.getElementById('game-board');
const movesDisplay = document.getElementById('moves');
const timerDisplay = document.getElementById('timer');
const bestScoreDisplay = document.getElementById('best-score');
const resetBtn = document.getElementById('reset-btn');

// ========== INIT ==========
function initGame() {
  clearInterval(timerInterval);
  timer = 0;
  moves = 0;
  matchedPairs = 0;
  flippedCards = [];
  isLocked = false;
  timerInterval = null;

  movesDisplay.textContent = moves;
  timerDisplay.textContent = timer;
  bestScoreDisplay.textContent = bestScore ? `${bestScore}s` : '—';

  const deck = [...EMOJIS, ...EMOJIS];
  shuffle(deck);
  
  cards = deck.map((emoji, index) => ({
    id: index,
    emoji: emoji,
    flipped: false,
    matched: false
  }));

  renderBoard();
}

// ========== SHUFFLE ==========
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ========== RENDER ==========
function renderBoard() {
  board.innerHTML = '';
  cards.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    if (card.flipped) cardEl.classList.add('flipped');
    if (card.matched) cardEl.classList.add('matched');
    
    cardEl.dataset.id = card.id;
    cardEl.innerHTML = `<span class="card-content">${card.emoji}</span>`;
    cardEl.addEventListener('click', () => handleCardClick(card.id));
    board.appendChild(cardEl);
  });
}

// ========== GAME LOGIC ==========
function handleCardClick(id) {
  if (isLocked || matchedPairs === TOTAL_PAIRS) return;

  const card = cards.find(c => c.id === id);
  if (!card || card.flipped || card.matched) return;

  card.flipped = true;
  flippedCards.push(card);
  SoundManager.flip();
  renderBoard();

  if (moves === 0 && !timerInterval) {
    timerInterval = setInterval(() => {
      timer++;
      timerDisplay.textContent = timer;
    }, 1000);
  }

  if (flippedCards.length === 2) {
    moves++;
    movesDisplay.textContent = moves;
    isLocked = true;

    const [card1, card2] = flippedCards;
    const isMatch = card1.emoji === card2.emoji;

    if (isMatch) {
      SoundManager.match();
      card1.matched = true;
      card2.matched = true;
      matchedPairs++;
      flippedCards = [];
      isLocked = false;
      renderBoard();

      if (matchedPairs === TOTAL_PAIRS) {
        clearInterval(timerInterval);
        timerInterval = null;
        updateBestScore();
        SoundManager.win();
        createConfetti();
        setTimeout(() => {
          alert(`🎉 You won in ${moves} moves and ${timer} seconds!`);
        }, 300);
      }
    } else {
      SoundManager.mismatch();
      setTimeout(() => {
        card1.flipped = false;
        card2.flipped = false;
        flippedCards = [];
        isLocked = false;
        renderBoard();
      }, 800);
    }
  }
}

// ========== BEST SCORE ==========
function updateBestScore() {
  if (!bestScore || timer < bestScore) {
    bestScore = timer;
    localStorage.setItem('memoryMatchBest', bestScore);
    bestScoreDisplay.textContent = `${bestScore}s`;
  }
}

// ========== RESET ==========
resetBtn.addEventListener('click', initGame);

// ========== START ==========
initGame();