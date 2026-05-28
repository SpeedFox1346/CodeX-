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
  renderSettingsSelection();
}

function closeSettings() {
  settingsOpen = false;
  settingsOverlay.classList.remove("is-visible");
  renderSettingsSelection();
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
  const keys = ["master", "bgm", "se"];
  const key = keys[selectedSetting - 1];
  audioSettings[key] = clamp(audioSettings[key] + delta, 0, 100);
  applyAudioSettings();
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

let sceneMode = "dungeon";
