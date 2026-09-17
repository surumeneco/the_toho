/* Run with Playwright after serving the repository root on http://127.0.0.1:4173 */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const URL = 'http://127.0.0.1:4173/?debug=storage';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1080 } });
  await context.addInitScript(() => {
    // Make the first search deterministic: 50 is outside battle_rate(20), and Get_scene stops after one drop.
    Math.random = () => 0.5;
  });
  const page = await context.newPage();
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(msg.type() + ': ' + msg.text()));
  page.on('pageerror', error => consoleMessages.push('pageerror: ' + error.stack));

  async function waitReady() {
    await page.waitForFunction(() => typeof toho_data_is_ready === 'function' && toho_data_is_ready() &&
      typeof toho_encyclopedia_storage_diagnostic === 'function' && document.querySelector('canvas'));
  }
  async function clickLogical(x, y) {
    const box = await page.locator('canvas').boundingBox();
    assert(box, 'canvas must exist');
    await page.mouse.click(box.x + x * box.width / 1080, box.y + y * box.height / 1920);
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

  await page.goto(URL, { waitUntil: 'networkidle' });
  await waitReady();
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await waitReady();

  // Title -> new game. The logical point is outside the title's four archive buttons and volume bars.
  await clickLogical(540, 900);
  await page.waitForFunction(() => localStorage.getItem('the_toho:progress:v1') !== null);

  // Home -> Explore. Search_scene resolves immediately and deterministic random sends us to Get_scene.
  await clickLogical(880, 1085);
  await page.waitForFunction(() => [player.食料, player.武器, player.道具, player.素材]
    .some(list => Array.isArray(list) && list.some(pair => pair && pair[1] > 0)));

  await page.screenshot({ path: 'browser-e2e-after-acquisition.png', fullPage: true });
  const afterAcquisition = await diagnostic('afterAcquisition');
  assert(afterAcquisition.inventory.length > 0, 'Get_scene must acquire at least one item');
  assert(afterAcquisition.inventory.every(item => item.resolved), 'every acquired item must resolve in the runtime catalog');
  assert(afterAcquisition.memory.itemIds.length > 0, 'acquisition must unlock an in-memory encyclopedia item');
  assert.notEqual(afterAcquisition.storage.meta, '0/0', 'common meta must contain encyclopedia discovery');
  assert.notEqual(afterAcquisition.storage.dedicated, '0/0', 'dedicated encyclopedia copy must contain discovery');

  // Get_scene -> Home -> abandon. This deletes only current progress.
  await clickLogical(880, 1670);
  await clickLogical(200, 1670);
  await clickLogical(335, 1135);
  await page.waitForFunction(() => localStorage.getItem('the_toho:progress:v1') === null);
  const afterAbandon = await diagnostic('afterAbandon');
  assert(afterAbandon.memory.itemIds.length > 0, 'abandon must not clear encyclopedia memory');

  await page.reload({ waitUntil: 'networkidle' });
  await waitReady();
  await page.screenshot({ path: 'browser-e2e-after-reload.png', fullPage: true });
  const afterReload = await diagnostic('afterReload');
  assert(afterReload.memory.itemIds.length > 0, 'reload must restore encyclopedia memory');
  assert.notEqual(afterReload.storage.meta, '0/0', 'reload must retain common meta discovery');
  assert.notEqual(afterReload.storage.dedicated, '0/0', 'reload must retain dedicated discovery');

  console.log('CONSOLE_TAIL: ' + JSON.stringify(consoleMessages.slice(-40)));
  console.log('PASS: browser acquisition -> encyclopedia persistence -> abandon -> reload');
  await browser.close();
})().catch(async error => {
  console.error(error);
  process.exitCode = 1;
});
