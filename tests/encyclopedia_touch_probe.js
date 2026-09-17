/* Browser regression: real Phina handlers, bypassing only DOM-to-canvas input dispatch. */
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

  // Test-only instrumentation: expose GameApp without modifying production main.js.
  await page.route('**/programs/main.js*', async route => {
    const response = await route.fetch();
    let body = await response.text();
    body = body.replace(
      'install_scene_backgrounds(app);',
      'window.__toho_app = app; install_scene_backgrounds(app);'
    );
    await route.fulfill({ response, body });
  });

  async function ready() {
    await page.waitForFunction(() =>
      typeof toho_data_is_ready === 'function' && toho_data_is_ready() &&
      typeof toho_encyclopedia_storage_diagnostic === 'function' &&
      window.__toho_app && document.querySelector('canvas'));
  }
  async function sceneLabel() {
    return page.evaluate(() => {
      const manager = window.__toho_app.rootScene;
      const config = manager.scenes[manager.getCurrentIndex()];
      return config ? config.label : null;
    });
  }
  async function waitScene(label) {
    await page.waitForFunction(expected => {
      const manager = window.__toho_app && window.__toho_app.rootScene;
      if (!manager) return false;
      const config = manager.scenes[manager.getCurrentIndex()];
      return config && config.label === expected;
    }, label);
  }
  async function snapshot(label) {
    const value = await page.evaluate(() => {
      const manager = window.__toho_app.rootScene;
      const config = manager.scenes[manager.getCurrentIndex()];
      const setProbe = new Set(['alpha', 'beta']);
      return {
        sceneLabel: config ? config.label : null,
        tracking: !!(player && player.__toho_tracking),
        arrayFromSetProbe: Array.from(setProbe),
        spreadSetProbe: [...setProbe],
        inventory: [
          ['food', player.食料], ['weapon', player.武器], ['tool', player.道具], ['material', player.素材],
        ].flatMap(([type, list]) => (Array.isArray(list) ? list : [])
          .filter(pair => pair && pair[0] && pair[1] > 0)
          .map(pair => ({ type, name: pair[0].名前, quantity: pair[1] }))),
        memory: JSON.parse(JSON.stringify(toho_meta.encyclopedia)),
        diagnostic: toho_encyclopedia_storage_diagnostic(),
        rawMeta: JSON.parse(localStorage.getItem('the_toho:meta:v1') || 'null'),
        rawDedicated: JSON.parse(localStorage.getItem('the_toho:encyclopedia:v1') || 'null'),
        progressExists: localStorage.getItem('the_toho:progress:v1') !== null,
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
  await ready();
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready();
  await waitScene('タイトル');

  // The compatibility fix must restore the native iterable-capable Array.from.
  const compatibility = await page.evaluate(() => ({
    from: Array.from(new Set(['alpha', 'beta'])),
    spread: [...new Set(['alpha', 'beta'])],
  }));
  assert.deepEqual(compatibility.from, ['alpha', 'beta']);
  assert.deepEqual(compatibility.spread, ['alpha', 'beta']);

  // Fire the actual title handler; only browser pointer dispatch is bypassed.
  await page.evaluate(() => {
    window.__toho_app.currentScene.flare('pointend', { pointer: { x: 540, y: 900 } });
  });
  await waitScene('ホーム');
  const afterStart = await snapshot('afterStart');
  assert.equal(afterStart.tracking, true, 'fresh Player must be tracked');

  await page.evaluate(() => {
    window.__encyclopediaProbe = [];
    const originalUnlock = toho_unlock_item;
    toho_unlock_item = function (name, typeHint) {
      const resolved = toho_find_item(name, typeHint);
      const result = originalUnlock.apply(this, arguments);
      window.__encyclopediaProbe.push({
        name: String(name), typeHint: typeHint || null,
        resolved: resolved ? resolved.id : null,
        result,
      });
      return result;
    };
  });

  await flareButton('探索');
  let acquired = false;
  for (let i = 0; i < 100; i++) {
    await sleep(200);
    const state = await currentState();
    if (state.count > 0) { acquired = true; break; }
    if (state.scene === '戦闘') await flareButton('逃げる');
    else if (state.scene === '逃走') await flareButton('進む');
    else if (state.scene === 'ホーム') await flareButton('探索');
  }
  assert(acquired, 'real exploration/Get_scene must acquire at least one item');

  const afterAcquisition = await snapshot('afterAcquisition');
  console.log('CONSOLE_TAIL=' + JSON.stringify(consoleMessages.slice(-40)));
  assert(afterAcquisition.inventory.length > 0);
  assert(afterAcquisition.probe.some(event => event.result && event.resolved), 'unlock must resolve and succeed');
  assert(afterAcquisition.memory.itemIds.length > 0, 'memory encyclopedia must contain acquired item');
  assert.notEqual(afterAcquisition.diagnostic.memory, '0/0');
  assert.notEqual(afterAcquisition.diagnostic.meta, '0/0');
  assert.notEqual(afterAcquisition.diagnostic.dedicated, '0/0');
  assert(afterAcquisition.rawMeta.encyclopedia.itemIds.length > 0);
  assert(afterAcquisition.rawDedicated.itemIds.length > 0);

  const expectedItems = afterAcquisition.rawDedicated.itemIds.slice().sort();
  const expectedEnemies = afterAcquisition.rawDedicated.enemyIds.slice().sort();

  // Follow the actual user flow: return home and abandon the current run.
  if (await sceneLabel() === '入手') {
    await flareButton('帰る');
    await waitScene('ホーム');
  }
  await flareButton('諦める');
  await page.evaluate(() => {
    const scene = window.__toho_app.currentScene;
    const yes = scene._abandonDialog && scene._abandonDialog.elements.find(node => node && node.text === 'はい');
    if (!yes) throw new Error('諦める確認の「はい」が見つかりません');
    yes.flare('pointend', { pointer: { x: yes.x, y: yes.y } });
  });
  await waitScene('タイトル');

  const afterAbandon = await snapshot('afterAbandon');
  assert.equal(afterAbandon.progressExists, false, 'run progress should be deleted by abandon');
  assert.deepEqual(afterAbandon.rawDedicated.itemIds.slice().sort(), expectedItems);
  assert.deepEqual(afterAbandon.rawDedicated.enemyIds.slice().sort(), expectedEnemies);
  assert.deepEqual(afterAbandon.rawMeta.encyclopedia.itemIds.slice().sort(), expectedItems);
  assert.deepEqual(afterAbandon.rawMeta.encyclopedia.enemyIds.slice().sort(), expectedEnemies);

  // Reload from storage and ensure encyclopedia survives with the same IDs.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready();
  await waitScene('タイトル');
  const afterReload = await snapshot('afterReload');
  assert.deepEqual(afterReload.memory.itemIds.slice().sort(), expectedItems);
  assert.deepEqual(afterReload.memory.enemyIds.slice().sort(), expectedEnemies);
  assert.deepEqual(afterReload.rawDedicated.itemIds.slice().sort(), expectedItems);
  assert.deepEqual(afterReload.rawDedicated.enemyIds.slice().sort(), expectedEnemies);
  assert.deepEqual(afterReload.rawMeta.encyclopedia.itemIds.slice().sort(), expectedItems);
  assert.deepEqual(afterReload.rawMeta.encyclopedia.enemyIds.slice().sort(), expectedEnemies);
  assert.notEqual(afterReload.diagnostic.memory, '0/0');
  assert.notEqual(afterReload.diagnostic.meta, '0/0');
  assert.notEqual(afterReload.diagnostic.dedicated, '0/0');

  console.log('PASS: encyclopedia survives acquisition, abandon, and reload');
  await browser.close();
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
