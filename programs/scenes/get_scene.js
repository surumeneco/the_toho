/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    入手シーン
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Get_scene",
  {
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
      コンストラクタ
    ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    superClass: "DisplayScene",
    init: function (option)
    {
      this.superInit(option);
      this.width = SCREEN_W;
      this.height = SCREEN_H;

      //thisが別のものを指す時に使えるように
      var self = this;

      //背景色
      this.backgroundColor = Black;

      /*-----=-----=-----=-----=-----=-----
          バージョン表示
        -----=-----=-----=-----=-----=-----*/
      var version_data = Label({ text: "バージョン：" + version }).addChildTo(this);
      version_data.fill = White;
      version_data.align = "left";
      version_data.baseline = "bottom";
      version_data.setPosition(25, SCREEN_H - 25);
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          入手素材抽選
        -----=-----=-----=-----=-----=-----*/
      var 入手素材一覧 = new Array(); //[ 素材, 数 ]
      var 入手素材ID一覧 = new Array();
      var 入手可能素材 = new Array();
      //素材を追加
      for (let i = 0; i < materials_data.length; i++)
      {
        if (materials_data[i].必要道具 == "無し" || player.has_item(materials_data[i].必要道具) > 0)
        {
          入手可能素材.push(materials_data[i]);
        }
      }
      //食料も追加
      for (let i = 0; i < foods_data.length; i++)
      {
        if (foods_data[i].探索入手)
        {
          入手可能素材.push(foods_data[i]);
        }
      }

      let drop_amount = 3;
      if (player.has_item("袋") > 0) drop_amount += 1;
      if (player.has_item("ポーチ") > 0) drop_amount += 2;
      if (player.has_item("かばん") > 0) drop_amount += 2;
      let num = Math.floor(Math.random() * 入手可能素材.length);
      入手素材ID一覧.push(num);
      if (入手可能素材.length < drop_amount) drop_amount = 入手可能素材.length;
      for (let i = 1; i < drop_amount; i++)
      {
        if (Math.floor(Math.random() * 100) >= get_rate) break;
        let already = false;
        do
        {
          num = Math.floor(Math.random() * 入手可能素材.length);
          already = false;
          for (let j = 0; j < i; j++)
          {
            if (num == 入手素材ID一覧[j])
            {
              already = true;
            }
          }
        } while (already); //被ってたら再抽選
        入手素材ID一覧.push(num);
      }

      for (let i = 0; i < 入手素材ID一覧.length; i++)
      {
        入手素材一覧.push
          ([
            入手可能素材[入手素材ID一覧[i]],
            Math.floor(Math.random() * 入手可能素材[入手素材ID一覧[i]].最大入手数) + 1
          ])
        player.get_item(入手素材一覧[i][0].名前, 入手素材一覧[i][1]);
      }
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          テキスト位置設定
        -----=-----=-----=-----=-----=-----*/
      var font_size = 64;
      var text_y = 200;
      var text_interval = 75;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          通知表示
        -----=-----=-----=-----=-----=-----*/
      var notice = Label({ text: "アイテムを入手した" }).addChildTo(this);
      notice.fill = White;
      notice.fontSize = font_size;
      notice.setPosition(CENTER_W, text_y);
      text_y += text_interval * 3;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          移動距離表示
        -----=-----=-----=-----=-----=-----*/
      var moves = Label({ text: "探索した距離：" + (player.移動距離 / 1000) + "km" }).addChildTo(this);
      moves.fill = White;
      moves.fontSize = font_size;
      moves.setPosition(CENTER_W, text_y);
      text_y += text_interval;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          体力表示
        -----=-----=-----=-----=-----=-----*/
      var HP = Label({ text: "体力：" + player.体力 }).addChildTo(this);
      HP.fill = White;
      HP.fontSize = font_size;
      HP.setPosition(CENTER_W, text_y);
      if (player.体力 <= 20)
      {
        HP.fill = Red;
      }
      text_y += text_interval;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          気力表示
        -----=-----=-----=-----=-----=-----*/
      var SP = Label({ text: "気力：" + player.気力 }).addChildTo(this);
      SP.fill = White;
      SP.fontSize = font_size;
      SP.setPosition(CENTER_W, text_y);
      if (player.気力 < (5 + Math.floor(player.移動距離 / 10000)) * 2)
      {
        SP.fill = Red;
        SoundManager.play("alert");
      }
      text_y += text_interval * 2;
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          入手アイテム表示
        -----=-----=-----=-----=-----=-----*/
      for (let i = 0; i < 入手素材一覧.length; i++)
      {
        var item = Label({ text: 入手素材一覧[i][0].名前 + " x" + 入手素材一覧[i][1] }).addChildTo(this);
        item.fill = White;
        item.fontSize = font_size;
        item.setPosition(CENTER_W, text_y);
        text_y += text_interval;
      }
      set_cookies();
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          ボタン設定
        -----=-----=-----=-----=-----=-----*/
      var font_size = 64;
      var button_w = 300;
      var button_h = 150;
      var buttons_x = SCREEN_W - button_w / 2 - 50;
      var buttons_y = SCREEN_H - button_h - 100;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          探索を続けるボタン
        -----=-----=-----=-----=-----=-----*/
      Button({
        text: "進む",
        fontSize: font_size,
        width: button_w, height: button_h, cornerRadius: 0,
        fill: darkGray,
        stroke: lightGray, strokeWidth: 15,
      }).addChildTo(this)
        .setPosition(buttons_x, buttons_y - button_h * 1.3)
        .onpointend = function ()
        {
          self.exit("探索");
        };
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          ホームに戻るボタン
        -----=-----=-----=-----=-----=-----*/
      Button({
        text: "帰る",
        fontSize: font_size,
        width: button_w, height: button_h, cornerRadius: 0,
        fill: darkGray,
        stroke: lightGray, strokeWidth: 15,
      }).addChildTo(this)
        .setPosition(buttons_x, buttons_y)
        .onpointend = function ()
        {
          SoundManager.play("backhome");
          self.exit("ホーム");
        };
      /*-----=-----=-----=-----=-----=-----*/
    },
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/

    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
      アップデート
    ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    update: function (app)
    {
      bgm_check(app);
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  }
);
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

