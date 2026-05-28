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
const displayModeSetting = document.getElementById("displayModeSetting");
const displayModeValue = document.getElementById("displayModeValue");
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
const fieldMenuButtonIds = ["statusMenu", "itemMenu", "equipMenu", "saveMenu", "fieldMagicMenu", "inspect", "settingsMenu"];
const settingsRowIds = ["displayModeSetting", "masterVolume", "bgmVolume", "seVolume"];

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
      "#############",
      "#S.........D#",
      "#.###.###.#.#",
      "#.#W#.#M#.#.#",
      "#.#.#.#.#.#.#",
      "#.#R#.#P#...#",
      "#.#.#.#.#.###",
      "#...........#",
      "#############",
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
