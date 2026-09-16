/* Run: node tests/progress_storage.test.js */
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const local = new Map();
const cookies = new Map();
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
  read_cookie(name) { return cookies.has(name) ? cookies.get(name) : null; },
  remove_cookie(name) { cookies.delete(name); },
  set_settings_cookies() { settingsSaves++; },
  get_settings_cookies() {},
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
assert.equal(cookies.has('playingdata'), false);
assert.equal(cookies.has('storydata'), false);
let saved = JSON.parse(local.get('the_toho:progress:v1'));
assert.equal(saved.storyNum, 2);
assert.equal(saved.player.移動距離, 1200);

// Cookieの約4KB制約を超えるサイズでもlocalStorageならそのまま保存できる。
env.player.素材 = Array.from({ length: 80 }, (_, i) => [{
  名前: '非常に長い素材名' + i,
  必要道具: '非常に長い採取道具名',
  最大入手数: 999,
}, 99]);
assert.equal(env.set_cookies(), true);
assert(Buffer.byteLength(local.get('the_toho:progress:v1'), 'utf8') > 4096);

// 旧Cookieしかない場合は読み込み時に移行し、移行成功後だけ旧Cookieを消す。
local.clear();
cookies.set('storydata', '7');
cookies.set('playingdata', JSON.stringify({
  体力: 61, 気力: 52, 日数: 8, 移動距離: 34500,
  食料: [], 武器: [[{ 名前: '木の剣', 攻撃力: { ダイス: [[1, 6]], 固定値: 1 } }, 1]],
  道具: [], 素材: [], 食事履歴: [],
}));
const migrated = env.toho_read_progress_data();
assert.equal(migrated.storyNum, 7);
assert.equal(migrated.player.移動距離, 34500);
assert(local.has('the_toho:progress:v1'));
assert.equal(cookies.has('playingdata'), false);
assert.equal(cookies.has('storydata'), false);

env.player = makePlayer();
env.story_num = 0;
assert.equal(env.get_cookies(), true);
assert.equal(env.story_num, 7);
assert.equal(env.player.体力, 61);
assert.equal(typeof env.player.武器[0][0].攻撃力.roll, 'function');

assert.equal(env.delete_cookies(), true);
assert.equal(local.has('the_toho:progress:v1'), false);
assert.equal(env.story_num, 0);

// 壊れた新形式がある場合は、古いCookieで勝手に巻き戻さずデータを保持する。
local.set('the_toho:progress:v1', '{broken');
cookies.set('playingdata', JSON.stringify({ 日数: 1 }));
assert.equal(env.toho_read_progress_data(), null);
assert.equal(local.get('the_toho:progress:v1'), '{broken');
assert.equal(cookies.has('playingdata'), true);

console.log('PASS: localStorage progress save, >4KB save, legacy Cookie migration and deletion');
