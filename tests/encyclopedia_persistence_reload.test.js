/* Run: node tests/encyclopedia_persistence_reload.test.js */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'programs', 'meta_progress.js'), 'utf8');

function makeEnv(storage) {
  const foods = [{ 名前: 'りんご', 回復量: 4 }];
  const weapons = [{ 名前: '棒', 攻撃力: { ダイス: [[1, 4]], 固定値: 0 } }];
  const tools = [{ 名前: '袋' }];
  const materials = [{ 名前: '木材', 必要道具: '無し' }];
  const enemies = [{ 名前: '兎', 体力: 5, 出現距離: 0, 攻撃力: { ダイス: [[1, 2]], 固定値: 0 } }];

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
    version: '1.4.5',
    music_volume: 25, SE_volume: 25, saved_music_volume: 25, saved_SE_volume: 25,
    SoundManager: { setVolumeMusic() {}, setVolume() {} },
    set_settings_cookies() { return true; }, get_settings_cookies() { return true; },
    set_cookies() { return true; }, get_cookies() { return true; }, delete_cookies() { return true; },
    foods_data: foods,
    weapons_data: weapons,
    tools_data: tools,
    materials_data: materials,
    enemies_data: enemies,
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
  vm.runInContext(source, env);
  env.run = code => vm.runInContext(code, env);
  return env;
}

// 解放情報はlocalStorageへ保存され、新しいJSコンテキストでも復元される。
const storage = new Map();
let env = makeEnv(storage);
assert.equal(env.run('toho_unlock_item("りんご", "food")'), true);
assert.equal(env.run('toho_unlock_enemy(enemies_data[0])'), true);
let raw = JSON.parse(storage.get('the_toho:meta:v1'));
assert.deepEqual(raw.encyclopedia.itemIds, ['food:0001']);
assert.deepEqual(raw.encyclopedia.enemyIds, ['enemy:0001']);

env = makeEnv(storage);
assert.deepEqual(Array.from(env.run('toho_meta.encyclopedia.itemIds')), ['food:0001']);
assert.deepEqual(Array.from(env.run('toho_meta.encyclopedia.enemyIds')), ['enemy:0001']);
assert.equal(env.run('toho_discovery_rates().total'), 2);

// 設定データが壊れていても、図鑑メタの保存は止めない。
const brokenSettings = new Map([['the_toho:settings:v1', '{broken-json']]);
env = makeEnv(brokenSettings);
assert.equal(env.run('toho_storage_is_blocked(TOHO_SETTINGS_KEY)'), true);
assert.equal(env.run('toho_storage_is_blocked(TOHO_META_KEY)'), false);
assert.equal(env.run('toho_unlock_item("棒", "weapon")'), true);
raw = JSON.parse(brokenSettings.get('the_toho:meta:v1'));
assert.deepEqual(raw.encyclopedia.itemIds, ['weapon:0001']);

// 周回データが壊れていても、図鑑メタの保存は止めない。
const brokenRun = new Map([['the_toho:run:v1', '{broken-json']]);
env = makeEnv(brokenRun);
assert.equal(env.run('toho_storage_is_blocked(TOHO_RUN_KEY)'), true);
assert.equal(env.run('toho_unlock_item("袋", "tool")'), true);
raw = JSON.parse(brokenRun.get('the_toho:meta:v1'));
assert.deepEqual(raw.encyclopedia.itemIds, ['tool:0001']);

// 図鑑メタ自身が壊れている場合だけは既存値を保護し、空データで上書きしない。
const brokenMetaRaw = '{broken-meta';
const brokenMeta = new Map([['the_toho:meta:v1', brokenMetaRaw]]);
env = makeEnv(brokenMeta);
assert.equal(env.run('toho_storage_is_blocked(TOHO_META_KEY)'), true);
assert.equal(env.run('toho_unlock_item("木材", "material")'), false);
assert.equal(brokenMeta.get('the_toho:meta:v1'), brokenMetaRaw);
assert.deepEqual(Array.from(env.run('toho_meta.encyclopedia.itemIds')), []);

console.log('PASS: encyclopedia unlocks survive reload and unrelated corrupt localStorage keys do not block meta saves');