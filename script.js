// Simple "song" / level
// time = seconds from start, lane = 0 (A), 1 (S), 2 (D)
const LEVEL = {
  bpm: 120, // info only
  notes: [
    { time: 1.0, lane: 1 },
    { time: 1.5, lane: 1 },
    { time: 2.0, lane: 1 },
    { time: 2.5, lane: 1 },

    { time: 3.5, lane: 0 },
    { time: 4.0, lane: 1 },
    { time: 4.5, lane: 2 },

    { time: 5.5, lane: 0 },
    { time: 6.0, lane: 0 },
    { time: 6.5, lane: 2 },
    { time: 7.0, lane: 2 },

    { time: 8.0, lane: 1 },
    { time: 8.5, lane: 0 },
    { time: 9.0, lane: 2 },
    { time: 9.5, lane: 1 },

    { time: 10.5, lane: 0 },
    { time: 11.0, lane: 1 },
    { time: 11.5, lane: 2 },
    { time: 12.0, lane: 1 },
  ],
};

const PERFECT_WINDOW = 0.12; // seconds
const GOOD_WINDOW = 0.2; // seconds
// Time before the hit time when we spawn the note (so it can fall)
const NOTE_TRAVEL_TIME = 1.2; // seconds from spawn to hit line

// Elements
const laneEls = Array.from(document.querySelectorAll(".lane"));
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const bestComboEl = document.getElementById("best-combo");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const hitFeedbackEl = document.getElementById("hit-feedback");
const touchKeys = Array.from(document.querySelectorAll(".touch-key"));

// Keys mapping (desktop)
const KEY_TO_LANE = {
  a: 0,
  s: 1,
  d: 2,
};

// Game state
let gameStarted = false;
let gameFinished = false;
let startTime = null;
let animationId = null;

let activeNotes = []; // { lane, time, hit: false, judged: false, el }
let nextNoteIndex = 0;

let score = 0;
let combo = 0;
let bestCombo = 0;

// Utility to get current time in seconds since start
function getCurrentTime() {
  if (startTime === null) return 0;
  return (performance.now() - startTime) / 1000;
}

// Create a DOM note element in a lane
function spawnNote(noteData) {
  const laneEl = laneEls[noteData.lane];
  const noteEl = document.createElement("div");
  noteEl.classList.add("note");
  // Initially at top
  noteEl.style.top = "0px";
  laneEl.appendChild(noteEl);

  noteData.el = noteEl;
  activeNotes.push(noteData);
}

// Update note positions and handle auto-miss
function updateNotes(currentTime) {
  const hitLineRatio = 0.8; // where the hit line is in the lane
  const laneHeight = laneEls[0].clientHeight || 1;
  const hitLineY = laneHeight * hitLineRatio;

  activeNotes.forEach((note) => {
    const t = currentTime;
    const travelStartTime = note.time - NOTE_TRAVEL_TIME;

    // If before spawn time, keep at top
    if (t < travelStartTime) {
      note.el.style.top = "0px";
      return;
    }

    // Progress from 0 to 1 between travelStartTime and note.time
    const progress = Math.min(
      1,
      Math.max(0, (t - travelStartTime) / NOTE_TRAVEL_TIME)
    );
    const y = hitLineY * progress;
    note.el.style.top = `${y}px`;

    // Auto-miss if we've passed the Good window without being judged
    if (!note.judged && t > note.time + GOOD_WINDOW) {
      judgeNote(note, "miss");
    }
  });

  // Remove judged notes from DOM and list
  activeNotes = activeNotes.filter((note) => {
    if (note.judged && note.el) {
      if (note.el.parentElement) {
        note.el.parentElement.removeChild(note.el);
      }
      return false;
    }
    return true;
  });
}

// Handle a hit attempt on a lane (from keyboard or touch)
function handleHit(lane) {
  if (!gameStarted || gameFinished) return;

  flashLane(lane);

  const t = getCurrentTime();

  // Find the best candidate note in this lane that is not judged
  let candidate = null;
  let candidateDelta = Infinity;

  for (const note of activeNotes) {
    if (note.lane !== lane || note.judged) continue;
    const delta = Math.abs(note.time - t);
    if (delta < candidateDelta) {
      candidateDelta = delta;
      candidate = note;
    }
  }

  if (!candidate) {
    // No note in this lane to hit
    showHitFeedback("Miss", "miss");
    resetComboOnMiss();
    updateScoreUI();
    return;
  }

  if (candidateDelta <= PERFECT_WINDOW) {
    judgeNote(candidate, "perfect");
  } else if (candidateDelta <= GOOD_WINDOW) {
    judgeNote(candidate, "good");
  } else {
    judgeNote(candidate, "miss");
  }
}

// Judge a note as perfect/good/miss
function judgeNote(note, kind) {
  if (note.judged) return;
  note.judged = true;

  if (kind === "perfect") {
    score += 2;
    combo += 1;
    bestCombo = Math.max(bestCombo, combo);
    showHitFeedback("Perfect", "perfect");
  } else if (kind === "good") {
    score += 1;
    combo += 1;
    bestCombo = Math.max(bestCombo, combo);
    showHitFeedback("Good", "good");
  } else {
    resetComboOnMiss();
    showHitFeedback("Miss", "miss");
  }

  updateScoreUI();
}

// UI updates

function updateScoreUI() {
  scoreEl.textContent = score.toString();
  comboEl.textContent = combo.toString();
  bestComboEl.textContent = bestCombo.toString();
}

function showHitFeedback(text, className) {
  hitFeedbackEl.textContent = text;
  hitFeedbackEl.classList.remove("perfect", "good", "miss");
  if (className) {
    hitFeedbackEl.classList.add(className);
  }
}

function resetComboOnMiss() {
  combo = 0;
}

// Visual flash on lane
function flashLane(lane) {
  const laneEl = laneEls[lane];
  if (!laneEl) return;
  laneEl.classList.add("flash");
  setTimeout(() => {
    laneEl.classList.remove("flash");
  }, 80);
}

// Main loop
function gameLoop() {
  const t = getCurrentTime();

  // Spawn notes when it's time
  while (
    nextNoteIndex < LEVEL.notes.length &&
    t >= LEVEL.notes[nextNoteIndex].time - NOTE_TRAVEL_TIME
  ) {
    const n = LEVEL.notes[nextNoteIndex];
    const noteData = {
      time: n.time,
      lane: n.lane,
      judged: false,
      el: null,
    };
    spawnNote(noteData);
    nextNoteIndex++;
  }

  // Update positions and auto-miss
  updateNotes(t);

  // Check end condition
  if (
    nextNoteIndex >= LEVEL.notes.length &&
    activeNotes.length === 0 &&
    !gameFinished
  ) {
    finishGame();
    return;
  }

  animationId = requestAnimationFrame(gameLoop);
}

// Game control

function startGame() {
  if (gameStarted) return;
  resetGameStateOnly();
  gameStarted = true;
  gameFinished = false;
  startTime = performance.now();
  showHitFeedback("Go!", null);
  startBtn.disabled = true;
  restartBtn.disabled = false;

  animationId = requestAnimationFrame(gameLoop);
}

function finishGame() {
  gameFinished = true;
  gameStarted = false;
  showHitFeedback("Song complete!", null);
  startBtn.disabled = true;
  restartBtn.disabled = false;

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

// Reset game state but keep bestCombo
function resetGameStateOnly() {
  // Remove notes
  activeNotes.forEach((note) => {
    if (note.el && note.el.parentElement) {
      note.el.parentElement.removeChild(note.el);
    }
  });
  activeNotes = [];
  nextNoteIndex = 0;

  score = 0;
  combo = 0;
  updateScoreUI();
  showHitFeedback("Ready", null);

  gameStarted = false;
  gameFinished = false;
  startTime = null;

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function resetGameCompletely() {
  resetGameStateOnly();
  startBtn.disabled = false;
  restartBtn.disabled = true;
}

// Input handling (keyboard)

function onKeyDown(e) {
  const key = e.key.toLowerCase();
  if (!(key in KEY_TO_LANE)) return;
  e.preventDefault();
  const lane = KEY_TO_LANE[key];
  handleHit(lane);
}

// Touch controls

touchKeys.forEach((btn) => {
  const lane = parseInt(btn.dataset.lane, 10);
  btn.addEventListener("click", () => {
    handleHit(lane);
  });
});

// Buttons

startBtn.addEventListener("click", () => {
  startGame();
});

restartBtn.addEventListener("click", () => {
  resetGameCompletely();
});

// Keyboard listener
window.addEventListener("keydown", onKeyDown);

// Init
resetGameCompletely();
