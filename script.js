const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const livesElement = document.querySelector("#lives");
const startButton = document.querySelector("#startButton");

const assets = {
  background: loadImage("assets/background.svg"),
  player: loadImage("assets/player-girl.svg"),
  enemy: loadImage("assets/star-enemy.svg"),
  bullet: loadImage("assets/heart-bullet.svg"),
};

const keys = new Set();
const bullets = [];
const enemies = [];
const sparkles = [];

const player = {
  x: 90,
  y: canvas.height / 2,
  width: 62,
  height: 78,
  speed: 300,
  cooldown: 0,
};

let score = 0;
let lives = 3;
let running = false;
let lastTime = 0;
let spawnTimer = 0;
let gameOver = false;

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function resetGame() {
  player.x = 90;
  player.y = canvas.height / 2;
  player.cooldown = 0;
  bullets.length = 0;
  enemies.length = 0;
  sparkles.length = 0;
  score = 0;
  lives = 3;
  spawnTimer = 0;
  gameOver = false;
  scoreElement.textContent = score;
  livesElement.textContent = lives;
}

function startGame() {
  resetGame();
  running = true;
  startButton.textContent = "Restart";
  lastTime = performance.now();
  requestAnimationFrame(update);
}

function update(now) {
  if (!running) {
    return;
  }

  const delta = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  movePlayer(delta);
  updateBullets(delta);
  updateEnemies(delta);
  updateSparkles(delta);
  spawnEnemies(delta);
  checkCollisions();
  draw();

  if (lives <= 0) {
    endGame();
    return;
  }

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

  player.x = clamp(player.x, 20, canvas.width * 0.52);
  player.y = clamp(player.y, 34, canvas.height - player.height + 34);
  player.cooldown = Math.max(0, player.cooldown - delta);

  if (keys.has("Space")) {
    shoot();
  }
}

function shoot() {
  if (player.cooldown > 0) {
    return;
  }

  bullets.push({
    x: player.x + player.width - 8,
    y: player.y + player.height * 0.42,
    width: 28,
    height: 24,
    speed: 520,
  });
  player.cooldown = 0.2;
}

function updateBullets(delta) {
  for (const bullet of bullets) {
    bullet.x += bullet.speed * delta;
  }

  removeOffscreen(bullets, (bullet) => bullet.x < canvas.width + 40);
}

function spawnEnemies(delta) {
  spawnTimer -= delta;

  if (spawnTimer > 0) {
    return;
  }

  const size = 44 + Math.random() * 18;
  enemies.push({
    x: canvas.width + 30,
    y: 38 + Math.random() * (canvas.height - 76),
    width: size,
    height: size,
    speed: 120 + Math.random() * 80 + Math.min(score * 2, 120),
    wobble: Math.random() * Math.PI * 2,
  });

  spawnTimer = Math.max(0.4, 1.1 - score * 0.015);
}

function updateEnemies(delta) {
  for (const enemy of enemies) {
    enemy.x -= enemy.speed * delta;
    enemy.wobble += delta * 5;
    enemy.y += Math.sin(enemy.wobble) * 0.7;

    if (enemy.x + enemy.width < 0) {
      enemy.remove = true;
      lives -= 1;
      livesElement.textContent = lives;
    }
  }

  removeOffscreen(enemies, (enemy) => !enemy.remove);
}

function updateSparkles(delta) {
  for (const sparkle of sparkles) {
    sparkle.life -= delta;
    sparkle.y -= 30 * delta;
  }

  removeOffscreen(sparkles, (sparkle) => sparkle.life > 0);
}

function checkCollisions() {
  for (const bullet of bullets) {
    for (const enemy of enemies) {
      if (enemy.remove || !isHit(bullet, enemy)) {
        continue;
      }

      bullet.remove = true;
      enemy.remove = true;
      score += 10;
      scoreElement.textContent = score;
      burst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
    }
  }

  for (const enemy of enemies) {
    if (enemy.remove || !isHit(player, enemy)) {
      continue;
    }

    enemy.remove = true;
    lives -= 1;
    livesElement.textContent = lives;
    burst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
  }

  removeOffscreen(bullets, (bullet) => !bullet.remove);
  removeOffscreen(enemies, (enemy) => !enemy.remove);
}

function burst(x, y) {
  for (let i = 0; i < 12; i += 1) {
    sparkles.push({
      x,
      y,
      radius: 2 + Math.random() * 4,
      angle: Math.random() * Math.PI * 2,
      distance: 24 + Math.random() * 36,
      life: 0.42,
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawSparkles();

  for (const bullet of bullets) {
    ctx.drawImage(assets.bullet, bullet.x, bullet.y, bullet.width, bullet.height);
  }

  for (const enemy of enemies) {
    ctx.drawImage(assets.enemy, enemy.x, enemy.y, enemy.width, enemy.height);
  }

  ctx.drawImage(assets.player, player.x, player.y, player.width, player.height);

  if (gameOver) {
    drawGameOver();
  }
}

function drawBackground() {
  if (assets.background.complete) {
    ctx.drawImage(assets.background, 0, 0, canvas.width, canvas.height);
    return;
  }

  ctx.fillStyle = "#eaf8ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSparkles() {
  for (const sparkle of sparkles) {
    const progress = 1 - sparkle.life / 0.42;
    const x = sparkle.x + Math.cos(sparkle.angle) * sparkle.distance * progress;
    const y = sparkle.y + Math.sin(sparkle.angle) * sparkle.distance * progress;

    ctx.globalAlpha = Math.max(0, sparkle.life / 0.42);
    ctx.fillStyle = "#ffd15c";
    ctx.beginPath();
    ctx.arc(x, y, sparkle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function endGame() {
  running = false;
  gameOver = true;
  draw();
}

function drawGameOver() {
  ctx.fillStyle = "rgba(255, 247, 251, 0.78)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#30233a";
  ctx.textAlign = "center";
  ctx.font = "700 44px Arial";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 16);
  ctx.font = "22px Arial";
  ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 28);
}

function isHit(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function removeOffscreen(items, keep) {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (!keep(items[i])) {
      items.splice(i, 1);
    }
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

startButton.addEventListener("click", startGame);

Promise.all(Object.values(assets).map((image) => {
  if (image.complete) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
})).then(draw);
