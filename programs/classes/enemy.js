/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    敵クラス
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Enemy",
  {
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
        コンストラクタ
      ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    init: function (name, HP, dices, drops, appear)
    {
      this.名前 = name;
      this.体力 = HP;
      this.攻撃力 = dices; //Dices型
      this.ドロップ = drops; // [ [名前, 最大入手数] ]
      this.出現距離 = appear;

      this.item_drop = function ()
      {
        let drop_item = new Array();
        if (this.ドロップ.length <= 0) return drop_item;

        let drop_amount = 3;
        let item = Math.floor(Math.random() * this.ドロップ.length);
        drop_item.push(item);
        if (this.ドロップ.length < drop_amount) drop_amount = this.ドロップ.length;
        for (let i = 1; i < drop_amount; i++)
        {
          if (Math.floor(Math.random() * 100) >= get_rate) break;
          let already = false;
          do
          {
            item = Math.floor(Math.random() * this.ドロップ.length);
            already = false;
            for (let j = 0; j < i; j++)
            {
              if (item == drop_item[j])
              {
                already = true;
              }
            }
          } while (already) //被ってたら再抽選
          drop_item.push(item);
        }

        let drops = new Array();
        for (let i = 0; i < drop_item.length; i++)
        {
          drops.push
            ([
              this.ドロップ[drop_item[i]][0],
              Math.floor(Math.random() * this.ドロップ[drop_item[i]][1]) + 1
            ]);
        }
        return drops;
      }
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  });
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

