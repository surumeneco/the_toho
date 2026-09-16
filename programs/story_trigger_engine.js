/* Story rules are data, not scene-specific if statements.
 * To add a story: append an entry to story_definitions.js and a body to story.json.
 * A new condition kind is registered here; new gameplay events use
 * toho_story_emit(eventType, eventData, intendedNextScene).
 */
const TOHO_STORY_CONDITIONS = Object.create(null);
function toho_register_story_condition(kind, predicate) {
  if (typeof kind !== 'string' || !kind || typeof predicate !== 'function') {
    throw new TypeError('Story condition needs a name and predicate.');
  }
  TOHO_STORY_CONDITIONS[kind] = predicate;
}
function toho_story_test_condition(condition, event, unlockedBefore) {
  if (!condition || typeof condition !== 'object') return false;
  if (Array.isArray(condition.all)) return condition.all.every(function (part) {
    return toho_story_test_condition(part, event, unlockedBefore);
  });
  if (Array.isArray(condition.any)) return condition.any.some(function (part) {
    return toho_story_test_condition(part, event, unlockedBefore);
  });
  if (condition.not) return !toho_story_test_condition(condition.not, event, unlockedBefore);
  const predicate = TOHO_STORY_CONDITIONS[condition.kind];
  return !!(predicate && predicate(condition, event, unlockedBefore));
}
toho_register_story_condition('enemy', function (rule, event) {
  return Array.isArray(rule.ids) && rule.ids.includes(event.enemyId);
});
toho_register_story_condition('storiesPreviouslyUnlocked', function (rule, event, prior) {
  return Array.isArray(rule.ids) && rule.ids.every(function (id) { return prior.has(id); });
});
toho_register_story_condition('achievementUnlocked', function (rule) {
  const ids = (toho_meta.achievements && toho_meta.achievements.unlockedIds) || [];
  return ids.includes(rule.id);
});
toho_register_story_condition('catalogComplete', function (rule) {
  return toho_catalog_complete(rule.category);
});
toho_register_story_condition('playerStatAtLeast', function (rule) {
  const keys = { distance: '移動距離', days: '日数', energy: '気力', hp: '体力' };
  const key = keys[rule.stat];
  return !!key && Number.isFinite(rule.value) && Number(player[key]) >= rule.value;
});
toho_register_story_condition('eventValueAtLeast', function (rule, event) {
  return typeof rule.field === 'string' && Number.isFinite(rule.value) &&
    Number.isFinite(event[rule.field]) && event[rule.field] >= rule.value;
});
toho_register_story_condition('runCounterAtLeast', function (rule) {
  const counters = toho_achievement_run();
  if (!counters || !['advances', 'encounters', 'escapes'].includes(rule.counter)) return false;
  return Number.isFinite(rule.value) && counters[rule.counter] >= rule.value;
});
toho_register_story_condition('itemObtained', function (rule, event) {
  const counters = toho_achievement_run();
  return !!counters && event.name === rule.name &&
    Number.isFinite(rule.value) && (counters.items[rule.name] || 0) >= rule.value;
});
toho_register_story_condition('always', function () { return true; });

// Substitute only the predicate evaluator. The existing story emitter still owns
// persistence, per-run insertion guards, queue order and rollback.
toho_story_matches = function (definition, type, event, unlockedBefore) {
  const trigger = definition && definition.trigger;
  return !!trigger && trigger.type === type &&
    toho_story_test_condition(trigger, event || {}, unlockedBefore);
};

// All existing achievement events are usable as story trigger events. A victory
// is evaluated in the battle scene BEFORE leaving it, not when Win_scene is created.
const toho_story_base_achievement_emit = toho_achievement_emit;
toho_achievement_emit = function (type, event) {
  const saved = toho_story_base_achievement_emit.apply(this, arguments);
  if (saved && type !== 'won' && TOHO_STORY_DEFINITIONS.some(function (story) {
    return story.trigger.type === type;
  })) toho_story_emit(type, event || {}, null);
  return saved;
};

// For future non-girl victory rules, run the same event pipeline before exiting
// battle; the original girl hook continues to handle those three unique enemies.
const toho_story_base_battle_update = Toho_battle_scene.prototype.update;
Toho_battle_scene.prototype.update = function (app) {
  if (this.戦闘フェイズ === '敵の攻撃' && this.敵 && this.敵.体力 <= 0 &&
      !toho_girl_id(this.敵) && !this._storyVictoryChecked) {
    this._storyVictoryChecked = true;
    const enemyId = toho_run && toho_run.enemyId;
    const show = toho_story_emit('victory', { enemyId: enemyId, enemy: this.敵 }, '勝利');
    if (show) {
      now_enemy = this.敵;
      toho_note_battle_outcome('victory');
      set_cookies();
      SoundManager.play('story');
      this.exit('ストーリー');
      return;
    }
  }
  return toho_story_base_battle_update.call(this, app);
};

// Queue gameplay events before changing scene. The exit target is the actual
// destination of the original action, not an assumed victory scene.
const toho_story_base_exit = DisplayScene.prototype.exit;
DisplayScene.prototype.exit = function (destination) {
  const run = toho_run;
  if (run && run.active && run.storyCurrentId && run.storyQueue && run.storyQueue.length &&
      destination !== 'ストーリー' && destination !== 'タイトル' &&
      destination !== '記録・図鑑' && !this.storyId && !this.view &&
      typeof this.volume_changing === 'undefined') {
    const previous = run.storyReturnScene;
    run.storyReturnScene = destination;
    if (!toho_save_run()) {
      run.storyReturnScene = previous;
      console.error('ストーリー復帰先を保存できません。画面遷移を停止しました。');
      return;
    }
    return toho_story_base_exit.call(this, 'ストーリー');
  }
  return toho_story_base_exit.apply(this, arguments);
};

// The search scene's achievement wrapper emits "advanced" AFTER its original
// exit. Defer that exit just long enough to evaluate the story trigger first.
const toho_story_base_search_update = Toho_search_scene.prototype.update;
Toho_search_scene.prototype.update = function (app) {
  const originalExit = this.exit;
  let pending = null;
  this.exit = function (destination) { pending = destination; };
  try { toho_story_base_search_update.call(this, app); }
  finally { this.exit = originalExit; }
  if (pending !== null) return originalExit.call(this, pending);
};
