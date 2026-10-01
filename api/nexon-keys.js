// api/nexon-keys.js — 유저별 넥슨 키(스케줄러 연결) 등록 · 해제 · 상태
//
// GET    /api/nexon-keys                         → 키를 등록한 유저 목록 [{ userId, updatedAt }] (키 값은 안 준다)
// POST   /api/nexon-keys  { userId, apiKey, pin } → 키 확인 후 저장, 이 키로 열리는 그 유저 캐릭터 이름을 돌려준다
// DELETE /api/nexon-keys  { userId, pin }         → 키 삭제
//
// 등록 · 해제는 사이트 비밀번호(pin)를 다시 확인한다. 주소만 아는 사람이 남의 키를 덮어쓰지 못하게.

import { ApiError, respond, preflight } from './_lib/http.js';
import { callNexon } from './_lib/nexon-client.js';
import {
  verifySitePassword, getUser, getCharactersOfUser,
  listNexonKeyOwners, saveUserNexonKey, deleteUserNexonKey,
} from './_lib/db.js';

async function readBody(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') throw new ApiError('BAD_REQUEST', 400, '요청 내용을 읽지 못했어요. 다시 시도해 주세요.');
  return body;
}

async function requireSitePassword(pin) {
  if (!(await verifySitePassword(pin))) throw new ApiError('WRONG_PIN', 403, '사이트 비밀번호가 맞지 않아요.');
}

async function requireUser(userId) {
  const user = userId ? await getUser(String(userId)) : null;
  if (!user) throw new ApiError('NO_USER', 404, '사이트에 없는 유저예요.');
  return user;
}

/** 이 키 계정에 있는 캐릭터 이름들 (넥슨 character/list — 키 주인 계정 전체) */
async function accountCharacterNames(apiKey) {
  try {
    const { account_list: accounts = [] } = await callNexon('/character/list', {}, apiKey);
    return new Set(accounts.flatMap(a => (a.character_list || []).map(c => c.character_name)));
  } catch (e) {
    if (e.code === 'OPENAPI00005' || e.code === 'OPENAPI00002') {
      throw new ApiError('BAD_NEXON_KEY', 400, '넥슨 API 키가 올바르지 않아요. 복사한 키를 다시 확인해 주세요.');
    }
    throw e;
  }
}

export const OPTIONS = preflight;

export const GET = (request) => respond(request, listNexonKeyOwners);

export const POST = (request) => respond(request, async () => {
  const { userId, apiKey, pin } = await readBody(request);
  await requireSitePassword(pin);
  const user = await requireUser(userId);
  const key = String(apiKey ?? '').trim();
  if (!key) throw new ApiError('BAD_REQUEST', 400, '넥슨 API 키를 붙여 넣어 주세요.');

  const inAccount = await accountCharacterNames(key);
  const matched = (await getCharactersOfUser(user.id)).map(c => c.name).filter(name => inAccount.has(name));
  if (matched.length === 0) {
    throw new ApiError('NO_MATCH', 400, `이 키의 계정에 ${user.name}님의 캐릭터가 없어요. 본인 넥슨 계정으로 발급한 키인지 확인해 주세요.`);
  }
  await saveUserNexonKey(user.id, key);
  return { userId: user.id, matched };
});

export const DELETE = (request) => respond(request, async () => {
  const { userId, pin } = await readBody(request);
  await requireSitePassword(pin);
  const user = await requireUser(userId);
  await deleteUserNexonKey(user.id);
  return { userId: user.id };
});
