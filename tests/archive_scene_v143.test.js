/* Run: node tests/archive_scene_v143.test.js */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function ParentArchive() {}
ParentArchive.prototype.render = function () {
  this.parentRenderCount = (this.parentRenderCount || 0) + 1;
  if (this.view === 'enemyDetail' && this.selected) {
    this.scrollArea = { kind: 'drops' };
    this.scrollRows = this.selected.data.ドロップ.map(drop => ({
      node: { text: '・' + drop[0] + '　最大' + drop[1] },
    }));
  }
};
ParentArchive.prototype.update = function () {
  this.parentUpdateCount = (this.parentUpdateCount || 0) + 1;
};

let scans = 0;
const discoveredNames = new Set();
const env = {
  console, Array, Set,
  Toho_archive_scene_v14: ParentArchive,
  toho_meta: { encyclopedia: { itemIds: [], enemyIds: [] } },
  toho_discovery_rates() {
    return {
      grandTotal: 10,
      total: env.toho_meta.encyclopedia.itemIds.length + env.toho_meta.encyclopedia.enemyIds.length,
    };
  },
  toho_scan_inventory() { scans++; },
  toho_item_name_is_discovered(name) { return discoveredNames.has(name); },
};
env.phina = {
  define(name, spec) {
    function Defined() {}
    Defined.prototype = Object.create(ParentArchive.prototype);
    Defined.prototype.constructor = Defined;
    Object.keys(spec).forEach(key => {
      if (key !== 'superClass') Defined.prototype[key] = spec[key];
    });
    env[name] = Defined;
  },
};

vm.createContext(env);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'programs', 'archive_scene_v143.js'), 'utf8'), env);

const scene = new env.Toho_archive_scene_v143();
scene.view = 'index';
scene.render();
assert.equal(scene.parentRenderCount, 1);
assert.equal(scans, 1, 'opening encyclopedia must rescan current inventory');

scene.update({});
assert.equal(scene.parentRenderCount, 1, 'unchanged state must not rerender');

env.toho_meta.encyclopedia.itemIds.push('food:0001');
scene.update({});
assert.equal(scene.parentRenderCount, 2, 'new unlock must rerender the encyclopedia');
assert.equal(scans, 2, 'rerender must rescan before drawing');

scene.view = 'itemDetail';
env.toho_meta.encyclopedia.itemIds.push('food:0002');
scene.update({});
assert.equal(scene.parentRenderCount, 2, 'detail view must not be replaced while reading');

scene.view = 'items';
scene.update({});
assert.equal(scene.parentRenderCount, 3, 'returning to list must reflect pending unlock state');

scene.view = 'enemyDetail';
scene.selected = {
  data: { ドロップ: [['鹿肉', 2], ['毛皮', 1]] },
};
discoveredNames.add('鹿肉');
scene.render();
assert.equal(scene.scrollRows[0].node.text, '・鹿肉　最大2');
assert.equal(scene.scrollRows[1].node.text, '・？？？');

discoveredNames.add('毛皮');
scene.render();
assert.equal(scene.scrollRows[1].node.text, '・毛皮　最大1');

console.log('PASS: archive scene refreshes unlocks and masks undiscovered enemy drops');
