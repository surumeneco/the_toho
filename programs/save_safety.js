/* v1.4.0: 旧Cookie互換のセーブを補強する安全ガード。 */
const toho_base_reload_check = reload_check;
reload_check = function () {
  // セーブがない状態でタイトルや図鑑をリロードしても新規プレイを開始しない。
  if (load_type == 1 && read_cookie('playingdata') === null) {
    load_type = -1;
    return false;
  }
  return toho_base_reload_check();
};

const toho_base_delete_cookies = delete_cookies;
delete_cookies = function () {
  if (toho_run && toho_run.active && !toho_checkpoint()) {
    // 元の「諦める」ハンドラは削除後に画面遷移するため、失敗を例外として止める。
    // 進行Cookieは残し、ブラウザのコンソールに保存障害を報告する。
    throw new Error('永続記録を保存できないため、プレイデータの削除を中止しました。');
  }
  return toho_base_delete_cookies();
};
