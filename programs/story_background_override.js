/* The shared archive scene normally uses the history background. Its story
 * catalog must instead display the same artwork as the story reader.
 * Loaded after main.js so the original background selection remains available.
 */
const toho_base_background_candidates = background_candidates;
background_candidates = function (sceneConfig, scene) {
  if (sceneConfig.backgroundCategory === 'history' && scene.view === 'stories') {
    return [BACKGROUND_FILES.story];
  }
  return toho_base_background_candidates.apply(this, arguments);
};
