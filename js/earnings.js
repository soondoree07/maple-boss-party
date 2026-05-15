// earnings.js — 파티원별 수익 (이번 주 / 이번 달)
//
// 멤버 m의 수익 = Σ(m이 회차 참여자에 포함된 회차들에 대해)
//   결정석:    getEffectiveCrystal(boss) / r.memberSnapshot.length
//   전리품:    각 lt에 대해
//     · lt.shared === true                        → lt.price / r.memberSnapshot.length (m이 참여자면 1몫)
//     · lt.shared !== true (단독 / 기존 데이터)   → lt.taker === m 일 때만 lt.price 전액

import * as Storage from './storage.js';
import { getBoss, getEffectiveCrystal, resolveDifficultyKey } from './data.js';
import { getWeekRange, getMonthRange, formatMeso, shortMD, el } from './utils.js';

/** 이번 주(목~수) 멤버별 수익. */
export function renderWeeklyEarnings(party) {
  const today = new Date();
  const week  = getWeekRange(today);
  const runs  = Storage.getRunsByPartyInRange(party.id, week.start, week.end);
  return renderEarningsCard({
    party,
    runs,
    title: '이번 주 파티원별 수익',
    rangeLabel: `${shortMD(week.start)} ~ ${shortMD(week.end)}`,
    emptyText: '이번 주 회차 기록이 없어요',
  });
}

/** 이번 달(1일~말일) 파티 전체 + 멤버별 수익. */
export function renderMonthlyEarnings(party) {
  const today = new Date();
  const month = getMonthRange(today);
  const runs  = Storage.getRunsByPartyInRange(party.id, month.start, month.end);
  return renderEarningsCard({
    party,
    runs,
    title: '이번 달 전체 수익',
    rangeLabel: `${today.getFullYear()}년 ${today.getMonth() + 1}월`,
    emptyText: '이번 달 회차 기록이 없어요',
    showGrandTotal: true,
  });
}

/**
 * 공용 카드 렌더러.
 * @param {{
 *   party, runs, title, rangeLabel, emptyText, showGrandTotal?: boolean
 * }} opts
 */
function renderEarningsCard({ party, runs, title, rangeLabel, emptyText, showGrandTotal = false }) {
  const defaults = Storage.getBossSettings().defaults;
  const earnings = new Map(party.members.map(m => [m, { crystal: 0, loot: 0 }]));

  for (const r of runs) {
    const participants = (r.memberSnapshot || []).filter(m => earnings.has(m));
    const n = participants.length;
    if (n === 0) continue;

    const boss = getBoss(r.boss);
    if (boss) {
      const diffKey = resolveDifficultyKey(r.boss, r.difficulty, defaults);
      const share = getEffectiveCrystal(r.boss, diffKey) / n;
      participants.forEach(m => earnings.get(m).crystal += share);
    }

    if (Array.isArray(r.loot)) {
      for (const lt of r.loot) {
        const price = Number(lt.price);
        if (!Number.isFinite(price) || price <= 0) continue;
        if (lt.shared === true) {
          const share = price / n;
          participants.forEach(m => earnings.get(m).loot += share);
        } else if (lt.taker && earnings.has(lt.taker)) {
          earnings.get(lt.taker).loot += price;
        }
      }
    }
  }

  const rows = party.members.map(m => {
    const e = earnings.get(m);
    return { name: m, crystal: e.crystal, loot: e.loot, total: e.crystal + e.loot };
  }).sort((a, b) => b.total - a.total);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  const headerRight = showGrandTotal && grandTotal > 0
    ? el('span', {
        className: 'earnings-grand',
        title: `${rangeLabel} 파티 전체 누적`,
      },
        el('span', { className: 'earnings-grand-label' }, '파티 전체'),
        el('span', { className: 'earnings-grand-value' }, formatMesoOrZero(grandTotal)),
      )
    : el('span', { className: 'earnings-range' }, rangeLabel);

  return el('section', { className: 'earnings-section' },
    el('div', { className: 'earnings-header' },
      el('h3', { className: 'earnings-title' }, title),
      headerRight,
    ),
    rows.length === 0 || grandTotal === 0
      ? el('div', { className: 'empty-state-sm' }, emptyText)
      : el('div', { className: 'earnings-list' },
          rows.map(r => renderEarningRow(r, grandTotal)),
        ),
  );
}

function renderEarningRow(row, grandTotal) {
  const pct = grandTotal > 0 ? (row.total / grandTotal) * 100 : 0;
  return el('div', { className: 'earning-row' },
    el('div', { className: 'earning-name' }, row.name),
    el('div', { className: 'earning-bar' },
      el('div', {
        className: 'earning-bar-fill',
        style: { width: `${pct.toFixed(1)}%` },
      }),
    ),
    el('div', { className: 'earning-total' }, formatMesoOrZero(row.total)),
    el('div', { className: 'earning-breakdown' },
      `결정석 ${formatMesoOrZero(row.crystal)} · 전리품 ${formatMesoOrZero(row.loot)}`,
    ),
  );
}

function formatMesoOrZero(eok) {
  const s = formatMeso(eok);
  return s === '0' ? '0억' : s;
}
