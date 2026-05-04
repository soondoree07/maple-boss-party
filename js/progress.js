// progress.js — 이번 주/이번 달 진행도 위젯
//
// PLAN.md 6.3 — 1인 분배액 = 이번 주차 회차의 결정석 합 ÷ 현재 파티원 수.
// 결정석 가격은 사용자가 #/crystals에서 수정한 override를 우선 적용.

import * as Storage from './storage.js';
import { getWeeklyBosses, getMonthlyBosses, getBoss, getEffectiveCrystal } from './data.js';
import { getWeekRange, getMonthRange, formatMeso, divideMeso, shortMD, el } from './utils.js';

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

  // 주간: weekly cycle 회차의 결정석만 합산.
  const weekCrystalTotal = weekRuns.reduce((sum, r) => {
    const b = getBoss(r.boss);
    if (!b || b.cycle !== 'weekly') return sum;
    return sum + getEffectiveCrystal(r.boss, overrides);
  }, 0);

  // 월간: monthly cycle 회차의 결정석만.
  const monthCrystalTotal = monthRuns.reduce((sum, r) => {
    const b = getBoss(r.boss);
    if (!b || b.cycle !== 'monthly') return sum;
    return sum + getEffectiveCrystal(r.boss, overrides);
  }, 0);

  const headcount     = party.members.length;
  const weekPerHead   = divideMeso(weekCrystalTotal,  headcount);
  const monthPerHead  = divideMeso(monthCrystalTotal, headcount);

  return el('section', { className: 'progress-section' },
    renderWeekBlock(week, weeklyClearedIds, weekCrystalTotal, weekPerHead, headcount),
    renderMonthBlock(today, monthlyClearedIds, monthCrystalTotal, monthPerHead, headcount),
  );
}

// ── 주간 블록 ──

function renderWeekBlock(week, clearedIds, total, perHead, headcount) {
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
          ? `(전체 ${formatMeso(total)} ÷ ${headcount}인)`
          : '아직 회차 기록이 없어요',
      ),
    ),
  );
}

// ── 월간 블록 ──

function renderMonthBlock(today, clearedIds, total, perHead, headcount) {
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
          ? `(전체 ${formatMeso(total)} ÷ ${headcount}인)`
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
