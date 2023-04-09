/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    プレイヤークラス
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Player",
  {
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
        コンストラクタ
      ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    init: function ()
    {
      this.体力 = 100;
      this.気力 = 100;
      this.日数 = 1;
      this.移動距離 = 0;

      this.食料 = new Array(); //[ 食料, 数 ]の配列
      this.武器 = new Array(); //[ 武器, 数 ]の配列
      this.道具 = new Array(); //[ 道具, 数 ]の配列
      this.素材 = new Array(); //[ 素材, 数 ]の配列

      this.食事履歴 = new Array(); //各食料を食べた[ 食料, 数 ]の配列



      /*-----=-----=-----=-----=-----=-----
          アイテム入手
        -----=-----=-----=-----=-----=-----*/
      this.get_item = function (アイテム名, 数)
      {
        for (let i = 0; i < foods_data.length; i++)
        {
          if (foods_data[i].名前 == アイテム名)
          {
            for (let j = 0; j < player.食料.length; j++)
            {
              if (this.食料[j][0].名前 == アイテム名)
              {
                this.食料[j][1] += 数;
                let after = this.食料.filter(item => item[1] > 0);
                this.食料 = after;
                return;
              }
            }
            if (数 > 0) this.食料.push([get_from_name(アイテム名, foods_data), 数]);
            return;
          }
        }
        for (let i = 0; i < weapons_data.length; i++)
        {
          if (weapons_data[i].名前 == アイテム名)
          {
            for (let j = 0; j < player.武器.length; j++)
            {
              if (this.武器[j][0].名前 == アイテム名)
              {
                this.武器[j][1] += 数;
                let after = this.武器.filter(item => item[1] > 0);
                this.武器 = after;
                return;
              }
            }
            if (数 > 0) this.武器.push([get_from_name(アイテム名, weapons_data), 数]);
            return;
          }
        }
        for (let i = 0; i < tools_data.length; i++)
        {
          if (tools_data[i].名前 == アイテム名)
          {
            for (let j = 0; j < player.道具.length; j++)
            {
              if (this.道具[j][0].名前 == アイテム名)
              {
                this.道具[j][1] += 数;
                let after = this.道具.filter(item => item[1] > 0);
                this.道具 = after;
                return;
              }
            }
            if (数 > 0) this.道具.push([get_from_name(アイテム名, tools_data), 数]);
            return;
          }
        }
        for (let i = 0; i < materials_data.length; i++)
        {
          if (materials_data[i].名前 == アイテム名)
          {
            for (let j = 0; j < player.素材.length; j++)
            {
              if (this.素材[j][0].名前 == アイテム名)
              {
                this.素材[j][1] += 数;
                let after = this.素材.filter(item => item[1] > 0);
                this.素材 = after;
                return;
              }
            }
            if (数 > 0) this.素材.push([get_from_name(アイテム名, materials_data), 数]);
            return;
          }
        }
        console.log("item not find");
      };
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          必要アイテム持ってるか確認
        -----=-----=-----=-----=-----=-----*/
      this.has_item = function (アイテム名)
      {
        var items = new Array();
        for (let i = 0; i < player.食料.length; i++)
        {
          items.push
            ([
              player.食料[i][0].名前, player.食料[i][1]
            ]);
        }
        for (let i = 0; i < player.武器.length; i++)
        {
          items.push
            ([
              player.武器[i][0].名前, player.武器[i][1]
            ]);
        }
        for (let i = 0; i < player.道具.length; i++)
        {
          items.push
            ([
              player.道具[i][0].名前, player.道具[i][1]
            ]);
        }
        for (let i = 0; i < player.素材.length; i++)
        {
          items.push
            ([
              player.素材[i][0].名前, player.素材[i][1]
            ]);
        }

        let num = 0;
        for (let i = 0; i < items.length; i++)
        {
          if (items[i][0] == アイテム名)
          {
            num = items[i][1];
            break;
          }
        }
        return num;
      };
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          食事カウント
        -----=-----=-----=-----=-----=-----*/
      this.eat = function (食料名)
      {
        for (let i = 0; i < this.食事履歴.length; i++)
        {
          if (this.食事履歴[i][0] == 食料名)
          {
            this.食事履歴[i][1]++;
            return;
          }
        }
        this.食事履歴.push([食料名, 1]);
      }
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          一番食べた食料取得
        -----=-----=-----=-----=-----=-----*/
      this.most_eat = function ()
      {
        let food = "何も食べていない";
        let num = 0;
        for (let i = 0; i < this.食事履歴.length; i++)
        {
          if (this.食事履歴[i][1] >= num)
          {
            food = this.食事履歴[i][0];
            num = this.食事履歴[i][1];
          }
        }
        return [food, num];
      }
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          データ読み込み
        -----=-----=-----=-----=-----=-----*/
      this.set_data = function (json)
      {
        this.体力 = json.体力;
        this.気力 = json.気力;
        this.日数 = json.日数;
        this.移動距離 = json.移動距離;

        this.食料 = json.食料;
        this.武器 = json.武器;
        this.道具 = json.道具;
        this.素材 = json.素材;

        this.食事履歴 = json.食事履歴;
      };
      /*-----=-----=-----=-----=-----=-----*/
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  });
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

