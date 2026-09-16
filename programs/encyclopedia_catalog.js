/* v1.4.3: 図鑑で使用するカタログID・検索処理をこのモジュールに一本化する。 */

function toho_build_item_catalog() {
  const entries = [];
  const seen = new Map();
  const aliases = Object.create(null);

  TOHO_ITEM_TYPES.forEach(function (type) {
    const source = type.data();
    source.forEach(function (data, index) {
      const rawId = toho_id(type.id, index);
      const key = type.id + '\u0000' + data.名前;
      let entry = seen.get(key);

      if (!entry) {
        entry = {
          id: rawId,
          category: type.name,
          type: type.id,
          name: data.名前,
          data: data,
        };
        if (type.id === 'material') entry._tools = [];
        seen.set(key, entry);
        entries.push(entry);
      }
      aliases[rawId] = entry.id;

      if (type.id === 'material') {
        const tool = data.必要道具;
        if (tool && entry._tools.indexOf(tool) === -1) entry._tools.push(tool);
      }
    });
  });

  entries.forEach(function (entry) {
    if (!entry._tools) return;
    entry.data = Object.assign({}, entry.data, {
      必要道具: entry._tools.join(' / '),
    });
    delete entry._tools;
  });

  return { entries: entries, aliases: aliases };
}

function toho_catalog_enemy_id(data, index) {
  if (data && data.名前 === '女の子……？') {
    const stage = { 150000: 1, 152500: 2, 155000: 3 }[data.出現距離];
    if (stage) return 'enemy:girl-stage-' + stage;
  }
  return toho_id('enemy', index);
}

function toho_build_enemy_catalog() {
  const aliases = Object.create(null);
  const entries = enemies_data.map(function (data, index) {
    const rawId = toho_id('enemy', index);
    const id = toho_catalog_enemy_id(data, index);
    aliases[rawId] = id;
    return { id: id, category: '敵', name: data.名前, data: data };
  });
  return { entries: entries, aliases: aliases };
}

// achievements.js による旧ラッパーより後に定義し、表示・解放・実績が同じカタログを参照する。
toho_item_catalog = function () {
  return toho_build_item_catalog().entries;
};
toho_enemy_catalog = function () {
  return toho_build_enemy_catalog().entries;
};
toho_find_item = function (name, typeHint) {
  return toho_item_catalog().find(function (entry) {
    return entry.name === name && (!typeHint || entry.type === typeHint);
  }) || null;
};
toho_find_enemy = function (enemy) {
  return toho_enemy_catalog().find(function (entry) {
    const data = entry.data;
    return data.名前 === enemy.名前 && data.出現距離 === enemy.出現距離 &&
      data.体力 === enemy.体力;
  }) || null;
};

function toho_normalize_encyclopedia_ids() {
  const itemCatalog = toho_build_item_catalog();
  const enemyCatalog = toho_build_enemy_catalog();
  const previousItems = Array.isArray(toho_meta.encyclopedia.itemIds) ?
    toho_meta.encyclopedia.itemIds : [];
  const previousEnemies = Array.isArray(toho_meta.encyclopedia.enemyIds) ?
    toho_meta.encyclopedia.enemyIds : [];

  const itemIds = Array.from(new Set(previousItems.map(function (id) {
    return Object.prototype.hasOwnProperty.call(itemCatalog.aliases, id) ?
      itemCatalog.aliases[id] : id;
  })));
  const enemyIds = Array.from(new Set(previousEnemies.map(function (id) {
    return Object.prototype.hasOwnProperty.call(enemyCatalog.aliases, id) ?
      enemyCatalog.aliases[id] : id;
  })));

  const itemsChanged = itemIds.length !== previousItems.length ||
    itemIds.some(function (id, index) { return id !== previousItems[index]; });
  const enemiesChanged = enemyIds.length !== previousEnemies.length ||
    enemyIds.some(function (id, index) { return id !== previousEnemies[index]; });
  if (!itemsChanged && !enemiesChanged) return true;

  toho_meta.encyclopedia.itemIds = itemIds;
  toho_meta.encyclopedia.enemyIds = enemyIds;
  toho_meta_dirty = true;
  return toho_save_meta();
}

function toho_prepare_encyclopedia_catalog() {
  const missing = TOHO_ITEM_TYPES.filter(function (type) {
    return !Array.isArray(type.data()) || type.data().length === 0;
  }).map(function (type) { return type.id; });
  if (!Array.isArray(enemies_data) || enemies_data.length === 0) missing.push('enemy');
  if (missing.length) {
    throw new Error('図鑑データが空です: ' + missing.join(', '));
  }

  if (!toho_normalize_encyclopedia_ids()) {
    throw new Error('図鑑IDの正規化結果を保存できませんでした。');
  }
  // 既存のlocalStorageセーブで解放記録を取りこぼしていても、現在所持中なら復元する。
  toho_scan_inventory();
  return true;
}
