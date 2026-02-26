// Game configuration
const MAX_LEVEL = 10;
const MAX_ROUNDS = 3; // 3 rounds per level
const MAX_HEARTS = 5;

// Elements
const cardsGrid = document.getElementById("cards-grid");
const hintBox = document.getElementById("hint-box");
const resultBox = document.getElementById("result-box");
const heartsContainer = document.getElementById("hearts");
const levelNumberEl = document.getElementById("level-number");
const roundNumberEl = document.getElementById("round-number");
const nextLevelBtn = document.getElementById("next-level-btn");
const restartBtn = document.getElementById("restart-btn");
const moreHintBtn = document.getElementById("more-hint-btn");
const resultBtn = document.getElementById("result-btn");

// State
let currentLevel = 1;
let currentRound = 1;
let heartsLeft = MAX_HEARTS;
let oddCardIndex = 0;
let hasGuessedThisRound = false;
let currentHintIndex = -1; // -1 = no hint shown this round yet

// Result state
let resultParts = []; // array of strings for step-by-step result
let currentResultIndex = -1; // -1 = nothing shown yet

// Vocabulary for hints (we'll make them match the simpler differences)
const attributes = [
  "clearly taller than the others",
  "clearly shorter than the others",
  "noticeably wider",
  "noticeably thinner",
  "rotated more than the others",
  "tilted in the opposite direction",
  "higher than the others",
  "lower than the others",
  "more to the left",
  "more to the right",
];

const logicalRelations = [
  "in the top row",
  "in the bottom row",
  "on the left side",
  "on the right side",
  "closer to the top edge",
  "closer to the bottom edge",
  "closer to the left edge",
  "closer to the right edge",
];

// Utility
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Hearts UI
function renderHearts() {
  heartsContainer.innerHTML = "";
  for (let i = 0; i < MAX_HEARTS; i++) {
    const heart = document.createElement("div");
    heart.classList.add("heart");
    if (i < heartsLeft) heart.classList.add("filled");
    heartsContainer.appendChild(heart);
  }
}

// Decide what kind of difference this level uses
// 1–3: height, 4–6: width, 7–8: rotation, 9–10: position
function getLevelDifferenceType(level) {
  if (level <= 3) return "height";
  if (level <= 6) return "width";
  if (level <= 8) return "rotation";
  return "position";
}

// Generate the visual style for cards for this level
// We now keep things simple and clear: one main difference only.
function generateCardStyles(level) {
  const baseHeight = 120;
  const baseWidth = 100;

  const differenceType = getLevelDifferenceType(level);

  const cards = [];

  // All cards start the same
  for (let i = 0; i < 6; i++) {
    const card = {
      height: baseHeight,
      width: baseWidth,
      rotation: 0,
      translateX: 0,
      translateY: 0,
    };
    cards.push(card);
  }

  // Choose odd card index
  oddCardIndex = randInt(0, 5);
  const odd = cards[oddCardIndex];

  // How big should the difference be?
  // Early levels: very big difference; later: still obvious but a bit smaller.
  let diffBig = 24; // px or deg
  let diffSmall = 16;

  if (level >= 4 && level <= 6) {
    diffBig = 20;
    diffSmall = 14;
  } else if (level >= 7 && level <= 8) {
    diffBig = 18;
    diffSmall = 12;
  } else if (level >= 9) {
    diffBig = 16;
    diffSmall = 10;
  }

  const sign = Math.random() < 0.5 ? -1 : 1;

  if (differenceType === "height") {
    // All normal cards: base height
    // Odd card: clearly taller or shorter
    odd.height = baseHeight + sign * diffBig;
  } else if (differenceType === "width") {
    odd.width = baseWidth + sign * diffBig;
  } else if (differenceType === "rotation") {
    // All normal: maybe tiny tilt
    cards.forEach((c, i) => {
      if (i !== oddCardIndex) {
        c.rotation = randInt(-3, 3); // tiny random tilt
      }
    });
    odd.rotation = sign * (12 + diffSmall); // clearly tilted
  } else if (differenceType === "position") {
    // Position difference: move the odd card clearly up/down/left/right
    const axis = Math.random() < 0.5 ? "y" : "x";
    if (axis === "y") {
      odd.translateY = sign * -diffBig; // up or down
    } else {
      odd.translateX = sign * diffBig; // left or right
    }
  }

  return cards;
}

// Generate a hint text for this level and this layout
// hintNumber: 0 = first hint, 1 = second hint, 2+ = stronger hints
function generateHint(level, hintNumber = 0) {
  const differenceType = getLevelDifferenceType(level);
  const cardLabel = String.fromCharCode(65 + oddCardIndex); // 'A'..'F'

  // Tailor hints to the actual difference type so they feel fair
  let typeHint;
  if (differenceType === "height") {
    typeHint = "Focus on which card is the tallest or the shortest.";
  } else if (differenceType === "width") {
    typeHint = "Focus on which card is the widest or the thinnest.";
  } else if (differenceType === "rotation") {
    typeHint = "Look for the card that is tilted the most.";
  } else {
    typeHint = "Pay attention to which card is higher, lower, or more to one side.";
  }

  const attributeHint = `The odd card is ${attributes[randInt(
    0,
    attributes.length - 1
  )]}.`;
  const relationHint =
    "The odd card is " +
    logicalRelations[randInt(0, logicalRelations.length - 1)] +
    ".";
  const directHint = `The odd card is labeled ${cardLabel}.`;

  // Simple progression of clarity
  if (hintNumber === 0) {
    return typeHint;
  } else if (hintNumber === 1) {
    return typeHint + " " + attributeHint;
  } else if (hintNumber === 2) {
    return attributeHint + " " + relationHint;
  } else {
    // Final strong hint basically gives it away
    return directHint + " " + attributeHint;
  }
}

// Prepare result parts for step‑by‑step reveal
function buildResultParts({ correct, guessedIndex }) {
  const guessedLabel = String.fromCharCode(65 + guessedIndex);
  const oddLabel = String.fromCharCode(65 + oddCardIndex);
  const parts = [];

  if (correct) {
    parts.push(`You chose ${guessedLabel}. That was correct!`);
    parts.push(`Card ${oddLabel} really was the odd one out.`);
    parts.push("Nice job. Press Next Level when you're ready.");
  } else {
    parts.push(`You chose ${guessedLabel}. That was not the odd one.`);
    parts.push(`The odd card was ${oddLabel}.`);
    parts.push(
      "Everyone looking at this layout would agree that card stands out the most."
    );
  }

  return parts;
}

// Show the next chunk of result text
function showNextResultPart() {
  if (!resultParts || resultParts.length === 0) return;

  if (currentResultIndex < 0) {
    currentResultIndex = 0;
  } else if (currentResultIndex < resultParts.length - 1) {
    currentResultIndex++;
  } else {
    // Already at the last part; nothing more to show
    return;
  }

  const joined = resultParts.slice(0, currentResultIndex + 1).join(" ");
  resultBox.textContent = joined;

  // Change button text appropriately
  if (currentResultIndex >= resultParts.length - 1) {
    resultBtn.textContent = "Result Complete";
  } else {
    resultBtn.textContent = "Next Result Detail";
  }
}

// Render the six cards
function renderCards() {
  cardsGrid.innerHTML = "";

  const cardStyles = generateCardStyles(currentLevel);

  for (let i = 0; i < 6; i++) {
    const cardEl = document.createElement("div");
    cardEl.classList.add("card");
    cardEl.dataset.index = i;

    const style = cardStyles[i];

    cardEl.style.height = `${style.height}px`;
    cardEl.style.width = `${style.width}px`;

    const translate =
      style.translateX !== 0 || style.translateY !== 0
        ? `translate(${style.translateX}px, ${style.translateY}px)`
        : "";
    const rotate =
      style.rotation !== 0 ? `rotate(${style.rotation}deg)` : "";

    cardEl.style.transform = `${translate} ${rotate}`.trim();

    // Label: A–F
    const label = document.createElement("div");
    label.classList.add("card-label");
    label.textContent = String.fromCharCode(65 + i);
    cardEl.appendChild(label);

    // Badge for "ODD" vs "NORMAL" (shown only after guess)
    const badge = document.createElement("div");
    badge.classList.add("card-badge");
    badge.textContent = i === oddCardIndex ? "ODD" : "NORMAL";
    cardEl.appendChild(badge);

    cardEl.addEventListener("click", onCardClick);
    cardsGrid.appendChild(cardEl);
  }

  hasGuessedThisRound = false;
  currentHintIndex = -1; // no hint yet
  resultParts = [];
  currentResultIndex = -1;
  resultBtn.classList.add("hidden");

  // Reset hint & result boxes
  hintBox.textContent =
    'Press "Show Hint" to get a clue for this round.';
  moreHintBtn.textContent = "Show Hint";

  resultBox.textContent =
    'Make a guess to unlock the result, then press "Show Result".';
}

// Handle card click (guess)
function onCardClick(e) {
  if (hasGuessedThisRound || heartsLeft <= 0) return;

  const cardEl = e.currentTarget;
  const index = parseInt(cardEl.dataset.index, 10);

  hasGuessedThisRound = true;

  // Reveal badges on all cards
  document
    .querySelectorAll(".card")
    .forEach((c) => c.classList.add("show-badge"));

  const correct = index === oddCardIndex;

  if (correct) {
    // Correct guess
    cardEl.classList.add("correct");

    // Prepare result parts and show first chunk
    resultParts = buildResultParts({ correct: true, guessedIndex: index });
    currentResultIndex = -1;
    resultBtn.classList.remove("hidden");
    resultBtn.textContent = "Show Result";
    showNextResultPart();

    // Highlight other cards as normal
    document.querySelectorAll(".card").forEach((c) => {
      if (parseInt(c.dataset.index, 10) !== oddCardIndex) {
        c.classList.add("suspected"); // just to show outline
      }
    });

    // Also give a short line in hint box
    hintBox.textContent = `Nice! Card ${String.fromCharCode(
      65 + index
    )} was the odd one.`;

    // Go to next level or finish
    if (currentLevel < MAX_LEVEL) {
      nextLevelBtn.classList.remove("hidden");
    } else {
      hintBox.textContent += " You completed all levels!";
      restartBtn.classList.remove("hidden");
    }
  } else {
    // Wrong guess
    cardEl.classList.add("wrong");
    heartsLeft--;
    renderHearts();

    // Give an extra hint after a wrong guess
    if (currentHintIndex < 0) {
      currentHintIndex = 0;
    } else {
      currentHintIndex++;
    }
    const extraHint = generateHint(currentLevel, currentHintIndex);

    hintBox.textContent = `Hint after your guess: ${extraHint}`;

    // Build step-by-step result
    resultParts = buildResultParts({ correct: false, guessedIndex: index });
    currentResultIndex = -1;
    resultBtn.classList.remove("hidden");
    resultBtn.textContent = "Show Result";
    showNextResultPart();

    // Mark the correct one too
    const correctCard = document.querySelector(
      `.card[data-index="${oddCardIndex}"]`
    );
    if (correctCard) correctCard.classList.add("correct");

    // Check for game over
    if (heartsLeft <= 0) {
      hintBox.textContent += " You ran out of hearts. Game over.";
      restartBtn.classList.remove("hidden");
      return;
    }

    // Use up a round
    if (currentRound < MAX_ROUNDS) {
      currentRound++;
      roundNumberEl.textContent = currentRound.toString();

      // New layout after a brief pause
      setTimeout(() => {
        renderCards();
      }, 1000);
    } else {
      // Out of rounds for this level
      hintBox.textContent +=
        " You’ve used all your rounds for this level. Moving on.";
      if (currentLevel < MAX_LEVEL) {
        currentLevel++;
        currentRound = 1;
        updateLevelRoundDisplay();
        setTimeout(() => {
          renderCards();
        }, 1000);
      } else {
        hintBox.textContent += " That was the final level!";
        restartBtn.classList.remove("hidden");
      }
    }
  }
}

// Update level and round labels
function updateLevelRoundDisplay() {
  levelNumberEl.textContent = currentLevel.toString();
  roundNumberEl.textContent = currentRound.toString();
}

// Next level
nextLevelBtn.addEventListener("click", () => {
  if (currentLevel < MAX_LEVEL) {
    currentLevel++;
    currentRound = 1;
    updateLevelRoundDisplay();
    nextLevelBtn.classList.add("hidden");
    renderCards();
  }
});

// Hint button: first click = Show Hint, then Next Hint
moreHintBtn.addEventListener("click", () => {
  if (currentHintIndex < 0) {
    currentHintIndex = 0; // first hint
  } else {
    currentHintIndex++; // next hint
  }

  const hintText = generateHint(currentLevel, currentHintIndex);
  hintBox.textContent = `Hint ${currentHintIndex + 1}: ${hintText}`;

  // After first press, always show "Next Hint"
  moreHintBtn.textContent = "Next Hint";
});

// Result button: step-by-step reveal
resultBtn.addEventListener("click", () => {
  showNextResultPart();
});

// Restart game
restartBtn.addEventListener("click", () => {
  currentLevel = 1;
  currentRound = 1;
  heartsLeft = MAX_HEARTS;
  nextLevelBtn.classList.add("hidden");
  restartBtn.classList.add("hidden");
  resultBtn.classList.add("hidden");
  renderHearts();
  updateLevelRoundDisplay();
  renderCards();
  hintBox.textContent =
    "New game started. 6 cards, 1 is odd. Can you clear all 10 levels?";
  resultBox.textContent =
    'Make a guess to unlock the result, then press "Show Result".';
});

// Initialize
function initGame() {
  heartsLeft = MAX_HEARTS;
  currentLevel = 1;
  currentRound = 1;
  renderHearts();
  updateLevelRoundDisplay();
  renderCards();
}

initGame();
