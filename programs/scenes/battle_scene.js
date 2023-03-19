/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    戦闘シーン
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define("Battle_scene",
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

      //thisが別のものを指す時に使えるように
      var self = this;

      //背景色
      this.backgroundColor = Black;

      this.choosed_weapon = 0;
      this.past_choosed_weapon = -1;
      this.is_weapon_lost = false;
      this.broken_weapon = "";

      //敵設定
      let 出現可能 = false;
      do 
      {
        this.敵 = Object.assign({}, enemies_data[Math.floor(Math.random() * enemies_data.length)]);
        if (player.移動距離 < this.敵.出現距離) 出現可能 = false;
        else 出現可能 = true;
      } while (!出現可能);

      this.戦闘フェイズ = "プレイヤーの攻撃";
      this.ダメージ = new Array();



      /*-----=-----=-----=-----=-----=-----
          ボタン設定
        -----=-----=-----=-----=-----=-----*/
      this.font_size = 48;
      this.button_w = SCREEN_W - 70;
      this.button_h = 100;
      this.buttons_x = CENTER_W;

      this.buttons_interval = 20;
      this.buttons_ref = 750 + this.buttons_interval;
      this.end_buttons_ref = SCREEN_H - 350 - this.buttons_interval;
      this.now_buttons_ref = this.buttons_ref;
      this.end_buttons_pos = this.now_buttons_ref;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          攻撃ボタン
        -----=-----=-----=-----=-----=-----*/
      this.attacks = new Array();
      let こぶし = Weapon("こぶし", Dices([[1, 2]], 0));

      let pos_y = this.now_buttons_ref + pointer_move_y;

      let button = Attack_button(こぶし, 0, {
        fontSize: this.font_size,
        width: this.button_w, height: this.button_h, cornerRadius: 0,
        fill: darkGray,
        stroke: lightGray, strokeWidth: 10,
      }).addChildTo(this);
      this.attacks.push(button);
      button.onpointend = function ()
      {
        if (self.戦闘フェイズ == "プレイヤーの攻撃")
        {
          self.past_choosed_weapon = self.choosed_weapon;
          self.choosed_weapon = this.ID;
          self.ダメージ = this.武器.攻撃力.roll();
          self.戦闘フェイズ = "敵にダメージ";
        }
      };
      button.setPosition(this.buttons_x, pos_y);
      pos_y += this.button_h + this.buttons_interval;

      for (let i = 0; i < player.武器.length; i++)
      {
        console.log(player.武器[i][0].名前);
        button = Attack_button(
          player.武器[i][0], i + 1,
          {
            fontSize: this.font_size,
            width: this.button_w, height: this.button_h, cornerRadius: 0,
            fill: darkGray,
            stroke: lightGray, strokeWidth: 10,
          }
        ).addChildTo(this);
        this.attacks.push(button);
        button.onpointend = function ()
        {
          if (self.戦闘フェイズ == "プレイヤーの攻撃")
          {
            self.past_choosed_weapon = self.choosed_weapon;
            self.choosed_weapon = this.ID;
            self.ダメージ = this.武器.攻撃力.roll();
            self.戦闘フェイズ = "敵にダメージ";
          }
        };
        button.setPosition(this.buttons_x, pos_y);
        pos_y += this.button_h + this.buttons_interval;
      }
      this.end_buttons_pos = pos_y + this.button_h;
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
      RectangleShape
        ({
          width: SCREEN_W,
          height: 700,
          fill: Black,
          stroke: White, strokeWidth: 10,
        }).addChildTo(this)
        .setPosition(CENTER_W, 700 / 2);
      this.notice = Label(this.敵.名前 + "と遭遇した").addChildTo(this);
      this.notice.fill = White;
      this.notice.fontSize = font_size;
      this.notice.setPosition(CENTER_W, text_y);
      text_y += text_interval * 3;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          敵の名前表示
        -----=-----=-----=-----=-----=-----*/
      var enemy_name = Label(this.敵.名前).addChildTo(this);
      enemy_name.fill = White;
      enemy_name.fontSize = font_size * 2;
      enemy_name.setPosition(CENTER_W, text_y);
      text_y += text_interval * 2;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          敵の体力表示
        -----=-----=-----=-----=-----=-----*/
      this.enemy_HP = Label("体力：" + this.敵.体力).addChildTo(this);
      this.enemy_HP.fill = White;
      this.enemy_HP.fontSize = font_size;
      this.enemy_HP.setPosition(CENTER_W, text_y);
      text_y += text_interval;
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          敵の攻撃力表示
        -----=-----=-----=-----=-----=-----*/
      let text = "";
      for (let i = 0; i < this.敵.攻撃力.ダイス.length; i++)
      {
        text += this.敵.攻撃力.ダイス[i][0] + "d" + this.敵.攻撃力.ダイス[i][1];
        if (i < this.敵.攻撃力.ダイス.length - 1) text += "+";
      }
      if (this.敵.攻撃力.固定値 > 0) text += "+" + this.敵.攻撃力.固定値;
      var enemy_attack = Label("攻撃力：" + text).addChildTo(this);
      enemy_attack.fill = White;
      enemy_attack.fontSize = font_size;
      enemy_attack.setPosition(CENTER_W, text_y);
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
          逃げるボタン
        -----=-----=-----=-----=-----=-----*/
      RectangleShape
        ({
          width: SCREEN_W,
          height: 350,
          fill: Black,
          stroke: White, strokeWidth: 10,
        }).addChildTo(this)
        .setPosition(CENTER_W, SCREEN_H - 350 / 2);
      this.escape_button = Button({
        text: "逃げる",
        fontSize: font_size,
        width: button_w, height: button_h, cornerRadius: 0,
        fill: darkGray,
        stroke: lightGray, strokeWidth: 15,
      }).addChildTo(this);
      this.escape_button.setPosition(buttons_x, buttons_y)
        .onpointend = function ()
        {
          if (self.戦闘フェイズ == "プレイヤーの攻撃")
          {
            SoundManager.play("escape");
            self.exit("逃走");
          }
        };
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          プレイヤーの体力表示
        -----=-----=-----=-----=-----=-----*/
      this.player_HP = Label("残り体力：" + player.体力).addChildTo(this);
      this.player_HP.fill = White;
      this.player_HP.fontSize = font_size;
      this.player_HP.align = "left";
      this.player_HP.baseline = "top";
      this.player_HP.setPosition(20, SCREEN_H - 350 + 20);
      /*-----=-----=-----=-----=-----=-----*/

      /*-----=-----=-----=-----=-----=-----
          捕捉情報表示
        -----=-----=-----=-----=-----=-----*/
      this.tips = Label("※同じ武器を連続で使用すると\n　壊れやすくなります").addChildTo(this);
      this.tips.fill = White;
      this.tips.fontSize = 48;
      this.tips.align = "left";
      this.tips.baseline = "top";
      this.tips.setPosition(20, SCREEN_H - 350 + 20 + 120);
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
          攻撃一覧再描画関数
        -----=-----=-----=-----=-----=-----*/
      this.set_attacks_pos = function ()
      {
        let pos_y = this.now_buttons_ref + pointer_move_y;
        for (let i = 0; i < this.attacks.length; i++)
        {
          this.attacks[i].setPosition(this.buttons_x, pos_y);
          pos_y += this.button_h + this.buttons_interval;
        }
        this.end_buttons_pos = pos_y + this.button_h;
      }
      /*-----=-----=-----=-----=-----=-----*/



      /*-----=-----=-----=-----=-----=-----
          スクロール処理
        -----=-----=-----=-----=-----=-----*/
      this.on("pointstart", function (e)
      {
        pointer_y = e.pointer.y;
        this.is_sliding = true;
      });
      this.on("pointmove", function (e)
      {
        pointer_move_y = e.pointer.y - pointer_y;
      });
      this.on("pointend", function ()
      {
        this.now_buttons_ref += pointer_move_y;

        if (pointer_move_y <= 0)
        {
          switch (this.戦闘フェイズ)
          {
            default: break;
            case "プレイヤーの攻撃": break;
            case "敵にダメージ": break;
            case "敵へのダメージを表示":
              this.戦闘フェイズ = "敵の攻撃";
              if (this.is_weapon_lost)
              {
                SoundManager.play("select");
                this.戦闘フェイズ = "武器ロスト通知";
                this.is_weapon_lost = false;
              }
              break;
            case "武器ロスト通知":
              this.戦闘フェイズ = "敵の攻撃";
              break;
            case "敵の攻撃": break;
            case "プレイヤーへのダメージを表示":
              SoundManager.play("select");
              this.戦闘フェイズ = "プレイヤーの攻撃";
              this.notice.text = "攻撃を選んでください";
              if (player.体力 <= 0)
              {
                SoundManager.play("gameover");
                this.exit("ゲームオーバー");
              }
              break;
          }
        }

        pointer_move_y = 0;
        this.is_sliding = false;
      });
      /*-----=-----=-----=-----=-----=-----*/
    },
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/

    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---
      アップデート
    ---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
    update: function (app)
    {
      /*-----=-----=-----=-----=-----=-----
          スクロール位置処理
        -----=-----=-----=-----=-----=-----*/
      if (!this.is_sliding)
      {
        let end_pos = this.end_buttons_pos - this.button_h - this.buttons_interval * 3.5;
        if (this.now_buttons_ref > this.buttons_ref)
        {
          this.now_buttons_ref -= (this.now_buttons_ref - this.buttons_ref) / (app.fps / 5) + 1;
          if (this.now_buttons_ref < this.buttons_ref)
          {
            this.now_buttons_ref = this.buttons_ref;
          }
        }
        else if (end_pos - this.now_buttons_ref > this.end_buttons_ref - this.buttons_ref)
        {
          if (end_pos < this.end_buttons_ref)
          {
            this.now_buttons_ref += (this.end_buttons_ref - end_pos) / (app.fps / 5) + 1;
          }
        }
        else if (this.now_buttons_ref < this.buttons_ref)
        {
          this.now_buttons_ref += (this.buttons_ref - this.now_buttons_ref) / (app.fps / 5) + 1;
          if (this.now_buttons_ref > this.buttons_ref)
          {
            this.now_buttons_ref = this.buttons_ref;
          }
        }
      }
      /*-----=-----=-----=-----=-----=-----*/
      this.set_attacks_pos();



      /*-----=-----=-----=-----=-----=-----
          戦闘フェイズ処理
        -----=-----=-----=-----=-----=-----*/
      this.escape_button.fontColor = lightGray;
      this.escape_button.fill = "#1E1E1E";
      switch (this.戦闘フェイズ)
      {
        default: break;
        case "プレイヤーの攻撃":
          this.escape_button.fontColor = White;
          this.escape_button.fill = darkGray;
          break;

        case "敵にダメージ":
          var total = 0;
          var text = "敵に";
          for (let i = 0; i < this.ダメージ.length; i++) total += this.ダメージ[i];
          text += total + "ダメージ(";
          for (let i = 0; i < this.ダメージ.length; i++)
          {
            text += this.ダメージ[i];
            if (i < this.ダメージ.length - 1) text += "+";
          }
          text += ")";
          this.notice.text = text;

          this.敵.体力 -= total;
          this.enemy_HP.text = "体力：" + this.敵.体力;
          SoundManager.play("attack");

          this.戦闘フェイズ = "敵へのダメージを表示";
          console.log(this.choosed_weapon);
          if (Math.floor(Math.random() * 100) < now_broken_rate)
          {
            if (this.choosed_weapon > 0)
            {
              console.log(this.attacks[this.choosed_weapon].武器.名前);
              player.get_item(this.attacks[this.choosed_weapon].武器.名前, -1);
              this.broken_weapon = this.attacks[this.choosed_weapon].武器.名前;
              if (player.has_item(this.attacks[this.choosed_weapon].武器.名前) <= 0)
              {
                this.children.splice(this.choosed_weapon, 1);
              }
              now_broken_rate = broken_rate;
              this.is_weapon_lost = true;
            }
          }
          else if (this.choosed_weapon == this.past_choosed_weapon)
          {
            now_broken_rate += broken_rate_up;
          }
          else now_broken_rate = broken_rate;
          break;

        case "敵へのダメージを表示":
          break;

        case "武器ロスト通知":
          this.notice.text = this.broken_weapon + "が壊れた";
          break;

        case "敵の攻撃":
          if (this.敵.体力 <= 0)
          {
            now_enemy = this.敵;
            SoundManager.play("win");
            this.exit("勝利");
          }
          this.ダメージ = this.敵.攻撃力.roll();
          var total = 0;
          var text = "";
          for (let i = 0; i < this.ダメージ.length; i++) total += this.ダメージ[i];
          text += total + "ダメージ(";
          for (let i = 0; i < this.ダメージ.length; i++)
          {
            text += this.ダメージ[i];
            if (i < this.ダメージ.length - 1) text += "+";
          }
          text += ")を受けた";
          this.notice.text = text;

          player.体力 -= total;
          this.player_HP.text = "残り体力：" + player.体力;
          this.player_HP.fill = White;
          if (player.体力 <= 20)
          {
            this.player_HP.fill = Red;
            SoundManager.play("alert");
          }
          SoundManager.play("damage");
          this.戦闘フェイズ = "プレイヤーへのダメージを表示";
          break;
        case "プレイヤーへのダメージを表示":
          break;
      }
      /*-----=-----=-----=-----=-----=-----*/
    }
    /*---=---=---=---=---=---=---=---=---=---=---=---=---=---=---=---*/
  }
);
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

