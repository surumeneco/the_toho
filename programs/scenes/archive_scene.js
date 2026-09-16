/* タイトルから閲覧する図鑑・最高記録・プレイ履歴。閲覧でプレイ状態は変更しない。 */
let toho_archive_entry = 'index';
function toho_attack_text(attack) {
  if (!attack) return '不明';
  const terms = (attack.ダイス || []).map(function (dice) { return dice[0] + 'd' + dice[1]; });
  if (attack.固定値) terms.push(String(attack.固定値));
  return terms.join('+').replace(/\+-/g, '-') || '0';
}
function toho_percentage(known, total) { return total ? Math.floor(100 * known / total) : 0; }

// タイトル本来の音量操作を維持し、専用の閲覧ボタン上ではゲームを開始しない。
phina.define('Toho_title_scene', {
  superClass: 'Title_scene',
  init: function (option) {
    this.superInit(option);
    const self = this;
    const records = toho_meta.records;
    Label({ text: '最高到達距離：' + (records.bestDistanceMeters / 1000) + 'km',
      fontSize: 49, fill: White }).addChildTo(this).setPosition(CENTER_W, 725);
    Label({ text: '最高日数：' + records.bestDays + '日',
      fontSize: 49, fill: White }).addChildTo(this).setPosition(CENTER_W, 805);
    Button({ text: '図鑑', fontSize: 55, width: 370, height: 115,
      fill: darkGray, stroke: lightGray, strokeWidth: 12, cornerRadius: 0 })
      .addChildTo(this).setPosition(295, 1190).onpointend = function () {
        toho_archive_entry = 'index';
        SoundManager.play('select');
        self.exit('記録・図鑑');
      };
    Button({ text: 'プレイ履歴', fontSize: 49, width: 370, height: 115,
      fill: darkGray, stroke: lightGray, strokeWidth: 12, cornerRadius: 0 })
      .addChildTo(this).setPosition(785, 1190).onpointend = function () {
        toho_archive_entry = 'history';
        SoundManager.play('select');
        self.exit('記録・図鑑');
      };
    // 旧タイトルはあらゆるタップでゲームを始めるため、専用ボタンを除外する。
    this.off('pointend');
    this.on('pointend', function (e) {
      const point = e.pointer;
      if (point && point.y >= 1120 && point.y <= 1260 &&
        ((point.x >= 90 && point.x <= 500) || (point.x >= 580 && point.x <= 990))) return;
      if (this.volume_changing) { this.volume_changing = false; return; }
      toho_start_run();
      player = new Player();
      set_cookies();
      SoundManager.play('newgame');
      self.exit('ホーム');
    });
  },
});

// 出現した戦闘だけを計数する。敵選定後、HP変化前に遭遇を図鑑へ記録する。
phina.define('Toho_battle_scene', {
  superClass: 'Battle_scene',
  init: function (option) {
    this.superInit(option);
    toho_note_encounter(this.敵);
  },
});
phina.define('Toho_search_scene', {
  superClass: 'Search_scene',
  init: function (option) {
    toho_note_context('exploration');
    this.superInit(option);
  },
});
phina.define('Toho_sleep_scene', {
  superClass: 'Sleep_scene',
  init: function (option) {
    toho_note_context('sleep');
    this.superInit(option);
  },
});

phina.define('Toho_archive_scene', {
  superClass: 'DisplayScene',
  init: function (option) {
    this.superInit(option);
    this.width = SCREEN_W;
    this.height = SCREEN_H;
    this.backgroundColor = Black;
    this.view = toho_archive_entry;
    this.page = 0;
    this.itemPage = 0;
    this.parentView = null;
    this.selected = null;
    this.body = DisplayElement().addChildTo(this);
    this.lastCatalogSize = -1;
    this.render();
  },
  clear: function () {
    this.body.children.slice().forEach(function (child) { child.remove(); });
  },
  label: function (text, x, y, size, left) {
    const label = Label({ text: text, fontSize: size || 49, fill: White }).addChildTo(this.body);
    if (left) label.align = 'left';
    label.setPosition(x, y);
    return label;
  },
  button: function (text, x, y, width, height, action, fontSize) {
    const button = Button({ text: text, fontSize: fontSize || 49,
      width: width || 440, height: height || 118, cornerRadius: 0,
      fill: darkGray, stroke: lightGray, strokeWidth: 9 }).addChildTo(this.body);
    button.setPosition(x, y);
    button.onpointend = function () { SoundManager.play('select'); action(); };
    return button;
  },
  panel: function (x, y, width, height) {
    return RectangleShape({ width: width, height: height,
      fill: 'rgba(15, 15, 15, 0.88)', stroke: lightGray, strokeWidth: 6 })
      .addChildTo(this.body).setPosition(x, y);
  },
  change: function (view, selected) {
    this.view = view;
    this.selected = selected || null;
    this.page = 0;
    this.itemPage = 0;
    this.render();
  },
  goBack: function () {
    if (this.view === 'itemDetail' || this.view === 'enemyDetail') {
      this.view = this.parentView;
      this.render();
    } else if (this.view === 'historyDetail') {
      this.view = 'history';
      this.render();
    } else if (this.view === 'items' || this.view === 'enemies') {
      this.change('index');
    } else {
      this.exit('タイトル');
    }
  },
  render: function () {
    this.clear();
    const self = this;
    const rates = toho_discovery_rates();
    this.lastCatalogSize = rates.grandTotal;
    const titles = {
      index: '図鑑', items: 'アイテム図鑑', enemies: '敵図鑑',
      itemDetail: 'アイテム詳細', enemyDetail: '敵の詳細',
      history: 'プレイ履歴', historyDetail: 'プレイ履歴の詳細',
    };
    this.panel(CENTER_W, 135, SCREEN_W - 35, 235);
    this.label(titles[this.view] || '記録', CENTER_W, 95, 82);
    this.button('戻る', 830, 1800, 350, 115, function () { self.goBack(); });
    this.label('バージョン：' + version, 25, 1900, 33, true);

    if (this.view === 'index') {
      this.panel(CENTER_W, 585, 940, 500);
      this.label('総合解放率：' + rates.total + '/' + rates.grandTotal + '（' +
        toho_percentage(rates.total, rates.grandTotal) + '%）', CENTER_W, 440, 48);
      this.label('アイテム：' + rates.items + '/' + rates.itemTotal + '（' +
        toho_percentage(rates.items, rates.itemTotal) + '%）', CENTER_W, 585, 48);
      this.label('敵：' + rates.enemies + '/' + rates.enemyTotal + '（' +
        toho_percentage(rates.enemies, rates.enemyTotal) + '%）', CENTER_W, 730, 48);
      this.button('アイテム図鑑', CENTER_W, 1030, 790, 160, function () { self.change('items'); }, 58);
      this.button('敵図鑑', CENTER_W, 1260, 790, 160, function () { self.change('enemies'); }, 58);
      return;
    }
    if (this.view === 'items' || this.view === 'enemies') {
      const isItem = this.view === 'items';
      const entries = isItem ? toho_item_catalog() : toho_enemy_catalog();
      const unlocked = new Set(isItem ? toho_meta.encyclopedia.itemIds : toho_meta.encyclopedia.enemyIds);
      const total = entries.length;
      const known = entries.filter(function (entry) { return unlocked.has(entry.id); }).length;
      this.label('解放：' + known + '/' + total + '（' + toho_percentage(known, total) + '%）',
        CENTER_W, 260, 45);
      if (!total) this.label('データを読み込み中です。', CENTER_W, 730, 46);
      entries.slice(this.page * 8, this.page * 8 + 8).forEach(function (entry, index) {
        const found = unlocked.has(entry.id);
        const title = found ? (isItem ? entry.category + '：' : '') + entry.name : '？？？';
        const text = String(self.page * 8 + index + 1) + '. ' + title;
        const button = self.button(text, CENTER_W, 370 + index * 143, 955, 118, function () {
          if (!found) return;
          self.parentView = self.view;
          self.selected = entry;
          self.view = isItem ? 'itemDetail' : 'enemyDetail';
          self.render();
        }, 45);
        if (!found) { button.fontColor = lightGray; button.fill = '#292929'; }
      });
      this.pages(total, 8);
      return;
    }
    if (this.view === 'itemDetail' || this.view === 'enemyDetail') {
      const entry = this.selected;
      if (!entry) { this.goBack(); return; }
      this.panel(CENTER_W, 710, 955, 825);
      this.label(entry.name, CENTER_W, 390, 68);
      if (this.view === 'itemDetail') {
        this.label('分類：' + entry.category, 110, 545, 50, true);
        if (entry.type === 'food') this.label('気力回復量：' + entry.data.回復量, 110, 665, 50, true);
        if (entry.type === 'weapon') this.label('攻撃力：' + toho_attack_text(entry.data.攻撃力), 110, 665, 50, true);
        if (entry.type === 'material') this.label('採取に必要な道具：' + (entry.data.必要道具 || '無し'),
          110, 665, 43, true);
      } else {
        this.label('体力：' + entry.data.体力, 110, 540, 51, true);
        this.label('攻撃力：' + toho_attack_text(entry.data.攻撃力), 110, 645, 51, true);
        this.label('出現距離：' + (entry.data.出現距離 / 1000) + 'km以上', 110, 750, 49, true);
        const drops = (entry.data.ドロップ || []).map(function (drop) { return drop[0]; });
        this.label('ドロップ候補：', 110, 865, 45, true);
        drops.slice(0, 3).forEach(function (name, i) { self.label('・' + name, 125, 955 + i * 75, 44, true); });
        if (drops.length > 3) this.label('ほか ' + (drops.length - 3) + '種類', 125, 1190, 40, true);
      }
      return;
    }
    if (this.view === 'history') {
      const history = toho_meta.history;
      this.label('死亡時の記録（最新10件） / ' + history.length + '件', CENTER_W, 265, 44);
      if (!history.length) this.label('記録はまだありません。', CENTER_W, 700, 52);
      history.slice(this.page * 7, this.page * 7 + 7).forEach(function (entry, i) {
        const title = String(self.page * 7 + i + 1) + '. ' + entry.days + '日 / ' +
          (entry.distanceMeters / 1000) + 'km';
        self.button(title, CENTER_W, 400 + i * 163, 950, 127, function () {
          self.selected = entry;
          self.change('historyDetail', entry);
        }, 50);
      });
      this.pages(history.length, 7);
      return;
    }
    if (this.view === 'historyDetail') {
      const entry = this.selected;
      if (!entry) { this.change('history'); return; }
      this.panel(CENTER_W, 490, 980, 540);
      const stamp = entry.endedAt ? new Date(entry.endedAt).toLocaleString('ja-JP') : '記録日時なし';
      this.label('終了：' + stamp, 95, 310, 43, true);
      this.label('到達：' + (entry.distanceMeters / 1000) + 'km / ' + entry.days + '日', 95, 405, 49, true);
      this.label('死因：' + toho_cause_text(entry.deathCause), 95, 500, 42, true);
      this.label('戦闘回数：' + entry.battleCount + '回', 95, 595, 46, true);
      const items = Array.isArray(entry.items) ? entry.items : [];
      this.label('死亡時の所持品（' + items.length + '種）', CENTER_W, 795, 52);
      items.slice(this.itemPage * 7, this.itemPage * 7 + 7).forEach(function (item, i) {
        const type = TOHO_ITEM_TYPES.find(function (entry) { return entry.id === item.category; });
        self.label('・' + (type ? type.name : 'その他') + '：' + item.name + ' ×' + item.quantity,
          90, 895 + i * 95, 43, true);
      });
      this.pages(items.length, 7, true);
    }
  },
  pages: function (length, size, inventory) {
    const self = this;
    const page = inventory ? this.itemPage : this.page;
    const count = Math.max(1, Math.ceil(length / size));
    this.label((page + 1) + ' / ' + count + 'ページ', CENTER_W, 1630, 44);
    if (page > 0) this.button('前へ', 235, 1685, 295, 100, function () {
      if (inventory) self.itemPage--; else self.page--;
      self.render();
    }, 45);
    if (page < count - 1) this.button('次へ', 840, 1685, 295, 100, function () {
      if (inventory) self.itemPage++; else self.page++;
      self.render();
    }, 45);
  },
  update: function (app) {
    bgm_check(app);
    // JSONの読み込みがタイトル表示より遅かった場合も、一覧を読み直す。
    if (this.lastCatalogSize !== toho_discovery_rates().grandTotal &&
      this.view !== 'itemDetail' && this.view !== 'enemyDetail' && this.view !== 'historyDetail') {
      this.render();
    }
  },
});
