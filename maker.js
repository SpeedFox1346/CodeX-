const mapCanvas = document.querySelector("#mapCanvas");
const mapCtx = mapCanvas.getContext("2d");
const viewCanvas = document.querySelector("#viewCanvas");
const viewCtx = viewCanvas.getContext("2d");
const toolGrid = document.querySelector("#toolGrid");
const eventTextInput = document.querySelector("#eventText");
const projectData = document.querySelector("#projectData");
const message = document.querySelector("#message");
const playButton = document.querySelector("#playButton");

const size = 12;
const tileSize = mapCanvas.width / size;
const tools = [
  { id: "floor", label: "Floor", color: "#d7c7aa" },
  { id: "wall", label: "Wall", color: "#5b6070" },
  { id: "door", label: "Door", color: "#9b6b42" },
  { id: "start", label: "Start", color: "#4c9f70" },
  { id: "npc", label: "NPC", color: "#c75b7a" },
  { id: "erase", label: "Erase", color: "#ffffff" },
];

let activeTool = "wall";
let project = createProject();
let player = { x: 1, y: 1, dir: 1 };
let previewing = false;

function createProject() {
  const map = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => (x === 0 || y === 0 || x === size - 1 || y === size - 1 ? "wall" : "floor"))
  );

  map[2][4] = "wall";
  map[3][4] = "wall";
  map[4][4] = "door";
  map[6][7] = "wall";
  map[7][7] = "wall";

  return {
    name: "Sample Dungeon",
    map,
    start: { x: 1, y: 1, dir: 1 },
    events: [
      { type: "npc", x: 6, y: 3, text: "Welcome to the sample dungeon." },
    ],
  };
}

function buildTools() {
  for (const tool of tools) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = tool.label;
    button.dataset.tool = tool.id;
    button.addEventListener("click", () => {
      activeTool = tool.id;
      updateToolButtons();
    });
    toolGrid.append(button);
  }
  updateToolButtons();
}

function updateToolButtons() {
  for (const button of toolGrid.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.tool === activeTool);
  }
}

function paintTile(x, y) {
  if (!isInside(x, y)) {
    return;
  }

  if (activeTool === "start") {
    project.start = { x, y, dir: 1 };
    project.map[y][x] = "floor";
  } else if (activeTool === "npc") {
    project.map[y][x] = "floor";
    const existing = project.events.find((event) => event.x === x && event.y === y);
    if (existing) {
      existing.text = eventTextInput.value;
    } else {
      project.events.push({ type: "npc", x, y, text: eventTextInput.value });
    }
  } else if (activeTool === "erase") {
    project.map[y][x] = "floor";
    project.events = project.events.filter((event) => event.x !== x || event.y !== y);
  } else {
    project.map[y][x] = activeTool;
  }

  drawAll();
  syncJson();
}

function drawAll() {
  drawMap();
  drawView();
}

function drawMap() {
  mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const tile = project.map[y][x];
      mapCtx.fillStyle = getTileColor(tile);
      mapCtx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      mapCtx.strokeStyle = "rgba(37, 33, 42, 0.18)";
      mapCtx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }

  drawMarker(project.start.x, project.start.y, "#4c9f70", "S");
  for (const event of project.events) {
    drawMarker(event.x, event.y, "#c75b7a", "N");
  }

  if (previewing) {
    drawMarker(player.x, player.y, "#263dff", "P");
  }
}

function drawMarker(x, y, color, label) {
  const cx = x * tileSize + tileSize / 2;
  const cy = y * tileSize + tileSize / 2;
  mapCtx.fillStyle = color;
  mapCtx.beginPath();
  mapCtx.arc(cx, cy, tileSize * 0.28, 0, Math.PI * 2);
  mapCtx.fill();
  mapCtx.fillStyle = "#ffffff";
  mapCtx.font = "700 18px Arial";
  mapCtx.textAlign = "center";
  mapCtx.textBaseline = "middle";
  mapCtx.fillText(label, cx, cy + 1);
}

function drawView() {
  const width = viewCanvas.width;
  const height = viewCanvas.height;
  const horizon = height * 0.48;

  viewCtx.fillStyle = "#a7d9f2";
  viewCtx.fillRect(0, 0, width, horizon);
  viewCtx.fillStyle = "#6a5949";
  viewCtx.fillRect(0, horizon, width, height - horizon);

  const forward = dirVector(player.dir);
  const right = dirVector((player.dir + 1) % 4);

  for (let depth = 4; depth >= 1; depth -= 1) {
    const center = {
      x: player.x + forward.x * depth,
      y: player.y + forward.y * depth,
    };
    const left = {
      x: center.x - right.x,
      y: center.y - right.y,
    };
    const rightCell = {
      x: center.x + right.x,
      y: center.y + right.y,
    };

    drawSideWall(depth, "left", isBlocked(left.x, left.y));
    drawSideWall(depth, "right", isBlocked(rightCell.x, rightCell.y));

    if (isBlocked(center.x, center.y)) {
      drawFrontWall(depth, project.map[center.y]?.[center.x]);
    }
  }

  const front = {
    x: player.x + forward.x,
    y: player.y + forward.y,
  };
  const npc = project.events.find((event) => event.x === front.x && event.y === front.y);
  if (npc) {
    drawNpc();
  }
}

function drawFrontWall(depth, tile) {
  const rect = depthRect(depth);
  viewCtx.fillStyle = tile === "door" ? "#8d5f3c" : "#4f5360";
  viewCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
  viewCtx.strokeStyle = "rgba(255, 255, 255, 0.26)";
  viewCtx.lineWidth = 3;
  viewCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}

function drawSideWall(depth, side, blocked) {
  if (!blocked) {
    return;
  }

  const outer = depthRect(depth - 1);
  const inner = depthRect(depth);
  viewCtx.fillStyle = "#626777";
  viewCtx.beginPath();

  if (side === "left") {
    viewCtx.moveTo(outer.x, outer.y);
    viewCtx.lineTo(inner.x, inner.y);
    viewCtx.lineTo(inner.x, inner.y + inner.h);
    viewCtx.lineTo(outer.x, outer.y + outer.h);
  } else {
    viewCtx.moveTo(outer.x + outer.w, outer.y);
    viewCtx.lineTo(inner.x + inner.w, inner.y);
    viewCtx.lineTo(inner.x + inner.w, inner.y + inner.h);
    viewCtx.lineTo(outer.x + outer.w, outer.y + outer.h);
  }

  viewCtx.closePath();
  viewCtx.fill();
}

function drawNpc() {
  viewCtx.fillStyle = "#c75b7a";
  viewCtx.beginPath();
  viewCtx.arc(viewCanvas.width / 2, viewCanvas.height * 0.58, 34, 0, Math.PI * 2);
  viewCtx.fill();
  viewCtx.fillStyle = "#fff4f8";
  viewCtx.beginPath();
  viewCtx.arc(viewCanvas.width / 2 - 12, viewCanvas.height * 0.56, 5, 0, Math.PI * 2);
  viewCtx.arc(viewCanvas.width / 2 + 12, viewCanvas.height * 0.56, 5, 0, Math.PI * 2);
  viewCtx.fill();
}

function depthRect(depth) {
  if (depth <= 0) {
    return { x: 0, y: 0, w: viewCanvas.width, h: viewCanvas.height };
  }

  const scale = 1 / (depth + 0.2);
  const w = viewCanvas.width * scale;
  const h = viewCanvas.height * scale;
  return {
    x: (viewCanvas.width - w) / 2,
    y: (viewCanvas.height - h) / 2,
    w,
    h,
  };
}

function getTileColor(tile) {
  if (tile === "wall") return "#5b6070";
  if (tile === "door") return "#9b6b42";
  return "#d7c7aa";
}

function dirVector(dir) {
  return [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ][dir];
}

function isBlocked(x, y) {
  return !isInside(x, y) || project.map[y][x] === "wall" || project.map[y][x] === "door";
}

function isInside(x, y) {
  return x >= 0 && y >= 0 && x < size && y < size;
}

function syncJson() {
  projectData.value = JSON.stringify(project, null, 2);
}

function importJson() {
  try {
    const nextProject = JSON.parse(projectData.value);
    if (!Array.isArray(nextProject.map) || nextProject.map.length !== size) {
      throw new Error("Map must be 12x12.");
    }
    project = nextProject;
    eventTextInput.value = project.events[0]?.text || "";
    startPreview();
    syncJson();
  } catch (error) {
    message.textContent = `Import failed: ${error.message}`;
  }
}

function startPreview() {
  player = { ...project.start };
  previewing = true;
  message.textContent = "Preview ready. Move with arrows or WASD. Enter talks.";
  drawAll();
}

function tryMove() {
  const forward = dirVector(player.dir);
  const nextX = player.x + forward.x;
  const nextY = player.y + forward.y;
  if (!isBlocked(nextX, nextY)) {
    player.x = nextX;
    player.y = nextY;
    message.textContent = "Exploring...";
  } else {
    message.textContent = "A wall blocks the way.";
  }
  drawAll();
}

function talk() {
  const forward = dirVector(player.dir);
  const targetX = player.x + forward.x;
  const targetY = player.y + forward.y;
  const npc = project.events.find((event) => event.x === targetX && event.y === targetY);
  message.textContent = npc ? npc.text : "There is no one to talk to.";
}

mapCanvas.addEventListener("click", (event) => {
  const rect = mapCanvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * size);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * size);
  paintTile(x, y);
});

document.querySelector("#loadSampleButton").addEventListener("click", () => {
  project = createProject();
  eventTextInput.value = project.events[0].text;
  startPreview();
  syncJson();
});

document.querySelector("#exportButton").addEventListener("click", syncJson);
document.querySelector("#importButton").addEventListener("click", importJson);
playButton.addEventListener("click", startPreview);

window.addEventListener("keydown", (event) => {
  if (!previewing) {
    return;
  }

  if (["ArrowUp", "KeyW"].includes(event.code)) {
    event.preventDefault();
    tryMove();
  } else if (["ArrowLeft", "KeyA"].includes(event.code)) {
    event.preventDefault();
    player.dir = (player.dir + 3) % 4;
    drawAll();
  } else if (["ArrowRight", "KeyD"].includes(event.code)) {
    event.preventDefault();
    player.dir = (player.dir + 1) % 4;
    drawAll();
  } else if (["ArrowDown", "KeyS"].includes(event.code)) {
    event.preventDefault();
    player.dir = (player.dir + 2) % 4;
    drawAll();
  } else if (event.code === "Enter") {
    event.preventDefault();
    talk();
  }
});

buildTools();
startPreview();
syncJson();
