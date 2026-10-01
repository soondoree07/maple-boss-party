// api/_lib/http.js — 서버 함수 공용 응답 모양
//
// 모든 응답은 { ok: true, data } 또는 { ok: false, code, message } 이다.
// message 는 화면에 그대로 띄우는 해요체 문구다.
// (_lib 폴더는 밑줄로 시작해서 Vercel 이 주소로 열지 않는다. 다른 함수가 가져다 쓰기만 한다.)

// 로컬 개발 서버(python http.server)에서 배포된 함수를 부를 수 있게 localhost 만 다른 출처 요청을 허용한다.
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** 화면에 띄울 문구를 가진 실패. 서버 함수는 이걸 던지고, 바깥에서 응답으로 바꾼다. */
export class ApiError extends Error {
  constructor(code, status, message) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const SERVER_ERROR_MESSAGE = '잠시 문제가 생겼어요. 조금 뒤에 다시 시도해 주세요.';

export function json(request, status, body, cacheSeconds = 0) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheSeconds > 0 ? `public, s-maxage=${cacheSeconds}` : 'no-store',
    'Vary': 'Origin',
  };
  const origin = request.headers.get('origin');
  if (origin && LOCAL_ORIGIN.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, DELETE';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

/** 다른 출처(localhost)에서 POST · DELETE 를 보내기 전 브라우저가 묻는 사전 요청에 답한다. */
export const preflight = (request) => json(request, 204, null);

/**
 * 처리 함수를 감싸 성공은 { ok: true, data }, 실패는 { ok: false, code, message } 로 바꾼다.
 * @param {Request} request
 * @param {() => Promise<any>} work
 * @param {number} [cacheSeconds] - 성공 응답만 CDN 에 캐시한다
 */
export async function respond(request, work, cacheSeconds = 0) {
  try {
    return json(request, 200, { ok: true, data: await work() }, cacheSeconds);
  } catch (e) {
    if (e instanceof ApiError) return json(request, e.status, { ok: false, code: e.code, message: e.message });
    console.error('[api]', e);
    return json(request, 500, { ok: false, code: 'SERVER_ERROR', message: SERVER_ERROR_MESSAGE });
  }
}
