/* v1.4.3: 図鑑の解放同期と再描画を、実際にGameAppが生成するクラスへ統合する。 */

function toho_archive_encyclopedia_signature() {
  const rates = toho_discovery_rates();
  const itemIds = Array.from(new Set(toho_meta.encyclopedia.itemIds || [])).sort();
  const enemyIds = Array.from(new Set(toho_meta.encyclopedia.enemyIds || [])).sort();
  return [rates.grandTotal, rates.total, itemIds.join(','), enemyIds.join(',')].join('|');
}

phina.define('Toho_archive_scene_v143', {
  superClass: 'Toho_archive_scene_v14',

  init: function (option) {
    this.superInit(option);
    this._encyclopediaStateSignature = toho_archive_encyclopedia_signature();
  },

  render: function () {
    if (this.view === 'index' || this.view === 'items' || this.view === 'enemies') {
      // 通常checkpointと同じ走査を、図鑑表示直前にも必ず実行する。
      toho_scan_inventory();
    }
    Toho_archive_scene_v14.prototype.render.call(this);
    this._encyclopediaStateSignature = toho_archive_encyclopedia_signature();
  },

  update: function (app) {
    const before = this._encyclopediaStateSignature;
    Toho_archive_scene_v14.prototype.update.call(this, app);

    if (this._deleteDialog || this._pendingDeleteRender || this._pendingDeleteRestore) return;
    if (this.view === 'itemDetail' || this.view === 'enemyDetail' || this.view === 'historyDetail') return;

    const current = toho_archive_encyclopedia_signature();
    if (before !== undefined && current !== this._encyclopediaStateSignature) {
      this.render();
    }
  },
});
