function cellAt(x, y) {
  if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return TILE.WALL;
  return map[y][x];
}

function isWalkable(x, y) {
  return cellAt(x, y) !== TILE.WALL;
}

function mapKey(x, y) {
  return `${currentMapIndex}:${x}:${y}`;
}

function loadMap(index, spawnTile) {
  currentMapIndex = index;
  map = maps[currentMapIndex].rows.map((row) => row.split(""));
  applyOpenedChests();
  placePlayerAt(spawnTile);
  stepsSinceEncounter = 0;
}

function applyOpenedChests() {
  for (let y = 0; y < map.length; y += 1) {
    for (let x = 0; x < map[y].length; x += 1) {
      if (map[y][x] === TILE.CHEST && openedChests.has(mapKey(x, y))) {
        map[y][x] = TILE.OPEN_CHEST;
      }
      if (map[y][x] === TILE.BOSS && defeatedBosses.has(mapKey(x, y))) {
        map[y][x] = TILE.FLOOR;
      }
    }
  }
}

function placePlayerAt(tile) {
  for (let y = 0; y < map.length; y += 1) {
    for (let x = 0; x < map[y].length; x += 1) {
      if (map[y][x] === tile) {
        player.x = x;
        player.y = y;
        return;
      }
    }
  }
}

function healParty() {
  party.forEach((member) => {
    updateMemberStats(member);
    member.hp = member.maxHp;
    member.mp = member.maxMp;
    member.guarding = false;
    member.status = "健康";
  });
}

function hasActiveBossOnCurrentMap() {
  return map.some((row) => row.includes(TILE.BOSS));
}

function cloneMember(member) {
  return { ...member, equipment: { ...member.equipment } };
}

function updateMemberStats(member) {
  let maxHp = member.baseMaxHp;
  let maxMp = member.baseMaxMp;
  let atk = member.baseAtk;
  let mag = member.baseMag;
  let def = member.baseDef;
  Object.values(member.equipment).forEach((itemId) => {
    if (!itemId) return;
    const item = equipmentData[itemId];
    maxHp += item.maxHp || 0;
    maxMp += item.maxMp || 0;
    atk += item.atk || 0;
    mag += item.mag || 0;
    def += item.def || 0;
  });
  member.maxHp = maxHp;
  member.maxMp = maxMp;
  member.atk = atk;
  member.mag = mag;
  member.def = def;
  member.hp = clamp(member.hp ?? maxHp, 0, maxHp);
  member.mp = clamp(member.mp ?? maxMp, 0, maxMp);
}

function updatePartyStats() {
  party.forEach(updateMemberStats);
}

function formatPartyStatus() {
  updatePartyStats();
  return party
    .map(
      (member) =>
        `${member.name} Lv${member.level}  ${member.status}\nHP ${member.hp} / ${member.maxHp}  MP ${member.mp} / ${member.maxMp}\n攻撃 ${member.atk}  魔力 ${member.mag}  防御 ${member.def}`,
    )
    .join("\n\n");
}

function formatFieldItems() {
  return [`薬草 x ${inventory.herb}`, `魔石 x ${inventory.magicStone}`, `解毒剤 x ${inventory.antidote}`].join("\n");
}

function formatFieldMagic() {
  return battleMenuData.magic.options
    .map((spell) => {
      const effect = spell.heal ? `回復 ${spell.heal}` : spell.guardAll ? "全員防御" : `威力 ${spell.power}`;
      return `${spell.label}  MP ${spell.mpCost}  ${effect}`;
    })
    .join("\n");
}

function formatFieldEquip() {
  return party.map((member) => `${member.name}: ${formatEquipmentLine(member)}`).join("\n");
}

function itemName(itemId) {
  return itemId ? equipmentData[itemId]?.name || itemId : "なし";
}

function formatEquipmentLine(member) {
  return equipmentSlots.map((slot) => `${slot.label} ${itemName(member.equipment[slot.id])}`).join(" / ");
}

function formatMemberDetail(member) {
  updateMemberStats(member);
  return [
    `${member.name}  Lv${member.level}`,
    `状態異常: ${member.status}`,
    "",
    `HP ${member.hp} / ${member.maxHp}`,
    `MP ${member.mp} / ${member.maxMp}`,
    `攻撃 ${member.atk}`,
    `魔法攻撃 ${member.mag}`,
    `防御 ${member.def}`,
    "",
    "装備",
    ...equipmentSlots.map((slot) => `${slot.label}: ${itemName(member.equipment[slot.id])}`),
  ].join("\n");
}

function drawWallQuad(points, shade) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.strokeStyle = "rgba(230, 220, 190, 0.15)";
  ctx.stroke();
}

function drawTextureRect(x, y, w, h, base, line) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  const step = Math.max(18, Math.floor(w / 5));
  for (let px = x - (x % step); px < x + w; px += step) {
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px + h * 0.18, y + h);
    ctx.stroke();
  }
  for (let py = y; py < y + h; py += Math.max(20, h / 5)) {
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py + 6);
    ctx.stroke();
  }
}

function cameraPoint(relativeForward, relativeRight) {
  const forward = directions[player.dir];
  const right = directions[(player.dir + 1) % 4];
  return {
    x: player.x + forward.dx * relativeForward + right.dx * relativeRight,
    y: player.y + forward.dy * relativeForward + right.dy * relativeRight,
  };
}

function isOpenAreaView() {
  return false;
}

function drawOpenAreaDungeon(w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.45);
  sky.addColorStop(0, "#12171b");
  sky.addColorStop(1, "#20282d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.48);

  const floor = ctx.createLinearGradient(0, h * 0.48, 0, h);
  floor.addColorStop(0, "#30383b");
  floor.addColorStop(1, "#10100e");
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * 0.48, w, h * 0.52);

  const frames = [
    { left: 0, right: w, top: h * 0.24, bottom: h },
    { left: 150, right: 810, top: h * 0.34, bottom: h * 0.86 },
    { left: 285, right: 675, top: h * 0.43, bottom: h * 0.73 },
    { left: 390, right: 570, top: h * 0.5, bottom: h * 0.62 },
  ];

  drawOpenFloorGrid(frames);

  for (let depth = 3; depth >= 1; depth -= 1) {
    const curr = frames[depth];
    const center = cameraPoint(depth, 0);
    if (cellAt(center.x, center.y) === TILE.WALL) {
      drawTextureRect(
        curr.left,
        curr.top,
        curr.right - curr.left,
        curr.bottom - curr.top,
        depth === 1 ? "#344046" : "#273138",
        "rgba(246, 231, 190, 0.1)",
      );
      break;
    }
    drawSpriteIfNeeded(center.x, center.y, depth, curr);
  }
}

function drawOpenFloorGrid(frames) {
  ctx.strokeStyle = "rgba(234, 214, 158, 0.13)";
  ctx.lineWidth = 2;

  for (let i = 0; i < frames.length - 1; i += 1) {
    const outer = frames[i];
    const inner = frames[i + 1];
    ctx.beginPath();
    ctx.moveTo(outer.left, outer.bottom);
    ctx.lineTo(inner.left, inner.bottom);
    ctx.lineTo(inner.right, inner.bottom);
    ctx.lineTo(outer.right, outer.bottom);
    ctx.stroke();
  }

  const floorTop = frames[3].bottom;
  const floorBottom = frames[0].bottom;
  for (let i = -3; i <= 3; i += 1) {
    const startX = canvas.width / 2 + i * 95;
    ctx.beginPath();
    ctx.moveTo(startX * 0.7 + canvas.width * 0.15, floorTop);
    ctx.lineTo(startX * 1.4 - canvas.width * 0.2, floorBottom);
    ctx.stroke();
  }

  for (let i = 1; i < frames.length; i += 1) {
    const frame = frames[i];
    ctx.beginPath();
    ctx.moveTo(frame.left, frame.bottom);
    ctx.lineTo(frame.right, frame.bottom);
    ctx.stroke();
  }
}