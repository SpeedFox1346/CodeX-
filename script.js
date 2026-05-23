const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const timeElement = document.querySelector("#time");
const startButton = document.querySelector("#startButton");

const keys = new Set();
const player = {
  x: 60,
  y: 60,
  size: 28,
  speed: 260,
};

let star = createStar();
let score = 0;
let timeLeft = 30;
let running = false;
let lastTime = 0;
let timerId = null;

function createStar() {
  const margin = 32;
  return {
    x: margin + Math.random() * (canvas.width - margin * 2),
    y: margin + Math.random() * (canvas.height - margin * 2),
    size: 18,
  };
}

function resetGame() {
  player.x = 60;
  player.y = 60;
  star = createStar();
  score = 0;
  timeLeft = 30;
  scoreElement.textContent = score;
  timeElement.textContent = timeLeft;
}

function startGame() {
  resetGame();
  running = true;
  startButton.textContent = "Restart";
  lastTime = performance.now();
  clearInterval(timerId);
  timerId = setInterval(tickTimer, 1000);
  requestAnimationFrame(update);
}

function tickTimer() {
  if (!running) {
    return;
  }

  timeLeft -= 1;
  timeElement.textContent = timeLeft;

  if (timeLeft <= 0) {
    running = false;
    clearInterval(timerId);
    draw();
    drawGameOver();
  }
}

function update(now) {
  if (!running) {
    return;
  }

  const delta = (now - lastTime) / 1000;
  lastTime = now;

  movePlayer(delta);
  checkCollision();
  draw();

  requestAnimationFrame(update);
}

function movePlayer(delta) {
  const distance = player.speed * delta;

  if (keys.has("ArrowUp") || keys.has("KeyW")) {
    player.y -= distance;
  }

  if (keys.has("ArrowDown") || keys.has("KeyS")) {
    player.y += distance;
  }

  if (keys.has("ArrowLeft") || keys.has("KeyA")) {
    player.x -= distance;
  }

  if (keys.has("ArrowRight") || keys.has("KeyD")) {
    player.x += distance;
  }

  player.x = clamp(player.x, player.size / 2, canvas.width - player.size / 2);
  player.y = clamp(player.y, player.size / 2, canvas.height - player.size / 2);
}

function checkCollision() {
  const dx = player.x - star.x;
  const dy = player.y - star.y;
  const distance = Math.hypot(dx, dy);

  if (distance < player.size / 2 + star.size) {
    score += 1;
    scoreElement.textContent = score;
    star = createStar();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawStar(star.x, star.y, star.size);
  drawPlayer();
}

function drawBackground() {
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.fillStyle = "#59d2fe";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f5f7fb";
  ctx.beginPath();
  ctx.arc(player.x + 6, player.y - 5, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawStar(x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#ffc857";
  ctx.beginPath();

  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? size : size / 2.4;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }

  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGameOver() {
  ctx.fillStyle = "rgba(16, 21, 31, 0.72)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f5f7fb";
  ctx.textAlign = "center";
  ctx.font = "700 42px Arial";
  ctx.fillText("Time Up!", canvas.width / 2, canvas.height / 2 - 12);
  ctx.font = "20px Arial";
  ctx.fillText(`Final score: ${score}`, canvas.width / 2, canvas.height / 2 + 26);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

startButton.addEventListener("click", startGame);
draw();
