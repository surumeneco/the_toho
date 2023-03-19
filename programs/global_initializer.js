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
const version = "1.1.2";

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
var now_scene = "ホーム";
var is_reload = false;
var now_enemy;
var current_recipe_page = 0;

//ここからアイテムデータ読み込み
const foods_data = new Array();
const weapons_data = new Array();
const tools_data = new Array();
const materials_data = new Array();
const recipes_data = new Array(); //[ 必要道具, [レシピ, レシピ] ]
const enemies_data = new Array();

//ロード完了変数
var foods_is_loaded = loading(path + "datas/foods.json", load_JSON, load_foods);
var weapons_is_loaded = loading(path + "datas/weapons.json", load_JSON, load_weapons);
var tools_is_loaded = loading(path + "datas/tools.json", load_JSON, load_tools);
var materials_is_loaded = loading(path + "datas/materials.json", load_JSON, load_materials);
var recipes_is_loaded = loading(path + "datas/recipes.json", load_JSON, load_recipes);
var enemies_is_loaded = loading(path + "datas/enemies.json", load_JSON, load_enemies);

var ASSETS = {
  sound:
  {
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
    "alert": path + "sounds/alert.mp3"
  }
}

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

