/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    アイテム系親クラス
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Item",
  {
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
        コンストラクタ
      ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    init: function (name)
    {
      this.名前 = name;
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  });
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    レシピクラス
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Recipe",
  {
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
        コンストラクタ
      ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    init: function (product, cost, num, need)
    {
      this.制作物 = product;
      this.制作気力 = cost;
      this.個数 = num;
      this.必要素材 = need; //[ [名前, 数], [名前, 数] ]
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  });
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/





/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    アイテムクラスサーチ
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
function get_from_name(name, items_data)
{
  for (let i = 0; i < items_data.length; i++)
  {
    if (items_data[i].名前 == name) return items_data[i];
  }
  return null;
}
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/





/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    食料クラス
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Food",
  {
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
        コンストラクタ
      ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    superClass: "Item",
    init: function (name, search, max, heal)
    {
      this.superInit(name);
      this.探索入手 = search;
      this.最大入手数 = max;
      this.回復量 = heal;
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  });
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    武器クラス
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Weapon",
  {
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
        コンストラクタ
      ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    superClass: "Item",
    init: function (name, dices)
    {
      this.superInit(name);
      this.攻撃力 = dices;
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  });
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    道具クラス
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Tool",
  {
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
        コンストラクタ
      ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    superClass: "Item",
    init: function (name)
    {
      this.superInit(name);
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  });
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    材料クラス
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Material",
  {
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
        コンストラクタ
      ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    superClass: "Item",
    init: function (name, require, max) 
    {
      this.superInit(name);
      this.必要道具 = require;
      this.最大入手数 = max;
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  });
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

