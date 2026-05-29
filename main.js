const canvas = document.getElementById("dungeon");
const ctx = canvas.getContext("2d");
const positionText = document.getElementById("positionText");
const messageText = document.getElementById("messageText");
const miniMap = document.getElementById("miniMap");
const battleParty = document.getElementById("battleParty");
const battleCommand = document.getElementById("battleCommand");
const battleSelect = document.getElementById("battleSelect");
const battleSelectTitle = document.getElementById("battleSelectTitle");
const battleSelectOptions = document.getElementById("battleSelectOptions");
const battleSelectHelp = document.querySelector(".battle-select-help");
const settingsOverlay = document.getElementById("settingsOverlay");
const menuOverlay = document.getElementById("menuOverlay");
const menuOverlayTitle = document.getElementById("menuOverlayTitle");
const menuOverlayDetail = document.getElementById("menuOverlayDetail");
const menuOverlayOptions = document.getElementById("menuOverlayOptions");
const titleOverlay = document.getElementById("titleOverlay");
const displayModeSetting = document.getElementById("displayModeSetting");
const displayModeValue = document.getElementById("displayModeValue");
const battleSpeedInput = document.getElementById("battleSpeed");
const battleSpeedValue = document.getElementById("battleSpeedValue");
const volumeInputs = {
  master: document.getElementById("masterVolume"),
  bgm: document.getElementById("bgmVolume"),
  se: document.getElementById("seVolume"),
};
const volumeValueLabels = {
  master: document.getElementById("masterVolumeValue"),
  bgm: document.getElementById("bgmVolumeValue"),
  se: document.getElementById("seVolumeValue"),
};
const BASE_GAME_WIDTH = 1360;
const BASE_GAME_HEIGHT = 900;
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const fieldMenuButtonIds = ["statusMenu", "itemMenu", "equipMenu", "saveMenu", "fieldMagicMenu", "inspect", "settingsMenu", "returnTitleMenu"];
const settingsRowIds = ["displayModeSetting", "masterVolume", "bgmVolume", "seVolume", "battleSpeed"];
const titleButtonIds = ["titleStart", "titleLoad", "titleSettings"];
const SAVE_KEY_PREFIX = "dungeon-rpg-prototype-slot-";

const TILE = {
  WALL: "#",
  FLOOR: ".",
  START: "S",
  STAIRS: "U",
  STAIRS_DOWN: "D",
  CHEST: "C",
  OPEN_CHEST: "O",
  ENEMY: "E",
  BOSS: "B",
  HEAL: "H",
  ENTRANCE: "I",
  SHOP_WEAPON: "W",
  SHOP_ITEM: "M",
  SHOP_INN: "R",
  SHOP_CHURCH: "P",
  SHOP_ARMOR: "A",
  VILLAGER_1: "1",
  VILLAGER_2: "2",
  VILLAGER_3: "3",
};

const maps = [
  {
    id: "B1F",
    encounter: false,
    rows: [
      "#########",
      "#I..C...#",
      "#.###.#.#",
      "#...#.#U#",
      "###.#.#.#",
      "#...E...#",
      "#########",
    ],
  },
  {
    id: "B2F",
    encounter: true,
    rows: [
      "##################",
      "#D....#.....C....#",
      "#.##..#.####.###.#",
      "#..#..#..........#",
      "##.#.####..###...#",
      "#...........H....#",
      "#.####..######...#",
      "#......C.........#",
      "#.##########.#####",
      "#..............BU#",
      "####.#.######.####",
      "#......#.........#",
      "#.##############.#",
      "##################",
    ],
  },
  {
    id: "TOWN",
    encounter: false,
    rows: [
      "###################",
      "#S...............D#",
      "#.###.###.###.###.#",
      "#.W.#.M.#.R.#.P...#",
      "#.###.###.###.###.#",
      "#.................#",
      "#.###.............#",
      "#.A.#.............#",
      "#.###.............#",
      "#..........1.2.3..#",
      "###################",
    ],
  },
];

let currentMapIndex = 0;
let map = maps[currentMapIndex].rows.map((row) => row.split(""));
const directions = [
  { name: "N", dx: 0, dy: -1 },
  { name: "E", dx: 1, dy: 0 },
  { name: "S", dx: 0, dy: 1 },
  { name: "W", dx: -1, dy: 0 },
];

const player = {
  x: 1,
  y: 1,
  dir: 1,
};

function setGameScale() {
  const sideMargin = 32;
  const topMargin = 16;
  const availableWidth = Math.max(320, window.innerWidth - sideMargin);
  const availableHeight = Math.max(320, window.innerHeight - topMargin - sideMargin);
  const scale = Math.min(1, availableWidth / BASE_GAME_WIDTH, availableHeight / BASE_GAME_HEIGHT);
  document.documentElement.style.setProperty("--game-scale", scale.toFixed(4));
  document.documentElement.style.setProperty("--scaled-game-width", `${BASE_GAME_WIDTH * scale}px`);
  document.documentElement.style.setProperty("--scaled-game-height", `${BASE_GAME_HEIGHT * scale}px`);
}

function volumeCurve(value) {
  return Math.pow(clamp(value, 0, 100) / 100, 1.6);
}

function bgmVolumeCurve(value) {
  return clamp(value, 0, 100) / 50;
}

function applyAudioSettings() {
  if (masterGain) masterGain.gain.value = volumeCurve(audioSettings.master);
  if (bgmGain) bgmGain.gain.value = 0.36 * bgmVolumeCurve(audioSettings.bgm);
  if (seGain) seGain.gain.value = 0.9 * volumeCurve(audioSettings.se);
  Object.entries(volumeInputs).forEach(([key, input]) => {
    if (!input) return;
    input.value = audioSettings[key];
    volumeValueLabels[key].textContent = String(audioSettings[key]);
  });
}

function setupAudio() {
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    bgmGain = audioContext.createGain();
    seGain = audioContext.createGain();
    bgmGain.connect(masterGain);
    seGain.connect(masterGain);
    masterGain.connect(audioContext.destination);
    applyAudioSettings();
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playTone(frequency, startTime, duration, type, volume, destination = masterGain) {
  if (!audioContext || !destination) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function playDecisionSound() {
  const context = setupAudio();
  if (!context) return;
  const now = context.currentTime;
  playTone(880, now, 0.055, "square", 0.18, seGain);
  playTone(1320, now + 0.035, 0.05, "square", 0.12, seGain);
  updateBgm();
}

function playHitSound() {
  const context = setupAudio();
  if (!context) return;
  const now = context.currentTime;
  playTone(140, now, 0.06, "square", 0.24, seGain);
  playTone(82, now + 0.025, 0.08, "sawtooth", 0.16, seGain);
}

function playMagicSound(spell) {
  const context = setupAudio();
  if (!context) return;
  const now = context.currentTime;
  const name = spell?.label || "";

  if (spell?.heal) {
    playTone(523.25, now, 0.12, "sine", 0.12, seGain);
    playTone(659.25, now + 0.08, 0.14, "sine", 0.1, seGain);
    playTone(783.99, now + 0.16, 0.16, "sine", 0.08, seGain);
    return;
  }
  if (spell?.guardAll) {
    playTone(196, now, 0.16, "triangle", 0.12, seGain);
    playTone(246.94, now + 0.08, 0.16, "triangle", 0.1, seGain);
    return;
  }
  if (name.includes("ファイア")) {
    playTone(196, now, 0.08, "sawtooth", 0.14, seGain);
    playTone(392, now + 0.035, 0.1, "sawtooth", 0.12, seGain);
  } else if (name.includes("スパーク")) {
    playTone(880, now, 0.04, "square", 0.13, seGain);
    playTone(1320, now + 0.045, 0.04, "square", 0.11, seGain);
    playTone(660, now + 0.09, 0.05, "square", 0.09, seGain);
  } else if (name.includes("アイス")) {
    playTone(740, now, 0.1, "sine", 0.11, seGain);
    playTone(554.37, now + 0.07, 0.12, "triangle", 0.09, seGain);
  } else if (name.includes("ウィンド")) {
    playTone(349.23, now, 0.09, "triangle", 0.09, seGain);
    playTone(523.25, now + 0.06, 0.1, "triangle", 0.08, seGain);
  } else if (name.includes("ライト")) {
    playTone(659.25, now, 0.09, "sine", 0.1, seGain);
    playTone(987.77, now + 0.06, 0.13, "sine", 0.09, seGain);
  } else if (name.includes("ダーク")) {
    playTone(146.83, now, 0.14, "sawtooth", 0.13, seGain);
    playTone(110, now + 0.06, 0.16, "triangle", 0.1, seGain);
  } else {
    playTone(440, now, 0.08, "triangle", 0.1, seGain);
    playTone(660, now + 0.06, 0.1, "triangle", 0.08, seGain);
  }
}

function startAudioFromInput() {
  if (!setupAudio()) return;
  updateBgm();
}

function bgmNotesForTrack(track) {
  if (track === "boss") {
    return {
      tempo: 190,
      lead: [196, 246.94, 293.66, 392, 369.99, 293.66, 246.94, 220],
      bass: [98, 98, 116.54, 116.54, 130.81, 130.81, 116.54, 87.31],
      type: "sawtooth",
    };
  }
  if (track === "battle") {
    return {
      tempo: 165,
      lead: [220, 277.18, 329.63, 392, 329.63, 277.18, 246.94, 293.66],
      bass: [110, 110, 130.81, 130.81, 146.83, 146.83, 130.81, 98],
      type: "sawtooth",
    };
  }
  if (track === "town") {
    return {
      tempo: 96,
      lead: [329.63, 392, 440, 392, 349.23, 392, 329.63, 293.66],
      bass: [164.81, 164.81, 196, 196, 174.61, 174.61, 146.83, 146.83],
      type: "sine",
    };
  }
  return {
    tempo: 112,
    lead: [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23],
    bass: [130.81, 130.81, 146.83, 146.83, 164.81, 164.81, 146.83, 146.83],
    type: "triangle",
  };
}

function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
  bgmTrack = null;
}

function scheduleBgmStep(track) {
  if (!audioContext || !bgmGain) return;
  const data = bgmNotesForTrack(track);
  const beat = 60 / data.tempo;
  const now = audioContext.currentTime;
  const index = bgmStep % data.lead.length;
  playTone(data.lead[index], now, beat * 0.42, data.type, track === "battle" ? 0.09 : 0.07, bgmGain);
  if (index % 2 === 0) {
    playTone(data.bass[index], now, beat * 0.85, "square", track === "battle" ? 0.055 : 0.04, bgmGain);
  }
  bgmStep += 1;
}

function startBgm(track) {
  if (!setupAudio() || bgmTrack === track) return;
  stopBgm();
  bgmTrack = track;
  bgmStep = 0;
  const interval = (60 / bgmNotesForTrack(track).tempo) * 500;
  scheduleBgmStep(track);
  bgmTimer = setInterval(() => scheduleBgmStep(track), interval);
}

function updateBgm() {
  if (!audioContext) return;
  if (titleActive) {
    stopBgm();
    return;
  }
  if (sceneMode === "battle") {
    startBgm(battleKind === "boss" ? "boss" : "battle");
    return;
  }
  startBgm(sceneMode === "town" ? "town" : "field");
}

function setFieldMenuActive(active) {
  fieldMenuActive = active;
  if (!active) selectedFieldMenu = 0;
  renderFieldMenuSelection();
}

function moveFieldMenuSelection(delta) {
  if (!fieldMenuActive) return;
  selectedFieldMenu = (selectedFieldMenu + delta + fieldMenuButtonIds.length) % fieldMenuButtonIds.length;
  renderFieldMenuSelection();
}

function confirmFieldMenuSelection() {
  if (!fieldMenuActive) return;
  document.getElementById(fieldMenuButtonIds[selectedFieldMenu]).click();
}

function renderFieldMenuSelection() {
  fieldMenuButtonIds.forEach((id, index) => {
    const button = document.getElementById(id);
    if (button) button.classList.toggle("is-selected", fieldMenuActive && index === selectedFieldMenu);
  });
}

function renderSettingsSelection() {
  settingsRowIds.forEach((id, index) => {
    const element = document.getElementById(id);
    const row = element?.closest(".settings-row");
    if (row) row.classList.toggle("is-selected", settingsOpen && index === selectedSetting);
  });
}

function openSettings() {
  settingsOpen = true;
  selectedSetting = 0;
  settingsOverlay.classList.add("is-visible");
  renderBattleSpeedSetting();
  renderSettingsSelection();
}

function closeSettings() {
  settingsOpen = false;
  settingsOverlay.classList.remove("is-visible");
  renderSettingsSelection();
  if (returnToTitleAfterSettings) {
    returnToTitleAfterSettings = false;
    setTitleActive(true);
  }
}

function toggleDisplayMode() {
  displayMode = displayMode === "window" ? "fullscreen" : "window";
  displayModeValue.textContent = displayMode === "window" ? "ウィンドウ" : "フルスクリーン";
}

function adjustSelectedSetting(delta) {
  if (selectedSetting === 0) {
    toggleDisplayMode();
    return;
  }
  if (selectedSetting === 4) {
    battleSettings.speed = clamp(battleSettings.speed + Math.sign(delta), 1, 8);
    renderBattleSpeedSetting();
    return;
  }
  const keys = ["master", "bgm", "se"];
  const key = keys[selectedSetting - 1];
  audioSettings[key] = clamp(audioSettings[key] + delta, 0, 100);
  applyAudioSettings();
}

function renderBattleSpeedSetting() {
  if (!battleSpeedInput || !battleSpeedValue) return;
  battleSpeedInput.value = battleSettings.speed;
  battleSpeedValue.textContent = String(battleSettings.speed);
}

function setTitleActive(active) {
  titleActive = active;
  titleOverlay.classList.toggle("is-hidden", !active);
  renderTitleSelection();
  if (active) stopBgm();
}

function renderTitleSelection() {
  titleButtonIds.forEach((id, index) => {
    document.getElementById(id).classList.toggle("is-selected", titleActive && index === selectedTitleMenu);
  });
}

function moveTitleSelection(delta) {
  if (!titleActive) return;
  selectedTitleMenu = (selectedTitleMenu + delta + titleButtonIds.length) % titleButtonIds.length;
  renderTitleSelection();
}

function confirmTitleSelection() {
  if (!titleActive) return;
  document.getElementById(titleButtonIds[selectedTitleMenu]).click();
}

function openMenuOverlay(title, detail, options, onCancel = closeMenuOverlay) {
  activeMenuOverlay = { title, detail, options, selectedIndex: 0, onCancel };
  renderMenuOverlay();
}

function closeMenuOverlay() {
  activeMenuOverlay = null;
  menuOverlay.classList.remove("is-visible");
  menuOverlayOptions.innerHTML = "";
  menuOverlayDetail.textContent = "";
}

function renderMenuOverlay() {
  if (!activeMenuOverlay) {
    closeMenuOverlay();
    return;
  }
  menuOverlayTitle.textContent = activeMenuOverlay.title;
  menuOverlayDetail.textContent = activeMenuOverlay.detail || "";
  menuOverlayOptions.innerHTML = "";
  activeMenuOverlay.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.classList.toggle("is-selected", index === activeMenuOverlay.selectedIndex);
    button.addEventListener("click", () => {
      activeMenuOverlay.selectedIndex = index;
      confirmMenuOverlay();
    });
    menuOverlayOptions.appendChild(button);
  });
  menuOverlay.classList.add("is-visible");
}

function moveMenuOverlay(delta) {
  if (!activeMenuOverlay) return;
  activeMenuOverlay.selectedIndex =
    (activeMenuOverlay.selectedIndex + delta + activeMenuOverlay.options.length) % activeMenuOverlay.options.length;
  renderMenuOverlay();
}

function confirmMenuOverlay() {
  if (!activeMenuOverlay) return;
  activeMenuOverlay.options[activeMenuOverlay.selectedIndex]?.action();
}

function openStatusMenu() {
  setFieldMenuActive(false);
  openMenuOverlay(
    "ステータス: キャラクター選択",
    "確認するキャラクターを選択してください。",
    party.map((member, index) => ({ label: member.name, action: () => openStatusDetail(index) })),
  );
}

function openStatusDetail(index) {
  const member = party[index];
  openMenuOverlay("ステータス", formatMemberDetail(member), [{ label: "閉じる", action: closeMenuOverlay }], openStatusMenu);
}

function openFieldItemMenu() {
  setFieldMenuActive(false);
  const itemOptions = [
    { key: "herb", label: `薬草 x ${inventory.herb}`, usable: inventory.herb > 0 },
    { key: "magicStone", label: `魔石 x ${inventory.magicStone}`, usable: inventory.magicStone > 0 },
    { key: "antidote", label: `解毒剤 x ${inventory.antidote}`, usable: inventory.antidote > 0 },
    { key: "paralysisHerb", label: `麻痺消し草 x ${inventory.paralysisHerb}`, usable: inventory.paralysisHerb > 0 },
  ];
  openMenuOverlay(
    "アイテム",
    "使用するアイテムを選択してください。\n薬草: HP +20 / 魔石: MP +15 / 解毒剤: 毒を回復",
    itemOptions.map((item) => ({
      label: item.label,
      action: () => {
        if (!item.usable) {
          setMessage("そのアイテムは所持していません。");
          return;
        }
        openItemTargetMenu(item.key);
      },
    })),
  );
}

function openItemTargetMenu(itemKey) {
  openMenuOverlay(
    "アイテム: 対象選択",
    "使用する相手を選択してください。",
    party.map((member, index) => ({ label: member.name, action: () => useFieldItem(itemKey, index) })),
    openFieldItemMenu,
  );
}

function useFieldItem(itemKey, memberIndex) {
  const member = party[memberIndex];
  if (!member || inventory[itemKey] <= 0) return;
  updateMemberStats(member);
  inventory[itemKey] -= 1;
  if (itemKey === "herb") {
    const amount = Math.min(20, member.maxHp - member.hp);
    member.hp += amount;
    setMessage(`${member.name} に薬草を使った。HPが ${amount} 回復した。`);
  }
  if (itemKey === "magicStone") {
    const amount = Math.min(15, member.maxMp - member.mp);
    member.mp += amount;
    setMessage(`${member.name} に魔石を使った。MPが ${amount} 回復した。`);
  }
  if (itemKey === "antidote") {
    member.status = "健康";
    setMessage(`${member.name} に解毒剤を使った。状態異常が回復した。`);
  }
  if (itemKey === "paralysisHerb") {
    member.status = "健康";
    setMessage(`${member.name} に麻痺消し草を使った。麻痺が回復した。`);
  }
  closeMenuOverlay();
  render();
}

function openEquipMemberMenu() {
  setFieldMenuActive(false);
  openMenuOverlay(
    "装備: キャラクター選択",
    "装備を変更するキャラクターを選択してください。",
    party.map((member, index) => ({ label: member.name, action: () => openEquipSlotMenu(index) })),
  );
}

function openEquipSlotMenu(memberIndex) {
  const member = party[memberIndex];
  openMenuOverlay(
    "装備: スロット選択",
    formatMemberDetail(member),
    equipmentSlots.map((slot) => ({
      label: `${slot.label}: ${itemName(member.equipment[slot.id])}`,
      action: () => openEquipItemMenu(memberIndex, slot.id),
    })),
    openEquipMemberMenu,
  );
}

function openEquipItemMenu(memberIndex, slotId) {
  const member = party[memberIndex];
  const slot = equipmentSlots.find((entry) => entry.id === slotId);
  const choices = [{ itemId: null, label: "外す" }];
  Object.entries(equipmentInventory).forEach(([itemId, count]) => {
    const item = equipmentData[itemId];
    if (count > 0 && item.slots.includes(slotId)) choices.push({ itemId, label: `${item.name} x ${count}` });
  });
  openMenuOverlay(
    `装備: ${slot.label}`,
    `${member.name} の ${slot.label} を変更します。`,
    choices.map((choice) => ({ label: choice.label, action: () => equipItem(memberIndex, slotId, choice.itemId) })),
    () => openEquipSlotMenu(memberIndex),
  );
}

function returnEquippedItem(member, slotId) {
  const oldItem = member.equipment[slotId];
  if (oldItem) equipmentInventory[oldItem] += 1;
  member.equipment[slotId] = null;
}

function equipItem(memberIndex, slotId, itemId) {
  const member = party[memberIndex];
  if (!member) return;
  const previousMaxHp = member.maxHp || member.baseMaxHp;
  const previousMaxMp = member.maxMp || member.baseMaxMp;
  const otherHand = slotId === "rightHand" ? "leftHand" : slotId === "leftHand" ? "rightHand" : null;

  if (itemId && equipmentInventory[itemId] <= 0) return;
  if (itemId && equipmentData[itemId].twoHanded && otherHand) returnEquippedItem(member, otherHand);
  if (itemId && otherHand && equipmentData[member.equipment[otherHand]]?.twoHanded) returnEquippedItem(member, otherHand);

  returnEquippedItem(member, slotId);
  if (itemId) {
    equipmentInventory[itemId] -= 1;
    member.equipment[slotId] = itemId;
  }
  updateMemberStats(member);
  if (member.maxHp > previousMaxHp) member.hp += member.maxHp - previousMaxHp;
  if (member.maxMp > previousMaxMp) member.mp += member.maxMp - previousMaxMp;
  member.hp = clamp(member.hp, 0, member.maxHp);
  member.mp = clamp(member.mp, 0, member.maxMp);
  setMessage(`${member.name} の装備を変更しました。`);
  openEquipSlotMenu(memberIndex);
  render();
}

function serializeGameState() {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    currentMapIndex,
    sceneMode: sceneMode === "town" ? "town" : "dungeon",
    player: { ...player },
    openedChests: [...openedChests],
    defeatedBosses: [...defeatedBosses],
    inventory: { ...inventory },
    equipmentInventory: { ...equipmentInventory },
    party: party.map(cloneMember),
    stepsSinceEncounter,
    pendingBattleReturnMessage,
    townMessage,
  };
}

function restoreGameState(saveData) {
  if (!saveData || typeof saveData !== "object") return false;
  currentMapIndex = saveData.currentMapIndex ?? 0;
  map = maps[currentMapIndex].rows.map((row) => row.split(""));
  openedChests.clear();
  (saveData.openedChests || []).forEach((key) => openedChests.add(key));
  defeatedBosses.clear();
  (saveData.defeatedBosses || []).forEach((key) => defeatedBosses.add(key));
  applyOpenedChests();

  Object.keys(inventory).forEach((key) => {
    inventory[key] = saveData.inventory?.[key] ?? inventory[key];
  });
  Object.keys(equipmentInventory).forEach((key) => {
    equipmentInventory[key] = saveData.equipmentInventory?.[key] ?? equipmentInventory[key];
  });

  party = (saveData.party || initialParty).map((member) => cloneMember(member));
  updatePartyStats();
  player.x = saveData.player?.x ?? player.x;
  player.y = saveData.player?.y ?? player.y;
  player.dir = saveData.player?.dir ?? player.dir;
  stepsSinceEncounter = saveData.stepsSinceEncounter ?? 0;
  pendingBattleReturnMessage = saveData.pendingBattleReturnMessage ?? "";
  townMessage = saveData.townMessage ?? "街に到着しました。利用する施設を選んでください。";
  sceneMode = saveData.sceneMode === "town" ? "town" : "dungeon";
  battleStatus = "";
  battleLog = [];
  battleKind = "normal";
  battleSource = null;
  battlePhase = "input";
  queuedBattleActions = [];
  activeActorIndex = 0;
  closeBattleMenu(false);
  closeMenuOverlay();
  setMessage("ロードしました。保存地点から再開します。");
  setTitleActive(false);
  render();
  return true;
}

function resetNewGame() {
  currentMapIndex = 0;
  map = maps[currentMapIndex].rows.map((row) => row.split(""));
  openedChests.clear();
  defeatedBosses.clear();
  inventory.herb = 0;
  inventory.magicStone = 2;
  inventory.antidote = 2;
  inventory.paralysisHerb = 1;
  Object.assign(equipmentInventory, {
    dagger: 1,
    staff: 1,
    axe: 1,
    robe: 1,
    leather: 1,
    chainmail: 1,
    leatherHelm: 0,
    leatherBoots: 0,
    buckler: 0,
    ironArmor: 0,
    copperSword: 0,
    rod: 0,
    metalAxe: 0,
    ring: 1,
    amulet: 1,
  });
  party = initialParty.map((member) => cloneMember(member));
  updatePartyStats();
  placePlayerAt(TILE.START);
  player.dir = 1;
  sceneMode = "dungeon";
  battleStatus = "";
  battleLog = [];
  battleKind = "normal";
  battleSource = null;
  battlePhase = "input";
  queuedBattleActions = [];
  activeActorIndex = 0;
  stepsSinceEncounter = 0;
  pendingBattleReturnMessage = "";
  townMessage = "街に到着しました。利用する施設を選んでください。";
  closeBattleMenu(false);
  closeMenuOverlay();
  setMessage("入口から開始しました。前進、左右90度回転で探索できます。");
  setTitleActive(false);
  render();
}

function saveSlotKey(slot) {
  return `${SAVE_KEY_PREFIX}${slot}`;
}

function readSaveSlot(slot) {
  try {
    const raw = localStorage.getItem(saveSlotKey(slot));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSaveSlot(slot) {
  try {
    localStorage.setItem(saveSlotKey(slot), JSON.stringify(serializeGameState()));
    localStorage.removeItem(`${SAVE_KEY_PREFIX}test`);
    return true;
  } catch (error) {
    console.warn("Save failed:", error);
    return false;
  }
}

function getStorageUnavailableMessage() {
  if (location.protocol === "file:") {
    return "セーブに失敗しました。Codex内ブラウザやfile実行では保存領域が制限される場合があります。Chrome/Edge、またはローカルサーバー経由で確認してください。";
  }
  return "セーブに失敗しました。ブラウザの保存領域を確認してください。";
}

function formatSaveSlotLabel(slot) {
  const saveData = readSaveSlot(slot);
  if (!saveData) return `スロット ${slot}: 空き`;
  const mapId = maps[saveData.currentMapIndex]?.id || "不明";
  const x = saveData.player?.x ?? "-";
  const y = saveData.player?.y ?? "-";
  const date = saveData.savedAt ? new Date(saveData.savedAt).toLocaleString("ja-JP") : "日時不明";
  return `スロット ${slot}: ${mapId} X:${x} Y:${y} / ${date}`;
}

function openSaveMenu() {
  const options = [1, 2, 3].map((slot) => ({
    label: `スロット ${slot}`,
    action: () => {
      if (!writeSaveSlot(slot)) {
        setMessage(getStorageUnavailableMessage());
        return;
      }
      closeMenuOverlay();
      setMessage(`スロット ${slot} にセーブしました。`);
      render();
    },
  }));
  openMenuOverlay("セーブ", [1, 2, 3].map(formatSaveSlotLabel).join("\n"), options);
}

function openLoadMenu() {
  const wasTitle = titleActive;
  if (wasTitle) setTitleActive(false);
  const options = [1, 2, 3].map((slot) => {
    const saveData = readSaveSlot(slot);
    return {
      label: saveData ? `スロット ${slot}` : `空き ${slot}`,
      action: () => {
        if (!saveData) {
          setMessage(`スロット ${slot} にはセーブデータがありません。`);
          return;
        }
        restoreGameState(saveData);
      },
    };
  });
  openMenuOverlay("ロード", [1, 2, 3].map(formatSaveSlotLabel).join("\n"), options, () => {
    closeMenuOverlay();
    if (wasTitle) setTitleActive(true);
  });
}

function returnToTitle() {
  setFieldMenuActive(false);
  closeMenuOverlay();
  closeSettings();
  closeBattleMenu(false);
  battleStatus = "";
  battleLog = [];
  battlePhase = "input";
  queuedBattleActions = [];
  setMessage("タイトルへ戻りました。");
  setTitleActive(true);
  render();
}

function openReturnTitleConfirm() {
  setFieldMenuActive(false);
  openMenuOverlay(
    "タイトルへ戻る",
    "タイトル画面に戻ります。\nセーブしていない進行は失われます。",
    [
      { label: "はい", action: returnToTitle },
      {
        label: "いいえ",
        action: () => {
          closeMenuOverlay();
          setMessage("探索に戻りました。");
          render();
        },
      },
    ],
  );
}

let sceneMode = "dungeon";
let titleActive = true;
let selectedTitleMenu = 0;
let returnToTitleAfterSettings = false;
let previousSceneMode = "dungeon";
let battleStatus = "";
let battleLog = [];
let activeBattleMenu = null;
let selectedBattleCommand = 0;
const battleCommandIds = ["attackCommand", "magicCommand", "guardCommand", "equipCommand", "battleItemCommand", "escapeCommand"];
const openedChests = new Set();
const defeatedBosses = new Set();
const inventory = { herb: 0, magicStone: 2, antidote: 2, paralysisHerb: 1 };
let stepsSinceEncounter = 0;
let pendingBattleReturnMessage = "";
let townMessage = "街に到着しました。利用する施設を選んでください。";
let battleKind = "normal";
let battleSource = null;
let audioContext = null;
let bgmTrack = null;
let bgmTimer = null;
let bgmStep = 0;
let masterGain = null;
let bgmGain = null;
let seGain = null;
let fieldMenuActive = false;
let selectedFieldMenu = 0;
let settingsOpen = false;
let selectedSetting = 0;
let displayMode = "window";
let activeMenuOverlay = null;
const audioSettings = {
  master: 50,
  bgm: 50,
  se: 50,
};
const battleSettings = {
  speed: 4,
};

const emptyEquipment = {
  head: null,
  body: null,
  legs: null,
  rightHand: null,
  leftHand: null,
  accessory1: null,
  accessory2: null,
};

const equipmentSlots = [
  { id: "head", label: "頭" },
  { id: "body", label: "胴" },
  { id: "legs", label: "脚" },
  { id: "rightHand", label: "右手" },
  { id: "leftHand", label: "左手" },
  { id: "accessory1", label: "アクセサリー1" },
  { id: "accessory2", label: "アクセサリー2" },
];

const equipmentData = {
  dagger: { name: "短剣", slots: ["rightHand", "leftHand"], atk: 1 },
  staff: { name: "杖", slots: ["rightHand", "leftHand"], mag: 2 },
  axe: { name: "斧", slots: ["rightHand", "leftHand"], atk: 3, twoHanded: true },
  copperSword: { name: "銅の剣", slots: ["rightHand", "leftHand"], atk: 4 },
  rod: { name: "ロッド", slots: ["rightHand", "leftHand"], mag: 5 },
  metalAxe: { name: "メタルアックス", slots: ["rightHand", "leftHand"], atk: 7, twoHanded: true },
  robe: { name: "ローブ", slots: ["body"], def: 1 },
  leather: { name: "革鎧", slots: ["body"], def: 2 },
  chainmail: { name: "鎖帷子", slots: ["body"], def: 5 },
  leatherHelm: { name: "革の兜", slots: ["head"], def: 1 },
  leatherBoots: { name: "革の脚具", slots: ["legs"], def: 1 },
  buckler: { name: "片手シールド", slots: ["leftHand"], def: 2 },
  ironArmor: { name: "鉄の胸当て", slots: ["body"], def: 7 },
  ring: { name: "指輪", slots: ["accessory1", "accessory2"], maxHp: 5 },
  amulet: { name: "護符", slots: ["accessory1", "accessory2"], maxMp: 5 },
};

const equipmentInventory = {
  dagger: 1,
  staff: 1,
  axe: 1,
  robe: 1,
  leather: 1,
  chainmail: 1,
  leatherHelm: 0,
  leatherBoots: 0,
  buckler: 0,
  ironArmor: 0,
  copperSword: 0,
  rod: 0,
  metalAxe: 0,
  ring: 1,
  amulet: 1,
};

const initialParty = [
  {
    name: "ケビン",
    job: "冒険者",
    level: 5,
    baseMaxHp: 100,
    baseMaxMp: 36,
    baseAtk: 20,
    baseMag: 14,
    baseDef: 9,
    baseMdef: 7,
    baseSpeed: 16,
    baseLuck: 13,
    magicAccess: 3,
    hp: 100,
    mp: 36,
    status: "健康",
    guarding: false,
    equipment: { ...emptyEquipment, rightHand: "dagger", body: "leather", accessory1: "ring" },
  },
  {
    name: "ジョン",
    job: "魔法使い",
    level: 5,
    baseMaxHp: 84,
    baseMaxMp: 70,
    baseAtk: 10,
    baseMag: 34,
    baseDef: 5,
    baseMdef: 12,
    baseSpeed: 12,
    baseLuck: 16,
    magicAccess: 99,
    hp: 84,
    mp: 70,
    status: "健康",
    guarding: false,
    equipment: { ...emptyEquipment, rightHand: "staff", body: "robe", accessory1: "ring" },
  },
  {
    name: "トムソン",
    job: "戦士",
    level: 5,
    baseMaxHp: 120,
    baseMaxMp: 5,
    baseAtk: 28,
    baseMag: 4,
    baseDef: 12,
    baseMdef: 5,
    baseSpeed: 8,
    baseLuck: 8,
    magicAccess: 0,
    hp: 120,
    mp: 5,
    status: "健康",
    guarding: false,
    equipment: { ...emptyEquipment, rightHand: "axe", body: "chainmail", accessory1: "amulet" },
  },
];

const enemyTypes = {
  gruntA: { name: "ザコA", type: "gruntA", color: "#b45461", hp: 88, maxHp: 88, atk: 15, def: 5, mdef: 5, speed: 10, luck: 10 },
  gruntB: {
    name: "ザコB",
    type: "gruntB",
    color: "#4c9f61",
    hp: 74,
    maxHp: 74,
    atk: 12,
    def: 4,
    mdef: 6,
    speed: 9,
    luck: 12,
    paralysisAttack: true,
  },
};

const initialEnemies = [
  { ...enemyTypes.gruntA, name: "ザコA-1" },
  { ...enemyTypes.gruntA, name: "ザコA-2" },
  { ...enemyTypes.gruntA, name: "ザコA-3" },
];

const initialBossEnemies = [{ name: "BLUE BOSS", hp: 260, maxHp: 260, atk: 24, def: 10, mdef: 8, speed: 11, luck: 14 }];

let party = initialParty.map((member) => ({ ...member, equipment: { ...member.equipment } }));
let enemies = initialEnemies.map((enemy) => ({ ...enemy }));
let activeActorIndex = 0;
let battleFinished = false;
let battlePhase = "input";
let queuedBattleActions = [];
let battleEffectUntil = 0;
let battleEffectTargetKey = null;

const events = {
  I: "入口です。上階から冷たい空気が流れ込んでいます。",
  U: "次の回想へ続く階段です。ここからADVパートへ接続する想定です。",
  C: "宝箱があります。仮配置なので、後でアイテム取得処理を追加できます。",
  O: "既に開いた宝箱だ。",
  D: "戻る階段です。前のマップへ戻れます。",
  H: "回復ポイントです。触れるとHPとMPが全回復します。",
  B: "青い気配を放つ強敵です。触れると戦闘になります。",
  E: "敵影を確認しました。後で戦闘画面への切り替え地点にできます。",
  W: "武器屋です。装備の購入や変更を行う想定です。",
  M: "道具屋です。薬草や魔石を扱っています。",
  R: "宿屋です。休むとHPとMPが回復する想定です。",
  P: "教会です。状態異常を回復できます。",
  A: "防具屋です。防具や盾を扱っています。",
  1: "村人がいます。話しかけられそうです。",
  2: "村人がいます。話しかけられそうです。",
  3: "村人がいます。話しかけられそうです。",
};

const battleMenuData = {
  magic: {
    title: "魔法",
    prompt: "使用する魔法を選択してください。",
    options: [
      { label: "ファイアボール", mpCost: 8, power: 28, description: "炎属性の小ダメージ" },
      { label: "ヒール", mpCost: 6, heal: 34, description: "味方単体のHPを小回復" },
      { label: "スパーク", mpCost: 7, power: 24, description: "雷属性の小ダメージ" },
      { label: "アイスニードル", mpCost: 9, power: 30, description: "氷属性の小ダメージ" },
      { label: "ウィンド", mpCost: 5, power: 20, description: "風属性の小ダメージ" },
      { label: "ライト", mpCost: 10, power: 34, description: "光属性の中ダメージ" },
      { label: "ダーク", mpCost: 10, power: 34, description: "闇属性の中ダメージ" },
      { label: "リカバー", mpCost: 9, heal: 46, description: "味方単体のHPを中回復" },
      { label: "シールド", mpCost: 7, guardAll: true, description: "味方全員の防御態勢" },
    ],
  },
  equip: {
    title: "装備",
    prompt: "変更する装備を選択してください。",
    options: [
      { label: "短剣", status: "短剣を構え直した。", log: "短剣を選択。" },
      { label: "革鎧", status: "革鎧の状態を確認した。", log: "革鎧を選択。" },
      { label: "指輪", status: "指輪の効果を確認した。", log: "指輪を選択。" },
    ],
  },
  item: {
    title: "アイテム",
    prompt: "使用するアイテムを選択してください。",
    options: [
      { label: "薬草", inventoryKey: "herb", heal: 20 },
      { label: "魔石", inventoryKey: "magicStone", mpHeal: 15 },
      { label: "解毒剤", inventoryKey: "antidote", cureStatus: true },
      { label: "麻痺消し草", inventoryKey: "paralysisHerb", cureParalysis: true },
    ],
  },
};

const spriteLabels = {
  I: { title: "ENTRANCE", color: "#7ea0b8" },
  U: { title: "STAIRS", color: "#c9ba7a" },
  D: { title: "DOWN", color: "#8da6c9" },
  C: { title: "CHEST", color: "#b47b42" },
  O: { title: "OPEN", color: "#8c6a48" },
  B: { title: "BOSS", color: "#4e9fe6" },
  H: { title: "HEAL", color: "#75b58a" },
  E: { title: "ENEMY", color: "#b45461" },
  W: { title: "WEAPON", color: "#835f52" },
  M: { title: "ITEM", color: "#58725f" },
  R: { title: "INN", color: "#6c6485" },
  P: { title: "CHURCH", color: "#6b7480" },
  A: { title: "ARMOR", color: "#7f7966" },
  1: { title: "村人", color: "#8c9fbd" },
  2: { title: "村人", color: "#b78b72" },
  3: { title: "村人", color: "#8fb58a" },
};

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
  const base = initialParty.find((entry) => entry.name === member.name) || {};
  return { ...base, ...member, equipment: { ...(base.equipment || emptyEquipment), ...member.equipment } };
}

function updateMemberStats(member) {
  let maxHp = member.baseMaxHp;
  let maxMp = member.baseMaxMp;
  let atk = member.baseAtk;
  let mag = member.baseMag;
  let def = member.baseDef;
  let mdef = member.baseMdef;
  let speed = member.baseSpeed;
  let luck = member.baseLuck;
  Object.values(member.equipment).forEach((itemId) => {
    if (!itemId) return;
    const item = equipmentData[itemId];
    maxHp += item.maxHp || 0;
    maxMp += item.maxMp || 0;
    atk += item.atk || 0;
    mag += item.mag || 0;
    def += item.def || 0;
    mdef += item.mdef || 0;
  });
  member.maxHp = maxHp;
  member.maxMp = maxMp;
  member.atk = atk;
  member.mag = mag;
  member.def = def;
  member.mdef = mdef;
  member.speed = speed;
  member.luck = luck;
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
        `${member.name} Lv${member.level}  ${member.status}\nHP ${member.hp} / ${member.maxHp}  MP ${member.mp} / ${member.maxMp}\n攻撃 ${member.atk}  魔力 ${member.mag}  防御 ${member.def}  魔防 ${member.mdef}\n速さ ${member.speed}  運 ${member.luck}`,
    )
    .join("\n\n");
}

function formatFieldItems() {
  return [`薬草 x ${inventory.herb}`, `魔石 x ${inventory.magicStone}`, `解毒剤 x ${inventory.antidote}`, `麻痺消し草 x ${inventory.paralysisHerb}`].join("\n");
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
    `${member.name}  Lv${member.level}  ${member.job || "冒険者"}`,
    `状態異常: ${member.status}`,
    "",
    `HP ${member.hp} / ${member.maxHp}`,
    `MP ${member.mp} / ${member.maxMp}`,
    `攻撃 ${member.atk}`,
    `魔力 ${member.mag}`,
    `防御 ${member.def}`,
    `魔法防御 ${member.mdef}`,
    `速さ ${member.speed}`,
    `運 ${member.luck}`,
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
  drawFarWallHint(w, h);
  drawSideDepthHints(w, h);

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

function drawFarWallHint(w, h) {
  if (currentMapIndex === 0) return;
  const forward1 = cameraPoint(1, 0);
  const forward2 = cameraPoint(2, 0);
  if (!isWalkable(forward1.x, forward1.y) || cellAt(forward2.x, forward2.y) !== TILE.WALL) return;

  const leftOpen = isWalkable(cameraPoint(1, -1).x, cameraPoint(1, -1).y);
  const rightOpen = isWalkable(cameraPoint(1, 1).x, cameraPoint(1, 1).y);
  const wallWidth = leftOpen || rightOpen ? w * 0.34 : w * 0.42;
  const wallHeight = h * 0.24;
  const x = (w - wallWidth) / 2;
  const y = h * 0.38;

  ctx.save();
  const farWall = ctx.createLinearGradient(0, y, 0, y + wallHeight);
  farWall.addColorStop(0, "rgba(58, 68, 72, 0.16)");
  farWall.addColorStop(1, "rgba(38, 45, 49, 0.24)");
  ctx.fillStyle = farWall;
  ctx.fillRect(x, y, wallWidth, wallHeight);
  ctx.strokeStyle = "rgba(228, 215, 183, 0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, wallWidth, wallHeight);

  ctx.strokeStyle = "rgba(228, 215, 183, 0.09)";
  for (let i = 1; i < 4; i += 1) {
    const lineX = x + (wallWidth / 4) * i;
    ctx.beginPath();
    ctx.moveTo(lineX, y);
    ctx.lineTo(lineX + wallHeight * 0.08, y + wallHeight);
    ctx.stroke();
  }
  for (let i = 1; i < 3; i += 1) {
    const lineY = y + (wallHeight / 3) * i;
    ctx.beginPath();
    ctx.moveTo(x, lineY);
    ctx.lineTo(x + wallWidth, lineY + 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSideDepthHints(w, h) {
  if (currentMapIndex === 0) return;

  const sideConfigs = [
    {
      side: -1,
      floor: [
        [0, h * 0.92],
        [w * 0.35, h * 0.66],
        [w * 0.5, h * 0.66],
        [w * 0.18, h * 0.92],
      ],
      walls: [
        { x1: w * 0.08, x2: w * 0.28, top: h * 0.36, bottom: h * 0.74 },
        { x1: w * 0.23, x2: w * 0.39, top: h * 0.42, bottom: h * 0.68 },
        { x1: w * 0.34, x2: w * 0.44, top: h * 0.48, bottom: h * 0.62 },
      ],
    },
    {
      side: 1,
      floor: [
        [w, h * 0.92],
        [w * 0.65, h * 0.66],
        [w * 0.5, h * 0.66],
        [w * 0.82, h * 0.92],
      ],
      walls: [
        { x1: w * 0.72, x2: w * 0.92, top: h * 0.36, bottom: h * 0.74 },
        { x1: w * 0.61, x2: w * 0.77, top: h * 0.42, bottom: h * 0.68 },
        { x1: w * 0.56, x2: w * 0.66, top: h * 0.48, bottom: h * 0.62 },
      ],
    },
  ];

  ctx.save();
  sideConfigs.forEach((config) => {
    const sideOpen =
      isWalkable(cameraPoint(0, config.side).x, cameraPoint(0, config.side).y) ||
      isWalkable(cameraPoint(1, config.side).x, cameraPoint(1, config.side).y);
    if (!sideOpen) return;

    ctx.fillStyle = "rgba(88, 74, 48, 0.16)";
    ctx.beginPath();
    ctx.moveTo(config.floor[0][0], config.floor[0][1]);
    config.floor.slice(1).forEach((point) => ctx.lineTo(point[0], point[1]));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(215, 180, 106, 0.14)";
    ctx.stroke();

    config.walls.forEach((wall, index) => {
      const sideCell = cameraPoint(index + 1, config.side);
      const sideForwardCell = cameraPoint(index + 2, config.side);
      if (!isWalkable(sideCell.x, sideCell.y) || cellAt(sideForwardCell.x, sideForwardCell.y) !== TILE.WALL) return;
      ctx.fillStyle = `rgba(58, 68, 72, ${0.16 - index * 0.03})`;
      ctx.fillRect(wall.x1, wall.top, wall.x2 - wall.x1, wall.bottom - wall.top);
      ctx.strokeStyle = "rgba(228, 215, 183, 0.16)";
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x1, wall.top, wall.x2 - wall.x1, wall.bottom - wall.top);
    });
  });
  ctx.restore();
}

function drawRoomFloorHint(w, h) {
  if (currentMapIndex === 0) return;

  const leftWide = isWalkable(cameraPoint(0, -1).x, cameraPoint(0, -1).y) && isWalkable(cameraPoint(1, -1).x, cameraPoint(1, -1).y);
  const rightWide = isWalkable(cameraPoint(0, 1).x, cameraPoint(0, 1).y) && isWalkable(cameraPoint(1, 1).x, cameraPoint(1, 1).y);
  if (!leftWide && !rightWide) return;

  ctx.save();
  ctx.strokeStyle = "rgba(215, 180, 106, 0.16)";
  ctx.lineWidth = 2;

  if (leftWide) {
    ctx.fillStyle = "rgba(53, 47, 36, 0.2)";
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.84);
    ctx.lineTo(w * 0.36, h * 0.62);
    ctx.lineTo(w * 0.5, h * 0.62);
    ctx.lineTo(w * 0.22, h);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, h * 0.84);
    ctx.lineTo(w * 0.36, h * 0.62);
    ctx.lineTo(w * 0.5, h * 0.62);
    ctx.stroke();
  }

  if (rightWide) {
    ctx.fillStyle = "rgba(53, 47, 36, 0.2)";
    ctx.beginPath();
    ctx.moveTo(w, h);
    ctx.lineTo(w, h * 0.84);
    ctx.lineTo(w * 0.64, h * 0.62);
    ctx.lineTo(w * 0.5, h * 0.62);
    ctx.lineTo(w * 0.78, h);
    ctx.closePath();
    ctx.fill();
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

  drawBattleEnemyGroups(w, h);

  drawBattleStatusPanel(w, h);
}

function battleEnemyGroups() {
  const groups = [];
  enemies.forEach((enemy) => {
    const key = enemyGroupKey(enemy);
    let group = groups.find((entry) => entry.key === key);
    if (!group) {
      group = { key, label: enemy.type === "gruntA" ? "ザコA" : enemy.type === "gruntB" ? "ザコB" : enemy.name, enemies: [] };
      groups.push(group);
    }
    group.enemies.push(enemy);
  });
  return groups;
}

function enemyGroupKey(enemy) {
  return enemy?.type || enemy?.name || "enemy";
}

function livingEnemiesByGroup(groupKey) {
  return livingEnemies().filter((enemy) => enemyGroupKey(enemy) === groupKey);
}

function randomLivingEnemyInGroup(groupKey) {
  const targets = livingEnemiesByGroup(groupKey);
  return targets.length ? targets[roll(0, targets.length - 1)] : currentEnemy();
}

function drawBattleEnemyGroups(w, h) {
  const groups = battleEnemyGroups();
  const groupGap = w * 0.22;
  const startX = w / 2 - ((groups.length - 1) * groupGap) / 2;

  ctx.fillStyle = "#f4f0e8";
  ctx.font = "24px sans-serif";
  ctx.textAlign = "center";

  groups.forEach((group, index) => {
    const alive = group.enemies.filter((enemy) => enemy.hp > 0);
    const centerX = startX + index * groupGap;
    const isEnemyBlinking =
      group.key === battleEffectTargetKey && Date.now() < battleEffectUntil && Math.floor(Date.now() / 140) % 2 === 0;
    ctx.fillText(group.label, centerX, h * 0.13);
    drawEnemyCountMarkers(centerX, h * 0.18, group.enemies);
    if (alive.length === 0 || isEnemyBlinking) return;
    const sample = alive[0];
    const color = battleKind === "boss" ? "#4e9fe6" : sample.color || "#b45461";
    if (battleKind === "boss") {
      drawEnemy(centerX - w * 0.095, h * 0.2, w * 0.19, h * 0.34, color);
    } else {
      drawEnemy(centerX - w * 0.075, h * 0.24, w * 0.15, h * 0.28, color);
    }
  });
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

function drawEnemyCountMarkers(centerX, y, targetEnemies = enemies) {
  const alive = targetEnemies.filter((enemy) => enemy.hp > 0).length;
  const total = targetEnemies.length;
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
  } else if (isTownPersonTile(tile)) {
    drawTownPerson(x0, y0, spriteW, spriteH, sprite.color, isShopPersonTile(tile));
  } else {
    drawEntrance(x0, y0, spriteW, spriteH, sprite.color);
  }

  ctx.fillStyle = "#f4f0e8";
  ctx.font = `${Math.max(11, 18 * scale)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(sprite.title, centerX, y0 - 8);
  ctx.restore();
}

function isShopPersonTile(tile) {
  return [TILE.SHOP_WEAPON, TILE.SHOP_ITEM, TILE.SHOP_INN, TILE.SHOP_CHURCH, TILE.SHOP_ARMOR].includes(tile);
}

function isTownPersonTile(tile) {
  return isShopPersonTile(tile) || [TILE.VILLAGER_1, TILE.VILLAGER_2, TILE.VILLAGER_3].includes(tile);
}

function drawTownPerson(x, y, w, h, color, isShop = false) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * 0.86, w * 0.28, h * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + w * 0.5, y + h * 0.25, w * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + w * 0.34, y + h * 0.38, w * 0.32, h * 0.36);

  ctx.fillStyle = isShop ? "#d7b46a" : "#dce9ef";
  ctx.fillRect(x + w * 0.4, y + h * 0.46, w * 0.2, h * 0.05);
  ctx.fillStyle = "#101417";
  ctx.fillRect(x + w * 0.43, y + h * 0.21, w * 0.04, h * 0.04);
  ctx.fillRect(x + w * 0.53, y + h * 0.21, w * 0.04, h * 0.04);
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

function move(relativeForward, relativeRight = 0) {
  if (sceneMode !== "dungeon" && sceneMode !== "town") return;
  const target = cameraPoint(relativeForward, relativeRight);
  if (!isWalkable(target.x, target.y)) {
    setMessage("壁に阻まれています。");
    render();
    return;
  }
  player.x = target.x;
  player.y = target.y;
  if (tryHandleMapAction(player.x, player.y, cellAt(player.x, player.y), true)) {
    render();
    return;
  }
  if (cellAt(player.x, player.y) === TILE.BOSS) {
    pendingBattleReturnMessage = "ボス戦から探索に戻りました。";
    startBattle("青い強敵が立ちはだかった。", "boss", { x: player.x, y: player.y, mapIndex: currentMapIndex });
    return;
  }
  describeCurrentTile();
  checkRandomEncounter();
  render();
}

function checkRandomEncounter() {
  if (sceneMode !== "dungeon") return;
  if (!maps[currentMapIndex].encounter) return;
  const tile = cellAt(player.x, player.y);
  if (tile === TILE.STAIRS || tile === TILE.STAIRS_DOWN || tile === TILE.CHEST || tile === TILE.OPEN_CHEST || tile === TILE.HEAL) return;

  stepsSinceEncounter += 1;
  if (stepsSinceEncounter >= 20 || Math.random() < 0.05) {
    stepsSinceEncounter = 0;
    pendingBattleReturnMessage = "ランダムエンカウントから探索に戻りました。";
    startBattle("ランダムエンカウント。敵が現れた。");
  }
}

function turn(delta) {
  if (sceneMode !== "dungeon" && sceneMode !== "town") return;
  player.dir = (player.dir + delta + 4) % 4;
  setMessage(`${directions[player.dir].name}を向きました。`);
  render();
}

function inspect() {
  if (sceneMode === "battle") {
    if (battleFinished) {
      endBattle();
    } else {
      setBattleStatus("戦闘中です。コマンドを選択してください。");
      render();
    }
    return;
  }

  const here = cellAt(player.x, player.y);
  const front = cameraPoint(1, 0);
  const frontTile = cellAt(front.x, front.y);
  if (tryHandleMapAction(player.x, player.y, here) || tryHandleMapAction(front.x, front.y, frontTile)) {
    render();
  } else if (frontTile === TILE.BOSS) {
    pendingBattleReturnMessage = "ボス戦から探索に戻りました。";
    startBattle("青い強敵が立ちはだかった。", "boss", { x: front.x, y: front.y, mapIndex: currentMapIndex });
  } else if (here === TILE.ENEMY || frontTile === TILE.ENEMY) {
    pendingBattleReturnMessage = "";
    startBattle();
  } else if (events[here]) {
    setMessage(events[here]);
  } else if (events[frontTile]) {
    setMessage(`正面: ${events[frontTile]}`);
  } else {
    setMessage("周囲に目立つものはありません。");
  }
}

function tryHandleMapAction(x, y, tile, isAuto = false) {
  if (tile === TILE.CHEST) {
    openedChests.add(mapKey(x, y));
    map[y][x] = TILE.OPEN_CHEST;
    if (Math.random() < 0.5) {
      inventory.paralysisHerb += 1;
      setMessage(`宝箱を開けた。麻痺消し草を手に入れた。麻痺消し草: ${inventory.paralysisHerb}`);
    } else {
      inventory.herb += 1;
      setMessage(`宝箱を開けた。薬草を手に入れた。薬草: ${inventory.herb}`);
    }
    return true;
  }

  if (tile === TILE.OPEN_CHEST) {
    setMessage("既に開いた宝箱だ。");
    return true;
  }

  if (tile === TILE.HEAL) {
    healParty();
    setMessage("回復ポイントに触れた。全員のHP、MP、状態異常が全回復した。");
    return true;
  }

  if (tile === TILE.STAIRS) {
    if (currentMapIndex === 0) {
      loadMap(1, TILE.STAIRS_DOWN);
      setMessage("階段を上り、次のマップへ進みました。");
    } else {
      if (hasActiveBossOnCurrentMap()) {
        setMessage("青い強敵が街への道を塞いでいる。倒さなければ先へ進めない。");
        return true;
      }
      enterTown();
    }
    return true;
  }

  if (tile === TILE.STAIRS_DOWN) {
    if (sceneMode === "town" || currentMapIndex === 2) {
      loadMap(1, TILE.STAIRS);
      sceneMode = "dungeon";
      setMessage("街を出て、ダンジョンへ戻りました。");
    } else {
      loadMap(0, TILE.STAIRS);
      setMessage("戻る階段を使い、前のマップへ戻りました。");
    }
    return true;
  }

  if (tile === TILE.SHOP_WEAPON) return interactTownPerson("weapon", isAuto);
  if (tile === TILE.SHOP_ITEM) return interactTownPerson("item", isAuto);
  if (tile === TILE.SHOP_INN) return interactTownPerson("inn", isAuto);
  if (tile === TILE.SHOP_CHURCH) return interactTownPerson("church", isAuto);
  if (tile === TILE.SHOP_ARMOR) return interactTownPerson("armor", isAuto);
  if (tile === TILE.VILLAGER_1) return interactVillager("ここは最初の村です。", isAuto);
  if (tile === TILE.VILLAGER_2) return interactVillager("こんにちは。旅の準備はできていますか？", isAuto);
  if (tile === TILE.VILLAGER_3) return interactVillager("ここから先は敵が強くなるぞ。無理はするなよ。", isAuto);

  return false;
}

function cloneParty() {
  return party.map((member) => ({ ...cloneMember(member), guarding: false }));
}

function resetBattleState(kind = "normal") {
  updatePartyStats();
  party.forEach((member) => {
    member.guarding = false;
  });
  enemies = (kind === "boss" ? initialBossEnemies : createRandomEncounter()).map((enemy) => ({ ...enemy }));
  activeActorIndex = 0;
  battleFinished = false;
  battlePhase = "input";
  queuedBattleActions = [];
  battleEffectUntil = 0;
  battleEffectTargetKey = null;
}

function createRandomEncounter() {
  const patterns = [
    ["gruntA"],
    ["gruntB"],
    ["gruntA", "gruntA"],
    ["gruntA", "gruntB"],
    ["gruntB", "gruntB"],
    ["gruntA", "gruntA", "gruntB"],
    ["gruntA", "gruntB", "gruntB"],
  ];
  const pattern = patterns[roll(0, patterns.length - 1)];
  const counts = {};
  return pattern.map((key) => {
    counts[key] = (counts[key] || 0) + 1;
    const type = enemyTypes[key];
    return { ...type, name: `${type.name}-${counts[key]}` };
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roll(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function livingPartyMembers() {
  return party.filter((member) => member.hp > 0);
}

function livingEnemies() {
  return enemies.filter((enemy) => enemy.hp > 0);
}

function currentEnemy() {
  return enemies.find((enemy) => enemy.hp > 0) || null;
}

function currentActor() {
  if (party[activeActorIndex]?.hp > 0) return party[activeActorIndex];
  activeActorIndex = party.findIndex((member) => member.hp > 0);
  return party[activeActorIndex] || null;
}

function lowestHpMember() {
  return livingPartyMembers().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || null;
}

function advanceActor() {
  const nextIndex = party.findIndex((member, index) => index > activeActorIndex && member.hp > 0);
  if (nextIndex >= 0) {
    activeActorIndex = nextIndex;
    return true;
  }
  return false;
}

function calculatePhysicalDamage(attacker, targetDefense) {
  return Math.max(1, attacker.atk - targetDefense + roll(-3, 5));
}

function calculateMagicDamage(caster, spell, target = currentEnemy()) {
  const base = Math.max(1, spell.power + caster.mag * 0.9 - (target?.mdef || 0) * 0.6);
  const magBias = clamp((caster.mag - 18) / 180, -0.04, 0.1);
  const variance = 0.9 + Math.random() * 0.2 + magBias;
  return Math.max(1, Math.round(base * variance));
}

function checkBattleVictory() {
  if (livingEnemies().length === 0) {
    battleFinished = true;
    if (battleKind === "boss" && battleSource) {
      defeatedBosses.add(`${battleSource.mapIndex}:${battleSource.x}:${battleSource.y}`);
      if (battleSource.mapIndex === currentMapIndex && map[battleSource.y]?.[battleSource.x] === TILE.BOSS) {
        map[battleSource.y][battleSource.x] = TILE.FLOOR;
      }
    }
    setBattleStatus("敵をすべて倒しました。Zまたは調べるで探索へ戻ります。");
    addBattleLog("勝利。");
    return true;
  }
  return false;
}

function checkBattleDefeat() {
  if (livingPartyMembers().length > 0) return false;
  battleFinished = true;
  setBattleStatus("味方は全滅しました。Zまたは調べるで探索へ戻ります。");
  addBattleLog("敗北。");
  return true;
}

function actionLabel(action) {
  const target = action.targetLabel ? `:${action.targetLabel}` : "";
  if (action.type === "attack") return `攻撃${target}`;
  if (action.type === "guard") return "防御";
  if (action.type === "escape") return "逃げる";
  return `${action.option?.label || "行動"}${target}`;
}

function queueBattleAction(action) {
  if (battleFinished || battlePhase !== "input") return;
  const actor = currentActor();
  if (!actor) return;
  queuedBattleActions = queuedBattleActions.filter((entry) => entry.actorIndex !== activeActorIndex);
  queuedBattleActions.push({ ...action, actorIndex: activeActorIndex });
  addBattleLog(`${actor.name}: ${actionLabel(action)}を選択。`);

  if (advanceActor()) {
    setBattleStatus(`${currentActor().name} の行動を選択してください。`);
  } else {
    battlePhase = "confirm";
    setBattleStatus("全員の行動を選択しました。Zで実行、Xで前のキャラクターに戻ります。");
  }
  render();
}

function cancelQueuedBattleAction() {
  if (battlePhase === "resolving" || battleFinished) return false;
  if (activeBattleMenu) {
    closeBattleMenu();
    render();
    return true;
  }
  if (queuedBattleActions.length === 0) return false;
  const previous = queuedBattleActions.pop();
  activeActorIndex = previous.actorIndex;
  battlePhase = "input";
  setBattleStatus(`${party[activeActorIndex].name} の行動を選び直してください。`);
  addBattleLog(`${party[activeActorIndex].name} の行動選択に戻った。`);
  render();
  return true;
}

function useAttack() {
  openTargetMenu({ type: "attack" });
}

function useGuard() {
  queueBattleAction({ type: "guard" });
}

function useMagic(spell) {
  if (battleFinished) return;
  const actor = currentActor();
  if (!actor) return;
  if (actor.mp < spell.mpCost) {
    setBattleStatus(`${actor.name} のMPが足りません。`);
    addBattleLog(`${spell.label} はMP不足で使えなかった。`);
    render();
    return;
  }
  if (spell.heal || spell.guardAll) {
    queueBattleAction({ type: "magic", option: spell });
    return;
  }
  openTargetMenu({ type: "magic", option: spell });
}

function useItem(item) {
  if (battleFinished) return;
  const actor = currentActor();
  if (!actor) return;
  if (item.inventoryKey && inventory[item.inventoryKey] <= 0) {
    setBattleStatus(`${item.label} を持っていません。`);
    addBattleLog(`${item.label} は所持数不足で使えなかった。`);
    render();
    return;
  }
  queueBattleAction({ type: "item", option: item });
}

function useEquip(option) {
  queueBattleAction({ type: "equip", option });
}

function tryEscape() {
  queueBattleAction({ type: "escape" });
}

function availableSpellsForActor(actor) {
  const access = actor?.magicAccess ?? 0;
  return battleMenuData.magic.options.slice(0, access);
}

function openTargetMenu(baseAction) {
  const groups = battleEnemyGroups().filter((group) => group.enemies.some((enemy) => enemy.hp > 0));
  if (groups.length === 0) return;
  activeBattleMenu = {
    type: "target",
    title: "ターゲット",
    prompt: "攻撃する敵グループを選択してください。",
    selectedIndex: 0,
    baseAction,
    options: groups.map((group) => ({
      label: `${group.label} x ${group.enemies.filter((enemy) => enemy.hp > 0).length}`,
      targetKey: group.key,
    })),
  };
  setBattleStatus("ターゲットを選択してください。同種の敵が複数いる場合、対象はランダムです。");
  renderBattleMenu();
  render();
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function battleDelay(baseMs) {
  const scales = [0.05, 0.12, 0.25, 0.5, 0.75, 1, 1.45, 2];
  return Math.round(baseMs * scales[battleSettings.speed - 1]);
}

function battleEffectDuration() {
  const durations = [40, 120, 260, 500, 800, 1100, 1500, 2000];
  return durations[battleSettings.speed - 1];
}

function waitBattle(baseMs) {
  return wait(battleDelay(baseMs));
}

async function showEnemyHitEffect() {
  return showEnemyHitEffectFor(null);
}

async function showEnemyHitEffectFor(target) {
  battleEffectTargetKey = target ? enemyGroupKey(target) : null;
  battleEffectUntil = Date.now() + battleEffectDuration();
  while (Date.now() < battleEffectUntil) {
    render();
    await wait(Math.max(40, Math.min(120, battleEffectDuration() / 8)));
  }
  battleEffectUntil = 0;
  battleEffectTargetKey = null;
  render();
}

function buildBattleTurnOrder() {
  const partyActions = queuedBattleActions
    .map((action, order) => ({ ...action, actor: party[action.actorIndex], side: "party", order }))
    .filter((action) => action.actor?.hp > 0);
  const enemyActions = livingEnemies().map((enemy, order) => ({ type: "enemyAttack", actor: enemy, side: "enemy", order }));
  return [...partyActions, ...enemyActions].sort((a, b) => {
    const speedDiff = (b.actor.speed || 0) - (a.actor.speed || 0);
    if (speedDiff !== 0) return speedDiff;
    const luckDiff = (b.actor.luck || 0) - (a.actor.luck || 0);
    if (luckDiff !== 0) return luckDiff;
    return a.order - b.order;
  });
}

async function executeBattleAction(action) {
  if (!action.actor || action.actor.hp <= 0) return;

  if (action.side === "party" && action.actor.status === "麻痺" && Math.random() < 1 / 3) {
    setBattleStatus(`${action.actor.name} はしびれて動けない。`);
    addBattleLog(`${action.actor.name} は麻痺で行動不能。`);
    render();
    await waitBattle(800);
    return;
  }

  if (action.type === "enemyAttack") {
    const target = livingPartyMembers()[roll(0, livingPartyMembers().length - 1)];
    if (!target) return;
    const usesParalysis = action.actor.paralysisAttack && Math.random() < 1 / 3;
    setBattleStatus(usesParalysis ? `${action.actor.name} の麻痺攻撃。` : `${action.actor.name} の攻撃。`);
    addBattleLog(usesParalysis ? `${action.actor.name} の麻痺攻撃。` : `${action.actor.name} の攻撃。`);
    render();
    await waitBattle(700);
    let damage = Math.max(1, action.actor.atk - target.def + roll(-2, 5));
    if (target.guarding) {
      damage = Math.ceil(damage / 2);
      target.guarding = false;
    }
    target.hp = clamp(target.hp - damage, 0, target.maxHp);
    if (usesParalysis && target.hp > 0 && target.status !== "麻痺" && Math.random() < 1 / 3) {
      target.status = "麻痺";
      setBattleStatus(`${target.name} に ${damage} ダメージ。麻痺した。`);
      addBattleLog(`${target.name} に ${damage} ダメージ。麻痺。`);
    } else {
      setBattleStatus(`${target.name} に ${damage} ダメージ。`);
      addBattleLog(`${target.name} に ${damage} ダメージ。`);
    }
    render();
    await waitBattle(900);
    return;
  }

  if (action.type === "attack") {
    const target = randomLivingEnemyInGroup(action.targetKey);
    if (!target) return;
    setBattleStatus(`${action.actor.name} の攻撃。${action.targetLabel || target.name}を狙う。`);
    addBattleLog(`${action.actor.name} の攻撃。`);
    render();
    playHitSound();
    await showEnemyHitEffectFor(target);
    const damage = calculatePhysicalDamage(action.actor, target.def);
    target.hp = clamp(target.hp - damage, 0, target.maxHp);
    setBattleStatus(`${target.name} に ${damage} ダメージを与えた。`);
    addBattleLog(`${target.name} に ${damage} ダメージ。`);
    render();
    await waitBattle(900);
    return;
  }

  if (action.type === "guard") {
    action.actor.guarding = true;
    setBattleStatus(`${action.actor.name} は防御している。物理・魔法ダメージを半減。`);
    addBattleLog(`${action.actor.name} は防御した。`);
    render();
    await waitBattle(800);
    return;
  }

  if (action.type === "magic") {
    const spell = action.option;
    if (action.actor.mp < spell.mpCost) {
      setBattleStatus(`${action.actor.name} のMPが足りません。`);
      addBattleLog(`${spell.label} はMP不足で使えなかった。`);
      render();
      await waitBattle(800);
      return;
    }
    action.actor.mp = clamp(action.actor.mp - spell.mpCost, 0, action.actor.maxMp);
    setBattleStatus(`${action.actor.name} は ${spell.label} を唱えた。`);
    addBattleLog(`${action.actor.name} は ${spell.label} を使用。`);
    render();
    playMagicSound(spell);
    await waitBattle(700);

    if (spell.heal) {
      const target = lowestHpMember();
      const amount = Math.min(spell.heal + Math.floor(action.actor.mag / 3), target.maxHp - target.hp);
      target.hp = clamp(target.hp + amount, 0, target.maxHp);
      setBattleStatus(`${target.name} が ${amount} 回復。`);
      addBattleLog(`${target.name} が ${amount} 回復。`);
    } else if (spell.guardAll) {
      party.forEach((member) => {
        if (member.hp > 0) member.guarding = true;
      });
      setBattleStatus("味方全員が身構えた。");
      addBattleLog("味方全員が身構えた。");
    } else {
      const target = randomLivingEnemyInGroup(action.targetKey);
      if (!target) return;
      await showEnemyHitEffectFor(target);
      const damage = calculateMagicDamage(action.actor, spell, target);
      target.hp = clamp(target.hp - damage, 0, target.maxHp);
      setBattleStatus(`${target.name} に ${damage} ダメージを与えた。`);
      addBattleLog(`${target.name} に ${damage} ダメージ。`);
    }
    render();
    await waitBattle(900);
    return;
  }

  if (action.type === "item") {
    const item = action.option;
    if (item.inventoryKey && inventory[item.inventoryKey] <= 0) {
      setBattleStatus(`${item.label} を持っていません。`);
      addBattleLog(`${item.label} は所持数不足で使えなかった。`);
      render();
      await waitBattle(800);
      return;
    }
    if (item.inventoryKey) inventory[item.inventoryKey] -= 1;
    setBattleStatus(`${action.actor.name} は ${item.label} を使った。`);
    addBattleLog(`${action.actor.name} は ${item.label} を使用。`);
    render();
    await waitBattle(700);
    if (item.mpHeal) {
      const amount = Math.min(item.mpHeal, action.actor.maxMp - action.actor.mp);
      action.actor.mp = clamp(action.actor.mp + amount, 0, action.actor.maxMp);
      setBattleStatus(`${action.actor.name} のMPが ${amount} 回復。`);
      addBattleLog(`MP ${amount} 回復。`);
    } else if (item.cureStatus || item.cureParalysis) {
      action.actor.status = "健康";
      setBattleStatus(`${action.actor.name} の状態異常が回復。`);
      addBattleLog("状態異常が回復。");
    } else {
      const target = lowestHpMember();
      const amount = Math.min(item.heal || 0, target.maxHp - target.hp);
      target.hp = clamp(target.hp + amount, 0, target.maxHp);
      setBattleStatus(`${target.name} が ${amount} 回復。`);
      addBattleLog(`${target.name} が ${amount} 回復。`);
    }
    render();
    await waitBattle(900);
    return;
  }

  if (action.type === "equip") {
    setBattleStatus(`${action.actor.name} は ${action.option.label} を確認した。`);
    addBattleLog(`${action.actor.name} は ${action.option.label} を確認。`);
    render();
    await waitBattle(700);
    return;
  }

  if (action.type === "escape") {
    setBattleStatus(`${action.actor.name} は逃げ出そうとした。`);
    addBattleLog(`${action.actor.name} は逃走を試みた。`);
    render();
    await waitBattle(700);
    if (Math.random() < 0.5) {
      battleFinished = true;
      setBattleStatus("逃走に成功しました。Zまたは調べるで探索へ戻ります。");
      addBattleLog("逃走成功。");
    } else {
      setBattleStatus("逃走に失敗しました。");
      addBattleLog("逃走失敗。");
    }
    render();
    await waitBattle(900);
  }
}

async function resolveBattleTurn() {
  if (battleFinished || battlePhase !== "confirm") return;
  battlePhase = "resolving";
  activeBattleMenu = null;
  renderBattleMenu();
  setBattleStatus("行動順を決定しました。速度順に処理します。");
  addBattleLog("行動開始。");
  render();
  await waitBattle(700);

  const turnOrder = buildBattleTurnOrder();
  for (const action of turnOrder) {
    if (battleFinished) break;
    if (action.side === "enemy" && livingEnemies().length === 0) break;
    if (action.side === "party" && checkBattleVictory()) break;
    await executeBattleAction(action);
    if (checkBattleVictory() || checkBattleDefeat()) break;
  }

  if (!battleFinished) {
    party.forEach((member) => {
      member.guarding = false;
    });
    queuedBattleActions = [];
    battlePhase = "input";
    activeActorIndex = party.findIndex((member) => member.hp > 0);
    setBattleStatus(`${currentActor().name} の行動を選択してください。`);
    render();
  }
}

function enterTown() {
  previousSceneMode = sceneMode;
  sceneMode = "town";
  loadMap(2, TILE.START);
  townMessage = "街に到着しました。商人や村人に話しかけられます。";
  setMessage("街に到着した。\n人物アイコンの正面で調べると会話や施設利用ができます。");
  render();
}

function leaveTown() {
  sceneMode = "dungeon";
  loadMap(1, TILE.STAIRS);
  setMessage("街を出て、ダンジョンへ戻りました。");
  render();
}

function useTownFacility(type) {
  if (sceneMode !== "town") return false;

  const messages = {
    status: "教会です。状態異常を回復できます。",
    item: "道具屋です。薬草、魔石、麻痺消し草を扱っています。",
    equip: "武器屋です。銅の剣、ロッド、メタルアックスを扱っています。",
    armor: "防具屋です。兜、盾、防具を扱っています。",
    save: "宿屋で休みました。全員のHPとMPが全回復しました。",
    magic: "魔法屋です。新しい魔法の習得は後で追加します。",
    inspect: "街を見回しました。安全な拠点です。",
  };

  if (type === "save") healParty();
  if (type === "status") {
    openChurchMenu();
    return true;
  }
  if (type === "equip") {
    openShopMenu("武器屋", "テスト購入する武器を選んでください。", [
      { label: "銅の剣", itemId: "copperSword" },
      { label: "ロッド", itemId: "rod" },
      { label: "メタルアックス", itemId: "metalAxe" },
    ]);
    return true;
  }
  if (type === "armor") {
    openShopMenu("防具屋", "テスト購入する防具を選んでください。", [
      { label: "革の兜", itemId: "leatherHelm" },
      { label: "片手シールド", itemId: "buckler" },
      { label: "鉄の胸当て", itemId: "ironArmor" },
      { label: "革の脚具", itemId: "leatherBoots" },
    ]);
    return true;
  }
  if (type === "item") {
    openItemShopMenu();
    return true;
  }
  townMessage = messages[type];
  setMessage(townMessage);
  render();
  return true;
}

function interactVillager(line, isAuto = false) {
  if (isAuto) {
    setMessage("村人がこちらを見ています。調べるで話しかけられます。");
    return true;
  }
  townMessage = line;
  setMessage(`村人\n「${line}」`);
  return true;
}

function interactTownPerson(type, isAuto = false) {
  const data = {
    weapon: {
      title: "武器商人",
      line: "武器を見ていくかい？",
      actionLabel: "武器を見る",
      action: () =>
        openShopMenu("武器屋", "テスト購入する武器を選んでください。", [
          { label: "銅の剣", itemId: "copperSword" },
          { label: "ロッド", itemId: "rod" },
          { label: "メタルアックス", itemId: "metalAxe" },
        ]),
    },
    armor: {
      title: "防具商人",
      line: "防具は命を守る。よく選ぶんだな。",
      actionLabel: "防具を見る",
      action: () =>
        openShopMenu("防具屋", "テスト購入する防具を選んでください。", [
          { label: "革の兜", itemId: "leatherHelm" },
          { label: "片手シールド", itemId: "buckler" },
          { label: "鉄の胸当て", itemId: "ironArmor" },
          { label: "革の脚具", itemId: "leatherBoots" },
        ]),
    },
    item: {
      title: "道具商人",
      line: "薬草と麻痺消し草は切らさない方がいいよ。",
      actionLabel: "道具を見る",
      action: openItemShopMenu,
    },
    inn: {
      title: "宿屋の主人",
      line: "休んでいくかい？",
      actionLabel: "泊まる",
      action: () => {
        healParty();
        closeMenuOverlay();
        townMessage = "宿屋で休みました。全員のHP、MP、状態異常が回復しました。";
        setMessage(townMessage);
        render();
      },
    },
    church: {
      title: "教会の司祭",
      line: "祈りは心と体を清めます。",
      actionLabel: "祈る",
      action: () => {
        party.forEach((member) => {
          if (member.hp > 0) member.status = "健康";
        });
        closeMenuOverlay();
        townMessage = "教会で祈りを捧げた。全員の状態異常が回復した。";
        setMessage(townMessage);
        render();
      },
    },
  }[type];

  if (!data) return false;
  if (isAuto) {
    setMessage(`${data.title}がいます。調べるで話しかけられます。`);
    return true;
  }

  townMessage = `${data.title}と話しています。`;
  openMenuOverlay(data.title, `「${data.line}」`, [
    { label: data.actionLabel, action: data.action },
    {
      label: "話す",
      action: () => {
        setMessage(`${data.title}\n「${data.line}」`);
        closeMenuOverlay();
        render();
      },
    },
    { label: "やめる", action: closeMenuOverlay },
  ]);
  return true;
}

function openShopMenu(title, detail, goods) {
  townMessage = `${title}に入りました。`;
  const shopDetail = `${detail}\n現在は所持金なしのテスト購入です。`;
  setMessage(`${title}\n${detail}`);
  openMenuOverlay(
    title,
    shopDetail,
    [
      ...goods.map((item) => ({
        label: item.label,
        action: () => {
          equipmentInventory[item.itemId] += 1;
          const message = `${item.label}をテスト購入した。所持数: ${equipmentInventory[item.itemId]}`;
          townMessage = message;
          setMessage(message);
          openShopMenu(title, message, goods);
        },
      })),
      { label: "やめる", action: closeMenuOverlay },
    ],
  );
}

function openItemShopMenu() {
  townMessage = "道具屋に入りました。";
  openItemShopMenuWithMessage("購入する道具を選んでください。");
}

function openItemShopMenuWithMessage(detail) {
  const goods = [
    { label: "薬草", key: "herb" },
    { label: "魔石", key: "magicStone" },
    { label: "解毒剤", key: "antidote" },
    { label: "麻痺消し草", key: "paralysisHerb" },
  ];
  openMenuOverlay(
    "道具屋",
    `${detail}\n現在は所持金なしのテスト購入です。`,
    [
      ...goods.map((item) => ({
        label: item.label,
        action: () => {
          inventory[item.key] += 1;
          const message = `${item.label}をテスト購入した。所持数: ${inventory[item.key]}`;
          townMessage = message;
          setMessage(message);
          openItemShopMenuWithMessage(message);
        },
      })),
      { label: "やめる", action: closeMenuOverlay },
    ],
  );
}

function openChurchMenu() {
  townMessage = "教会に入りました。";
  openMenuOverlay("教会", "状態異常を回復します。", [
    {
      label: "祈る",
      action: () => {
        party.forEach((member) => {
          if (member.hp > 0) member.status = "健康";
        });
        setMessage("教会で祈りを捧げた。全員の状態異常が回復した。");
        closeMenuOverlay();
        render();
      },
    },
    { label: "戻る", action: closeMenuOverlay },
  ]);
}

function startBattle(message = "敵影が姿を現した。コマンドを選択してください。", kind = "normal", source = null) {
  sceneMode = "battle";
  battleLog = [];
  battleKind = kind;
  battleSource = source;
  resetBattleState(kind);
  selectedBattleCommand = 0;
  setBattleStatus(message);
  addBattleLog(kind === "boss" ? "ボス戦開始。" : "戦闘開始。");
  render();
}

function endBattle() {
  sceneMode = "dungeon";
  battleStatus = "";
  battleLog = [];
  closeBattleMenu(false);
  battleKind = "normal";
  battleSource = null;
  battlePhase = "input";
  queuedBattleActions = [];
  battleEffectUntil = 0;
  battleEffectTargetKey = null;
  setMessage(pendingBattleReturnMessage || "戦闘テストを終了しました。探索画面へ戻ります。");
  pendingBattleReturnMessage = "";
  render();
}

function describeCurrentTile() {
  const tile = cellAt(player.x, player.y);
  setMessage(events[tile] || "石造りの通路が続いています。");
}

function setMessage(text) {
  messageText.textContent = text;
}

function setBattleStatus(text) {
  battleStatus = text;
}

function addBattleLog(text) {
  battleLog.push(text);
  if (battleLog.length > 12) battleLog.shift();
  messageText.textContent = battleLog.map((log, index) => `${index + 1}. ${log}`).join("\n");
}

function openBattleMenu(type) {
  const menu = battleMenuData[type];
  if (!menu || sceneMode !== "battle" || battlePhase !== "input") return;
  const actor = currentActor();
  const options = type === "magic" ? availableSpellsForActor(actor) : menu.options;
  if (type === "magic" && options.length === 0) {
    setBattleStatus(`${actor.name} は魔法を使えません。`);
    addBattleLog(`${actor.name} は魔法を使えない。`);
    render();
    return;
  }
  activeBattleMenu = { type, selectedIndex: 0, options };
  setBattleStatus(menu.prompt);
  addBattleLog(`${menu.title}メニューを開いた。`);
  renderBattleMenu();
  render();
}

function closeBattleMenu(writeLog = true) {
  if (!activeBattleMenu) return;
  const menu = getActiveBattleMenuData();
  if (writeLog) {
    setBattleStatus(`${menu.title}選択をキャンセルしました。`);
    addBattleLog(`${menu.title}選択をキャンセル。`);
  }
  activeBattleMenu = null;
  renderBattleMenu();
}

function moveBattleSelection(delta) {
  if (!activeBattleMenu) return;
  const menu = getActiveBattleMenuData();
  activeBattleMenu.selectedIndex =
    (activeBattleMenu.selectedIndex + delta + menu.options.length) % menu.options.length;
  renderBattleMenu();
}

function moveBattleSelectionVertical(delta) {
  moveBattleSelection(delta * 3);
}

function confirmBattleSelection() {
  if (!activeBattleMenu) return;
  const menu = getActiveBattleMenuData();
  const option = menu.options[activeBattleMenu.selectedIndex];
  const menuType = activeBattleMenu.type;
  if (menuType === "target") {
    const baseAction = activeBattleMenu.baseAction;
    activeBattleMenu = null;
    renderBattleMenu();
    queueBattleAction({ ...baseAction, targetKey: option.targetKey, targetLabel: option.label });
    return;
  }
  activeBattleMenu = null;
  renderBattleMenu();
  if (menuType === "magic") useMagic(option);
  if (menuType === "item") useItem(option);
  if (menuType === "equip") useEquip(option);
}

function getActiveBattleMenuData() {
  if (activeBattleMenu?.type === "target") return activeBattleMenu;
  const base = battleMenuData[activeBattleMenu.type];
  return { ...base, options: activeBattleMenu.options || base.options };
}

function moveBattleCommand(delta) {
  if (sceneMode !== "battle" || battlePhase !== "input") return;
  selectedBattleCommand = (selectedBattleCommand + delta + battleCommandIds.length) % battleCommandIds.length;
  renderBattleCommandSelection();
}

function confirmBattleCommand() {
  if (sceneMode !== "battle") return;
  if (battlePhase === "confirm") {
    resolveBattleTurn();
    return;
  }
  if (battlePhase !== "input") return;
  document.getElementById(battleCommandIds[selectedBattleCommand]).click();
}

function renderBattleMenu() {
  if (!activeBattleMenu) {
    battleSelect.classList.remove("is-visible");
    battleSelectOptions.innerHTML = "";
    battleSelectHelp.textContent = "Z 決定 / X キャンセル";
    return;
  }

  const menu = getActiveBattleMenuData();
  const selectedOption = menu.options[activeBattleMenu.selectedIndex];
  battleSelectTitle.textContent = menu.title;
  if (activeBattleMenu.type === "magic") {
    battleSelectHelp.textContent = `MP ${selectedOption.mpCost} / ${selectedOption.description}`;
  } else if (activeBattleMenu.type === "target") {
    battleSelectHelp.textContent = "同じ敵グループ内の対象はランダム";
  } else {
    battleSelectHelp.textContent = "Z 決定 / X キャンセル";
  }
  battleSelectOptions.innerHTML = "";
  menu.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    button.classList.toggle("is-selected", index === activeBattleMenu.selectedIndex);
    button.addEventListener("click", () => {
      activeBattleMenu.selectedIndex = index;
      confirmBattleSelection();
    });
    battleSelectOptions.appendChild(button);
  });
  battleSelect.classList.add("is-visible");
  const selectedButton = battleSelectOptions.children[activeBattleMenu.selectedIndex];
  selectedButton?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function renderBattleCommandSelection() {
  battleCommandIds.forEach((id, index) => {
    document.getElementById(id).classList.toggle("is-selected", sceneMode === "battle" && battlePhase === "input" && index === selectedBattleCommand);
  });
}

function renderPartyStatus() {
  updatePartyStats();
  document.querySelectorAll(".party-card").forEach((card, index) => {
    const member = party[index];
    if (!member) return;
    const hpPercent = member.maxHp > 0 ? (member.hp / member.maxHp) * 100 : 0;
    const mpPercent = member.maxMp > 0 ? (member.mp / member.maxMp) * 100 : 0;
    const name = card.querySelector("strong");
    const hpBar = card.querySelector(".status-bar:not(.mp) i");
    const mpBar = card.querySelector(".status-bar.mp i");
    const values = card.querySelectorAll(".status-row b");

    name.textContent = `${member.name}　${member.status}`;
    hpBar.style.width = `${hpPercent}%`;
    mpBar.style.width = `${mpPercent}%`;
    values[0].textContent = `${member.hp} / ${member.maxHp}`;
    values[1].textContent = `${member.mp} / ${member.maxMp}`;
    card.classList.toggle("is-down", member.hp <= 0);
    card.classList.toggle("is-active", sceneMode === "battle" && index === activeActorIndex && !battleFinished);
  });
}

function drawMiniMap() {
  miniMap.innerHTML = "";
  miniMap.style.gridTemplateColumns = `repeat(${map[0].length}, 1fr)`;
  for (let y = 0; y < map.length; y += 1) {
    for (let x = 0; x < map[y].length; x += 1) {
      const cell = document.createElement("div");
      cell.className = "map-cell";
      if (cellAt(x, y) === TILE.WALL) cell.classList.add("wall");
      if (events[cellAt(x, y)]) cell.classList.add("event");
      if (x === player.x && y === player.y) {
        cell.classList.add("player");
        cell.textContent = directions[player.dir].name;
      }
      miniMap.appendChild(cell);
    }
  }
}

function render() {
  updateBgm();
  if (sceneMode === "battle") {
    drawBattleScene();
  } else {
    drawDungeon();
  }
  battleCommand.classList.toggle("is-visible", sceneMode === "battle");
  renderBattleCommandSelection();
  renderFieldMenuSelection();
  renderSettingsSelection();
  renderPartyStatus();
  drawMiniMap();
  positionText.textContent =
    `${maps[currentMapIndex].id} X: ${player.x} Y: ${player.y} ${directions[player.dir].name}`;
}

document.getElementById("turnLeft").addEventListener("click", () => turn(-1));
document.getElementById("turnRight").addEventListener("click", () => turn(1));
document.getElementById("moveForward").addEventListener("click", () => move(1));
document.getElementById("inspect").addEventListener("click", inspect);

document.addEventListener(
  "pointerdown",
  (event) => {
    if (event.target.closest("button")) {
      playDecisionSound();
    } else {
      startAudioFromInput();
    }
  },
  { passive: true },
);

document.getElementById("statusMenu").addEventListener("click", () => {
  openStatusMenu();
});

document.getElementById("itemMenu").addEventListener("click", () => {
  openFieldItemMenu();
});

document.getElementById("equipMenu").addEventListener("click", () => {
  openEquipMemberMenu();
});

document.getElementById("saveMenu").addEventListener("click", () => {
  openSaveMenu();
});

document.getElementById("fieldMagicMenu").addEventListener("click", () => {
  setMessage(`魔法\n\n${formatFieldMagic()}`);
});

document.getElementById("settingsMenu").addEventListener("click", () => {
  openSettings();
});

document.getElementById("returnTitleMenu").addEventListener("click", () => {
  openReturnTitleConfirm();
});

document.getElementById("titleStart").addEventListener("click", () => {
  resetNewGame();
});

document.getElementById("titleLoad").addEventListener("click", () => {
  openLoadMenu();
});

document.getElementById("titleSettings").addEventListener("click", () => {
  returnToTitleAfterSettings = true;
  setTitleActive(false);
  openSettings();
});

displayModeSetting.addEventListener("click", () => {
  toggleDisplayMode();
});

Object.entries(volumeInputs).forEach(([key, input]) => {
  input.addEventListener("input", () => {
    audioSettings[key] = Number(input.value);
    applyAudioSettings();
  });
});

battleSpeedInput.addEventListener("input", () => {
  battleSettings.speed = Number(battleSpeedInput.value);
  renderBattleSpeedSetting();
});

settingsRowIds.forEach((id, index) => {
  const element = document.getElementById(id);
  element.closest(".settings-row").addEventListener("pointerdown", () => {
    selectedSetting = index;
    renderSettingsSelection();
  });
});

document.getElementById("attackCommand").addEventListener("click", () => {
  if (battlePhase !== "input") return;
  useAttack();
});

document.getElementById("magicCommand").addEventListener("click", () => {
  if (battlePhase !== "input") return;
  openBattleMenu("magic");
});

document.getElementById("guardCommand").addEventListener("click", () => {
  if (battlePhase !== "input") return;
  useGuard();
});

document.getElementById("equipCommand").addEventListener("click", () => {
  if (battlePhase !== "input") return;
  openBattleMenu("equip");
});

document.getElementById("battleItemCommand").addEventListener("click", () => {
  if (battlePhase !== "input") return;
  openBattleMenu("item");
});

document.getElementById("escapeCommand").addEventListener("click", () => {
  if (battlePhase !== "input") return;
  tryEscape();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const gameInputKeys = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "z", "x", "c", "enter", " ", "escape"];
  if (gameInputKeys.includes(key)) startAudioFromInput();
  if (!event.repeat && (key === "z" || key === "x" || event.key === "Enter" || event.key === " ")) {
    playDecisionSound();
  }
  if (activeMenuOverlay) {
    if (key === "x" || event.key === "Escape") {
      event.preventDefault();
      activeMenuOverlay.onCancel?.();
      return;
    }
    if (event.key === "ArrowLeft" || key === "a") {
      event.preventDefault();
      moveMenuOverlay(-1);
      return;
    }
    if (event.key === "ArrowRight" || key === "d") {
      event.preventDefault();
      moveMenuOverlay(1);
      return;
    }
    if (event.key === "ArrowUp" || key === "w") {
      event.preventDefault();
      moveMenuOverlay(-3);
      return;
    }
    if (event.key === "ArrowDown" || key === "s") {
      event.preventDefault();
      moveMenuOverlay(3);
      return;
    }
    if (key === "z" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      confirmMenuOverlay();
      return;
    }
  }
  if (titleActive) {
    if (event.key === "ArrowUp" || key === "w") {
      event.preventDefault();
      moveTitleSelection(-1);
      return;
    }
    if (event.key === "ArrowDown" || key === "s") {
      event.preventDefault();
      moveTitleSelection(1);
      return;
    }
    if (key === "z" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      confirmTitleSelection();
      return;
    }
  }
  if (settingsOpen) {
    if (key === "x" || event.key === "Escape") {
      event.preventDefault();
      closeSettings();
      return;
    }
    if (event.key === "ArrowUp" || key === "w") {
      event.preventDefault();
      selectedSetting = (selectedSetting + settingsRowIds.length - 1) % settingsRowIds.length;
      renderSettingsSelection();
      return;
    }
    if (event.key === "ArrowDown" || key === "s") {
      event.preventDefault();
      selectedSetting = (selectedSetting + 1) % settingsRowIds.length;
      renderSettingsSelection();
      return;
    }
    if (event.key === "ArrowLeft" || key === "a") {
      event.preventDefault();
      adjustSelectedSetting(-5);
      return;
    }
    if (event.key === "ArrowRight" || key === "d") {
      event.preventDefault();
      adjustSelectedSetting(5);
      return;
    }
    if (key === "z" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      adjustSelectedSetting(selectedSetting === 0 ? 0 : 5);
      return;
    }
  }
  if (activeBattleMenu) {
    if (event.key === "ArrowLeft" || key === "a") {
      event.preventDefault();
      moveBattleSelection(-1);
      return;
    }
    if (event.key === "ArrowRight" || key === "d") {
      event.preventDefault();
      moveBattleSelection(1);
      return;
    }
    if (event.key === "ArrowUp" || key === "w") {
      event.preventDefault();
      moveBattleSelectionVertical(-1);
      return;
    }
    if (event.key === "ArrowDown" || key === "s") {
      event.preventDefault();
      moveBattleSelectionVertical(1);
      return;
    }
    if (key === "z" || event.key === "Enter") {
      event.preventDefault();
      confirmBattleSelection();
      return;
    }
    if (key === "x" || event.key === "Escape") {
      event.preventDefault();
      closeBattleMenu();
      render();
      return;
    }
  }

  if (sceneMode === "battle") {
    if (battleFinished && (key === "z" || event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      endBattle();
      return;
    }
    if (key === "x" || event.key === "Escape") {
      event.preventDefault();
      cancelQueuedBattleAction();
      return;
    }
    if (event.key === "ArrowLeft" || key === "a") {
      event.preventDefault();
      moveBattleCommand(-1);
      return;
    }
    if (event.key === "ArrowRight" || key === "d") {
      event.preventDefault();
      moveBattleCommand(1);
      return;
    }
    if (key === "z" || event.key === "Enter") {
      event.preventDefault();
      confirmBattleCommand();
      return;
    }
  }

  if ((sceneMode === "dungeon" || sceneMode === "town") && key === "c") {
    event.preventDefault();
    setFieldMenuActive(true);
    return;
  }

  if (fieldMenuActive) {
    if (key === "x" || event.key === "Escape") {
      event.preventDefault();
      setFieldMenuActive(false);
      return;
    }
    if (event.key === "ArrowLeft" || key === "a") {
      event.preventDefault();
      moveFieldMenuSelection(-1);
      return;
    }
    if (event.key === "ArrowRight" || key === "d") {
      event.preventDefault();
      moveFieldMenuSelection(1);
      return;
    }
    if (event.key === "ArrowUp" || key === "w") {
      event.preventDefault();
      moveFieldMenuSelection(-2);
      return;
    }
    if (event.key === "ArrowDown" || key === "s") {
      event.preventDefault();
      moveFieldMenuSelection(2);
      return;
    }
    if (key === "z" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      confirmFieldMenuSelection();
      return;
    }
  }

  if ((sceneMode === "dungeon" || sceneMode === "town") && key === "z") {
    event.preventDefault();
    inspect();
    return;
  }

  if (event.key === "ArrowUp" || key === "w") move(1);
  if (event.key === "ArrowDown" || key === "s") turn(2);
  if (event.key === "ArrowLeft" || key === "a") turn(-1);
  if (event.key === "ArrowRight" || key === "d") turn(1);
  if (event.key === " " || event.key === "Enter") inspect();
});

window.addEventListener("resize", setGameScale);
setGameScale();
applyAudioSettings();
renderBattleSpeedSetting();
renderTitleSelection();
render();

