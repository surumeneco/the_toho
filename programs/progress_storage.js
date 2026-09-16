/* v1.4.1: プレイ進行をCookieからlocalStorageへ移行する。 */
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

function toho_clear_legacy_progress_cookies() {
  remove_cookie('storydata');
  remove_cookie('playingdata');
}

function toho_read_legacy_progress() {
  const savedPlay = read_cookie('playingdata');
  if (savedPlay === null) return null;
  try {
    const savedStory = read_cookie('storydata');
    return {
      schemaVersion: TOHO_PROGRESS_SCHEMA_VERSION,
      storyNum: savedStory !== null && /^\d+$/.test(savedStory) ? Number(savedStory) : 0,
      player: JSON.parse(savedPlay),
    };
  } catch (error) {
    console.warn('旧Cookieのプレイデータを解析できませんでした。削除せず保持します。', error);
    return null;
  }
}

function toho_read_progress_data() {
  const current = toho_read_progress_local();
  if (current !== undefined) return current;

  // v1.4.0以前のCookieセーブは初回読込時にlocalStorageへ移行する。
  const legacy = toho_read_legacy_progress();
  if (legacy === null) return null;
  if (toho_write_progress_local(legacy)) toho_clear_legacy_progress_cookies();
  return legacy;
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

// 関数名は既存呼出しとの互換性のため維持するが、進行データはCookieへ書かない。
set_progress_cookies = function () {
  const saved = toho_write_progress_local({
    schemaVersion: TOHO_PROGRESS_SCHEMA_VERSION,
    storyNum: Number.isFinite(Number(story_num)) ? Number(story_num) : 0,
    player: player,
  });
  if (saved) toho_clear_legacy_progress_cookies();
  return saved;
};

set_cookies = function () {
  set_settings_cookies();
  return set_progress_cookies();
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
  toho_clear_legacy_progress_cookies();
  story_num = 0;
  return true;
};
