// v2/auto-runs.js — 스케줄러 자동 기록 (사이트 쪽)
//
// 자동 기록 = 서버(api/scheduler-sync)가 스케줄러 처치 보스로 만든 "혼자 · 드랍템 없음 · 결정석 100%" 기록.
// id 가 r-auto- 로 시작하고, 카드에 "자동" 표시가 붙는다. 사용자가 확인해 고치는 흐름:
//  - 수정해서 저장 → 새 id 의 일반 기록으로 바꾸고 자동 기록은 지운다(그래서 "자동" 표시가 사라진다).
//  - 파티 기록을 저장 → 그 파티원의 같은 기간 · 같은 보스 자동 기록을 지운다(결정석이 두 번 잡히지 않게).
//  - 지운 자동 기록 id 는 auto_run_skips 에 남겨 다음 가져오기에서 다시 만들지 않는다.

import { supabase } from '../config.js';
import { toast, parseDateStr, getWeekRange, getMonthRange } from '../utils.js';
import { getBoss } from '../data.js';
import { getRuns, deleteRun, reloadAll } from './store.js';

export const AUTO_RUN_PREFIX = 'r-auto-';
export const isAutoRun = (run) => String(run?.id || '').startsWith(AUTO_RUN_PREFIX);

const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const SYNC_URL = IS_LOCAL ? 'https://maplebossparty.vercel.app/api/scheduler-sync' : '/api/scheduler-sync';
const SYNC_KEY = 'maple-scheduler-sync-at';
const AUTO_SYNC_INTERVAL_MS = 10 * 60 * 1000;

/** 자동 기록을 지운다. 다시 만들어지지 않게 먼저 건너뛰기 목록에 넣는다. */
export async function removeAutoRun(run) {
  const { error } = await supabase.from('auto_run_skips').upsert({ id: run.id }, { onConflict: 'id' });
  if (error) console.error('[auto-runs] 건너뛰기 목록 저장 실패:', error); // 지우기는 계속한다
  return deleteRun(run.id);
}

/** 기록 하나 지우기 — 자동 기록이면 건너뛰기 목록에도 남긴다. */
export const removeRun = (run) => (isAutoRun(run) ? removeAutoRun(run) : deleteRun(run.id));

/** 월간 보스는 같은 달, 나머지는 같은 주(목요일 리셋)를 같은 기간으로 본다. */
function samePeriod(bossId, dateA, dateB) {
  const range = getBoss(bossId)?.cycle === 'monthly' ? getMonthRange : getWeekRange;
  return range(parseDateStr(dateA)).start === range(parseDateStr(dateB)).start;
}

/**
 * 방금 저장한 기록의 파티원이 같은 기간 · 같은 보스로 가진 자동 기록을 지운다.
 * @param {{ boss, date, characterIds }[]} savedRuns
 * @param {string[]} keepIds - 지우면 안 되는 기록 (방금 저장한 것)
 */
export async function removeMergedAutoRuns(savedRuns, keepIds = []) {
  const targets = getRuns().filter(run => isAutoRun(run) && !keepIds.includes(run.id)
    && savedRuns.some(saved => saved.boss === run.boss && samePeriod(run.boss, saved.date, run.date)
      && run.characterIds.some(id => saved.characterIds.includes(id))));
  for (const run of targets) await removeAutoRun(run);
  return targets.length;
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

  const count = result.data.created.length;
  if (count > 0) {
    await reloadAll();
    toast(`스케줄러에서 잡은 보스 ${count}건을 혼자 잡은 기록으로 넣었어요. 파티로 갔다면 수정해 주세요.`, 'ok', 6000);
  } else if (manual) {
    toast('새로 잡은 보스가 없어요. 이미 기록했거나 스케줄러에 처치로 아직 안 바뀌었어요.', 'ok');
  }
}
