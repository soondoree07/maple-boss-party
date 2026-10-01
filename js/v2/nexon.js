// v2/nexon.js — 넥슨 오픈 API 조회 (사이트 쪽 도우미)
//
// 넥슨을 직접 부르지 않고 우리 서버 함수(/api/nexon, /api/nexon-keys)를 부른다. 키는 서버에만 있다.
// 결과는 { ok: true, data } 또는 { ok: false, code, message } 로 돌려준다 — message 는 화면에 그대로 띄운다.
//
// 로컬(python http.server)에는 /api 가 없으므로, 로컬에서는 배포된 사이트의 서버 함수를 부른다.

const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const API_ROOT = IS_LOCAL ? 'https://maplebossparty.vercel.app/api' : '/api';

const OFFLINE_MESSAGE = '넥슨 조회에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';
const SCHEDULER_TTL_MS = 60 * 1000; // 서버 캐시와 같게. 기록 창을 다시 열면 1분 지난 것만 새로 받는다

const profileCache = new Map();   // 닉네임 → 성공한 조회 결과 (새로고침 전까지)
const fullProfileCache = new Map(); // 닉네임 → 유저 캐릭터 창 조회 promise (새로고침 전까지)
const schedulerCache = new Map(); // 캐릭터 id → { at, promise }
let keyOwnersPromise = null;      // 스케줄러를 연결한 유저 id 목록 (등록 · 해제하면 다시 받는다)

// 넥슨 개발 단계 키는 초당 5건이라, 서버 함수 요청을 한 번에 MAX_IN_FLIGHT 개씩만 보낸다.
const MAX_IN_FLIGHT = 2;
let inFlight = 0;
const waiting = [];

async function request(path, options = {}) {
  if (inFlight >= MAX_IN_FLIGHT) await new Promise(resolve => waiting.push(resolve)); // 자리는 끝난 요청이 넘겨준다
  else inFlight += 1;
  try {
    return await send(path, options);
  } finally {
    const next = waiting.shift();
    if (next) next(); else inFlight -= 1;
  }
}

async function send(path, { method = 'GET', params, body } = {}) {
  const query = params ? `?${new URLSearchParams(params)}` : '';
  try {
    const res = await fetch(`${API_ROOT}${path}${query}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch (e) {
    console.error('[nexon] 요청 실패:', path, e);
    return { ok: false, code: 'OFFLINE', message: OFFLINE_MESSAGE };
  }
}

/**
 * 닉네임으로 캐릭터 기본 정보를 찾는다.
 * @returns {Promise<{ok: true, data: {ocid, name, world, job, level, image}} | {ok: false, message: string}>}
 */
export async function fetchCharacterProfile(name) {
  const key = name.trim();
  if (profileCache.has(key)) return profileCache.get(key);
  const result = await request('/nexon', { params: { action: 'character', name: key } });
  if (result.ok) profileCache.set(key, result);
  return result;
}

/**
 * 유저 캐릭터 창용 정보 (api/_lib/profile.js 의 loadProfile 결과). 넥슨 호출이 8번이라 한 번 받으면 새로고침 전까지 쓴다.
 * @returns {Promise<{ok: true, data: object} | {ok: false, message: string}>}
 */
export function fetchProfile(name) {
  const key = name.trim();
  if (!fullProfileCache.has(key)) {
    const promise = request('/nexon', { params: { action: 'profile', name: key } });
    fullProfileCache.set(key, promise);
    promise.then(r => { if (!r.ok) fullProfileCache.delete(key); }); // 실패는 다음에 다시 시도
  }
  return fullProfileCache.get(key);
}

/**
 * 캐릭터 스케줄러에 등록한 보스.
 * @returns {Promise<{ok: true, data: {characterId, clearCount, clearLimit, bosses: {name, difficulty, completed}[]}} | {ok: false, code, message}>}
 */
export function fetchScheduler(characterId) {
  const cached = schedulerCache.get(characterId);
  if (cached && Date.now() - cached.at < SCHEDULER_TTL_MS) return cached.promise;
  const promise = request('/nexon', { params: { action: 'scheduler', characterId } });
  schedulerCache.set(characterId, { at: Date.now(), promise });
  promise.then(r => { if (!r.ok) schedulerCache.delete(characterId); }); // 실패는 다음에 다시 시도
  return promise;
}

/** 스케줄러를 연결한 유저 id 집합. 실패하면 빈 집합(연결 안 된 것처럼 지금 화면 그대로). */
export function fetchConnectedUserIds() {
  keyOwnersPromise ||= request('/nexon-keys').then(r => {
    if (!r.ok) { keyOwnersPromise = null; return new Set(); }
    return new Set(r.data.map(owner => owner.userId));
  });
  return keyOwnersPromise;
}

/** @returns {Promise<{ok: true, data: {userId, matched: string[]}} | {ok: false, message}>} */
export async function connectScheduler(userId, apiKey, pin) {
  const result = await request('/nexon-keys', { method: 'POST', body: { userId, apiKey, pin } });
  if (result.ok) forgetConnections();
  return result;
}

export async function disconnectScheduler(userId, pin) {
  const result = await request('/nexon-keys', { method: 'DELETE', body: { userId, pin } });
  if (result.ok) forgetConnections();
  return result;
}

function forgetConnections() {
  keyOwnersPromise = null;
  schedulerCache.clear();
}
