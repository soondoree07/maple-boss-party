// api/_lib/db.js — 서버 함수 전용 Supabase 접근 (REST)
//
// Vercel 환경변수 SUPABASE_SECRET_KEY(Supabase 의 Secret key)로 부른다.
// 이 키는 RLS 를 건너뛰므로 브라우저 코드에는 절대 두지 않는다.
// nexon_keys 테이블은 정책이 없어서 이 키로만 읽고 쓸 수 있다.

import { ApiError } from './http.js';

const SUPABASE_URL = 'https://plunswlhklpbyihrnxwo.supabase.co';

async function request(path, { method = 'GET', body, prefer } = {}) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new ApiError('NO_DB_KEY', 500, '서버 설정이 아직 끝나지 않았어요. 관리자에게 알려 주세요.');
  const headers = { apikey: secret, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${SUPABASE_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!res.ok) {
    console.error('[db]', method, path, res.status, await res.text().catch(() => ''));
    throw new ApiError('DB_ERROR', 500, '저장소에 연결하지 못했어요. 조금 뒤에 다시 시도해 주세요.');
  }
  // return=minimal 요청은 201 · 204 에 빈 본문이 온다.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** 사이트 비밀번호 확인 (verify_site_pw RPC) */
export async function verifySitePassword(pin) {
  return (await request('/rest/v1/rpc/verify_site_pw', { method: 'POST', body: { p_candidate: String(pin ?? '') } })) === true;
}

/** @returns {Promise<{id, name, user_id} | null>} */
export async function getCharacter(characterId) {
  const rows = await request(`/rest/v1/characters?id=eq.${encodeURIComponent(characterId)}&select=id,name,user_id`);
  return rows[0] || null;
}

/** @returns {Promise<{id, name}[]>} */
export async function getCharactersOfUser(userId) {
  return request(`/rest/v1/characters?user_id=eq.${encodeURIComponent(userId)}&select=id,name`);
}

/** @returns {Promise<{id, name} | null>} */
export async function getUser(userId) {
  const rows = await request(`/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=id,name`);
  return rows[0] || null;
}

/** 유저의 넥슨 키 (없으면 null) */
export async function getUserNexonKey(userId) {
  const rows = await request(`/rest/v1/nexon_keys?user_id=eq.${encodeURIComponent(userId)}&select=api_key`);
  return rows[0]?.api_key || null;
}

/** 키를 등록한 유저 목록 — 키 값은 돌려주지 않는다. @returns {Promise<{userId, updatedAt}[]>} */
export async function listNexonKeyOwners() {
  const rows = await request('/rest/v1/nexon_keys?select=user_id,updated_at');
  return rows.map(r => ({ userId: r.user_id, updatedAt: r.updated_at }));
}

export async function saveUserNexonKey(userId, apiKey) {
  await request('/rest/v1/nexon_keys?on_conflict=user_id', {
    method: 'POST',
    body: { user_id: userId, api_key: apiKey, updated_at: new Date().toISOString() },
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

export async function deleteUserNexonKey(userId) {
  await request(`/rest/v1/nexon_keys?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE', prefer: 'return=minimal' });
}
