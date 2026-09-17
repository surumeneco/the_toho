/* v1.4.7: 図鑑の保存を複数タブ間で調停し、リロード直前と閲覧時にも照合する。 */
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
    // 図鑑を明示的に削除した後、古いタブが削除前のIDを復活させないための世代。
    resetGeneration: Number.isSafeInteger(source.resetGeneration) && source.resetGeneration >= 0
      ? source.resetGeneration : 0,
  };
}
function toho_merge_encyclopedia(left, right) {
  if (!left) return right ? toho_encyclopedia_snapshot(right) : null;
  if (!right) return toho_encyclopedia_snapshot(left);
  const a = toho_encyclopedia_snapshot(left);
  const b = toho_encyclopedia_snapshot(right);
  if (a.resetGeneration !== b.resetGeneration) {
    return a.resetGeneration > b.resetGeneration ? a : b;
  }
  return {
    itemIds: toho_unique_ids(a.itemIds.concat(b.itemIds)),
    enemyIds: toho_unique_ids(a.enemyIds.concat(b.enemyIds)),
    resetGeneration: a.resetGeneration,
  };
}
function toho_same_ids(left, right) {
  return left.length === right.length && left.every(function (id, index) {
    return id === right[index];
  });
}
function toho_same_encyclopedia(left, right) {
  return !!left && !!right && left.resetGeneration === right.resetGeneration &&
    toho_same_ids(left.itemIds, right.itemIds) && toho_same_ids(left.enemyIds, right.enemyIds);
}
function toho_apply_encyclopedia(snapshot) {
  toho_meta.encyclopedia.itemIds = snapshot.itemIds.slice();
  toho_meta.encyclopedia.enemyIds = snapshot.enemyIds.slice();
  toho_meta.encyclopedia.resetGeneration = snapshot.resetGeneration;
}
function toho_encyclopedia_record(snapshot) {
  return {
    schemaVersion: TOHO_ENCYCLOPEDIA_SCHEMA,
    resetGeneration: snapshot.resetGeneration,
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
function toho_read_meta_encyclopedia_storage() {
  const value = toho_read_json(TOHO_META_KEY);
  if (value === null) return null;
  if (!value || typeof value !== 'object' || value.schemaVersion !== 1) {
    toho_storage_blocked_keys.add(TOHO_META_KEY);
    console.error('永続セーブの形式が不正です。既存データは上書きしません。');
    return null;
  }
  return toho_encyclopedia_snapshot(value.encyclopedia);
}
function toho_read_latest_encyclopedia() {
  return toho_merge_encyclopedia(
    toho_read_meta_encyclopedia_storage(), toho_read_encyclopedia_storage()
  );
}

const toho_base_save_meta_for_encyclopedia = toho_save_meta;
const toho_meta_encyclopedia_at_load = toho_encyclopedia_snapshot(toho_meta.encyclopedia);
const toho_stored_encyclopedia = toho_read_encyclopedia_storage();
let toho_committed_encyclopedia = toho_merge_encyclopedia(
  toho_meta_encyclopedia_at_load, toho_stored_encyclopedia
);
let toho_encyclopedia_exact_write = false;
let toho_encyclopedia_reset_requested = false;
let toho_encyclopedia_last_error = null;

// 保存元の一方だけが古い場合は世代を比較し、同じ世代のIDだけを統合する。
if (!toho_same_encyclopedia(toho_meta_encyclopedia_at_load, toho_committed_encyclopedia)) {
  toho_apply_encyclopedia(toho_committed_encyclopedia);
  toho_meta_dirty = true;
}
if (!toho_storage_is_blocked(TOHO_META_KEY)) {
  const initialMeta = toho_read_meta_encyclopedia_storage();
  if (initialMeta === null && !toho_storage_is_blocked(TOHO_META_KEY)) {
    toho_meta_dirty = true; // 初回も実際の保存レコードを作成する。
  }
  if (toho_meta_dirty) toho_base_save_meta_for_encyclopedia();
}
if (!toho_storage_is_blocked(TOHO_ENCYCLOPEDIA_KEY)) {
  toho_write_json(TOHO_ENCYCLOPEDIA_KEY, toho_encyclopedia_record(toho_committed_encyclopedia));
}

// 保存直前に他タブの最新値も読み直す。古いタブの別項目保存で図鑑IDを消さない。
toho_save_meta = function () {
  const local = toho_encyclopedia_snapshot(toho_meta.encyclopedia);
  const previousDirty = toho_meta_dirty;
  const external = toho_read_latest_encyclopedia();
  if (toho_storage_is_blocked(TOHO_META_KEY)) return false;

  let target;
  if (toho_encyclopedia_reset_requested) {
    const generation = Math.max(local.resetGeneration,
      toho_committed_encyclopedia.resetGeneration,
      external ? external.resetGeneration : 0) + 1;
    target = toho_encyclopedia_snapshot({
      itemIds: local.itemIds, enemyIds: local.enemyIds, resetGeneration: generation,
    });
  } else if (toho_encyclopedia_exact_write) {
    // ID正規化は完全置換するが、新しい世代での明示削除は取り消さない。
    target = external && external.resetGeneration > local.resetGeneration ? external : local;
  } else {
    target = toho_merge_encyclopedia(
      toho_merge_encyclopedia(toho_committed_encyclopedia, local), external
    );
  }
  if (!toho_same_encyclopedia(local, target)) {
    toho_apply_encyclopedia(target);
    toho_meta_dirty = true;
  }
  // 図鑑IDが増えたのにdirtyフラグが立っていなかった場合も、共通metaへ書き込む。
  if (external && !toho_same_encyclopedia(external, target)) toho_meta_dirty = true;
  const metaSaved = toho_base_save_meta_for_encyclopedia();
  if (!metaSaved) {
    toho_apply_encyclopedia(local);
    toho_meta_dirty = previousDirty;
    toho_encyclopedia_last_error = '共通メタの保存に失敗しました。';
    return false;
  }

  const verifiedMeta = toho_read_meta_encyclopedia_storage();
  if (!verifiedMeta || !toho_same_encyclopedia(verifiedMeta, target)) {
    toho_encyclopedia_last_error = '共通メタの保存内容を読み返せませんでした。';
    return false;
  }

  // 専用キーは冗長コピー。こちらだけ失敗しても共通metaに成功した解放は取り消さない。
  toho_committed_encyclopedia = toho_encyclopedia_snapshot(target);
  if (toho_storage_is_blocked(TOHO_ENCYCLOPEDIA_KEY)) {
    toho_encyclopedia_last_error = '図鑑専用データを読み取れません。共通メタは保存済みです。';
    return true;
  }
  const existingCopy = toho_read_encyclopedia_storage();
  if (existingCopy && toho_same_encyclopedia(existingCopy, target)) {
    toho_encyclopedia_last_error = null;
    return true; // 他タブへ無意味なstorageイベントを繰り返し送らない。
  }
  const copySaved = toho_write_json(TOHO_ENCYCLOPEDIA_KEY,
    toho_encyclopedia_record(target));
  if (!copySaved || !toho_same_encyclopedia(toho_read_encyclopedia_storage(), target)) {
    toho_encyclopedia_last_error = '図鑑専用コピーを確認できません。共通メタは保存済みです。';
    return true;
  }
  toho_encyclopedia_last_error = null;
  return true;
};

// 図鑑を開く際に、保存済みIDを表示中のメモリへ反映する。
function toho_reconcile_encyclopedia_storage() {
  const before = toho_encyclopedia_snapshot(toho_meta.encyclopedia);
  const external = toho_read_latest_encyclopedia();
  if (toho_storage_is_blocked(TOHO_META_KEY)) {
    return { recovered: false, saved: false, error: '共通メタを読み取れません。' };
  }
  const target = toho_merge_encyclopedia(
    toho_merge_encyclopedia(toho_committed_encyclopedia, before), external
  );
  const recovered = !toho_same_encyclopedia(before, target);
  if (recovered) {
    toho_apply_encyclopedia(target);
    toho_meta_dirty = true;
  }
  // 図鑑を閲覧した時点で、片方の保存元が欠落していた場合も修復する。
  const saved = toho_save_meta();
  return { recovered: recovered, saved: saved, error: toho_encyclopedia_last_error };
}

// 件数だけを返す。個々の図鑑解放名は診断表示・ログへ出さない。
function toho_encyclopedia_storage_diagnostic() {
  const memory = toho_encyclopedia_snapshot(toho_meta.encyclopedia);
  const meta = toho_read_meta_encyclopedia_storage();
  const dedicated = toho_read_encyclopedia_storage();
  function count(snapshot) {
    return snapshot ? snapshot.itemIds.length + '/' + snapshot.enemyIds.length : 'なし';
  }
  return {
    memory: count(memory), meta: count(meta), dedicated: count(dedicated),
    blocked: toho_storage_is_blocked(TOHO_META_KEY) ||
      toho_storage_is_blocked(TOHO_ENCYCLOPEDIA_KEY),
    error: toho_encyclopedia_last_error,
  };
}

function toho_replace_encyclopedia_ids(itemIds, enemyIds, clear) {
  const previousMeta = toho_encyclopedia_snapshot(toho_meta.encyclopedia);
  const previousCommitted = toho_encyclopedia_snapshot(toho_committed_encyclopedia);
  const previousDirty = toho_meta_dirty;
  toho_apply_encyclopedia({
    itemIds: toho_unique_ids(itemIds), enemyIds: toho_unique_ids(enemyIds),
    resetGeneration: previousMeta.resetGeneration,
  });
  toho_meta_dirty = true;
  toho_encyclopedia_exact_write = true;
  toho_encyclopedia_reset_requested = clear === true;
  let saved;
  try {
    saved = toho_save_meta();
  } finally {
    toho_encyclopedia_exact_write = false;
    toho_encyclopedia_reset_requested = false;
  }
  if (saved) return true;
  toho_committed_encyclopedia = previousCommitted;
  toho_apply_encyclopedia(previousMeta);
  toho_meta_dirty = previousDirty;
  return false;
}
function toho_clear_encyclopedia() {
  return toho_replace_encyclopedia_ids([], [], true);
}

// archive_controls.js の確認UIを維持し、削除確定だけ新しい世代として扱う。
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
    toho_encyclopedia_reset_requested = true;
    try {
      return originalConfirm.apply(this, arguments);
    } finally {
      toho_encyclopedia_exact_write = false;
      toho_encyclopedia_reset_requested = false;
    }
  };
  yes.__tohoEncyclopediaStorageWrapped = true;
  return result;
};

if (typeof window.addEventListener === 'function') {
  window.addEventListener('pagehide', function () {
    // 未反映の解放がある場合の最終同期。保存失敗はコンソールに残す。
    if (!toho_reconcile_encyclopedia_storage().saved) {
      console.error('ページ終了時に図鑑を保存できませんでした。');
    }
  });
  window.addEventListener('storage', function (event) {
    if (event.key === TOHO_META_KEY || event.key === TOHO_ENCYCLOPEDIA_KEY) {
      toho_reconcile_encyclopedia_storage();
    }
  });
}
