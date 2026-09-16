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

// 制作後の一覧更新だけスクロール位置を保持する。検索・道具切替は従来通り先頭から表示。
phina.define('Toho_craft_scene_v14', {
  superClass: 'Craft_scene',
  init: function (option) {
    toho_note_context('craft');
    this.superInit(option);
  },
  scroll_content_height: function () {
    // 既存画面の上側余白20pxと同量を最下部にも確保する。
    return Craft_scene.prototype.scroll_content_height.call(this) + this.上下余白;
  },
  rebuild_recipe_list: function () {
    const preserve = this._preserveCraftScroll === true;
    const previousPosition = preserve ? this.始端位置 : null;
    this._preserveCraftScroll = false;
    Craft_scene.prototype.rebuild_recipe_list.call(this);
    if (preserve) {
      // 作れるレシピ数が変わった場合は、新しいスクロール範囲内に収める。
      this.始端位置 = this.clamp_scroll(previousPosition);
      this.set_recipes_pos();
    }
  },
  update: function (app) {
    if (is_reload) this._preserveCraftScroll = true;
    Craft_scene.prototype.update.call(this, app);
  },
});

// 背景画像はscene.childrenの先頭に追加されるため、武器IDをchildrenの添字に使えない。
// 既存の戦闘進行は維持し、破損時に除去された無関係な表示を復元して武器だけを取り除く。
const toho_original_battle_update = Battle_scene.prototype.update;
Toho_battle_scene.prototype.update = function (app) {
  const index = this.choosed_weapon;
  const selected = this.attacks[index];
  const name = selected && selected.武器.名前;
  const lastCopy = this.戦闘フェイズ === '敵にダメージ' && index > 0 &&
    selected && player.has_item(name) === 1;
  const previousChildren = lastCopy ? this.children.slice() : null;
  toho_original_battle_update.call(this, app);
  if (!lastCopy || !this.is_weapon_lost || player.has_item(name) > 0) return;

  // 旧処理が消した要素を元の描画順で戻す（背景や別武器を誤消去しない）。
  const missing = previousChildren.find(function (child) {
    return this.children.indexOf(child) === -1;
  }, this);
  if (missing && missing !== selected) {
    this.children.splice(previousChildren.indexOf(missing), 0, missing);
  }
  if (this.children.indexOf(selected) !== -1) selected.remove();

  // 攻撃候補とボタンIDを同時更新し、次に別の武器が壊れても正しく対応させる。
  this.attacks.splice(index, 1);
  this.attacks.forEach(function (button, position) { button.ID = position; });
  this.choosed_weapon = 0;
  this.past_choosed_weapon = -1;
  this.set_attacks_pos();
};

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
    // 他の画面と同様、左下から25px、下揃え、標準32pxでバージョンを表示する。
    const versionLabel = this.body.children.find(function (child) {
      return child.text === 'バージョン：' + version;
    });
    if (versionLabel) {
      versionLabel.fontSize = 32;
      versionLabel.baseline = 'bottom';
      versionLabel.setPosition(25, SCREEN_H - 25);
    }
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