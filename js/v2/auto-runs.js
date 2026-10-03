// v2/auto-runs.js — 스케줄러 자동 기록 (사이트 쪽)
//
// 자동 기록 = 서버(api/scheduler-sync)가 스케줄러 처치 보스로 만든 기록(드랍템 없음, 지난 기간 같은 보스 파티를 따라감).
// id 가 r-auto- 로 시작하고, 카드에 "자동" 표시가 붙는다. 사용자가 확인해 고치는 흐름:
//  - 수정해서 저장 → 새 id 의 일반 기록으로 바꾸고 자동 기록은 지운다(그래서 "자동" 표시가 사라진다).
//  - 파티 기록을 저장 → 그 파티원을 같은 기간 · 같은 보스 자동 기록에서 뺀다(결정석이 두 번 잡히지 않게).
//    남은 사람은 남은 인원끼리 간 기록으로 두고(결정석도 남은 인원으로 나눔), 아무도 안 남으면 자동 기록을 지운다.
//  - 지운 자동 기록은 그 id 와 파티원마다의 캐릭터별 id 를 auto_run_skips 에 남겨 다음 가져오기에서 다시 만들지 않는다.

import { supabase } from '../config.js';
import { toast, parseDateStr, getWeekRange, getMonthRange } from '../utils.js';
import { getBoss } from '../data.js';
import { getRuns, saveRun, deleteRun, reloadAll } from './store.js';

export const AUTO_RUN_PREFIX = 'r-auto-';
export const isAutoRun = (run) => String(run?.id || '').startsWith(AUTO_RUN_PREFIX);

const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const SYNC_URL = IS_LOCAL ? 'https://maplebossparty.vercel.app/api/scheduler-sync' : '/api/scheduler-sync';
const SYNC_KEY = 'maple-scheduler-sync-at';
const AUTO_SYNC_INTERVAL_MS = 10 * 60 * 1000;

/** 그 보스의 기간 시작일 — 월간 보스는 그달 1일, 일간 보스는 그날, 나머지는 그 주 목요일 */
function periodStart(bossId, date) {
  const cycle = getBoss(bossId)?.cycle;
  if (cycle === 'daily') return date;
  return (cycle === 'monthly' ? getMonthRange : getWeekRange)(parseDateStr(date)).start;
}

/** 캐릭터 한 명 몫의 자동 기록 id (api/_lib/scheduler-sync.js 의 soloAutoRunId 와 같은 모양) */
const soloAutoRunId = (characterId, bossId, start) => `${AUTO_RUN_PREFIX}${characterId}-${bossId}-${start}`;

/** 이 캐릭터들의 그 기간 · 그 보스 자동 기록이 다시 만들어지지 않게 건너뛰기 목록에 넣는다. */
async function addSkips(run, characterIds, extraIds = []) {
  const start = periodStart(run.boss, run.date);
  const ids = [...extraIds, ...characterIds.map(id => soloAutoRunId(id, run.boss, start))];
  const { error } = await supabase.from('auto_run_skips').upsert([...new Set(ids)].map(id => ({ id })), { onConflict: 'id' });
  if (error) console.error('[auto-runs] 건너뛰기 목록 저장 실패:', error); // 지우기는 계속한다
}

/** 자동 기록을 지운다. 그 기록과 파티원 모두가 이번 기간에 다시 만들어지지 않게 먼저 건너뛰기 목록에 넣는다. */
export async function removeAutoRun(run) {
  await addSkips(run, run.characterIds, [run.id]);
  return deleteRun(run.id);
}

/** 자동 기록에서 몇 명만 뺀다. 남은 사람끼리 간 기록이 되고, 아무도 안 남으면 지운다. @returns {Promise<boolean>} */
async function dropFromAutoRun(run, characterIds) {
  const remaining = run.characterIds.filter(id => !characterIds.includes(id));
  if (remaining.length === 0) return removeAutoRun(run);
  await addSkips(run, characterIds);
  return saveRun({ ...run, characterIds: remaining });
}

/** 기록 하나 지우기 — 자동 기록이면 건너뛰기 목록에도 남긴다. */
export const removeRun = (run) => (isAutoRun(run) ? removeAutoRun(run) : deleteRun(run.id));

/** 월간 보스는 같은 달, 일간 보스는 같은 날, 나머지는 같은 주(목요일 리셋)를 같은 기간으로 본다. */
const samePeriod = (bossId, dateA, dateB) => periodStart(bossId, dateA) === periodStart(bossId, dateB);

/**
 * 방금 저장한 기록의 파티원을 같은 기간 · 같은 보스 자동 기록에서 뺀다.
 * @param {{ boss, date, characterIds }[]} savedRuns
 * @param {string[]} keepIds - 건드리면 안 되는 기록 (방금 저장한 것)
 * @returns {Promise<boolean>} 모두 정리했으면 true
 */
export async function removeMergedAutoRuns(savedRuns, keepIds = []) {
  let allOk = true;
  for (const run of getRuns().filter(r => isAutoRun(r) && !keepIds.includes(r.id))) {
    const overlap = run.characterIds.filter(id => savedRuns.some(saved => saved.boss === run.boss
      && samePeriod(run.boss, saved.date, run.date) && saved.characterIds.includes(id)));
    if (overlap.length > 0 && !(await dropFromAutoRun(run, overlap))) allOk = false;
  }
  return allOk;
}

/**
 * 스케줄러에서 잡은 보스를 가져온다.
 * @param {{ manual?: boolean }} opts - manual 이 아니면 이 브라우저에서 10분에 한 번까지만
 */
export async function syncFromScheduler({ manual = false } = {}) {
  if (!manual) {
    let last = 0;
    try { last = Number(localStorage.getItem(SYNC_KEY)) || 0; } catch (_) { /* 저장소를 못 쓰면 매번 */ }
    if (Date.now() - last < AUTO_SYNC_INTERVAL_MS) return;
  }
  try { localStorage.setItem(SYNC_KEY, String(Date.now())); } catch (_) { /* 무시 */ }

  let result;
  try {
    result = await (await fetch(SYNC_URL, { method: 'POST' })).json();
  } catch (e) {
    console.error('[auto-runs] 가져오기 실패:', e);
    if (manual) toast('스케줄러에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.', 'err');
    return;
  }
  if (!result.ok) { if (manual) toast(result.message, 'err'); return; }

  if (result.data?.busy) {
    if (manual) toast('방금 다른 곳에서 가져오고 있어요. 30초쯤 뒤에 다시 눌러 주세요.', 'ok');
    return;
  }
  const count = result.data?.created?.length ?? 0;
  const failedNames = (result.data?.failures || []).map(f => f.character);
  if (count > 0) {
    await reloadAll();
    toast(`스케줄러에서 잡은 보스 ${count}건을 기록했어요. 지난번과 같은 파티로 넣었으니, 바뀐 게 있으면 수정해 주세요.`, 'ok', 6000);
  } else if (manual && failedNames.length === 0) {
    toast('새로 잡은 보스가 없어요. 이미 기록했거나 스케줄러에 처치로 아직 안 바뀌었어요.', 'ok');
  }
  if (manual && failedNames.length > 0) {
    toast(`${failedNames.join(', ')}의 스케줄러를 확인하지 못했어요. 잠시 후 다시 가져와 주세요.`, 'err', 6000);
  }
}
