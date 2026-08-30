// ========== CONFIGURATION ==========
const EMOJIS = ['🎮', '🎯', '🎲', '🎨', '🎭', '🎪', '🎤', '🎵'];
const TOTAL_PAIRS = 8;
const TOTAL_CARDS = TOTAL_PAIRS * 2;

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
        setTimeout(() => {
          alert(`🎉 You won in ${moves} moves and ${timer} seconds!`);
        }, 300);
      }
    } else {
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
