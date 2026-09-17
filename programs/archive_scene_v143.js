/* v1.4.4: 図鑑の解放同期・再描画と敵ドロップ開示を実際の図鑑シーンへ統合する。 */

function toho_archive_encyclopedia_signature() {
  const rates = toho_discovery_rates();
  const itemIds = Array.from(new Set(toho_meta.encyclopedia.itemIds || [])).sort();
  const enemyIds = Array.from(new Set(toho_meta.encyclopedia.enemyIds || [])).sort();
  return [rates.grandTotal, rates.total, itemIds.join(','), enemyIds.join(',')].join('|');
}

function toho_mask_enemy_drop_labels(scene) {
  if (scene.view !== 'enemyDetail' || !scene.selected ||
    !scene.scrollArea || scene.scrollArea.kind !== 'drops') return;

  const drops = Array.isArray(scene.selected.data.ドロップ) ? scene.selected.data.ドロップ : [];
  drops.forEach(function (drop, index) {
    const row = scene.scrollRows[index];
    if (!row || !row.node) return;
    const discovered = toho_item_name_is_discovered(drop[0]);
    row.node.text = discovered ? '・' + drop[0] + '　最大' + drop[1] : '・？？？';
  });
}

phina.define('Toho_archive_scene_v143', {
  superClass: 'Toho_archive_scene_v14',

  init: function (option) {
    this.superInit(option);
    this._encyclopediaStateSignature = toho_archive_encyclopedia_signature();
  },

  render: function () {
    let sync = null;
    if (this.view === 'index' || this.view === 'items' || this.view === 'enemies') {
      // 保存値を毎回照合する。別タブが新たに解放したIDもこの画面へ反映する。
      if (typeof toho_reconcile_encyclopedia_storage === 'function') {
        sync = toho_reconcile_encyclopedia_storage();
      }
      // 通常checkpointと同じ走査を、図鑑表示直前にも必ず実行する。
      toho_scan_inventory();
    }
    Toho_archive_scene_v14.prototype.render.call(this);
    // 敵そのものを解放していても、未取得のドロップ候補名・最大数は伏せる。
    toho_mask_enemy_drop_labels(this);
    if (this.view === 'index' && typeof toho_encyclopedia_storage_diagnostic === 'function') {
      const report = toho_encyclopedia_storage_diagnostic();
      const debug = typeof window !== 'undefined' && window.location &&
        /(?:\?|&)debug=storage(?:&|$)/.test(window.location.search);
      if (debug || report.blocked || report.error || (sync && sync.recovered)) {
        const prefix = report.error || report.blocked ? '保存異常' :
          sync && sync.recovered ? '保存データから復元' : '図鑑保存';
        const label = this.label(prefix + ' 画面:' + report.memory +
          ' 共通:' + report.meta + ' 専用:' + report.dedicated,
        CENTER_W, 1605, 27);
        if (report.error || report.blocked) label.fill = Red;
      }
    }
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
