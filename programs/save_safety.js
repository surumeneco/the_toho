/* v1.4.1: localStorage進行セーブと旧Cookie移行を補強する安全ガード。 */
let toho_resume_checked = false;
reload_check = function () {
  // 初回のページ遷移でも既存セーブを復元。タイトル再訪時には二重復元しない。
  if (toho_resume_checked) return false;
  toho_resume_checked = true;
  const saved = toho_read_progress_data();
  if (!saved) { load_type = -1; return false; }
  const data = saved.player;
  if (!data || typeof data !== 'object' || !Number.isFinite(Number(data.日数)) ||
    !Number.isFinite(Number(data.移動距離)) || !Array.isArray(data.食料) ||
    !Array.isArray(data.武器) || !Array.isArray(data.道具) || !Array.isArray(data.素材)) {
    console.warn('復元できないプレイデータです。削除せずタイトルに留まります。');
    load_type = -1;
    return false;
  }
  get_cookies();
  load_type = -1;
  return true;
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
    // 「諦める」ハンドラの画面遷移を停止し、進行セーブを保護する。
    throw new Error('永続記録を保存できないため、プレイデータの削除を中止しました。');
  }
  const deleted = toho_base_delete_cookies();
  if (deleted === false) {
    throw new Error('プレイデータを削除できなかったため、画面遷移を中止しました。');
  }
  return deleted;
};
