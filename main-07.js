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
  if (tryHandleMapAction(player.x, player.y, cellAt(player.x, player.y))) {
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

function tryHandleMapAction(x, y, tile) {
  if (tile === TILE.CHEST) {
    openedChests.add(mapKey(x, y));
    map[y][x] = TILE.OPEN_CHEST;
    inventory.herb += 1;
    setMessage(`宝箱を開けた。薬草を手に入れた。薬草: ${inventory.herb}`);
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

  if (tile === TILE.SHOP_WEAPON) return useTownFacility("equip");
  if (tile === TILE.SHOP_ITEM) return useTownFacility("item");
  if (tile === TILE.SHOP_INN) return useTownFacility("save");
  if (tile === TILE.SHOP_CHURCH) return useTownFacility("status");

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
  enemies = (kind === "boss" ? initialBossEnemies : initialEnemies).map((enemy) => ({ ...enemy }));
  activeActorIndex = 0;
  actedThisPhase = 0;
  battleFinished = false;
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
  for (let i = 1; i <= party.length; i += 1) {
    const nextIndex = (activeActorIndex + i) % party.length;
    if (party[nextIndex].hp > 0) {
      activeActorIndex = nextIndex;
      return;
    }
  }
}

function calculatePhysicalDamage(attacker, targetDefense) {
  return Math.max(1, attacker.atk - targetDefense + roll(-3, 5));
}

function calculateMagicDamage(caster, spell) {
  const target = currentEnemy();
  return Math.max(1, caster.mag + spell.power - Math.floor((target?.def || 0) / 2) + roll(-4, 6));
}