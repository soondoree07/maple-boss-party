// v2/boss-tag.js — 기록 카드의 보스 태그 색 (2026-09-30 확정)
//
// 주요 보스 11개는 보스마다 정한 색 조합을 그라데이션으로, 나머지(하위 보스)는 모두 같은 회색 단색.
// 옛 화면이 쓰는 data.js 의 boss.color 는 그대로 두고, 새 화면 태그 색만 여기서 정한다.

import { el } from '../utils.js';
import { getBoss } from '../data.js';

const DARK_INK = '#1B1B1F';
const LIGHT_INK = '#FFFFFF';

/** 보스 id → { colors: 왼쪽→오른쪽 색(같은 색을 겹쳐 쓰면 그 구간이 넓어진다), ink: 글씨색 } */
const BOSS_TAG_COLORS = {
  blackmage: { colors: ['#1B1B1F', '#1B1B1F', '#1B1B1F', '#FFFFFF'], ink: LIGHT_INK },
  suu:       { colors: ['#FF8A3D', '#1B1B1F', '#9CA3AF'], ink: LIGHT_INK },
  seren:     { colors: ['#FFE08A', '#F5C542', '#E8A800', '#E8A800', '#E5383B'], ink: DARK_INK },
  kalos:     { colors: ['#FFFFFF', '#FF8A3D'], ink: DARK_INK },
  kaling:    { colors: ['#FF7B7B', '#E5383B', '#B4161B'], ink: LIGHT_INK },
  adversary: { colors: ['#A5E8FF', '#4CC9F0', '#1C8FD1'], ink: DARK_INK },
  lotus:     { colors: ['#FFC93C', '#8B5CF6'], ink: DARK_INK },
  limbo:     { colors: ['#1B1B1F', '#8B5CF6'], ink: LIGHT_INK },
  baldrix:   { colors: ['#1B1B1F', '#1B2A5C', '#23407F'], ink: LIGHT_INK },
  jupiter:   { colors: ['#22C55E', '#FFC93C', '#8B5CF6'], ink: DARK_INK },
  bellona:   { colors: ['#1B1B1F', '#1B1B1F', '#E5383B', '#F4F4F5', '#F4F4F5'], ink: LIGHT_INK },
};

/** 색 목록 → 같은 간격 그라데이션 멈춤점 ("#a 0%, #b 50%, #c 100%"). */
const gradientStops = (colors) =>
  colors.map((c, i) => `${c} ${Math.round(i / (colors.length - 1) * 100)}%`).join(', ');

/** 글씨가 밝은 쪽·어두운 쪽 어디에 걸려도 읽히도록 얇은 테두리 그림자. */
const inkShadow = (ink) => (ink === LIGHT_INK
  ? '0 0 2px rgba(0,0,0,.85), 0 1px 2px rgba(0,0,0,.6)'
  : '0 0 2px rgba(255,255,255,.95), 0 0 4px rgba(255,255,255,.6)');

/** 보스 태그 한 개. 주요 보스는 그라데이션, 나머지는 회색 단색(v2-boss-tag-plain, 색은 theme.css). */
export function renderBossTag(bossId) {
  const name = getBoss(bossId)?.name || bossId;
  const tag = BOSS_TAG_COLORS[bossId];
  if (!tag) return el('span', { className: 'run-boss-badge v2-boss-tag-plain' }, name);
  return el('span', {
    className: 'run-boss-badge',
    style: {
      background: `linear-gradient(100deg, ${gradientStops(tag.colors)})`,
      color: tag.ink,
      textShadow: inkShadow(tag.ink),
    },
  }, name);
}
