function drawDungeon() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (isOpenAreaView()) {
    drawOpenAreaDungeon(w, h);
    return;
  }

  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.48);
  sky.addColorStop(0, "#12171b");
  sky.addColorStop(1, "#242b30");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.5);

  const floor = ctx.createLinearGradient(0, h * 0.5, 0, h);
  floor.addColorStop(0, "#27231d");
  floor.addColorStop(1, "#0b0b0a");
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);
  drawRoomFloorHint(w, h);

  const frames = [
    { left: 0, right: w, top: 0, bottom: h },
    { left: 170, right: 790, top: 78, bottom: 462 },
    { left: 305, right: 655, top: 155, bottom: 385 },
    { left: 395, right: 565, top: 210, bottom: 330 },
  ];

  let maxVisibleDepth = 3;
  for (let depth = 1; depth <= 3; depth += 1) {
    const center = cameraPoint(depth, 0);
    if (cellAt(center.x, center.y) === TILE.WALL) {
      maxVisibleDepth = depth;
      break;
    }
  }

  for (let depth = maxVisibleDepth; depth >= 1; depth -= 1) {
    const prev = frames[depth - 1];
    const curr = frames[depth];
    const center = cameraPoint(depth, 0);
    const left = cameraPoint(depth - 1, -1);
    const right = cameraPoint(depth - 1, 1);

    if (cellAt(left.x, left.y) === TILE.WALL) {
      drawWallQuad(
        [
          [prev.left, prev.top],
          [curr.left, curr.top],
          [curr.left, curr.bottom],
          [prev.left, prev.bottom],
        ],
        depth === 1 ? "#343b3f" : "#252c31",
      );
    } else {
      const leftForward = cameraPoint(depth, -1);
      if (cellAt(leftForward.x, leftForward.y) === TILE.WALL) {
        drawSideTurnEnd("left", prev, curr, depth);
      }
    }

    if (cellAt(right.x, right.y) === TILE.WALL) {
      drawWallQuad(
        [
          [curr.right, curr.top],
          [prev.right, prev.top],
          [prev.right, prev.bottom],
          [curr.right, curr.bottom],
        ],
        depth === 1 ? "#30383d" : "#222a2f",
      );
    } else {
      const rightForward = cameraPoint(depth, 1);
      if (cellAt(rightForward.x, rightForward.y) === TILE.WALL) {
        drawSideTurnEnd("right", prev, curr, depth);
      }
    }

    if (cellAt(center.x, center.y) === TILE.WALL) {
      drawEndCaps(prev, curr, depth);
      drawTextureRect(
        curr.left,
        curr.top,
        curr.right - curr.left,
        curr.bottom - curr.top,
        depth === 1 ? "#3a4246" : "#2c3338",
        "rgba(246, 231, 190, 0.12)",
      );
    } else {
      drawPassageFrame(curr);
      drawSpriteIfNeeded(center.x, center.y, depth, curr);
    }
  }
}

function drawRoomFloorHint(w, h) {
  if (currentMapIndex === 0) return;

  const leftWide = isWalkable(cameraPoint(0, -1).x, cameraPoint(0, -1).y) && isWalkable(cameraPoint(1, -1).x, cameraPoint(1, -1).y);
  const rightWide = isWalkable(cameraPoint(0, 1).x, cameraPoint(0, 1).y) && isWalkable(cameraPoint(1, 1).x, cameraPoint(1, 1).y);
  if (!leftWide && !rightWide) return;

  ctx.save();
  ctx.strokeStyle = "rgba(215, 180, 106, 0.13)";
  ctx.lineWidth = 2;

  if (leftWide) {
    ctx.beginPath();
    ctx.moveTo(0, h * 0.84);
    ctx.lineTo(w * 0.36, h * 0.62);
    ctx.lineTo(w * 0.5, h * 0.62);
    ctx.stroke();
  }

  if (rightWide) {
    ctx.beginPath();
    ctx.moveTo(w, h * 0.84);
    ctx.lineTo(w * 0.64, h * 0.62);
    ctx.lineTo(w * 0.5, h * 0.62);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBattleScene() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#171c20");
  bg.addColorStop(0.58, "#0d1012");
  bg.addColorStop(1, "#050606");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(215, 180, 106, 0.22)";
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, w - 68, h - 68);

  ctx.fillStyle = "rgba(215, 180, 106, 0.12)";
  ctx.fillRect(34, h * 0.63, w - 68, 2);

  drawEnemy(w * 0.405, h * 0.22, w * 0.19, h * 0.32, "#b45461");

  ctx.fillStyle = "#f4f0e8";
  ctx.font = "26px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ENEMY", w / 2, h * 0.13);
  drawEnemyCountMarkers(w / 2, h * 0.18);

  drawBattleStatusPanel(w, h);
}

function drawTownScene() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#18212a");
  bg.addColorStop(0.55, "#121719");
  bg.addColorStop(1, "#08090a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#222b2f";
  ctx.fillRect(0, h * 0.58, w, h * 0.42);
  ctx.strokeStyle = "rgba(215, 180, 106, 0.24)";
  ctx.lineWidth = 2;
  ctx.strokeRect(34, 34, w - 68, h - 68);

  drawShopBuilding(w * 0.11, h * 0.28, w * 0.16, h * 0.26, "武器屋", "#835f52");
  drawShopBuilding(w * 0.32, h * 0.23, w * 0.16, h * 0.31, "道具屋", "#58725f");
  drawShopBuilding(w * 0.53, h * 0.26, w * 0.16, h * 0.28, "宿屋", "#6c6485");
  drawShopBuilding(w * 0.74, h * 0.2, w * 0.15, h * 0.34, "教会", "#6b7480");

  ctx.fillStyle = "#f4f0e8";
  ctx.font = "30px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("街", w / 2, h * 0.16);

  ctx.font = "17px sans-serif";
  ctx.fillStyle = "#d7b46a";
  ctx.fillText(townMessage, w / 2, h * 0.68);
}

function drawShopBuilding(x, y, w, h, label, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#33251c";
  ctx.beginPath();
  ctx.moveTo(x - w * 0.06, y);
  ctx.lineTo(x + w * 0.5, y - h * 0.28);
  ctx.lineTo(x + w * 1.06, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#151719";
  ctx.fillRect(x + w * 0.38, y + h * 0.48, w * 0.24, h * 0.52);
  ctx.fillStyle = "#f4f0e8";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w * 0.5, y + h * 0.32);
}

function drawEnemyCountMarkers(centerX, y) {
  const alive = livingEnemies().length;
  const total = enemies.length;
  const radius = 9;
  const gap = 28;
  const startX = centerX - ((total - 1) * gap) / 2;

  for (let i = 0; i < total; i += 1) {
    ctx.beginPath();
    ctx.arc(startX + i * gap, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = i < alive ? "#d7b46a" : "rgba(244, 240, 232, 0.22)";
    ctx.fill();
    ctx.strokeStyle = "rgba(244, 240, 232, 0.8)";
    ctx.stroke();
  }
}

function drawBattleStatusPanel(w, h) {
  const panelX = w * 0.18;
  const panelY = h * 0.6;
  const panelW = w * 0.64;
  const panelH = 56;

  ctx.fillStyle = "rgba(15, 18, 20, 0.86)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "rgba(228, 215, 183, 0.58)";
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.fillStyle = "#d7b46a";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("現在の状況", panelX + 16, panelY + 18);

  ctx.fillStyle = "#f4f0e8";
  ctx.font = "17px sans-serif";
  ctx.fillText(battleStatus || "コマンドを選択してください。", panelX + 16, panelY + 42);

  ctx.fillStyle = "#d7b46a";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "right";
  const target = currentEnemy();
  const enemyText = target ? `${target.name} HP ${target.hp} / ${target.maxHp}` : "ENEMY HP 0 / 0";
  ctx.fillText(enemyText, panelX + panelW - 16, panelY + 18);
}

function drawSideTurnEnd(side, prev, curr, depth) {
  const inner = depth === 1 ? "#30383d" : "#263035";
  const points =
    side === "left"
      ? [
          [prev.left, curr.top],
          [curr.left, curr.top],
          [curr.left, curr.bottom],
          [prev.left, curr.bottom],
        ]
      : [
          [curr.right, curr.top],
          [prev.right, curr.top],
          [prev.right, curr.bottom],
          [curr.right, curr.bottom],
        ];

  drawWallQuad(points, inner);
}

function drawOpenSideSpace(side, prev, curr, depth) {
  const shade = depth === 1 ? "rgba(48, 59, 64, 0.62)" : "rgba(37, 47, 52, 0.48)";
  const floorShade = depth === 1 ? "rgba(55, 49, 39, 0.55)" : "rgba(39, 35, 29, 0.42)";
  const ceilingShade = depth === 1 ? "rgba(37, 45, 50, 0.5)" : "rgba(28, 35, 39, 0.38)";

  const wallPoints =
    side === "left"
      ? [
          [prev.left, curr.top],
          [curr.left, curr.top],
          [curr.left, curr.bottom],
          [prev.left, curr.bottom],
        ]
      : [
          [curr.right, curr.top],
          [prev.right, curr.top],
          [prev.right, curr.bottom],
          [curr.right, curr.bottom],
        ];

  const ceilingPoints =
    side === "left"
      ? [
          [prev.left, prev.top],
          [curr.left, curr.top],
          [prev.left, curr.top],
        ]
      : [
          [prev.right, prev.top],
          [prev.right, curr.top],
          [curr.right, curr.top],
        ];

  const floorPoints =
    side === "left"
      ? [
          [prev.left, prev.bottom],
          [prev.left, curr.bottom],
          [curr.left, curr.bottom],
        ]
      : [
          [prev.right, prev.bottom],
          [curr.right, curr.bottom],
          [prev.right, curr.bottom],
        ];

  drawWallQuad(wallPoints, shade);
  drawWallQuad(ceilingPoints, ceilingShade);
  drawWallQuad(floorPoints, floorShade);
}

function drawEndCaps(prev, curr, depth) {
  const shade = depth === 1 ? "#242a2e" : "#1d2428";
  drawWallQuad(
    [
      [prev.left, prev.top],
      [prev.right, prev.top],
      [curr.right, curr.top],
      [curr.left, curr.top],
    ],
    shade,
  );
  drawWallQuad(
    [
      [curr.left, curr.bottom],
      [curr.right, curr.bottom],
      [prev.right, prev.bottom],
      [prev.left, prev.bottom],
    ],
    shade,
  );
}

function drawPassageFrame(frame) {
  ctx.strokeStyle = "rgba(234, 214, 158, 0.16)";
  ctx.lineWidth = 2;
  ctx.strokeRect(frame.left, frame.top, frame.right - frame.left, frame.bottom - frame.top);
}

function drawSpriteIfNeeded(x, y, depth, frame) {
  const tile = cellAt(x, y);
  const sprite = spriteLabels[tile];
  if (!sprite) return;

  const scale = [0, 1, 0.62, 0.38][depth];
  const centerX = (frame.left + frame.right) / 2;
  const baseY = frame.bottom;
  const spriteW = 190 * scale;
  const spriteH = 240 * scale;
  const x0 = centerX - spriteW / 2;
  const y0 = baseY - spriteH;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(centerX, baseY - 6, spriteW * 0.5, 16 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  if (tile === TILE.ENEMY) {
    drawEnemy(x0, y0, spriteW, spriteH, sprite.color);
  } else if (tile === TILE.BOSS) {
    drawBossIcon(x0, y0, spriteW, spriteH, sprite.color);
  } else if (tile === TILE.CHEST) {
    drawChest(x0, y0, spriteW, spriteH, sprite.color, false);
  } else if (tile === TILE.OPEN_CHEST) {
    drawChest(x0, y0, spriteW, spriteH, sprite.color, true);
  } else if (tile === TILE.HEAL) {
    drawHealPoint(x0, y0, spriteW, spriteH, sprite.color);
  } else if (tile === TILE.STAIRS || tile === TILE.STAIRS_DOWN) {
    drawStairs(x0, y0, spriteW, spriteH, sprite.color);
  } else {
    drawEntrance(x0, y0, spriteW, spriteH, sprite.color);
  }

  ctx.fillStyle = "#f4f0e8";
  ctx.font = `${Math.max(11, 18 * scale)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(sprite.title, centerX, y0 - 8);
  ctx.restore();
}

function drawBossIcon(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.45, Math.min(w, h) * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d8ecff";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "rgba(78, 159, 230, 0.28)";
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.45, Math.min(w, h) * 0.42, 0, Math.PI * 2);
  ctx.stroke();
}

function drawHealPoint(x, y, w, h, color) {
  ctx.fillStyle = "rgba(117, 181, 138, 0.22)";
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * 0.72, w * 0.34, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.42, w * 0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(x + w * 0.46, y + h * 0.24, w * 0.08, h * 0.36);
  ctx.fillRect(x + w * 0.32, y + h * 0.38, w * 0.36, h * 0.08);
}

function drawEnemy(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y);
  ctx.bezierCurveTo(x + w, y + h * 0.2, x + w * 0.84, y + h, x + w * 0.5, y + h * 0.9);
  ctx.bezierCurveTo(x + w * 0.16, y + h, x, y + h * 0.2, x + w * 0.5, y);
  ctx.fill();
  ctx.fillStyle = "#f5d083";
  ctx.fillRect(x + w * 0.3, y + h * 0.36, w * 0.13, h * 0.08);
  ctx.fillRect(x + w * 0.57, y + h * 0.36, w * 0.13, h * 0.08);
}

function drawChest(x, y, w, h, color, isOpen = false) {
  ctx.fillStyle = color;
  ctx.fillRect(x + w * 0.12, y + h * 0.46, w * 0.76, h * 0.36);
  ctx.fillStyle = "#6a3e25";
  if (isOpen) {
    ctx.fillRect(x + w * 0.1, y + h * 0.2, w * 0.8, h * 0.14);
    ctx.fillStyle = "#16100d";
    ctx.fillRect(x + w * 0.16, y + h * 0.38, w * 0.68, h * 0.12);
  } else {
    ctx.beginPath();
    ctx.roundRect(x + w * 0.12, y + h * 0.28, w * 0.76, h * 0.34, 10);
    ctx.fill();
  }
  ctx.fillStyle = "#d7b46a";
  ctx.fillRect(x + w * 0.45, y + h * 0.5, w * 0.1, h * 0.12);
}

function drawStairs(x, y, w, h, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i += 1) {
    ctx.fillRect(x + w * (0.15 + i * 0.06), y + h * (0.72 - i * 0.1), w * (0.7 - i * 0.12), h * 0.08);
  }
  ctx.strokeStyle = "#efe3ba";
  ctx.strokeRect(x + w * 0.18, y + h * 0.08, w * 0.64, h * 0.78);
}

function drawEntrance(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x + w * 0.2, y + h * 0.08, w * 0.6, h * 0.82);
  ctx.fillStyle = "#11161a";
  ctx.fillRect(x + w * 0.3, y + h * 0.2, w * 0.4, h * 0.7);
}