/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    ストーリーシーン
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Story_scene",
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

      SoundManager.pauseMusic();

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
      var font_size = 48;
      var text_y = 500;
      var text_interval = 100;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          ストーリー表示
        -----=-----=-----=-----=-----=-----*/
      var story = Label("").addChildTo(this);
      story.fill = White;
      story.fontSize = font_size;
      story.setPosition(CENTER_W, CENTER_H);
      if (story_num < story_texts.length)
      {
        story.text = story_texts[story_num];
      }
      story_num++;
      if (story_num >= story_texts.length)
      {
        story_num = story_texts.length - 1;
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
          勝利シーンに進むボタン
        -----=-----=-----=-----=-----=-----*/
      Button({
        text: "次へ",
        fontSize: font_size,
        width: button_w, height: button_h, cornerRadius: 0,
        fill: darkGray,
        stroke: lightGray, strokeWidth: 15,
      }).addChildTo(this)
        .setPosition(buttons_x, buttons_y)
        .onpointend = function ()
        {
          SoundManager.play("win");
          SoundManager.resumeMusic();
          self.exit("勝利");
        };
      /*-----=-----=-----=-----=-----=-----*/
    },
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/

    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
      アップデート
    ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    update: function (app)
    {
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  }
);
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

