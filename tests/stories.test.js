/* Run: node tests/stories.test.js. Browser layout still needs visual checking. */
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
let failSave = false;
function makeClass(prototype) { function Scene() {} Scene.prototype = prototype; return Scene; }
function shape(options) {
  return Object.assign({ children: [], interactive: false,
    addChildTo(parent) { parent.children.push(this); this.parent = parent; return this; },
    setPosition() { return this; },
    remove() {
      if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
      this.parent = null;
    },
  }, options);
}
const archiveClass = makeClass({
  render() {}, keepScrollOffset() {},
  showDeleteDialog(kind) {
    const scene = this;
    const yes = { text: 'はい', onpointend() {
      if (kind !== 'history') return;
      const previous = env.toho_meta.history;
      env.toho_meta.history = [];
      env.toho_meta_dirty = true;
      if (!env.toho_save_meta()) { env.toho_meta.history = previous; return; }
      scene._pendingDeleteRender = true;
    } };
    this._deleteDialog = { elements: [yes] };
  },
});
const env = {
  console, Map, Set, Object, Number, Array, Math, Date,
  SCREEN_W: 1080, SCREEN_H: 1920, CENTER_W: 540, CENTER_H: 960,
  White: 'white', lightGray: 'gray', darkGray: 'dark', Red: 'red', version: '1.4.0',
  SoundManager: { play() {}, pauseMusic() {}, resumeMusic() {} }, bgm_check() {},
  story_texts: ['one', 'two', 'three', 'four'],
  player: { 移動距離: 2000, 日数: 5, 気力: 120, 体力: 50 },
  toho_meta: { stories: { unlockedIds: [], readIds: [] },
    records: { bestDistanceMeters: 10000, bestDays: 20 },
    history: [{ runId: 'old' }], encyclopedia: { itemIds: ['food:0001'], enemyIds: [] },
    achievements: { unlockedIds: ['ACH-001'] } },
  toho_meta_dirty: false,
  toho_run: { id: 'first', active: true, storyQueue: [], storyFiredIds: [] },
  now_enemy: null,
  toho_save_meta() { if (failSave) return false; env.toho_meta_dirty = false; return true; },
  toho_save_run() { return true; },
  toho_girl_id(enemy) {
    return enemy && enemy.名前 === '女の子……？' && [150000, 152500, 155000].includes(enemy.出現距離)
      ? 'enemy:girl-stage-' + ({ 150000: 1, 152500: 2, 155000: 3 }[enemy.出現距離]) : null;
  },
  toho_enemy_catalog() { return []; },
  toho_catalog_complete(category) { return category === 'food'; },
  toho_achievement_run() { return { advances: 10, encounters: 3, escapes: 2,
    items: { りんご: 2 } }; },
  toho_achievement_emit() { return true; },
  toho_note_battle_outcome() {}, set_cookies() {},
  toho_discovery_rates() { return { grandTotal: 1 }; },
  Toho_battle_scene: makeClass({ update() {} }),
  Toho_search_scene: makeClass({ update() {} }),
  Toho_title_scene_v14: makeClass({ init() {}, update() {} }),
  Toho_archive_scene_v14: archiveClass,
  Story_scene: makeClass({ init() {}, update() {} }),
  DisplayScene: makeClass({ exit(label) { this.exited = label; } }),
  RectangleShape(options) { return shape(options); },
  Label(options) { return shape(options); },
  Button(options) { return shape(Object.assign({ interactive: true }, options)); },
  background_candidates(config) { return [config.backgroundCategory]; },
  BACKGROUND_FILES: { story: 'images/backgrounds/story_default.webp' },
};
vm.createContext(env);
for (const filename of [
  'story_definitions.js', 'story_system.js', 'story_resume_guard.js',
  'story_trigger_engine.js', 'story_ui_extensions.js', 'story_background_override.js',
]) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'programs', filename), 'utf8'), env);
const run = code => vm.runInContext(code, env);
assert.equal(run('TOHO_STORY_DEFINITIONS.length'), 4);
assert.equal(run('new Set(TOHO_STORY_DEFINITIONS.map(story => story.id)).size'), 4);
assert.equal(run('TOHO_STORY_DEFINITIONS.map(story => story.title).join(",")'), '遭遇,変容,予感,異変');
function defeat(stage) {
  const distance = [0, 150000, 152500, 155000][stage];
  return run(`toho_story_emit('victory', {enemyId: 'enemy:girl-stage-${stage}', enemy: {
    名前: '女の子……？', 出現距離: ${distance}}}, '勝利')`);
}
function unlocked() { return run('toho_meta.stories.unlockedIds.slice().join(",")'); }
assert(defeat(1));
assert.equal(unlocked(), 'story:encounter');
run('toho_run.storyQueue = []; toho_run.storyCurrentId = null');
assert.equal(defeat(1), false, 'same story is not inserted twice in one run');
assert(defeat(2));
assert.equal(unlocked(), 'story:encounter,story:transformation');
run('toho_run.storyQueue = []; toho_run.storyCurrentId = null');
assert(defeat(3));
assert.equal(unlocked(), 'story:encounter,story:transformation,story:premonition',
  'third first victory must not also unlock the fourth story');
run('toho_run.storyQueue = []; toho_run.storyCurrentId = null');
assert(defeat(2), 'another stage victory after all three unlocks story four');
assert.equal(unlocked(), 'story:encounter,story:transformation,story:premonition,story:anomaly');
assert.equal(run('toho_run.storyQueue.join(",")'), 'story:anomaly');
run(`toho_run = { id: 'second', active: true, storyQueue: [], storyFiredIds: [] }`);
assert(defeat(1), 'unlocked story can play again in a different run');
assert.equal(run('toho_run.storyQueue.join(",")'), 'story:encounter,story:anomaly');
assert.equal(run('toho_meta.stories.readIds.length'), 0, 'rule evaluation does not mark a story read');

assert(run(`toho_story_matches({trigger: {type:'obtained', all:[
  {kind:'itemObtained', name:'りんご',value:2},
  {any:[{kind:'playerStatAtLeast',stat:'distance',value:1000},
        {kind:'catalogComplete',category:'enemy'}]}
]}}, 'obtained',{name:'りんご'},new Set())`));
assert(!run(`toho_story_matches({trigger:{type:'obtained',all:[
  {kind:'playerStatAtLeast',stat:'distance',value:99999}
]}}, 'obtained',{name:'りんご'},new Set())`));
run(`toho_register_story_condition('customFlag', function(rule,event){return event.flag === rule.value;})`);
assert(run(`toho_story_matches({trigger:{type:'progress',all:[
  {kind:'customFlag',value:true}
]}},'progress',{flag:true},new Set())`));

// A newly added non-victory rule uses the existing achievement event pipeline.
run(`toho_run = { id: 'third', active: true, storyQueue: [], storyFiredIds: [] };
  TOHO_STORY_DEFINITIONS[0].trigger = {type:'progress',all:[
    {kind:'playerStatAtLeast',stat:'distance',value:1000}]};
  toho_achievement_emit('progress',{});`);
assert.equal(run('toho_run.storyQueue.join(",")'), 'story:encounter');
const gameplay = new env.DisplayScene();
gameplay.exit('入手');
assert.equal(gameplay.exited, 'ストーリー');
assert.equal(run('toho_run.storyReturnScene'), '入手');
assert.equal(run('background_candidates({backgroundCategory:"history"},{view:"stories"})[0]'),
  'images/backgrounds/story_default.webp');
assert.equal(run('background_candidates({backgroundCategory:"history"},{view:"history"})[0]'), 'history');

const failed = new archiveClass();
failSave = true;
failed.showDeleteDialog('history');
failed._deleteDialog.elements[0].onpointend();
assert.equal(env.toho_meta.records.bestDistanceMeters, 10000);
assert.equal(env.toho_meta.records.bestDays, 20);
assert.equal(env.toho_meta.history.length, 1);
assert.equal(failed._pendingDeleteRender, undefined);
failSave = false;
const confirmed = new archiveClass();
confirmed.showDeleteDialog('history');
confirmed._deleteDialog.elements[0].onpointend();
assert.equal(env.toho_meta.records.bestDistanceMeters, 0);
assert.equal(env.toho_meta.records.bestDays, 0);
assert.equal(env.toho_meta.history.length, 0);
assert.equal(env.toho_meta.achievements.unlockedIds[0], 'ACH-001');
assert.equal(env.toho_meta.stories.unlockedIds.length, 4);
assert.equal(confirmed._pendingDeleteRender, true);

function storyDialog() {
  const scene = new archiveClass();
  scene.body = shape();
  scene.scrollArea = { kind: 'stories', offset: 0 };
  scene.showDeleteDialog('stories');
  return scene;
}
const failedStory = storyDialog();
failSave = true;
failedStory._deleteDialog.elements.find(x => x.text === 'はい').onpointend();
assert.equal(env.toho_meta.stories.unlockedIds.length, 4);
assert.equal(failedStory._pendingDeleteRender, undefined);
failSave = false;
const deletedStory = storyDialog();
deletedStory._deleteDialog.elements.find(x => x.text === 'はい').onpointend();
assert.equal(env.toho_meta.stories.unlockedIds.length, 0);
assert.equal(env.toho_meta.stories.readIds.length, 0);
assert.equal(env.toho_meta.achievements.unlockedIds[0], 'ACH-001');
assert.equal(env.toho_meta.encyclopedia.itemIds[0], 'food:0001');
assert.equal(deletedStory._pendingDeleteRender, true);
console.log('PASS: story stages, fourth timing, extensible triggers, event routing, artwork, deletion rollback');
