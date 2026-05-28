document.getElementById("turnLeft").addEventListener("click", () => turn(-1));
document.getElementById("turnRight").addEventListener("click", () => turn(1));
document.getElementById("moveForward").addEventListener("click", () => move(1));
document.getElementById("inspect").addEventListener("click", inspect);

document.addEventListener(
  "pointerdown",
  (event) => {
    if (event.target.closest("button")) playDecisionSound();
  },
  { passive: true },
);

document.getElementById("statusMenu").addEventListener("click", () => {
  if (useTownFacility("status")) return;
  openStatusMenu();
});

document.getElementById("itemMenu").addEventListener("click", () => {
  if (useTownFacility("item")) return;
  openFieldItemMenu();
});

document.getElementById("equipMenu").addEventListener("click", () => {
  if (useTownFacility("equip")) return;
  openEquipMemberMenu();
});

document.getElementById("saveMenu").addEventListener("click", () => {
  if (useTownFacility("save")) return;
  setMessage("セーブ画面は仮メニューです。後で探索状態を保存できるようにします。");
});

document.getElementById("fieldMagicMenu").addEventListener("click", () => {
  if (useTownFacility("magic")) return;
  setMessage(`魔法\n\n${formatFieldMagic()}`);
});

document.getElementById("settingsMenu").addEventListener("click", () => {
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

settingsRowIds.forEach((id, index) => {
  const element = document.getElementById(id);
  element.closest(".settings-row").addEventListener("pointerdown", () => {
    selectedSetting = index;
    renderSettingsSelection();
  });
});

document.getElementById("attackCommand").addEventListener("click", () => {
  useAttack();
});

document.getElementById("magicCommand").addEventListener("click", () => {
  openBattleMenu("magic");
});

document.getElementById("guardCommand").addEventListener("click", () => {
  useGuard();
});

document.getElementById("equipCommand").addEventListener("click", () => {
  openBattleMenu("equip");
});

document.getElementById("battleItemCommand").addEventListener("click", () => {
  openBattleMenu("item");
});

document.getElementById("escapeCommand").addEventListener("click", () => {
  tryEscape();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
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

  if (sceneMode === "town") {
    if (key === "x" || event.key === "Escape") {
      event.preventDefault();
      leaveTown();
      return;
    }
  }

  if (sceneMode === "dungeon" && key === "c") {
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
  if (event.key === "ArrowDown" || key === "s") move(-1);
  if (event.key === "ArrowLeft" || key === "a") turn(-1);
  if (event.key === "ArrowRight" || key === "d") turn(1);
  if (event.key === " " || event.key === "Enter") inspect();
});

window.addEventListener("resize", setGameScale);
setGameScale();
applyAudioSettings();
render();