/* v1.4.0: 戦闘の開始数と勝利・逃走数を分離する。旧履歴は推測で変換しない。 */
const toho_original_note_encounter = toho_note_encounter;
toho_note_encounter = function (enemy) {
  toho_original_note_encounter(enemy);
  const run = toho_run;
  if (!run) return;
  if (!Number.isFinite(run.victories)) run.victories = 0;
  if (!Number.isFinite(run.escapes)) run.escapes = 0;
  // 同じ戦闘結果画面が再生成されても、遭遇ごとに一度だけ計数する。
  run.outcomeRecordedForBattle = null;
  toho_save_run();
};

function toho_note_battle_outcome(kind) {
  const run = toho_run;
  if (!run || !run.active || !run.battles || run.outcomeRecordedForBattle === run.battles) return;
  if (kind === 'victory') run.victories = (Number(run.victories) || 0) + 1;
  else if (kind === 'escape') run.escapes = (Number(run.escapes) || 0) + 1;
  else return;
  run.outcomeRecordedForBattle = run.battles;
  toho_save_run();
}

// save_safety.jsより先に置き、同ファイルの保存成功ガードにこの関数を取り込ませる。
toho_finish_run = function () {
  const run = toho_ensure_run();
  toho_track_player();
  toho_scan_inventory();
  const distance = Number(player.移動距離);
  const days = Number(player.日数);
  if (Number.isFinite(distance) && distance > toho_meta.records.bestDistanceMeters) {
    toho_meta.records.bestDistanceMeters = distance;
    toho_meta_dirty = true;
  }
  if (Number.isFinite(days) && days > toho_meta.records.bestDays) {
    toho_meta.records.bestDays = days;
    toho_meta_dirty = true;
  }
  if (!toho_meta.history.some(function (entry) { return entry.runId === run.id; })) {
    toho_meta.history.unshift({
      runId: run.id,
      recordVersion: 2,
      endedAt: new Date().toISOString(),
      distanceMeters: Number.isFinite(distance) ? distance : 0,
      days: Number.isFinite(days) ? days : 0,
      deathCause: toho_death_cause(run),
      // 「戦闘回数」は勝利した戦闘だけ。途中から更新した周回は更新後の実測分のみ。
      battleCount: Number(run.victories) || 0,
      escapeCount: Number(run.escapes) || 0,
      items: toho_inventory_snapshot(),
    });
    toho_meta.history = toho_meta.history.slice(0, 10);
    toho_meta_dirty = true;
  }
  return toho_save_meta();
};
