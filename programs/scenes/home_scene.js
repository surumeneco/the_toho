/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    ホームシーン
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Home_scene",
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
          テキスト位置設定
        -----=-----=-----=-----=-----=-----*/
      var font_size = 64;
      var text_y = 200;
      var text_interval = 75;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          日数表示
        -----=-----=-----=-----=-----=-----*/
      var date = Label({ text: player.日数 + "日目" }).addChildTo(this);
      date.fill = White;
      date.fontSize = font_size * 2;
      date.setPosition(CENTER_W, text_y);
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
      }
      text_y += text_interval;
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
          探索ボタン
        -----=-----=-----=-----=-----=-----*/
      Button({
        text: "探索",
        fontSize: font_size,
        width: button_w, height: button_h, cornerRadius: 0,
        fill: darkGray,
        stroke: lightGray, strokeWidth: 15,
      }).addChildTo(this)
        .setPosition(buttons_x, buttons_y - button_h * 1.3 * 3)
        .onpointend = function ()
        {
          self.exit("探索");
        };
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          制作ボタン
        -----=-----=-----=-----=-----=-----*/
      Button({
        text: "制作",
        fontSize: font_size,
        width: button_w, height: button_h, cornerRadius: 0,
        fill: darkGray,
        stroke: lightGray, strokeWidth: 15,
      }).addChildTo(this)
        .setPosition(buttons_x, buttons_y - button_h * 1.3 * 2)
        .onpointend = function ()
        {
          current_recipe_page = 0;
          SoundManager.play("select");
          self.exit("制作");
        };
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          持ち物ボタン
        -----=-----=-----=-----=-----=-----*/
      Button({
        text: "持ち物",
        fontSize: font_size,
        width: button_w, height: button_h, cornerRadius: 0,
        fill: darkGray,
        stroke: lightGray, strokeWidth: 15,
      }).addChildTo(this)
        .setPosition(buttons_x, buttons_y - button_h * 1.3)
        .onpointend = function ()
        {
          SoundManager.play("select");
          self.exit("持ち物");
        };
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          睡眠ボタン
        -----=-----=-----=-----=-----=-----*/
      Button({
        text: "寝る",
        fontSize: font_size,
        width: button_w, height: button_h, cornerRadius: 0,
        fill: darkGray,
        stroke: lightGray, strokeWidth: 15,
      }).addChildTo(this)
        .setPosition(buttons_x, buttons_y)
        .onpointend = function ()
        {
          SoundManager.play("select");
          self.exit("睡眠");
        };
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          諦めるボタン
        -----=-----=-----=-----=-----=-----*/
      Button({
        text: "諦める",
        fontSize: font_size,
        width: button_w, height: button_h, cornerRadius: 0,
        fill: darkGray,
        stroke: lightGray, strokeWidth: 15,
      }).addChildTo(this)
        .setPosition(SCREEN_W - buttons_x, buttons_y)
        .onpointend = function ()
        {
          self.showAbandonDialog();
        };
      /*-----=-----=-----=-----=-----=-----*/
    },
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/

    // ホームを離れずに確認する。背後のボタンは確認中操作不可にする。
    showAbandonDialog: function ()
    {
      if (this._abandonDialog) return;
      var scene = this;
      var controls = this.children.filter(function (child) { return child.interactive; });
      controls.forEach(function (control) { control.interactive = false; });

      var elements = [];
      function add(element, x, y)
      {
        element.addChildTo(scene).setPosition(x, y);
        elements.push(element);
        return element;
      }

      // 既存画面・背景画像を暗くして、その上にゲーム内の確認UIを表示する。
      add(RectangleShape({
        width: SCREEN_W, height: SCREEN_H,
        fill: "rgba(0, 0, 0, 0.75)", strokeWidth: 0,
      }), CENTER_W, CENTER_H);
      add(RectangleShape({
        width: 940, height: 620, cornerRadius: 20,
        fill: darkGray, stroke: lightGray, strokeWidth: 12,
      }), CENTER_W, CENTER_H);
      add(Label({
        text: "本当に諦めますか？", fill: White, fontSize: 66,
      }), CENTER_W, CENTER_H - 150);
      add(Label({
        text: "現在のプレイデータは削除されます。", fill: White, fontSize: 40,
      }), CENTER_W, CENTER_H - 40);

      var yes = add(Button({
        text: "はい", fontSize: 60,
        width: 320, height: 140, cornerRadius: 0,
        fill: "#823636", stroke: lightGray, strokeWidth: 12,
      }), CENTER_W - 205, CENTER_H + 175);
      var no = add(Button({
        text: "いいえ", fontSize: 60,
        width: 320, height: 140, cornerRadius: 0,
        fill: darkGray, stroke: lightGray, strokeWidth: 12,
      }), CENTER_W + 205, CENTER_H + 175);

      this._abandonDialog = { elements: elements, controls: controls };
      yes.onpointend = function ()
      {
        if (!scene._abandonDialog) return;
        scene._abandonDialog = null;
        delete_cookies();
        SoundManager.play("start");
        scene.exit("タイトル");
      };
      no.onpointend = function ()
      {
        if (!scene._abandonDialog) return;
        var dialog = scene._abandonDialog;
        scene._abandonDialog = null;
        dialog.elements.forEach(function (element) { element.remove(); });
        // 同じタップが背後のボタンへ伝播しないよう、次フレームで復帰する。
        scene._abandonRestoreControls = dialog.controls;
        SoundManager.play("select");
      };
    },
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/

    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
      アップデート
    ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    update: function (app)
    {
      if (this._abandonRestoreControls)
      {
        this._abandonRestoreControls.forEach(function (control) { control.interactive = true; });
        this._abandonRestoreControls = null;
      }
      bgm_check(app);
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  }
);
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
