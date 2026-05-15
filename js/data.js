// data.js — 보스 / 채널 / 전리품 도메인 상수
//
// 결정석 가격은 보스 × 난이도별 "고정 값"이다 (boss_table.md 기준).
// 사용자 자유 입력(crystalOverrides)은 폐기됐다.
//
// 회차마다 난이도를 선택해서 기록하며, 그 난이도의 결정석/전리품이 적용된다.
// 보스 등장 유무·기본 난이도는 결정석(보스 설정) 페이지에서 정하며 localStorage에 저장.

// ── 난이도 ────────────────────────────────────────────

export const DIFFICULTY_LABEL = {
  easy:    '이지',
  normal:  '노멀',
  hard:    '하드',
  chaos:   '카오스',
  extreme: '익스트림',
};

// 난이도 정렬 순서 (이지 < 노멀 < 하드 < 카오스 < 익스트림)
const DIFFICULTY_RANK = { easy: 0, normal: 1, hard: 2, chaos: 3, extreme: 4 };

export const difficultyLabel = (key) => DIFFICULTY_LABEL[key] || key;
export const difficultyRank  = (key) => DIFFICULTY_RANK[key] ?? 99;

// ── 전리품 그룹 (항목 이름 → 그룹) ───────────────────
//
// 그룹은 아이템 고유 속성이라 보스/난이도와 무관하다.

const HAMMER  = ['해머(얼굴장식)', '해머(눈장식)', '해머(훈장)', '해머(귀고리)', '해머(벨트)'];
const PURPLE  = ['미트라의 분노', '거공', '몽벨', '마깃안', '루컨마', '고근', '마도서', '커포링'];
const UNIQUE  = ['황홀한 악몽', '근원의 속삭임', '죽음의 맹세', '불멸의 유산', '창세의 뱃지', '오만의 원죄', '언컨'];

export const LOOT_GROUP = (() => {
  const m = {};
  HAMMER.forEach(n => (m[n] = 'hammer'));
  PURPLE.forEach(n => (m[n] = 'purple'));
  UNIQUE.forEach(n => (m[n] = 'unique'));
  ['리4', '컨4', '리3', '컨3', '영달포', '에테상자', '연마석', '신마석', '장신망상자']
    .forEach(n => (m[n] = 'default'));
  // 레거시 호환: 기존 기록·백업의 '커포'를 '커포링'과 동일 취급.
  m['커포'] = 'purple';
  return m;
})();

export const getLootGroup = (itemName) => LOOT_GROUP[itemName] || 'default';

/**
 * 전리품 색상 그룹.
 *  - hammer:  해머 5종
 *  - purple:  퍼플코어 8종
 *  - unique:  유니크 (각 항목별로 LOOT_NAME_COLOR에서 개별 지정 — 그룹 색은 fallback)
 *  - default: 그 외 — 검정
 */
export const LOOT_COLORS = {
  hammer:  '#D4A056',
  purple:  '#9B5DE5',
  unique:  '#E0C9A6',
  default: '#1A1A1A',
};

/**
 * 항목별 글자색 override.
 * 유니크 전리품은 각 아이콘에서 추출한 도미넌트 컬러로 지정.
 */
export const LOOT_NAME_COLOR = {
  '황홀한 악몽':   '#FE9500',
  '근원의 속삭임': '#A500A6',
  '죽음의 맹세':   '#00FEFD',
  '불멸의 유산':   '#FFA700',
  '창세의 뱃지':   '#FB0400',
  '오만의 원죄':   '#C9B58E',
  '언컨':          '#D04040',
};

// ── 보스 ──────────────────────────────────────────────
//
// crystal 단위: 억 (boss_table.md의 메소를 1e8로 나눈 값).
// difficulties는 난이도 오름차순으로 작성.
//
// 기존 9보스는 ID를 그대로 보존(seren/kalos/lotus/baldrix/adversary/kaling/limbo/
// jupiter/blackmage) — 기존에 기록된 BossRun이 그대로 해석되도록.

const COMMON = ['리3', '리4', '컨3', '컨4'];
const PURPLE_CORE = ['거공', '몽벨', '마깃안', '루컨마', '고근', '마도서', '커포링'];

// 기존(v0.4) 보스별 전리품 — 이름 매칭해서 그대로 가져옴.
// boss_table.md에서 전리품 칸이 비어 있는 (기존 보스, 난이도)는 이 값으로 채운다.
// (사용자 결정: 표에 적힌 난이도는 표 값 / 빈칸은 기존 보스 전리품 / 신규 18보스 빈칸은 결정석만)
const LEGACY_LOOT = {
  seren:     ['해머(얼굴장식)', '미트라의 분노', '영달포', ...COMMON],
  kalos:     ['해머(눈장식)', '에테상자', '연마석', '영달포', ...COMMON],
  adversary: ['해머(훈장)', '불멸의 유산', '에테상자', '연마석', '영달포', ...COMMON],
  kaling:    ['해머(귀고리)', '에테상자', '신마석', ...PURPLE_CORE, ...COMMON],
  lotus:     ['황홀한 악몽', '에테상자', '신마석', ...PURPLE_CORE, ...COMMON],
  limbo:     ['근원의 속삭임', '장신망상자', '신마석', ...PURPLE_CORE, ...COMMON],
  baldrix:   ['죽음의 맹세', '장신망상자', '신마석', ...PURPLE_CORE, ...COMMON],
  jupiter:   ['오만의 원죄', ...COMMON],
  blackmage: ['해머(벨트)', '창세의 뱃지', ...COMMON],
};

export const BOSSES = [
  {
    id: 'gas', name: '가디언 엔젤 슬라임', cycle: 'weekly', color: '#7DD3FC',
    difficulties: [
      { key: 'normal', crystal: 0.268, loot: [] },
      { key: 'chaos',  crystal: 0.791, loot: [] },
    ],
  },
  {
    id: 'kalos', name: '감시자 칼로스', cycle: 'weekly', color: '#4ECDC4',
    difficulties: [
      { key: 'easy',    crystal: 3.11, loot: [...COMMON] },
      { key: 'normal',  crystal: 5.61, loot: ['연마석', ...COMMON] },
      { key: 'chaos',   crystal: 13.4, loot: [...LEGACY_LOOT.kalos] },
      { key: 'extreme', crystal: 43.2, loot: ['해머(눈장식)', '에테상자', '영달포', '연마석', ...COMMON] },
    ],
  },
  {
    id: 'damien', name: '데미안', cycle: 'weekly', color: '#EF4444',
    difficulties: [
      { key: 'normal', crystal: 0.184, loot: [] },
      { key: 'hard',   crystal: 0.515, loot: ['마깃안', ...COMMON] },
    ],
  },
  {
    id: 'dusk', name: '더스크', cycle: 'weekly', color: '#8B5CF6',
    difficulties: [
      { key: 'normal', crystal: 0.463, loot: [] },
      { key: 'chaos',  crystal: 0.735, loot: ['거공', ...COMMON] },
    ],
  },
  {
    id: 'dunkel', name: '듄켈', cycle: 'weekly', color: '#F59E0B',
    difficulties: [
      { key: 'normal', crystal: 0.5,   loot: [] },
      { key: 'hard',   crystal: 0.994, loot: ['커포링', ...COMMON] },
    ],
  },
  {
    id: 'lucid', name: '루시드', cycle: 'weekly', color: '#C4B5FD',
    difficulties: [
      { key: 'easy',   crystal: 0.314, loot: [] },
      { key: 'normal', crystal: 0.375, loot: [] },
      { key: 'hard',   crystal: 0.662, loot: ['몽벨', ...COMMON] },
    ],
  },
  {
    id: 'limbo', name: '림보', cycle: 'weekly', color: '#60A5FA',
    difficulties: [
      { key: 'normal', crystal: 10.8, loot: ['루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', '신마석', ...COMMON] },
      { key: 'hard',   crystal: 25.1, loot: [...LEGACY_LOOT.limbo] },
    ],
  },
  {
    id: 'magnus', name: '매그너스', cycle: 'weekly', color: '#93C5FD',
    difficulties: [
      { key: 'hard', crystal: 0.0856, loot: [] },
    ],
  },
  {
    id: 'vonbon', name: '반반', cycle: 'weekly', color: '#FBBF24',
    difficulties: [
      { key: 'chaos', crystal: 0.0815, loot: [] },
    ],
  },
  {
    id: 'baldrix', name: '발드릭스', cycle: 'weekly', color: '#34D399',
    difficulties: [
      { key: 'normal', crystal: 14.4, loot: ['신마석', ...PURPLE_CORE, ...COMMON] },
      { key: 'hard',   crystal: 32.4, loot: ['죽음의 맹세', '신마석', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', ...COMMON] },
    ],
  },
  {
    id: 'vellum', name: '벨룸', cycle: 'weekly', color: '#FCD34D',
    difficulties: [
      { key: 'chaos', crystal: 0.0928, loot: [] },
    ],
  },
  {
    id: 'bloodyqueen', name: '블러디퀸', cycle: 'weekly', color: '#DC2626',
    difficulties: [
      { key: 'chaos', crystal: 0.0814, loot: [] },
    ],
  },
  {
    // 선택받은 세렌(=기존 'seren'): 표엔 전리품 칸이 비어 있으나,
    // 사용자 결정에 따라 기존 세렌 전리품을 전 난이도에 채움.
    id: 'seren', name: '선택받은 세렌', cycle: 'weekly', color: '#FF6B9D',
    difficulties: [
      { key: 'normal',  crystal: 2.66,  loot: [...COMMON] },
      { key: 'hard',    crystal: 3.96,  loot: ['미트라의 분노', ...COMMON] },
      { key: 'extreme', crystal: 31.5,  loot: [...LEGACY_LOOT.seren] },
    ],
  },
  {
    id: 'suu', name: '스우', cycle: 'weekly', color: '#2DD4BF',
    difficulties: [
      { key: 'normal',  crystal: 0.176, loot: [] },
      { key: 'hard',    crystal: 0.542, loot: ['루컨마', ...COMMON] },
      { key: 'extreme', crystal: 6.04,  loot: ['루컨마', '언컨', ...COMMON] },
    ],
  },
  {
    id: 'cygnus', name: '시그너스', cycle: 'weekly', color: '#FDE047',
    difficulties: [
      { key: 'easy',   crystal: 0.0455, loot: [] },
      { key: 'normal', crystal: 0.075,  loot: [] },
    ],
  },
  {
    id: 'will', name: '윌', cycle: 'weekly', color: '#A3E635',
    difficulties: [
      { key: 'easy',   crystal: 0.34,  loot: [] },
      { key: 'normal', crystal: 0.433, loot: [] },
      { key: 'hard',   crystal: 0.812, loot: ['마도서', ...COMMON] },
    ],
  },
  {
    id: 'jupiter', name: '유피테르', cycle: 'weekly', color: '#FB923C',
    difficulties: [
      { key: 'normal', crystal: 17.0, loot: ['신마석', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', ...COMMON] },
      { key: 'hard',   crystal: 51.0, loot: ['오만의 원죄', '신마석', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', ...COMMON] },
    ],
  },
  {
    id: 'zakum', name: '자쿰', cycle: 'weekly', color: '#B45309',
    difficulties: [
      { key: 'chaos', crystal: 0.0808, loot: [] },
    ],
  },
  {
    id: 'jinhilla', name: '진 힐라', cycle: 'weekly', color: '#9333EA',
    difficulties: [
      { key: 'normal', crystal: 0.749, loot: [] },
      { key: 'hard',   crystal: 1.12,  loot: ['고근', ...COMMON] },
    ],
  },
  {
    id: 'lotus', name: '찬란한 흉성', cycle: 'weekly', color: '#F87171',
    difficulties: [
      { key: 'normal', crystal: 6.58,  loot: ['연마석', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', ...COMMON] },
      { key: 'hard',   crystal: 28.19, loot: [...LEGACY_LOOT.lotus] },
    ],
  },
  {
    id: 'adversary', name: '최초의 대적자', cycle: 'weekly', color: '#FFD93D',
    difficulties: [
      { key: 'easy',    crystal: 3.24, loot: ['연마석', ...COMMON] },
      { key: 'normal',  crystal: 5.89, loot: ['연마석', ...COMMON] },
      { key: 'hard',    crystal: 15.1, loot: ['불멸의 유산', '에테상자', '연마석', '영달포', ...COMMON] },
      { key: 'extreme', crystal: 49.6, loot: ['해머(훈장)', '불멸의 유산', '에테상자', '영달포', '연마석', ...COMMON] },
    ],
  },
  {
    id: 'kaling', name: '카링', cycle: 'weekly', color: '#A78BFA',
    difficulties: [
      { key: 'easy',    crystal: 4.19, loot: [] },
      { key: 'normal',  crystal: 7.14, loot: ['연마석', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', ...COMMON] },
      { key: 'hard',    crystal: 18.3, loot: ['신마석', '에테상자', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', ...COMMON] },
      { key: 'extreme', crystal: 56.7, loot: ['해머(귀고리)', '신마석', '에테상자', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', '영달포', ...COMMON] },
    ],
  },
  {
    id: 'papulatus', name: '파풀라투스', cycle: 'weekly', color: '#38BDF8',
    difficulties: [
      { key: 'chaos', crystal: 0.138, loot: [] },
    ],
  },
  {
    id: 'pierre', name: '피에르', cycle: 'weekly', color: '#F472B6',
    difficulties: [
      { key: 'chaos', crystal: 0.0817, loot: [] },
    ],
  },
  {
    id: 'pinkbean', name: '핑크빈', cycle: 'weekly', color: '#F9A8D4',
    difficulties: [
      { key: 'chaos', crystal: 0.0658, loot: [] },
    ],
  },
  {
    id: 'hilla', name: '힐라', cycle: 'weekly', color: '#C026D3',
    difficulties: [
      { key: 'hard', crystal: 0.0575, loot: [] },
    ],
  },
  {
    id: 'blackmage', name: '검은 마법사', cycle: 'monthly', color: '#C084FC',
    difficulties: [
      { key: 'hard',    crystal: 7.0,  loot: ['창세의 뱃지', ...COMMON] },
      { key: 'extreme', crystal: 92.0, loot: [...LEGACY_LOOT.blackmage] },
    ],
  },
];

// ── 채널 ──────────────────────────────────────────────
//
// 채널 40개. 인게임 채널 선택창 순서:
//   1채널 → 20세이상 → 2채널 → 3채널 → ... → 39채널

export const CHANNELS = (() => {
  const list = ['1', '20세이상'];
  for (let i = 2; i <= 39; i++) list.push(String(i));
  return list;
})();

// "20세이상" 채널은 "20세이상채널"이 아니라 "20세이상"으로만 표기.
export function channelLabel(channel) {
  return channel === '20세이상' ? '20세이상' : `${channel}채널`;
}

// ── 전리품 이미지 매핑 ───────────────────────────────

export const LOOT_IMAGE = {
  // 해머
  '해머(얼굴장식)': 'png/해머(얼굴장식).png',
  '해머(눈장식)':   'png/해머(눈장식).png',
  '해머(훈장)':     'png/해머(훈장).png',
  '해머(귀고리)':   'png/해머(귀고리).png',
  '해머(벨트)':     'png/해머(벨트).png',
  // 퍼플코어
  '미트라의 분노':  'png/미트라의 분노.png',
  '거공':           'png/거공.png',
  '몽벨':           'png/몽벨.png',
  '마깃안':         'png/마깃안.png',
  '루컨마':         'png/루컨마.png',
  '고근':           'png/고근.png',
  '마도서':         'png/마도서.png',
  '커포링':         'png/커포.png',
  '커포':           'png/커포.png',  // 레거시 호환
  // 유니크
  '황홀한 악몽':    'png/황홀한 악몽.png',
  '근원의 속삭임':  'png/근원의 속삭임.png',
  '죽음의 맹세':    'png/죽음의 맹세.png',
  '불멸의 유산':    'png/불멸의 유산.png',
  '창세의 뱃지':    'png/창세의 뱃지.png',
  '오만의 원죄':    'png/오만의 원죄.png',
  '언컨':           'png/언컨.png',
  // 박스 / 석재 / 영달포
  '에테상자':       'png/에테상자.png',
  '장신망상자':     'png/장신망상자.webp',
  '연마석':         'png/연마석.webp',
  '신마석':         'png/신마석.webp',
  '영달포':         'png/영달포.png',
  // 공통
  '리4':            'png/리4.png',
  '컨4':            'png/컨4.png',
  '리3':            'png/리3.png',
  '컨3':            'png/컨3.png',
};

// ── 헬퍼 ──────────────────────────────────────────────

export const getBoss = (bossId) => BOSSES.find(b => b.id === bossId) || null;

/** 보스의 난이도 목록 [{ key, crystal, loot }] (없으면 []). */
export const getBossDifficulties = (bossId) => getBoss(bossId)?.difficulties || [];

/** 보스의 특정 난이도 객체 (없으면 null). */
export function getBossDifficulty(bossId, difficultyKey) {
  const diffs = getBossDifficulties(bossId);
  return diffs.find(d => d.key === difficultyKey) || null;
}

/**
 * 회차의 난이도를 확정한다.
 *  1) run에 저장된 difficulty가 그 보스에 유효하면 그대로
 *  2) 아니면 사용자 기본 난이도 설정(defaults map)
 *  3) 그것도 없으면 보스의 첫(가장 낮은) 난이도
 * @returns {string|null} 난이도 key (보스가 없으면 null)
 */
export function resolveDifficultyKey(bossId, runDifficulty, defaults = {}) {
  const diffs = getBossDifficulties(bossId);
  if (diffs.length === 0) return null;
  if (runDifficulty && diffs.some(d => d.key === runDifficulty)) return runDifficulty;
  const dft = defaults[bossId];
  if (dft && diffs.some(d => d.key === dft)) return dft;
  return diffs[0].key;
}

/**
 * 결정석 가격(억). 난이도가 유효하지 않으면 첫 난이도로 fallback.
 * @param {string} bossId
 * @param {string} difficultyKey
 */
export function getEffectiveCrystal(bossId, difficultyKey) {
  const diffs = getBossDifficulties(bossId);
  if (diffs.length === 0) return 0;
  const d = diffs.find(x => x.key === difficultyKey) || diffs[0];
  return Number(d.crystal) || 0;
}

/** 보스 × 난이도 전리품 목록 [{ name, group }]. */
export function getBossLoot(bossId, difficultyKey) {
  const d = getBossDifficulty(bossId, difficultyKey);
  if (!d || !Array.isArray(d.loot)) return [];
  return d.loot.map(name => ({ name, group: getLootGroup(name) }));
}

/** 보이는 보스만 (visible map: { [id]: false } 면 숨김, 그 외 전부 노출). */
export const isBossVisible = (bossId, visible = {}) => visible[bossId] !== false;
export const getVisibleBosses = (visible = {}) => BOSSES.filter(b => isBossVisible(b.id, visible));

/** 보스 이름 가나다순 정렬된 복사본. */
export const bossesByName = () =>
  [...BOSSES].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

// 보스 표시 순서 (사용자 지정). 이 목록에 없는 보스는 아래에 이름 가나다순.
const BOSS_ORDER = [
  'blackmage', 'suu', 'seren', 'kalos', 'kaling', 'adversary', 'lotus',
  'limbo', 'baldrix', 'jupiter', 'jinhilla', 'dunkel', 'dusk', 'will',
  'lucid', 'gas', 'damien',
];

/** 사용자 지정 순서 → 나머지 가나다순. 보스 목록 노출은 전부 이걸 사용. */
export function bossesInOrder() {
  const rank = new Map(BOSS_ORDER.map((id, i) => [id, i]));
  const fixed = [];
  const rest  = [];
  for (const b of BOSSES) (rank.has(b.id) ? fixed : rest).push(b);
  fixed.sort((a, b) => rank.get(a.id) - rank.get(b.id));
  rest.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  return [...fixed, ...rest];
}

/** 표시 순서 인덱스 (목록에 없으면 큰 값). 회차 보스 select 정렬용. */
export function bossOrderIndex(bossId) {
  const ordered = bossesInOrder();
  const i = ordered.findIndex(b => b.id === bossId);
  return i < 0 ? 9999 : i;
}

export const getLootColor = (group) => LOOT_COLORS[group] || LOOT_COLORS.default;
export const getLootImage = (itemName) => LOOT_IMAGE[itemName] || null;

/**
 * 표시용 색: 항목별 override가 있으면 그걸, 없으면 그룹 색.
 * dark fallback(#1A1A1A)은 null로 반환 → 호출부에서 기본 색 그대로 사용.
 */
export function getDisplayLootColor(itemName, group) {
  if (LOOT_NAME_COLOR[itemName]) return LOOT_NAME_COLOR[itemName];
  const g = group || getLootGroup(itemName);
  const groupColor = LOOT_COLORS[g];
  if (!groupColor || groupColor === '#1A1A1A') return null;
  return groupColor;
}
