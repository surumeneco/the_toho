/* v1.4.3: 1.4.xでは設定・進行・メタ情報をlocalStorageだけで管理する。 */

get_settings_cookies = function () {
  const settings = toho_read_json(TOHO_SETTINGS_KEY);
  if (toho_apply_settings(settings)) return true;

  saved_music_volume = music_volume;
  saved_SE_volume = SE_volume;
  SoundManager.setVolumeMusic(music_volume / 100);
  SoundManager.setVolume(SE_volume / 100);
  return toho_write_json(TOHO_SETTINGS_KEY, {
    bgmVolume: music_volume,
    seVolume: SE_volume,
    assetVersion: version,
  });
};

set_settings_cookies = function () {
  const saved = toho_write_json(TOHO_SETTINGS_KEY, {
    bgmVolume: music_volume,
    seVolume: SE_volume,
    assetVersion: version,
  });
  if (saved) {
    saved_music_volume = music_volume;
    saved_SE_volume = SE_volume;
  }
  return saved;
};

// meta_progress.js読込時に既定値が適用されていても、localStorageの値を最終状態として再適用する。
get_settings_cookies();
