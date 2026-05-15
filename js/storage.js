// storage.js — localStorage 래퍼
//
// 저장 포맷:
//   {
//     parties:           [{ id, name, members: [닉네임...], createdAt }],
//     bossRuns:          [{ id, partyId, date, boss, channel, opener, baseReward,
//                          memberSnapshot: [닉네임...],
//                          loot: [{ item, taker, price }] }],
//     reservations:      [{ id, partyId, date, time: 'HH:MM', createdAt }],
//     bossSettings:      { visible: { [bossId]: false }, defaults: { [bossId]: difficultyKey } }
//       // visible: 결정석/보스 설정 페이지에서 끈 보스(회차 폼 드롭다운에서 숨김)
//       // defaults: 보스별 기본 난이도(회차 폼 난이도 초기값 후보)
//   }
//
// 모든 데이터는 단일 JSON으로 'maple-boss-v1' 키에 저장.
// (구버전의 crystalOverrides는 폐기 — 결정석은 data.js 난이도별 고정값.)

const STORAGE_KEY = 'maple-boss-v1';

const blankSettings = () => ({ visible: {}, defaults: {} });
const blankData = () => ({ parties: [], bossRuns: [], reservations: [], bossSettings: blankSettings() });

function normalizeSettings(s) {
  const src = (s && typeof s === 'object') ? s : {};
  return {
    visible:  (src.visible  && typeof src.visible  === 'object') ? src.visible  : {},
    defaults: (src.defaults && typeof src.defaults === 'object') ? src.defaults : {},
  };
}

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankData();
    const parsed = JSON.parse(raw);
    return {
      parties:           Array.isArray(parsed.parties)      ? parsed.parties      : [],
      bossRuns:          Array.isArray(parsed.bossRuns)     ? parsed.bossRuns     : [],
      reservations:      Array.isArray(parsed.reservations) ? parsed.reservations : [],
      bossSettings:      normalizeSettings(parsed.bossSettings),
    };
  } catch (e) {
    console.error('[storage] read failed:', e);
    return blankData();
  }
}

function writeRaw(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[storage] write failed:', e);
    alert('저장에 실패했어요. 저장 공간이 부족하거나 브라우저가 막았을 수 있어요.');
  }
}

// ── 파티 ─────────────────────────────────────────────

export const getParties = () => readRaw().parties;

export const getParty = (partyId) =>
  readRaw().parties.find(p => p.id === partyId) || null;

export function createParty({ name, members, pw }) {
  const data = readRaw();
  const party = {
    id: makeId(),
    name: String(name).trim(),
    members: members.map(m => String(m).trim()).filter(Boolean),
    createdAt: new Date().toISOString(),
  };
  // pw: 해시 문자열(선택). 없으면 잠금 없는 파티.
  if (pw) party.pw = String(pw);
  data.parties.push(party);
  writeRaw(data);
  return party;
}

export function updateParty(partyId, patch) {
  const data = readRaw();
  const idx = data.parties.findIndex(p => p.id === partyId);
  if (idx < 0) return null;
  data.parties[idx] = { ...data.parties[idx], ...patch };
  writeRaw(data);
  return data.parties[idx];
}

/** 파티 삭제 시 관련 보스런·예약도 함께 제거. */
export function deleteParty(partyId) {
  const data = readRaw();
  data.parties      = data.parties.filter(p => p.id !== partyId);
  data.bossRuns     = data.bossRuns.filter(r => r.partyId !== partyId);
  data.reservations = data.reservations.filter(r => r.partyId !== partyId);
  writeRaw(data);
}

// ── 보스런 ────────────────────────────────────────────

export const getRunsByParty = (partyId) =>
  readRaw().bossRuns.filter(r => r.partyId === partyId);

export const getRunsByPartyAndDate = (partyId, dateStr) =>
  readRaw().bossRuns.filter(r => r.partyId === partyId && r.date === dateStr);

/** start/end 모두 inclusive ("YYYY-MM-DD"). */
export const getRunsByPartyInRange = (partyId, startStr, endStr) =>
  readRaw().bossRuns.filter(r =>
    r.partyId === partyId && r.date >= startStr && r.date <= endStr
  );

export function createRun(run) {
  const data = readRaw();
  const newRun = { id: makeId(), ...run };
  data.bossRuns.push(newRun);
  writeRaw(data);
  return newRun;
}

export function updateRun(runId, patch) {
  const data = readRaw();
  const idx = data.bossRuns.findIndex(r => r.id === runId);
  if (idx < 0) return null;
  data.bossRuns[idx] = { ...data.bossRuns[idx], ...patch };
  writeRaw(data);
  return data.bossRuns[idx];
}

export function deleteRun(runId) {
  const data = readRaw();
  data.bossRuns = data.bossRuns.filter(r => r.id !== runId);
  writeRaw(data);
}

// ── 예약 (미래 보스 일정) ────────────────────────────

export const getReservationsByParty = (partyId) =>
  readRaw().reservations.filter(r => r.partyId === partyId);

export const getReservationsByPartyAndDate = (partyId, dateStr) =>
  readRaw().reservations
    .filter(r => r.partyId === partyId && r.date === dateStr)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

export function createReservation({ partyId, date, time }) {
  const data = readRaw();
  const res = {
    id: makeId(),
    partyId,
    date,
    time: String(time),
    createdAt: new Date().toISOString(),
  };
  data.reservations.push(res);
  writeRaw(data);
  return res;
}

export function deleteReservation(resId) {
  const data = readRaw();
  data.reservations = data.reservations.filter(r => r.id !== resId);
  writeRaw(data);
}

// ── 보스 설정 (등장 유무 / 기본 난이도) ──────────────

/**
 * { visible: { [bossId]: false }, defaults: { [bossId]: difficultyKey } }
 * 항목이 없으면 보스는 기본 노출, 기본 난이도는 data.js 첫 난이도.
 */
export const getBossSettings = () => readRaw().bossSettings;

/**
 * 보스 설정 일괄 저장. visible/defaults 중 넘긴 것만 교체.
 * @param {{visible?: object, defaults?: object}} patch
 */
export function setBossSettings(patch) {
  const data = readRaw();
  const cur = normalizeSettings(data.bossSettings);
  data.bossSettings = {
    visible:  (patch.visible  && typeof patch.visible  === 'object') ? patch.visible  : cur.visible,
    defaults: (patch.defaults && typeof patch.defaults === 'object') ? patch.defaults : cur.defaults,
  };
  writeRaw(data);
}

// ── 백업 / 복원 ──────────────────────────────────────

export const exportData = () => readRaw();

export function importData(data) {
  if (!data || !Array.isArray(data.parties) || !Array.isArray(data.bossRuns)) {
    throw new Error('백업 파일 구조가 올바르지 않아요');
  }
  writeRaw({
    parties:          data.parties,
    bossRuns:         data.bossRuns,
    reservations:     Array.isArray(data.reservations) ? data.reservations : [],
    // 구버전 백업의 crystalOverrides는 무시 (결정석은 이제 난이도별 고정값).
    bossSettings:     normalizeSettings(data.bossSettings),
  });
}

// ── ID ────────────────────────────────────────────────

function makeId() {
  // 12자 (UUID 4 앞부분 + 추가) — 충돌 가능성 무시 가능, 짧아서 URL/디버깅 친화.
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
