/* Run: node tests/encyclopedia_full_pipeline.test.js */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const storage = new Map();
const listeners = Object.create(null);

function sceneStub() {}
sceneStub.prototype.init = function () {};
sceneStub.prototype.update = function () {};
sceneStub.prototype.render = function () {};
sceneStub.prototype.showAbandonDialog = function () {};
sceneStub.prototype.showDeleteDialog = function () {};

const env = {
  console, Array, Object, Number, Set, Map, Math, Date, JSON, String, Boolean,
  crypto: { randomUUID() { return 'run-id'; } },
  window: {
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); },
    },
    addEventListener(type, handler) {
      (listeners[type] || (listeners[type] = [])).push(handler);
    },
  },
  version: '1.4.7',
  music_volume: 25, SE_volume: 25, saved_music_volume: 25, saved_SE_volume: 25,
  story_num: 0,
  SoundManager: {
    setVolumeMusic() {}, setVolume() {}, play() {},
  },
  set_settings_cookies() { return true; },
  get_settings_cookies() { return true; },
  reload_check() { return false; },
  Dices(dice, fixed) { return { ダイス: dice, 固定値: fixed, roll() { return 0; } }; },
  get_from_name(name, items) { return items.find(item => item.名前 === name) || null; },
  Toho_search_scene: sceneStub,
  Home_scene: sceneStub,
  Toho_battle_scene: sceneStub,
  Toho_title_scene_v14: sceneStub,
  Toho_archive_scene_v14: sceneStub,
  Label() { return { addChildTo() { return this; }, setPosition() { return this; } }; },
  Button() { return { addChildTo() { return this; }, setPosition() { return this; } }; },
  Red: '#f00', darkGray: '#333', lightGray: '#ccc', White: '#fff',
};

env.phina = {
  define(name, spec) {
    function Klass() {
      const obj = Object.create(Klass.prototype);
      if (typeof spec.init === 'function') spec.init.call(obj);
      return obj;
    }
    Object.keys(spec).forEach(key => {
      if (key !== 'init' && key !== 'superClass') Klass.prototype[key] = spec[key];
    });
    env[name] = Klass;
  },
};

for (const [field, file] of [
  ['foods_data', 'foods.json'],
  ['weapons_data', 'weapons.json'],
  ['tools_data', 'tools.json'],
  ['materials_data', 'materials.json'],
  ['enemies_data', 'enemies.json'],
]) {
  env[field] = JSON.parse(fs.readFileSync(path.join(root, 'datas', file), 'utf8'));
}

env.player = null;
vm.createContext(env);
function load(file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), env, { filename: file });
}

// Use the real Player implementation and the same persistence-module ordering as index.html.
load('programs/classes/player_data.js');
env.player = vm.runInContext('Player()', env);
load('programs/progress_storage.js');
load('programs/meta_progress.js');
load('programs/records_v2.js');
load('programs/save_safety.js');
load('programs/encyclopedia_storage.js');
load('programs/achievement_definitions.js');
load('programs/achievements.js');
load('programs/encyclopedia_catalog.js');
load('programs/catalog_achievements.js');

const run = code => vm.runInContext(code, env);
assert.equal(run('toho_prepare_encyclopedia_catalog()'), true);

// Match title-start behavior: create a fresh Player, then save/checkpoint immediately.
run('toho_start_run(); player = Player(); set_cookies();');
assert.equal(run('player.__toho_tracking'), true, 'fresh Player must receive encyclopedia tracking');
assert.equal(run('player.__toho_achievement_tracking'), true, 'fresh Player must receive achievement tracking');

const banana = env.foods_data.find(item => item.名前 === 'バナナ');
assert(banana, 'real foods.json must contain バナナ');

// Match Get_scene's authoritative acquisition path and subsequent set_cookies().
run('player.get_item("バナナ", 1); set_cookies();');
assert.equal(run('player.has_item("バナナ")'), 1);
const entryId = run('toho_find_item("バナナ", "food").id');
assert(entryId, 'runtime catalog must resolve acquired item');
assert.equal(run(`toho_meta.encyclopedia.itemIds.includes(${JSON.stringify(entryId)})`), true,
  'in-memory encyclopedia must unlock acquired item');

let meta = JSON.parse(storage.get('the_toho:meta:v1'));
let dedicated = JSON.parse(storage.get('the_toho:encyclopedia:v1'));
assert(meta.encyclopedia.itemIds.includes(entryId), 'common meta must persist acquired item');
assert(dedicated.itemIds.includes(entryId), 'dedicated encyclopedia copy must persist acquired item');

// Match abandoning a run: progress is deleted, durable encyclopedia remains.
run('delete_cookies();');
assert.equal(storage.has('the_toho:progress:v1'), false, 'abandon must delete only current run progress');
meta = JSON.parse(storage.get('the_toho:meta:v1'));
dedicated = JSON.parse(storage.get('the_toho:encyclopedia:v1'));
assert(meta.encyclopedia.itemIds.includes(entryId), 'abandon must retain common encyclopedia meta');
assert(dedicated.itemIds.includes(entryId), 'abandon must retain dedicated encyclopedia data');

console.log('PASS: real Player + production persistence wrapper order retains acquired encyclopedia items');
