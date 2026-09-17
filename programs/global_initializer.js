/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    初期定義
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

phina.globalize();

// GitHub Pagesのサブパスにも対応するロード用パス
let path = new URL("../", document.currentScript.src).href;

// バージョン管理
// const version = "0.1.0"; // 2023/03/13 12:18
// const version = "0.2.0"; // 2023/03/14 17:30
// const version = "0.2.1"; // 2023/03/14 18:30
// const version = "0.3.0"; // 2023/03/15 12:50
// const version = "0.4.0"; // 2023/03/15 21:20
// const version = "0.4.1"; // 2023/03/15 21:40
// const version = "0.4.2"; // 2023/03/15 21:45
// const version = "0.4.3"; // 2023/03/15 21:50
// const version = "0.4.4"; // 2023/03/15 22:20
// const version = "0.5.0"; // 2023/03/15 27:50
// const version = "0.5.1"; // 2023/03/15 28:10
// const version = "0.6.0"; // 2023/03/16 18:55
// const version = "1.0.0"; // 2023/03/16 23:30
// const version = "1.1.0"; // 2023/03/17 24:40
// const version = "1.1.1"; // 2023/03/18 14:25
// const version = "1.1.2"; // 2023/03/19 22:50
// const version = "1.1.3"; // 2023/03/24 24:20
// const version = "1.2.0"; // 2023/03/31 26:45
// const version = "1.3.0"; // 2023/04/09 14:45
// const version = "1.3.1"; // 2023/04/09 18:10
// const version = "1.3.2"; // 2023/04/09 21:20
// const version = '1.3.3'; // 2026/09/16 17:40 (JST・リリースコミット時刻)
// const version = "1.4.0"; // 2026/09/17 05:37 (JST・リリース更新作業日時)
// const version = "1.4.1"; // 2026/09/17 (JST)
// const version = "1.4.2"; // 2026/09/17 (JST)
// const version = "1.4.3"; // 2026/09/17 (JST)
// const version = "1.4.4"; // 2026/09/17 (JST)
const version = "1.4.5"; // 2026/09/17 (JST)

const SCREEN_W = 1080;
const SCREEN_H = 1920;
const CENTER_W = SCREEN_W / 2;
const CENTER_H = SCREEN_H / 2;

var time = 0;
var load_type = window.performance.navigation.type;

var music_volume = 25;
var SE_volume = 25;
var saved_music_volume = music_volume;
var saved_SE_volume = SE_volume;

var pointer_x = 0;
var pointer_y = 0;
var pointer_move_x = 0;
var pointer_move_y = 0;

const battle_rate = 20;
const broken_rate = 5;
const broken_rate_up = 5;
var now_broken_rate = broken_rate;
const get_rate = 50;

var player = Player();
var now_scene = "タイトル";
var is_reload = false;
var now_enemy;
var current_recipe_page = 0;
var story_num = 0;
var now_bgm;
var now_bgm_time = 0;
var bgm_starting_time = 0;
var bgm_playing_time = 0;
var now_bgm_is_loaded = false;

const foods_data = new Array();
const weapons_data = new Array();
const tools_data = new Array();
const materials_data = new Array();
const recipes_data = new Array();
const enemies_data = new Array();
const story_texts = new Array();

// ファイル更新時にはURLも変えてHTTPキャッシュから古いJSONを取得しない。
const data_version = "?v=" + encodeURIComponent(version);
var foods_is_loaded = loading(path + "datas/foods.json" + data_version, load_JSON, load_foods);
var weapons_is_loaded = loading(path + "datas/weapons.json" + data_version, load_JSON, load_weapons);
var tools_is_loaded = loading(path + "datas/tools.json" + data_version, load_JSON, load_tools);
var materials_is_loaded = loading(path + "datas/materials.json" + data_version, load_JSON, load_materials);
var recipes_is_loaded = loading(path + "datas/recipes.json" + data_version, load_JSON, load_recipes);
var enemies_is_loaded = loading(path + "datas/enemies.json" + data_version, load_JSON, load_enemies);
var stories_is_loaded = loading(path + "datas/story.json" + data_version, load_JSON, load_stories);

// タイトル画面を出す前に、ゲーム進行と図鑑に必要な全JSONの変換完了を待つ。
const toho_data_load_states = {
  foods: foods_is_loaded,
  weapons: weapons_is_loaded,
  tools: tools_is_loaded,
  materials: materials_is_loaded,
  recipes: recipes_is_loaded,
  enemies: enemies_is_loaded,
  stories: stories_is_loaded,
};
const toho_data_ready = Promise.all(Object.keys(toho_data_load_states).map(function (key) {
  return toho_data_load_states[key].promise;
}));
function toho_data_is_ready()
{
  return Object.keys(toho_data_load_states).every(function (key) {
    return toho_data_load_states[key].loaded === true;
  });
}
function toho_data_failed_keys()
{
  return Object.keys(toho_data_load_states).filter(function (key) {
    return toho_data_load_states[key].status === "failed";
  });
}

const bgms = ["8bit26", "acoustic30", "acoustic31", "acoustic36", "acoustic44", "acoustic49", "acoustic50", "acoustic51", "ethnic30", "piano39"];
function asset(name) {
  return path + name + data_version;
}
var ASSETS = {
  sound: {
    "8bit26": asset("bgms/maou_bgm_8bit26.mp3"),
    acoustic30: asset("bgms/maou_bgm_acoustic30.mp3"),
    acoustic31: asset("bgms/maou_bgm_acoustic31.mp3"),
    acoustic36: asset("bgms/maou_bgm_acoustic36.mp3"),
    acoustic44: asset("bgms/maou_bgm_acoustic44.mp3"),
    acoustic49: asset("bgms/maou_bgm_acoustic49.mp3"),
    acoustic50: asset("bgms/maou_bgm_acoustic50.mp3"),
    acoustic51: asset("bgms/maou_bgm_acoustic51.mp3"),
    cyber31: asset("bgms/maou_bgm_cyber31.mp3"),
    ethnic30: asset("bgms/maou_bgm_ethnic30.mp3"),
    piano39: asset("bgms/maou_bgm_piano39.mp3"),
    start: asset("sounds/start.mp3"),
    select: asset("sounds/select.mp3"),
    battle: asset("sounds/battle.mp3"),
    attack: asset("sounds/attack.mp3"),
    damage: asset("sounds/damage.mp3"),
    win: asset("sounds/win.mp3"),
    escape: asset("sounds/escape.mp3"),
    make: asset("sounds/make.mp3"),
    eat: asset("sounds/eat.mp3"),
    backhome: asset("sounds/backhome.mp3"),
    gameover: asset("sounds/gameover.mp3"),
    newgame: asset("sounds/newgame.mp3"),
    alert: asset("sounds/alert.mp3"),
    story: asset("sounds/story.mp3"),
  },
};

function bgm_check(app) {
  // タイトル画面のスライダー変更も、次フレームで設定を保存する。
  if (music_volume !== saved_music_volume || SE_volume !== saved_SE_volume) {
    set_settings_cookies();
  }
  if (app.currentTime - bgm_starting_time > now_bgm_time * 1000 && now_bgm_is_loaded) {
    SoundManager.stopMusic(1);
    now_bgm_is_loaded = false;
  }
  if (SoundManager.currentMusic == null) {
    bgm_starting_time = app.currentTime;
    let new_bgm = bgms[Math.floor(Math.random() * bgms.length)];
    now_bgm = new Audio();
    now_bgm.src = asset("bgms/maou_bgm_" + new_bgm + ".mp3");
    now_bgm.load();
    now_bgm.addEventListener("loadedmetadata", function () {
      now_bgm_time = now_bgm.duration - 5;
      now_bgm_is_loaded = true;
    });
    SoundManager.playMusic(new_bgm, 1, false);
  }
}

// v1.4.xではCookie互換を行わない。以下は既存シーンの呼出し名だけを維持する初期実装で、
// progress_storage.js / meta_progress.js によりlocalStorage実装へ置き換えられる。
function set_settings_cookies() {
  saved_music_volume = music_volume;
  saved_SE_volume = SE_volume;
  return true;
}
function set_progress_cookies() {
  return false;
}
function set_cookies() {
  const settingsSaved = set_settings_cookies();
  const progressSaved = set_progress_cookies();
  return settingsSaved !== false && progressSaved;
}
function delete_cookies() {
  story_num = 0;
  return true;
}
function get_settings_cookies() {
  saved_music_volume = music_volume;
  saved_SE_volume = SE_volume;
  SoundManager.setVolumeMusic(music_volume / 100);
  SoundManager.setVolume(SE_volume / 100);
  return true;
}
function get_cookies() {
  get_settings_cookies();
  return false;
}
function reload_check() {
  return false;
}

// localStorage設定モジュール読込前は既定値を適用する。
get_settings_cookies();