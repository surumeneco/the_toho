/* v1.4.0: keep destructive-action descriptions consistent and attach SE to the
 * notification actually being displayed, rather than to an unlock event. */

// This file loads before main.js creates GameApp/loads its sound assets.
ASSETS.sound.notice = asset('sounds/notice.mp3');

// The notification renderer consumes exactly one queued item with shift() when
// it creates a popup. Do not play for a queued unlock or a deleted/cleared notice.
const toho_notice_queue_shift = Array.prototype.shift;
toho_achievement_notices.shift = function () {
  const displayed = toho_notice_queue_shift.call(this);
  if (displayed) SoundManager.play('notice');
  return displayed;
};

// All archive dialogs have the same element layout: overlay, panel, heading,
// explanation, error label, confirm, cancel. Keep the deletion logic in its
// existing owner; this mapping changes presentation only.
const TOHO_DELETE_CONFIRM_COPY = Object.freeze({
  encyclopedia: {
    heading: '図鑑の解放情報を\nすべて削除しますか？',
    explanation: '削除後は元に戻せません。\n実績・ストーリー・プレイ履歴・最高記録・\n音量設定・進行中のプレイは残ります。',
  },
  history: {
    heading: 'プレイ履歴と最高記録を\nすべて削除しますか？',
    explanation: '削除後は元に戻せません。\n図鑑・実績・ストーリー・音量設定・\n進行中のプレイは残ります。',
  },
  achievements: {
    heading: '実績の解放情報と累計記録を\nすべて削除しますか？',
    explanation: '削除後は元に戻せません。\n図鑑・ストーリー・プレイ履歴・最高記録・\n音量設定・進行中のプレイは残ります。',
  },
  stories: {
    heading: 'ストーリーの解放・閲覧情報を\nすべて削除しますか？',
    explanation: '削除後は元に戻せません。\n図鑑・実績・プレイ履歴・最高記録・\n音量設定・進行中のプレイは残ります。',
  },
});

const toho_original_confirm_dialog = Toho_archive_scene_v14.prototype.showDeleteDialog;
Toho_archive_scene_v14.prototype.showDeleteDialog = function (kind) {
  const wasOpen = !!this._deleteDialog;
  const result = toho_original_confirm_dialog.call(this, kind);
  const copy = TOHO_DELETE_CONFIRM_COPY[kind];
  // In particular, never rewrite the text of an already open, different dialog.
  if (!copy || wasOpen || !this._deleteDialog) return result;
  const elements = this._deleteDialog.elements;
  if (!elements || !elements[2] || !elements[3]) return result;
  elements[2].text = copy.heading;
  elements[2].fontSize = 54;
  elements[2].setPosition(CENTER_W, CENTER_H - 165);
  elements[3].text = copy.explanation;
  elements[3].fontSize = 28;
  elements[3].setPosition(CENTER_W, CENTER_H - 12);
  return result;
};

// Abandoning removes only the current run, not the persistent progress.
const toho_original_abandon_confirmation = Home_scene.prototype.showAbandonDialog;
Home_scene.prototype.showAbandonDialog = function () {
  const wasOpen = !!this._abandonDialog;
  const result = toho_original_abandon_confirmation.call(this);
  if (wasOpen || !this._abandonDialog) return result;
  const explanation = this._abandonDialog.elements[3];
  if (explanation) {
    explanation.text = '現在のプレイデータは削除されます。\n図鑑・実績・ストーリー・プレイ履歴・\n最高記録・音量設定は残ります。';
    explanation.fontSize = 30;
  }
  return result;
};
