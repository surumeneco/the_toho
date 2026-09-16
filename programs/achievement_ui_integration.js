/* Achievement list styling and deletion are composed over the shared archive UI. */
const toho_achievement_base_render = Toho_archive_scene_v14.prototype.render;
Toho_archive_scene_v14.prototype.render = function () {
  const result = toho_achievement_base_render.call(this);
  if (this.view === 'achievements') {
    // The shared archive update uses this value to avoid rebuilding rows every frame.
    this.lastCatalogSize = toho_discovery_rates().grandTotal;
    const unlocked = new Set((toho_meta.achievements && toho_meta.achievements.unlockedIds) || []);
    const entries = TOHO_ACHIEVEMENT_DEFINITIONS.slice().sort(function (a, b) {
      return Number(unlocked.has(b.id)) - Number(unlocked.has(a.id));
    });
    this.scrollRows.forEach(function (row, index) {
      // Each row's first child is its background; leave unlocked rows unchanged.
      if (!unlocked.has(entries[index].id)) row.node.children[0].fill = '#353535';
    });
    const scene = this;
    this.button('データ削除', 260, 1800, 350, 115, function () {
      scene.showDeleteDialog('achievements');
    }, 48);
  }
  return result;
};

// Reuse the archive scene's modal lifecycle, including the next-frame render and
// restoration guards. Never treat achievement deletion as history deletion.
const toho_achievement_base_delete_dialog = Toho_archive_scene_v14.prototype.showDeleteDialog;
Toho_archive_scene_v14.prototype.showDeleteDialog = function (kind) {
  if (kind !== 'achievements') return toho_achievement_base_delete_dialog.call(this, kind);
  if (this._deleteDialog || this._pendingDeleteRender || this._pendingDeleteRestore) return;
  const scene = this;
  const controls = [];
  function freeze(element) {
    if (element.interactive === true) {
      controls.push(element);
      element.interactive = false;
    }
    if (element.children) element.children.slice().forEach(freeze);
  }
  freeze(this.body);
  const dialog = { controls: controls, scrollArea: this.scrollArea, elements: [] };
  this.scrollArea = null;
  this.scrollActive = false;
  this._deleteDialog = dialog;
  function add(element, x, y) {
    element.addChildTo(scene.body).setPosition(x, y);
    dialog.elements.push(element);
    return element;
  }
  add(RectangleShape({ width: SCREEN_W, height: SCREEN_H,
    fill: 'rgba(0, 0, 0, 0.75)', strokeWidth: 0 }), CENTER_W, CENTER_H);
  add(RectangleShape({ width: 940, height: 620, cornerRadius: 20,
    fill: darkGray, stroke: lightGray, strokeWidth: 12 }), CENTER_W, CENTER_H);
  add(Label({ text: '実績の解放情報と累計を\nすべて削除しますか？',
    fontSize: 59, fill: White }), CENTER_W, CENTER_H - 160);
  add(Label({ text: '最高記録・図鑑・履歴・プレイデータは残ります。',
    fontSize: 33, fill: White }), CENTER_W, CENTER_H - 18);
  const error = add(Label({ text: '', fontSize: 38, fill: Red }), CENTER_W, CENTER_H + 70);
  const yes = add(Button({ text: 'はい', fontSize: 60, width: 320, height: 140,
    cornerRadius: 0, fill: '#823636', stroke: lightGray, strokeWidth: 12 }),
  CENTER_W - 205, CENTER_H + 180);
  const no = add(Button({ text: 'いいえ', fontSize: 60, width: 320, height: 140,
    cornerRadius: 0, fill: darkGray, stroke: lightGray, strokeWidth: 12 }),
  CENTER_W + 205, CENTER_H + 180);
  no.onpointend = function () {
    if (!scene._deleteDialog) return;
    SoundManager.play('select');
    dialog.elements.forEach(function (element) { element.remove(); });
    scene._deleteDialog = null;
    scene._pendingDeleteRestore = dialog;
  };
  yes.onpointend = function () {
    if (!scene._deleteDialog || scene._pendingDeleteRender) return;
    const previousAchievements = toho_meta.achievements;
    const previousLifetime = toho_meta.lifetimeCounters;
    const previousDirty = toho_meta_dirty;
    // Reset lifetime counters too, or cumulative achievements unlock again
    // immediately at the next progress checkpoint.
    toho_meta.achievements = { unlockedIds: [] };
    toho_meta.lifetimeCounters = {};
    toho_meta_dirty = true;
    if (!toho_save_meta()) {
      toho_meta.achievements = previousAchievements;
      toho_meta.lifetimeCounters = previousLifetime;
      toho_meta_dirty = previousDirty;
      error.text = '保存できませんでした。削除を中止しました。';
      return;
    }
    toho_achievement_notices.length = 0;
    scene.achievementOffset = 0;
    SoundManager.play('select');
    yes.interactive = false;
    no.interactive = false;
    scene._pendingDeleteRender = true;
  };
};
