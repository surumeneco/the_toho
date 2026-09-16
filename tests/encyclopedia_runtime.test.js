/* Run: node tests/encyclopedia_runtime.test.js */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const storage = new Map();
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
  version: '1.4.2',
  music_volume: 25, SE_volume: 25, saved_music_volume: 25, saved_SE_volume: 25,
  SoundManager: { setVolumeMusic() {}, setVolume() {} },
  read_cookie() { return null; }, write_cookie() {},
  set_settings_cookies() {}, get_settings_cookies() {},
  set_cookies() { return true; }, get_cookies() { return true; }, delete_cookies() { return true; },
  foods_data: [{ 名前: 'りんご', 探索入手: true, 最大入手数: 2, 回復量: 4 }],
  weapons_data: [{ 名前: '棒', 攻撃力: { ダイス: [[1, 4]], 固定値: 0 } }],
  tools_data: [{ 名前: '袋' }],
  materials_data: [{ 名前: '木材', 必要道具: '無し', 最大入手数: 3 }],
  enemies_data: [{ 名前: '兎', 体力: 5, 出現距離: 0, 攻撃力: { ダイス: [[1, 2]], 固定値: 0 } }],
};
env.player = {
  体力: 100, 気力: 100, 日数: 1, 移動距離: 0,
  食料: [[env.foods_data[0], 1]], 武器: [], 道具: [], 素材: [], 食事履歴: [],
  has_item(name) {
    for (const list of [this.食料, this.武器, this.道具, this.素材]) {
      const found = list.find(pair => pair[0].名前 === name);
      if (found) return found[1];
    }
    return 0;
  },
  get_item(name, amount) {
    const sources = [
      ['食料', env.foods_data], ['武器', env.weapons_data],
      ['道具', env.tools_data], ['素材', env.materials_data],
    ];
    for (const [field, source] of sources) {
      const data = source.find(item => item.名前 === name);
      if (!data) continue;
      const found = this[field].find(pair => pair[0].名前 === name);
      if (found) found[1] += amount;
      else if (amount > 0) this[field].push([data, amount]);
      return;
    }
  },
};

vm.createContext(env);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'programs', 'meta_progress.js'), 'utf8'), env);
const run = code => vm.runInContext(code, env);

assert.equal(run('toho_item_catalog().length'), 4);
assert.equal(run('toho_enemy_catalog().length'), 1);
run('toho_scan_inventory()');
assert(run('toho_meta.encyclopedia.itemIds.includes("food:0001")'));
let savedMeta = JSON.parse(storage.get('the_toho:meta:v1'));
assert(savedMeta.encyclopedia.itemIds.includes('food:0001'));

run('player.get_item("棒", 1)');
assert(run('toho_meta.encyclopedia.itemIds.includes("weapon:0001")'));
savedMeta = JSON.parse(storage.get('the_toho:meta:v1'));
assert(savedMeta.encyclopedia.itemIds.includes('weapon:0001'));

run('toho_start_run(); toho_note_encounter(enemies_data[0])');
assert(run('toho_meta.encyclopedia.enemyIds.includes("enemy:0001")'));
savedMeta = JSON.parse(storage.get('the_toho:meta:v1'));
assert(savedMeta.encyclopedia.enemyIds.includes('enemy:0001'));

console.log('PASS: inventory scan, item acquisition and enemy encounter persist encyclopedia unlocks');
