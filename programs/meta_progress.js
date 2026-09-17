/* v1.4.x: 最高記録・図鑑・実績・ストーリー・履歴などの永続記録をlocalStorageで管理する。 */
const TOHO_META_KEY = 'the_toho:meta:v1';
const TOHO_RUN_KEY = 'the_toho:run:v1';
const TOHO_SETTINGS_KEY = 'the_toho:settings:v1';

// 1つの保存領域が壊れていても、無関係な領域まで保存不能にしない。
// 壊れたキー自身だけは上書きせず、既存データを保護する。
const toho_storage_blocked_keys = new Set();
function toho_storage_is_blocked(key) {
  return toho_storage_blocked_keys.has(key);
}
function toho_read_json(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('保存データを読み取れません。該当データは上書きしません:', key, error);
    toho_storage_blocked_keys.add(key);
    return null;
  }
}
function toho_write_json(key, value) {
  if (toho_storage_is_blocked(key)) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('保存に失敗しました。該当データは削除せずに保持してください:', key, error);
    return false;
  }
}

const toho_meta_defaults = {
  schemaVersion: 1,
  records: { bestDistanceMeters: 0, bestDays: 0 },
  achievements: { unlockedIds: [] },
  stories: { unlockedIds: [], readIds: [] },
  encyclopedia: { itemIds: [], enemyIds: [] },
  lifetimeCounters: {},
  history: [],
};
function toho_load_meta() {
  const value = toho_read_json(TOHO_META_KEY);
  if (value === null) return JSON.parse(JSON.stringify(toho_meta_defaults));
  if (!value || typeof value !== 'object' || value.schemaVersion !== 1) {
    toho_storage_blocked_keys.add(TOHO_META_KEY);
    console.error('未知の永続セーブ形式です。既存データを上書きしません。');
    return JSON.parse(JSON.stringify(toho_meta_defaults));
  }
  value.records = Object.assign({}, toho_meta_defaults.records, value.records);
  value.achievements = Object.assign({}, toho_meta_defaults.achievements, value.achievements);
  value.stories = Object.assign({}, toho_meta_defaults.stories, value.stories);
  value.encyclopedia = Object.assign({}, toho_meta_defaults.encyclopedia, value.encyclopedia);
  value.lifetimeCounters = value.lifetimeCounters && typeof value.lifetimeCounters === 'object'
    ? value.lifetimeCounters : {};
  if (!Array.isArray(value.achievements.unlockedIds)) value.achievements.unlockedIds = [];
  if (!Array.isArray(value.stories.unlockedIds)) value.stories.unlockedIds = [];
  if (!Array.isArray(value.stories.readIds)) value.stories.readIds = [];
  if (!Array.isArray(value.encyclopedia.itemIds)) value.encyclopedia.itemIds = [];
  if (!Array.isArray(value.encyclopedia.enemyIds)) value.encyclopedia.enemyIds = [];
  if (!Array.isArray(value.history)) value.history = [];
  return value;
}
const toho_meta = toho_load_meta();
let toho_meta_dirty = false;
function toho_save_meta() {
  if (!toho_meta_dirty) return !toho_storage_is_blocked(TOHO_META_KEY);
  if (!toho_write_json(TOHO_META_KEY, toho_meta)) return false;
  toho_meta_dirty = false;
  return true;
}

// IDは名称から生成しない。既存データを並べ替えず、末尾への追加を原則とする。
const TOHO_ITEM_TYPES = [
  { id: 'food', name: '食料', data: () => foods_data, inventory: '食料' },
  { id: 'weapon', name: '武器', data: () => weapons_data, inventory: '武器' },
  { id: 'tool', name: '道具', data: () => tools_data, inventory: '道具' },
  { id: 'material', name: '素材', data: () => materials_data, inventory: '素材' },
];
function toho_id(type, index) { return type + ':' + String(index + 1).padStart(4, '0'); }
function toho_item_catalog() {
  const list = [];
  TOHO_ITEM_TYPES.forEach(function (type) {
    type.data().forEach(function (data, index) {
      list.push({ id: toho_id(type.id, index), category: type.name, type: type.id, name: data.名前, data: data });
    });
  });
  return list;
}
function toho_enemy_catalog() {
  return enemies_data.map(function (data, index) {
    return { id: toho_id('enemy', index), category: '敵', name: data.名前, data: data };
  });
}
function toho_find_item(name, typeHint) {
  const matches = toho_item_catalog().filter(function (entry) {
    return entry.name === name && (!typeHint || entry.type === typeHint);
  });
  return matches.length ? matches[0] : null;
}
function toho_find_enemy(enemy) {
  return toho_enemy_catalog().find(function (entry) {
    const data = entry.data;
    return data.名前 === enemy.名前 && data.出現距離 === enemy.出現距離 &&
      data.体力 === enemy.体力;
  }) || null;
}
function toho_unlock_item(name, typeHint) {
  const entry = toho_find_item(name, typeHint);
  if (!entry) return false;
  if (toho_meta.encyclopedia.itemIds.includes(entry.id)) return true;

  // 保存成功を確認してから解放を確定する。失敗時にメモリ上だけ解放済みになるのを防ぐ。
  const previousDirty = toho_meta_dirty;
  toho_meta.encyclopedia.itemIds.push(entry.id);
  toho_meta_dirty = true;
  if (toho_save_meta()) return true;

  toho_meta.encyclopedia.itemIds.pop();
  toho_meta_dirty = previousDirty;
  console.error('アイテム図鑑の解放情報を保存できませんでした:', entry.id, entry.name);
  return false;
}
function toho_unlock_enemy(enemy) {
  const entry = toho_find_enemy(enemy);
  if (!entry) return false;
  if (toho_meta.encyclopedia.enemyIds.includes(entry.id)) return true;

  const previousDirty = toho_meta_dirty;
  toho_meta.encyclopedia.enemyIds.push(entry.id);
  toho_meta_dirty = true;
  if (toho_save_meta()) return true;

  toho_meta.encyclopedia.enemyIds.pop();
  toho_meta_dirty = previousDirty;
  console.error('敵図鑑の解放情報を保存できませんでした:', entry.id, entry.name);
  return false;
}
function toho_scan_inventory() {
  TOHO_ITEM_TYPES.forEach(function (type) {
    const entries = Array.isArray(player[type.inventory]) ? player[type.inventory] : [];
    entries.forEach(function (item) {
      if (item && item[0] && item[1] > 0) toho_unlock_item(item[0].名前, type.id);
    });
  });
}
function toho_track_player() {
  if (!player || player.__toho_tracking) return;
  const target = player;
  const original = target.get_item;
  target.get_item = function (name, amount) {
    const before = this.has_item(name);
    const result = original.apply(this, arguments);
    if (amount > 0 && this.has_item(name) > before) toho_unlock_item(name);
    return result;
  };
  Object.defineProperty(target, '__toho_tracking', { value: true, configurable: false });
}

let toho_run = toho_read_json(TOHO_RUN_KEY);
if (!toho_run || typeof toho_run !== 'object' || typeof toho_run.id !== 'string' || !toho_run.active) {
  toho_run = null;
}
function toho_save_run() { return toho_write_json(TOHO_RUN_KEY, toho_run); }
function toho_start_run() {
  toho_run = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() :
      String(Date.now()) + '-' + String(Math.random()).slice(2),
    active: true, battles: 0, context: null, enemyId: null, enemyName: null,
  };
  return toho_save_run();
}
function toho_ensure_run() { if (!toho_run || !toho_run.active) toho_start_run(); return toho_run; }
function toho_note_context(context) {
  const run = toho_ensure_run();
  run.context = context;
  toho_save_run();
}
function toho_note_encounter(enemy) {
  const run = toho_ensure_run();
  const entry = toho_find_enemy(enemy);
  run.battles += 1;
  run.context = 'battle';
  run.enemyId = entry ? entry.id : null;
  run.enemyName = enemy.名前;
  toho_save_run();
  toho_unlock_enemy(enemy);
}
function toho_checkpoint() {
  toho_track_player();
  toho_scan_inventory();
  const distance = Number(player.移動距離);
  const days = Number(player.日数);
  if (Number.isFinite(distance) && distance > toho_meta.records.bestDistanceMeters) {
    toho_meta.records.bestDistanceMeters = distance;
    toho_meta_dirty = true;
  }
  if (Number.isFinite(days) && days > toho_meta.records.bestDays) {
    toho_meta.records.bestDays = days;
    toho_meta_dirty = true;
  }
  toho_ensure_run();
  return toho_save_meta();
}
function toho_inventory_snapshot() {
  const items = [];
  TOHO_ITEM_TYPES.forEach(function (type) {
    (Array.isArray(player[type.inventory]) ? player[type.inventory] : []).forEach(function (pair) {
      if (!pair || !pair[0] || !(pair[1] > 0)) return;
      const entry = toho_find_item(pair[0].名前, type.id);
      items.push({ category: type.id, id: entry ? entry.id : null,
        name: pair[0].名前, quantity: pair[1] });
    });
  });
  return items;
}
function toho_death_cause(run) {
  if (run.context === 'battle') {
    return { type: player.体力 <= 0 ? 'enemy_hp' : 'enemy_sp',
      enemyId: run.enemyId, enemyName: run.enemyName };
  }
  return { type: run.context === 'sleep' ? 'sleep_sp' : 'exploration_sp' };
}
function toho_cause_text(cause) {
  if (!cause) return '不明';
  if (cause.type === 'enemy_hp') return (cause.enemyName || '敵') + 'による体力切れ';
  if (cause.type === 'enemy_sp') return (cause.enemyName || '敵') + 'による気力切れ';
  if (cause.type === 'sleep_sp') return '睡眠時の気力切れ';
  if (cause.type === 'exploration_sp') return '探索時の気力切れ';
  return '不明';
}
function toho_finish_run() {
  const run = toho_ensure_run();
  toho_track_player();
  toho_scan_inventory();
  const distance = Number(player.移動距離);
  const days = Number(player.日数);
  if (Number.isFinite(distance) && distance > toho_meta.records.bestDistanceMeters) {
    toho_meta.records.bestDistanceMeters = distance; toho_meta_dirty = true;
  }
  if (Number.isFinite(days) && days > toho_meta.records.bestDays) {
    toho_meta.records.bestDays = days; toho_meta_dirty = true;
  }
  if (!toho_meta.history.some(function (entry) { return entry.runId === run.id; })) {
    toho_meta.history.unshift({
      runId: run.id, endedAt: new Date().toISOString(),
      distanceMeters: Number.isFinite(distance) ? distance : 0,
      days: Number.isFinite(days) ? days : 0,
      deathCause: toho_death_cause(run), battleCount: run.battles,
      items: toho_inventory_snapshot(),
    });
    toho_meta.history = toho_meta.history.slice(0, 10);
    toho_meta_dirty = true;
  }
  return toho_save_meta();
}
function toho_discovery_rates() {
  const items = toho_item_catalog();
  const enemies = toho_enemy_catalog();
  const itemIds = new Set(toho_meta.encyclopedia.itemIds);
  const enemyIds = new Set(toho_meta.encyclopedia.enemyIds);
  const knownItems = items.filter(function (entry) { return itemIds.has(entry.id); }).length;
  const knownEnemies = enemies.filter(function (entry) { return enemyIds.has(entry.id); }).length;
  return { items: knownItems, itemTotal: items.length, enemies: knownEnemies,
    enemyTotal: enemies.length, total: knownItems + knownEnemies,
    grandTotal: items.length + enemies.length };
}

function toho_apply_settings(settings) {
  if (!settings || typeof settings !== 'object') return false;
  const bgm = Number(settings.bgmVolume);
  const se = Number(settings.seVolume);
  if (!Number.isFinite(bgm) || !Number.isFinite(se) || bgm < 0 || bgm > 100 || se < 0 || se > 100) return false;
  music_volume = bgm;
  SE_volume = se;
  saved_music_volume = bgm;
  saved_SE_volume = se;
  SoundManager.setVolumeMusic(bgm / 100);
  SoundManager.setVolume(se / 100);
  return true;
}
get_settings_cookies = function () {
  if (toho_apply_settings(toho_read_json(TOHO_SETTINGS_KEY))) return true;
  saved_music_volume = music_volume;
  saved_SE_volume = SE_volume;
  SoundManager.setVolumeMusic(music_volume / 100);
  SoundManager.setVolume(SE_volume / 100);
  return toho_write_json(TOHO_SETTINGS_KEY, {
    bgmVolume: music_volume, seVolume: SE_volume, assetVersion: version,
  });
};
set_settings_cookies = function () {
  const saved = toho_write_json(TOHO_SETTINGS_KEY, {
    bgmVolume: music_volume, seVolume: SE_volume, assetVersion: version,
  });
  if (saved) {
    saved_music_volume = music_volume;
    saved_SE_volume = SE_volume;
  }
  return saved;
};
get_settings_cookies();

// 呼出し名は旧来のままだが、保存実体はすべてlocalStorage。
const toho_original_set_cookies = set_cookies;
set_cookies = function () {
  toho_track_player();
  const saved = toho_original_set_cookies();
  const metaSaved = toho_checkpoint();
  return saved !== false && metaSaved;
};
const toho_original_get_cookies = get_cookies;
get_cookies = function () {
  const restored = toho_original_get_cookies();
  toho_track_player();
  if (restored) toho_checkpoint();
  return restored;
};
const toho_original_delete_cookies = delete_cookies;
delete_cookies = function () {
  const deleted = toho_original_delete_cookies();
  if (deleted === false) return false;
  toho_run = null;
  return toho_save_run();
};
toho_track_player();