/* Run: node tests/confirmation_and_notice.test.js */
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const sounds = [];
const makeLabel = (text) => ({ text, fontSize: 30, setPosition(x, y) {
  this.x = x;
  this.y = y;
  return this;
} });
const archive = function () {};
archive.prototype.showDeleteDialog = function (kind) {
  if (this._deleteDialog) return;
  const elements = [makeLabel('overlay'), makeLabel('panel'), makeLabel('original heading'),
    makeLabel('original description'), makeLabel(''), makeLabel('はい'), makeLabel('いいえ')];
  this._deleteDialog = { kind, elements };
};
const home = function () {};
home.prototype.showAbandonDialog = function () {
  if (this._abandonDialog) return;
  this._abandonDialog = { elements: [makeLabel('overlay'), makeLabel('panel'),
    makeLabel('本当に諦めますか？'), makeLabel('original description'),
    makeLabel('はい'), makeLabel('いいえ')] };
};
const env = {
  console, Array, Object, Set, Map,
  ASSETS: { sound: { select: 'sounds/select.mp3' } },
  asset(file) { return 'base/' + file + '?v=1.4.0'; },
  SoundManager: { play(name) { sounds.push(name); } },
  CENTER_W: 540, CENTER_H: 960,
  toho_achievement_notices: [],
  Toho_archive_scene_v14: archive,
  Home_scene: home,
};
vm.createContext(env);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'programs',
  'confirmation_and_notice.js'), 'utf8'), env);
assert.equal(env.ASSETS.sound.notice, 'base/sounds/notice.mp3?v=1.4.0');
assert.equal(env.ASSETS.sound.select, 'sounds/select.mp3');

for (const [kind, expectedTitle, expectedPreserved] of [
  ['encyclopedia', '図鑑の解放情報', '実績・ストーリー・プレイ履歴・最高記録'],
  ['history', 'プレイ履歴と最高記録', '図鑑・実績・ストーリー・音量設定'],
  ['achievements', '実績の解放情報と累計記録', '図鑑・ストーリー・プレイ履歴・最高記録'],
  ['stories', 'ストーリーの解放・閲覧情報', '図鑑・実績・プレイ履歴・最高記録'],
]) {
  const scene = new archive();
  scene.showDeleteDialog(kind);
  const heading = scene._deleteDialog.elements[2];
  const explanation = scene._deleteDialog.elements[3];
  assert(heading.text.includes(expectedTitle), kind + ' identifies exactly what is removed');
  assert(explanation.text.includes(expectedPreserved), kind + ' preserves unrelated data');
  assert(explanation.text.includes('元に戻せません'), kind + ' warns about irreversibility');
  assert.equal(explanation.fontSize, 28);
  const previous = heading.text;
  scene.showDeleteDialog('history');
  assert.equal(heading.text, previous, 'do not replace an existing dialog with another kind');
}
const abandon = new home();
abandon.showAbandonDialog();
assert(abandon._abandonDialog.elements[3].text.includes('現在のプレイデータは削除'));
assert(abandon._abandonDialog.elements[3].text.includes('最高記録・音量設定は残ります'));

const queue = env.toho_achievement_notices;
queue.push({ name: 'first' }, { name: 'second' });
assert.equal(sounds.length, 0, 'unlocking or enqueueing does not play the popup sound');
assert.equal(queue.shift().name, 'first');
assert.deepEqual(sounds, ['notice'], 'first displayed popup plays its SE once');
assert.equal(queue.shift().name, 'second');
assert.deepEqual(sounds, ['notice', 'notice'], 'next popup plays once when displayed');
assert.equal(queue.shift(), undefined);
assert.equal(sounds.length, 2, 'empty queue must not play');
queue.push({ name: 'deleted' });
queue.length = 0;
assert.equal(sounds.length, 2, 'discarded notifications must not play');
console.log('PASS: four deletion messages, abandon message, SE asset and popup-time playback');
