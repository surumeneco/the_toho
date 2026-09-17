/* Run: node tests/encyclopedia_catalog_v143.test.js */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const read = name => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'datas', name), 'utf8'));
const foods = read('foods.json');
const weapons = read('weapons.json');
const tools = read('tools.json');
const materials = read('materials.json');
const enemies = read('enemies.json');
let saves = 0;

const env = {
  console, Array, Object, Number, Set, Map, Error,
  foods_data: foods,
  weapons_data: weapons,
  tools_data: tools,
  materials_data: materials,
  enemies_data: enemies,
  TOHO_ITEM_TYPES: [
    { id: 'food', name: '食料', data: () => foods, inventory: '食料' },
    { id: 'weapon', name: '武器', data: () => weapons, inventory: '武器' },
    { id: 'tool', name: '道具', data: () => tools, inventory: '道具' },
    { id: 'material', name: '素材', data: () => materials, inventory: '素材' },
  ],
  toho_id(type, index) { return type + ':' + String(index + 1).padStart(4, '0'); },
  toho_meta: { encyclopedia: { itemIds: [], enemyIds: [] } },
  toho_meta_dirty: false,
  toho_save_meta() { saves++; env.toho_meta_dirty = false; return true; },
  toho_item_catalog() { return []; },
  toho_enemy_catalog() { return []; },
  toho_find_item() { return null; },
  toho_find_enemy() { return null; },
  player: { 食料: [], 武器: [], 道具: [], 素材: [] },
  toho_scan_inventory() {
    env.TOHO_ITEM_TYPES.forEach(type => {
      (env.player[type.inventory] || []).forEach(pair => {
        if (!pair || !pair[0] || !(pair[1] > 0)) return;
        const entry = env.toho_find_item(pair[0].名前, type.id);
        if (entry && !env.toho_meta.encyclopedia.itemIds.includes(entry.id)) {
          env.toho_meta.encyclopedia.itemIds.push(entry.id);
          env.toho_meta_dirty = true;
          env.toho_save_meta();
        }
      });
    });
  },
};
vm.createContext(env);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'programs', 'encyclopedia_catalog.js'), 'utf8'), env);

for (const type of ['food', 'weapon', 'tool', 'material']) {
  const count = vm.runInContext(`toho_item_catalog().filter(x => x.type === ${JSON.stringify(type)}).length`, env);
  assert(count > 0, type + ' encyclopedia must contain entries');
}
assert.equal(vm.runInContext('toho_enemy_catalog().length', env), enemies.length);

const girls = vm.runInContext(`toho_enemy_catalog().filter(x => x.name === '女の子……？').map(x => x.id)`, env);
assert.deepEqual(Array.from(girls), ['enemy:girl-stage-1', 'enemy:girl-stage-2', 'enemy:girl-stage-3']);

const duplicateMaterial = materials.find((item, index) =>
  materials.findIndex(other => other.名前 === item.名前) !== index);
if (duplicateMaterial) {
  const rawIndexes = materials.map((item, index) => item.名前 === duplicateMaterial.名前 ? index : -1)
    .filter(index => index >= 0);
  const canonical = 'material:' + String(rawIndexes[0] + 1).padStart(4, '0');
  const legacy = 'material:' + String(rawIndexes[rawIndexes.length - 1] + 1).padStart(4, '0');
  env.toho_meta.encyclopedia.itemIds = [legacy];
  assert.equal(vm.runInContext('toho_prepare_encyclopedia_catalog()', env), true);
  assert.deepEqual(env.toho_meta.encyclopedia.itemIds, [canonical]);
}

// 現在所持中のアイテムはprepare時の走査で解放へ反映される。
env.toho_meta.encyclopedia.itemIds = [];
env.player.食料 = [[foods[0], 1]];
assert.equal(vm.runInContext('toho_prepare_encyclopedia_catalog()', env), true);
assert(env.toho_meta.encyclopedia.itemIds.includes('food:0001'));
assert(saves > 0);

// 敵ドロップの開示判定は、同名の図鑑項目が1件でも解放済みならtrueになる。
const knownFood = foods[0].名前;
assert.equal(vm.runInContext(`toho_item_name_is_discovered(${JSON.stringify(knownFood)})`, env), true);
const undiscovered = vm.runInContext('toho_item_catalog().find(x => !toho_meta.encyclopedia.itemIds.includes(x.id))', env);
if (undiscovered) {
  assert.equal(vm.runInContext(`toho_item_name_is_discovered(${JSON.stringify(undiscovered.name)})`, env), false);
}

console.log('PASS: authoritative encyclopedia catalog has stable IDs, inventory recovery and drop discovery lookup');
