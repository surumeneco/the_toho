/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
    中央処理
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/
phina.main(function ()
{
  var app = GameApp
    ({
      //画面サイズ設定
      width: SCREEN_W,
      height: SCREEN_H,

      //アセット読み込み
      assets: ASSETS,

      fps: 60,

      startLabel: "タイトル",
      scenes:
        [
          {
            label: "タイトル",
            className: "Title_scene",
          },

          {
            label: "ホーム",
            className: "Home_scene",
          },

          {
            label: "探索",
            className: "Search_scene"
          },

          {
            label: "戦闘",
            className: "Battle_scene"
          },

          {
            label: "勝利",
            className: "Win_scene"
          },

          {
            label: "逃走",
            className: "Escape_scene"
          },

          {
            label: "入手",
            className: "Get_scene"
          },

          {
            label: "制作",
            className: "Craft_scene"
          },

          {
            label: "持ち物",
            className: "Inventory_scene"
          },

          {
            label: "睡眠",
            className: "Sleep_scene"
          },

          {
            label: "ストーリー",
            className: "Story_scene"
          },

          {
            label: "ゲームオーバー",
            className: "Gameover_scene"
          },

          {
            label: "リフレッシュ",
            className: "Refresh_scene"
          }
        ]
    });
  app.run();
});
/*-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-*/

