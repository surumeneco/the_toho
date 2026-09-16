/* Story JSON and enemy JSON load asynchronously on a full page refresh. */
const toho_story_base_reader_init = Story_scene.prototype.init;
Story_scene.prototype.init = function (option) {
  toho_story_base_reader_init.call(this, option);
  if (this._storyReplay || !this.storyId) return;
  const scene = this;
  const next = this.children.find(function (child) { return child.text === '次へ'; });
  if (!next) return;
  const advance = next.onpointend;
  next.onpointend = function () {
    const run = toho_story_run();
    // Item, distance, sleep, etc. can return to a scene with no defeated enemy.
    if (run && run.storyReturnScene === '勝利') {
      toho_story_restore_enemy();
      if (!now_enemy || typeof now_enemy.item_drop !== 'function') {
        scene._storyError.text = '敵データの読み込みを待っています。';
        return;
      }
    }
    scene._storyError.text = '';
    return advance.call(this);
  };
};
const toho_story_base_reader_update = Story_scene.prototype.update;
Story_scene.prototype.update = function (app) {
  toho_story_base_reader_update.call(this, app);
  const run = toho_story_run();
  if (!this._storyReplay && this.storyId && run && run.storyReturnScene === '勝利') {
    toho_story_restore_enemy();
  }
};
