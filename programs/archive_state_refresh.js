/* v1.4.2: 図鑑の解放状態変更を項目数の変化とは独立して画面へ反映する。 */
function toho_encyclopedia_state_signature() {
  const rates = toho_discovery_rates();
  const itemIds = Array.from(new Set(toho_meta.encyclopedia.itemIds || [])).sort();
  const enemyIds = Array.from(new Set(toho_meta.encyclopedia.enemyIds || [])).sort();
  return [rates.grandTotal, rates.total, itemIds.join(','), enemyIds.join(',')].join('|');
}

function toho_sync_encyclopedia_before_render() {
  // 取得時フックを取りこぼした既存セーブも、図鑑を開いた時点の所持品から復元する。
  // 通常セーブ時の checkpoint と同じ走査をここでも行う。
  if (typeof toho_scan_inventory === 'function') toho_scan_inventory();
}

const toho_archive_state_original_render = Toho_archive_scene_v14.prototype.render;
Toho_archive_scene_v14.prototype.render = function () {
  if (this.view === 'index' || this.view === 'items' || this.view === 'enemies') {
    toho_sync_encyclopedia_before_render();
  }
  const result = toho_archive_state_original_render.apply(this, arguments);
  this._encyclopediaStateSignature = toho_encyclopedia_state_signature();
  return result;
};

const toho_archive_state_original_update = Toho_archive_scene_v14.prototype.update;
Toho_archive_scene_v14.prototype.update = function (app) {
  const before = this._encyclopediaStateSignature;
  const result = toho_archive_state_original_update.call(this, app);
  if (this._deleteDialog || this._pendingDeleteRender || this._pendingDeleteRestore) return result;
  if (this.view === 'itemDetail' || this.view === 'enemyDetail' || this.view === 'historyDetail') return result;

  const current = toho_encyclopedia_state_signature();
  // 元updateは総項目数の変更だけを検知する。解放IDだけが変わった場合はここで再描画する。
  if (before !== undefined && this._encyclopediaStateSignature !== current) {
    this.render();
  }
  return result;
};
