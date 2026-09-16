/* v1.4.3: プレイ進行はlocalStorageだけで管理する。Cookie互換は行わない。 */
const TOHO_PROGRESS_KEY = 'the_toho:progress:v1';
const TOHO_PROGRESS_SCHEMA_VERSION = 1;

function toho_progress_valid_record(value) {
  return !!value && typeof value === 'object' &&
    value.schemaVersion === TOHO_PROGRESS_SCHEMA_VERSION &&
    Number.isFinite(Number(value.storyNum)) && Number(value.storyNum) >= 0 &&
    !!value.player && typeof value.player === 'object';
}

function toho_read_progress_local() {
  try {
    const raw = window.localStorage.getItem(TOHO_PROGRESS_KEY);
    if (raw === null) return undefined;
    const value = JSON.parse(raw);
    if (!toho_progress_valid_record(value)) {
      console.warn('復元できないlocalStorageのプレイデータです。上書きせず保持します。');
      return null;
    }
    return value;
  } catch (error) {
    console.warn('localStorageのプレイデータを読み込めませんでした。上書きせず保持します。', error);
    return null;
  }
}

function toho_write_progress_local(value) {
  try {
    window.localStorage.setItem(TOHO_PROGRESS_KEY, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('プレイデータの保存に失敗しました。', error);
    return false;
  }
}

function toho_remove_progress_local() {
  try {
    window.localStorage.removeItem(TOHO_PROGRESS_KEY);
    return true;
  } catch (error) {
    console.error('プレイデータの削除に失敗しました。', error);
    return false;
  }
}

function toho_read_progress_data() {
  const current = toho_read_progress_local();
  return current === undefined ? null : current;
}

function toho_restore_saved_player(savedPlayer) {
  player.set_data(savedPlayer);
  // JSON保存で消えるダイスのメソッドを復元する。
  for (const item of player.武器) {
    const attack = item[0].攻撃力;
    if (attack && typeof attack.roll !== 'function') {
      item[0].攻撃力 = Dices(attack.ダイス, attack.固定値);
    }
  }
}

// 既存シーンからの呼出し名は維持するが、実体はlocalStorageのみ。
set_progress_cookies = function () {
  return toho_write_progress_local({
    schemaVersion: TOHO_PROGRESS_SCHEMA_VERSION,
    storyNum: Number.isFinite(Number(story_num)) ? Number(story_num) : 0,
    player: player,
  });
};

set_cookies = function () {
  const settingsSaved = set_settings_cookies();
  const progressSaved = set_progress_cookies();
  return settingsSaved !== false && progressSaved;
};

get_cookies = function () {
  get_settings_cookies();
  const saved = toho_read_progress_data();
  if (!saved) return false;
  try {
    story_num = Number(saved.storyNum);
    toho_restore_saved_player(saved.player);
    return true;
  } catch (error) {
    console.warn('プレイデータを復元できませんでした。保存データは削除しません。', error);
    return false;
  }
};

delete_cookies = function () {
  if (!toho_remove_progress_local()) return false;
  story_num = 0;
  return true;
};
