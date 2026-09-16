/* Run: node tests/catalog_achievements.test.js */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const names = ['food', 'weapon', 'tool', 'material'];
const entries = [
  { id: 'food:0001', type: 'food', name: 'りんご' },
  { id: 'food:0002', type: 'food', name: 'みかん' },
  { id: 'weapon:0001', type: 'weapon', name: '石のナイフ' },
  { id: 'tool:0001', type: 'tool', name: '袋' },
  { id: 'material:0001', type: 'material', name: '木材' },
];
let loaded = true;
const env = {
  Object, Array, Map, Set, Number,
  toho_run: { active: true },
  toho_meta: { encyclopedia: { itemIds: [], enemyIds: [] }, achievements: { unlockedIds: [] } },
  TOHO_ITEM_TYPES: names.map(id => ({ id })),
  toho_item_catalog() { return loaded ? entries : []; },
  toho_enemy_catalog() { return loaded ? [{ id: 'enemy:0001' }] : []; },
  toho_unlock_item(name) {
    const item = entries.find(entry => entry.name === name);
    if (item && !env.toho_meta.encyclopedia.itemIds.includes(item.id)) {
      env.toho_meta.encyclopedia.itemIds.push(item.id);
    }
  },
  toho_unlock_enemy() { env.toho_meta.encyclopedia.enemyIds.push('enemy:0001'); },
  toho_checkpoint() { return true; },
  toho_achievement_emit(type) {
    if (type === 'catalog') {
      for (const achievement of vm.runInContext('TOHO_ACHIEVEMENT_DEFINITIONS', env)) {
        const rule = env.TOHO_ACHIEVEMENT_RULES[achievement.kind];
        if (rule && rule[0] === type && rule[1](achievement) &&
            !env.toho_meta.achievements.unlockedIds.includes(achievement.id)) {
          env.toho_meta.achievements.unlockedIds.push(achievement.id);
        }
      }
    }
    return true;
  },
  TOHO_ACHIEVEMENT_RULES: {},
};
vm.createContext(env);
for (const file of ['achievement_definitions.js', 'catalog_achievements.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'programs', file), 'utf8'), env);
}
const run = code => vm.runInContext(code, env);
const unlocked = id => env.toho_meta.achievements.unlockedIds.includes(id);
assert.equal(run('TOHO_ACHIEVEMENT_DEFINITIONS.length'), 89);
loaded = false;
assert.equal(run('toho_catalog_complete("all")'), false, 'async catalogs cannot complete before load');
loaded = true;
env.toho_unlock_item('りんご');
assert(!unlocked('ACH-084'), 'one of two foods is insufficient');
env.toho_unlock_item('みかん');
assert(unlocked('ACH-084'));
env.toho_unlock_item('石のナイフ');
assert(unlocked('ACH-085'));
env.toho_unlock_item('袋');
assert(unlocked('ACH-086'));
env.toho_unlock_item('木材');
assert(unlocked('ACH-087'));
assert(!unlocked('ACH-089'), 'all catalog excludes no enemy');
env.toho_unlock_enemy({});
assert(unlocked('ACH-088'));
assert(unlocked('ACH-089'));
assert.equal(env.toho_meta.achievements.unlockedIds.filter(id => Number(id.slice(4)) >= 84).length, 6);
// Previous-version discovery is evaluated on the next checkpoint, not on UI render.
env.toho_meta.achievements.unlockedIds = [];
assert(env.toho_checkpoint());
assert.equal(env.toho_meta.achievements.unlockedIds.length, 6);
console.log('PASS: six catalog achievements, asynchronous load guard, all-catalog AND, existing discovery');
