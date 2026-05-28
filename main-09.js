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
  if (!menu || sceneMode !== "battle") return;
  activeBattleMenu = { type, selectedIndex: 0 };
  setBattleStatus(menu.prompt);
  addBattleLog(`${menu.title}メニューを開いた。`);
  renderBattleMenu();
  render();
}

function closeBattleMenu(writeLog = true) {
  if (!activeBattleMenu) return;
  const menu = battleMenuData[activeBattleMenu.type];
  if (writeLog) {
    setBattleStatus(`${menu.title}選択をキャンセルしました。`);
    addBattleLog(`${menu.title}選択をキャンセル。`);
  }
  activeBattleMenu = null;
  renderBattleMenu();
}

function moveBattleSelection(delta) {
  if (!activeBattleMenu) return;
  const menu = battleMenuData[activeBattleMenu.type];
  activeBattleMenu.selectedIndex =
    (activeBattleMenu.selectedIndex + delta + menu.options.length) % menu.options.length;
  renderBattleMenu();
}

function moveBattleSelectionVertical(delta) {
  moveBattleSelection(delta * 3);
}

function confirmBattleSelection() {
  if (!activeBattleMenu) return;
  const menu = battleMenuData[activeBattleMenu.type];
  const option = menu.options[activeBattleMenu.selectedIndex];
  const menuType = activeBattleMenu.type;
  activeBattleMenu = null;
  renderBattleMenu();
  if (menuType === "magic") useMagic(option);
  if (menuType === "item") useItem(option);
  if (menuType === "equip") useEquip(option);
}

function moveBattleCommand(delta) {
  if (sceneMode !== "battle") return;
  selectedBattleCommand = (selectedBattleCommand + delta + battleCommandIds.length) % battleCommandIds.length;
  renderBattleCommandSelection();
}

function confirmBattleCommand() {
  if (sceneMode !== "battle") return;
  document.getElementById(battleCommandIds[selectedBattleCommand]).click();
}

function renderBattleMenu() {
  if (!activeBattleMenu) {
    battleSelect.classList.remove("is-visible");
    battleSelectOptions.innerHTML = "";
    battleSelectHelp.textContent = "Z 決定 / X キャンセル";
    return;
  }

  const menu = battleMenuData[activeBattleMenu.type];
  const selectedOption = menu.options[activeBattleMenu.selectedIndex];
  battleSelectTitle.textContent = menu.title;
  if (activeBattleMenu.type === "magic") {
    battleSelectHelp.textContent = `MP ${selectedOption.mpCost} / ${selectedOption.description}`;
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
    document.getElementById(id).classList.toggle("is-selected", sceneMode === "battle" && index === selectedBattleCommand);
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