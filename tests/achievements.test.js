/* Run: node tests/achievements.test.js (no packages or browser required). */
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
let saved = 0;
function scene() {}
scene.prototype = { init() {}, update() {}, render() {}, keepScrollOffset() {}, showAbandonDialog() {} };
const env = {
  console, Map, Set, Object, Number, Array, Math, Date,
  SCREEN_W: 1080, SCREEN_H: 1920, CENTER_W: 540, CENTER_H: 960,
  White: 'white', lightGray: 'gray', darkGray: 'dark', Red: 'red', version: '1.4.0',
  SoundManager: { play() {} }, bgm_check() {},
  player: { 移動距離: 0, 日数: 1, 気力: 100, 体力: 100, items: {},
    has_item(name) { return this.items[name] || 0; },
    get_item(name, amount) { this.items[name] = (this.items[name] || 0) + amount; } },
  toho_meta: { encyclopedia: { itemIds: ['material:0002'], enemyIds: ['enemy:0002'] },
    achievements: { unlockedIds: [] }, lifetimeCounters: {} },
  toho_meta_dirty: false, toho_run: null,
  toho_save_meta() { saved++; env.toho_meta_dirty = false; return true; },
  toho_save_run() { return true; },
  toho_item_catalog() { return [
    { id: 'material:0001', type: 'material', name: '木材', data: { 必要道具: '石の斧' } },
    { id: 'material:0002', type: 'material', name: '木材', data: { 必要道具: '鉄の斧' } },
  ]; },
  toho_enemy_catalog() { return [
    { id: 'enemy:0001', data: { 名前: '兎', 出現距離: 0, 体力: 5 } },
    { id: 'enemy:0002', data: { 名前: '女の子……？', 出現距離: 150000, 体力: 200 } },
    { id: 'enemy:0003', data: { 名前: '女の子……？', 出現距離: 152500, 体力: 150 } },
    { id: 'enemy:0004', data: { 名前: '女の子……？', 出現距離: 155000, 体力: 250 } },
  ]; },
  toho_start_run() { env.toho_run = { id: 'run-' + ++saved, active: true, battles: 0 }; return true; },
  toho_checkpoint() { return true; }, toho_track_player() {},
  toho_note_encounter(enemy) {
    env.toho_run.battles++;
    env.toho_run.enemyName = enemy.名前;
    env.toho_run.enemyId = 'enemy:0002';
  },
  toho_note_battle_outcome() { env.toho_run.outcomeRecordedForBattle = env.toho_run.battles; },
  toho_finish_run() { env.player.__toho_finished_run = true; return true; },
  Search_scene: scene, Toho_search_scene: scene, Home_scene: scene,
  Toho_battle_scene: scene, Toho_title_scene_v14: scene, Toho_archive_scene_v14: scene,
  RectangleShape() { return { addChildTo() { return this; }, setPosition() { return this; } }; },
  Label() { return { addChildTo() { return this; }, setPosition() { return this; } }; },
  DisplayElement() { return { addChildTo() { return this; }, setPosition() { return this; } }; },
};
vm.createContext(env);
for (const file of ['achievement_definitions.js', 'achievements.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'programs', file), 'utf8'), env);
}
const run = code => vm.runInContext(code, env);
assert.equal(run('TOHO_ACHIEVEMENT_DEFINITIONS.length'), 83);
assert.equal(run('new Set(TOHO_ACHIEVEMENT_DEFINITIONS.map(x => x.id)).size'), 83);
assert.equal(run('TOHO_ACHIEVEMENT_DEFINITIONS.find(x => x.id === "ACH-035").target'), '石のナイフ');
assert.equal(run('toho_item_catalog().length'), 1);
assert.equal(run('toho_meta.encyclopedia.itemIds[0]'), 'material:0001');
assert.equal(run('toho_enemy_catalog()[1].id'), 'enemy:girl-stage-1');
assert.equal(run('toho_meta.encyclopedia.enemyIds[0]'), 'enemy:girl-stage-1');
run('toho_start_run(); player.移動距離 = 10000; toho_checkpoint()');
assert(run('toho_meta.achievements.unlockedIds.includes("ACH-001")'));
run('toho_checkpoint(); toho_checkpoint()');
assert.equal(run('toho_meta.lifetimeCounters.distanceMeters'), 10000);
run('player.get_item("石のナイフ", 1); player.get_item("女の子", 5); player.get_item("女の子", 5)');
assert(run('toho_meta.achievements.unlockedIds.includes("ACH-035")'));
assert(run('toho_meta.achievements.unlockedIds.includes("ACH-029")'));
run('toho_achievement_emit("won", { key: "enemy:girl-stage-2" })');
assert(run('toho_meta.achievements.unlockedIds.includes("ACH-082")'));
assert(!run('toho_meta.achievements.unlockedIds.includes("ACH-081")'));
for (let i = 0; i < 10; i++) run('toho_achievement_emit("advanced", { encountered: true })');
assert(run('toho_meta.achievements.unlockedIds.includes("ACH-021")'));
assert(run('toho_meta.achievements.unlockedIds.includes("ACH-023")'));
for (let i = 0; i < 10; i++) run('toho_achievement_emit("escaped", {})');
assert(run('toho_meta.achievements.unlockedIds.includes("ACH-024")'));
run('toho_achievement_emit("won", { key: "鹿" })');
assert.equal(run('toho_run.achievementCounters.escapes'), 0);
const unlockedBeforeFailure = run('toho_meta.achievements.unlockedIds.length');
env.toho_save_meta = () => false;
assert.equal(run('toho_achievement_emit("obtained", { name: "魔術台", amount: 1 })'), false);
assert.equal(run('toho_meta.achievements.unlockedIds.length'), unlockedBeforeFailure);
console.log('PASS: 83 IDs, item and enemy identity, thresholds, idempotent distance, streaks, rollback');
