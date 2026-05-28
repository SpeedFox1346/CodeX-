let previousSceneMode = "dungeon";
let battleStatus = "";
let battleLog = [];
let activeBattleMenu = null;
let selectedBattleCommand = 0;
const battleCommandIds = ["attackCommand", "magicCommand", "guardCommand", "equipCommand", "battleItemCommand", "escapeCommand"];
const openedChests = new Set();
const defeatedBosses = new Set();
const inventory = { herb: 0, magicStone: 2, antidote: 2 };
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
  robe: { name: "ローブ", slots: ["body"], def: 1 },
  leather: { name: "革鎧", slots: ["body"], def: 2 },
  chainmail: { name: "鎖帷子", slots: ["body"], def: 5 },
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
  ring: 1,
  amulet: 1,
};

const initialParty = [
  {
    name: "ケビン",
    level: 5,
    baseMaxHp: 100,
    baseMaxMp: 50,
    baseAtk: 18,
    baseMag: 22,
    baseDef: 8,
    hp: 100,
    mp: 50,
    status: "健康",
    guarding: false,
    equipment: { ...emptyEquipment, rightHand: "dagger", body: "leather", accessory1: "ring" },
  },
  {
    name: "ジョン",
    level: 5,
    baseMaxHp: 100,
    baseMaxMp: 50,
    baseAtk: 14,
    baseMag: 28,
    baseDef: 6,
    hp: 100,
    mp: 50,
    status: "健康",
    guarding: false,
    equipment: { ...emptyEquipment, rightHand: "staff", body: "robe", accessory1: "ring" },
  },
  {
    name: "トムソン",
    level: 5,
    baseMaxHp: 100,
    baseMaxMp: 50,
    baseAtk: 24,
    baseMag: 10,
    baseDef: 10,
    hp: 100,
    mp: 50,
    status: "健康",
    guarding: false,
    equipment: { ...emptyEquipment, rightHand: "axe", body: "chainmail", accessory1: "amulet" },
  },
];

const initialEnemies = [
  { name: "ENEMY A", hp: 95, maxHp: 95, atk: 15, def: 5 },
  { name: "ENEMY B", hp: 95, maxHp: 95, atk: 15, def: 5 },
  { name: "ENEMY C", hp: 95, maxHp: 95, atk: 15, def: 5 },
];

const initialBossEnemies = [{ name: "BLUE BOSS", hp: 260, maxHp: 260, atk: 24, def: 10 }];

let party = initialParty.map((member) => ({ ...member, equipment: { ...member.equipment } }));
let enemies = initialEnemies.map((enemy) => ({ ...enemy }));
let activeActorIndex = 0;
let actedThisPhase = 0;
let battleFinished = false;

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
  P: "教会です。状態異常やパーティ状態を確認する想定です。",
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
};