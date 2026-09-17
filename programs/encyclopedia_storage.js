/* v1.4.6: 図鑑解放情報を専用localStorageでも保持し、通常保存での意図しない消失を防ぐ。 */
const TOHO_ENCYCLOPEDIA_KEY = 'the_toho:encyclopedia:v1';
const TOHO_ENCYCLOPEDIA_SCHEMA = 1;

function toho_unique_ids(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).filter(function (id) {
    return typeof id === 'string' && id.length > 0;
  })));
}
function toho_encyclopedia_snapshot(source) {
  source = source || {};
  return {
    itemIds: toho_unique_ids(source.itemIds),
    enemyIds: toho_unique_ids(source.enemyIds),
  };
}
function toho_merge_encyclopedia(left, right) {
  return {
    itemIds: toho_unique_ids((left.itemIds || []).concat(right.itemIds || [])),
    enemyIds: toho_unique_ids((left.enemyIds || []).concat(right.enemyIds || [])),
  };
}
function toho_same_ids(left, right) {
  return left.length === right.length && left.every(function (id, index) {
    return id === right[index];
  });
}
function toho_same_encyclopedia(left, right) {
  return toho_same_ids(left.itemIds, right.itemIds) && toho_same_ids(left.enemyIds, right.enemyIds);
}
function toho_apply_encyclopedia(snapshot) {
  toho_meta.encyclopedia.itemIds = snapshot.itemIds.slice();
  toho_meta.encyclopedia.enemyIds = snapshot.enemyIds.slice();
}
function toho_encyclopedia_record(snapshot) {
  return {
    schemaVersion: TOHO_ENCYCLOPEDIA_SCHEMA,
    itemIds: snapshot.itemIds.slice(),
    enemyIds: snapshot.enemyIds.slice(),
  };
}
function toho_read_encyclopedia_storage() {
  const value = toho_read_json(TOHO_ENCYCLOPEDIA_KEY);
  if (value === null) return null;
  if (!value || typeof value !== 'object' || value.schemaVersion !== TOHO_ENCYCLOPEDIA_SCHEMA ||
    !Array.isArray(value.itemIds) || !Array.isArray(value.enemyIds)) {
    toho_storage_blocked_keys.add(TOHO_ENCYCLOPEDIA_KEY);
    console.error('未知の図鑑セーブ形式です。既存の図鑑専用データは上書きしません。');
    return null;
  }
  return toho_encyclopedia_snapshot(value);
}

const toho_base_save_meta_for_encyclopedia = toho_save_meta;
const toho_meta_encyclopedia_at_load = toho_encyclopedia_snapshot(toho_meta.encyclopedia);
const toho_stored_encyclopedia = toho_read_encyclopedia_storage();
let toho_committed_encyclopedia = toho_stored_encyclopedia
  ? toho_merge_encyclopedia(toho_stored_encyclopedia, toho_meta_encyclopedia_at_load)
  : toho_meta_encyclopedia_at_load;
let toho_encyclopedia_exact_write = false;

// 1.4.5以前の共通meta内の図鑑情報を、後段モジュールが動く前に専用キーへ退避する。
if (!toho_storage_is_blocked(TOHO_ENCYCLOPEDIA_KEY)) {
  toho_write_json(TOHO_ENCYCLOPEDIA_KEY, toho_encyclopedia_record(toho_committed_encyclopedia));
}
if (!toho_same_encyclopedia(toho_meta_encyclopedia_at_load, toho_committed_encyclopedia)) {
  toho_apply_encyclopedia(toho_committed_encyclopedia);
  toho_meta_dirty = true;
  toho_base_save_meta_for_encyclopedia();
}

// 通常のmeta保存では、既に永続化された図鑑IDを減らさない。
// 明示削除・ID正規化だけ toho_encyclopedia_exact_write を有効にして完全置換する。
toho_save_meta = function () {
  const current = toho_encyclopedia_snapshot(toho_meta.encyclopedia);
  const target = toho_encyclopedia_exact_write
    ? current
    : toho_merge_encyclopedia(toho_committed_encyclopedia, current);

  if (!toho_same_encyclopedia(current, target)) {
    toho_apply_encyclopedia(target);
    toho_meta_dirty = true;
  }

  // 共通metaを先に確定する。ここで失敗した場合は専用キーを先行更新しない。
  const metaSaved = toho_base_save_meta_for_encyclopedia();
  if (!metaSaved) return false;

  // 専用キーが壊れて保護状態の場合は共通metaを正本として継続する。
  if (toho_storage_is_blocked(TOHO_ENCYCLOPEDIA_KEY)) return true;

  const encyclopediaSaved = toho_write_json(
    TOHO_ENCYCLOPEDIA_KEY,
    toho_encyclopedia_record(target)
  );
  if (encyclopediaSaved) {
    toho_committed_encyclopedia = toho_encyclopedia_snapshot(target);
  }
  return encyclopediaSaved;
};

function toho_replace_encyclopedia_ids(itemIds, enemyIds) {
  const previousMeta = toho_encyclopedia_snapshot(toho_meta.encyclopedia);
  const previousCommitted = toho_encyclopedia_snapshot(toho_committed_encyclopedia);
  const previousDirty = toho_meta_dirty;
  const replacement = {
    itemIds: toho_unique_ids(itemIds),
    enemyIds: toho_unique_ids(enemyIds),
  };

  toho_apply_encyclopedia(replacement);
  toho_meta_dirty = true;
  toho_encyclopedia_exact_write = true;
  const saved = toho_save_meta();
  toho_encyclopedia_exact_write = false;
  if (saved) return true;

  toho_committed_encyclopedia = previousCommitted;
  toho_apply_encyclopedia(previousMeta);
  toho_meta_dirty = previousDirty;
  return false;
}
function toho_clear_encyclopedia() {
  return toho_replace_encyclopedia_ids([], []);
}

// archive_controls.js の既存UIは維持し、削除確定時だけ完全置換を許可する。
// このファイルは archive_controls.js より後、achievements.js より前に読み込む。
const toho_base_show_encyclopedia_delete_dialog = Toho_archive_scene_v14.prototype.showDeleteDialog;
Toho_archive_scene_v14.prototype.showDeleteDialog = function (kind) {
  const result = toho_base_show_encyclopedia_delete_dialog.call(this, kind);
  if (kind !== 'encyclopedia' || !this._deleteDialog) return result;

  const yes = this._deleteDialog.elements.find(function (element) {
    return element && element.text === 'はい';
  });
  if (!yes || yes.__tohoEncyclopediaStorageWrapped) return result;

  const originalConfirm = yes.onpointend;
  yes.onpointend = function () {
    toho_encyclopedia_exact_write = true;
    try {
      return originalConfirm.apply(this, arguments);
    } finally {
      toho_encyclopedia_exact_write = false;
      if (!toho_meta.encyclopedia.itemIds.length && !toho_meta.encyclopedia.enemyIds.length) {
        toho_committed_encyclopedia = toho_encyclopedia_snapshot(toho_meta.encyclopedia);
      }
    }
  };
  yes.__tohoEncyclopediaStorageWrapped = true;
  return result;
};
