// data.js — 보스 / 채널 / 전리품 도메인 상수
//
// PLAN.md 5장(도메인 상수) 기준. 값을 바꾸려면 여기만 수정.

/**
 * 보스 9종.
 *  - cycle:   주간(weekly) / 월간(monthly)
 *  - crystal: 결정석 메소 (단위: 억)
 *  - enabled: false면 드롭다운에서 가려짐 (데이터 슬롯은 유지)
 *  - color:   캘린더 pill / 진행도 칩 색상
 */
export const BOSSES = [
  { id: 'seren',     name: '세렌',     cycle: 'weekly',  crystal: 31.5, enabled: true,  color: '#FF6B9D' },
  { id: 'kalos',     name: '칼로스',   cycle: 'weekly',  crystal: 13.4, enabled: true,  color: '#4ECDC4' },
  { id: 'adversary', name: '대적자',   cycle: 'weekly',  crystal: 15.1, enabled: true,  color: '#FFD93D' },
  { id: 'kaling',    name: '카링',     cycle: 'weekly',  crystal: 18.3, enabled: true,  color: '#A78BFA' },
  { id: 'lotus',     name: '흉성',     cycle: 'weekly',  crystal: 28.1, enabled: true,  color: '#F87171' },
  { id: 'limbo',     name: '림보',     cycle: 'weekly',  crystal: 25.1, enabled: true,  color: '#60A5FA' },
  { id: 'baldrix',   name: '발드',     cycle: 'weekly',  crystal: 32.4, enabled: true,  color: '#34D399' },
  { id: 'jupiter',   name: '유피테르', cycle: 'weekly',  crystal: 17.0, enabled: false, color: '#FB923C' },
  { id: 'blackmage', name: '검마',     cycle: 'monthly', crystal: 92.0, enabled: true,  color: '#C084FC' },
];

/**
 * 채널 40개. 인게임 채널 선택창 순서:
 *   1채널 → 20세이상 → 2채널 → 3채널 → ... → 39채널
 */
export const CHANNELS = (() => {
  const list = ['1', '20세이상'];
  for (let i = 2; i <= 39; i++) list.push(String(i));
  return list;
})();

// "20세이상" 채널은 "20세이상채널"이 아니라 "20세이상"으로만 표기.
export function channelLabel(channel) {
  return channel === '20세이상' ? '20세이상' : `${channel}채널`;
}

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
 * 여기 매핑이 있으면 그룹 색 대신 이 색을 사용.
 */
export const LOOT_NAME_COLOR = {
  '황홀한 악몽':   '#FE9500',
  '근원의 속삭임': '#A500A6',
  '죽음의 맹세':   '#00FEFD',
  '불멸의 유산':   '#FFA700',
  '창세의 뱃지':   '#FB0400',
  '오만의 원죄':   '#C9B58E',
};

const COMMON_LOOT = [
  { name: '리4', group: 'default' },
  { name: '컨4', group: 'default' },
  { name: '리3', group: 'default' },
  { name: '컨3', group: 'default' },
];

const PURPLE_CORE = [
  { name: '거공',   group: 'purple' },
  { name: '몽벨',   group: 'purple' },
  { name: '마깃안', group: 'purple' },
  { name: '루컨마', group: 'purple' },
  { name: '고근',   group: 'purple' },
  { name: '마도서', group: 'purple' },
  { name: '커포',   group: 'purple' },
];

/**
 * 보스별 전리품 목록.
 *
 * 각 항목: { name: string, group: 'hammer'|'purple'|'unique'|'default' }
 */
export const BOSS_LOOT = {
  seren: [
    { name: '해머(얼굴장식)', group: 'hammer' },
    { name: '미트라의 분노',  group: 'purple' },
    { name: '영달포',         group: 'default' },
    ...COMMON_LOOT,
  ],
  kalos: [
    { name: '해머(눈장식)', group: 'hammer' },
    { name: '에테상자',     group: 'default' },
    { name: '연마석',       group: 'default' },
    { name: '영달포',       group: 'default' },
    ...COMMON_LOOT,
  ],
  adversary: [
    { name: '해머(훈장)',  group: 'hammer' },
    { name: '불멸의 유산', group: 'unique' },
    { name: '에테상자',    group: 'default' },
    { name: '연마석',      group: 'default' },
    { name: '영달포',      group: 'default' },
    ...COMMON_LOOT,
  ],
  kaling: [
    { name: '해머(귀고리)', group: 'hammer' },
    { name: '에테상자',     group: 'default' },
    { name: '신마석',       group: 'default' },
    ...PURPLE_CORE,
    ...COMMON_LOOT,
  ],
  lotus: [
    { name: '황홀한 악몽', group: 'unique' },
    { name: '에테상자',    group: 'default' },
    { name: '신마석',      group: 'default' },
    ...PURPLE_CORE,
    ...COMMON_LOOT,
  ],
  limbo: [
    { name: '근원의 속삭임', group: 'unique' },
    { name: '장신망상자',    group: 'default' },
    { name: '신마석',        group: 'default' },
    ...PURPLE_CORE,
    ...COMMON_LOOT,
  ],
  baldrix: [
    { name: '죽음의 맹세', group: 'unique' },
    { name: '장신망상자',  group: 'default' },
    { name: '신마석',      group: 'default' },
    ...PURPLE_CORE,
    ...COMMON_LOOT,
  ],
  jupiter: [
    { name: '오만의 원죄', group: 'unique' },
    ...COMMON_LOOT,
  ],
  blackmage: [
    { name: '해머(벨트)',  group: 'hammer' },
    { name: '창세의 뱃지', group: 'unique' },
    ...COMMON_LOOT,
  ],
};

// ── 전리품 이미지 매핑 ───────────────────────────────
//
// 이미지 파일은 `images/loot/<key>.png` 위치에 두면 됨.
// 키는 자유롭게 정해도 되지만, 영문 slug 권장. 매핑이 없으면 fallback 색상 박스로 표시.
//
// 사용자가 이미지 파일 주면 아래 매핑에 경로만 채워넣으면 끝.

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
  '커포':           'png/커포.png',
  // 유니크
  '황홀한 악몽':    'png/황홀한 악몽.png',
  '근원의 속삭임':  'png/근원의 속삭임.png',
  '죽음의 맹세':    'png/죽음의 맹세.png',
  '불멸의 유산':    'png/불멸의 유산.png',
  '창세의 뱃지':    'png/창세의 뱃지.png',
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
  // 미배치 (BOSS_LOOT에 아직 추가 안 됨 — 어떤 보스 전리품인지 정해지면 추가)
  '오만의 원죄':    'png/오만의 원죄.png',
};

// ── 헬퍼 ──────────────────────────────────────────────

export const getBoss          = (bossId) => BOSSES.find(b => b.id === bossId) || null;

/**
 * override가 있으면 그 값, 없으면 BOSSES의 기본 crystal.
 * @param {string} bossId
 * @param {Record<string, number>} overrides — 보통 Storage.getCrystalOverrides() 결과
 */
export function getEffectiveCrystal(bossId, overrides = {}) {
  if (Object.prototype.hasOwnProperty.call(overrides, bossId)) {
    return Number(overrides[bossId]);
  }
  const b = getBoss(bossId);
  return b ? b.crystal : 0;
}
export const getEnabledBosses = () => BOSSES.filter(b => b.enabled);
export const getWeeklyBosses  = () => BOSSES.filter(b => b.enabled && b.cycle === 'weekly');
export const getMonthlyBosses = () => BOSSES.filter(b => b.enabled && b.cycle === 'monthly');
export const getLootDef       = (bossId, itemName) =>
  (BOSS_LOOT[bossId] || []).find(l => l.name === itemName) || null;
export const getLootColor     = (group) => LOOT_COLORS[group] || LOOT_COLORS.default;
export const getLootImage     = (itemName) => LOOT_IMAGE[itemName] || null;

/**
 * 표시용 색: 항목별 override가 있으면 그걸, 없으면 그룹 색.
 * 글자/보더에 적용하기 위해 dark fallback(#1A1A1A)은 null로 반환 → 호출부에서 기본 색 그대로 사용.
 */
export function getDisplayLootColor(itemName, group) {
  if (LOOT_NAME_COLOR[itemName]) return LOOT_NAME_COLOR[itemName];
  const groupColor = LOOT_COLORS[group];
  if (!groupColor || groupColor === '#1A1A1A') return null;
  return groupColor;
}
