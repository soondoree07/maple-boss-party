// api/_lib/scheduler-sync.js — 스케줄러에서 잡은 보스를 "혼자 잡은 기록"으로 자동 저장
//
// 규칙 (사용자 결정 2026-10-01)
//  - 스케줄러에 이번 주(월간 보스는 이번 달) 처치로 나온 보스 → 그 캐릭터 혼자, 드랍템 없이, 결정석 100% 로 기록.
//  - 그 기간에 그 캐릭터가 들어간 같은 보스 기록이 이미 있으면 만들지 않는다(직접 기록 · 파티 기록 우선).
//  - 사용자가 지우거나 합친 자동 기록(auto_run_skips)은 다시 만들지 않는다.
//  - id 는 캐릭터 · 보스 · 기간으로 정해져 같은 기록이 두 번 생기지 않는다.
//  - 날짜는 처음 발견한 날(KST). 스케줄러는 잡은 날짜를 주지 않는다.
// 가격표는 사이트와 같은 js/data.js 를 그대로 쓴다.

import { BOSSES, getBossDifficulty, getEffectiveCrystal } from '../../js/data.js';
import { callNexon, findOcid } from './nexon-client.js';
import {
  listNexonKeys, getCharactersOfUser, getRunsSince, getAutoRunSkips, insertRunsIgnoringDuplicates,
} from './db.js';

export const AUTO_RUN_PREFIX = 'r-auto-';

const compact = (name) => String(name).normalize('NFC').replace(/\s+/g, '');
const BOSS_BY_NAME = new Map(BOSSES.map(b => [compact(b.name), b]));

/** KST 오늘 · 이번 주 시작(목요일) · 이번 달 1일, 모두 YYYY-MM-DD */
function kstPeriods(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC 메서드로 읽으면 KST 날짜
  const ymd = (d) => d.toISOString().slice(0, 10);
  const weekStart = new Date(kst);
  weekStart.setUTCDate(kst.getUTCDate() - ((kst.getUTCDay() - 4 + 7) % 7)); // 목=0 … 수=6
  return { today: ymd(kst), weekStart: ymd(weekStart), monthStart: `${ymd(kst).slice(0, 7)}-01` };
}

/** 한 캐릭터의 스케줄러에서 처치 완료 보스 → [{ boss, difficulty, periodStart }] */
async function completedBosses(character, apiKey, periods) {
  const ocid = await findOcid(character.name);
  const state = await callNexon('/scheduler/character-state', { ocid }, apiKey);
  return (state.boss_contents || [])
    .filter(b => b.complete_flag === 'true' && b.cycle !== 'bossDaily')
    .map(b => ({ boss: BOSS_BY_NAME.get(compact(b.content_name)), difficulty: b.difficulty, monthly: b.cycle === 'bossMonthly' }))
    .filter(b => b.boss && getBossDifficulty(b.boss.id, b.difficulty)) // 우리 목록에 있는 보스 · 난이도만
    .map(b => ({ boss: b.boss.id, difficulty: b.difficulty, periodStart: b.monthly ? periods.monthStart : periods.weekStart }));
}

/** 연결된 모든 유저의 캐릭터를 훑어 새 자동 기록을 만든다. @returns {{ created: object[], failures: object[] }} */
export async function syncSchedulers() {
  const periods = kstPeriods();
  const since = periods.monthStart < periods.weekStart ? periods.monthStart : periods.weekStart;
  const existing = await getRunsSince(since);

  const candidates = [];
  const failures = [];
  for (const { userId, apiKey } of await listNexonKeys()) {
    for (const character of await getCharactersOfUser(userId)) { // 개발 단계 키 초당 5건이라 한 명씩
      try {
        for (const done of await completedBosses(character, apiKey, periods)) {
          const already = existing.some(r => r.boss === done.boss && r.date >= done.periodStart
            && (r.character_ids || []).includes(character.id));
          if (!already) candidates.push({ ...done, character });
        }
      } catch (e) {
        failures.push({ character: character.name, message: e.message }); // 계정에 없는 캐릭터 등은 건너뛴다
      }
    }
  }

  const rows = candidates.map(c => ({
    id: `${AUTO_RUN_PREFIX}${c.character.id}-${c.boss}-${c.periodStart}`,
    date: periods.today,
    boss: c.boss,
    difficulty: c.difficulty,
    crystal: getEffectiveCrystal(c.boss, c.difficulty),
    character_ids: [c.character.id],
    loot: [],
  }));
  const skips = await getAutoRunSkips(rows.map(r => r.id));
  const fresh = rows.filter(r => !skips.has(r.id) && !existing.some(e => e.id === r.id));
  await insertRunsIgnoringDuplicates(fresh);
  return {
    created: fresh.map(r => ({ id: r.id, boss: r.boss, difficulty: r.difficulty, characterId: r.character_ids[0] })),
    failures,
  };
}
