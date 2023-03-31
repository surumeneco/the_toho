/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    勝利シーン
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Win_scene",
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



      let ドロップアイテム = now_enemy.item_drop();
      for (let i = 0; i < ドロップアイテム.length; i++)
      {
        player.get_item(ドロップアイテム[i][0], ドロップアイテム[i][1]);
      }



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
      var notice = Label({ text: now_enemy.名前 + "を倒した" }).addChildTo(this);
      notice.fill = White;
      notice.fontSize = font_size;
      notice.setPosition(CENTER_W, text_y);
      text_y += text_interval * 3;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          体力表示
        -----=-----=-----=-----=-----=-----*/
      var HP = Label({ text: "体力：" + player.体力 }).addChildTo(this);
      HP.fill = White;
      HP.fontSize = font_size;
      HP.setPosition(CENTER_W, text_y);
      text_y += text_interval;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          気力表示
        -----=-----=-----=-----=-----=-----*/
      var SP = Label({ text: "気力：" + player.気力 }).addChildTo(this);
      SP.fill = White;
      SP.fontSize = font_size;
      SP.setPosition(CENTER_W, text_y);
      text_y += text_interval * 3;
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          入手アイテム表示
        -----=-----=-----=-----=-----=-----*/
      for (let i = 0; i < ドロップアイテム.length; i++)
      {
        var item = Label({ text: ドロップアイテム[i][0] + " x" + ドロップアイテム[i][1] }).addChildTo(this);
        item.fill = White;
        item.fontSize = font_size;
        item.setPosition(CENTER_W, text_y);
        text_y += text_interval;
      }
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

