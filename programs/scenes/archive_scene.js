/* タイトルからの図鑑・記録閲覧。プレイ状態には触れない。 */
let toho_archive_entry = 'index';
function toho_attack_text(attack) {
  if (!attack) return '不明';
  const terms = (attack.ダイス || []).map(function (dice) { return dice[0] + 'd' + dice[1]; });
  if (attack.固定値) terms.push(String(attack.固定値));
  return terms.join('+').replace(/\+-/g, '-') || '0';
}
function toho_percentage(known, total) { return total ? Math.floor(100 * known / total) : 0; }

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
      fill: darkGray, stroke: lightGray, strokeWidth: 15, cornerRadius: 0 })
      .addChildTo(this).setPosition(295, 1190).onpointend = function () {
        toho_archive_entry = 'index';
        SoundManager.play('select');
        self.exit('記録・図鑑');
      };
    Button({ text: 'プレイ履歴', fontSize: 49, width: 370, height: 115,
      fill: darkGray, stroke: lightGray, strokeWidth: 15, cornerRadius: 0 })
      .addChildTo(this).setPosition(785, 1190).onpointend = function () {
        toho_archive_entry = 'history';
        SoundManager.play('select');
        self.exit('記録・図鑑');
      };
    // 閲覧ボタンで親シーンのスタート操作が発火しないようにする。
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

phina.define('Toho_battle_scene', {
  superClass: 'Battle_scene',
  init: function (option) {
    this.superInit(option);
    toho_note_encounter(this.敵);
  },
});
phina.define('Toho_win_scene', {
  superClass: 'Win_scene',
  init: function (option) {
    this.superInit(option);
    toho_note_battle_outcome('victory');
  },
});
phina.define('Toho_escape_scene', {
  superClass: 'Escape_scene',
  init: function (option) {
    this.superInit(option);
    toho_note_battle_outcome('escape');
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

// レイアウト基準。既存画面と同じく外枠は白10px、情報枠は灰5px、主操作は灰15px。
const TOHO_ARCHIVE_FOOTER_TOP = 1690;
const TOHO_ARCHIVE_DETAIL_TOP = 300;
const TOHO_ARCHIVE_DETAIL_BOTTOM = TOHO_ARCHIVE_FOOTER_TOP - 40;
const TOHO_ARCHIVE_INVENTORY_TOP = 900;
const TOHO_ARCHIVE_INVENTORY_BOTTOM = TOHO_ARCHIVE_DETAIL_BOTTOM;
const TOHO_HISTORY_TOP = 440;
const TOHO_HISTORY_BOTTOM = 1550;
const TOHO_HISTORY_PITCH = 148;
const TOHO_HISTORY_ROW_HEIGHT = 120;
const TOHO_HISTORY_INSET = 18;

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

    this.on('pointstart', function (e) {
      const area = this.scrollArea;
      const y = e.pointer.y;
      this.scrollActive = !!area && y >= area.top && y <= area.bottom;
      this.dragMoved = false;
      if (this.scrollActive) {
        this.scrollStartY = y;
        this.scrollStartOffset = area.offset;
      }
    });
    const move = function (e) {
      if (!this.scrollActive || !this.scrollArea) return;
      const distance = e.pointer.y - this.scrollStartY;
      if (Math.abs(distance) > 12) this.dragMoved = true;
      if (!this.dragMoved) return;
      const area = this.scrollArea;
      area.offset = Math.max(0, Math.min(area.max, this.scrollStartOffset - distance));
      this.keepScrollOffset();
      this.positionScrollRows();
    };
    this.on('pointmove', move);
    this.on('pointstay', move);
    this.on('pointend', function () { this.scrollActive = false; });
  },
  clearContent: function () {
    this.body.children.slice().forEach(function (child) { child.remove(); });
    this.scrollArea = null;
    this.scrollRows = [];
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
  // 通常ボタンは15px、ページ操作だけ既存の小ボタンに合わせて10px。
  button: function (text, x, y, width, height, action, fontSize, compact) {
    const self = this;
    const button = Button({ text: text, fontSize: fontSize || 49,
      width: width || 440, height: height || 118, cornerRadius: 0,
      fill: darkGray, stroke: lightGray, strokeWidth: compact ? 10 : 15 }).addChildTo(this.body);
    button.setPosition(x, y);
    button.onpointend = function () {
      if (self.dragMoved) return;
      SoundManager.play('select');
      action();
    };
    return button;
  },
  // ヘッダー・フッターは元の持ち物画面と同じ白10pxの外枠。
  frame: function (x, y, width, height) {
    return RectangleShape({ width: width, height: height,
      fill: Black, stroke: White, strokeWidth: 10, cornerRadius: 0 })
      .addChildTo(this.body).setPosition(x, y);
  },
  // 内容パネルは既存のText_windowと同じ灰色5px、角丸なし。
  panel: function (x, y, width, height) {
    return RectangleShape({ width: width, height: height,
      fill: darkGray, stroke: lightGray, strokeWidth: 5, cornerRadius: 0 })
      .addChildTo(this.body).setPosition(x, y);
  },
  change: function (view) {
    this.view = view;
    this.selected = null;
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
      this.render(); // 一覧のスクロール位置は保持。
    } else if (this.view === 'items' || this.view === 'enemies') {
      this.change('index');
    } else {
      this.exit('タイトル');
    }
  },
  pages: function (length, size) {
    const self = this;
    const count = Math.max(1, Math.ceil(length / size));
    this.label((this.page + 1) + ' / ' + count + 'ページ', CENTER_W, 1610, 44);
    if (this.page > 0) this.button('前へ', 230, 1610, 290, 100, function () {
      self.page--;
      self.render();
    }, 45, true);
    if (this.page < count - 1) this.button('次へ', 850, 1610, 290, 100, function () {
      self.page++;
      self.render();
    }, 45, true);
  },
  beginScroll: function (kind, contentHeight, top, bottom) {
    const saved = kind === 'history' ? this.historyOffset :
      kind === 'inventory' ? this.inventoryOffset : this.dropOffset;
    const max = Math.max(0, contentHeight - (bottom - top));
    this.scrollArea = { kind: kind, top: top, bottom: bottom,
      offset: Math.min(saved, max), max: max, contentHeight: contentHeight };
    this.keepScrollOffset();
    if (max > 0) {
      this.scrollBar = RectangleShape({ width: 12, height: 85,
        fill: White, strokeWidth: 0, cornerRadius: 0 }).addChildTo(this.body);
      this.positionScrollBar();
    }
  },
  keepScrollOffset: function () {
    if (!this.scrollArea) return;
    if (this.scrollArea.kind === 'history') this.historyOffset = this.scrollArea.offset;
    else if (this.scrollArea.kind === 'inventory') this.inventoryOffset = this.scrollArea.offset;
    else this.dropOffset = this.scrollArea.offset;
  },
  positionScrollBar: function () {
    if (!this.scrollBar || !this.scrollArea || !this.scrollArea.max) return;
    const area = this.scrollArea;
    const span = area.bottom - area.top;
    const height = Math.max(62, span * span / area.contentHeight);
    this.scrollBar.height = height;
    // 所持品欄のバーはパネル内、その他はクリップ領域の右側に配置。
    const x = area.kind === 'inventory' ? 1000 : SCREEN_W - 29;
    this.scrollBar.setPosition(x,
      area.top + height / 2 + (span - height) * area.offset / area.max);
  },
  // CanvasRendererのclip経路を利用し、Phina部品を領域内にクリップする通常スクロール。
  clippedLayer: function (left, right) {
    const area = this.scrollArea;
    const layer = DisplayElement({ width: SCREEN_W, height: SCREEN_H }).addChildTo(this.body);
    layer.setPosition(CENTER_W, CENTER_H);
    layer.clip = function (canvas) {
      const context = canvas.context;
      context.beginPath();
      context.rect(left - CENTER_W, area.top - CENTER_H,
        right - left, area.bottom - area.top);
    };
    return layer;
  },
  addScrollRow: function (node, x, offset, height, clickable) {
    this.scrollRows.push({ node: node, x: x, offset: offset, height: height,
      clickable: !!clickable });
  },
  positionScrollRows: function () {
    const area = this.scrollArea;
    if (!area) return;
    this.scrollRows.forEach(function (row) {
      const top = area.top + row.offset - area.offset;
      row.node.setPosition(row.x - CENTER_W, top + row.height / 2 - CENTER_H);
      // クリップは描画専用なので、画面外ボタンは入力も明示的に無効化。
      if (row.clickable) {
        row.node.interactive = top >= area.top + 0.5 &&
          top + row.height <= area.bottom - 0.5;
      }
    });
    this.positionScrollBar();
  },
  render: function () {
    this.clearContent();
    const self = this;
    const rates = toho_discovery_rates();
    this.lastCatalogSize = rates.grandTotal;
    const itemType = TOHO_ITEM_TYPES.find(function (type) { return type.id === self.itemType; });
    const titles = {
      index: '図鑑', items: itemType ? itemType.name + '図鑑' : 'アイテム図鑑',
      enemies: '敵図鑑', itemDetail: 'アイテム詳細', enemyDetail: '敵の詳細',
      history: 'プレイ履歴', historyDetail: 'プレイ記録の詳細',
    };
    this.frame(CENTER_W, 140, SCREEN_W, 280);
    this.label(titles[this.view] || '記録', CENTER_W, 160, 78);
    this.frame(CENTER_W, (TOHO_ARCHIVE_FOOTER_TOP + SCREEN_H) / 2,
      SCREEN_W, SCREEN_H - TOHO_ARCHIVE_FOOTER_TOP);
    this.button('戻る', 830, 1800, 350, 115, function () { self.goBack(); });
    this.label('バージョン：' + version, 25, 1900, 33, true);

    if (this.view === 'index') {
      this.label('総合解放率：' + rates.total + '/' + rates.grandTotal + '（' +
        toho_percentage(rates.total, rates.grandTotal) + '%）', CENTER_W, 355, 49);
      const entries = toho_item_catalog();
      const knownIds = new Set(toho_meta.encyclopedia.itemIds);
      TOHO_ITEM_TYPES.forEach(function (type, index) {
        const category = entries.filter(function (entry) { return entry.type === type.id; });
        const known = category.filter(function (entry) { return knownIds.has(entry.id); }).length;
        self.button(type.name + '図鑑　' + known + '/' + category.length + '（' +
          toho_percentage(known, category.length) + '%）',
          CENTER_W, 540 + index * 230, 940, 144, function () {
            self.itemType = type.id;
            self.change('items');
          }, 47);
      });
      this.button('敵図鑑　' + rates.enemies + '/' + rates.enemyTotal + '（' +
        toho_percentage(rates.enemies, rates.enemyTotal) + '%）',
        CENTER_W, 1460, 940, 144, function () { self.change('enemies'); }, 47);
      return;
    }
    if (this.view === 'items' || this.view === 'enemies') {
      const isItem = this.view === 'items';
      const entries = isItem ? toho_item_catalog().filter(function (entry) {
        return entry.type === self.itemType;
      }) : toho_enemy_catalog();
      const unlocked = new Set(isItem ? toho_meta.encyclopedia.itemIds : toho_meta.encyclopedia.enemyIds);
      if (!entries.length) this.label('データを読み込み中です。', CENTER_W, 730, 46);
      entries.slice(this.page * 8, this.page * 8 + 8).forEach(function (entry, index) {
        const found = unlocked.has(entry.id);
        const title = String(self.page * 8 + index + 1) + '. ' + (found ? entry.name : '？？？');
        const button = self.button(title, CENTER_W, 365 + index * 143, 955, 118, function () {
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
      this.pages(entries.length, 8);
      return;
    }
    if (this.view === 'itemDetail' || this.view === 'enemyDetail') {
      const entry = this.selected;
      if (!entry) { this.goBack(); return; }
      // アイテム・敵の詳細枠は同一の上端・下端で揃える。
      this.panel(CENTER_W,
        (TOHO_ARCHIVE_DETAIL_TOP + TOHO_ARCHIVE_DETAIL_BOTTOM) / 2,
        955, TOHO_ARCHIVE_DETAIL_BOTTOM - TOHO_ARCHIVE_DETAIL_TOP);
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
          const pitch = 84;
          this.beginScroll('drops', drops.length * pitch, 935, 1505);
          const layer = this.clippedLayer(105, 980);
          drops.forEach(function (drop, index) {
            const item = Label({ text: '・' + drop[0] + '　最大' + drop[1],
              fontSize: 44, fill: White }).addChildTo(layer);
            item.align = 'left';
            self.addScrollRow(item, 125, index * pitch, pitch, false);
          });
          this.positionScrollRows();
        }
      }
      return;
    }
    if (this.view === 'history') {
      const history = toho_meta.history;
      this.label('死亡時の記録（最新10件） / ' + history.length + '件', CENTER_W, 350, 44);
      if (!history.length) {
        this.label('記録はまだありません。', CENTER_W, 700, 52);
        return;
      }
      // 先頭・末尾に余白を確保し、Buttonのstrokeがクリップで欠けないようにする。
      const contentHeight = TOHO_HISTORY_INSET * 2 + TOHO_HISTORY_ROW_HEIGHT +
        (history.length - 1) * TOHO_HISTORY_PITCH;
      this.beginScroll('history', contentHeight, TOHO_HISTORY_TOP, TOHO_HISTORY_BOTTOM);
      const layer = this.clippedLayer(75, 1005);
      history.forEach(function (entry, index) {
        const title = String(index + 1) + '. ' + entry.days + '日 / ' +
          (entry.distanceMeters / 1000) + 'km';
        const button = Button({ text: title, fontSize: 50, width: 926,
          height: TOHO_HISTORY_ROW_HEIGHT, cornerRadius: 0,
          fill: darkGray, stroke: lightGray, strokeWidth: 15 }).addChildTo(layer);
        button.onpointend = function () {
          if (self.dragMoved || self.view !== 'history') return;
          SoundManager.play('select');
          self.selected = entry;
          self.inventoryOffset = 0;
          self.view = 'historyDetail';
          self.render();
        };
        self.addScrollRow(button, CENTER_W,
          TOHO_HISTORY_INSET + index * TOHO_HISTORY_PITCH,
          TOHO_HISTORY_ROW_HEIGHT, true);
      });
      this.positionScrollRows();
      return;
    }
    if (this.view === 'historyDetail') {
      const entry = this.selected;
      if (!entry) { this.change('history'); return; }
      this.panel(CENTER_W, 570, 980, 480);
      const stamp = entry.endedAt ? new Date(entry.endedAt).toLocaleString('ja-JP') : '記録日時なし';
      this.label('終了：' + stamp, 95, 385, 43, true);
      this.label('到達：' + (entry.distanceMeters / 1000) + 'km / ' + entry.days + '日', 95, 480, 49, true);
      this.label('死因：' + toho_cause_text(entry.deathCause), 95, 575, 42, true);
      if (entry.recordVersion === 2) {
        this.label('戦闘回数（勝利）：' + entry.battleCount + '回', 95, 670, 45, true);
        this.label('逃走回数：' + entry.escapeCount + '回', 95, 765, 45, true);
      } else {
        this.label('戦闘回数（旧・開始数）：' + entry.battleCount + '回', 95, 670, 42, true);
        this.label('逃走回数：記録なし（旧仕様）', 95, 765, 42, true);
      }
      // 所持品は見出し・枠とも約1.5行上に移動し、下端を詳細枠と揃える。
      const items = Array.isArray(entry.items) ? entry.items : [];
      this.label('死亡時の所持品（' + items.length + '種）', CENTER_W, 865, 52);
      this.panel(CENTER_W,
        (TOHO_ARCHIVE_INVENTORY_TOP + TOHO_ARCHIVE_INVENTORY_BOTTOM) / 2,
        960, TOHO_ARCHIVE_INVENTORY_BOTTOM - TOHO_ARCHIVE_INVENTORY_TOP);
      const rows = [];
      let offset = 8;
      TOHO_ITEM_TYPES.forEach(function (type) {
        rows.push({ type: type, heading: true, offset: offset, height: 90 });
        offset += 135; // 見出し直下の区切り線を下げても、次の所持品と重ねない。
        items.filter(function (item) { return item.category === type.id; }).forEach(function (item) {
          rows.push({ item: item, offset: offset, height: 74 });
          offset += 74;
        });
        offset += 15;
      });
      this.beginScroll('inventory', offset + 8,
        TOHO_ARCHIVE_INVENTORY_TOP + 25,
        TOHO_ARCHIVE_INVENTORY_BOTTOM - 25);
      const layer = this.clippedLayer(85, 975);
      rows.forEach(function (row) {
        const heading = row.heading;
        const text = heading ? '【' + row.type.name + '】' :
          '・' + row.item.name + ' ×' + row.item.quantity;
        const item = Label({ text: text, fontSize: heading ? 47 : 44,
          fill: White }).addChildTo(layer);
        item.align = 'left';
        self.addScrollRow(item, heading ? 118 : 135, row.offset, row.height, false);
        if (heading) {
          const line = RectangleShape({ width: 842, height: 2,
            fill: lightGray, strokeWidth: 0, cornerRadius: 0 }).addChildTo(layer);
          self.addScrollRow(line, CENTER_W, row.offset + 104, 2, false);
        }
      });
      this.positionScrollRows();
    }
  },
  update: function (app) {
    bgm_check(app);
    if (this.lastCatalogSize !== toho_discovery_rates().grandTotal &&
      this.view !== 'itemDetail' && this.view !== 'enemyDetail' && this.view !== 'historyDetail') {
      this.render();
    }
  },
});
