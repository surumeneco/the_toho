/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    かばんシーン
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Inventory_scene",
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

      this.food_updated = false;
      this.is_sliding = false;



      /*-----=-----=-----=-----=-----=-----
          ウィンドウ位置設定
        -----=-----=-----=-----=-----=-----*/
      this.押下中 = false;
      this.慣性 = 0;
      this.スクロール開始時間 = 0;
      this.スクロール開始位置 = 0;
      this.スクロール距離 = 0;
      this.前フレームの座標 = 0;

      this.上限 = 300;
      this.下限 = SCREEN_H - 370;
      this.始端位置 = this.上限;
      this.終端位置 = this.始端位置;
      this.window_y;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          食料ウィンドウ描画
        -----=-----=-----=-----=-----=-----*/
      this.食料ウィンドウ = Text_window(SCREEN_W - 70, "【食料】(タップで食べる)");
      this.食料ウィンドウ.addChildTo(this);
      for (let i = 0; i < player.食料.length; i++)
      {
        this.食料ウィンドウ.push_text(player.食料[i][0].名前 + " x" + player.食料[i][1] + " 気力回復:" + player.食料[i][0].回復量);
      }
      this.window_y = this.始端位置 + this.スクロール距離 + this.食料ウィンドウ.ウィンドウ高さ / 2;
      this.食料ウィンドウ.set_position(CENTER_W, this.window_y);
      for (let i = 0; i < this.食料ウィンドウ.テキスト.length; i++)
      {
        this.食料ウィンドウ.テキスト[i].onpointend = function ()
        {
          if (this.y < SCREEN_H - 350)
          {
            player.気力 += player.食料[i][0].回復量;
            self.SP.text = "気力：" + player.気力;
            this.set_text(player.食料[i][0].名前 + " x" + (player.食料[i][1] - 1) + " 気力回復:" + player.食料[i][0].回復量);
            if (player.食料[i][1] <= 1)
            {
              self.food_updated = true;
            }
            player.eat(player.食料[i][0].名前);
            player.get_item(player.食料[i][0].名前, -1);
            set_cookies();
            SoundManager.play("eat");
          }
        };
      }
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          武器ウィンドウ描画
        -----=-----=-----=-----=-----=-----*/
      this.武器ウィンドウ = Text_window(SCREEN_W - 70, "【武器】");
      this.武器ウィンドウ.addChildTo(this);
      for (let i = 0; i < player.武器.length; i++)
      {
        let damage = "";
        for (let j = 0; j < player.武器[i][0].攻撃力.ダイス.length; j++)
        {
          damage += player.武器[i][0].攻撃力.ダイス[j][0] + "d" + player.武器[i][0].攻撃力.ダイス[j][1];
          if (j < player.武器[i][0].攻撃力.ダイス.length - 1) damage += "+";
        }
        if (player.武器[i][0].攻撃力.固定値 > 0) damage += "+" + player.武器[i][0].攻撃力.固定値;

        this.武器ウィンドウ.push_text(player.武器[i][0].名前 + " x" + player.武器[i][1] + " 攻撃力:" + damage);
      }
      this.window_y = this.始端位置 + this.スクロール距離 + this.食料ウィンドウ.ウィンドウ高さ + 30 + this.武器ウィンドウ.ウィンドウ高さ / 2;
      this.武器ウィンドウ.set_position(CENTER_W, this.window_y);
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          道具ウィンドウ描画
        -----=-----=-----=-----=-----=-----*/
      this.道具ウィンドウ = Text_window(SCREEN_W / 2 - 50, "【道具】");
      this.道具ウィンドウ.addChildTo(this);
      for (let i = 0; i < player.道具.length; i++)
      {
        this.道具ウィンドウ.push_text(player.道具[i][0].名前 + " x" + player.道具[i][1]);
      }
      this.window_y = this.始端位置 + this.スクロール距離 + this.食料ウィンドウ.ウィンドウ高さ + 30 + this.武器ウィンドウ.ウィンドウ高さ + 30 + this.道具ウィンドウ.ウィンドウ高さ / 2;
      this.道具ウィンドウ.set_position(CENTER_W * 1.5 - 10, this.window_y);
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          素材ウィンドウ描画
        -----=-----=-----=-----=-----=-----*/
      this.素材ウィンドウ = Text_window(SCREEN_W / 2 - 50, "【素材】");
      this.素材ウィンドウ.addChildTo(this);
      for (let i = 0; i < player.素材.length; i++)
      {
        this.素材ウィンドウ.push_text(player.素材[i][0].名前 + " x" + player.素材[i][1]);
      }
      this.window_y = this.始端位置 + this.スクロール距離 + this.食料ウィンドウ.ウィンドウ高さ + 30 + this.武器ウィンドウ.ウィンドウ高さ + 30 + this.素材ウィンドウ.ウィンドウ高さ / 2;
      this.素材ウィンドウ.set_position(CENTER_W * 0.5 + 10, this.window_y);
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          テキスト位置設定
        -----=-----=-----=-----=-----=-----*/
      var font_size = 64;
      var text_y = 100;
      var text_interval = 100;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          通知表示
        -----=-----=-----=-----=-----=-----*/
      RectangleShape
        ({
          width: SCREEN_W,
          height: 280,
          fill: Black,
          stroke: White, strokeWidth: 10,
        }).addChildTo(this)
        .setPosition(CENTER_W, 280 / 2);
      var notice = Label({ text: "持ち物一覧" }).addChildTo(this);
      notice.fill = White;
      notice.fontSize = font_size;
      notice.setPosition(CENTER_W, text_y);
      text_y += text_interval;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          気力表示
        -----=-----=-----=-----=-----=-----*/
      this.SP = Label({ text: "気力：" + player.気力 }).addChildTo(this);
      this.SP.fill = White;
      this.SP.fontSize = font_size;
      this.SP.setPosition(CENTER_W, text_y);
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
          ホームに戻るボタン
        -----=-----=-----=-----=-----=-----*/
      RectangleShape
        ({
          width: SCREEN_W,
          height: 350,
          fill: Black,
          stroke: White, strokeWidth: 10,
        }).addChildTo(this)
        .setPosition(CENTER_W, SCREEN_H - 350 / 2);
      Button({
        text: "戻る",
        fontSize: font_size,
        width: button_w, height: button_h, cornerRadius: 0,
        fill: darkGray,
        stroke: lightGray, strokeWidth: 15,
      }).addChildTo(this)
        .setPosition(buttons_x, buttons_y)
        .onpointend = function ()
        {
          set_cookies();
          SoundManager.play("backhome");
          self.exit("ホーム");
        };
      /*-----=-----=-----=-----=-----=-----*/



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
          ウィンドウ位置再設定関数
        -----=-----=-----=-----=-----=-----*/
      this.set_windows_pos = function ()
      {
        this.window_y = this.始端位置 + this.スクロール距離 + this.食料ウィンドウ.ウィンドウ高さ / 2;
        this.食料ウィンドウ.set_position(CENTER_W, this.window_y);
        this.window_y = this.始端位置 + this.スクロール距離 + this.食料ウィンドウ.ウィンドウ高さ + 30 + this.武器ウィンドウ.ウィンドウ高さ / 2;
        this.武器ウィンドウ.set_position(CENTER_W, this.window_y);
        this.window_y = this.始端位置 + this.スクロール距離 + this.食料ウィンドウ.ウィンドウ高さ + 30 + this.武器ウィンドウ.ウィンドウ高さ + 30 + this.道具ウィンドウ.ウィンドウ高さ / 2;
        this.道具ウィンドウ.set_position(CENTER_W * 1.5 - 10, this.window_y);
        this.window_y = this.始端位置 + this.スクロール距離 + this.食料ウィンドウ.ウィンドウ高さ + 30 + this.武器ウィンドウ.ウィンドウ高さ + 30 + this.素材ウィンドウ.ウィンドウ高さ / 2;
        this.素材ウィンドウ.set_position(CENTER_W * 0.5 + 10, this.window_y);
        this.終端位置 = this.window_y + this.素材ウィンドウ.ウィンドウ高さ / 2;
      }
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          スクロール処理
        -----=-----=-----=-----=-----=-----*/
      this.on("pointstart", function (e)
      {
        this.押下中 = true;
        this.スクロール開始時間 = time;
        this.スクロール開始位置 = e.pointer.y;
        this.前フレームの座標 = e.pointer.y;
        this.スクロール距離 = 0;
      });

      this.on("pointstay", function (e)
      {
        this.スクロール距離 = e.pointer.y - this.スクロール開始位置;

        let ポインター差分 = e.pointer.y - this.前フレームの座標;
        if (ポインター差分 * ポインター差分 < 1)
        {
          this.スクロール開始時間 = time;
          this.スクロール開始位置 = e.pointer.y;
          this.始端位置 += this.スクロール距離;
          this.スクロール距離 = 0;
        }
        this.前フレームの座標 = e.pointer.y;
      });

      this.on("pointend", function (e)
      {
        this.押下中 = false;
        let スクロール時間 = time - this.スクロール開始時間 + 1;
        this.慣性 = this.スクロール距離 / (スクロール時間 / 10);
        this.始端位置 += this.スクロール距離;
        this.スクロール距離 = 0;
      });
      /*-----=-----=-----=-----=-----=-----*/
    },
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/

    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
      アップデート
    ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    update: function (app)
    {
      time = app.currentTime;
      bgm_check(app);

      /*-----=-----=-----=-----=-----=-----
          ウィンドウ情報変わった時
        -----=-----=-----=-----=-----=-----*/
      if (this.food_updated)
      {
        now_scene = "持ち物";
        this.exit("リフレッシュ");
        this.food_updated = false;
      }
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          スクロール位置処理
        -----=-----=-----=-----=-----=-----*/
      if (!this.押下中)
      {
        if (this.終端位置 - this.始端位置 > this.下限 - this.上限)
        {
          if (this.始端位置 > this.上限)
          {
            this.慣性 = 0;
            this.始端位置 -= (this.始端位置 - this.上限) / (app.fps / 5) + 1;
            if (this.始端位置 < this.上限)
            {
              this.始端位置 = this.上限;
            }
          }
          else if (this.終端位置 < this.下限)
          {
            this.慣性 = 0;
            this.始端位置 += (this.下限 - this.終端位置) / (app.fps / 5) + 1;
            if (this.終端位置 > this.下限)
            {
              this.始端位置 = this.上限;
            }
          }
          else
          {
            this.始端位置 += this.慣性;
            if (this.慣性 > 0)
            {
              this.慣性 -= this.慣性 / (app.fps / 5);
              if (this.慣性 < 0)
              {
                this.慣性 = 0;
              }
            }
            if (this.慣性 < 0)
            {
              this.慣性 += -this.慣性 / (app.fps / 5);
              if (this.慣性 > 0)
              {
                this.慣性 = 0;
              }
            }
          }
        }
        else
        {
          if (this.始端位置 > this.上限)
          {
            this.慣性 = 0;
            this.始端位置 -= (this.始端位置 - this.上限) / (app.fps / 5) + 1;
            if (this.始端位置 < this.上限)
            {
              this.始端位置 = this.上限;
            }
          }
          else
          {
            this.慣性 = 0;
            this.始端位置 += (this.上限 - this.始端位置) / (app.fps / 5) + 1;
            if (this.始端位置 > this.上限)
            {
              this.始端位置 = this.上限;
            }
          }
        }
      }
      /*-----=-----=-----=-----=-----=-----*/
      this.set_windows_pos();
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  }
);
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

