/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    データ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function loading(path, file_loading, data_converting)
{
  file_loading(path, data_converting);
  return true;
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    食料データ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_foods(data)
{
  for (let i = 0; i < data.length; i++)
  {
    foods_data.push(new Food(data[i].名前, data[i].探索入手, data[i].最大入手数, data[i].回復量));
  }
  console.log("data was converted successfully");
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    武器データ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_weapons(data)
{
  for (let i = 0; i < data.length; i++)
  {
    let dice = Dices(data[i].攻撃力.ダイス, data[i].攻撃力.固定値);
    weapons_data.push(new Weapon(data[i].名前, dice));
  }
  console.log("data was converted successfully");
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    道具データ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_tools(data)
{
  for (let i = 0; i < data.length; i++)
  {
    tools_data.push(new Tool(data[i].名前));
  }
  console.log("data was converted successfully");
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    素材データ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_materials(data)
{
  for (let i = 0; i < data.length; i++)
  {
    materials_data.push(new Material(data[i].名前, data[i].必要道具, data[i].最大入手数));
  }
  console.log("data was converted successfully");
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    レシピデータ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_recipes(data)
{
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
    )
  }
  console.log("data was converted successfully");
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    敵データ読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_enemies(data)
{
  for (let i = 0; i < data.length; i++)
  {
    let dice = Dices(data[i].攻撃力.ダイス, data[i].攻撃力.固定値);
    enemies_data.push(new Enemy(data[i].名前, data[i].体力, dice, data[i].ドロップ, data[i].出現距離));
  }
  console.log("data was converted successfully");
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/





/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    JSONファイル読み込み関数
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function load_JSON(path, callback)
{
  let requestURL = path;
  let request = new XMLHttpRequest();

  request.onreadystatechange = function ()
  {
    if (request.readyState == 4 && request.status == 200)
    {
      console.log("json file was loaded successfully");
    }
  };

  request.open('GET', requestURL);
  request.responseType = 'json';
  request.send();

  request.onload = function ()
  {
    let data = request.response;
    data = JSON.parse(JSON.stringify(data));
    console.log("end loading json file");
    callback(data);
  }
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

