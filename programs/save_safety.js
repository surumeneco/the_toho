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

// 同じプレイヤーで結果シーンが再生成されても、新しい周回IDを作って記録し直さない。
const toho_base_finish_run = toho_finish_run;
toho_finish_run = function () {
  if (player && player.__toho_finished_run) return true;
  const completed = toho_base_finish_run();
  if (completed && player) {
    Object.defineProperty(player, '__toho_finished_run', {
      value: true, enumerable: false, configurable: true,
    });
  }
  return completed;
};

const toho_base_delete_cookies = delete_cookies;
delete_cookies = function () {
  if (toho_run && toho_run.active && !toho_checkpoint()) {
    // 「諦める」ハンドラの画面遷移を停止し、進行Cookieを保護する。
    throw new Error('永続記録を保存できないため、プレイデータの削除を中止しました。');
  }
  return toho_base_delete_cookies();
};
