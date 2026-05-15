// monthly.js — 월별 전리품/결정석 누적 사이드바
//
// 오늘 기준 이번 달 / 1달 전 / 2달 전 카드 3개를 세로로 나열.
//   - 헤더: "YYYY년 M월" + 인당 총 결정석 (weekly+monthly 결정석 합 ÷ 인원)
//   - 본문: 그 달에 기록된 전리품 행 (이미지 + 이름 + 나누기 전 가격)

import * as Storage from './storage.js';
import {
  getBoss,
  getEffectiveCrystal,
  resolveDifficultyKey,
  getLootImage,
  getDisplayLootColor,
} from './data.js';
import { formatMeso, toDateStr, el } from './utils.js';

/**
 * @param {{id: string, members: string[]}} party
 * @returns {HTMLElement}
 */
export function renderMonthlyHistory(party) {
  const today = new Date();
  const months = [0, 1, 2].map(offset => monthInfo(today, offset));

  return el('aside', { className: 'monthly-side' },
    months.map(m => renderMonthCard(party, m)),
  );
}

// ── 월 정보 ─────────────────────────────────────────

function monthInfo(today, monthsAgo) {
  const y = today.getFullYear();
  const m = today.getMonth() - monthsAgo;
  const start = new Date(y, m, 1);
  const end   = new Date(y, m + 1, 0);
  return {
    year: start.getFullYear(),
    month: start.getMonth() + 1, // 1-base 표시용
    startStr: toDateStr(start),
    endStr:   toDateStr(end),
  };
}

// ── 카드 ───────────────────────────────────────────

function renderMonthCard(party, m) {
  const runs = Storage.getRunsByPartyInRange(party.id, m.startStr, m.endStr)
    .sort((a, b) => b.date.localeCompare(a.date));

  const defaults = Storage.getBossSettings().defaults;
  const partyCount = Math.max(party.members.length, 1);

  // 인당 결정석 = Σ(회차 결정석 / 회차 참여자 수). 한 사람이 모든 회차 참여 시 받는 금액.
  const perHead = runs.reduce((sum, r) => {
    const b = getBoss(r.boss);
    if (!b) return sum;
    const n = r.memberSnapshot?.length || partyCount;
    const diffKey = resolveDifficultyKey(r.boss, r.difficulty, defaults);
    return sum + getEffectiveCrystal(r.boss, diffKey) / Math.max(n, 1);
  }, 0);

  // 전리품 행: 회차들의 loot 항목 평탄화 (최근 날짜 순).
  const lootRows = [];
  for (const r of runs) {
    if (!Array.isArray(r.loot)) continue;
    for (const entry of r.loot) {
      lootRows.push({ ...entry, _bossId: r.boss, _date: r.date });
    }
  }

  return el('div', { className: 'month-card' },
    el('div', { className: 'month-card-header' },
      el('span', { className: 'month-card-title' }, `${m.year}년 ${m.month}월`),
      el('span', { className: 'month-card-perhead', title: '인당 총 결정석' },
        displayMeso(perHead),
      ),
    ),
    el('div', { className: 'month-card-body' },
      lootRows.length === 0
        ? el('div', { className: 'month-empty' }, '기록 없음')
        : lootRows.map(row => renderLootRow(row)),
    ),
  );
}

function renderLootRow(row) {
  const color = getDisplayLootColor(row.item);
  const img   = getLootImage(row.item);

  const priceText = (row.price == null || isNaN(Number(row.price)))
    ? '—'
    : formatMeso(Number(row.price));

  return el('div', { className: 'month-loot-row' },
    img
      ? el('img', { className: 'month-loot-img', src: img, alt: row.item, loading: 'lazy' })
      : el('span', { className: 'month-loot-img month-loot-img-fallback' }),
    el('span', {
      className: 'month-loot-name',
      style: color ? { color } : null,
    }, row.item),
    el('span', { className: 'month-loot-price' }, priceText),
  );
}

// ── 헬퍼 ───────────────────────────────────────────

function displayMeso(eok) {
  const s = formatMeso(eok);
  return s === '0' ? '0억' : s;
}
