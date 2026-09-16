/* The shared archive update redraws whenever lastCatalogSize differs. Keep the
 * achievement view in sync too, or its rows are rebuilt every frame while scrolling. */
const toho_achievement_base_render = Toho_archive_scene_v14.prototype.render;
Toho_archive_scene_v14.prototype.render = function () {
  const result = toho_achievement_base_render.call(this);
  if (this.view === 'achievements') {
    this.lastCatalogSize = toho_discovery_rates().grandTotal;
  }
  return result;
};
