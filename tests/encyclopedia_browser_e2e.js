/* Run with Playwright after serving the repository root on http://127.0.0.1:4173 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:4173/?debug=storage';
const STAGE_TIMEOUT_MS = 20000;
const GLOBAL_TIMEOUT_MS = 120000;

let browser = null;
let currentStage = 'bootstrap';
const watchdog = setTimeout(() => {
  console.error('GLOBAL_TIMEOUT after ' + GLOBAL_TIMEOUT_MS + 'ms; stage=' + currentStage);
  process.exit(124);
}, GLOBAL_TIMEOUT_MS);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('Stage timeout: ' + label + ' after ' + ms + 'ms');
      error.code = 'STAGE_TIMEOUT';
      reject(error);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

(async () => {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1080 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(15000);
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(msg.type() + ': ' + msg.text()));
  page.on('pageerror', error => consoleMessages.push('pageerror: ' + error.stack));

  async function safeScreenshot(path) {
    try {
      await withTimeout(page.screenshot({ path, fullPage: true }), 3000, 'screenshot:' + path);
    } catch (error) {
      console.log('SCREENSHOT_FAILED: ' + error.message);
    }
  }

  async function safePageState() {
    try {
      return await withTimeout(page.evaluate(() => ({
        href: location.href,
        canvas: !!document.querySelector('canvas'),
        dataReady: typeof toho_data_is_ready === 'function' ? toho_data_is_ready() : null,
        nowScene: typeof now_scene === 'undefined' ? null : now_scene,
        progress: localStorage.getItem('the_toho:progress:v1'),
        diagnostic: typeof toho_encyclopedia_storage_diagnostic === 'function'
          ? toho_encyclopedia_storage_diagnostic() : null,
      })), 3000, 'page-state');
    } catch (error) {
      return { error: error.message };
    }
  }

  async function stage(name, action) {
    currentStage = name;
    fs.writeFileSync('browser-e2e-stage.txt', name + '\n');
    console.log('STAGE: ' + name);
    try {
      return await withTimeout(Promise.resolve().then(action), STAGE_TIMEOUT_MS, name);
    } catch (error) {
      console.log('FAILED_STAGE: ' + name);
      console.log('ERROR: ' + (error && error.stack ? error.stack : String(error)));
      console.log('CONSOLE_TAIL: ' + JSON.stringify(consoleMessages.slice(-50)));
      if (error.code !== 'STAGE_TIMEOUT') {
        console.log('PAGE_STATE: ' + JSON.stringify(await safePageState()));
        await safeScreenshot('browser-e2e-failure.png');
      }
      throw error;
    }
  }

  async function waitReady() {
    await page.waitForFunction(() => typeof toho_data_is_ready === 'function' && toho_data_is_ready() &&
      typeof toho_encyclopedia_storage_diagnostic === 'function' && document.querySelector('canvas'));
  }

  async function clickLogical(x, y) {
    const box = await page.locator('canvas').boundingBox();
    assert(box, 'canvas must exist');
    const viewportX = box.x + x * box.width / 1080;
    const viewportY = box.y + y * box.height / 1920;
    console.log('CLICK: ' + JSON.stringify({ logical: [x, y], viewport: [viewportX, viewportY], box }));
    await page.mouse.click(viewportX, viewportY);
  }

  async function inventoryCount() {
    return page.evaluate(() => [player.食料, player.武器, player.道具, player.素材]
      .reduce((total, list) => total + (Array.isArray(list)
        ? list.filter(pair => pair && pair[0] && pair[1] > 0).length : 0), 0));
  }

  async function diagnostic(label) {
    const value = await page.evaluate(() => ({
      version: typeof version === 'string' ? version : null,
      inventory: [
        ['food', player.食料], ['weapon', player.武器], ['tool', player.道具], ['material', player.素材],
      ].flatMap(([type, list]) => (Array.isArray(list) ? list : []).filter(pair => pair && pair[0] && pair[1] > 0)
        .map(pair => ({ type, name: pair[0].名前, quantity: pair[1], resolved: !!toho_find_item(pair[0].名前, type) }))),
      memory: JSON.parse(JSON.stringify(toho_meta.encyclopedia)),
      storage: toho_encyclopedia_storage_diagnostic(),
      metaRaw: localStorage.getItem('the_toho:meta:v1'),
      dedicatedRaw: localStorage.getItem('the_toho:encyclopedia:v1'),
      progressRaw: localStorage.getItem('the_toho:progress:v1'),
    }));
    console.log(label + ': ' + JSON.stringify(value));
    return value;
  }

  await stage('initial-load', async () => {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await waitReady();
  });

  await page.evaluate(() => localStorage.clear());
  await stage('reload-after-clear', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady();
  });

  await stage('title-start', async () => {
    await clickLogical(540, 900);
    await page.waitForFunction(() => localStorage.getItem('the_toho:progress:v1') !== null);
  });

  await stage('home-explore-and-acquire', async () => {
    // Use the real random behavior. If exploration enters battle, escape and continue.
    await clickLogical(880, 1085);
    for (let attempt = 1; attempt <= 6; attempt++) {
      await sleep(600);
      const count = await inventoryCount();
      console.log('ACQUISITION_ATTEMPT: ' + attempt + ' inventoryTypes=' + count);
      if (count > 0) return;

      // No item means this attempt most likely entered battle. Escape, then continue searching.
      await clickLogical(880, 1670);
      await sleep(400);
      await clickLogical(880, 1475);
    }
    throw new Error('No item acquired after 6 exploration attempts');
  });

  await safeScreenshot('browser-e2e-after-acquisition.png');
  const afterAcquisition = await diagnostic('afterAcquisition');
  assert(afterAcquisition.inventory.length > 0, 'Get_scene must acquire at least one item');
  assert(afterAcquisition.inventory.every(item => item.resolved), 'every acquired item must resolve in the runtime catalog');
  assert(afterAcquisition.memory.itemIds.length > 0, 'acquisition must unlock an in-memory encyclopedia item');
  assert.notEqual(afterAcquisition.storage.meta, '0/0', 'common meta must contain encyclopedia discovery');
  assert.notEqual(afterAcquisition.storage.dedicated, '0/0', 'dedicated encyclopedia copy must contain discovery');

  await stage('abandon', async () => {
    // Get_scene -> Home, then abandon and confirm.
    await clickLogical(880, 1670);
    await sleep(300);
    await clickLogical(200, 1670);
    await sleep(300);
    await clickLogical(335, 1135);
    await page.waitForFunction(() => localStorage.getItem('the_toho:progress:v1') === null);
  });

  const afterAbandon = await diagnostic('afterAbandon');
  assert(afterAbandon.memory.itemIds.length > 0, 'abandon must not clear encyclopedia memory');

  await stage('reload-after-abandon', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady();
  });

  await safeScreenshot('browser-e2e-after-reload.png');
  const afterReload = await diagnostic('afterReload');
  assert(afterReload.memory.itemIds.length > 0, 'reload must restore encyclopedia memory');
  assert.notEqual(afterReload.storage.meta, '0/0', 'reload must retain common meta discovery');
  assert.notEqual(afterReload.storage.dedicated, '0/0', 'reload must retain dedicated discovery');

  console.log('CONSOLE_TAIL: ' + JSON.stringify(consoleMessages.slice(-40)));
  console.log('PASS: browser acquisition -> encyclopedia persistence -> abandon -> reload');
  clearTimeout(watchdog);
  await browser.close();
  browser = null;
})().catch(async error => {
  console.error(error && error.stack ? error.stack : error);
  if (browser) {
    try {
      await Promise.race([browser.close(), sleep(3000)]);
    } catch (_) {}
  }
  clearTimeout(watchdog);
  process.exit(1);
});
