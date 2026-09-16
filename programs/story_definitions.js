/* New stories need only a stable ID, title, body index, display condition and trigger.
 * Trigger schema: { type: eventName, all: [condition, ...] } (also supports any/not).
 * Register any new predicate via toho_register_story_condition in story_trigger_engine.js.
 */
const TOHO_STORY_DEFINITIONS = Object.freeze([
  { id: 'story:encounter', title: '遭遇', textIndex: 0,
    condition: '女の子……？を倒す', trigger: { type: 'victory', all: [
      { kind: 'enemy', ids: ['enemy:girl-stage-1'] },
    ] } },
  { id: 'story:transformation', title: '変容', textIndex: 1,
    condition: '女の子……？を倒す', trigger: { type: 'victory', all: [
      { kind: 'enemy', ids: ['enemy:girl-stage-2'] },
    ] } },
  { id: 'story:premonition', title: '予感', textIndex: 2,
    condition: '女の子……？を倒す', trigger: { type: 'victory', all: [
      { kind: 'enemy', ids: ['enemy:girl-stage-3'] },
    ] } },
  { id: 'story:anomaly', title: '異変', textIndex: 3,
    condition: '全段階の「女の子……？」を倒した後、もう一度いずれかを倒す',
    trigger: { type: 'victory', all: [
      { kind: 'enemy', ids: [
        'enemy:girl-stage-1', 'enemy:girl-stage-2', 'enemy:girl-stage-3',
      ] },
      { kind: 'storiesPreviouslyUnlocked', ids: [
        'story:encounter', 'story:transformation', 'story:premonition',
      ] },
    ] } },
]);
