/* Named stories: keep IDs stable even when titles or body text change. */
const TOHO_STORY_DEFINITIONS = Object.freeze([
  { id: 'story:encounter', title: '遭遇', textIndex: 0,
    condition: '女の子……？を倒す', trigger: { type: 'victory', enemyId: 'enemy:girl-stage-1' } },
  { id: 'story:transformation', title: '変容', textIndex: 1,
    condition: '女の子……？を倒す', trigger: { type: 'victory', enemyId: 'enemy:girl-stage-2' } },
  { id: 'story:premonition', title: '予感', textIndex: 2,
    condition: '女の子……？を倒す', trigger: { type: 'victory', enemyId: 'enemy:girl-stage-3' } },
  { id: 'story:anomaly', title: '異変', textIndex: 3,
    condition: '全段階の「女の子……？」を倒した後、もう一度いずれかを倒す',
    trigger: { type: 'victory', afterAll: [
      'story:encounter', 'story:transformation', 'story:premonition',
    ] } },
]);
