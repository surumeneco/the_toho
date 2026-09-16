/* v1.4.0: 図鑑・履歴の個別削除、タイトルの仮ボタン、スクロール余白と死因表示。 */

// 保存済みの旧履歴も表示時に変換する。履歴の元データは変更しない。
toho_cause_text = function (cause) {
  if (!cause) return '不明';
  if (cause.type === 'enemy_hp' || cause.type === 'enemy_sp') return cause.enemyName || '敵';
  if (cause.type === 'sleep_sp') return '寝すぎ';
  if (cause.type === 'craft_sp') return '作りすぎ';
  if (cause.type === 'exploration_sp') return '歩きすぎ';
  return '不明';
};
toho_death_cause = function (run) {
  if (run.context === 'battle') {
    return { type: player.体力 <= 0 ? 'enemy_hp' : 'enemy_sp',
      enemyId: run.enemyId, enemyName: run.enemyName };
  }
  if (run.context === 'sleep') return { type: 'sleep_sp' };
  if (run.context === 'craft') return { type: 'craft_sp' };
  return { type: 'exploration_sp' };
};

// 既存画面の余白は上下各20px。制作一覧の下端にも同量を確保する。
phina.define('Toho_craft_scene_v14', {
  superClass: 'Craft_scene',
  init: function (option) {
    toho_note_context('craft');
    this.superInit(option);
  },
  scroll_content_height: function () {
    return Craft_scene.prototype.scroll_content_height.call(this) + this.上下余白;
  },
});

// 追加の入口は仮実装：選択音だけを再生し、新規プレイは開始しない。
phina.define('Toho_title_scene_v14', {
  superClass: 'Toho_title_scene',
  init: function (option) {
    this.superInit(option);
    const self = this;
    this.children.forEach(function (child) {
      if (child.text === '図鑑' || child.text === 'プレイ履歴') child.setPosition(child.x, 1100);
    });
    ['実績', 'ストーリー'].forEach(function (name, index) {
      Button({ text: name, fontSize: 53, width: 370, height: 115,
        cornerRadius: 0, fill: darkGray, stroke: lightGray, strokeWidth: 15 })
        .addChildTo(self).setPosition(index ? 785 : 295, 1270)
        .onpointend = function () { SoundManager.play('select'); };
    });
    // 親シーンの全画面タップ判定を4ボタンに対応させる。
    this.clear('pointend');
    this.on('pointend', function (event) {
      const point = event.pointer;
      if (point && ((point.y >= 1030 && point.y <= 1170) ||
        (point.y >= 1200 && point.y <= 1340)) &&
        ((point.x >= 90 && point.x <= 500) ||
        (point.x >= 580 && point.x <= 990))) return;
      if (this.volume_changing) { this.volume_changing = false; return; }
      toho_start_run();
      player = new Player();
      set_cookies();
      SoundManager.play('newgame');
      this.exit('ホーム');
    });
  },
});

// 旧シーンを継承して表示と操作のみ拡張する。保存スキーマは変更しない。
phina.define('Toho_archive_scene_v14', {
  superClass: 'Toho_archive_scene',
  init: function (option) {
    this.superInit(option);
  },
  render: function () {
    Toho_archive_scene.prototype.render.call(this);
    const self = this;
    // 履歴は元々先頭・末尾とも18pxの余白がある。候補・所持品にも対称な余白を付ける。
    const area = this.scrollArea;
    if (area && (area.kind === 'drops' || area.kind === 'inventory') && this.scrollRows.length) {
      const padding = 20;
      const first = Math.min.apply(null, this.scrollRows.map(function (row) { return row.offset; }));
      const extra = Math.max(0, padding - first);
      this.scrollRows.forEach(function (row) { row.offset += extra; });
      const last = Math.max.apply(null, this.scrollRows.map(function (row) {
        return row.offset + row.height;
      }));
      area.contentHeight = last + padding;
      area.max = Math.max(0, area.contentHeight - (area.bottom - area.top));
      area.offset = Math.min(area.offset, area.max);
      this.keepScrollOffset();
      if (!area.max && this.scrollBar) {
        this.scrollBar.remove();
        this.scrollBar = null;
      } else if (area.max && !this.scrollBar) {
        this.scrollBar = RectangleShape({ width: 12, height: 85,
          fill: White, strokeWidth: 0, cornerRadius: 0 }).addChildTo(this.body);
      }
      this.positionScrollRows();
    }
    // 削除操作はそれぞれのトップ画面だけに表示する。
    if (this.view === 'index' || this.view === 'history') {
      const kind = this.view === 'index' ? 'encyclopedia' : 'history';
      this.button('データ削除', 260, 1800, 350, 115, function () {
        self.showDeleteDialog(kind);
      }, 48);
    }
  },
  showDeleteDialog: function (kind) {
    if (this._deleteDialog || this._pendingDeleteRender || this._pendingDeleteRestore) return;
    const scene = this;
    const controls = [];
    // スクロール内にネストしたButtonも含めて凍結する。
    function freeze(element) {
      if (element.interactive === true) {
        controls.push(element);
        element.interactive = false;
      }
      if (element.children) element.children.slice().forEach(freeze);
    }
    freeze(this.body);
    const dialog = { controls: controls, scrollArea: this.scrollArea, elements: [] };
    this.scrollArea = null; // 背景側のスワイプも停止する。
    this.scrollActive = false;
    this._deleteDialog = dialog;
    function add(element, x, y) {
      element.addChildTo(scene.body).setPosition(x, y);
      dialog.elements.push(element);
      return element;
    }
    add(RectangleShape({ width: SCREEN_W, height: SCREEN_H,
      fill: 'rgba(0, 0, 0, 0.75)', strokeWidth: 0 }), CENTER_W, CENTER_H);
    add(RectangleShape({ width: 940, height: 620, cornerRadius: 20,
      fill: darkGray, stroke: lightGray, strokeWidth: 12 }), CENTER_W, CENTER_H);
    add(Label({ text: kind === 'encyclopedia' ? '図鑑の解放情報を\nすべて削除しますか？' :
      'プレイ履歴をすべて\n削除しますか？', fontSize: 59, fill: White }),
    CENTER_W, CENTER_H - 160);
    add(Label({ text: '最高記録・音量・プレイデータは残ります。',
      fontSize: 36, fill: White }), CENTER_W, CENTER_H - 18);
    const error = add(Label({ text: '', fontSize: 38, fill: Red }), CENTER_W, CENTER_H + 70);
    const yes = add(Button({ text: 'はい', fontSize: 60, width: 320, height: 140,
      cornerRadius: 0, fill: '#823636', stroke: lightGray, strokeWidth: 12 }),
    CENTER_W - 205, CENTER_H + 180);
    const no = add(Button({ text: 'いいえ', fontSize: 60, width: 320, height: 140,
      cornerRadius: 0, fill: darkGray, stroke: lightGray, strokeWidth: 12 }),
    CENTER_W + 205, CENTER_H + 180);
    no.onpointend = function () {
      if (!scene._deleteDialog) return;
      SoundManager.play('select');
      dialog.elements.forEach(function (element) { element.remove(); });
      scene._deleteDialog = null;
      // 押下終了イベントが背景ボタンに届かないよう、次フレームで復帰。
      scene._pendingDeleteRestore = dialog;
    };
    yes.onpointend = function () {
      if (!scene._deleteDialog || scene._pendingDeleteRender) return;
      const previousDirty = toho_meta_dirty;
      const previous = kind === 'encyclopedia' ? {
        itemIds: toho_meta.encyclopedia.itemIds,
        enemyIds: toho_meta.encyclopedia.enemyIds,
      } : toho_meta.history;
      if (kind === 'encyclopedia') {
        toho_meta.encyclopedia.itemIds = [];
        toho_meta.encyclopedia.enemyIds = [];
      } else {
        toho_meta.history = [];
      }
      toho_meta_dirty = true;
      if (!toho_save_meta()) {
        // 保存失敗時はメモリ上の削除も取り消し、ダイアログを閉じない。
        if (kind === 'encyclopedia') {
          toho_meta.encyclopedia.itemIds = previous.itemIds;
          toho_meta.encyclopedia.enemyIds = previous.enemyIds;
        } else {
          toho_meta.history = previous;
        }
        toho_meta_dirty = previousDirty;
        error.text = '保存できませんでした。削除を中止しました。';
        return;
      }
      SoundManager.play('select');
      if (kind === 'history') scene.historyOffset = 0;
      yes.interactive = false;
      no.interactive = false;
      scene._pendingDeleteRender = true;
    };
  },
  update: function (app) {
    if (this._pendingDeleteRender) {
      this._pendingDeleteRender = false;
      this._deleteDialog = null;
      this.render();
    } else if (this._pendingDeleteRestore) {
      const dialog = this._pendingDeleteRestore;
      this._pendingDeleteRestore = null;
      this.scrollArea = dialog.scrollArea;
      dialog.controls.forEach(function (control) { control.interactive = true; });
    }
    if (this._deleteDialog) {
      bgm_check(app);
      return;
    }
    Toho_archive_scene.prototype.update.call(this, app);
  },
});
