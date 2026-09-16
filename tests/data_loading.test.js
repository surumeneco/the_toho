/* Run: node tests/data_loading.test.js */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const fixtures = {
  foods: [{ 名前: 'りんご', 探索入手: true, 最大入手数: 2, 回復量: 4 }],
  weapons: [{ 名前: '棒', 攻撃力: { ダイス: [[1, 4]], 固定値: 0 } }],
  tools: [{ 名前: '袋' }],
  materials: [{ 名前: '木材', 必要道具: '無し', 最大入手数: 3 }],
  recipes: [{ 必要道具: '無し', レシピ: [{ 制作物: '棒', 制作気力: 1, 個数: 1, 必要素材: [] }] }],
  enemies: [{ 名前: '兎', 体力: 5, 攻撃力: { ダイス: [[1, 2]], 固定値: 0 }, ドロップ: [], 出現距離: 0 }],
  stories: [['本文']],
};

const env = {
  console, Array, Promise, Error,
  foods_data: [], weapons_data: [], tools_data: [], materials_data: [],
  recipes_data: [], enemies_data: [], story_texts: [],
  fetch(url) {
    return Promise.resolve({
      ok: true, status: 200, statusText: 'OK',
      json() { return Promise.resolve(fixtures[url]); },
    });
  },
  Food: function Food(name, search, max, heal) {
    this.名前 = name; this.探索入手 = search; this.最大入手数 = max; this.回復量 = heal;
  },
  Weapon: function Weapon(name, attack) { this.名前 = name; this.攻撃力 = attack; },
  Tool: function Tool(name) { this.名前 = name; },
  Material: function Material(name, tool, max) {
    this.名前 = name; this.必要道具 = tool; this.最大入手数 = max;
  },
  Recipe: function Recipe(product, cost, num, need) {
    this.制作物 = product; this.制作気力 = cost; this.個数 = num; this.必要素材 = need;
  },
  Enemy: function Enemy(name, hp, attack, drops, distance) {
    this.名前 = name; this.体力 = hp; this.攻撃力 = attack; this.ドロップ = drops; this.出現距離 = distance;
  },
  Dices(dice, fixed) { return { ダイス: dice, 固定値: fixed }; },
};
vm.createContext(env);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'programs', 'loadings.js'), 'utf8'), env);

async function main() {
  const calls = [
    ['foods', 'load_foods'], ['weapons', 'load_weapons'], ['tools', 'load_tools'],
    ['materials', 'load_materials'], ['recipes', 'load_recipes'],
    ['enemies', 'load_enemies'], ['stories', 'load_stories'],
  ];
  const states = calls.map(([url, converter]) => vm.runInContext(
    `loading(${JSON.stringify(url)}, load_JSON, ${converter})`, env));

  states.forEach(state => {
    assert.equal(state.loaded, false);
    assert.equal(state.status, 'loading');
  });
  await Promise.all(states.map(state => state.promise));
  states.forEach(state => {
    assert.equal(state.loaded, true);
    assert.equal(state.status, 'loaded');
    assert.equal(state.error, null);
  });
  assert.equal(env.foods_data.length, 1);
  assert.equal(env.weapons_data.length, 1);
  assert.equal(env.tools_data.length, 1);
  assert.equal(env.materials_data.length, 1);
  assert.equal(env.recipes_data.length, 1);
  assert.equal(env.enemies_data.length, 1);
  assert.equal(env.story_texts.length, 1);

  env.fetch = () => Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
  const failed = vm.runInContext(`loading('missing', load_JSON, load_foods)`, env);
  await assert.rejects(failed.promise);
  assert.equal(failed.loaded, false);
  assert.equal(failed.status, 'failed');
  assert(failed.error instanceof Error);
  console.log('PASS: JSON data stays loading until conversion finishes and reports failures');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
