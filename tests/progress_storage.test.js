/* Run: node tests/progress_storage.test.js */
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const local = new Map();
let settingsSaves = 0;
const makePlayer = () => ({
  体力: 100, 気力: 88, 日数: 3, 移動距離: 1200,
  食料: [], 武器: [], 道具: [], 素材: [], 食事履歴: [],
  set_data(data) { Object.assign(this, data); },
});
const env = {
  console, Number, JSON, Object, Array,
  window: { localStorage: {
    getItem(key) { return local.has(key) ? local.get(key) : null; },
    setItem(key, value) { local.set(key, String(value)); },
    removeItem(key) { local.delete(key); },
  } },
  set_settings_cookies() { settingsSaves++; return true; },
  get_settings_cookies() { return true; },
  set_progress_cookies() {}, set_cookies() {}, get_cookies() {}, delete_cookies() {},
  Dices(dice, fixed) { return { ダイス: dice, 固定値: fixed, roll() { return fixed; } }; },
  story_num: 2,
  player: makePlayer(),
};
vm.createContext(env);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'programs', 'progress_storage.js'), 'utf8'), env);

assert.equal(env.set_cookies(), true);
assert.equal(settingsSaves, 1);
assert(local.has('the_toho:progress:v1'));
let saved = JSON.parse(local.get('the_toho:progress:v1'));
assert.equal(saved.storyNum, 2);
assert.equal(saved.player.移動距離, 1200);

// 旧Cookieの容量制約を超えるサイズでもlocalStorageならそのまま保存できる。
env.player.素材 = Array.from({ length: 80 }, (_, i) => [{
  名前: '非常に長い素材名' + i,
  必要道具: '非常に長い採取道具名',
  最大入手数: 999,
}, 99]);
assert.equal(env.set_cookies(), true);
assert(Buffer.byteLength(local.get('the_toho:progress:v1'), 'utf8') > 4096);

// localStorageに保存が無ければ、旧形式へフォールバックせず「セーブなし」とする。
local.clear();
assert.equal(env.toho_read_progress_data(), null);

env.player = makePlayer();
env.story_num = 0;
assert.equal(env.get_cookies(), false);
assert.equal(env.story_num, 0);

// localStorageの正常データだけを復元する。
local.set('the_toho:progress:v1', JSON.stringify({
  schemaVersion: 1,
  storyNum: 7,
  player: {
    体力: 61, 気力: 52, 日数: 8, 移動距離: 34500,
    食料: [], 武器: [[{ 名前: '木の剣', 攻撃力: { ダイス: [[1, 6]], 固定値: 1 } }, 1]],
    道具: [], 素材: [], 食事履歴: [],
  },
}));
assert.equal(env.get_cookies(), true);
assert.equal(env.story_num, 7);
assert.equal(env.player.体力, 61);
assert.equal(typeof env.player.武器[0][0].攻撃力.roll, 'function');

assert.equal(env.delete_cookies(), true);
assert.equal(local.has('the_toho:progress:v1'), false);
assert.equal(env.story_num, 0);

// 壊れた新形式は上書き・削除しない。
local.set('the_toho:progress:v1', '{broken');
assert.equal(env.toho_read_progress_data(), null);
assert.equal(local.get('the_toho:progress:v1'), '{broken');

assert.equal(typeof env.read_cookie, 'undefined');
assert.equal(typeof env.remove_cookie, 'undefined');
console.log('PASS: localStorage-only progress save, restore, deletion and >4KB data');