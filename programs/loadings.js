/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    データ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function loading(url, file_loading, data_converting)
{
  // 従来はリクエスト開始直後に true を返していたため、完了状態を判定できなかった。
  // status / promise を持つ状態オブジェクトとして管理し、変換完了まで loaded にしない。
  const state = {
    url: url,
    status: "loading",
    loaded: false,
    error: null,
    promise: null,
  };

  state.promise = file_loading(url)
    .then(function (data)
    {
      data_converting(data);
      state.status = "loaded";
      state.loaded = true;
      return state;
    })
    .catch(function (error)
    {
      state.status = "failed";
      state.error = error;
      console.error("ゲームデータの読み込みに失敗しました:", url, error);
      throw error;
    });

  return state;
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    食料データ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_foods(data)
{
  if (!Array.isArray(data)) throw new Error("foods.json の形式が不正です");
  foods_data.length = 0;
  for (let i = 0; i < data.length; i++)
  {
    foods_data.push(new Food(data[i].名前, data[i].探索入手, data[i].最大入手数, data[i].回復量));
  }
  console.log("foods data was converted successfully");
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    武器データ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_weapons(data)
{
  if (!Array.isArray(data)) throw new Error("weapons.json の形式が不正です");
  weapons_data.length = 0;
  for (let i = 0; i < data.length; i++)
  {
    let dice = Dices(data[i].攻撃力.ダイス, data[i].攻撃力.固定値);
    weapons_data.push(new Weapon(data[i].名前, dice));
  }
  console.log("weapons data was converted successfully");
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    道具データ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_tools(data)
{
  if (!Array.isArray(data)) throw new Error("tools.json の形式が不正です");
  tools_data.length = 0;
  for (let i = 0; i < data.length; i++)
  {
    tools_data.push(new Tool(data[i].名前));
  }
  console.log("tools data was converted successfully");
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    素材データ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_materials(data)
{
  if (!Array.isArray(data)) throw new Error("materials.json の形式が不正です");
  materials_data.length = 0;
  for (let i = 0; i < data.length; i++)
  {
    materials_data.push(new Material(data[i].名前, data[i].必要道具, data[i].最大入手数));
  }
  console.log("materials data was converted successfully");
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    レシピデータ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_recipes(data)
{
  if (!Array.isArray(data)) throw new Error("recipes.json の形式が不正です");
  recipes_data.length = 0;
  for (let i = 0; i < data.length; i++)
  {
    let recipes = new Array();
    for (let j = 0; j < data[i].レシピ.length; j++)
    {
      recipes.push(new Recipe(data[i].レシピ[j].制作物, data[i].レシピ[j].制作気力, data[i].レシピ[j].個数, data[i].レシピ[j].必要素材));
    }
    recipes_data.push(
      [
        data[i].必要道具,
        recipes
      ]
    );
  }
  console.log("recipes data was converted successfully");
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    敵データ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_enemies(data)
{
  if (!Array.isArray(data)) throw new Error("enemies.json の形式が不正です");
  enemies_data.length = 0;
  for (let i = 0; i < data.length; i++)
  {
    let dice = Dices(data[i].攻撃力.ダイス, data[i].攻撃力.固定値);
    enemies_data.push(new Enemy(data[i].名前, data[i].体力, dice, data[i].ドロップ, data[i].出現距離));
  }
  console.log("enemies data was converted successfully");
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    ストーリーデータ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_stories(data)
{
  if (!Array.isArray(data)) throw new Error("story.json の形式が不正です");
  story_texts.length = 0;
  for (let i = 0; i < data.length; i++)
  {
    let text = "";
    for (let j = 0; j < data[i].length; j++)
    {
      text += data[i][j] + "\n";
    }
    story_texts.push(text);
  }
  console.log("story data was converted successfully");
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/





/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    JSONファイル読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_JSON(url)
{
  // responseType=json の XMLHttpRequest に任せず、HTTP失敗とJSON解析失敗を
  // Promise の reject として呼び出し元へ伝える。
  return fetch(url, { cache: "no-store" })
    .then(function (response)
    {
      if (!response.ok)
      {
        throw new Error("HTTP " + response.status + " " + response.statusText);
      }
      return response.json();
    });
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
