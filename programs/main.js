/* Background images are optional: missing files must never block GameApp's asset loader. */
const BACKGROUND_FILES = Object.freeze({
  title: 'images/backgrounds/title.webp',
  base_day: 'images/backgrounds/base_day.webp',
  base_night: 'images/backgrounds/base_night.webp',
  exploration: [
    { fromMeters: 0, file: 'images/backgrounds/exploration_000.webp' },
    { fromMeters: 50000, file: 'images/backgrounds/exploration_050.webp' },
    { fromMeters: 100000, file: 'images/backgrounds/exploration_100.webp' },
  ],
  result: 'images/backgrounds/result.webp',
  history: 'images/backgrounds/history.webp',
  story: 'images/backgrounds/story_default.webp',
});

// Future named stories can register an override without changing scene categories.
const STORY_BACKGROUND_FILES = Object.create(null);
function register_story_background(storyId, file) {
  if (typeof storyId !== 'string' || !storyId || typeof file !== 'string' || !file) return;
  STORY_BACKGROUND_FILES[storyId] = file;
}

const backgroundImageCache = Object.create(null);
function load_background_image(file) {
  if (!backgroundImageCache[file]) {
    const url = new URL(file, path);
    url.searchParams.set('v', version);
    backgroundImageCache[file] = new Promise(function (resolve) {
      const image = new window.Image();
      image.onload = function () {
        resolve(image.naturalWidth > 0 && image.naturalHeight > 0 ? image : null);
      };
      image.onerror = function () {
        console.warn('背景画像を読み込めません。背景色へフォールバックします:', file);
        resolve(null);
      };
      image.src = url.href;
    });
  }
  return backgroundImageCache[file];
}

function background_candidates(sceneConfig, scene) {
  const category = sceneConfig.backgroundCategory;
  if (category === 'exploration') {
    const meters = Number(player.移動距離);
    const distance = Number.isFinite(meters) && meters >= 0 ? meters : 0;
    const stages = BACKGROUND_FILES.exploration;
    let file = stages[0].file;
    for (let i = 1; i < stages.length; i++) {
      if (distance >= stages[i].fromMeters) file = stages[i].file;
    }
    return file === stages[0].file ? [file] : [file, stages[0].file];
  }
  if (category === 'story') {
    const custom = scene.storyBackgroundPath ||
      (scene.storyId && STORY_BACKGROUND_FILES[scene.storyId]);
    return custom && custom !== BACKGROUND_FILES.story
      ? [custom, BACKGROUND_FILES.story]
      : [BACKGROUND_FILES.story];
  }
  return typeof BACKGROUND_FILES[category] === 'string'
    ? [BACKGROUND_FILES[category]] : [];
}

function install_scene_backgrounds(app) {
  app.on('enterframe', function () {
    const manager = app.rootScene;
    if (!manager || typeof manager.getCurrentIndex !== 'function') return;
    const scene = app.currentScene;
    const config = manager.scenes[manager.getCurrentIndex()];
    if (!config || !scene || scene === manager) return;
    const candidates = background_candidates(config, scene);
    const requestKey = candidates.join('|');
    if (scene._backgroundRequestKey === requestKey) return;
    scene._backgroundRequestKey = requestKey;

    function tryNext(index) {
      if (scene._backgroundRequestKey !== requestKey) return;
      if (index >= candidates.length) {
        if (scene._backgroundLayer) scene._backgroundLayer.remove();
        scene._backgroundLayer = null;
        return; // Original scene backgroundColor remains visible.
      }
      load_background_image(candidates[index]).then(function (image) {
        if (scene._backgroundRequestKey !== requestKey) return;
        if (!image) { tryNext(index + 1); return; }

        const layer = phina.display.DisplayElement({ width: SCREEN_W, height: SCREEN_H });
        layer.setPosition(CENTER_W, CENTER_H);
        layer.interactive = false;
        layer.draw = function (canvas) {
          const context = canvas.context;
          const imageWidth = image.naturalWidth;
          const imageHeight = image.naturalHeight;
          const scale = Math.max(SCREEN_W / imageWidth, SCREEN_H / imageHeight);
          const cropWidth = SCREEN_W / scale;
          const cropHeight = SCREEN_H / scale;
          context.save();
          context.drawImage(image,
            (imageWidth - cropWidth) / 2, (imageHeight - cropHeight) / 2,
            cropWidth, cropHeight,
            -SCREEN_W / 2, -SCREEN_H / 2, SCREEN_W, SCREEN_H);
          // Keep the existing white labels readable without editing the artwork.
          context.fillStyle = 'rgba(0, 0, 0, 0.35)';
          context.fillRect(-SCREEN_W / 2, -SCREEN_H / 2, SCREEN_W, SCREEN_H);
          context.restore();
        };
        if (scene._backgroundLayer) scene._backgroundLayer.remove();
        layer.addChildTo(scene);
        // CanvasRenderer paints children in array order: background first, UI afterwards.
        scene.children.splice(scene.children.indexOf(layer), 1);
        scene.children.unshift(layer);
        scene._backgroundLayer = layer;
      });
    }
    tryNext(0);
  });
}

function start_toho_game() {
  if (!toho_data_is_ready()) {
    throw new Error('ゲームデータの変換完了前に起動しようとしました。');
  }
  var app = GameApp({
    width: SCREEN_W,
    height: SCREEN_H,
    fit: false,
    assets: ASSETS,
    fps: 60,
    startLabel: 'タイトル',
    scenes: [
      { label: 'タイトル', className: 'Toho_title_scene_v14', backgroundCategory: 'title' },
      { label: '記録・図鑑', className: 'Toho_archive_scene_v14', backgroundCategory: 'history' },
      { label: 'ホーム', className: 'Home_scene', backgroundCategory: 'base_day' },
      { label: '探索', className: 'Toho_search_scene', backgroundCategory: 'exploration' },
      { label: '戦闘', className: 'Toho_battle_scene', backgroundCategory: 'exploration' },
      { label: '勝利', className: 'Toho_win_scene', backgroundCategory: 'exploration' },
      { label: '逃走', className: 'Toho_escape_scene', backgroundCategory: 'exploration' },
      { label: '入手', className: 'Get_scene', backgroundCategory: 'exploration' },
      { label: '制作', className: 'Toho_craft_scene_v14', backgroundCategory: 'base_day' },
      { label: '持ち物', className: 'Inventory_scene', backgroundCategory: 'base_day' },
      { label: '睡眠', className: 'Toho_sleep_scene', backgroundCategory: 'base_night' },
      { label: 'ストーリー', className: 'Story_scene', backgroundCategory: 'story' },
      { label: 'ゲームオーバー', className: 'Gameover_scene', backgroundCategory: 'result' },
      { label: 'リフレッシュ', className: 'Refresh_scene', backgroundCategory: null },
    ],
  });
  install_scene_backgrounds(app);
  install_achievement_notifications(app);
  app.run();
}

function show_data_load_error(error) {
  console.error('ゲームデータの読み込みに失敗したため起動を中止しました。', error);
  const failed = toho_data_failed_keys();
  const notice = document.createElement('div');
  notice.style.cssText = 'max-width:720px;padding:32px;color:white;background:#1e1e1e;font-family:sans-serif;line-height:1.7;text-align:center;';
  notice.textContent = 'ゲームデータの読み込みに失敗しました。ページを再読み込みしてください。' +
    (failed.length ? ' (' + failed.join(', ') + ')' : '');
  document.body.appendChild(notice);
}

/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    中央処理
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.main(function () {
  // JSON読み込みと変換が完了してからGameAppを生成する。図鑑や探索が空配列を参照する競合を防ぐ。
  toho_data_ready.then(start_toho_game).catch(show_data_load_error);
});
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
