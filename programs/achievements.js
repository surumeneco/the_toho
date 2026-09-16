/* v1.4.0: achievement event engine and Phina presentation; definitions live in achievement_definitions.js. */

// Canonical catalogs: same-name materials count once, while the three identically
// named girls have distinct immutable keys without changing their display names.
const toho_legacy_item_catalog = toho_item_catalog;
const toho_legacy_enemy_catalog = toho_enemy_catalog;
function toho_girl_id(data) {
  if (!data || data.名前 !== '女の子……？') return null;
  const stage = { 150000: 1, 152500: 2, 155000: 3 }[data.出現距離];
  return stage ? 'enemy:girl-stage-' + stage : null;
}
function toho_migrate_encyclopedia(field, canonical) {
  const existing = toho_meta.encyclopedia[field];
  const migrated = Array.from(new Set(existing.map(function (id) {
    return Object.prototype.hasOwnProperty.call(canonical, id) ? canonical[id] : id;
  })));
  if (migrated.length === existing.length && migrated.every(function (id, index) { return id === existing[index]; })) return;
  toho_meta.encyclopedia[field] = migrated;
  toho_meta_dirty = true;
  toho_save_meta();
}
toho_item_catalog = function () {
  const entries = toho_legacy_item_catalog();
  const seen = new Map();
  const ids = Object.create(null);
  entries.forEach(function (entry) {
    const key = entry.type + ':' + entry.name;
    if (!seen.has(key)) seen.set(key, Object.assign({}, entry));
    const original = seen.get(key);
    ids[entry.id] = original.id;
    if (entry.type === 'material') {
      const tools = original.tools || (original.tools = []);
      const tool = entry.data.必要道具;
      if (tool && tools.indexOf(tool) === -1) tools.push(tool);
    }
  });
  toho_migrate_encyclopedia('itemIds', ids);
  return Array.from(seen.values()).map(function (entry) {
    if (entry.tools) entry.data = Object.assign({}, entry.data,
      { 必要道具: entry.tools.join(' / ') });
    return entry;
  });
};
toho_enemy_catalog = function () {
  const entries = toho_legacy_enemy_catalog();
  const ids = Object.create(null);
  entries.forEach(function (entry) {
    const fixed = toho_girl_id(entry.data);
    if (fixed) { ids[entry.id] = fixed; entry.id = fixed; }
  });
  toho_migrate_encyclopedia('enemyIds', ids);
  return entries;
};

// Each achievement is a declarative rule. New thresholds/items/enemies need only
// a row in achievement_definitions.js; a genuinely new event type adds one predicate.
const toho_achievement_notices = [];
function toho_achievement_run() {
  if (!toho_run || !toho_run.active) return null;
  if (!toho_run.achievementCounters) {
    toho_run.achievementCounters = { advances: 0, encounters: 0, escapes: 0,
      items: {}, kills: {} };
  }
  return toho_run.achievementCounters;
}
function toho_achievement_lifetime() {
  const lifetime = toho_meta.lifetimeCounters || (toho_meta.lifetimeCounters = {});
  if (!lifetime.kills) lifetime.kills = {};
  if (!Number.isFinite(lifetime.distanceMeters)) lifetime.distanceMeters = 0;
  if (!Number.isFinite(lifetime.days)) lifetime.days = 0;
  return lifetime;
}
const TOHO_ACHIEVEMENT_RULES = {
  distance: ['progress', function (rule) { return player.移動距離 >= rule.limit; }],
  totalDistance: ['progress', function (rule) { return toho_achievement_lifetime().distanceMeters >= rule.limit; }],
  days: ['progress', function (rule) { return player.日数 >= rule.limit; }],
  totalDays: ['progress', function (rule) { return toho_achievement_lifetime().days >= rule.limit; }],
  energy: ['progress', function (rule) { return player.気力 >= rule.limit; }],
  deathDay: ['died', function (rule, event) { return event.days === rule.limit; }],
  abandonDay: ['abandoned', function (rule, event) { return event.days === rule.limit; }],
  advanceStreak: ['advanced', function (rule, event, run) { return run.advances >= rule.limit; }],
  encounterStreak: ['advanced', function (rule, event, run) { return run.encounters >= rule.limit; }],
  escapeStreak: ['escaped', function (rule, event, run) { return run.escapes >= rule.limit; }],
  damage: ['damaged', function (rule, event) { return event.damage >= rule.limit; }],
  item: ['obtained', function (rule, event, run) {
    return event.name === rule.target && (run.items[rule.target] || 0) >= rule.limit;
  }],
  kill: ['won', function (rule, event, run) {
    return event.key === rule.target && (run.kills[rule.target] || 0) >= rule.limit;
  }],
  totalKill: ['won', function (rule, event) {
    return event.key === rule.target && (toho_achievement_lifetime().kills[rule.target] || 0) >= rule.limit;
  }],
};
function toho_achievement_emit(type, event) {
  const run = toho_achievement_run();
  if (!run) return false;
  event = event || {};
  const lifetime = toho_achievement_lifetime();
  if (type === 'advanced') {
    run.advances++;
    run.encounters = event.encountered ? run.encounters + 1 : 0;
  } else if (type === 'escaped') {
    run.escapes++;
  } else if (type === 'won') {
    run.escapes = 0;
    run.kills[event.key] = (run.kills[event.key] || 0) + 1;
    lifetime.kills[event.key] = (lifetime.kills[event.key] || 0) + 1;
    toho_meta_dirty = true;
  } else if (type === 'obtained') {
    run.items[event.name] = (run.items[event.name] || 0) + event.amount;
  }
  const achievements = toho_meta.achievements || (toho_meta.achievements = { unlockedIds: [] });
  if (!Array.isArray(achievements.unlockedIds)) achievements.unlockedIds = [];
  const previous = achievements.unlockedIds.slice();
  const known = new Set(previous);
  const fresh = [];
  TOHO_ACHIEVEMENT_DEFINITIONS.forEach(function (definition) {
    if (known.has(definition.id)) return;
    const rule = TOHO_ACHIEVEMENT_RULES[definition.kind];
    if (rule && rule[0] === type && rule[1](definition, event, run)) {
      achievements.unlockedIds.push(definition.id);
      known.add(definition.id);
      fresh.push(definition);
    }
  });
  if (fresh.length) toho_meta_dirty = true;
  // Counter snapshot and unlocks share a single atomic meta value.
  const metaSaved = toho_save_meta();
  const runSaved = toho_save_run();
  if (!metaSaved) {
    achievements.unlockedIds = previous;
    toho_meta_dirty = true;
  } else {
    fresh.forEach(function (achievement) { toho_achievement_notices.push(achievement); });
  }
  return metaSaved && runSaved;
}
function toho_achievement_progress() {
  if (!toho_achievement_run()) return true;
  const lifetime = toho_achievement_lifetime();
  const meters = Math.max(0, Number(player.移動距離) || 0);
  const days = Math.max(1, Number(player.日数) || 1);
  // Cursor and total are written atomically: no repeated addition after reload.
  const cursor = lifetime.cursor;
  if (!cursor || cursor.runId !== toho_run.id) {
    lifetime.cursor = { runId: toho_run.id, meters: meters, days: days };
    toho_meta_dirty = true;
  } else {
    const extraMeters = Math.max(0, meters - cursor.meters);
    const extraDays = Math.max(0, days - cursor.days);
    if (extraMeters || extraDays) {
      lifetime.distanceMeters += extraMeters;
      lifetime.days += extraDays;
      cursor.meters = Math.max(cursor.meters, meters);
      cursor.days = Math.max(cursor.days, days);
      toho_meta_dirty = true;
    }
  }
  return toho_achievement_emit('progress', {});
}
const toho_before_start_run = toho_start_run;
toho_start_run = function () {
  const result = toho_before_start_run();
  toho_achievement_run();
  const lifetime = toho_achievement_lifetime();
  lifetime.cursor = { runId: toho_run.id, meters: 0, days: 1 };
  toho_meta_dirty = true;
  return toho_save_meta() && toho_save_run() && result;
};
const toho_before_checkpoint = toho_checkpoint;
toho_checkpoint = function () {
  const saved = toho_before_checkpoint();
  const achievementsSaved = toho_achievement_progress();
  return saved && achievementsSaved;
};
const toho_before_track_player = toho_track_player;
toho_track_player = function () {
  toho_before_track_player();
  if (!player || player.__toho_achievement_tracking) return;
  const tracked = player;
  const original = tracked.get_item;
  tracked.get_item = function (name, amount) {
    const before = this.has_item(name);
    const result = original.apply(this, arguments);
    const received = this.has_item(name) - before;
    if (amount > 0 && received > 0) toho_achievement_emit('obtained', { name: name, amount: received });
    return result;
  };
  Object.defineProperty(tracked, '__toho_achievement_tracking', { value: true });
};
toho_track_player();
const toho_before_encounter = toho_note_encounter;
toho_note_encounter = function (enemy) {
  toho_before_encounter(enemy);
  const fixed = toho_girl_id(enemy);
  if (fixed) { toho_run.enemyId = fixed; toho_save_run(); }
};
const toho_before_outcome = toho_note_battle_outcome;
toho_note_battle_outcome = function (kind) {
  const run = toho_run;
  const before = run && run.outcomeRecordedForBattle;
  toho_before_outcome(kind);
  if (!run || run.battles < 1 || before === run.battles ||
    run.outcomeRecordedForBattle !== run.battles) return;
  const key = run.enemyId && run.enemyId.indexOf('enemy:girl-stage-') === 0 ? run.enemyId : run.enemyName;
  if (kind === 'victory') toho_achievement_emit('won', { key: key });
  else if (kind === 'escape') toho_achievement_emit('escaped', {});
};
// Resolve exploration once, including the destination of the original random encounter.
const toho_before_search_update = Search_scene.prototype.update;
Toho_search_scene.prototype.update = function (app) {
  if (this._achievementAdvanceResolved) { bgm_check(app); return; }
  this._achievementAdvanceResolved = true;
  let destination = null;
  const oldExit = this.exit;
  this.exit = function (label) { destination = label; return oldExit.apply(this, arguments); };
  try { toho_before_search_update.call(this, app); }
  finally { this.exit = oldExit; }
  toho_achievement_emit('advanced', { encountered: destination === '戦闘' });
};
// Voluntarily returning home interrupts consecutive advances.
const toho_before_home_init = Home_scene.prototype.init;
Home_scene.prototype.init = function (option) {
  toho_before_home_init.call(this, option);
  const run = toho_achievement_run();
  if (run && run.advances) { run.advances = 0; toho_save_run(); }
};
const toho_before_battle_update = Toho_battle_scene.prototype.update;
Toho_battle_scene.prototype.update = function (app) {
  const phase = this.戦闘フェイズ;
  const hp = player.体力;
  const sp = player.気力;
  toho_before_battle_update.call(this, app);
  if (phase === '敵の攻撃' && this.戦闘フェイズ === 'プレイヤーへのダメージを表示') {
    const damage = Math.max(0, hp - player.体力, sp - player.気力);
    if (damage) toho_achievement_emit('damaged', { damage: damage });
  }
};
const toho_before_finish = toho_finish_run;
toho_finish_run = function () {
  if (!player.__toho_finished_run && !toho_achievement_emit('died', { days: player.日数 })) return false;
  return toho_before_finish();
};
const toho_before_abandon_dialog = Home_scene.prototype.showAbandonDialog;
Home_scene.prototype.showAbandonDialog = function () {
  toho_before_abandon_dialog.call(this);
  if (!this._abandonDialog) return;
  const self = this;
  const yes = this._abandonDialog.elements.find(function (node) { return node.text === 'はい'; });
  if (!yes || yes.__achievementWrapped) return;
  const confirm = yes.onpointend;
  yes.onpointend = function () {
    if (!toho_achievement_emit('abandoned', { days: player.日数 })) {
      console.error('実績・累計の保存に失敗しました。諦める処理を中止します。');
      if (!self._abandonError) {
        self._abandonError = Label({ text: '保存に失敗しました。再試行してください。',
          fontSize: 34, fill: Red }).addChildTo(self).setPosition(CENTER_W, CENTER_H + 45);
        self._abandonDialog.elements.push(self._abandonError);
      }
      return;
    }
    return confirm.call(this);
  };
  yes.__achievementWrapped = true;
};

// Reuse the existing archive scene and title's reserved achievement button.
const toho_before_title_init = Toho_title_scene_v14.prototype.init;
Toho_title_scene_v14.prototype.init = function (option) {
  toho_before_title_init.call(this, option);
  const self = this;
  const button = this.children.find(function (child) { return child.text === '実績'; });
  if (button) button.onpointend = function () {
    toho_archive_entry = 'achievements';
    SoundManager.play('select');
    self.exit('記録・図鑑');
  };
};
const toho_before_archive_render = Toho_archive_scene_v14.prototype.render;
Toho_archive_scene_v14.prototype.render = function () {
  if (this.view !== 'achievements') return toho_before_archive_render.call(this);
  this.clearContent();
  const self = this;
  const unlocked = new Set((toho_meta.achievements && toho_meta.achievements.unlockedIds) || []);
  const rows = TOHO_ACHIEVEMENT_DEFINITIONS.slice().sort(function (a, b) {
    return Number(unlocked.has(b.id)) - Number(unlocked.has(a.id));
  }); // Stable sorting preserves definition order inside each group.
  this.frame(CENTER_W, 140, SCREEN_W, 280);
  this.label('実績', CENTER_W, 135, 78);
  this.label('解放：' + unlocked.size + ' / ' + rows.length, CENTER_W, 245, 43);
  this.frame(CENTER_W, (1690 + SCREEN_H) / 2, SCREEN_W, SCREEN_H - 1690);
  this.button('戻る', 830, 1800, 350, 115, function () { self.goBack(); });
  const versionLabel = this.label('バージョン：' + version, 25, SCREEN_H - 25, 32, true);
  versionLabel.baseline = 'bottom';
  const top = 310, bottom = 1650, padding = 20, pitch = 170, height = 145;
  const contentHeight = padding * 2 + height + Math.max(0, rows.length - 1) * pitch;
  const max = Math.max(0, contentHeight - (bottom - top));
  this.scrollArea = { kind: 'achievements', top: top, bottom: bottom,
    offset: Math.min(this.achievementOffset || 0, max), max: max, contentHeight: contentHeight };
  this.keepScrollOffset();
  if (max) this.scrollBar = RectangleShape({ width: 12, height: 85,
    fill: White, strokeWidth: 0, cornerRadius: 0 }).addChildTo(this.body);
  const layer = this.clippedLayer(60, 1020);
  rows.forEach(function (entry, index) {
    const found = unlocked.has(entry.id);
    const color = found ? White : lightGray;
    const node = DisplayElement().addChildTo(layer);
    RectangleShape({ width: 925, height: height, cornerRadius: 0,
      fill: darkGray, stroke: lightGray, strokeWidth: 5 }).addChildTo(node);
    Label({ text: found || !entry.secret ? entry.name : '？？？', fontSize: 48,
      fill: color }).addChildTo(node).setPosition(0, -35);
    Label({ text: found || !entry.secret ? entry.condition : '隠された実績',
      fontSize: 37, fill: color }).addChildTo(node).setPosition(0, 36);
    self.addScrollRow(node, CENTER_W, padding + index * pitch, height, false);
  });
  this.positionScrollRows();
};
const toho_before_keep_scroll = Toho_archive_scene_v14.prototype.keepScrollOffset;
Toho_archive_scene_v14.prototype.keepScrollOffset = function () {
  if (this.scrollArea && this.scrollArea.kind === 'achievements') {
    this.achievementOffset = this.scrollArea.offset;
    return;
  }
  return toho_before_keep_scroll.call(this);
};

// Called by main.js once: transient native Phina notification, no DOM.
function install_achievement_notifications(app) {
  let toast = null;
  let ticks = 0;
  app.on('enterframe', function () {
    const scene = app.currentScene;
    if (!scene || scene === app.rootScene) return;
    if (toast && toast.parent !== scene) { toast = null; ticks = 0; }
    if (toast) {
      ticks++;
      if (ticks >= 180) { toast.remove(); toast = null; }
      return;
    }
    if (!toho_achievement_notices.length) return;
    const item = toho_achievement_notices.shift();
    toast = DisplayElement().addChildTo(scene).setPosition(CENTER_W, 345);
    RectangleShape({ width: 970, height: 125, cornerRadius: 0,
      fill: darkGray, stroke: White, strokeWidth: 8 }).addChildTo(toast);
    Label({ text: '実績解除：' + item.name, fontSize: 43, fill: White }).addChildTo(toast);
    ticks = 0;
  });
}
