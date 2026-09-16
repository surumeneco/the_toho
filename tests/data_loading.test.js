/* Run: node tests/data_loading.test.js */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function readData(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'datas', file), 'utf8'));
}
const fixtures = {
  foods: readData('foods.json'),
  weapons: readData('weapons.json'),
  tools: readData('tools.json'),
  materials: readData('materials.json'),
  recipes: readData('recipes.json'),
  enemies: readData('enemies.json'),
  stories: readData('story.json'),
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
  assert.equal(env.foods_data.length, fixtures.foods.length);
  assert.equal(env.weapons_data.length, fixtures.weapons.length);
  assert.equal(env.tools_data.length, fixtures.tools.length);
  assert.equal(env.materials_data.length, fixtures.materials.length);
  assert.equal(env.recipes_data.length, fixtures.recipes.length);
  assert.equal(env.enemies_data.length, fixtures.enemies.length);
  assert.equal(env.story_texts.length, fixtures.stories.length);
  assert(env.foods_data.length > 0, 'foods catalog must not be empty');
  assert(env.weapons_data.length > 0, 'weapons catalog must not be empty');
  assert(env.tools_data.length > 0, 'tools catalog must not be empty');
  assert(env.materials_data.length > 0, 'materials catalog must not be empty');

  env.fetch = () => Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
  const failed = vm.runInContext(`loading('missing', load_JSON, load_foods)`, env);
  await assert.rejects(failed.promise);
  assert.equal(failed.loaded, false);
  assert.equal(failed.status, 'failed');
  assert(failed.error instanceof Error);
  console.log('PASS: repository JSON data loads completely and failures are surfaced');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
