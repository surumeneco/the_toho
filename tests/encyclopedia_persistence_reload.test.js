/* Run: node tests/encyclopedia_persistence_reload.test.js */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const metaSource = fs.readFileSync(path.join(__dirname, '..', 'programs', 'meta_progress.js'), 'utf8');
const storageSource = fs.readFileSync(path.join(__dirname, '..', 'programs', 'encyclopedia_storage.js'), 'utf8');

function makeEnv(storage) {
  const foods = [{ 名前: 'りんご', 回復量: 4 }];
  const weapons = [{ 名前: '棒', 攻撃力: { ダイス: [[1, 4]], 固定値: 0 } }];
  const tools = [{ 名前: '袋' }];
  const materials = [{ 名前: '木材', 必要道具: '無し' }];
  const enemies = [{ 名前: '兎', 体力: 5, 出現距離: 0, 攻撃力: { ダイス: [[1, 2]], 固定値: 0 } }];

  function Archive() {}
  Archive.prototype.showDeleteDialog = function () {};

  const env = {
    console, Array, Object, Number, Set, Map, Math, Date, JSON,
    window: {
      localStorage: {
        getItem(key) { return storage.has(key) ? storage.get(key) : null; },
        setItem(key, value) { storage.set(key, String(value)); },
        removeItem(key) { storage.delete(key); },
      },
    },
    crypto: { randomUUID() { return 'run-id'; } },
    version: '1.4.6',
    music_volume: 25, SE_volume: 25, saved_music_volume: 25, saved_SE_volume: 25,
    SoundManager: { setVolumeMusic() {}, setVolume() {} },
    set_settings_cookies() { return true; }, get_settings_cookies() { return true; },
    set_cookies() { return true; }, get_cookies() { return true; }, delete_cookies() { return true; },
    foods_data: foods,
    weapons_data: weapons,
    tools_data: tools,
    materials_data: materials,
    enemies_data: enemies,
    Toho_archive_scene_v14: Archive,
  };
  env.player = {
    体力: 100, 気力: 100, 日数: 1, 移動距離: 0,
    食料: [], 武器: [], 道具: [], 素材: [],
    has_item(name) {
      for (const list of [this.食料, this.武器, this.道具, this.素材]) {
        const found = list.find(pair => pair[0].名前 === name);
        if (found) return found[1];
      }
      return 0;
    },
    get_item(name, amount) {
      const sources = [
        ['食料', foods], ['武器', weapons], ['道具', tools], ['素材', materials],
      ];
      for (const [field, data] of sources) {
        const item = data.find(entry => entry.名前 === name);
        if (!item) continue;
        const pair = this[field].find(entry => entry[0].名前 === name);
        if (pair) pair[1] += amount;
        else if (amount > 0) this[field].push([item, amount]);
        return;
      }
    },
  };
  vm.createContext(env);
  vm.runInContext(metaSource, env);
  vm.runInContext(storageSource, env);
  env.run = code => vm.runInContext(code, env);
  return env;
}

// 解放情報は共通metaと図鑑専用キーの双方へ保存され、新しいJSコンテキストでも復元される。
const storage = new Map();
let env = makeEnv(storage);
assert.equal(env.run('toho_unlock_item("りんご", "food")'), true);
assert.equal(env.run('toho_unlock_enemy(enemies_data[0])'), true);
let rawMeta = JSON.parse(storage.get('the_toho:meta:v1'));
let rawEncyclopedia = JSON.parse(storage.get('the_toho:encyclopedia:v1'));
assert.deepEqual(rawMeta.encyclopedia.itemIds, ['food:0001']);
assert.deepEqual(rawMeta.encyclopedia.enemyIds, ['enemy:0001']);
assert.deepEqual(rawEncyclopedia.itemIds, ['food:0001']);
assert.deepEqual(rawEncyclopedia.enemyIds, ['enemy:0001']);

env = makeEnv(storage);
assert.deepEqual(Array.from(env.run('toho_meta.encyclopedia.itemIds')), ['food:0001']);
assert.deepEqual(Array.from(env.run('toho_meta.encyclopedia.enemyIds')), ['enemy:0001']);
assert.equal(env.run('toho_discovery_rates().total'), 2);

// 後段モジュール等が図鑑配列だけを空にして通常meta保存しても、永続化済みIDを失わない。
env.run('toho_meta.encyclopedia.itemIds = []; toho_meta.encyclopedia.enemyIds = []; toho_meta_dirty = true; toho_save_meta();');
assert.deepEqual(Array.from(env.run('toho_meta.encyclopedia.itemIds')), ['food:0001']);
assert.deepEqual(Array.from(env.run('toho_meta.encyclopedia.enemyIds')), ['enemy:0001']);
rawMeta = JSON.parse(storage.get('the_toho:meta:v1'));
rawEncyclopedia = JSON.parse(storage.get('the_toho:encyclopedia:v1'));
assert.deepEqual(rawMeta.encyclopedia.itemIds, ['food:0001']);
assert.deepEqual(rawEncyclopedia.enemyIds, ['enemy:0001']);

// 共通meta側だけ図鑑が欠落していても、専用キーから起動時に復元する。
rawMeta.encyclopedia = { itemIds: [], enemyIds: [] };
storage.set('the_toho:meta:v1', JSON.stringify(rawMeta));
env = makeEnv(storage);
assert.deepEqual(Array.from(env.run('toho_meta.encyclopedia.itemIds')), ['food:0001']);
assert.deepEqual(Array.from(env.run('toho_meta.encyclopedia.enemyIds')), ['enemy:0001']);
rawMeta = JSON.parse(storage.get('the_toho:meta:v1'));
assert.deepEqual(rawMeta.encyclopedia.itemIds, ['food:0001']);
assert.deepEqual(rawMeta.encyclopedia.enemyIds, ['enemy:0001']);

// 明示的な図鑑削除APIだけは両方の保存先を空にできる。
assert.equal(env.run('toho_clear_encyclopedia()'), true);
rawMeta = JSON.parse(storage.get('the_toho:meta:v1'));
rawEncyclopedia = JSON.parse(storage.get('the_toho:encyclopedia:v1'));
assert.deepEqual(rawMeta.encyclopedia.itemIds, []);
assert.deepEqual(rawMeta.encyclopedia.enemyIds, []);
assert.deepEqual(rawEncyclopedia.itemIds, []);
assert.deepEqual(rawEncyclopedia.enemyIds, []);

// 1.4.5以前のmetaだけが存在する場合は初回ロード時に専用キーへ移行する。
const legacyMetaOnly = new Map([['the_toho:meta:v1', JSON.stringify({
  schemaVersion: 1,
  records: { bestDistanceMeters: 0, bestDays: 0 },
  achievements: { unlockedIds: [] }, stories: { unlockedIds: [], readIds: [] },
  encyclopedia: { itemIds: ['weapon:0001'], enemyIds: ['enemy:0001'] },
  lifetimeCounters: {}, history: [],
})]]);
env = makeEnv(legacyMetaOnly);
rawEncyclopedia = JSON.parse(legacyMetaOnly.get('the_toho:encyclopedia:v1'));
assert.deepEqual(rawEncyclopedia.itemIds, ['weapon:0001']);
assert.deepEqual(rawEncyclopedia.enemyIds, ['enemy:0001']);

console.log('PASS: dedicated encyclopedia storage survives reloads, resists accidental resets and supports explicit deletion');
