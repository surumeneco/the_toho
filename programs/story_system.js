/* v1.4.0: story rules, durable insertion queue, replay UI and history reset. */
let toho_story_replay_id = null;

function toho_story_state() {
  if (!toho_meta.stories || typeof toho_meta.stories !== 'object') {
    toho_meta.stories = { unlockedIds: [], readIds: [] };
  }
  const state = toho_meta.stories;
  if (!Array.isArray(state.unlockedIds)) state.unlockedIds = [];
  if (!Array.isArray(state.readIds)) state.readIds = [];
  return state;
}
function toho_story_run() {
  if (!toho_run || !toho_run.active) return null;
  if (!Array.isArray(toho_run.storyQueue)) toho_run.storyQueue = [];
  if (!Array.isArray(toho_run.storyFiredIds)) toho_run.storyFiredIds = [];
  return toho_run;
}
function toho_story_definition(id) {
  return TOHO_STORY_DEFINITIONS.find(function (story) { return story.id === id; }) || null;
}
// The fourth story requires all three stage victories BEFORE the current victory.
// Persistent unlock IDs represent victories across runs; the fourth victory must be separate.
function toho_story_matches(definition, type, event, unlockedBefore) {
  const trigger = definition.trigger;
  if (trigger.type !== type) return false;
  if (trigger.enemyId) return event.enemyId === trigger.enemyId;
  if (trigger.afterAll) {
    return !!toho_girl_id(event.enemy) && trigger.afterAll.every(function (id) {
      return unlockedBefore.has(id);
    });
  }
  return false;
}
// Future gameplay systems can call this emitter with a new event type and a rule predicate.
function toho_story_emit(type, event, returnScene) {
  const run = toho_story_run();
  if (!run) return false;
  const state = toho_story_state();
  const unlockedBefore = new Set(state.unlockedIds);
  const previousUnlocks = state.unlockedIds.slice();
  const previousQueue = run.storyQueue.slice();
  const previousFired = run.storyFiredIds.slice();
  const previousReturn = run.storyReturnScene;
  const previousEnemy = run.storyReturnEnemyId;
  const previousCurrent = run.storyCurrentId;
  const previousDirty = toho_meta_dirty;
  let newlyUnlocked = false;
  TOHO_STORY_DEFINITIONS.forEach(function (definition) {
    if (!toho_story_matches(definition, type, event, unlockedBefore)) return;
    if (!unlockedBefore.has(definition.id)) {
      state.unlockedIds.push(definition.id);
      newlyUnlocked = true;
    }
    if (!run.storyFiredIds.includes(definition.id)) {
      run.storyFiredIds.push(definition.id);
      run.storyQueue.push(definition.id);
    }
  });
  if (!run.storyQueue.length) return false;
  if (!run.storyCurrentId) run.storyCurrentId = run.storyQueue[0];
  run.storyReturnScene = returnScene || run.storyReturnScene || '勝利';
  if (event.enemyId) run.storyReturnEnemyId = event.enemyId;
  if (newlyUnlocked) toho_meta_dirty = true;
  // Store unlocks before the queue. A failed write never silently clears older data.
  if (!toho_save_meta() || !toho_save_run()) {
    state.unlockedIds = previousUnlocks;
    run.storyQueue = previousQueue;
    run.storyFiredIds = previousFired;
    run.storyReturnScene = previousReturn;
    run.storyReturnEnemyId = previousEnemy;
    run.storyCurrentId = previousCurrent;
    toho_meta_dirty = previousDirty || newlyUnlocked;
    console.error('ストーリーの解放・再生位置を保存できませんでした。');
    return false;
  }
  return true;
}
function toho_story_restore_enemy() {
  const run = toho_story_run();
  if (!run || !run.storyReturnEnemyId) return;
  // The enemy instance is transient; Win_scene needs item_drop() after a page reload.
  const entry = toho_enemy_catalog().find(function (enemy) {
    return enemy.id === run.storyReturnEnemyId;
  });
  if (entry && (!now_enemy || toho_girl_id(now_enemy) !== run.storyReturnEnemyId)) {
    now_enemy = Object.assign({}, entry.data, { 体力: 0 });
  }
}

// Handle the girl victory before the old battle code's post-victory enemy attack.
// Record the win here; Win_scene's second outcome notification is idempotent.
const toho_story_original_battle_update = Toho_battle_scene.prototype.update;
Toho_battle_scene.prototype.update = function (app) {
  if (this._tohoStoryVictoryHandled) { bgm_check(app); return; }
  if (this.戦闘フェイズ === '敵の攻撃' && this.敵 && this.敵.体力 <= 0 &&
      toho_girl_id(this.敵)) {
    this._tohoStoryVictoryHandled = true;
    now_enemy = this.敵;
    toho_note_battle_outcome('victory');
    const enemyId = toho_girl_id(this.敵);
    const showStory = toho_story_emit('victory', { enemyId: enemyId, enemy: this.敵 }, '勝利');
    set_cookies();
    SoundManager.play(showStory ? 'story' : 'win');
    this.exit(showStory ? 'ストーリー' : '勝利');
    return;
  }
  return toho_story_original_battle_update.call(this, app);
};

// Replace the index-based reader without touching the four original story texts.
// Automatic playback and title replay have separate exit destinations and effects.
Story_scene.prototype.init = function (option) {
  this.superInit(option);
  this.width = SCREEN_W;
  this.height = SCREEN_H;
  this.backgroundColor = Black;
  const scene = this;
  const state = toho_story_state();
  const replayId = toho_story_replay_id;
  toho_story_replay_id = null;
  const run = toho_story_run();
  this._storyReplay = !!replayId;
  this._storyRun = this._storyReplay ? null : run;
  const id = replayId || (run && (run.storyCurrentId || run.storyQueue[0]));
  const definition = toho_story_definition(id);
  if (!definition || (this._storyReplay && !state.unlockedIds.includes(id))) {
    this.exit(this._storyReplay ? '記録・図鑑' : '勝利');
    return;
  }
  this.storyId = id; // Used by the optional per-story background mapping.
  this._storyIndex = definition.textIndex;
  SoundManager.pauseMusic();
  const versionLabel = Label({ text: 'バージョン：' + version, fill: White })
    .addChildTo(this).setPosition(25, SCREEN_H - 25);
  versionLabel.align = 'left';
  versionLabel.baseline = 'bottom';
  Label({ text: definition.title, fontSize: 73, fill: White })
    .addChildTo(this).setPosition(CENTER_W, 255);
  this._storyText = Label({ text: story_texts[definition.textIndex] || '読み込み中…',
    fontSize: 48, fill: White }).addChildTo(this).setPosition(CENTER_W, 950);
  if (!this._storyReplay) {
    run.storyCurrentId = id;
    if (!state.readIds.includes(id)) {
      state.readIds.push(id);
      toho_meta_dirty = true;
      if (!toho_save_meta()) {
        state.readIds.pop();
        toho_meta_dirty = true;
      }
    }
    toho_story_restore_enemy();
    toho_save_run();
  }
  Button({ text: this._storyReplay ? '戻る' : '次へ', fontSize: 64,
    width: 300, height: 150, cornerRadius: 0,
    fill: darkGray, stroke: lightGray, strokeWidth: 15 })
    .addChildTo(this).setPosition(SCREEN_W - 200, SCREEN_H - 250)
    .onpointend = function () {
      if (!story_texts[definition.textIndex]) return; // Do not skip an unloaded body.
      if (scene._storyReplay) {
        toho_archive_entry = 'stories';
        SoundManager.play('select');
        SoundManager.resumeMusic();
        scene.exit('記録・図鑑');
        return;
      }
      const active = toho_story_run();
      if (!active || active.storyCurrentId !== id) return;
      const previousQueue = active.storyQueue.slice();
      active.storyQueue = active.storyQueue.filter(function (pending) { return pending !== id; });
      active.storyCurrentId = active.storyQueue[0] || null;
      if (!toho_save_run()) {
        active.storyQueue = previousQueue;
        active.storyCurrentId = id;
        scene._storyError.text = '保存に失敗しました。再試行してください。';
        return;
      }
      SoundManager.play('select');
      if (active.storyCurrentId) {
        scene.exit('ストーリー');
      } else {
        const destination = active.storyReturnScene || '勝利';
        active.storyReturnScene = null;
        active.storyReturnEnemyId = null;
        toho_save_run();
        SoundManager.resumeMusic();
        scene.exit(destination);
      }
    };
  this._storyError = Label({ text: '', fontSize: 35, fill: Red })
    .addChildTo(this).setPosition(CENTER_W, 1490);
};
Story_scene.prototype.update = function () {
  if (this._storyText && story_texts[this._storyIndex] &&
      this._storyText.text !== story_texts[this._storyIndex]) {
    this._storyText.text = story_texts[this._storyIndex];
  }
};

// A reload during automatic playback must resume the story instead of going home.
const toho_story_original_title_update = Toho_title_scene_v14.prototype.update;
Toho_title_scene_v14.prototype.update = function (app) {
  const originalExit = this.exit;
  this.exit = function (label) {
    if (label === 'ホーム' && toho_run && toho_run.active && toho_run.storyCurrentId) {
      return originalExit.call(this, 'ストーリー');
    }
    return originalExit.apply(this, arguments);
  };
  try { return toho_story_original_title_update.call(this, app); }
  finally { this.exit = originalExit; }
};
const toho_story_original_title_init = Toho_title_scene_v14.prototype.init;
Toho_title_scene_v14.prototype.init = function (option) {
  toho_story_original_title_init.call(this, option);
  const scene = this;
  const button = this.children.find(function (child) { return child.text === 'ストーリー'; });
  if (button) button.onpointend = function () {
    toho_archive_entry = 'stories';
    SoundManager.play('select');
    scene.exit('記録・図鑑');
  };
};

// Story catalog shares the archive layout and scrolling, but never mutates progress.
const toho_story_original_archive_render = Toho_archive_scene_v14.prototype.render;
Toho_archive_scene_v14.prototype.render = function () {
  if (this.view !== 'stories') return toho_story_original_archive_render.call(this);
  this.clearContent();
  this.lastCatalogSize = toho_discovery_rates().grandTotal;
  const scene = this;
  const unlocked = new Set((toho_meta.stories && toho_meta.stories.unlockedIds) || []);
  const entries = TOHO_STORY_DEFINITIONS.slice().sort(function (a, b) {
    return Number(unlocked.has(b.id)) - Number(unlocked.has(a.id));
  });
  this.frame(CENTER_W, 140, SCREEN_W, 280);
  this.label('ストーリー', CENTER_W, 135, 78);
  this.label('解放：' + entries.filter(function (entry) { return unlocked.has(entry.id); }).length +
    ' / ' + entries.length, CENTER_W, 245, 43);
  this.frame(CENTER_W, (1690 + SCREEN_H) / 2, SCREEN_W, SCREEN_H - 1690);
  this.button('戻る', 830, 1800, 350, 115, function () { scene.goBack(); });
  const versionLabel = this.label('バージョン：' + version, 25, SCREEN_H - 25, 32, true);
  versionLabel.baseline = 'bottom';
  const top = 310, bottom = 1650, padding = 20, height = 160, pitch = 180;
  const contentHeight = padding * 2 + height + Math.max(0, entries.length - 1) * pitch;
  const max = Math.max(0, contentHeight - (bottom - top));
  this.scrollArea = { kind: 'stories', top: top, bottom: bottom,
    offset: Math.min(this.storyOffset || 0, max), max: max, contentHeight: contentHeight };
  this.keepScrollOffset();
  if (max) this.scrollBar = RectangleShape({ width: 12, height: 85,
    fill: White, strokeWidth: 0, cornerRadius: 0 }).addChildTo(this.body);
  const layer = this.clippedLayer(60, 1020);
  entries.forEach(function (entry, index) {
    const found = unlocked.has(entry.id);
    const node = RectangleShape({ width: 925, height: height, cornerRadius: 0,
      fill: found ? darkGray : '#353535', stroke: lightGray, strokeWidth: 5 })
      .addChildTo(layer);
    const color = found ? White : lightGray;
    Label({ text: entry.title, fontSize: 55, fill: color })
      .addChildTo(node).setPosition(0, found ? -35 : 0);
    if (found) Label({ text: entry.condition, fontSize: 35, fill: color })
      .addChildTo(node).setPosition(0, 39);
    if (found) {
      node.setInteractive(true);
      node.onpointend = function () {
        if (scene.dragMoved || scene.view !== 'stories') return;
        toho_story_replay_id = entry.id;
        SoundManager.play('select');
        scene.exit('ストーリー');
      };
    }
    scene.addScrollRow(node, CENTER_W, padding + index * pitch, height, found);
  });
  this.positionScrollRows();
};
const toho_story_original_keep_scroll = Toho_archive_scene_v14.prototype.keepScrollOffset;
Toho_archive_scene_v14.prototype.keepScrollOffset = function () {
  if (this.scrollArea && this.scrollArea.kind === 'stories') {
    this.storyOffset = this.scrollArea.offset;
    return;
  }
  return toho_story_original_keep_scroll.call(this);
};

// History deletion also clears its best-distance/day records in the SAME save.
// Other deletion dialogs (encyclopedia, achievements) retain their existing scope.
const toho_story_original_delete_dialog = Toho_archive_scene_v14.prototype.showDeleteDialog;
Toho_archive_scene_v14.prototype.showDeleteDialog = function (kind) {
  const result = toho_story_original_delete_dialog.call(this, kind);
  if (kind !== 'history' || !this._deleteDialog) return result;
  const scene = this;
  const yes = this._deleteDialog.elements.find(function (node) { return node.text === 'はい'; });
  if (!yes || yes._storyHistoryWrapped) return result;
  const confirm = yes.onpointend;
  yes.onpointend = function () {
    if (!scene._deleteDialog || scene._pendingDeleteRender) return;
    const previous = toho_meta.records;
    const previousDirty = toho_meta_dirty;
    toho_meta.records = { bestDistanceMeters: 0, bestDays: 0 };
    toho_meta_dirty = true;
    confirm.call(this);
    if (!scene._pendingDeleteRender) {
      toho_meta.records = previous;
      toho_meta_dirty = previousDirty;
    }
  };
  yes._storyHistoryWrapped = true;
  return result;
};
