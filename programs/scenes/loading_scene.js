/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    ローディングシーン
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("LoadingScene",
  {
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
      コンストラクタ
    ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    superClass: "DisplayScene",
    init: function (option)
    {
      this.superInit(option);
      var loader = phina.asset.AssetLoader();

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
          通知表示
        -----=-----=-----=-----=-----=-----*/
      var notice = Label("ロード中").addChildTo(this);
      notice.fill = White;
      notice.fontSize = font_size;
      notice.setPosition(CENTER_W, text_y);
      text_y += text_interval * 3;
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          読み込み円設定
        -----=-----=-----=-----=-----=-----*/
      this.radius = 100;
      this.fase = -Math.PI / 2;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          読み込み円表示
        -----=-----=-----=-----=-----=-----*/
      this.load1 = CircleShape(
        {
          radius: 25,
          fill: Cyan,
          strokeWidth: 0
        }
      ).addChildTo(this);
      this.load2 = CircleShape(
        {
          radius: 25,
          fill: Cyan,
          strokeWidth: 0
        }
      ).addChildTo(this);
      this.load3 = CircleShape(
        {
          radius: 25,
          fill: Cyan,
          strokeWidth: 0
        }
      ).addChildTo(this);
      this.load1.setPosition(CENTER_W + this.radius * Math.cos(this.fase), CENTER_H + this.radius * Math.sin(this.fase));
      this.load2.setPosition(CENTER_W + this.radius * Math.cos(this.fase + Math.PI * 2 / 3), CENTER_H + this.radius * Math.sin(this.fase + Math.PI * 2 / 3));
      this.load3.setPosition(CENTER_W + this.radius * Math.cos(this.fase + Math.PI * 4 / 3), CENTER_H + this.radius * Math.sin(this.fase + Math.PI * 4 / 3));
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          読み込みバー設定
        -----=-----=-----=-----=-----=-----*/
      this.bar_width = SCREEN_W * 0.8;
      this.progress_width = 0;
      this.x = CENTER_W;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          読み込みバー表示
        -----=-----=-----=-----=-----=-----*/
      this.load_progress_back = RectangleShape(
        {
          width: this.bar_width,
          height: 50,
          fill: darkGray,
          strokeWidth: 0,
          cornerRadius: 25
        }
      ).addChildTo(this);
      this.load_progress_back.setPosition(this.x, CENTER_H + this.radius * 3);
      this.load_progress = RectangleShape(
        {
          width: 0,
          height: 50,
          fill: Cyan,
          strokeWidth: 0,
          cornerRadius: 25
        }
      ).addChildTo(this);
      this.load_progress.setPosition(this.x - this.bar_width / 2 + this.load_progress.width / 2, CENTER_H + this.radius * 3);
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          読み込みバー先端表示
        -----=-----=-----=-----=-----=-----*/
      this.load_indicator = RectangleShape(
        {
          width: 50, height: 50,
          fill: White,
          stroke: mossCyan, strokeWidth: 20,
          cornerRadius: 0
        }
      ).addChildTo(this);
      this.load_indicator.setPosition(this.x - this.bar_width / 2 + this.load_progress.width, CENTER_H + this.radius * 3);
      /*-----=-----=-----=-----=-----=-----*/



      loader.onprogress = function (e)
      {
        self.load_progress.width = self.bar_width * e.progress;
        self.load_progress.setPosition(self.x - self.bar_width / 2 + self.load_progress.width / 2, CENTER_H + self.radius * 3);
        self.load_indicator.setPosition(self.x - self.bar_width / 2 + self.load_progress.width, CENTER_H + self.radius * 3);
      };

      // ローダーによるロード完了ハンドラ
      loader.onload = function ()
      {
        // Appコアにロード完了を伝える（==次のSceneへ移行）
        self.flare('loaded');
      };

      // ロード開始
      loader.load(option.assets);
    },
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/

    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
      アップデート
    ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    update: function (app)
    {
      this.load1.setPosition(CENTER_W + this.radius * Math.cos(this.fase), CENTER_H + this.radius * Math.sin(this.fase));
      this.load2.setPosition(CENTER_W + this.radius * Math.cos(this.fase + Math.PI * 2 / 3), CENTER_H + this.radius * Math.sin(this.fase + Math.PI * 2 / 3));
      this.load3.setPosition(CENTER_W + this.radius * Math.cos(this.fase + Math.PI * 4 / 3), CENTER_H + this.radius * Math.sin(this.fase + Math.PI * 4 / 3));
      this.fase += Math.PI / app.fps;
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  }
);
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

