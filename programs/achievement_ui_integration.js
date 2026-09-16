/* The shared archive update redraws whenever lastCatalogSize differs. Keep the
 * achievement view in sync too, or its rows are rebuilt every frame while scrolling. */
const toho_achievement_base_render = Toho_archive_scene_v14.prototype.render;
Toho_archive_scene_v14.prototype.render = function () {
  const result = toho_achievement_base_render.call(this);
  if (this.view === 'achievements') {
    this.lastCatalogSize = toho_discovery_rates().grandTotal;
    // The achievement renderer places its background RectangleShape first in each row.
    // Keep unlocked rows unchanged; distinguish locked rows with a slightly darker fill.
    const unlocked = new Set((toho_meta.achievements && toho_meta.achievements.unlockedIds) || []);
    const entries = TOHO_ACHIEVEMENT_DEFINITIONS.slice().sort(function (a, b) {
      return Number(unlocked.has(b.id)) - Number(unlocked.has(a.id));
    });
    this.scrollRows.forEach(function (row, index) {
      if (!unlocked.has(entries[index].id)) row.node.children[0].fill = '#353535';
    });
  }
  return result;
};
