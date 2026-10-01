// v2/user-stats.js — 유저 캐릭터 창에 쓰는 우리 기록 계산 (화면 없는 순수 계산)
//
//  - 이번 주 수익: 캐릭터별 + 유저 합계 (calc.runShares 와 같은 분배 규칙)
//  - 파티별 수익: 기간 안의 기록을 참여 캐릭터 구성으로 묶어, 이 유저 몫 합계와 그 파티에서 받은 드랍템
//  - 최근에 먹은 드랍템: 캐릭터가 몫을 받은 드랍템(분배 · 본인 독식)을 최신순으로

import { getRuns, getCharactersOf } from './store.js';
import { runShares, runsInPeriod } from './calc.js';

/** 이 캐릭터가 이 드랍템의 몫을 받았는지 (분배면 참여자 전원, 독식이면 가져간 캐릭터만) */
const receivedBy = (run, item, characterId) => (item.mode === 'solo'
  ? item.takerCharacterId === characterId
  : run.characterIds.includes(characterId));

/** @returns {{ total: number, byCharacter: { character, total }[] }} */
export function weekIncome(userId) {
  const characters = getCharactersOf(userId);
  const totals = new Map(characters.map(c => [c.id, 0]));
  for (const run of runsInPeriod(getRuns(), 'week')) {
    for (const [charId, eok] of runShares(run)) {
      if (totals.has(charId)) totals.set(charId, totals.get(charId) + eok);
    }
  }
  const byCharacter = characters.map(character => ({ character, total: totals.get(character.id) }));
  return { total: byCharacter.reduce((sum, c) => sum + c.total, 0), byCharacter };
}

/**
 * @param {'week' | 'month'} period
 * @returns {{ characterIds: string[], total: number, drops: string[] }[]} 이 유저 몫이 큰 파티 먼저
 */
export function partyIncome(userId, period) {
  const mine = new Set(getCharactersOf(userId).map(c => c.id));
  const parties = new Map();
  for (const run of runsInPeriod(getRuns(), period)) {
    if (!run.characterIds.some(id => mine.has(id))) continue;
    const key = [...run.characterIds].sort().join(',');
    const party = parties.get(key) || { characterIds: run.characterIds, total: 0, drops: [] };
    for (const [charId, eok] of runShares(run)) if (mine.has(charId)) party.total += eok;
    for (const item of run.loot) {
      if ([...mine].some(id => receivedBy(run, item, id))) party.drops.push(item.name);
    }
    parties.set(key, party);
  }
  return [...parties.values()].sort((a, b) => b.total - a.total);
}

/** @returns {{ name: string, date: string }[]} 최신순 최대 limit 개 */
export function recentDrops(characterId, limit = 16) {
  const drops = [];
  for (const run of getRuns()) { // getRuns() 는 최신순
    for (const item of run.loot) {
      if (receivedBy(run, item, characterId)) drops.push({ name: item.name, date: run.date });
      if (drops.length >= limit) return drops;
    }
  }
  return drops;
}
