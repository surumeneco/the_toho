/* Run: node tests/encyclopedia_multitab.test.js */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', 'programs', name), 'utf8');
const source = [read('meta_progress.js'), read('encyclopedia_storage.js')];
const storage = new Map();
const writes = new Map();

function newTab() {
  function Archive() {}
  Archive.prototype.showDeleteDialog = function () {};
  const handlers = {};
  const env = {
    console, Array, Object, Number, Set, Map, Math, Date, JSON,
    crypto: { randomUUID() { return 'test-run'; } },
    version: '1.4.7',
    music_volume: 25, SE_volume: 25, saved_music_volume: 25, saved_SE_volume: 25,
    SoundManager: { setVolumeMusic() {}, setVolume() {} },
    set_settings_cookies() { return true; }, get_settings_cookies() { return true; },
    set_cookies() { return true; }, get_cookies() { return true; }, delete_cookies() { return true; },
    foods_data: [{ 名前: 'りんご' }], weapons_data: [{ 名前: '棒' }],
    tools_data: [{ 名前: '袋' }], materials_data: [{ 名前: '木材' }],
    enemies_data: [{ 名前: '兎', 出現距離: 0, 体力: 5 }],
    Toho_archive_scene_v14: Archive,
    window: {
      localStorage: {
        getItem(key) { return storage.has(key) ? storage.get(key) : null; },
        setItem(key, value) {
          storage.set(key, String(value));
          writes.set(key, (writes.get(key) || 0) + 1);
        },
        removeItem(key) { storage.delete(key); },
      },
      addEventListener(type, callback) { handlers[type] = callback; },
    },
    player: {
      体力: 100, 気力: 100, 日数: 1, 移動距離: 0,
      食料: [], 武器: [], 道具: [], 素材: [],
      has_item() { return 0; }, get_item() {},
    },
  };
  vm.createContext(env);
  source.forEach(script => vm.runInContext(script, env));
  return { run: script => vm.runInContext(script, env), handlers };
}
function saved() {
  return {
    meta: JSON.parse(storage.get('the_toho:meta:v1')),
    encyclopedia: JSON.parse(storage.get('the_toho:encyclopedia:v1')),
  };
}

// 1.4.6の再現: タブBが解放→古いタブAが最高記録を保存→両キーから消失。
// 1.4.7では保存直前の照合により、Bの解放IDが残る。
const a = newTab();
const b = newTab();
assert.equal(b.run('toho_unlock_item("りんご", "food")'), true);
assert.deepEqual(saved().meta.encyclopedia.itemIds, ['food:0001']);
assert.equal(a.run('toho_meta.records.bestDays = 3; toho_meta_dirty = true; toho_save_meta()'), true);
assert.deepEqual(saved().meta.encyclopedia.itemIds, ['food:0001']);
assert.deepEqual(saved().encyclopedia.itemIds, ['food:0001']);
assert.deepEqual(Array.from(a.run('toho_meta.encyclopedia.itemIds')), ['food:0001']);

// 他タブのstorageイベントを受けた時、保存済みIDを反映する。
assert.equal(typeof b.handlers.storage, 'function');
const beforeEventWrites = writes.get('the_toho:encyclopedia:v1');
b.handlers.storage({ key: 'the_toho:encyclopedia:v1' });
assert.equal(writes.get('the_toho:encyclopedia:v1'), beforeEventWrites,
  'identical data must not cause cross-tab storage event loops');

// 意図した削除では世代を更新。古いタブが保持する削除前IDを再保存させない。
assert.equal(b.run('toho_clear_encyclopedia()'), true);
assert.deepEqual(saved().meta.encyclopedia.itemIds, []);
assert.deepEqual(saved().encyclopedia.itemIds, []);
assert.equal(saved().encyclopedia.resetGeneration, 1);
assert.equal(a.run('toho_meta.records.bestDays = 4; toho_meta_dirty = true; toho_save_meta()'), true);
assert.deepEqual(saved().meta.encyclopedia.itemIds, []);
assert.deepEqual(saved().encyclopedia.itemIds, []);
assert.equal(a.run('toho_meta.encyclopedia.resetGeneration'), 1);

// 削除後の新規取得も、再読込して復元する。
assert.equal(b.run('toho_unlock_enemy(enemies_data[0])'), true);
assert.equal(a.run('toho_meta.records.bestDays = 5; toho_meta_dirty = true; toho_save_meta()'), true);
const reloaded = newTab();
assert.deepEqual(Array.from(reloaded.run('toho_meta.encyclopedia.itemIds')), []);
assert.deepEqual(Array.from(reloaded.run('toho_meta.encyclopedia.enemyIds')), ['enemy:0001']);
assert.equal(reloaded.run('toho_reconcile_encyclopedia_storage().saved'), true);
assert.equal(reloaded.run('toho_encyclopedia_storage_diagnostic().memory'), '0/1');
assert.equal(typeof reloaded.handlers.pagehide, 'function');
reloaded.handlers.pagehide();
assert.deepEqual(saved().meta.encyclopedia.enemyIds, ['enemy:0001']);

console.log('PASS: stale tabs cannot erase unlocks or resurrect explicitly deleted encyclopedia entries');
