// Game Configuration
const STORES = ['🍞 Bakery', '📚 Stationary Store', '🛒 Supermarket', '🏪 Convenience Store', '🍔 Hamburger Store', '🏥 Hospital'];
const STREETS = ['A', 'B'];
const POSITIONS = [1, 2, 3];

// Game Levels Data
const LEVELS = [
    {
        id: 1,
        clues: [
            'The Hamburger Store is on Street A',
            'The Hospital is adjacent to the Supermarket on the same street',
            'The Bakery is at position 1 on Street B'
        ],
        correctAnswer: {
            A1: '🍔 Hamburger Store',
            A2: '📚 Stationary Store',
            A3: '🛒 Supermarket',
            B1: '🍞 Bakery',
            B2: '🏪 Convenience Store',
            B3: '🏥 Hospital'
        },
        question: 'Which store is at position 2 on Street A?',
        options: ['🍞 Bakery', '📚 Stationary Store', '🛒 Supermarket', '🏪 Convenience Store']
    },
    {
        id: 2,
        clues: [
            'The Supermarket is not adjacent to the Hospital',
            'The Stationary Store is between the Bakery and the Hamburger Store',
            'The Convenience Store is on Street B at position 3',
            'The Bakery is on the same side as the Hospital'
        ],
        correctAnswer: {
            A1: '🍔 Hamburger Store',
            A2: '📚 Stationary Store',
            A3: '🛒 Supermarket',
            B1: '🍞 Bakery',
            B2: '🏪 Convenience Store',
            B3: '🏥 Hospital'
        },
        question: 'Which store is at position 3 on Street B?',
        options: ['🍞 Bakery', '🏪 Convenience Store', '🏥 Hospital', '📚 Stationary Store']
    },
    {
        id: 3,
        clues: [
            'The Hospital and Bakery are on different streets',
            'The Convenience Store is at position 2 on Street B',
            'The Hamburger Store is adjacent to the Bakery',
            'The Supermarket is at position 3 on Street A',
            'The Stationary Store is on Street A'
        ],
        correctAnswer: {
            A1: '🍔 Hamburger Store',
            A2: '📚 Stationary Store',
            A3: '🛒 Supermarket',
            B1: '🍞 Bakery',
            B2: '🏪 Convenience Store',
            B3: '🏥 Hospital'
        },
        question: 'How many stores are on Street A?',
        options: ['1', '2', '3', '4']
    }
];

// Game State
let gameState = {
    currentLevel: 1,
    currentLives: 3,
    totalScore: 0,
    levelScore: 0,
    placement: {},
    selectedAnswer: null,
    draggedStore: null,
    canSubmit: false
};

// DOM Elements
const levelDisplay = document.getElementById('levelDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const scoreDisplay = document.getElementById('scoreDisplay');
const availableStores = document.getElementById('availableStores');
const cluesList = document.getElementById('cluesList');
const questionText = document.getElementById('questionText');
const answerOptions = document.getElementById('answerOptions');
const submitBtn = document.getElementById('submitBtn');
const hintBtn = document.getElementById('hintBtn');
const resetBtn = document.getElementById('resetBtn');
const feedbackMessage = document.getElementById('feedbackMessage');
const gameOverModal = document.getElementById('gameOverModal');
const victoryModal = document.getElementById('victoryModal');
const restartBtn = document.getElementById('restartBtn');
const nextLevelBtn = document.getElementById('nextLevelBtn');

// Initialize Game
function initGame() {
    gameState.placement = {};
    gameState.selectedAnswer = null;
    gameState.levelScore = 0;
    loadLevel(gameState.currentLevel);
    renderStores();
    renderClues();
    renderQuestion();
    updateUI();
}

// Load Current Level
function loadLevel(levelId) {
    const currentLevel = LEVELS.find(l => l.id === levelId);
    if (!currentLevel) {
        endGame();
        return;
    }
    // Level data is already in LEVELS
}

// Get Current Level Data
function getCurrentLevelData() {
    return LEVELS.find(l => l.id === gameState.currentLevel);
}

// Render Available Stores
function renderStores() {
    availableStores.innerHTML = '';
    STORES.forEach(store => {
        const storeItem = document.createElement('div');
        storeItem.className = 'store-item';
        storeItem.textContent = store;
        storeItem.draggable = true;
        
        // Check if store is already placed
        const isPlaced = Object.values(gameState.placement).includes(store);
        if (isPlaced) {
            storeItem.classList.add('placed');
        }
        
        storeItem.addEventListener('dragstart', handleDragStart);
        storeItem.addEventListener('dragend', handleDragEnd);
        
        availableStores.appendChild(storeItem);
    });
}

// Render Clues
function renderClues() {
    cluesList.innerHTML = '';
    const currentLevel = getCurrentLevelData();
    currentLevel.clues.forEach((clue, index) => {
        const clueItem = document.createElement('div');
        clueItem.className = 'clue-item';
        clueItem.textContent = clue;
        cluesList.appendChild(clueItem);
    });
}

// Render Question
function renderQuestion() {
    const currentLevel = getCurrentLevelData();
    questionText.textContent = currentLevel.question;
    
    answerOptions.innerHTML = '';
    currentLevel.options.forEach(option => {
        const optionBtn = document.createElement('div');
        optionBtn.className = 'answer-option';
        optionBtn.textContent = option;
        optionBtn.addEventListener('click', () => selectAnswer(option));
        answerOptions.appendChild(optionBtn);
    });
}

// Drag and Drop Handlers
function handleDragStart(e) {
    gameState.draggedStore = e.target.textContent;
    e.target.style.opacity = '0.7';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
    gameState.draggedStore = null;
    document.querySelectorAll('.store-slot').forEach(slot => {
        slot.classList.remove('drag-over');
    });
}

// Setup Store Slots
function setupStoreSlots() {
    document.querySelectorAll('.store-slot').forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleDrop);
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.target.closest('.store-slot').classList.add('drag-over');
}

function handleDragLeave(e) {
    e.target.closest('.store-slot').classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    const slot = e.target.closest('.store-slot');
    slot.classList.remove('drag-over');
    
    if (!gameState.draggedStore) return;
    
    // Remove any existing placement
    Object.keys(gameState.placement).forEach(key => {
        if (gameState.placement[key] === gameState.draggedStore) {
            delete gameState.placement[key];
        }
    });
    
    // Add new placement
    gameState.placement[slot.id] = gameState.draggedStore;
    
    // Update display
    slot.textContent = gameState.draggedStore;
    slot.classList.add('filled');
    renderStores();
}

// Select Answer Option
function selectAnswer(option) {
    gameState.selectedAnswer = option;
    document.querySelectorAll('.answer-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

// Submit Answer
function checkAnswer() {
    if (!gameState.selectedAnswer) {
        showFeedback('Please select an answer!', 'error');
        return;
    }
    
    const currentLevel = getCurrentLevelData();
    const questionText = currentLevel.question;
    
    // Parse question and check answer
    let isCorrect = false;
    
    if (questionText.includes('position')) {
        // Extract position from question (e.g., "position 2 on Street A")
        const match = questionText.match(/position (\d) on Street ([AB])/);
        if (match) {
            const pos = match[1];
            const street = match[2];
            const slotId = `${street}${pos}`;
            const correctStore = currentLevel.correctAnswer[slotId];
            
            // Extract store name from selected answer (remove emoji)
            const selectedStoreName = gameState.selectedAnswer;
            isCorrect = selectedStoreName === correctStore;
        }
    } else if (questionText.includes('How many')) {
        // Handle counting questions
        const correctCount = Object.values(currentLevel.correctAnswer)
            .filter(store => store.includes('Street A') || 
                    Object.entries(currentLevel.correctAnswer).some(([key, val]) => 
                        val === store && key.startsWith('A')))
            .length;
        
        const answerNum = gameState.selectedAnswer.charAt(0);
        isCorrect = answerNum === '3'; // All levels have 3 stores per street
    } else {
        isCorrect = gameState.selectedAnswer === currentLevel.correctAnswer;
    }
    
    if (isCorrect) {
        gameState.levelScore += 100;
        gameState.totalScore += 100;
        showFeedback('✅ Correct! Great job!', 'success');
        setTimeout(() => {
            if (gameState.currentLevel < LEVELS.length) {
                showVictory();
            } else {
                showVictory();
            }
        }, 1500);
    } else {
        gameState.currentLives--;
        showFeedback('❌ Wrong answer! Try again.', 'error');
        
        if (gameState.currentLives <= 0) {
            setTimeout(endGame, 1500);
        }
        
        updateUI();
    }
}

// Reset Board
function resetBoard() {
    gameState.placement = {};
    gameState.selectedAnswer = null;
    document.querySelectorAll('.store-slot').forEach(slot => {
        slot.innerHTML = '';
        slot.classList.remove('filled');
    });
    document.querySelectorAll('.answer-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    renderStores();
    showFeedback('Board reset!', 'info');
}

// Show Feedback Message
function showFeedback(message, type) {
    feedbackMessage.textContent = message;
    feedbackMessage.className = `feedback-message ${type}`;
    
    setTimeout(() => {
        feedbackMessage.classList.add('hidden');
    }, 3000);
}

// Show Victory Modal
function showVictory() {
    document.getElementById('levelScore').textContent = gameState.levelScore;
    victoryModal.classList.remove('hidden');
}

// Next Level
function nextLevel() {
    gameState.currentLevel++;
    victoryModal.classList.add('hidden');
    initGame();
}

// End Game
function endGame() {
    document.getElementById('finalScore').textContent = gameState.totalScore;
    gameOverModal.classList.remove('hidden');
}

// Restart Game
function restartGame() {
    gameState.currentLevel = 1;
    gameState.currentLives = 3;
    gameState.totalScore = 0;
    gameState.levelScore = 0;
    gameOverModal.classList.add('hidden');
    initGame();
}

// Update UI
function updateUI() {
    levelDisplay.textContent = gameState.currentLevel;
    livesDisplay.textContent = '❤️ '.repeat(gameState.currentLives) + 
                               '🖤 '.repeat(3 - gameState.currentLives);
    scoreDisplay.textContent = gameState.totalScore;
}

// Event Listeners
submitBtn.addEventListener('click', checkAnswer);
resetBtn.addEventListener('click', resetBoard);
restartBtn.addEventListener('click', restartGame);
nextLevelBtn.addEventListener('click', nextLevel);

hintBtn.addEventListener('click', () => {
    const currentLevel = getCurrentLevelData();
    const hint = currentLevel.clues[Math.floor(Math.random() * currentLevel.clues.length)];
    showFeedback(`💡 Hint: ${hint}`, 'info');
});

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    setupStoreSlots();
    initGame();
});
