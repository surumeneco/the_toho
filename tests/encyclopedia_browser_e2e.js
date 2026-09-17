/* Real-browser regression for encyclopedia persistence.
 * It bypasses only Canvas input/SceneManager, while using production data, Player,
 * Get_scene, unlock/save functions, localStorage, deletion and reload behavior. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:4173/?debug=storage';
const GLOBAL_TIMEOUT_MS = 120000;
let browser = null;
let currentStage = 'bootstrap';

const watchdog = setTimeout(() => {
  console.error('GLOBAL_TIMEOUT after ' + GLOBAL_TIMEOUT_MS + 'ms; stage=' + currentStage);
  process.exit(124);
}, GLOBAL_TIMEOUT_MS);

(async () => {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 720, height: 1280 } });
  page.setDefaultTimeout(15000);
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(msg.type() + ': ' + msg.text()));
  page.on('pageerror', error => consoleMessages.push('pageerror: ' + error.stack));

  function markStage(name) {
    currentStage = name;
    fs.writeFileSync('browser-e2e-stage.txt', name + '\n');
    console.log('STAGE: ' + name);
  }

  async function ready() {
    await page.waitForFunction(() =>
      typeof toho_data_is_ready === 'function' && toho_data_is_ready() &&
      typeof toho_encyclopedia_storage_diagnostic === 'function' &&
      typeof toho_find_item === 'function' && typeof Get_scene === 'function' &&
      typeof Player === 'function');
  }

  async function snapshot(label) {
    const value = await page.evaluate(() => ({
      version: typeof version === 'string' ? version : null,
      tracking: !!(player && player.__toho_tracking),
      achievementTracking: !!(player && player.__toho_achievement_tracking),
      arrayFromSet: Array.from(new Set(['alpha', 'beta'])),
      inventory: [
        ['food', player.食料], ['weapon', player.武器], ['tool', player.道具], ['material', player.素材],
      ].flatMap(([type, list]) => (Array.isArray(list) ? list : [])
        .filter(pair => pair && pair[0] && pair[1] > 0)
        .map(pair => ({
          type, name: pair[0].名前, quantity: pair[1],
          resolved: !!toho_find_item(pair[0].名前, type),
        }))),
      memory: JSON.parse(JSON.stringify(toho_meta.encyclopedia)),
      diagnostic: toho_encyclopedia_storage_diagnostic(),
      rawMeta: JSON.parse(localStorage.getItem('the_toho:meta:v1') || 'null'),
      rawDedicated: JSON.parse(localStorage.getItem('the_toho:encyclopedia:v1') || 'null'),
      progress: localStorage.getItem('the_toho:progress:v1'),
      probe: Array.isArray(window.__encyclopediaProbe) ? window.__encyclopediaProbe.slice() : [],
    }));
    console.log(label + '=' + JSON.stringify(value));
    return value;
  }

  markStage('initial-load');
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await ready();
  await page.evaluate(() => localStorage.clear());

  markStage('reload-after-clear');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready();

  const initial = await snapshot('initial');
  assert.deepEqual(initial.arrayFromSet, ['alpha', 'beta'],
    'browser-native iterable-aware Array.from must survive phina.js loading');
  assert.equal(initial.diagnostic.memory, '0/0');
  assert.equal(initial.diagnostic.meta, '0/0');
  assert.equal(initial.diagnostic.dedicated, '0/0');

  markStage('start-run');
  // This is the state-changing portion of the production title start handler.
  // Canvas pointer dispatch is deliberately excluded because it is unrelated to persistence.
  await page.evaluate(() => {
    toho_start_run();
    player = new Player();
    set_cookies();
  });
  const afterStart = await snapshot('afterStart');
  assert.equal(afterStart.tracking, true, 'fresh Player must be encyclopedia-tracked');

  markStage('production-get-scene');
  await page.evaluate(() => {
    window.__encyclopediaProbe = [];
    const originalUnlock = toho_unlock_item;
    toho_unlock_item = function (name, typeHint) {
      const resolved = toho_find_item(name, typeHint);
      const before = toho_encyclopedia_storage_diagnostic();
      const result = originalUnlock.apply(this, arguments);
      const after = toho_encyclopedia_storage_diagnostic();
      window.__encyclopediaProbe.push({
        name: String(name), typeHint: typeHint || null,
        resolved: resolved ? { id: resolved.id, type: resolved.type, name: resolved.name } : null,
        result, before, after,
      });
      return result;
    };

    // Production Get_scene.init performs real random drop selection -> player.get_item -> set_cookies.
    window.__getSceneProbe = Get_scene();
  });

  const afterGet = await snapshot('afterGetScene');
  await page.screenshot({ path: 'browser-e2e-after-acquisition.png', fullPage: true });
  assert(afterGet.inventory.length > 0, 'Get_scene must add at least one item');
  assert(afterGet.inventory.every(item => item.resolved), 'every acquired item must resolve in catalog');
  assert(afterGet.probe.length > 0, 'real acquisition/checkpoint must call toho_unlock_item');
  assert(afterGet.probe.some(event => event.resolved && event.result === true),
    'at least one unlock must resolve and save successfully');
  assert(afterGet.memory.itemIds.length > 0, 'memory encyclopedia must contain acquired item');
  assert(afterGet.rawMeta && afterGet.rawMeta.encyclopedia.itemIds.length > 0,
    'common meta must contain acquired item');
  assert(afterGet.rawDedicated && afterGet.rawDedicated.itemIds.length > 0,
    'dedicated encyclopedia copy must contain acquired item');

  const expectedItems = afterGet.rawDedicated.itemIds.slice().sort();
  const expectedEnemies = afterGet.rawDedicated.enemyIds.slice().sort();

  markStage('delete-run-progress');
  // Home's abandon confirmation ultimately calls this function.
  await page.evaluate(() => delete_cookies());
  const afterDelete = await snapshot('afterDeleteCookies');
  assert.equal(afterDelete.progress, null, 'abandon path must delete only current-run progress');
  assert.deepEqual(afterDelete.rawMeta.encyclopedia.itemIds.slice().sort(), expectedItems);
  assert.deepEqual(afterDelete.rawDedicated.itemIds.slice().sort(), expectedItems);

  markStage('reload-persistent-state');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready();
  const afterReload = await snapshot('afterReload');
  await page.screenshot({ path: 'browser-e2e-after-reload.png', fullPage: true });
  assert.deepEqual(afterReload.memory.itemIds.slice().sort(), expectedItems);
  assert.deepEqual(afterReload.memory.enemyIds.slice().sort(), expectedEnemies);
  assert.deepEqual(afterReload.rawMeta.encyclopedia.itemIds.slice().sort(), expectedItems);
  assert.deepEqual(afterReload.rawDedicated.itemIds.slice().sort(), expectedItems);
  assert.notEqual(afterReload.diagnostic.memory, '0/0');
  assert.notEqual(afterReload.diagnostic.meta, '0/0');
  assert.notEqual(afterReload.diagnostic.dedicated, '0/0');

  console.log('CONSOLE_TAIL=' + JSON.stringify(consoleMessages.slice(-60)));
  console.log('PASS: browser Get_scene -> encyclopedia persistence -> abandon deletion -> reload');
  clearTimeout(watchdog);
  await browser.close();
  browser = null;
})().catch(async error => {
  console.error('FAILED_STAGE: ' + currentStage);
  console.error(error && error.stack ? error.stack : error);
  if (browser) {
    try { await browser.close(); } catch (_) {}
  }
  clearTimeout(watchdog);
  process.exit(1);
});
