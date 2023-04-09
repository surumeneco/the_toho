/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    初期定義
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

//phina.jsのグローバライズ
phina.globalize();

//ロード用パス
let path = "../";

//バージョン管理
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
const version = "1.3.1"; // 2023/04/09 18:10

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    グローバル変数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

//画面サイズ
const SCREEN_W = 1080;
const SCREEN_H = 1920;

//使いやすいように
const CENTER_W = SCREEN_W / 2;
const CENTER_H = SCREEN_H / 2;

var time = 0;

//cookie
var load_type = window.performance.navigation.type;
const cookie = document.cookie;

//音量設定
var music_volume = 25;
var SE_volume = 25;

//タッチ位置検出
var pointer_x = 0;
var pointer_y = 0;
var pointer_move_x = 0;
var pointer_move_y = 0;

//戦闘発生確率
const battle_rate = 20;

//武器壊れる確率
const broken_rate = 5;
const broken_rate_up = 5;
var now_broken_rate = broken_rate;

//追加入手率
const get_rate = 50;

//プレイヤーインスタンス
var player = Player();

//シーン管理用
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

//ここからアイテムデータ読み込み
const foods_data = new Array();
const weapons_data = new Array();
const tools_data = new Array();
const materials_data = new Array();
const recipes_data = new Array(); //[ 必要道具, [レシピ, レシピ] ]
const enemies_data = new Array();

//ストーリーデータ読み込み
const story_texts = new Array();

//ロード完了変数
var foods_is_loaded = loading(path + "datas/foods.json", load_JSON, load_foods);
var weapons_is_loaded = loading(path + "datas/weapons.json", load_JSON, load_weapons);
var tools_is_loaded = loading(path + "datas/tools.json", load_JSON, load_tools);
var materials_is_loaded = loading(path + "datas/materials.json", load_JSON, load_materials);
var recipes_is_loaded = loading(path + "datas/recipes.json", load_JSON, load_recipes);
var enemies_is_loaded = loading(path + "datas/enemies.json", load_JSON, load_enemies);
var stories_is_loaded = loading(path + "datas/story.json", load_JSON, load_stories);

//BGM一覧
const bgms = ["8bit26", "acoustic30", "acoustic31", "acoustic36", "acoustic44", "acoustic49", "acoustic50", "acoustic51", "ethnic30", "piano39"];

//アセット設定
var ASSETS = {
  sound:
  {
    "8bit26": path + "bgms/maou_bgm_8bit26.mp3",
    "acoustic30": path + "bgms/maou_bgm_acoustic30.mp3",
    "acoustic31": path + "bgms/maou_bgm_acoustic31.mp3",
    "acoustic36": path + "bgms/maou_bgm_acoustic36.mp3",
    "acoustic44": path + "bgms/maou_bgm_acoustic44.mp3",
    "acoustic49": path + "bgms/maou_bgm_acoustic49.mp3",
    "acoustic50": path + "bgms/maou_bgm_acoustic50.mp3",
    "acoustic51": path + "bgms/maou_bgm_acoustic51.mp3",
    "cyber31": path + "bgms/maou_bgm_cyber31.mp3",
    "ethnic30": path + "bgms/maou_bgm_ethnic30.mp3",
    "piano39": path + "bgms/maou_bgm_piano39.mp3",
    "start": path + "sounds/start.mp3",
    "select": path + "sounds/select.mp3",
    "battle": path + "sounds/battle.mp3",
    "attack": path + "sounds/attack.mp3",
    "damage": path + "sounds/damage.mp3",
    "win": path + "sounds/win.mp3",
    "escape": path + "sounds/escape.mp3",
    "make": path + "sounds/make.mp3",
    "eat": path + "sounds/eat.mp3",
    "backhome": path + "sounds/backhome.mp3",
    "gameover": path + "sounds/gameover.mp3",
    "newgame": path + "sounds/newgame.mp3",
    "alert": path + "sounds/alert.mp3",
    "story": path + "sounds/story.mp3"
  }
}

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    関数定義
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

//BGMの再生処理
function bgm_check(app)
{
  if ((app.currentTime - bgm_starting_time > now_bgm_time * 1000) && now_bgm_is_loaded)
  {
    SoundManager.stopMusic(1);
    now_bgm_is_loaded = false;
  }
  if (SoundManager.currentMusic == null)
  {
    bgm_starting_time = app.currentTime;
    let new_bgm = bgms[Math.floor(Math.random() * bgms.length)];
    now_bgm = new Audio();
    now_bgm.src = path + "bgms/maou_bgm_" + new_bgm + ".mp3";
    now_bgm.load();
    now_bgm.addEventListener('loadedmetadata', function (e)
    {
      now_bgm_time = now_bgm.duration - 5;
      now_bgm_is_loaded = true;
    });
    SoundManager.playMusic(new_bgm, 1, false);
  }
}

//Cookieの書き込み
function set_cookies()
{
  let データ = "";

  let 保存日数 = 30;
  let 保存期間 = new Date();
  保存期間.setTime(保存期間.getTime() + 1000 * 60 * 60 * 24 * 保存日数);
  保存期間.toUTCString();

  データ = "storydata=" + story_num + ";";
  データ += "expires = " + 保存期間 + ";";
  document.cookie = データ;

  データ = "playingdata=" + JSON.stringify(player) + ";";
  データ += "expires = " + 保存期間 + ";";
  document.cookie = データ;
}

//Cookieの削除
function delete_cookies()
{
  データ = "storydata=;max-age=0";
  document.cookie = データ;
  データ = "playingdata=;max-age=0";
  document.cookie = データ;
}

//Cookieの読み込み
function get_cookies()
{
  if (cookie != "")
  {
    let data = cookie.split(";");
    let splited_data;

    splited_data = data[0].split("=");
    story_num = splited_data[1];

    splited_data = data[1].split("=");
    let playing_data = JSON.parse(splited_data[1]);
    player.set_data(playing_data);
  }
}

//リロード時データ読み込み
function reload_check(app)
{
  if (window.performance)
  {
    if (load_type == 1)
    {
      get_cookies();
      load_type = -1;
      return true;
    }
  }
  return false;
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

