// v2/scheduler-bosses.js — 기록 창에서 고른 캐릭터들의 스케줄러 보스를 모은다
//
// 참여 캐릭터가 바뀔 때마다 스케줄러가 연결된 캐릭터만 골라 불러오고,
// 보스마다 "등록한 캐릭터 수 · 가장 많이 등록한 난이도 · 이번 주 처치한 캐릭터 수"로 합친다.
// 보스 칸은 이 결과로 등록 보스를 위에 묶고, 보스를 고르면 등록 난이도를 먼저 고른다.

import { BOSSES } from '../data.js';
import { getCharacter } from './store.js';
import { isExternalCharacter } from './members.js';
import { fetchScheduler, fetchConnectedUserIds } from './nexon.js';

// 넥슨 표기와 우리 표기는 띄어쓰기만 다를 수 있어 공백을 지우고 맞춘다. 우리 목록에 없는 보스(혼테일 등)는 버린다.
const normalizeName = (name) => String(name).normalize('NFC').replace(/\s+/g, '');
const BOSS_ID_BY_NAME = new Map(BOSSES.map(b => [normalizeName(b.name), b.id]));

/**
 * @typedef {{ difficulty: string, registeredCount: number, completedCount: number }} ScheduledBoss
 * @typedef {{ status: 'idle' | 'loading' | 'ready', loadedCount: number,
 *             failures: { name: string, message: string }[], bosses: Map<string, ScheduledBoss> }} ScheduleState
 */
const IDLE_STATE = { status: 'idle', loadedCount: 0, failures: [], bosses: new Map() };

/**
 * @param {(state: ScheduleState) => void} onChange
 * @returns {{ update: (characterIds: string[]) => Promise<void>, get: () => ScheduleState }}
 */
export function createSchedulerSource(onChange) {
  let state = IDLE_STATE;
  let requestNo = 0; // 캐릭터를 빠르게 바꿔도 마지막 선택의 결과만 쓴다

  const set = (next) => { state = next; onChange(state); };

  async function update(characterIds) {
    const myNo = ++requestNo;
    const connectedUserIds = await fetchConnectedUserIds();
    const targets = characterIds
      .filter(id => !isExternalCharacter(id))
      .map(getCharacter)
      .filter(ch => ch && connectedUserIds.has(ch.userId));
    if (myNo !== requestNo) return;
    if (targets.length === 0) { set(IDLE_STATE); return; }

    set({ ...IDLE_STATE, status: 'loading' });
    const results = await Promise.all(targets.map(ch => fetchScheduler(ch.id)));
    if (myNo !== requestNo) return;

    const loaded = results.filter(r => r.ok).map(r => r.data);
    const failures = results
      .map((r, i) => (r.ok ? null : { name: targets[i].name, message: r.message }))
      .filter(Boolean);
    set({ status: 'ready', loadedCount: loaded.length, failures, bosses: mergeBosses(loaded) });
  }

  return { update, get: () => state };
}

/** 캐릭터별 등록 보스를 보스 id 하나로 합친다. */
function mergeBosses(schedules) {
  const tally = new Map(); // bossId → { difficultyCounts: Map, registeredCount, completedCount }
  for (const schedule of schedules) {
    for (const boss of schedule.bosses) {
      const bossId = BOSS_ID_BY_NAME.get(normalizeName(boss.name));
      if (!bossId) continue;
      const entry = tally.get(bossId) || { difficultyCounts: new Map(), registeredCount: 0, completedCount: 0 };
      entry.difficultyCounts.set(boss.difficulty, (entry.difficultyCounts.get(boss.difficulty) || 0) + 1);
      entry.registeredCount += 1;
      if (boss.completed) entry.completedCount += 1;
      tally.set(bossId, entry);
    }
  }
  return new Map([...tally].map(([bossId, entry]) => [bossId, {
    difficulty: mostCommon(entry.difficultyCounts),
    registeredCount: entry.registeredCount,
    completedCount: entry.completedCount,
  }]));
}

const mostCommon = (counts) => [...counts].sort((a, b) => b[1] - a[1])[0][0];

/** 기록 창에 띄울 한 줄 안내 (보여 줄 게 없으면 빈 문자열) */
export function scheduleHint(state) {
  if (state.status === 'loading') return '스케줄러 불러오는 중..';
  if (state.status !== 'ready') return '';
  const parts = [];
  if (state.loadedCount > 0) parts.push(`스케줄러를 연결한 캐릭터 ${state.loadedCount}명이 등록한 보스를 위에 모았어요.`);
  for (const f of state.failures) parts.push(`${f.name}: ${f.message}`);
  return parts.join(' ');
}
