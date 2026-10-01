// v2/nexon.js — 넥슨 오픈 API 조회 (사이트 쪽 도우미)
//
// 넥슨을 직접 부르지 않고 우리 중계 함수(/api/nexon)를 부른다. 키는 서버에만 있다.
// 결과는 { ok: true, data } 또는 { ok: false, message } 로 돌려준다 — message 는 화면에 그대로 띄운다.
//
// 로컬(python http.server)에는 /api 가 없으므로, 로컬에서는 배포된 사이트의 중계 함수를 부른다.

const IS_LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
const API_BASE = IS_LOCAL ? 'https://maplebossparty.vercel.app/api/nexon' : '/api/nexon';

const OFFLINE_MESSAGE = '넥슨 조회에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';

const profileCache = new Map(); // 닉네임 → 성공한 조회 결과 (새로고침 전까지)

async function request(params) {
  try {
    const res = await fetch(`${API_BASE}?${new URLSearchParams(params)}`);
    return await res.json();
  } catch (e) {
    console.error('[nexon] 요청 실패:', e);
    return { ok: false, message: OFFLINE_MESSAGE };
  }
}

/**
 * 닉네임으로 캐릭터 기본 정보를 찾는다.
 * @param {string} name
 * @returns {Promise<{ok: true, data: {ocid, name, world, job, level, image}} | {ok: false, message: string}>}
 */
export async function fetchCharacterProfile(name) {
  const key = name.trim();
  if (profileCache.has(key)) return profileCache.get(key);
  const result = await request({ action: 'character', name: key });
  if (result.ok) profileCache.set(key, result);
  return result;
}
