// api/_lib/nexon-client.js — 넥슨 오픈 API 호출
//
// 키는 두 종류다.
//   사이트 키(환경변수 NEXON_API_KEY): 닉네임 찾기 · 기본 정보 · 장비처럼 누구 캐릭터든 열리는 조회
//   유저 키(nexon_keys 테이블): 스케줄러처럼 키 주인 계정의 캐릭터만 열리는 조회

import { ApiError } from './http.js';

const NEXON_BASE = 'https://open.api.nexon.com/maplestory/v1';

// 넥슨 에러 코드 → 화면 문구. 목록에 없는 코드는 UNKNOWN_ERROR 문구를 쓴다.
const NEXON_ERRORS = {
  // 없는 닉네임은 실제로 00004(잘못된 파라미터)로 온다(2026-10-01 확인). 우리 요청 값은 닉네임뿐이라 같은 안내를 쓴다.
  OPENAPI00003: { status: 404, message: '넥슨에서 이 닉네임을 찾지 못했어요. 닉네임을 확인해 주세요.' },
  OPENAPI00004: { status: 404, message: '넥슨에서 이 닉네임을 찾지 못했어요. 닉네임을 확인해 주세요.' },
  OPENAPI00005: { status: 400, message: '넥슨 API 키가 올바르지 않아요. 키를 다시 확인해 주세요.' },
  OPENAPI00007: { status: 429, message: '넥슨 조회가 잠시 몰렸어요. 조금 뒤에 다시 시도해 주세요.' },
  OPENAPI00009: { status: 503, message: '넥슨이 데이터를 준비하고 있어요. 조금 뒤에 다시 시도해 주세요.' },
  OPENAPI00010: { status: 503, message: '게임 점검 중이라 조회할 수 없어요. 점검이 끝나면 다시 시도해 주세요.' },
  OPENAPI00011: { status: 503, message: '넥슨 API 점검 중이에요. 점검이 끝나면 다시 시도해 주세요.' },
};
const UNKNOWN_ERROR = { status: 502, message: '넥슨 조회에 실패했어요. 잠시 후 다시 시도해 주세요.' };

/**
 * 넥슨 API 한 번 호출. 실패하면 ApiError(code = 넥슨 에러 코드)를 던진다.
 * @param {string} path - 예: '/character/basic'
 * @param {object} [params]
 * @param {string} [apiKey] - 없으면 사이트 키
 */
export async function callNexon(path, params = {}, apiKey = process.env.NEXON_API_KEY) {
  if (!apiKey) throw new ApiError('NO_KEY', 500, '넥슨 API 키가 아직 설정되지 않았어요.');
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${NEXON_BASE}${path}${query ? `?${query}` : ''}`, { headers: { 'x-nxopen-api-key': apiKey } });
  const body = await res.json().catch(() => null);
  if (res.ok && body && !body.error) return body;

  const code = body?.error?.name || `HTTP${res.status}`;
  const known = NEXON_ERRORS[code] || UNKNOWN_ERROR;
  throw new ApiError(code, known.status, known.message);
}

/** 닉네임 → ocid(넥슨 캐릭터 식별자). 사이트 키로 찾는다. */
export async function findOcid(name) {
  const { ocid } = await callNexon('/id', { character_name: name });
  return ocid;
}
