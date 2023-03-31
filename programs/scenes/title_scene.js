/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    タイトルシーン
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Title_scene",
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
      SoundManager.setVolumeMusic(music_volume / 100);
      SoundManager.setVolume(SE_volume / 100);

      //thisが別のものを指す時に使えるように
      var self = this;

      //背景色
      this.backgroundColor = Black;

      this.volume_changing = false;



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
      var font_size = 32;
      var text_y = SCREEN_H - 25;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          クレジット表示
        -----=-----=-----=-----=-----=-----*/
      var bgm_credit = Label("BGM:魔王魂　").addChildTo(this);
      bgm_credit.fill = White;
      bgm_credit.fontSize = font_size;
      bgm_credit.align = "right";
      bgm_credit.baseline = "bottom";
      bgm_credit.setPosition(SCREEN_W - 25, text_y - font_size * 2.6);
      /*-----=-----=-----=-----=-----=-----*/
      var se_credit = Label("SE:効果音ラボ　").addChildTo(this);
      se_credit.fill = White;
      se_credit.fontSize = font_size;
      se_credit.align = "right";
      se_credit.baseline = "bottom";
      se_credit.setPosition(SCREEN_W - 25, text_y - font_size * 1.3);
      /*-----=-----=-----=-----=-----=-----*/
      var my_credit = Label("制作:スルメねこ。").addChildTo(this);
      my_credit.fill = White;
      my_credit.fontSize = font_size;
      my_credit.align = "right";
      my_credit.baseline = "bottom";
      my_credit.setPosition(SCREEN_W - 25, text_y);
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          テキスト位置設定
        -----=-----=-----=-----=-----=-----*/
      var font_size = 64;
      var text_y = 500;
      this.text_floating_width = 20;
      this.text_floating_fase = 0;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          タイトル表示
        -----=-----=-----=-----=-----=-----*/
      var title = Label("THE 徒歩").addChildTo(this);
      title.fill = White;
      title.fontSize = font_size * 2;
      title.setPosition(CENTER_W, text_y);
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          通知表示
        -----=-----=-----=-----=-----=-----*/
      this.notice = Label("画面をタップしてスタート").addChildTo(this);
      this.notice.fill = White;
      this.notice.fontSize = font_size;
      this.notice.setPosition(CENTER_W, CENTER_H + this.text_floating_width * Math.sin(this.text_floating_fase));
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          音量設定バー設定
        -----=-----=-----=-----=-----=-----*/
      this.bar_width = SCREEN_W * 0.7;
      this.bar_height = 30;
      this.bar_pos_x = CENTER_W + 75;
      this.bar_pos_y = SCREEN_H - 500;
      this.bar_interval = 150;
      this.bar_label_space = 100;
      this.now_width = 0;

      this.now_volume_size = this.bar_height * 1.2;

      this.music_bar_width = this.bar_width * music_volume / 100;
      this.SE_bar_width = this.bar_width * SE_volume / 100;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          BGM音量設定バー表示
        -----=-----=-----=-----=-----=-----*/
      Label(
        {
          text: "BGM",
          fill: White,
          fontSize: font_size
        }).addChildTo(this)
        .setPosition(this.bar_pos_x - this.bar_width / 2 - this.bar_label_space, this.bar_pos_y);
      this.music_bar_base = RectangleShape(
        {
          width: this.bar_width,
          height: this.bar_height,
          fill: darkGray, strokeWidth: 0,
          cornerRadius: this.bar_height / 2
        }).addChildTo(this)
        .setPosition(this.bar_pos_x, this.bar_pos_y);
      this.music_bar_base.interactive = true;
      this.music_bar_base.on("pointstart", function (e)
      {
        pointer_move_x = 0;
        pointer_x = e.pointer.x;
        let pos_move = e.pointer.x - self.music_change.x;
        self.music_bar_width += pos_move;
        if (self.music_bar_width < 0) self.music_bar_width = 0;
        if (self.music_bar_width > self.bar_width) self.music_bar_width = self.bar_width;
        this.now_width = self.music_bar_width;
        music_volume = 100 * self.music_bar_width / self.bar_width;
        music_volume = Math.floor(music_volume);
        if (music_volume < 0) music_volume = 0;
        if (music_volume > 100) music_volume = 100;
        SoundManager.setVolumeMusic(music_volume / 100);
        self.volume_changing = true;
      });
      this.music_bar_base.on("pointmove", function (e)
      {
        pointer_move_x = e.pointer.x - pointer_x;
        self.music_bar_width = this.now_width + pointer_move_x;
        if (self.music_bar_width < 0) self.music_bar_width = 0;
        if (self.music_bar_width > self.bar_width) self.music_bar_width = self.bar_width;
        music_volume = 100 * self.music_bar_width / self.bar_width;
        music_volume = Math.floor(music_volume);
        if (music_volume < 0) music_volume = 0;
        if (music_volume > 100) music_volume = 100;
        SoundManager.setVolumeMusic(music_volume / 100);
      });
      this.music_bar_base.on("pointend", function (e)
      {
        music_volume = 100 * self.music_bar_width / self.bar_width;
        music_volume = Math.floor(music_volume);
        if (music_volume < 0) music_volume = 0;
        if (music_volume > 100) music_volume = 100;
        SoundManager.setVolumeMusic(music_volume / 100);
        SoundManager.play("select");
      });

      this.music_bar = RectangleShape(
        {
          width: this.music_bar_width + this.bar_height / 2,
          height: this.bar_height,
          fill: Cyan, strokeWidth: 0,
          cornerRadius: this.bar_height / 2
        }).addChildTo(this)
        .setPosition(this.bar_pos_x - this.bar_width / 2 + (this.music_bar_width + this.bar_height / 2) / 2, this.bar_pos_y);

      this.music_change = CircleShape(
        {
          radius: this.now_volume_size / 2,
          fill: White,
          stroke: Gray, strokeWidth: 15,
          interactive: true
        }).addChildTo(this);
      this.music_change.setPosition(this.bar_pos_x - this.bar_width / 2 + this.music_bar_width, this.bar_pos_y);
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          SE音量設定バー表示
        -----=-----=-----=-----=-----=-----*/
      Label(
        {
          text: "SE",
          fill: White,
          fontSize: font_size
        }).addChildTo(this)
        .setPosition(this.bar_pos_x - this.bar_width / 2 - this.bar_label_space, this.bar_pos_y + this.bar_interval);
      this.SE_bar_base = RectangleShape(
        {
          width: this.bar_width,
          height: this.bar_height,
          fill: darkGray, strokeWidth: 0,
          cornerRadius: this.bar_height / 2
        }).addChildTo(this)
        .setPosition(this.bar_pos_x, this.bar_pos_y + this.bar_interval);
      this.SE_bar_base.interactive = true;
      this.SE_bar_base.on("pointstart", function (e)
      {
        pointer_move_x = 0;
        pointer_x = e.pointer.x;
        let pos_move = e.pointer.x - self.SE_change.x;
        self.SE_bar_width += pos_move;
        if (self.SE_bar_width < 0) self.SE_bar_width = 0;
        if (self.SE_bar_width > self.bar_width) self.SE_bar_width = self.bar_width;
        this.now_width = self.SE_bar_width;
        self.volume_changing = true;
      });
      this.SE_bar_base.on("pointmove", function (e)
      {
        pointer_move_x = e.pointer.x - pointer_x;
        self.SE_bar_width = this.now_width + pointer_move_x;
        if (self.SE_bar_width < 0) self.SE_bar_width = 0;
        if (self.SE_bar_width > self.bar_width) self.SE_bar_width = self.bar_width;
      });
      this.SE_bar_base.on("pointend", function (e)
      {
        SE_volume = 100 * self.SE_bar_width / self.bar_width;
        SE_volume = Math.floor(SE_volume);
        if (SE_volume < 0) SE_volume = 0;
        if (SE_volume > 100) SE_volume = 100;
        SoundManager.setVolume(SE_volume / 100);
        SoundManager.play("select");
      });

      this.SE_bar = RectangleShape(
        {
          width: this.SE_bar_width + this.bar_height / 2,
          height: this.bar_height,
          fill: Cyan, strokeWidth: 0,
          cornerRadius: this.bar_height / 2
        }).addChildTo(this)
        .setPosition(this.bar_pos_x - this.bar_width / 2 + (this.SE_bar_width + this.bar_height / 2) / 2, this.bar_pos_y + this.bar_interval);

      this.SE_change = CircleShape(
        {
          radius: this.now_volume_size / 2,
          fill: White,
          stroke: Gray, strokeWidth: 15
        }).addChildTo(this);
      this.SE_change.setPosition(this.bar_pos_x - this.bar_width / 2 + this.SE_bar_width, this.bar_pos_y + this.bar_interval);
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          ゲームスタート
        -----=-----=-----=-----=-----=-----*/
      this.on("pointend", function ()
      {
        if (this.volume_changing)
        {
          this.volume_changing = false
        }
        else
        {
          SoundManager.play("newgame");
          player = new Player();
          this.exit("ホーム");
        }
      });
      /*-----=-----=-----=-----=-----=-----*/
    },
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/

    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
      アップデート
    ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    update: function (app)
    {
      bgm_check(app);

      this.text_floating_fase += Math.PI / app.fps / 2;
      this.text_floating_fase %= Math.PI * 2;
      this.notice.setPosition(CENTER_W, CENTER_H + this.text_floating_width * Math.sin(this.text_floating_fase));

      this.music_bar.width = this.music_bar_width + this.bar_height / 2;
      this.music_bar.setPosition(this.bar_pos_x - this.bar_width / 2 + (this.music_bar_width + this.bar_height / 2) / 2, this.bar_pos_y);
      this.music_change.setPosition(this.bar_pos_x - this.bar_width / 2 + this.music_bar_width, this.bar_pos_y);

      this.SE_bar.width = this.SE_bar_width + this.bar_height / 2;
      this.SE_bar.setPosition(this.bar_pos_x - this.bar_width / 2 + (this.SE_bar_width + this.bar_height / 2) / 2, this.bar_pos_y + this.bar_interval);
      this.SE_change.setPosition(this.bar_pos_x - this.bar_width / 2 + this.SE_bar_width, this.bar_pos_y + this.bar_interval);
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  }
);
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

