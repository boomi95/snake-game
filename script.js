const GRID_SIZE = 16;
const INITIAL_DIRECTION = "right";
const TICK_MS = 140;
const LEADERBOARD_STORAGE_KEY = "snake:last-five-games";
const PLAYER_NAME_STORAGE_KEY = "snake:player-name";
const LEADERBOARD_LIMIT = 5;

const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITES = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

function createInitialSnake() {
  return [
    { x: 2, y: 8 },
    { x: 1, y: 8 },
    { x: 0, y: 8 },
  ];
}

function serializePoint(point) {
  return `${point.x},${point.y}`;
}

function randomFoodPosition(snake, gridSize) {
  const occupied = new Set(snake.map(serializePoint));
  const available = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = serializePoint({ x, y });
      if (!occupied.has(key)) {
        available.push({ x, y });
      }
    }
  }

  if (available.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * available.length);
  return available[index];
}

function createInitialState() {
  const snake = createInitialSnake();

  return {
    gridSize: GRID_SIZE,
    snake,
    direction: INITIAL_DIRECTION,
    nextDirection: INITIAL_DIRECTION,
    food: randomFoodPosition(snake, GRID_SIZE),
    score: 0,
    started: false,
    paused: false,
    isGameOver: false,
  };
}

function queueDirection(state, direction) {
  if (!DIRECTION_VECTORS[direction]) {
    return state;
  }

  const blockedByCurrent = OPPOSITES[state.direction] === direction;
  const blockedByQueued = OPPOSITES[state.nextDirection] === direction;

  if (blockedByCurrent || blockedByQueued) {
    return state;
  }

  return {
    ...state,
    started: true,
    nextDirection: direction,
  };
}

function stepState(state) {
  if (state.isGameOver || state.paused || !state.food) {
    return state;
  }

  const direction = state.nextDirection;
  const vector = DIRECTION_VECTORS[direction];
  const head = state.snake[0];
  const nextHead = { x: head.x + vector.x, y: head.y + vector.y };
  const hitWall =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= state.gridSize ||
    nextHead.y >= state.gridSize;

  if (hitWall) {
    return {
      ...state,
      direction,
      isGameOver: true,
    };
  }

  const willEat =
    nextHead.x === state.food.x &&
    nextHead.y === state.food.y;

  const bodyToCheck = willEat ? state.snake : state.snake.slice(0, -1);
  const hitSelf = bodyToCheck.some((segment) => (
    segment.x === nextHead.x && segment.y === nextHead.y
  ));

  if (hitSelf) {
    return {
      ...state,
      direction,
      isGameOver: true,
    };
  }

  const nextSnake = [nextHead, ...state.snake];
  if (!willEat) {
    nextSnake.pop();
  }

  const nextFood = willEat ? randomFoodPosition(nextSnake, state.gridSize) : state.food;

  return {
    ...state,
    snake: nextSnake,
    direction,
    nextDirection: direction,
    food: nextFood,
    score: willEat ? state.score + 1 : state.score,
    isGameOver: willEat && nextFood === null,
  };
}

function normalizePlayerName(name) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 24) : "Anonymous";
}

function loadLeaderboard() {
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry) => entry && typeof entry.score === "number" && typeof entry.player === "string")
      .slice(0, LEADERBOARD_LIMIT);
  } catch (error) {
    return [];
  }
}

function saveLeaderboard(leaderboard) {
  window.localStorage.setItem(
    LEADERBOARD_STORAGE_KEY,
    JSON.stringify(leaderboard.slice(0, LEADERBOARD_LIMIT)),
  );
}

function loadPlayerName() {
  try {
    return window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) || "";
  } catch (error) {
    return "";
  }
}

function savePlayerName(name) {
  try {
    window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name);
  } catch (error) {
    // no-op when local storage is blocked
  }
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

function recordGame(leaderboard, playerName, score) {
  const entry = {
    player: normalizePlayerName(playerName),
    score,
    playedAt: new Date().toISOString(),
  };

  const updated = [entry, ...leaderboard].slice(0, LEADERBOARD_LIMIT);
  saveLeaderboard(updated);
  return updated;
}

const boardElement = document.querySelector("#board");
const scoreElement = document.querySelector("#score");
const statusElement = document.querySelector("#status");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const playerNameInput = document.querySelector("#player-name");
const leaderboardList = document.querySelector("#leaderboard-list");
const controlButtons = Array.from(document.querySelectorAll("[data-direction]"));

let leaderboard = loadLeaderboard();
let state = createInitialState();
let tickHandle = null;

playerNameInput.value = loadPlayerName();

function buildBoard() {
  const totalCells = GRID_SIZE * GRID_SIZE;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < totalCells; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");
    fragment.appendChild(cell);
  }

  boardElement.appendChild(fragment);
}

function getCellIndex(point) {
  return point.y * GRID_SIZE + point.x;
}

function renderLeaderboard() {
  leaderboardList.textContent = "";

  if (leaderboard.length === 0) {
    const item = document.createElement("li");
    item.className = "leaderboard__empty";
    item.textContent = "No games yet. Play to create your first score.";
    leaderboardList.appendChild(item);
    return;
  }

  leaderboard.forEach((entry) => {
    const item = document.createElement("li");
    const time = formatTimestamp(entry.playedAt);
    item.textContent = `${entry.player}: ${entry.score}${time ? ` (${time})` : ""}`;
    leaderboardList.appendChild(item);
  });
}

function render() {
  const cells = boardElement.children;
  const foodKey = state.food ? serializePoint(state.food) : null;
  const snakeKeys = new Set(state.snake.map(serializePoint));
  const headKey = serializePoint(state.snake[0]);

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const point = { x, y };
      const key = serializePoint(point);
      const cell = cells[getCellIndex(point)];
      const classNames = ["cell"];

      if (snakeKeys.has(key)) {
        classNames.push("cell--snake");
      }
      if (headKey === key) {
        classNames.push("cell--head");
      }
      if (foodKey === key) {
        classNames.push("cell--food");
      }

      cell.className = classNames.join(" ");
    }
  }

  scoreElement.textContent = String(state.score);
  pauseButton.textContent = state.paused ? "Resume" : "Pause";

  if (state.isGameOver) {
    statusElement.textContent = "Game over. Press Enter or Restart to play again.";
    return;
  }

  if (state.paused) {
    statusElement.textContent = "Paused. Press Space, P, or Resume to continue.";
    return;
  }

  if (!state.started) {
    statusElement.textContent = "Press any arrow key or WASD to start.";
    return;
  }

  statusElement.textContent = "Collect food and avoid walls and yourself.";
}

function restartGame() {
  state = createInitialState();
  render();
}

function handleDirection(direction) {
  if (state.isGameOver || state.paused) {
    return;
  }

  state = queueDirection(state, direction);
  render();
}

function startLoop() {
  if (tickHandle !== null) {
    return;
  }

  tickHandle = window.setInterval(() => {
    if (!state.started || state.isGameOver || state.paused) {
      return;
    }

    const previousState = state;
    state = stepState(state);

    if (!previousState.isGameOver && state.isGameOver) {
      leaderboard = recordGame(leaderboard, playerNameInput.value, state.score);
      renderLeaderboard();
    }

    render();
  }, TICK_MS);
}

function keyToDirection(key) {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up";
    case "ArrowDown":
    case "s":
    case "S":
      return "down";
    case "ArrowLeft":
    case "a":
    case "A":
      return "left";
    case "ArrowRight":
    case "d":
    case "D":
      return "right";
    default:
      return null;
  }
}

function togglePause() {
  if (!state.started || state.isGameOver) {
    return;
  }

  state = {
    ...state,
    paused: !state.paused,
  };
  render();
}

document.addEventListener("keydown", (event) => {
  const direction = keyToDirection(event.key);

  if (direction) {
    event.preventDefault();
    handleDirection(direction);
    return;
  }

  if (event.key === "Enter" && state.isGameOver) {
    restartGame();
    return;
  }

  if (event.key === " " || event.key === "p" || event.key === "P") {
    event.preventDefault();
    togglePause();
  }
});

pauseButton.addEventListener("click", () => {
  togglePause();
});

restartButton.addEventListener("click", () => {
  restartGame();
});

playerNameInput.addEventListener("input", () => {
  savePlayerName(playerNameInput.value);
});

for (const button of controlButtons) {
  button.addEventListener("click", () => {
    handleDirection(button.dataset.direction);
  });
}

buildBoard();
renderLeaderboard();
render();
startLoop();
