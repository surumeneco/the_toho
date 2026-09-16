/* The story archive owns only story metadata; deletion never touches achievements,
 * encyclopedia, play history, best records or the active run. */
const toho_story_ui_base_render = Toho_archive_scene_v14.prototype.render;
Toho_archive_scene_v14.prototype.render = function () {
  const result = toho_story_ui_base_render.call(this);
  if (this.view === 'stories') {
    const scene = this;
    this.button('データ削除', 260, 1800, 350, 115, function () {
      scene.showDeleteDialog('stories');
    }, 48);
  }
  return result;
};

const toho_story_ui_base_delete = Toho_archive_scene_v14.prototype.showDeleteDialog;
Toho_archive_scene_v14.prototype.showDeleteDialog = function (kind) {
  if (kind !== 'stories') return toho_story_ui_base_delete.call(this, kind);
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
  add(Label({ text: 'ストーリーの解放・閲覧情報を\nすべて削除しますか？',
    fontSize: 55, fill: White }), CENTER_W, CENTER_H - 160);
  add(Label({ text: '実績・図鑑・履歴・最高記録・プレイデータは残ります。',
    fontSize: 31, fill: White }), CENTER_W, CENTER_H - 18);
  const error = add(Label({ text: '', fontSize: 37, fill: Red }), CENTER_W, CENTER_H + 70);
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
    const previous = toho_meta.stories;
    const previousDirty = toho_meta_dirty;
    toho_meta.stories = { unlockedIds: [], readIds: [] };
    toho_meta_dirty = true;
    if (!toho_save_meta()) {
      toho_meta.stories = previous;
      toho_meta_dirty = previousDirty;
      error.text = '保存できませんでした。削除を中止しました。';
      return;
    }
    scene.storyOffset = 0;
    SoundManager.play('select');
    yes.interactive = false;
    no.interactive = false;
    scene._pendingDeleteRender = true;
  };
};
