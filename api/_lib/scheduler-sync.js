// api/_lib/scheduler-sync.js — 스케줄러에서 잡은 보스를 자동 기록으로 저장
//
// 규칙 (사용자 결정 2026-10-01)
//  - 스케줄러에 이번 주(월간 보스는 이번 달) 처치로 나온 보스 → 드랍템 없이, 결정석은 보통 기록처럼 인원으로 나눈다.
//  - 파티: 지난 기간(지난주 · 지난달)에 그 캐릭터가 들어간 같은 보스 기록의 파티를 그대로 쓴다(가장 최근 것).
//    단 스케줄러를 연결했는데 이번 기간 그 보스가 "처치 안 함"인 파티원은 뺀다(확실히 안 간 사람, 방법 B).
//    연결 안 한 사람 · 외부 인원은 지난 기간대로 넣는다. 지난 기록이 없으면 혼자.
//  - 그 기간에 그 캐릭터가 들어간 같은 보스 기록이 이미 있으면 만들지 않는다(직접 기록 · 먼저 만든 파티 기록 우선).
//  - 사용자가 지우거나 합친 자동 기록은 다시 만들지 않는다(auto_run_skips 의 캐릭터별 id).
//  - id 는 보스 · 기간 · 파티로 정해져 여러 사람이 동시에 불러도 한 번만 생긴다.
//  - 날짜는 처음 발견한 날(KST). 스케줄러는 잡은 날짜를 주지 않는다.
// 가격표는 사이트와 같은 js/data.js 를 그대로 쓴다.

import { BOSSES, getBossDifficulty, getEffectiveCrystal } from '../../js/data.js';
import { callNexon, findOcid } from './nexon-client.js';
import {
  listNexonKeys, getCharactersOfUser, getAllCharacterIds, getRunsSince, getAutoRunSkips, insertRunsIgnoringDuplicates,
} from './db.js';

export const AUTO_RUN_PREFIX = 'r-auto-';

/** 캐릭터 한 명 몫의 자동 기록 id. 지운 자동 기록은 파티원마다 이 id 로 건너뛰기 목록에 남는다(js/v2/auto-runs.js 와 같은 모양). */
export const soloAutoRunId = (characterId, bossId, periodStart) => `${AUTO_RUN_PREFIX}${characterId}-${bossId}-${periodStart}`;
const partyAutoRunId = (bossId, periodStart, party) => `${AUTO_RUN_PREFIX}${bossId}-${periodStart}-${[...party].sort().join('.')}`;

const compact = (name) => String(name).normalize('NFC').replace(/\s+/g, '');
const BOSS_BY_NAME = new Map(BOSSES.map(b => [compact(b.name), b]));

const ymd = (d) => d.toISOString().slice(0, 10);
const addDays = (dateStr, days) => { const d = new Date(`${dateStr}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return ymd(d); };

/** KST 오늘 · 이번/지난 주 시작(목요일) · 이번/지난 달 1일, 모두 YYYY-MM-DD */
function kstPeriods(now = new Date()) {
  const today = ymd(new Date(now.getTime() + 9 * 60 * 60 * 1000)); // UTC 로 읽으면 KST 날짜
  const day = new Date(`${today}T00:00:00Z`).getUTCDay();
  const weekStart = addDays(today, -((day - 4 + 7) % 7)); // 목=0 … 수=6
  const monthStart = `${today.slice(0, 7)}-01`;
  const prevMonth = new Date(`${monthStart}T00:00:00Z`); prevMonth.setUTCMonth(prevMonth.getUTCMonth() - 1);
  return {
    today,
    weekly: { start: weekStart, prevStart: addDays(weekStart, -7) },
    monthly: { start: monthStart, prevStart: ymd(prevMonth) },
  };
}

/** 한 캐릭터의 스케줄러 처치 완료 보스 → [{ boss, difficulty, period }] */
async function completedBosses(character, apiKey, periods) {
  const ocid = await findOcid(character.name);
  const state = await callNexon('/scheduler/character-state', { ocid }, apiKey);
  return (state.boss_contents || [])
    .filter(b => b.complete_flag === 'true' && b.cycle !== 'bossDaily')
    .map(b => ({ boss: BOSS_BY_NAME.get(compact(b.content_name)), difficulty: b.difficulty, monthly: b.cycle === 'bossMonthly' }))
    .filter(b => b.boss && getBossDifficulty(b.boss.id, b.difficulty)) // 우리 목록에 있는 보스 · 난이도만
    .map(b => ({ boss: b.boss.id, difficulty: b.difficulty, period: b.monthly ? periods.monthly : periods.weekly }));
}

/**
 * 처치마다 파티를 정해 새로 만들 자동 기록을 고른다 (DB · 넥슨을 안 부르는 순수 계산이라 따로 시험할 수 있다).
 * 만든 기록은 runs 에 바로 더해 다음 파티원이 같은 기록을 또 만들지 않게 한다.
 * @param {{ characterId, boss, difficulty, period: { start, prevStart } }[]} candidates
 * @param {Map<string, Set<string>>} completedBy - 스케줄러를 확인한 캐릭터 → 이번 기간 처치 보스
 * @param {{ id, date, boss, character_ids }[]} runs - 지난 기간부터의 기록, 최신순 (이 함수가 앞에 더한다)
 */
export function planAutoRuns({ candidates, completedBy, runs, skips, knownCharacters, today }) {
  const hasRun = (characterId, boss, period) => runs.some(r => r.boss === boss && r.date >= period.start
    && (r.character_ids || []).includes(characterId));
  const dismissed = (characterId, boss, period) => skips.has(soloAutoRunId(characterId, boss, period.start));

  const created = [];
  for (const c of candidates) {
    if (hasRun(c.characterId, c.boss, c.period) || dismissed(c.characterId, c.boss, c.period)) continue;
    const last = runs.find(r => r.boss === c.boss && r.date >= c.period.prevStart && r.date < c.period.start
      && (r.character_ids || []).includes(c.characterId)); // runs 는 최신순
    const party = (last ? last.character_ids : [c.characterId]).filter(id => id === c.characterId || (
      knownCharacters.has(id)                                                     // 지운 캐릭터 빼기
      && !(completedBy.has(id) && !completedBy.get(id).has(c.boss))               // 연결했는데 처치 안 함 → 빼기
      && !hasRun(id, c.boss, c.period) && !dismissed(id, c.boss, c.period)));     // 이미 기록됐거나 지운 사람 빼기
    const row = {
      id: party.length === 1 ? soloAutoRunId(c.characterId, c.boss, c.period.start) : partyAutoRunId(c.boss, c.period.start, party),
      date: today,
      boss: c.boss,
      difficulty: c.difficulty,
      crystal: getEffectiveCrystal(c.boss, c.difficulty),
      character_ids: party,
      loot: [],
    };
    if (skips.has(row.id) || runs.some(r => r.id === row.id)) continue;
    created.push(row);
    runs.unshift({ id: row.id, date: row.date, boss: row.boss, character_ids: party });
  }
  return created;
}

/** 연결된 모든 유저의 캐릭터를 훑어 새 자동 기록을 만든다. @returns {{ created: object[], failures: object[] }} */
export async function syncSchedulers() {
  const periods = kstPeriods();
  const runs = await getRunsSince(periods.monthly.prevStart < periods.weekly.prevStart ? periods.monthly.prevStart : periods.weekly.prevStart);
  const [skips, knownCharacters] = await Promise.all([getAutoRunSkips(), getAllCharacterIds()]);

  // 1) 연결된 캐릭터마다 이번 기간 처치 보스를 모은다 (개발 단계 키 초당 5건이라 한 명씩)
  const completedBy = new Map(); // 캐릭터 id → Set(보스 id). 여기 있는 캐릭터 = 스케줄러를 확인할 수 있는 캐릭터
  const candidates = [];
  const failures = [];
  for (const { userId, apiKey } of await listNexonKeys()) {
    for (const character of await getCharactersOfUser(userId)) {
      try {
        const done = await completedBosses(character, apiKey, periods);
        completedBy.set(character.id, new Set(done.map(d => d.boss)));
        done.forEach(d => candidates.push({ ...d, characterId: character.id }));
      } catch (e) {
        failures.push({ character: character.name, message: e.message }); // 계정에 없는 캐릭터 등은 건너뛴다
      }
    }
  }

  const created = planAutoRuns({ candidates, completedBy, runs, skips, knownCharacters, today: periods.today });
  await insertRunsIgnoringDuplicates(created);
  return {
    created: created.map(r => ({ id: r.id, boss: r.boss, difficulty: r.difficulty, characterIds: r.character_ids })),
    failures,
  };
}
