/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    初期定義
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

phina.globalize();

// GitHub Pagesのサブパスにも対応するロード用パス
let path = new URL('../', document.currentScript.src).href;

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
const version = '1.3.3'; // 2026/09/16

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
var now_scene = 'タイトル';
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
const data_version = '?v=' + encodeURIComponent(version);
var foods_is_loaded = loading(path + 'datas/foods.json' + data_version, load_JSON, load_foods);
var weapons_is_loaded = loading(path + 'datas/weapons.json' + data_version, load_JSON, load_weapons);
var tools_is_loaded = loading(path + 'datas/tools.json' + data_version, load_JSON, load_tools);
var materials_is_loaded = loading(path + 'datas/materials.json' + data_version, load_JSON, load_materials);
var recipes_is_loaded = loading(path + 'datas/recipes.json' + data_version, load_JSON, load_recipes);
var enemies_is_loaded = loading(path + 'datas/enemies.json' + data_version, load_JSON, load_enemies);
var stories_is_loaded = loading(path + 'datas/story.json' + data_version, load_JSON, load_stories);

const bgms = ['8bit26', 'acoustic30', 'acoustic31', 'acoustic36', 'acoustic44', 'acoustic49', 'acoustic50', 'acoustic51', 'ethnic30', 'piano39'];
function asset(name) { return path + name + data_version; }
var ASSETS = {
  sound: {
    '8bit26': asset('bgms/maou_bgm_8bit26.mp3'),
    'acoustic30': asset('bgms/maou_bgm_acoustic30.mp3'),
    'acoustic31': asset('bgms/maou_bgm_acoustic31.mp3'),
    'acoustic36': asset('bgms/maou_bgm_acoustic36.mp3'),
    'acoustic44': asset('bgms/maou_bgm_acoustic44.mp3'),
    'acoustic49': asset('bgms/maou_bgm_acoustic49.mp3'),
    'acoustic50': asset('bgms/maou_bgm_acoustic50.mp3'),
    'acoustic51': asset('bgms/maou_bgm_acoustic51.mp3'),
    'cyber31': asset('bgms/maou_bgm_cyber31.mp3'),
    'ethnic30': asset('bgms/maou_bgm_ethnic30.mp3'),
    'piano39': asset('bgms/maou_bgm_piano39.mp3'),
    'start': asset('sounds/start.mp3'),
    'select': asset('sounds/select.mp3'),
    'battle': asset('sounds/battle.mp3'),
    'attack': asset('sounds/attack.mp3'),
    'damage': asset('sounds/damage.mp3'),
    'win': asset('sounds/win.mp3'),
    'escape': asset('sounds/escape.mp3'),
    'make': asset('sounds/make.mp3'),
    'eat': asset('sounds/eat.mp3'),
    'backhome': asset('sounds/backhome.mp3'),
    'gameover': asset('sounds/gameover.mp3'),
    'newgame': asset('sounds/newgame.mp3'),
    'alert': asset('sounds/alert.mp3'),
    'story': asset('sounds/story.mp3')
  }
};

function bgm_check(app) {
  // タイトル画面のスライダー変更も、次フレームで設定Cookieに保存する。
  if (music_volume !== saved_music_volume || SE_volume !== saved_SE_volume) {
    set_settings_cookies();
  }
  if ((app.currentTime - bgm_starting_time > now_bgm_time * 1000) && now_bgm_is_loaded) {
    SoundManager.stopMusic(1);
    now_bgm_is_loaded = false;
  }
  if (SoundManager.currentMusic == null) {
    bgm_starting_time = app.currentTime;
    let new_bgm = bgms[Math.floor(Math.random() * bgms.length)];
    now_bgm = new Audio();
    now_bgm.src = asset('bgms/maou_bgm_' + new_bgm + '.mp3');
    now_bgm.load();
    now_bgm.addEventListener('loadedmetadata', function () {
      now_bgm_time = now_bgm.duration - 5;
      now_bgm_is_loaded = true;
    });
    SoundManager.playMusic(new_bgm, 1, false);
  }
}

// 設定Cookieと進行状況Cookieは、保存・削除の単位を分離する。
const cookie_options = '; Max-Age=2592000; Path=' + new URL(path).pathname + '; SameSite=Lax';
function read_cookie(name) {
  const prefix = name + '=';
  const pair = document.cookie.split(';').map(part => part.trim()).find(part => part.startsWith(prefix));
  if (!pair) return null;
  const raw = pair.substring(prefix.length);
  try { return decodeURIComponent(raw); }
  catch (error) { return raw; } // 1.3.2以前の非エンコードCookieも読み込む。
}
function write_cookie(name, value) {
  document.cookie = name + '=' + encodeURIComponent(String(value)) + cookie_options;
}
function remove_cookie(name) {
  document.cookie = name + '=; Max-Age=0; Path=' + new URL(path).pathname + '; SameSite=Lax';
}
function set_settings_cookies() {
  write_cookie('BGM', music_volume);
  write_cookie('SE', SE_volume);
  write_cookie('version', version);
  saved_music_volume = music_volume;
  saved_SE_volume = SE_volume;
}
function set_progress_cookies() {
  write_cookie('storydata', story_num);
  write_cookie('playingdata', JSON.stringify(player));
}
function set_cookies() {
  set_settings_cookies();
  set_progress_cookies();
}
// ゲームオーバーと「諦める」はプレイ情報だけ消す。音量・バージョンは残す。
function delete_cookies() {
  remove_cookie('storydata');
  remove_cookie('playingdata');
  story_num = 0;
}
function get_settings_cookies() {
  const bgm = Number(read_cookie('BGM'));
  const se = Number(read_cookie('SE'));
  if (read_cookie('BGM') !== null && Number.isFinite(bgm) && bgm >= 0 && bgm <= 100) music_volume = bgm;
  if (read_cookie('SE') !== null && Number.isFinite(se) && se >= 0 && se <= 100) SE_volume = se;
  saved_music_volume = music_volume;
  saved_SE_volume = SE_volume;
  SoundManager.setVolumeMusic(music_volume / 100);
  SoundManager.setVolume(SE_volume / 100);
}
function get_cookies() {
  get_settings_cookies();
  const saved_story = read_cookie('storydata');
  if (saved_story !== null && /^\d+$/.test(saved_story)) story_num = Number(saved_story);
  const saved_play = read_cookie('playingdata');
  if (saved_play !== null) {
    try {
      player.set_data(JSON.parse(saved_play));
      // JSON保存で消えるダイスのメソッドを復元する。
      for (const item of player.武器) {
        const attack = item[0].攻撃力;
        if (attack && typeof attack.roll !== 'function') {
          item[0].攻撃力 = Dices(attack.ダイス, attack.固定値);
        }
      }
    } catch (error) { console.warn('プレイデータを読み込めませんでした。', error); }
  }
}
function reload_check() {
  if (window.performance && load_type == 1) {
    get_cookies();
    load_type = -1;
    return true;
  }
  return false;
}

// ページ初回表示時はセーブの有無にかかわらず音量設定を反映する。
get_settings_cookies();