/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    ゲームオーバー：履歴を確定してからプレイCookieだけを削除する。
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.define('Gameover_scene', {
  superClass: 'DisplayScene',
  init: function (option) {
    this.superInit(option);
    this.width = SCREEN_W;
    this.height = SCREEN_H;
    this.backgroundColor = Black;
    const self = this;

    // 再描画・再入場してもrunId単位で重複登録しない。
    this.saveReady = toho_finish_run();
    if (this.saveReady) delete_cookies();

    const versionLabel = Label({ text: 'バージョン：' + version, fill: White }).addChildTo(this);
    versionLabel.align = 'left';
    versionLabel.baseline = 'bottom';
    versionLabel.setPosition(25, SCREEN_H - 25);

    Label({ text: '力尽きてしまった...', fontSize: 64, fill: White })
      .addChildTo(this).setPosition(CENTER_W, 200);
    Label({ text: '過ごした日数：' + player.日数 + '日', fontSize: 64, fill: White })
      .addChildTo(this).setPosition(CENTER_W, 500);
    Label({ text: '探索した距離：' + (player.移動距離 / 1000) + 'km', fontSize: 64, fill: White })
      .addChildTo(this).setPosition(CENTER_W, 600);
    Label({ text: '多かった食料：' + player.most_eat()[0], fontSize: 64, fill: White })
      .addChildTo(this).setPosition(CENTER_W, 700);

    const makeButton = function (text, y, callback) {
      const button = Button({ text: text, fontSize: 64, width: 300, height: 150,
        cornerRadius: 0, fill: darkGray, stroke: lightGray, strokeWidth: 15 });
      button.addChildTo(self).setPosition(SCREEN_W - 200, y);
      button.onpointend = callback;
      return button;
    };
    makeButton('再挑戦', SCREEN_H - 545, function () {
      if (!self.saveReady) return;
      player = new Player();
      set_cookies();
      SoundManager.play('newgame');
      self.exit('ホーム');
    });
    makeButton('やめる', SCREEN_H - 250, function () {
      if (!self.saveReady) return;
      SoundManager.play('start');
      self.exit('タイトル');
    });

    // localStorageの容量超過・アクセス拒否時は消去や再挑戦を許可しない。
    if (!this.saveReady) {
      this.saveError = Label({
        text: '記録を保存できませんでした。\nデータを保護するため終了操作を停止しています。',
        fontSize: 42, fill: Red,
      }).addChildTo(this).setPosition(CENTER_W, 955);
      const retry = makeButton('保存を再試行', 1180, function () {
        SoundManager.play('select');
        if (!toho_finish_run()) return;
        self.saveReady = true;
        delete_cookies();
        self.saveError.remove();
        retry.remove();
      });
      retry.width = 500;
      retry.setPosition(CENTER_W, 1180);
    }
  },
  update: function (app) { bgm_check(app); },
});
