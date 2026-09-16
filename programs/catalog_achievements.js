/* The encyclopedia owns discovery; achievement rules consume its canonical catalog. */
function toho_catalog_complete(category) {
  const categories = category === 'all' ? ['food', 'weapon', 'tool', 'material', 'enemy'] : [category];
  if (!categories.every(function (name) {
    return name === 'enemy' || TOHO_ITEM_TYPES.some(function (type) { return type.id === name; });
  })) return false;

  // A zero-length catalog may simply not have finished its asynchronous JSON load.
  return categories.every(function (name) {
    const entries = name === 'enemy' ? toho_enemy_catalog() :
      toho_item_catalog().filter(function (entry) { return entry.type === name; });
    if (!entries.length) return false;
    const ids = name === 'enemy' ? toho_meta.encyclopedia.enemyIds : toho_meta.encyclopedia.itemIds;
    const discovered = new Set(ids);
    return entries.every(function (entry) { return discovered.has(entry.id); });
  });
}
TOHO_ACHIEVEMENT_RULES.catalog = ['catalog', function (rule) {
  return toho_catalog_complete(rule.target);
}];

// Evaluate when discovery is committed, not while rendering the encyclopedia.
const toho_catalog_original_item_unlock = toho_unlock_item;
toho_unlock_item = function () {
  const previous = toho_meta.encyclopedia.itemIds.length;
  const result = toho_catalog_original_item_unlock.apply(this, arguments);
  if (toho_run && toho_run.active && toho_meta.encyclopedia.itemIds.length > previous) {
    toho_achievement_emit('catalog', {});
  }
  return result;
};
const toho_catalog_original_enemy_unlock = toho_unlock_enemy;
toho_unlock_enemy = function () {
  const previous = toho_meta.encyclopedia.enemyIds.length;
  const result = toho_catalog_original_enemy_unlock.apply(this, arguments);
  if (toho_run && toho_run.active && toho_meta.encyclopedia.enemyIds.length > previous) {
    toho_achievement_emit('catalog', {});
  }
  return result;
};
// Award completion obtained on a previous version when the next run checkpoints.
const toho_catalog_original_checkpoint = toho_checkpoint;
toho_checkpoint = function () {
  const result = toho_catalog_original_checkpoint.apply(this, arguments);
  if (!result || !toho_run || !toho_run.active) return result;
  return toho_achievement_emit('catalog', {});
};
