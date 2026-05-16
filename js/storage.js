// storage.js — Supabase 백엔드 + 인메모리 캐시 (공유 2단계, 방식 2)
//
// 정책:
//  - 읽기 API는 예전처럼 전부 동기. 인메모리 캐시(cache)에서 즉시 반환 →
//    화면 코드(record/earnings/monthly/calendar/party…)는 거의 그대로.
//  - 앱 시작 시 await init() 1회: Supabase에서 전체 로드 → 캐시 채움 + Realtime 구독.
//  - 쓰기: ① 캐시 즉시 갱신(낙관적) → 호출부는 동기적으로 결과 사용
//          ② 백그라운드로 Supabase 반영, 실패하면 reload로 재동기 + 알림.
//  - 다른 사람이 바꾸면 Realtime이 변경을 푸시 → reload → onRemoteChange() 재렌더.
//
// boss_settings 는 ★파티별★ (party_id PK). getBossSettings(partyId)/setBossSettings(partyId, …).
//
// localStorage 버전이 필요하면 git 태그 pre-supabase-2026-05-16 로 복구.

import { supabase } from './config.js';

const cache = {
  parties:      [], // [{ id, name, members:[], createdAt, pw? }]
  bossRuns:     [], // [{ id, partyId, date, boss, difficulty, channel, opener, baseReward, memberSnapshot:[], loot:[] }]
  reservations: [], // [{ id, partyId, date, time, createdAt }]
  bossSettings: {}, // { [partyId]: { visible:{}, defaults:{} } }
};

let ready = false;
let remoteCb = null;

/** app.js가 등록: 원격 변경(Realtime)으로 캐시가 갱신되면 호출돼 현재 화면 재렌더. */
export function onRemoteChange(cb) { remoteCb = cb; }

// ── row ↔ 앱 객체 매핑 (snake_case ↔ camelCase) ──────────

const partyFromRow = (r) => ({
  id: r.id,
  name: r.name,
  members: Array.isArray(r.members) ? r.members : [],
  createdAt: r.created_at,
  ...(r.pw_hash ? { pw: r.pw_hash } : {}),
});
const partyToRow = (p) => ({
  id: p.id,
  name: p.name,
  members: p.members || [],
  created_at: p.createdAt,
  pw_hash: p.pw ?? null,
});

const runFromRow = (r) => ({
  id: r.id,
  partyId: r.party_id,
  date: r.date,
  boss: r.boss,
  difficulty: r.difficulty ?? undefined,
  channel: r.channel ?? undefined,
  opener: r.opener ?? undefined,
  baseReward: r.base_reward ?? undefined,
  memberSnapshot: Array.isArray(r.member_snapshot) ? r.member_snapshot : [],
  loot: Array.isArray(r.loot) ? r.loot : [],
});
const runToRow = (x) => ({
  id: x.id,
  party_id: x.partyId,
  date: x.date,
  boss: x.boss,
  difficulty: x.difficulty ?? null,
  channel: x.channel ?? null,
  opener: x.opener ?? null,
  base_reward: x.baseReward ?? null,
  member_snapshot: x.memberSnapshot || [],
  loot: x.loot || [],
});

const resFromRow = (r) => {
  const p = r.payload || {};
  return { id: r.id, partyId: r.party_id, date: p.date, time: p.time, createdAt: p.createdAt };
};
const resToRow = (x) => ({
  id: x.id,
  party_id: x.partyId,
  payload: { date: x.date, time: x.time, createdAt: x.createdAt },
});

const blankSettings = () => ({ visible: {}, defaults: {} });
function normalizeSettings(s) {
  const src = (s && typeof s === 'object') ? s : {};
  return {
    visible:  (src.visible  && typeof src.visible  === 'object') ? src.visible  : {},
    defaults: (src.defaults && typeof src.defaults === 'object') ? src.defaults : {},
  };
}

// ── 초기 로드 + Realtime ──────────────────────────────

async function loadAll() {
  const [p, b, r, s] = await Promise.all([
    supabase.from('parties').select('*'),
    supabase.from('boss_runs').select('*'),
    supabase.from('reservations').select('*'),
    supabase.from('boss_settings').select('*'),
  ]);
  const err = p.error || b.error || r.error || s.error;
  if (err) throw err;

  cache.parties      = (p.data || []).map(partyFromRow);
  cache.bossRuns     = (b.data || []).map(runFromRow);
  cache.reservations = (r.data || []).map(resFromRow);
  cache.bossSettings = {};
  for (const row of (s.data || [])) {
    cache.bossSettings[row.party_id] = {
      visible:  (row.visible  && typeof row.visible  === 'object') ? row.visible  : {},
      defaults: (row.defaults && typeof row.defaults === 'object') ? row.defaults : {},
    };
  }
}

/** 앱 시작 시 1회. 실패해도 throw — app.js가 안내 후 빈 화면으로라도 뜨게. */
export async function init() {
  await loadAll();
  ready = true;
  try {
    supabase
      .channel('maple-boss-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, async () => {
        try {
          await loadAll();
          if (remoteCb) remoteCb();
        } catch (e) { console.error('[storage] realtime reload 실패:', e); }
      })
      .subscribe();
  } catch (e) {
    // Realtime 실패해도 앱은 동작(새로고침해야 남의 변경 보임).
    console.error('[storage] realtime 구독 실패:', e);
  }
}

export const isReady = () => ready;

// 쓰기 백그라운드 반영 공용 — 실패 시 재동기 + 알림.
function push(promise, label) {
  Promise.resolve(promise)
    .then(({ error } = {}) => { if (error) throw error; })
    .catch(async (e) => {
      console.error(`[storage] ${label} 저장 실패:`, e);
      alert(`서버 저장에 실패했어요 (${label}). 화면을 동기화할게요.`);
      try { await loadAll(); if (remoteCb) remoteCb(); } catch (_) { /* noop */ }
    });
}

// ── 파티 ─────────────────────────────────────────────

export const getParties = () => cache.parties;

export const getParty = (partyId) =>
  cache.parties.find(p => p.id === partyId) || null;

export function createParty({ name, members, pw }) {
  const party = {
    id: makeId(),
    name: String(name).trim(),
    members: members.map(m => String(m).trim()).filter(Boolean),
    createdAt: new Date().toISOString(),
  };
  if (pw) party.pw = String(pw);
  cache.parties.push(party);
  push(supabase.from('parties').insert(partyToRow(party)), '파티 생성');
  return party;
}

export function updateParty(partyId, patch) {
  const idx = cache.parties.findIndex(p => p.id === partyId);
  if (idx < 0) return null;
  const next = { ...cache.parties[idx], ...patch };
  // pw 를 빈값으로 보내면 잠금 해제 — pw 키 제거.
  if (patch && 'pw' in patch && !patch.pw) delete next.pw;
  cache.parties[idx] = next;
  push(supabase.from('parties').update(partyToRow(next)).eq('id', partyId), '파티 수정');
  return next;
}

/** 파티 삭제 — 관련 보스런·예약·보스설정은 DB FK on delete cascade 로 함께 제거. */
export function deleteParty(partyId) {
  cache.parties      = cache.parties.filter(p => p.id !== partyId);
  cache.bossRuns     = cache.bossRuns.filter(r => r.partyId !== partyId);
  cache.reservations = cache.reservations.filter(r => r.partyId !== partyId);
  delete cache.bossSettings[partyId];
  push(supabase.from('parties').delete().eq('id', partyId), '파티 삭제');
}

// ── 보스런 ────────────────────────────────────────────

export const getRunsByParty = (partyId) =>
  cache.bossRuns.filter(r => r.partyId === partyId);

export const getRunsByPartyAndDate = (partyId, dateStr) =>
  cache.bossRuns.filter(r => r.partyId === partyId && r.date === dateStr);

/** start/end 모두 inclusive ("YYYY-MM-DD"). */
export const getRunsByPartyInRange = (partyId, startStr, endStr) =>
  cache.bossRuns.filter(r =>
    r.partyId === partyId && r.date >= startStr && r.date <= endStr
  );

export function createRun(run) {
  const newRun = { id: makeId(), ...run };
  cache.bossRuns.push(newRun);
  push(supabase.from('boss_runs').insert(runToRow(newRun)), '회차 추가');
  return newRun;
}

export function updateRun(runId, patch) {
  const idx = cache.bossRuns.findIndex(r => r.id === runId);
  if (idx < 0) return null;
  cache.bossRuns[idx] = { ...cache.bossRuns[idx], ...patch };
  push(supabase.from('boss_runs').update(runToRow(cache.bossRuns[idx])).eq('id', runId), '회차 수정');
  return cache.bossRuns[idx];
}

export function deleteRun(runId) {
  cache.bossRuns = cache.bossRuns.filter(r => r.id !== runId);
  push(supabase.from('boss_runs').delete().eq('id', runId), '회차 삭제');
}

// ── 예약 (미래 보스 일정) ────────────────────────────

export const getReservationsByParty = (partyId) =>
  cache.reservations.filter(r => r.partyId === partyId);

export const getReservationsByPartyAndDate = (partyId, dateStr) =>
  cache.reservations
    .filter(r => r.partyId === partyId && r.date === dateStr)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

export function createReservation({ partyId, date, time }) {
  const res = {
    id: makeId(),
    partyId,
    date,
    time: String(time),
    createdAt: new Date().toISOString(),
  };
  cache.reservations.push(res);
  push(supabase.from('reservations').insert(resToRow(res)), '예약 추가');
  return res;
}

export function deleteReservation(resId) {
  cache.reservations = cache.reservations.filter(r => r.id !== resId);
  push(supabase.from('reservations').delete().eq('id', resId), '예약 삭제');
}

// ── 보스 설정 (파티별 · 등장 유무 / 기본 난이도) ──────

/**
 * 파티별 보스 설정. 항목 없으면 보스는 기본 노출, 기본 난이도는 data.js 첫 난이도.
 * @param {string} partyId
 */
export const getBossSettings = (partyId) =>
  cache.bossSettings[partyId] || blankSettings();

/**
 * 파티별 보스 설정 저장(upsert). visible/defaults 중 넘긴 것만 교체.
 * @param {string} partyId
 * @param {{visible?: object, defaults?: object}} patch
 */
export function setBossSettings(partyId, patch) {
  const cur = normalizeSettings(cache.bossSettings[partyId]);
  const next = {
    visible:  (patch.visible  && typeof patch.visible  === 'object') ? patch.visible  : cur.visible,
    defaults: (patch.defaults && typeof patch.defaults === 'object') ? patch.defaults : cur.defaults,
  };
  cache.bossSettings[partyId] = next;
  push(
    supabase.from('boss_settings').upsert({ party_id: partyId, ...next }, { onConflict: 'party_id' }),
    '보스 설정 저장',
  );
}

// ── 백업 / 복원 ──────────────────────────────────────

/** 예전 단일 JSON 형태로 스냅샷 (backup.js 내보내기용). bossSettings 는 파티별 맵. */
export const exportData = () => ({
  parties:      cache.parties,
  bossRuns:     cache.bossRuns,
  reservations: cache.reservations,
  bossSettings: cache.bossSettings,
});

/**
 * 백업 복원 — 전체를 Supabase에 upsert 후 재로드.
 * 구버전 백업(bossSettings 가 전역 1개)은 모든 파티에 동일 적용.
 */
export function importData(data) {
  if (!data || !Array.isArray(data.parties) || !Array.isArray(data.bossRuns)) {
    throw new Error('백업 파일 구조가 올바르지 않아요');
  }
  const parties      = data.parties;
  const bossRuns     = data.bossRuns;
  const reservations = Array.isArray(data.reservations) ? data.reservations : [];

  // bossSettings: 신버전(파티별 맵) 그대로 / 구버전(전역) → 전 파티에 복제.
  let settingsRows = [];
  const bs = data.bossSettings;
  if (bs && (bs.visible || bs.defaults)) {
    const g = normalizeSettings(bs);
    settingsRows = parties.map(p => ({ party_id: p.id, visible: g.visible, defaults: g.defaults }));
  } else if (bs && typeof bs === 'object') {
    settingsRows = Object.entries(bs).map(([pid, v]) => {
      const n = normalizeSettings(v);
      return { party_id: pid, visible: n.visible, defaults: n.defaults };
    });
  }

  const jobs = [
    supabase.from('parties').upsert(parties.map(partyToRow), { onConflict: 'id' }),
    supabase.from('boss_runs').upsert(bossRuns.map(runToRow), { onConflict: 'id' }),
    supabase.from('reservations').upsert(reservations.map(resToRow), { onConflict: 'id' }),
  ];
  if (settingsRows.length) {
    jobs.push(supabase.from('boss_settings').upsert(settingsRows, { onConflict: 'party_id' }));
  }
  Promise.all(jobs)
    .then(async () => { await loadAll(); if (remoteCb) remoteCb(); })
    .catch((e) => {
      console.error('[storage] 복원 실패:', e);
      alert('백업 복원에 실패했어요. 서버 상태를 확인해주세요.');
    });
}

// ── ID ────────────────────────────────────────────────

function makeId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
