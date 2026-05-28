function enemyTurn() {
  if (battleFinished || livingEnemies().length === 0) return;
  const targets = livingPartyMembers();
  if (targets.length === 0) return;

  addBattleLog("敵ターン。");
  livingEnemies().forEach((enemy) => {
    const activeTargets = livingPartyMembers();
    if (activeTargets.length === 0) return;
    const target = activeTargets[roll(0, activeTargets.length - 1)];
    let damage = Math.max(1, enemy.atk - target.def + roll(-2, 5));
    if (target.guarding) {
      damage = Math.ceil(damage / 2);
      target.guarding = false;
    }
    target.hp = clamp(target.hp - damage, 0, target.maxHp);
    addBattleLog(`${enemy.name} の攻撃。${target.name} に ${damage} ダメージ。`);
  });

  if (livingPartyMembers().length === 0) {
    battleFinished = true;
    setBattleStatus("味方は全滅しました。Zまたは調べるで探索へ戻ります。");
    addBattleLog("敗北。");
  } else {
    const actor = currentActor();
    setBattleStatus(`${actor.name} の行動を選択してください。`);
  }
}

function finishPlayerTurn() {
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
    return;
  }

  actedThisPhase += 1;
  if (actedThisPhase >= livingPartyMembers().length) {
    actedThisPhase = 0;
    enemyTurn();
    activeActorIndex = party.findIndex((member) => member.hp > 0);
    return;
  }

  advanceActor();
  const actor = currentActor();
  setBattleStatus(`${actor.name} の行動を選択してください。`);
}

function useAttack() {
  if (battleFinished) return;
  const actor = currentActor();
  const target = currentEnemy();
  if (!actor || !target) return;
  const damage = calculatePhysicalDamage(actor, target.def);
  target.hp = clamp(target.hp - damage, 0, target.maxHp);
  setBattleStatus(`${actor.name} の攻撃。${target.name} に ${damage} ダメージ。`);
  addBattleLog(`${actor.name} は ${target.name} を攻撃。${damage} ダメージ。`);
  finishPlayerTurn();
  render();
}

function useGuard() {
  if (battleFinished) return;
  const actor = currentActor();
  if (!actor) return;
  actor.guarding = true;
  setBattleStatus(`${actor.name} は防御している。次に受ける物理・魔法ダメージを半減。`);
  addBattleLog(`${actor.name} は防御した。物理・魔法ダメージ半減。`);
  finishPlayerTurn();
  render();
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

  actor.mp = clamp(actor.mp - spell.mpCost, 0, actor.maxMp);
  if (spell.heal) {
    const target = lowestHpMember();
    const amount = Math.min(spell.heal + Math.floor(actor.mag / 3), target.maxHp - target.hp);
    target.hp = clamp(target.hp + amount, 0, target.maxHp);
    setBattleStatus(`${actor.name} は ${spell.label} を使った。${target.name} が ${amount} 回復。`);
    addBattleLog(`${actor.name} は ${spell.label} を使用。${target.name} が ${amount} 回復。`);
  } else if (spell.guardAll) {
    party.forEach((member) => {
      if (member.hp > 0) member.guarding = true;
    });
    setBattleStatus(`${actor.name} は ${spell.label} を使った。味方全員が身構えた。`);
    addBattleLog(`${actor.name} は ${spell.label} を使用。`);
  } else {
    const target = currentEnemy();
    if (!target) return;
    const damage = calculateMagicDamage(actor, spell);
    target.hp = clamp(target.hp - damage, 0, target.maxHp);
    setBattleStatus(`${actor.name} は ${spell.label} を唱えた。${target.name} に ${damage} ダメージ。`);
    addBattleLog(`${actor.name} は ${spell.label} を使用。${target.name} に ${damage} ダメージ。`);
  }
  finishPlayerTurn();
  render();
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
  if (item.inventoryKey) inventory[item.inventoryKey] -= 1;
  if (item.mpHeal) {
    const amount = Math.min(item.mpHeal, actor.maxMp - actor.mp);
    actor.mp = clamp(actor.mp + amount, 0, actor.maxMp);
    setBattleStatus(`${actor.name} は ${item.label} を使った。MPが ${amount} 回復。`);
    addBattleLog(`${actor.name} は ${item.label} を使用。MP ${amount} 回復。`);
  } else if (item.cureStatus) {
    actor.status = "健康";
    setBattleStatus(`${actor.name} は ${item.label} を使った。状態異常が回復。`);
    addBattleLog(`${actor.name} は ${item.label} を使用。状態異常が回復。`);
  } else {
    const target = lowestHpMember();
    const amount = Math.min(item.heal || 0, target.maxHp - target.hp);
    target.hp = clamp(target.hp + amount, 0, target.maxHp);
    setBattleStatus(`${actor.name} は ${item.label} を使った。${target.name} が ${amount} 回復。`);
    addBattleLog(`${actor.name} は ${item.label} を使用。${target.name} が ${amount} 回復。`);
  }
  finishPlayerTurn();
  render();
}

function useEquip(option) {
  const actor = currentActor();
  if (!actor) return;
  setBattleStatus(`${actor.name} は ${option.label} を確認した。今回は行動消費なしです。`);
  addBattleLog(`${actor.name} は ${option.label} を確認。`);
  render();
}

function tryEscape() {
  if (battleFinished) return;
  if (Math.random() < 0.5) {
    battleFinished = true;
    setBattleStatus("逃走に成功しました。Zまたは調べるで探索へ戻ります。");
    addBattleLog("逃走成功。");
  } else {
    setBattleStatus("逃走に失敗しました。敵ターンに移ります。");
    addBattleLog("逃走失敗。");
    actedThisPhase = 0;
    enemyTurn();
    activeActorIndex = party.findIndex((member) => member.hp > 0);
  }
  render();
}

function enterTown() {
  previousSceneMode = sceneMode;
  sceneMode = "town";
  loadMap(2, TILE.START);
  townMessage = "街に到着しました。武器屋、道具屋、宿屋、教会が並んでいます。";
  setMessage("街に到着した。\n一人称視点で施設を探せます。店の入口に触れるか、正面で調べてください。");
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
    status: "教会で状態を確認しました。異常はありません。",
    item: "道具屋です。薬草や魔石を扱っています。",
    equip: "武器屋です。装備の品揃えは後で追加します。",
    save: "宿屋で休みました。全員のHPとMPが全回復しました。",
    magic: "魔法屋です。新しい魔法の習得は後で追加します。",
    inspect: "街を見回しました。安全な拠点です。",
  };

  if (type === "save") healParty();
  townMessage = messages[type];
  setMessage(townMessage);
  render();
  return true;
}

function startBattle(message = "敵影が姿を現した。コマンドを選択してください。", kind = "normal", source = null) {
  sceneMode = "battle";
  battleLog = [];
  battleKind = kind;
  battleSource = source;
  resetBattleState(kind);
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
  setMessage(pendingBattleReturnMessage || "戦闘テストを終了しました。探索画面へ戻ります。");
  pendingBattleReturnMessage = "";
  render();
}

function describeCurrentTile() {
  const tile = cellAt(player.x, player.y);
  setMessage(events[tile] || "石造りの通路が続いています。");
}