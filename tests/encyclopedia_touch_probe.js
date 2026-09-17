/* Browser probe: run real Phina handlers while bypassing only DOM-to-canvas input dispatch. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:4173/?debug=storage';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 720, height: 1280 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(msg.type() + ': ' + msg.text()));
  page.on('pageerror', error => consoleMessages.push('pageerror: ' + error.stack));

  await page.route('**/programs/main.js*', async route => {
    const response = await route.fetch();
    let body = await response.text();
    body = body.replace(
      'install_scene_backgrounds(app);',
      'window.__toho_app = app; install_scene_backgrounds(app);'
    );
    await route.fulfill({ response, body });
  });

  async function readyAtTitle() {
    await page.waitForFunction(() => {
      if (!(typeof toho_data_is_ready === 'function' && toho_data_is_ready() &&
        typeof toho_encyclopedia_storage_diagnostic === 'function' &&
        window.__toho_app && document.querySelector('canvas'))) return false;
      const manager = window.__toho_app.rootScene;
      if (!manager || typeof manager.getCurrentIndex !== 'function') return false;
      const scene = manager.scenes[manager.getCurrentIndex()];
      return !!scene && scene.label === 'タイトル';
    });
  }
  async function snapshot(label) {
    const value = await page.evaluate(() => {
      const manager = window.__toho_app.rootScene;
      const config = manager && manager.scenes && manager.scenes[manager.getCurrentIndex()];
      return {
        sceneLabel: config ? config.label : null,
        legacyNowScene: typeof now_scene === 'undefined' ? null : now_scene,
        tracking: !!(player && player.__toho_tracking),
        achievementTracking: !!(player && player.__toho_achievement_tracking),
        inventory: [
          ['food', player.食料], ['weapon', player.武器], ['tool', player.道具], ['material', player.素材],
        ].flatMap(([type, list]) => (Array.isArray(list) ? list : []).filter(pair => pair && pair[0] && pair[1] > 0)
          .map(pair => ({ type, name: pair[0].名前, quantity: pair[1], resolved: !!toho_find_item(pair[0].名前, type) }))),
        memory: JSON.parse(JSON.stringify(toho_meta.encyclopedia)),
        diagnostic: toho_encyclopedia_storage_diagnostic(),
        progress: localStorage.getItem('the_toho:progress:v1'),
        meta: localStorage.getItem('the_toho:meta:v1'),
        dedicated: localStorage.getItem('the_toho:encyclopedia:v1'),
        probe: Array.isArray(window.__encyclopediaProbe) ? window.__encyclopediaProbe.slice() : [],
      };
    });
    console.log(label + '=' + JSON.stringify(value));
    return value;
  }
  async function currentState() {
    return page.evaluate(() => {
      const manager = window.__toho_app.rootScene;
      const config = manager.scenes[manager.getCurrentIndex()];
      return {
        scene: config ? config.label : null,
        count: [player.食料, player.武器, player.道具, player.素材].reduce((n, list) =>
          n + (Array.isArray(list) ? list.filter(pair => pair && pair[0] && pair[1] > 0).length : 0), 0),
      };
    });
  }
  async function flareButton(text) {
    await page.evaluate(text => {
      const scene = window.__toho_app.currentScene;
      const button = scene.children.find(child => child && child.text === text);
      if (!button) throw new Error('ボタンが見つかりません: ' + text);
      button.flare('pointend', { pointer: { x: button.x, y: button.y } });
    }, text);
  }

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await readyAtTitle();
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await readyAtTitle();
  console.log('afterClear=' + JSON.stringify(await page.evaluate(() => toho_encyclopedia_storage_diagnostic())));

  await page.evaluate(() => {
    window.__toho_app.currentScene.flare('pointend', { pointer: { x: 540, y: 900 } });
  });
  await page.waitForFunction(() => {
    const manager = window.__toho_app.rootScene;
    const scene = manager.scenes[manager.getCurrentIndex()];
    return scene && scene.label === 'ホーム';
  });
  const afterStart = await snapshot('afterStart');
  assert.equal(afterStart.sceneLabel, 'ホーム');
  assert.equal(afterStart.tracking, true, 'fresh Player must be tracked');

  await page.evaluate(() => {
    window.__encyclopediaProbe = [];
    const originalUnlock = toho_unlock_item;
    toho_unlock_item = function (name, typeHint) {
      const resolved = toho_find_item(name, typeHint);
      const before = toho_encyclopedia_storage_diagnostic();
      const result = originalUnlock.apply(this, arguments);
      const after = toho_encyclopedia_storage_diagnostic();
      window.__encyclopediaProbe.push({
        kind: 'unlock', name: String(name), typeHint: typeHint || null,
        resolved: resolved ? { id: resolved.id, type: resolved.type, name: resolved.name } : null,
        result, before, after,
      });
      return result;
    };
    const originalSet = set_cookies;
    set_cookies = function () {
      const before = toho_encyclopedia_storage_diagnostic();
      const result = originalSet.apply(this, arguments);
      const after = toho_encyclopedia_storage_diagnostic();
      window.__encyclopediaProbe.push({ kind: 'set_cookies', result, before, after });
      return result;
    };
  });

  await flareButton('探索');

  let acquired = false;
  for (let i = 0; i < 80; i++) {
    await sleep(200);
    const state = await currentState();
    console.log('LOOP ' + i + ' ' + JSON.stringify(state));
    if (state.count > 0) { acquired = true; break; }
    if (state.scene === '戦闘') {
      await flareButton('逃げる');
    } else if (state.scene === '逃走') {
      await flareButton('進む');
    } else if (state.scene === 'ホーム') {
      await flareButton('探索');
    }
  }

  const afterAcquisition = await snapshot('afterAcquisition');
  console.log('CONSOLE_TAIL=' + JSON.stringify(consoleMessages.slice(-80)));
  assert(acquired, 'real exploration/Get_scene must acquire at least one item');
  assert(afterAcquisition.inventory.length > 0);
  assert(afterAcquisition.probe.some(event => event.kind === 'unlock'), 'unlock must be called');
  assert(afterAcquisition.memory.itemIds.length > 0, 'memory encyclopedia must contain acquired item');
  assert.notEqual(afterAcquisition.diagnostic.meta, '0/0', 'meta encyclopedia must persist acquired item');
  assert.notEqual(afterAcquisition.diagnostic.dedicated, '0/0', 'dedicated encyclopedia copy must persist acquired item');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await readyAtTitle();
  const afterReload = await snapshot('afterReload');
  assert.notEqual(afterReload.diagnostic.meta, '0/0', 'meta encyclopedia must survive reload');
  assert.notEqual(afterReload.diagnostic.dedicated, '0/0', 'dedicated encyclopedia copy must survive reload');

  await browser.close();
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
