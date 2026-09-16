/* Run: node tests/archive_state_refresh.test.js */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function ArchiveScene() {}
ArchiveScene.prototype.render = function () {
  this.renderCount = (this.renderCount || 0) + 1;
};
ArchiveScene.prototype.update = function () {
  this.updateCount = (this.updateCount || 0) + 1;
};

const env = {
  console, Array, Set,
  Toho_archive_scene_v14: ArchiveScene,
  toho_meta: { encyclopedia: { itemIds: [], enemyIds: [] } },
  rates: { grandTotal: 10, total: 0 },
  toho_discovery_rates() { return env.rates; },
};
vm.createContext(env);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'programs',
  'archive_state_refresh.js'), 'utf8'), env);

const scene = new env.Toho_archive_scene_v14();
scene.view = 'index';
scene.render();
assert.equal(scene.renderCount, 1);
scene.update({});
assert.equal(scene.renderCount, 1, 'unchanged discovery state must not rerender');

env.toho_meta.encyclopedia.itemIds.push('food:0001');
env.rates = { grandTotal: 10, total: 1 };
scene.update({});
assert.equal(scene.renderCount, 2, 'unlock change with same catalog size must rerender');
assert(scene._encyclopediaStateSignature.includes('food:0001'));

scene.view = 'itemDetail';
env.toho_meta.encyclopedia.itemIds.push('food:0002');
env.rates = { grandTotal: 10, total: 2 };
scene.update({});
assert.equal(scene.renderCount, 2, 'detail view must not be replaced while reading');

scene.view = 'items';
scene.update({});
assert.equal(scene.renderCount, 3, 'returning to list reflects pending unlock changes');
console.log('PASS: encyclopedia rerenders when unlock state changes without catalog size changes');
