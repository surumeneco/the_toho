/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    制作シーン
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Craft_scene",
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
      this.is_sliding = false;
      this.is_alerted = false;

      //thisが別のものを指す時に使えるように
      var self = this;

      //背景色
      this.backgroundColor = Black;

      //現在のシーン
      now_scene = "制作";

      this.必要道具所持 = new Array();
      this.制作可能レシピ = new Array();
      this.表示レシピ = new Array();



      /*-----=-----=-----=-----=-----=-----
          レシピ一覧位置
        -----=-----=-----=-----=-----=-----*/
      this.押下中 = false;
      this.慣性 = 0;
      this.スクロール開始時間 = 0;
      this.スクロール開始位置 = 0;
      this.スクロール距離 = 0;
      this.上下余白 = 20;
      this.前フレームの座標 = 0;

      this.上限 = 280 + this.上下余白;
      this.下限 = SCREEN_H - 350;
      this.始端位置 = this.上限;
      this.終端位置 = this.始端位置;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          レシピ一覧設定
        -----=-----=-----=-----=-----=-----*/
      this.set_recipes = function ()
      {
        this.制作可能レシピ.clear();
        this.必要道具所持.clear();
        for (let i = 0; i < recipes_data.length; i++)
        {
          this.必要道具所持.push(false);
          if (recipes_data[i][0] == "無し" || player.has_item(recipes_data[i][0]) > 0)
          {
            this.必要道具所持[i] = true;
            this.制作可能レシピ.push([recipes_data[i][0], recipes_data[i][1]]);
          }
        }
      }
      this.set_recipes();
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          表示するレシピ設定
        -----=-----=-----=-----=-----=-----*/
      for (let i = 0; i < this.制作可能レシピ[current_recipe_page][1].length; i++)
      {
        var recipe = Recipe_window(this.制作可能レシピ[current_recipe_page][1][i]).addChildTo(this);
        this.表示レシピ.push(recipe);
      }
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          レシピ一覧スクロールバー
        -----=-----=-----=-----=-----=-----*/
      this.scroll_bar = RectangleShape
        ({
          width: 15, height: (this.下限 - this.上限) / this.表示レシピ.length,
          fill: White, strokeWidth: 0,
          cornerRadius: 0
        }).addChildTo(this);
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          レシピ一覧とスクロールバー位置設定関数
        -----=-----=-----=-----=-----=-----*/
      this.set_recipes_pos = function ()
      {
        var pos_y = this.始端位置 + this.スクロール距離;
        for (let i = 0; i < this.表示レシピ.length; i++)
        {
          pos_y += this.表示レシピ[i].ウィンドウ.height / 2;
          this.表示レシピ[i].set_position(CENTER_W, pos_y);
          pos_y += this.表示レシピ[i].ウィンドウ.height / 2 + this.上下余白;
        }
        this.終端位置 = pos_y;

        let scroll_bar_interval = (this.下限 - this.上限) / this.表示レシピ.length;
        let scroll_height = this.下限 - this.上限;
        let scroll_length = this.終端位置 - (this.始端位置 + this.スクロール距離) - scroll_height;
        let scroll_pos = this.上限 - (this.始端位置 + this.スクロール距離);
        if (scroll_pos < 0) scroll_pos = 0;
        if (scroll_pos > scroll_length) scroll_pos = scroll_length;
        var scroll_bar_pos = (scroll_height - scroll_bar_interval) * scroll_pos / scroll_length;
        this.scroll_bar.setPosition
          (
            SCREEN_W - this.scroll_bar.width,
            this.上限 + scroll_bar_interval / 2 + scroll_bar_pos
          );
      }
      this.set_recipes_pos();
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          テキスト位置設定
        -----=-----=-----=-----=-----=-----*/
      var font_size = 64;
      var text_y = 100;
      var text_interval = 100
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
      var notice = Label({ text: "制作可能なもの一覧" }).addChildTo(this);
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
          テキストとボタン位置設定
        -----=-----=-----=-----=-----=-----*/
      var font_size = 48;
      var text_x = CENTER_W - 175;
      var text_y = SCREEN_H - 300;
      var button_w = 300;
      var button_h = 75;
      var buttons_interval = 88;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          現在のレシピの必要道具表示
        -----=-----=-----=-----=-----=-----*/
      this.now_tool = Label("使う道具：" + this.制作可能レシピ[current_recipe_page][0]).addChildTo(this);
      this.now_tool.fill = White;
      this.now_tool.fontSize = 64;
      this.now_tool.setPosition(text_x, text_y);
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          ページ切り替え左ボタン
        -----=-----=-----=-----=-----=-----*/
      this.go_left = Button({
        text: "---",
        fontSize: font_size,
        width: button_w, height: button_h, cornerRadius: 0,
        fill: "#1E1E1E", fontColor: lightGray,
        stroke: lightGray, strokeWidth: 15,
      }).addChildTo(this)
        .setPosition(text_x - button_w / 2 - 20, text_y + buttons_interval);
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          ページ切り替え右ボタン
        -----=-----=-----=-----=-----=-----*/
      this.go_right = Button({
        text: "---",
        fontSize: font_size,
        width: button_w, height: button_h, cornerRadius: 0,
        fill: "#1E1E1E", fontColor: lightGray,
        stroke: lightGray, strokeWidth: 15,
      }).addChildTo(this)
        .setPosition(text_x + button_w / 2 + 20, text_y + buttons_interval);
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
          レシピ一覧再描画関数
        -----=-----=-----=-----=-----=-----*/
      this.reload = function ()
      {
        for (let i = 0; i < this.表示レシピ.length; i++)
        {
          this.表示レシピ[i].reload();
        }
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

      var self = this;

      /*-----=-----=-----=-----=-----=-----
          リロード入る時
        -----=-----=-----=-----=-----=-----*/
      if (is_reload)
      {
        is_reload = false;
        let past_status = new Array();
        for (let i = 0; i < recipes_data.length; i++)
        {
          past_status.push((recipes_data[i][0] == "無し") || (player.has_item(recipes_data[i][0]) > 0));
        }

        let is_reset_recipes = false;
        let index = current_recipe_page;
        let increase = 0;
        for (let i = 0; i < recipes_data.length; i++)
        {
          if (!past_status[i]) index++;
          if (this.必要道具所持[i] != past_status[i])
          {
            is_reset_recipes = true;
            if (i < index)
            {
              if (this.必要道具所持[i])
              {
                increase++;
              }
              else 
              {
                increase--;
              }
            }
          }
        }
        if (is_reset_recipes)
        {
          this.set_recipes();
          current_recipe_page += increase;
          if (current_recipe_page < 0) current_recipe_page = 0;
          if (current_recipe_page >= this.制作可能レシピ.length) current_recipe_page = this.制作可能レシピ.length - 1;
          this.exit("リフレッシュ");
        }
        this.reload();
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
              this.慣性 -= this.慣性 / (app.fps / 2);
              if (this.慣性 < 0)
              {
                this.慣性 = 0;
              }
            }
            if (this.慣性 < 0)
            {
              this.慣性 += -this.慣性 / (app.fps / 2);
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
      this.set_recipes_pos();



      /*-----=-----=-----=-----=-----=-----
          ページ切り替えボタン処理
        -----=-----=-----=-----=-----=-----*/
      this.go_left.text = "---";
      this.go_left.fontColor = lightGray;
      this.go_left.fill = "#1E1E1E";
      this.go_left.onpointend = function () { };
      this.go_right.text = "---";
      this.go_right.fontColor = lightGray;
      this.go_right.fill = "#1E1E1E";
      this.go_right.onpointend = function () { };

      if (current_recipe_page < 0) current_recipe_page = 0;
      if (current_recipe_page >= this.制作可能レシピ.length) current_recipe_page = this.制作可能レシピ.length - 1;

      if (current_recipe_page > 0)
      {
        this.go_left.text = this.制作可能レシピ[current_recipe_page - 1][0];
        this.go_left.fontColor = White;
        this.go_left.fill = darkGray;
        this.go_left.onpointend = function ()
        {
          current_recipe_page--;
          SoundManager.play("select");
          self.exit("リフレッシュ");
        };
      }
      if (current_recipe_page < this.制作可能レシピ.length - 1)
      {
        this.go_right.text = this.制作可能レシピ[current_recipe_page + 1][0];
        this.go_right.fontColor = White;
        this.go_right.fill = darkGray;
        this.go_right.onpointend = function ()
        {
          current_recipe_page++;
          SoundManager.play("select");
          self.exit("リフレッシュ");
        };
      }
      /*-----=-----=-----=-----=-----=-----*/



      this.SP.text = "気力：" + player.気力;
      this.SP.fill = White;
      if (player.気力 < (5 + Math.floor(player.移動距離 / 10000)) * 2)
      {
        this.SP.fill = Red;
        if (!this.is_alerted)
        {
          SoundManager.play("alert");
          this.is_alerted = true;
        }
      }
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  }
);
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

