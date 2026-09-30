// v2/calc.js — 수익 · 주간 카운트 계산과 금액 표기 (화면 없는 순수 계산)
//
// 수익 규칙
//  - 결정석: 기록에 저장된 crystal ÷ 참여 캐릭터 수 를 캐릭터마다.
//  - 드랍템 mode 'split': price ÷ 참여 캐릭터 수 를 캐릭터마다.
//           mode 'solo' : price 전액을 takerCharacterId 캐릭터에게.
//  - 유저 수익 = 그 유저 캐릭터 수익의 합. 외부 유저(기타)는 순위에서 뺀다.

import { getWeekRange, getMonthRange, todayStr, parseDateStr } from '../utils.js';

/** 억 단위 숫자 → "23.8억" / "0.04억" / "0억". */
export function formatEok(eok) {
  const value = Number(eok) || 0;
  if (value === 0) return '0억';
  const abs = Math.abs(value);
  const digits = abs >= 0.1 ? 1 : 2;
  const rounded = Number(value.toFixed(digits));
  return `${rounded === 0 ? value.toFixed(2) : rounded}억`;
}

/** 드랍템 한 줄의 가격 (빈 값은 0). */
export const lootPrice = (item) => Number(item?.price) || 0;

/** 기록 하나의 총수익 (결정석 + 드랍템 전부). */
export function runTotal(run) {
  return (Number(run.crystal) || 0) + run.loot.reduce((sum, item) => sum + lootPrice(item), 0);
}

/**
 * 기록 하나가 캐릭터별로 나눠 준 수익.
 * @returns {Map<string, number>} characterId → 억
 */
export function runShares(run) {
  const shares = new Map();
  const ids = run.characterIds;
  if (ids.length === 0) return shares;
  const add = (id, eok) => shares.set(id, (shares.get(id) || 0) + eok);

  const crystalEach = (Number(run.crystal) || 0) / ids.length;
  ids.forEach(id => add(id, crystalEach));

  for (const item of run.loot) {
    const price = lootPrice(item);
    if (item.mode === 'solo' && item.takerCharacterId) add(item.takerCharacterId, price);
    else ids.forEach(id => add(id, price / ids.length));
  }
  return shares;
}

/** 기간 필터. period: 'week' | 'month' | 'all' */
export function runsInPeriod(runs, period, today = todayStr()) {
  if (period === 'all') return runs;
  const range = period === 'week'
    ? getWeekRange(parseDateStr(today))
    : getMonthRange(parseDateStr(today));
  return runs.filter(r => r.date >= range.start && r.date <= range.end);
}

/**
 * 유저별 수익 합계 (외부 유저 제외), 큰 순서.
 * @returns {{ user, total }[]}
 */
export function userTotals(runs, users, characters) {
  const ownerOf = new Map(characters.map(c => [c.id, c.userId]));
  const totals = new Map(users.filter(u => !u.isExternal).map(u => [u.id, 0]));
  for (const run of runs) {
    for (const [charId, eok] of runShares(run)) {
      const userId = ownerOf.get(charId);
      if (totals.has(userId)) totals.set(userId, totals.get(userId) + eok);
    }
  }
  return users
    .filter(u => totals.has(u.id))
    .map(user => ({ user, total: totals.get(user.id) }))
    .sort((a, b) => b.total - a.total);
}

/**
 * 같은 주(목요일 초기화) · 같은 파티 기록을 카드 한 장으로 묶는다.
 * 카드는 최근 기록 순, 카드 안 보스는 잡은 순서(날짜 → 저장 시각) 순.
 * @param {object[]} runs - 최신순 기록
 * @returns {{ key: string, weekStart: string, characterIds: string[], runs: object[] }[]}
 */
export function groupRunsByParty(runs) {
  const groups = new Map();
  for (const run of runs) {
    const weekStart = getWeekRange(parseDateStr(run.date)).start;
    const key = `${weekStart}|${[...run.characterIds].sort().join(',')}`;
    if (!groups.has(key)) groups.set(key, { key, weekStart, characterIds: run.characterIds, runs: [] });
    groups.get(key).runs.push(run);
  }
  const byOldest = (a, b) => a.date.localeCompare(b.date) || String(a.createdAt).localeCompare(String(b.createdAt));
  return [...groups.values()].map(group => ({ ...group, runs: group.runs.sort(byOldest) }));
}
