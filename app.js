// ========== CONFIGURATION ==========
const THEMES = {
  animals: ['🐶', '🐱', '🐰', '🦊', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥'],
  food: ['🍕', '🍔', '🌮', '🥗', '🍣', '🍜', '🍝', '🍛', '🍩', '🍪', '🍰', '🧁', '🍫', '🍭', '🍦', '🍧', '🍨', '🍩'],
  flags: ['🇺🇸', '🇬🇧', '🇫🇷', '🇩🇪', '🇯🇵', '🇨🇳', '🇮🇳', '🇧🇷', '🇦🇺', '🇨🇦', '🇮🇹', '🇪🇸', '🇲🇽', '🇰🇷', '🇷🇺', '🇿🇦', '🇳🇬', '🇰🇪'],
  nature: ['🌺', '🌸', '🌻', '🌷', '🌹', '🌿', '🍃', '🌱', '🌲', '🌳', '🌵', '🌴', '☀️', '🌈', '⛅', '🌊', '❄️', '🔥']
};

const DIFFICULTY_CONFIG = {
  easy:   { cols: 4, pairs: 8 },
  medium: { cols: 4, pairs: 12 },
  hard:   { cols: 6, pairs: 18 }
};

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
  },

  gameOver() {
    this.playTone(300, 0.3, 'sawtooth', 0.15);
    setTimeout(() => this.playTone(200, 0.4, 'sawtooth', 0.15), 150);
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

  setTimeout(() => {
    document.querySelectorAll('[style*="confettiFall"]').forEach(el => el.remove());
  }, 4000);
}

// ========== STATE ==========
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let totalPairs = 8;
let moves = 0;
let timer = 0;
let timerInterval = null;
let isLocked = false;
let bestScore = localStorage.getItem('memoryMatchBest') || null;
let currentDifficulty = 'medium';
let currentTheme = 'food';
let currentMode = 'classic';

// Power-up state
let peekCount = 2;
let timeCount = 2;
let hintCount = 1;
let isPeeking = false;
let hintTimeout = null;

// Timed mode state
let timeLimit = 60;
let isGameOver = false;

// ========== DOM REFS ==========
const board = document.getElementById('game-board');
const movesDisplay = document.getElementById('moves');
const timerDisplay = document.getElementById('timer');
const bestScoreDisplay = document.getElementById('best-score');
const resetBtn = document.getElementById('reset-btn');
const difficultySelect = document.getElementById('difficulty');
const themeSelect = document.getElementById('theme');
const peekBtn = document.getElementById('peek-btn');
const timeBtn = document.getElementById('time-btn');
const hintBtn = document.getElementById('hint-btn');

// ========== ADD MODE SELECTOR TO DOM ==========
// Add this dynamically since we don't want to modify HTML again
const controlsDiv = document.querySelector('.controls');
const modeSelect = document.createElement('select');
modeSelect.id = 'mode';
modeSelect.innerHTML = `
  <option value="classic">🎯 Classic</option>
  <option value="timed">⏱️ Timed</option>
  <option value="zen">🧘 Zen</option>
`;
const modeLabel = document.createElement('label');
modeLabel.htmlFor = 'mode';
modeLabel.textContent = 'Mode:';
controlsDiv.appendChild(modeLabel);
controlsDiv.appendChild(modeSelect);

// ========== MODE HELPERS ==========
function updateModeUI() {
  const isTimed = currentMode === 'timed';
  const isZen = currentMode === 'zen';
  
  // Timer display
  if (isTimed) {
    timerDisplay.textContent = timeLimit - timer;
  } else if (isZen) {
    timerDisplay.textContent = '∞';
  } else {
    timerDisplay.textContent = timer;
  }

  // Moves display
  if (isZen) {
    movesDisplay.textContent = '—';
  } else {
    movesDisplay.textContent = moves;
  }

  // Best score
  if (isZen || isTimed) {
    bestScoreDisplay.textContent = '—';
  } else {
    bestScoreDisplay.textContent = bestScore ? `${bestScore}s` : '—';
  }

  // Power-ups – disabled in Zen mode
  const powerupsDisabled = isZen || isGameOver;
  peekBtn.disabled = powerupsDisabled || peekCount <= 0 || isPeeking;
  timeBtn.disabled = powerupsDisabled || timeCount <= 0;
  hintBtn.disabled = powerupsDisabled || hintCount <= 0;
}

// ========== INIT ==========
function initGame() {
  clearInterval(timerInterval);
  timer = 0;
  moves = 0;
  matchedPairs = 0;
  flippedCards = [];
  isLocked = false;
  timerInterval = null;
  isGameOver = false;
  
  // Reset power-ups
  peekCount = 2;
  timeCount = 2;
  hintCount = 1;
  isPeeking = false;
  if (hintTimeout) {
    clearTimeout(hintTimeout);
    hintTimeout = null;
  }

  movesDisplay.textContent = moves;
  timerDisplay.textContent = currentMode === 'timed' ? timeLimit : currentMode === 'zen' ? '∞' : '0';
  bestScoreDisplay.textContent = currentMode === 'classic' ? (bestScore ? `${bestScore}s` : '—') : '—';

  const config = DIFFICULTY_CONFIG[currentDifficulty];
  totalPairs = config.pairs;
  board.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;

  const themeEmojis = THEMES[currentTheme];
  const shuffledEmojis = shuffle([...themeEmojis]);
  const selectedEmojis = shuffledEmojis.slice(0, totalPairs);
  
  const deck = [];
  selectedEmojis.forEach(emoji => {
    deck.push(emoji, emoji);
  });
  shuffle(deck);
  
  cards = deck.map((emoji, index) => ({
    id: index,
    emoji: emoji,
    flipped: false,
    matched: false
  }));

  renderBoard();
  updateModeUI();
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

// ========== POWER-UP HELPERS ==========
function updatePowerupButtons() {
  if (currentMode === 'zen' || isGameOver) {
    peekBtn.textContent = `👀 Peek (${peekCount})`;
    peekBtn.disabled = true;
    timeBtn.textContent = `⏱️ +5s (${timeCount})`;
    timeBtn.disabled = true;
    hintBtn.textContent = `💡 Hint (${hintCount})`;
    hintBtn.disabled = true;
    return;
  }

  peekBtn.textContent = `👀 Peek (${peekCount})`;
  peekBtn.disabled = peekCount <= 0 || isPeeking;
  
  timeBtn.textContent = `⏱️ +5s (${timeCount})`;
  timeBtn.disabled = timeCount <= 0;
  
  hintBtn.textContent = `💡 Hint (${hintCount})`;
  hintBtn.disabled = hintCount <= 0;
}

// ========== POWER-UP: PEEK ==========
function usePeek() {
  if (isPeeking || peekCount <= 0) return;
  if (matchedPairs === totalPairs) return;
  if (isGameOver) return;
  if (currentMode === 'zen') return;

  peekCount--;
  isPeeking = true;
  updatePowerupButtons();

  cards.forEach(card => {
    if (!card.matched && !card.flipped) {
      card.flipped = true;
    }
  });
  renderBoard();

  setTimeout(() => {
    cards.forEach(card => {
      if (!card.matched && card.flipped) {
        card.flipped = false;
      }
    });
    isPeeking = false;
    renderBoard();
    updatePowerupButtons();
  }, 1500);
}

// ========== POWER-UP: EXTRA TIME ==========
function useExtraTime() {
  if (timeCount <= 0) return;
  if (matchedPairs === totalPairs) return;
  if (isGameOver) return;
  if (currentMode !== 'timed') return;

  timeCount--;
  timer = Math.max(0, timer - 5); // Add 5 seconds (subtract from elapsed)
  timerDisplay.textContent = timeLimit - timer;
  updatePowerupButtons();
  
  timeBtn.style.borderColor = '#48dbfb';
  setTimeout(() => {
    timeBtn.style.borderColor = '';
  }, 500);
}

// ========== POWER-UP: HINT ==========
function useHint() {
  if (hintCount <= 0) return;
  if (matchedPairs === totalPairs) return;
  if (isLocked) return;
  if (isGameOver) return;
  if (currentMode === 'zen') return;

  hintCount--;
  updatePowerupButtons();

  const unmatched = cards.filter(c => !c.matched && !c.flipped);
  if (unmatched.length < 2) return;

  let pair = null;
  for (let i = 0; i < unmatched.length; i++) {
    for (let j = i + 1; j < unmatched.length; j++) {
      if (unmatched[i].emoji === unmatched[j].emoji) {
        pair = [unmatched[i], unmatched[j]];
        break;
      }
    }
    if (pair) break;
  }

  if (!pair) return;

  pair.forEach(c => c.flipped = true);
  renderBoard();

  setTimeout(() => {
    pair.forEach(c => c.flipped = false);
    renderBoard();
  }, 1000);
}

// ========== GAME LOGIC ==========
function handleCardClick(id) {
  if (isLocked || matchedPairs === totalPairs) return;
  if (isPeeking) return;
  if (isGameOver) return;

  const card = cards.find(c => c.id === id);
  if (!card || card.flipped || card.matched) return;

  card.flipped = true;
  flippedCards.push(card);
  SoundManager.flip();
  renderBoard();

  // Start timer on first move (except Zen mode)
  if (moves === 0 && !timerInterval && currentMode !== 'zen') {
    if (currentMode === 'timed') {
      // Timed mode: countdown
      timerInterval = setInterval(() => {
        timer++;
        const remaining = timeLimit - timer;
        timerDisplay.textContent = remaining;
        
        // Visual warning when time is low
        if (remaining <= 10) {
          timerDisplay.style.color = '#ff6b6b';
        }
        
        if (remaining <= 0) {
          clearInterval(timerInterval);
          timerInterval = null;
          gameOver();
        }
      }, 1000);
    } else {
      // Classic mode: count up
      timerInterval = setInterval(() => {
        timer++;
        timerDisplay.textContent = timer;
      }, 1000);
    }
  }

  if (flippedCards.length === 2) {
    if (currentMode !== 'zen') {
      moves++;
      movesDisplay.textContent = moves;
    }
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

      if (matchedPairs === totalPairs) {
        clearInterval(timerInterval);
        timerInterval = null;
        timerDisplay.style.color = '';
        
        if (currentMode === 'classic') {
          updateBestScore();
        }
        SoundManager.win();
        createConfetti();
        setTimeout(() => {
          if (currentMode === 'zen') {
            alert(`🧘 You completed the game in peace!`);
          } else if (currentMode === 'timed') {
            alert(`⏱️ You won with ${timeLimit - timer} seconds remaining!`);
          } else {
            alert(`🎉 You won in ${moves} moves and ${timer} seconds!`);
          }
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

// ========== GAME OVER (Timed Mode) ==========
function gameOver() {
  isGameOver = true;
  isLocked = true;
  SoundManager.gameOver();
  timerDisplay.style.color = '#ff6b6b';
  
  // Flip all cards face down
  cards.forEach(card => {
    if (!card.matched) {
      card.flipped = false;
    }
  });
  renderBoard();
  
  setTimeout(() => {
    alert('⏰ Time is up! Click "New Game" to try again.');
    timerDisplay.style.color = '';
  }, 300);
}

// ========== BEST SCORE ==========
function updateBestScore() {
  if (!bestScore || timer < bestScore) {
    bestScore = timer;
    localStorage.setItem('memoryMatchBest', bestScore);
    bestScoreDisplay.textContent = `${bestScore}s`;
  }
}

// ========== EVENT LISTENERS ==========
difficultySelect.addEventListener('change', function() {
  currentDifficulty = this.value;
  initGame();
});

themeSelect.addEventListener('change', function() {
  currentTheme = this.value;
  initGame();
});

modeSelect.addEventListener('change', function() {
  currentMode = this.value;
  initGame();
});

resetBtn.addEventListener('click', initGame);
peekBtn.addEventListener('click', usePeek);
timeBtn.addEventListener('click', useExtraTime);
hintBtn.addEventListener('click', useHint);

// ========== START ==========
initGame();