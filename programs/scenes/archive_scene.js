/* タイトルから閲覧する図鑑・最高記録・プレイ履歴。閲覧でプレイ状態は変更しない。 */
let toho_archive_entry = 'index';
function toho_attack_text(attack) {
  if (!attack) return '不明';
  const terms = (attack.ダイス || []).map(function (dice) { return dice[0] + 'd' + dice[1]; });
  if (attack.固定値) terms.push(String(attack.固定値));
  return terms.join('+').replace(/\+-/g, '-') || '0';
}
function toho_percentage(known, total) { return total ? Math.floor(100 * known / total) : 0; }

// タイトル本来の音量操作を維持し、閲覧ボタン上ではゲームを開始しない。
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
    this.clear('pointend');
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

// 戦闘・探索・睡眠の記録処理は既存の接続を維持する。
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

const TOHO_SCROLL_TOP = 325;
const TOHO_SCROLL_BOTTOM = 1540;

phina.define('Toho_archive_scene', {
  superClass: 'DisplayScene',
  init: function (option) {
    this.superInit(option);
    this.width = SCREEN_W;
    this.height = SCREEN_H;
    this.backgroundColor = Black;
    this.view = toho_archive_entry;
    this.page = 0;
    this.itemType = 'food';
    this.parentView = null;
    this.selected = null;
    this.historyOffset = 0;
    this.inventoryOffset = 0;
    this.dropOffset = 0;
    this.scrollArea = null;
    this.scrollRows = [];
    this.scrollActive = false;
    this.dragMoved = false;
    this.body = DisplayElement().addChildTo(this);
    this.lastCatalogSize = -1;
    this.render();

    // 一覧内でだけスワイプを受け付ける。スクロール中の行タップは無効化する。
    this.on('pointstart', function (e) {
      const y = e.pointer.y;
      this.scrollActive = !!this.scrollArea && y >= this.scrollArea.top && y <= this.scrollArea.bottom;
      this.dragMoved = false;
      if (this.scrollActive) {
        this.scrollStartY = y;
        this.scrollStartOffset = this.scrollArea.offset;
      }
    });
    const move = function (e) {
      if (!this.scrollActive || !this.scrollArea) return;
      const distance = e.pointer.y - this.scrollStartY;
      if (Math.abs(distance) > 12) this.dragMoved = true;
      if (!this.dragMoved) return;
      this.scrollArea.offset = Math.max(0, Math.min(this.scrollArea.max, this.scrollStartOffset - distance));
      this.keepScrollOffset();
      this.positionScrollRows();
    };
    this.on('pointmove', move);
    this.on('pointstay', move);
    this.on('pointend', function () { this.scrollActive = false; });
  },
  clearContent: function () {
    this.body.children.slice().forEach(function (child) { child.remove(); });
    this.scrollRows = [];
    this.scrollArea = null;
    this.scrollBar = null;
    this.scrollActive = false;
    this.dragMoved = false;
  },
  label: function (text, x, y, size, left) {
    const label = Label({ text: text, fontSize: size || 49, fill: White }).addChildTo(this.body);
    if (left) label.align = 'left';
    label.setPosition(x, y);
    return label;
  },
  button: function (text, x, y, width, height, action, fontSize) {
    const self = this;
    const button = Button({ text: text, fontSize: fontSize || 49,
      width: width || 440, height: height || 118, cornerRadius: 0,
      fill: darkGray, stroke: lightGray, strokeWidth: 9 }).addChildTo(this.body);
    button.setPosition(x, y);
    button.onpointend = function () {
      if (self.dragMoved) return;
      SoundManager.play('select');
      action();
    };
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
    if (view === 'history') this.historyOffset = 0;
    this.render();
  },
  goBack: function () {
    if (this.view === 'itemDetail' || this.view === 'enemyDetail') {
      this.view = this.parentView;
      this.render();
    } else if (this.view === 'historyDetail') {
      this.view = 'history';
      this.render(); // スクロール位置は保持する。
    } else if (this.view === 'items') {
      this.change('itemCategories');
    } else if (this.view === 'itemCategories' || this.view === 'enemies') {
      this.change('index');
    } else {
      this.exit('タイトル');
    }
  },
  pages: function (length, size) {
    const self = this;
    const count = Math.max(1, Math.ceil(length / size));
    this.label((this.page + 1) + ' / ' + count + 'ページ', CENTER_W, 1500, 44);
    if (this.page > 0) this.button('前へ', 235, 1600, 295, 100, function () {
      self.page--;
      self.render();
    }, 45);
    if (this.page < count - 1) this.button('次へ', 840, 1600, 295, 100, function () {
      self.page++;
      self.render();
    }, 45);
  },
  // 行はスクロール領域の完全に内側にある間だけ表示・操作可能にする。
  beginScroll: function (kind, contentHeight, top, bottom) {
    const saved = kind === 'history' ? this.historyOffset :
      kind === 'inventory' ? this.inventoryOffset : this.dropOffset;
    const max = Math.max(0, contentHeight - (bottom - top));
    this.scrollArea = { kind: kind, top: top, bottom: bottom,
      offset: Math.min(saved, max), max: max, contentHeight: contentHeight };
    this.keepScrollOffset();
    if (max > 0) {
      this.scrollBar = RectangleShape({ width: 14, height: 90,
        fill: White, strokeWidth: 0, cornerRadius: 0 }).addChildTo(this.body);
    }
  },
  keepScrollOffset: function () {
    if (!this.scrollArea) return;
    if (this.scrollArea.kind === 'history') this.historyOffset = this.scrollArea.offset;
    else if (this.scrollArea.kind === 'inventory') this.inventoryOffset = this.scrollArea.offset;
    else this.dropOffset = this.scrollArea.offset;
  },
  addScrollRow: function (node, offset, height, x) {
    this.scrollRows.push({ node: node, offset: offset, height: height, x: x || CENTER_W, isButton: !!node.interactive });
  },
  positionScrollRows: function () {
    if (!this.scrollArea) return;
    const area = this.scrollArea;
    this.scrollRows.forEach(function (row) {
      const top = area.top + row.offset - area.offset;
      const bottom = top + row.height;
      const shown = top >= area.top - 0.5 && bottom <= area.bottom + 0.5;
      row.node.setPosition(row.x, top + row.height / 2);
      row.node.visible = shown;
      if (row.isButton) row.node.interactive = shown;
    });
    if (this.scrollBar) {
      const span = area.bottom - area.top;
      const barHeight = Math.max(72, span * span / area.contentHeight);
      this.scrollBar.height = barHeight;
      this.scrollBar.setPosition(SCREEN_W - 24,
        area.top + barHeight / 2 + (span - barHeight) * area.offset / area.max);
    }
  },
  inventoryRow: function (item, type, offset) {
    const height = type.id === 'food' || type.id === 'weapon' ? 126 : 92;
    const group = DisplayElement().addChildTo(this.body);
    RectangleShape({ width: 940, height: height - 5,
      fill: darkGray, stroke: lightGray, strokeWidth: 4 }).addChildTo(group);
    const title = Label({ text: item.name + ' ×' + item.quantity, fontSize: 45, fill: White })
      .addChildTo(group);
    title.align = 'left';
    title.setPosition(-430, height === 126 ? -28 : 0);
    const data = toho_find_item(item.name, type.id);
    if (data && type.id === 'food') {
      const detail = Label({ text: '気力回復：' + data.data.回復量,
        fontSize: 39, fill: White }).addChildTo(group);
      detail.align = 'left'; detail.setPosition(-430, 34);
    } else if (data && type.id === 'weapon') {
      const detail = Label({ text: '攻撃力：' + toho_attack_text(data.data.攻撃力),
        fontSize: 39, fill: White }).addChildTo(group);
      detail.align = 'left'; detail.setPosition(-430, 34);
    }
    this.addScrollRow(group, offset, height);
    return height;
  },
  render: function () {
    this.clearContent();
    const self = this;
    const rates = toho_discovery_rates();
    this.lastCatalogSize = rates.grandTotal;
    const type = TOHO_ITEM_TYPES.find(function (entry) { return entry.id === self.itemType; });
    const titles = {
      index: '図鑑', itemCategories: 'アイテム図鑑',
      items: type ? type.name + '図鑑' : 'アイテム図鑑', enemies: '敵図鑑',
      itemDetail: 'アイテム詳細', enemyDetail: '敵の詳細',
      history: 'プレイ履歴', historyDetail: 'プレイ履歴の詳細',
    };
    this.panel(CENTER_W, 145, SCREEN_W - 35, 265);
    this.label(titles[this.view] || '記録', CENTER_W, 85, 78);
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
      this.button('アイテム図鑑', CENTER_W, 950, 790, 160, function () {
        self.change('itemCategories');
      }, 58);
      this.button('敵図鑑', CENTER_W, 1180, 790, 160, function () {
        self.change('enemies');
      }, 58);
      return;
    }
    if (this.view === 'itemCategories') {
      this.label('アイテム全体：' + rates.items + '/' + rates.itemTotal + '（' +
        toho_percentage(rates.items, rates.itemTotal) + '%）', CENTER_W, 195, 44);
      const entries = toho_item_catalog();
      const knownIds = new Set(toho_meta.encyclopedia.itemIds);
      TOHO_ITEM_TYPES.forEach(function (itemType, index) {
        const categoryEntries = entries.filter(function (entry) { return entry.type === itemType.id; });
        const known = categoryEntries.filter(function (entry) { return knownIds.has(entry.id); }).length;
        self.button(itemType.name + '：' + known + '/' + categoryEntries.length + '（' +
          toho_percentage(known, categoryEntries.length) + '%）',
          CENTER_W, 440 + index * 285, 940, 145, function () {
            self.itemType = itemType.id;
            self.change('items');
          }, 50);
      });
      return;
    }
    if (this.view === 'items' || this.view === 'enemies') {
      const isItem = this.view === 'items';
      const entries = isItem ? toho_item_catalog().filter(function (entry) {
        return entry.type === self.itemType;
      }) : toho_enemy_catalog();
      const unlocked = new Set(isItem ? toho_meta.encyclopedia.itemIds : toho_meta.encyclopedia.enemyIds);
      const total = entries.length;
      const known = entries.filter(function (entry) { return unlocked.has(entry.id); }).length;
      this.label('解放：' + known + '/' + total + '（' + toho_percentage(known, total) + '%）',
        CENTER_W, 195, 45);
      if (!total) this.label('データを読み込み中です。', CENTER_W, 730, 46);
      entries.slice(this.page * 8, this.page * 8 + 8).forEach(function (entry, index) {
        const found = unlocked.has(entry.id);
        const title = found ? entry.name : '？？？';
        const text = String(self.page * 8 + index + 1) + '. ' + title;
        const button = self.button(text, CENTER_W, 355 + index * 143, 955, 118, function () {
          if (!found) return;
          self.parentView = self.view;
          self.selected = entry;
          self.view = isItem ? 'itemDetail' : 'enemyDetail';
          self.render();
        }, 45);
        if (!found) {
          button.fontColor = lightGray;
          button.fill = '#292929';
          button.onpointend = function () {};
        }
      });
      this.pages(total, 8);
      return;
    }
    if (this.view === 'itemDetail' || this.view === 'enemyDetail') {
      const entry = this.selected;
      if (!entry) { this.goBack(); return; }
      this.panel(CENTER_W, this.view === 'enemyDetail' ? 930 : 710,
        955, this.view === 'enemyDetail' ? 1300 : 825);
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
        const drops = entry.data.ドロップ || [];
        this.label('ドロップ候補（最大入手数）：', 110, 865, 43, true);
        if (!drops.length) this.label('なし', 125, 975, 43, true);
        if (drops.length) {
          const top = 930;
          const bottom = 1550;
          const pitch = 82;
          const height = 72;
          this.beginScroll('drops', drops.length * pitch - (pitch - height), top, bottom);
          drops.forEach(function (drop, index) {
            const group = DisplayElement().addChildTo(self.body);
            RectangleShape({ width: 935, height: height - 4, fill: darkGray,
              stroke: lightGray, strokeWidth: 4 }).addChildTo(group);
            const label = Label({ text: '・' + drop[0] + ' ×最大' + drop[1],
              fontSize: 43, fill: White }).addChildTo(group);
            label.align = 'left';
            label.setPosition(-422, 0);
            self.addScrollRow(group, index * pitch, height);
          });
          this.positionScrollRows();
        }
      }
      return;
    }
    if (this.view === 'history') {
      const history = toho_meta.history;
      this.label('死亡時の記録（最新10件） / ' + history.length + '件', CENTER_W, 195, 44);
      if (!history.length) {
        this.label('記録はまだありません。', CENTER_W, 700, 52);
        return;
      }
      const pitch = 145;
      const height = 122;
      this.beginScroll('history', history.length * pitch - (pitch - height),
        TOHO_SCROLL_TOP, TOHO_SCROLL_BOTTOM);
      history.forEach(function (entry, i) {
        const title = String(i + 1) + '. ' + entry.days + '日 / ' +
          (entry.distanceMeters / 1000) + 'km';
        const button = self.button(title, CENTER_W, 0, 940, height, function () {
          self.selected = entry;
          self.inventoryOffset = 0;
          self.view = 'historyDetail';
          self.render();
        }, 50);
        self.addScrollRow(button, i * pitch, height);
      });
      this.positionScrollRows();
      return;
    }
    if (this.view === 'historyDetail') {
      const entry = this.selected;
      if (!entry) { this.change('history'); return; }
      // 記録情報枠を従来より1行分下げる。
      this.panel(CENTER_W, 565, 980, 540);
      const stamp = entry.endedAt ? new Date(entry.endedAt).toLocaleString('ja-JP') : '記録日時なし';
      this.label('終了：' + stamp, 95, 385, 43, true);
      this.label('到達：' + (entry.distanceMeters / 1000) + 'km / ' + entry.days + '日', 95, 480, 49, true);
      this.label('死因：' + toho_cause_text(entry.deathCause), 95, 575, 42, true);
      this.label('戦闘回数：' + entry.battleCount + '回', 95, 670, 46, true);
      const items = Array.isArray(entry.items) ? entry.items : [];
      this.label('死亡時の所持品（' + items.length + '種）', CENTER_W, 885, 52);
      const top = 955;
      const bottom = 1550;
      let offset = 0;
      const rows = [];
      TOHO_ITEM_TYPES.forEach(function (itemType) {
        rows.push({ type: itemType, heading: true, offset: offset, height: 94 });
        offset += 103;
        items.filter(function (item) { return item.category === itemType.id; }).forEach(function (item) {
          const height = itemType.id === 'food' || itemType.id === 'weapon' ? 126 : 92;
          rows.push({ type: itemType, item: item, offset: offset, height: height });
          offset += height + 10;
        });
        offset += 20;
      });
      this.beginScroll('inventory', Math.max(0, offset - 30), top, bottom);
      rows.forEach(function (row) {
        if (row.heading) {
          const group = DisplayElement().addChildTo(self.body);
          RectangleShape({ width: 940, height: 90,
            fill: 'rgba(15, 15, 15, 0.9)', stroke: lightGray, strokeWidth: 5 })
            .addChildTo(group);
          Label({ text: '【' + row.type.name + '】', fontSize: 48, fill: White })
            .addChildTo(group).setPosition(0, 0);
          self.addScrollRow(group, row.offset, row.height);
        } else {
          self.inventoryRow(row.item, row.type, row.offset);
        }
      });
      this.positionScrollRows();
      return;
    }
  },
  update: function (app) {
    bgm_check(app);
    // JSONの読み込みがタイトル表示より遅い場合、解放率・一覧を再構築する。
    if (this.lastCatalogSize !== toho_discovery_rates().grandTotal &&
      this.view !== 'itemDetail' && this.view !== 'enemyDetail' && this.view !== 'historyDetail') {
      this.render();
    }
  },
});