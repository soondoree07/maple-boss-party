// progress.js — 이번 주/이번 달 진행도 위젯
//
// 1인 분배액 = Σ(회차 결정석 ÷ 회차 참여자 수). 회차마다 인원이 다를 수 있어
// 한 사람이 모든 회차에 참여했을 때 받는 금액에 해당. 멤버별 정확한 수익은 earnings.js.
// 결정석 가격은 사용자가 #/crystals에서 수정한 override를 우선 적용.

import * as Storage from './storage.js';
import { getWeeklyBosses, getMonthlyBosses, getBoss, getEffectiveCrystal } from './data.js';
import { getWeekRange, getMonthRange, formatMeso, shortMD, el } from './utils.js';

/**
 * @param {{id: string, members: string[]}} party
 * @returns {HTMLElement}
 */
export function renderProgress(party) {
  const today = new Date();
  const week  = getWeekRange(today);
  const month = getMonthRange(today);

  const weekRuns  = Storage.getRunsByPartyInRange(party.id, week.start,  week.end);
  const monthRuns = Storage.getRunsByPartyInRange(party.id, month.start, month.end);

  const weeklyClearedIds  = new Set(weekRuns.map(r => r.boss));
  const monthlyClearedIds = new Set(monthRuns.map(r => r.boss));

  const overrides = Storage.getCrystalOverrides();

  // 회차 결정석 합계 + 회차별 1/N 합산.
  // run.memberSnapshot이 비어있는 비정상 케이스는 파티 전체 인원수로 fallback.
  const partyCount = Math.max(party.members.length, 1);

  const weekCrystalTotal = weekRuns.reduce((sum, r) => {
    const b = getBoss(r.boss);
    if (!b || b.cycle !== 'weekly') return sum;
    return sum + getEffectiveCrystal(r.boss, overrides);
  }, 0);
  const weekPerHead = weekRuns.reduce((sum, r) => {
    const b = getBoss(r.boss);
    if (!b || b.cycle !== 'weekly') return sum;
    const n = r.memberSnapshot?.length || partyCount;
    return sum + getEffectiveCrystal(r.boss, overrides) / Math.max(n, 1);
  }, 0);

  const monthCrystalTotal = monthRuns.reduce((sum, r) => {
    const b = getBoss(r.boss);
    if (!b || b.cycle !== 'monthly') return sum;
    return sum + getEffectiveCrystal(r.boss, overrides);
  }, 0);
  const monthPerHead = monthRuns.reduce((sum, r) => {
    const b = getBoss(r.boss);
    if (!b || b.cycle !== 'monthly') return sum;
    const n = r.memberSnapshot?.length || partyCount;
    return sum + getEffectiveCrystal(r.boss, overrides) / Math.max(n, 1);
  }, 0);

  return el('section', { className: 'progress-section' },
    renderWeekBlock(week, weeklyClearedIds, weekCrystalTotal, weekPerHead),
    renderMonthBlock(today, monthlyClearedIds, monthCrystalTotal, monthPerHead),
  );
}

// ── 주간 블록 ──

function renderWeekBlock(week, clearedIds, total, perHead) {
  return el('div', { className: 'progress-block' },
    el('div', { className: 'progress-block-header' },
      el('h3', { className: 'progress-title' }, '이번 주 현황'),
      el('span', { className: 'progress-range' }, `${shortMD(week.start)} ~ ${shortMD(week.end)}`),
    ),
    el('div', { className: 'boss-chips' },
      getWeeklyBosses().map(boss => bossChip(boss, clearedIds.has(boss.id)))
    ),
    el('div', { className: 'progress-summary' },
      el('span', { className: 'summary-label' }, '이번 주 1인 분배액'),
      crystalIcon('png/결정석.webp', '결정석 가격 수정'),
      el('span', { className: 'summary-value' }, displayMeso(perHead)),
      el('span', { className: 'summary-sub' },
        total > 0
          ? `(전체 ${formatMeso(total)} · 회차별 ÷ 인원)`
          : '아직 회차 기록이 없어요',
      ),
    ),
  );
}

// ── 월간 블록 ──

function renderMonthBlock(today, clearedIds, total, perHead) {
  return el('div', { className: 'progress-block' },
    el('div', { className: 'progress-block-header' },
      el('h3', { className: 'progress-title' }, '이번 달 현황'),
      el('span', { className: 'progress-range' },
        `${today.getFullYear()}년 ${today.getMonth() + 1}월`),
    ),
    el('div', { className: 'boss-chips' },
      getMonthlyBosses().map(boss => bossChip(boss, clearedIds.has(boss.id)))
    ),
    el('div', { className: 'progress-summary' },
      el('span', { className: 'summary-label' }, '이번 달 1인 분배액'),
      crystalIcon('png/월간보스결정석.webp', '결정석 가격 수정'),
      el('span', { className: 'summary-value' }, displayMeso(perHead)),
      el('span', { className: 'summary-sub' },
        total > 0
          ? `(전체 ${formatMeso(total)} · 회차별 ÷ 인원)`
          : '아직 회차 기록이 없어요',
      ),
    ),
  );
}

// ── 헬퍼 ──

function displayMeso(eok) {
  const s = formatMeso(eok);
  return s === '0' ? '0억' : s;
}

function crystalIcon(src, title) {
  return el('a', {
    className: 'crystal-icon-link',
    href: '#/crystals',
    title,
    'aria-label': title,
  },
    el('img', { className: 'crystal-icon', src, alt: '결정석', loading: 'lazy' }),
  );
}

function bossChip(boss, cleared) {
  return el('div', {
    className: 'boss-chip' + (cleared ? ' cleared' : ''),
    style: cleared ? { '--chip-color': boss.color } : null,
    title: boss.name,
  },
    el('span', { className: 'boss-chip-name' }, boss.name),
  );
}
