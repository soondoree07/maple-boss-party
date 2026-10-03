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

export const difficultyLabel = (key) => DIFFICULTY_LABEL[key] || key;

// ── 전리품 그룹 (항목 이름 → 그룹) ───────────────────
//
// 그룹은 아이템 고유 속성이라 보스/난이도와 무관하다.

// 각 배열의 순서 = 그룹 내 표시 순서 (사용자 지정).
const UNIQUE  = ['황홀한 악몽', '근원의 속삭임', '죽음의 맹세', '불멸의 유산', '창세의 뱃지', '오만의 원죄', '굶주리는 핏빛 원혼', '언컨'];
const HAMMER  = ['해머(얼굴장식)', '해머(눈장식)', '해머(훈장)', '해머(귀고리)', '해머(벨트)'];
const EPIC    = ['연마석', '신마석', '장신망상자', '영달포'];
const PURPLE  = ['루컨마', '마깃안', '몽벨', '마도서', '거공', '고근', '커포링', '미트라의 분노'];
// 소울 에테르는 1~4단계가 있다. 등급 자리는 임시로 퍼플코어 바로 아래 (사용자 결정 2026-09-30).
const SOUL    = ['1단계 소울 에테르', '2단계 소울 에테르', '3단계 소울 에테르', '4단계 소울 에테르'];
// 반지 상자 이름은 "꽝" 기록이다 (상자 이름 + 0억). 정렬 자리를 리4 · 컨4 바로 뒤에 둔다.
const DEFAULT = ['리3', '리4', '컨3', '컨4',
  '홍옥의 보스 반지 상자', '흑옥의 보스 반지 상자', '백옥의 보스 반지 상자', '생명의 보스 반지 상자', '에테상자'];

// 전리품 그룹 표시 순서: 유니크 → 해머 → 에픽 → 퍼플코어 → 소울 에테르 → 기본
const LOOT_GROUP_ORDER = ['unique', 'hammer', 'epic', 'purple', 'soul', 'default'];
const GROUP_ARRAYS = { unique: UNIQUE, hammer: HAMMER, epic: EPIC, purple: PURPLE, soul: SOUL, default: DEFAULT };

export const LOOT_GROUP = (() => {
  const m = {};
  for (const g of LOOT_GROUP_ORDER) GROUP_ARRAYS[g].forEach(n => (m[n] = g));
  // 레거시 호환: 기존 기록·백업의 '커포'를 '커포링'과 동일 취급.
  m['커포'] = 'purple';
  return m;
})();

// name → [그룹순위, 그룹내순위] (전리품 나열 정렬용)
const LOOT_SORT_INDEX = (() => {
  const m = {};
  LOOT_GROUP_ORDER.forEach((g, gi) => {
    GROUP_ARRAYS[g].forEach((n, i) => (m[n] = [gi, i]));
  });
  m['커포'] = m['커포링'];
  return m;
})();

export const getLootGroup = (itemName) => LOOT_GROUP[itemName] || 'default';

/** 전리품 정렬 키: [그룹순위, 그룹내순위]. 미등록 항목은 맨 뒤. */
export const lootSortKey = (name) =>
  LOOT_SORT_INDEX[name] || [LOOT_GROUP_ORDER.length, 999];

/** 전리품 목록을 표시 순서로 정렬 (요소: string | {name} | {item}). */
export function sortLoot(list) {
  const nm = (x) => (typeof x === 'string' ? x : (x && (x.name ?? x.item)));
  return [...list].sort((a, b) => {
    const ka = lootSortKey(nm(a)), kb = lootSortKey(nm(b));
    return ka[0] - kb[0] || ka[1] - kb[1];
  });
}

// ── 보스 ──────────────────────────────────────────────
//
// crystal 단위: 억 (boss_table.md의 메소를 1e8로 나눈 값).
// difficulties는 난이도 오름차순으로 작성.
//
// 기존 9보스는 ID를 그대로 보존(seren/kalos/lotus/baldrix/adversary/kaling/limbo/
// jupiter/blackmage) — 기존에 기록된 BossRun이 그대로 해석되도록.

// 리3·컨3 은 사실상 가치가 없어 드랍 목록에서 뺐다 (2026-09-30). 옛 기록 표시용으로 그룹·이미지는 남겨 둔다.
// COMMON(리4·컨4) 자리는 아래 RING_BOX_BY_DIFFICULTY 가 보스마다 다른 반지 상자 하나로 바꾼다.
const COMMON = ['리4', '컨4'];

// ── 보스 반지 상자 ───────────────────────────────────
//
// 반지는 상자를 열어 나온다. 기록 창에서 상자를 누르면 RING_BOX_CONTENTS 중에서 고른다.
// 리레 4 · 컨티 4 만 값이 있고, 나머지 반지는 모두 꽝 = "그 상자 이름 + 0억"으로 기록한다 (사용자 결정 2026-10-01).
// 녹옥 상자는 1~3레벨만 나와 리4 · 컨4 가 없으므로 드랍 목록에 넣지 않는다.
export const RING_BOX = {
  red:   '홍옥의 보스 반지 상자',
  black: '흑옥의 보스 반지 상자',
  white: '백옥의 보스 반지 상자',
  life:  '생명의 보스 반지 상자',
};
export const RING_BOX_CONTENTS = [
  { name: '리4', label: '리스트레인트 링 4' },
  { name: '컨4', label: '컨티뉴어스 링 4' },
  { name: null, label: '꽝' }, // name 이 없으면 상자 이름으로 기록
];
const RING_BOX_NAMES = new Set(Object.values(RING_BOX));
export const isRingBox = (name) => RING_BOX_NAMES.has(name);

// 보스 · 난이도별 반지 상자. 출처: 메이플스토리 공식 "보스별 주요 보상" + 인벤 · 나무위키 난이도 구분.
// 카링 · 벨로나는 하드 이상 = 생명, 그 아래 = 백옥 (사용자 확인 2026-10-01).
const RING_BOX_BY_DIFFICULTY = {
  suu:       { hard: RING_BOX.red, extreme: RING_BOX.white },
  damien:    { hard: RING_BOX.red },
  lucid:     { hard: RING_BOX.red },
  will:      { hard: RING_BOX.red },
  jinhilla:  { hard: RING_BOX.black },
  dunkel:    { hard: RING_BOX.black },
  dusk:      { chaos: RING_BOX.black },
  seren:     { normal: RING_BOX.black, hard: RING_BOX.white, extreme: RING_BOX.white },
  blackmage: { hard: RING_BOX.white, extreme: RING_BOX.white },
  lotus:     { normal: RING_BOX.white, hard: RING_BOX.white },
  kaling:    { easy: RING_BOX.white, normal: RING_BOX.white, hard: RING_BOX.life, extreme: RING_BOX.life },
  bellona:   { easy: RING_BOX.white, normal: RING_BOX.white, hard: RING_BOX.life },
  kalos:     { easy: RING_BOX.life, normal: RING_BOX.life, chaos: RING_BOX.life, extreme: RING_BOX.life },
  adversary: { easy: RING_BOX.life, normal: RING_BOX.life, hard: RING_BOX.life, extreme: RING_BOX.life },
  limbo:     { normal: RING_BOX.life, hard: RING_BOX.life },
  baldrix:   { normal: RING_BOX.life, hard: RING_BOX.life },
  jupiter:   { normal: RING_BOX.life, hard: RING_BOX.life },
};
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
      { key: 'normal', crystal: 0.1, loot: [] },
      { key: 'chaos',  crystal: 0.7, loot: [] },
    ],
  },
  {
    id: 'kalos', name: '감시자 칼로스', cycle: 'weekly', color: '#4ECDC4',
    difficulties: [
      { key: 'easy',    crystal: 2.3, loot: [...COMMON] },
      { key: 'normal',  crystal: 4.7, loot: ['연마석', ...COMMON] },
      { key: 'chaos',   crystal: 12.3, loot: ['에테상자', '연마석', ...COMMON] },
      { key: 'extreme', crystal: 41.0, loot: ['해머(눈장식)', '에테상자', '영달포', '연마석', ...COMMON] },
    ],
  },
  {
    id: 'damien', name: '데미안', cycle: 'weekly', color: '#EF4444',
    difficulties: [
      { key: 'normal', crystal: 0.08, loot: [] },
      { key: 'hard',   crystal: 0.4, loot: ['마깃안', ...COMMON] },
    ],
  },
  {
    id: 'dusk', name: '더스크', cycle: 'weekly', color: '#8B5CF6',
    difficulties: [
      { key: 'normal', crystal: 0.2, loot: [] },
      { key: 'chaos',  crystal: 0.6, loot: ['거공', ...COMMON] },
    ],
  },
  {
    id: 'dunkel', name: '듄켈', cycle: 'weekly', color: '#F59E0B',
    difficulties: [
      { key: 'normal', crystal: 0.2,   loot: [] },
      { key: 'hard',   crystal: 0.8, loot: ['커포링', ...COMMON] },
    ],
  },
  {
    id: 'lucid', name: '루시드', cycle: 'weekly', color: '#C4B5FD',
    difficulties: [
      { key: 'easy',   crystal: 0.1, loot: [] },
      { key: 'normal', crystal: 0.1, loot: [] },
      { key: 'hard',   crystal: 0.5, loot: ['몽벨', ...COMMON] },
    ],
  },
  {
    id: 'limbo', name: '림보', cycle: 'weekly', color: '#60A5FA',
    difficulties: [
      { key: 'normal', crystal: 9.9, loot: ['3단계 소울 에테르', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', '신마석', ...COMMON] },
      { key: 'hard',   crystal: 23.8, loot: ['3단계 소울 에테르', ...LEGACY_LOOT.limbo] },
    ],
  },
  {
    id: 'magnus', name: '매그너스', cycle: 'weekly', color: '#93C5FD',
    difficulties: [
      { key: 'hard', crystal: 0.04, loot: [] },
    ],
  },
  {
    id: 'vonbon', name: '반반', cycle: 'weekly', color: '#FBBF24',
    difficulties: [
      { key: 'chaos', crystal: 0.04, loot: [] },
    ],
  },
  {
    id: 'baldrix', name: '발드릭스', cycle: 'weekly', color: '#34D399',
    difficulties: [
      { key: 'normal', crystal: 13.2, loot: ['3단계 소울 에테르', '신마석', ...PURPLE_CORE, ...COMMON] },
      { key: 'hard',   crystal: 30.7, loot: ['3단계 소울 에테르', '죽음의 맹세', '신마석', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', ...COMMON] },
    ],
  },
  {
    id: 'bellona', name: '벨로나', cycle: 'weekly', color: '#F0ABFC',
    difficulties: [
      // 반지 상자(백옥·생명) = 리4·컨4 / 혼돈의 칠흑 장신구 상자 = 퍼플코어 / 광기의 에테르넬 방어구 상자 = 에테상자
      { key: 'easy',   crystal: 3.9,  loot: ['리4', '컨4'] },
      { key: 'normal', crystal: 8.2,  loot: ['연마석', ...PURPLE_CORE, '2단계 소울 에테르', '리4', '컨4'] },
      { key: 'hard',   crystal: 29.5, loot: ['굶주리는 핏빛 원혼', '에테상자', '신마석', '연마석', ...PURPLE_CORE, '2단계 소울 에테르', '리4', '컨4'] },
    ],
  },
  {
    id: 'vellum', name: '벨룸', cycle: 'weekly', color: '#FCD34D',
    difficulties: [
      { key: 'chaos', crystal: 0.04, loot: [] },
    ],
  },
  {
    id: 'bloodyqueen', name: '블러디퀸', cycle: 'weekly', color: '#DC2626',
    difficulties: [
      { key: 'chaos', crystal: 0.04, loot: [] },
    ],
  },
  {
    // 선택받은 세렌(=기존 'seren'): 표엔 전리품 칸이 비어 있으나,
    // 사용자 결정에 따라 기존 세렌 전리품을 전 난이도에 채움.
    id: 'seren', name: '선택받은 세렌', cycle: 'weekly', color: '#FF6B9D',
    difficulties: [
      { key: 'normal',  crystal: 1.6,  loot: [...COMMON] },
      { key: 'hard',    crystal: 3,  loot: ['미트라의 분노', ...COMMON] },
      { key: 'extreme', crystal: 18.4,  loot: [...LEGACY_LOOT.seren] },
    ],
  },
  {
    id: 'suu', name: '스우', cycle: 'weekly', color: '#2DD4BF',
    difficulties: [
      { key: 'normal',  crystal: 0.08, loot: [] },
      { key: 'hard',    crystal: 0.4, loot: ['루컨마', ...COMMON] },
      { key: 'extreme', crystal: 5.4,  loot: ['루컨마', '언컨', ...COMMON] },
    ],
  },
  {
    id: 'cygnus', name: '시그너스', cycle: 'weekly', color: '#FDE047', defaultHidden: true,
    difficulties: [
      { key: 'easy',   crystal: 0.0432, loot: [] },
      { key: 'normal', crystal: 0.0713,  loot: [] },
    ],
  },
  {
    id: 'will', name: '윌', cycle: 'weekly', color: '#A3E635',
    difficulties: [
      { key: 'easy',   crystal: 0.1,  loot: [] },
      { key: 'normal', crystal: 0.2, loot: [] },
      { key: 'hard',   crystal: 0.7, loot: ['마도서', ...COMMON] },
    ],
  },
  {
    id: 'jupiter', name: '유피테르', cycle: 'weekly', color: '#FB923C',
    difficulties: [
      { key: 'normal', crystal: 15.6, loot: ['4단계 소울 에테르', '신마석', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', ...COMMON] },
      { key: 'hard',   crystal: 48.4, loot: ['4단계 소울 에테르', '오만의 원죄', '신마석', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', ...COMMON] },
    ],
  },
  {
    id: 'zakum', name: '자쿰', cycle: 'weekly', color: '#B45309',
    difficulties: [
      { key: 'chaos', crystal: 0.04, loot: [] },
    ],
  },
  {
    id: 'jinhilla', name: '진 힐라', cycle: 'weekly', color: '#9333EA',
    difficulties: [
      { key: 'normal', crystal: 0.6, loot: [] },
      { key: 'hard',   crystal: 1.0,  loot: ['고근', ...COMMON] },
    ],
  },
  {
    id: 'lotus', name: '찬란한 흉성', cycle: 'weekly', color: '#F87171',
    difficulties: [
      { key: 'normal', crystal: 5.7,  loot: ['2단계 소울 에테르', '연마석', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', ...COMMON] },
      { key: 'hard',   crystal: 26.7, loot: ['2단계 소울 에테르', ...LEGACY_LOOT.lotus] },
    ],
  },
  {
    id: 'adversary', name: '최초의 대적자', cycle: 'weekly', color: '#FFD93D',
    difficulties: [
      { key: 'easy',    crystal: 2.6, loot: ['연마석', ...COMMON] },
      { key: 'normal',  crystal: 5.3, loot: ['1단계 소울 에테르', '연마석', ...COMMON] },
      { key: 'hard',    crystal: 13.9, loot: ['1단계 소울 에테르', '불멸의 유산', '에테상자', '연마석', '영달포', ...COMMON] },
      { key: 'extreme', crystal: 47.1, loot: ['1단계 소울 에테르', '해머(훈장)', '불멸의 유산', '에테상자', '영달포', '연마석', ...COMMON] },
    ],
  },
  {
    id: 'kaling', name: '카링', cycle: 'weekly', color: '#A78BFA',
    difficulties: [
      { key: 'easy',    crystal: 3.2, loot: [] },
      { key: 'normal',  crystal: 5.9, loot: ['1단계 소울 에테르', '연마석', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', ...COMMON] },
      { key: 'hard',    crystal: 15.6, loot: ['1단계 소울 에테르', '신마석', '에테상자', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', ...COMMON] },
      { key: 'extreme', crystal: 53.8, loot: ['1단계 소울 에테르', '해머(귀고리)', '신마석', '에테상자', '루컨마', '마깃안', '몽벨', '거공', '마도서', '고근', '커포링', '영달포', ...COMMON] },
    ],
  },
  {
    id: 'papulatus', name: '파풀라투스', cycle: 'weekly', color: '#38BDF8',
    difficulties: [
      { key: 'chaos', crystal: 0.06, loot: [] },
    ],
  },
  {
    id: 'pierre', name: '피에르', cycle: 'weekly', color: '#F472B6',
    difficulties: [
      { key: 'chaos', crystal: 0.04, loot: [] },
    ],
  },
  {
    id: 'pinkbean', name: '핑크빈', cycle: 'weekly', color: '#F9A8D4', defaultHidden: true,
    difficulties: [
      { key: 'chaos', crystal: 0.0625, loot: [] },
    ],
  },
  {
    id: 'hilla', name: '힐라', cycle: 'weekly', color: '#C026D3', defaultHidden: true,
    difficulties: [
      { key: 'hard', crystal: 0.0546, loot: [] },
    ],
  },
  // 일간 보스지만 도미네이터 펜던트가 나와서 기록한다. 결정석은 사실상 없어 0억 (사용자 결정 2026-10-03).
  // 스케줄러에서 잡으면 매일 자동 기록이 생긴다(기간 = 그날 하루).
  {
    id: 'akairum', name: '아카이럼', cycle: 'daily', color: '#6366F1',
    difficulties: [
      { key: 'easy',   crystal: 0, loot: [] },
      { key: 'normal', crystal: 0, loot: ['도미네이터 펜던트'] },
    ],
  },
  {
    id: 'blackmage', name: '검은 마법사', cycle: 'monthly', color: '#C084FC',
    difficulties: [
      { key: 'hard',    crystal: 4.6,  loot: ['창세의 뱃지', ...COMMON] },
      { key: 'extreme', crystal: 56.8, loot: [...LEGACY_LOOT.blackmage] },
    ],
  },
];

// 드랍 목록의 리4 · 컨4 를 빼고, 그 보스 · 난이도의 반지 상자를 맨 뒤에 넣는다.
for (const boss of BOSSES) {
  for (const difficulty of boss.difficulties) {
    const box = RING_BOX_BY_DIFFICULTY[boss.id]?.[difficulty.key];
    difficulty.loot = difficulty.loot.filter(name => !COMMON.includes(name));
    if (box) difficulty.loot.push(box);
  }
}

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
  '굶주리는 핏빛 원혼': 'png/굶주리는 핏빛 원혼.png',
  // 소울 에테르
  '1단계 소울 에테르': 'png/1단계 소울 에테르.png',
  '2단계 소울 에테르': 'png/2단계 소울 에테르.png',
  '3단계 소울 에테르': 'png/3단계 소울 에테르.png',
  '4단계 소울 에테르': 'png/4단계 소울 에테르.png',
  '언컨':           'png/언컨.png',
  // 박스 / 석재 / 영달포
  '에테상자':       'png/에테상자.png',
  '장신망상자':     'png/장신망상자.webp',
  '연마석':         'png/연마석.webp',
  '신마석':         'png/신마석.webp',
  '영달포':         'png/영달포.png',
  '도미네이터 펜던트': 'png/도미네이터 펜던트.png',
  // 공통
  '리4':            'png/리4.png',
  '컨4':            'png/컨4.png',
  '리3':            'png/리3.png',
  '컨3':            'png/컨3.png',
  // 보스 반지 상자 (드랍 목록에만 나오고, 기록은 안에서 나온 반지로 남는다)
  [RING_BOX.red]:   'png/홍옥의 보스 반지 상자.png',
  [RING_BOX.black]: 'png/흑옥의 보스 반지 상자.webp',
  [RING_BOX.white]: 'png/백옥의 보스 반지 상자.webp',
  [RING_BOX.life]:  'png/생명의 보스 반지 상자.webp',
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

/** 보스 × 난이도 전리품 목록 [{ name, group }] — 표시 순서로 정렬. */
export function getBossLoot(bossId, difficultyKey) {
  const d = getBossDifficulty(bossId, difficultyKey);
  if (!d || !Array.isArray(d.loot)) return [];
  return sortLoot(d.loot.map(name => ({ name, group: getLootGroup(name) })));
}

/**
 * 보이는 보스만.
 * - `defaultHidden: true` 보스는 코드에서 항상 숨김(파티별 visible 설정 무시, 모든 파티 일괄 적용).
 * - 그 외에는 visible map 기준 ({ [id]: false } 면 숨김, 그 외 전부 노출).
 */
export const isBossVisible = (bossId, visible = {}) => {
  const boss = getBoss(bossId);
  if (boss && boss.defaultHidden) return false;
  return visible[bossId] !== false;
};

/** 보스의 가장 비싼 난이도 결정석(억). */
const topCrystal = (boss) => Math.max(0, ...boss.difficulties.map(d => Number(d.crystal) || 0));

// 위쪽 고정 순서 (사용자 지정). 여기 없는 보스는 그 아래에 결정석 비싼 순.
const TOP_BOSS_ORDER = [
  'blackmage', 'jupiter', 'baldrix', 'limbo', 'bellona', 'lotus',
  'adversary', 'kaling', 'kalos', 'seren', 'suu',
];

/** 보스 목록 순서: 고정 순서 11개 → 나머지는 가장 비싼 난이도 결정석 순(같으면 이름 가나다순). */
export function bossesInOrder() {
  const rank = new Map(TOP_BOSS_ORDER.map((id, i) => [id, i]));
  const top = TOP_BOSS_ORDER.map(id => BOSSES.find(b => b.id === id)).filter(Boolean);
  const rest = BOSSES.filter(b => !rank.has(b.id))
    .sort((a, b) => (topCrystal(b) - topCrystal(a)) || a.name.localeCompare(b.name, 'ko'));
  return [...top, ...rest];
}

/** 스케줄러 일간 보스 중 우리가 기록하는 보스 이름(공백 뺀 것). 나머지 일간 보스는 버린다. */
export const DAILY_BOSS_NAMES = new Set(BOSSES.filter(b => b.cycle === 'daily').map(b => b.name.replace(/\s+/g, '')));

export const getLootImage = (itemName) => LOOT_IMAGE[itemName] || null;
