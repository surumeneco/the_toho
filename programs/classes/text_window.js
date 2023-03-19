/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    ウィンドウクラス
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Text_window",
  {
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
        コンストラクタ
      ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    superClass: "DisplayElement",
    init: function (w, window_name)
    {
      this.superInit();

      this.font_size = 48;
      this.行間 = 20;
      this.ウィンドウ幅 = w;
      this.ウィンドウ高さ = this.行間 * 2 + this.font_size;



      /*-----=-----=-----=-----=-----=-----
          ウィンドウ本体設定
        -----=-----=-----=-----=-----=-----*/
      this.ウィンドウ = RectangleShape
        ({
          width: this.ウィンドウ幅,
          height: this.ウィンドウ高さ,
          fill: darkGray,
          stroke: lightGray, strokeWidth: 5,
        }).addChildTo(this);
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          ウィンドウ名設定
        -----=-----=-----=-----=-----=-----*/
      this.ウィンドウ名 = Label({ text: window_name }).addChildTo(this);
      this.ウィンドウ名.fontSize = this.font_size;
      this.ウィンドウ名.fill = White;
      this.ウィンドウ名.align = "left";
      this.ウィンドウ名.baseline = "top";
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          テキスト設定
        -----=-----=-----=-----=-----=-----*/
      this.テキスト = new Array();
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          描画位置変更
        -----=-----=-----=-----=-----=-----*/
      this.set_position = function (x, y)
      {
        this.ウィンドウ.setPosition(x, y);
        this.ウィンドウ名.setPosition
          (
            x - this.ウィンドウ幅 / 2 + this.行間,
            y - this.ウィンドウ高さ / 2 + this.行間
          );
        for (let i = 0; i < this.テキスト.length; i++)
        {
          this.テキスト[i].set_position
            (
              x,
              y - this.ウィンドウ高さ / 2 + this.行間 + this.font_size / 2 + (this.font_size + this.行間) * (i + 1)
            );
        }
      }
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          テキスト追加
        -----=-----=-----=-----=-----=-----*/
      this.push_text = function (text)
      {
        let label = Interactive_text(
          this.ウィンドウ幅 - this.行間 * 2, this.font_size,
          text, this.font_size, White,
          "left", "center"
        ).addChildTo(this);
        this.テキスト.push(label);

        this.ウィンドウ高さ += this.font_size + this.行間;
        this.ウィンドウ.height = this.ウィンドウ高さ;
      }
      /*-----=-----=-----=-----=-----=-----*/
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  });
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/



/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    インタラクト可能なテキストクラス
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Interactive_text",
  {
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
        コンストラクタ
      ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    superClass: "RectangleShape",
    init: function (w, h, text, font_size, color, text_align, text_baseline)
    {
      this.superInit
        ({
          width: w,
          height: h,
          fill: "rgba(0,0,0,0)",
          strokeWidth: 0,
        });

      this.setInteractive(true);

      /*-----=-----=-----=-----=-----=-----
          テキスト設定
        -----=-----=-----=-----=-----=-----*/
      this.label = Label(text).addChildTo(this);
      this.label.fontSize = font_size;
      this.label.fill = color;
      this.label.align = text_align;
      this.label.baseline = text_baseline;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          テキスト位置設定
        -----=-----=-----=-----=-----=-----*/
      this.w = w;
      this.h = h;
      this.text_align = text_align;
      this.text_baseline = text_baseline;
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          テキスト再設定関数
        -----=-----=-----=-----=-----=-----*/
      this.set_text = function (text)
      {
        this.label.text = text;
      }
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          描画位置設定関数
        -----=-----=-----=-----=-----=-----*/
      this.set_position = function (x, y)
      {
        this.setPosition(x, y);
        var text_x = 0;
        var text_y = 15;
        switch (this.text_align)
        {
          default: break;
          case "left": text_x -= this.w / 2; break;
          case "right": text_x += this.w / 2; break;
        }
        switch (this.text_baseline)
        {
          default: break;
          case "top": text_y -= this.h / 2; break;
          case "bottom": text_y += this.h / 2; break;
        }
        this.label.setPosition(text_x, text_y);
      }
      /*-----=-----=-----=-----=-----=-----*/
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  });
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/





/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    レシピウィンドウクラス
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Recipe_window",
  {
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
        コンストラクタ
      ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    superClass: "DisplayElement",
    init: function (recipe)
    {
      this.font_size = 48;
      this.行間 = 20;

      this.superInit();

      var self = this;

      this.制作可能 = true;

      /*-----=-----=-----=-----=-----=-----
          ウィンドウ本体設定
        -----=-----=-----=-----=-----=-----*/
      this.ウィンドウ = RectangleShape
        ({
          width: SCREEN_W - 70,
          height: this.font_size,
          fill: darkGray,
          stroke: lightGray, strokeWidth: 5,
        }).addChildTo(this);
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          制作物テキスト設定
        -----=-----=-----=-----=-----=-----*/
      let has_p = player.has_item(recipe.制作物);
      this.product = Label
        (
          recipe.制作物 + " x" + recipe.個数 + " 制作気力：" + recipe.制作気力
        ).addChildTo(this);
      this.product.fontSize = this.font_size;
      this.product.fill = White;
      this.product.align = "left";
      this.product.baseline = "top";
      if (player.気力 < recipe.制作気力)
      {
        this.product.fill = Red;
        this.制作可能 = false;
      }
      this.having = Label
        (
          "所持数：" + has_p
        ).addChildTo(this);
      this.having.fontSize = this.font_size;
      this.having.fill = White;
      this.having.align = "right";
      this.having.baseline = "top";
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          必要素材見出し設定
        -----=-----=-----=-----=-----=-----*/
      this.need_label = Label("必要素材").addChildTo(this);
      this.need_label.fontSize = this.font_size;
      this.need_label.fill = White;
      this.need_label.align = "left";
      this.need_label.baseline = "top";
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          必要素材一覧設定
        -----=-----=-----=-----=-----=-----*/
      this.needs = new Array();
      for (let i = 0; i < recipe.必要素材.length; i++)
      {
        let has = player.has_item(recipe.必要素材[i][0]);
        let text = Label(
          "・" + recipe.必要素材[i][0] + " x" + has + "/" + recipe.必要素材[i][1]
        ).addChildTo(this);
        text.fontSize = this.font_size;
        text.fill = White;
        if (has < recipe.必要素材[i][1])
        {
          text.fill = Red;
          this.制作可能 = false;
        }
        text.align = "left";
        text.baseline = "top";
        this.needs.push(text);
      }
      /*-----=-----=-----=-----=-----=-----*/

      this.ウィンドウ高さ = this.行間 + (this.font_size + this.行間) * (2 + this.needs.length);
      this.ウィンドウ.height = this.ウィンドウ高さ;



      /*-----=-----=-----=-----=-----=-----
          作るボタン
        -----=-----=-----=-----=-----=-----*/
      this.make = Button
        ({
          text: "作る",
          fontSize: this.font_size,
          width: 200, height: 100, cornerRadius: 0,
          fill: darkGray,
          stroke: lightGray, strokeWidth: 10,
        }).addChildTo(this);
      if (this.制作可能)
      {
        this.make.onpointend = function ()
        {
          if (this.y < SCREEN_H - 350)
          {
            player.get_item(recipe.制作物, recipe.個数);
            for (let i = 0; i < recipe.必要素材.length; i++)
            {
              player.get_item(recipe.必要素材[i][0], -recipe.必要素材[i][1]);
            }
            player.気力 -= recipe.制作気力;
            SoundManager.play("make");
            is_reload = true;
          }
        };
      }
      else
      {
        this.make.fontColor = lightGray;
        this.make.fill = "#1E1E1E";
      }
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          描画位置設定関数
        -----=-----=-----=-----=-----=-----*/
      this.set_position = function (x, y)
      {
        this.ウィンドウ.setPosition(x, y);

        let now_x = x - this.ウィンドウ.width / 2 + this.行間;
        let now_y = y - this.ウィンドウ.height / 2 + this.行間;

        this.product.setPosition(now_x, now_y);
        this.having.setPosition(x + this.ウィンドウ.width / 2 - this.行間, now_y);
        now_y += this.行間 + this.font_size;

        this.need_label.setPosition(now_x, now_y);
        now_y += this.行間 + this.font_size;

        for (let i = 0; i < this.needs.length; i++)
        {
          this.needs[i].setPosition(now_x, now_y);
          now_y += this.行間 + this.font_size;
        }

        this.make.setPosition(
          x + this.ウィンドウ.width / 2 - this.行間 - this.make.width / 2,
          y + this.ウィンドウ.height / 2 - this.行間 - this.make.height / 2
        );
      }
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          描画再設定関数
        -----=-----=-----=-----=-----=-----*/
      this.reload = function ()
      {
        this.制作可能 = true;
        let has_p = player.has_item(recipe.制作物);
        this.product.text = recipe.制作物 + " x" + recipe.個数 + " 制作気力：" + recipe.制作気力;
        this.product.fill = White;
        this.having.text = "所持数：" + has_p;
        if (player.気力 < recipe.制作気力)
        {
          this.product.fill = Red;
          this.制作可能 = false;
        }
        for (let i = 0; i < recipe.必要素材.length; i++)
        {
          let has = player.has_item(recipe.必要素材[i][0]);
          this.needs[i].text = "・" + recipe.必要素材[i][0] + " x" + has + "/" + recipe.必要素材[i][1];
          this.needs[i].fill = White;
          if (has < recipe.必要素材[i][1])
          {
            this.needs[i].fill = Red;
            this.制作可能 = false;
          }
        }
        this.make.fontColor = White;
        this.make.fill = darkGray;
        if (this.制作可能)
        {
          this.make.onpointend = function ()
          {
            if (this.y < SCREEN_H - 350)
            {
              player.get_item(recipe.制作物, recipe.個数);
              for (let i = 0; i < recipe.必要素材.length; i++)
              {
                player.get_item(recipe.必要素材[i][0], -recipe.必要素材[i][1]);
              }
              player.気力 -= recipe.制作気力;
              SoundManager.play("make");
              is_reload = true;
            }
          };
        }
        else
        {
          this.make.onpointend = function () { };
          this.make.fontColor = lightGray;
          this.make.fill = "#1E1E1E";
        }
      }
      /*-----=-----=-----=-----=-----=-----*/
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  });
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

