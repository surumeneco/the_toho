/* Browser probe: reproduce the real touch path and record unlock/save internals. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:4173/?debug=storage';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 720, height: 1280 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(msg.type() + ': ' + msg.text()));
  page.on('pageerror', error => consoleMessages.push('pageerror: ' + error.stack));

  async function ready() {
    await page.waitForFunction(() =>
      typeof toho_data_is_ready === 'function' && toho_data_is_ready() &&
      typeof toho_encyclopedia_storage_diagnostic === 'function' &&
      document.querySelector('canvas'));
  }
  async function tapLogical(x, y) {
    const box = await page.locator('canvas').boundingBox();
    assert(box, 'canvas must exist');
    const px = box.x + x * box.width / 1080;
    const py = box.y + y * box.height / 1920;
    console.log('TAP ' + JSON.stringify({ logical: [x, y], viewport: [px, py], box }));
    await page.touchscreen.tap(px, py);
  }
  async function snapshot(label) {
    const value = await page.evaluate(() => ({
      nowScene: typeof now_scene === 'undefined' ? null : now_scene,
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
    }));
    console.log(label + '=' + JSON.stringify(value));
    return value;
  }

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await ready();
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready();
  console.log('afterClear=' + JSON.stringify(await page.evaluate(() => toho_encyclopedia_storage_diagnostic())));

  await tapLogical(540, 900);
  await page.waitForFunction(() => localStorage.getItem('the_toho:progress:v1') !== null);
  const afterStart = await snapshot('afterStart');
  assert.equal(afterStart.nowScene, 'ホーム');
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
        result: result, before: before, after: after,
      });
      return result;
    };
    const originalSet = set_cookies;
    set_cookies = function () {
      const before = toho_encyclopedia_storage_diagnostic();
      const result = originalSet.apply(this, arguments);
      const after = toho_encyclopedia_storage_diagnostic();
      window.__encyclopediaProbe.push({ kind: 'set_cookies', result: result, before: before, after: after });
      return result;
    };
  });

  await tapLogical(880, 1085);
  let acquired = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const state = await page.evaluate(() => ({
      scene: now_scene,
      count: [player.食料, player.武器, player.道具, player.素材].reduce((n, list) =>
        n + (Array.isArray(list) ? list.filter(pair => pair && pair[0] && pair[1] > 0).length : 0), 0),
    }));
    console.log('LOOP ' + i + ' ' + JSON.stringify(state));
    if (state.count > 0) { acquired = true; break; }
    if (state.scene === '戦闘') {
      await tapLogical(880, 1670); // 逃げる
    } else if (state.scene === '逃走') {
      await tapLogical(880, 1475); // 進む
    } else if (state.scene === 'ホーム') {
      await tapLogical(880, 1085); // 探索再開
    }
  }

  const afterAcquisition = await snapshot('afterAcquisition');
  console.log('CONSOLE_TAIL=' + JSON.stringify(consoleMessages.slice(-80)));
  assert(acquired, 'must acquire at least one item through real scene flow');
  assert(afterAcquisition.inventory.length > 0);

  await browser.close();
})().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
