// api/nexon.js — 넥슨 오픈 API 중계 (Vercel 서버 함수)
//
// 브라우저는 넥슨을 직접 부르지 않고 여기(/api/nexon)를 부른다.
// API 키는 Vercel 환경변수 NEXON_API_KEY 에만 있고 브라우저로 나가지 않는다.
// 정해 둔 조회(ACTIONS)만 통과시키고, 성공한 결과는 Vercel CDN 에 잠깐 캐시해 넥슨 호출 수를 줄인다.
//
// 요청: GET /api/nexon?action=character&name=닉네임
// 응답: 성공 { ok: true, data } / 실패 { ok: false, code, message } (message 는 화면에 그대로 띄우는 문구)

const NEXON_BASE = 'https://open.api.nexon.com/maplestory/v1';
const CACHE_SECONDS = 600; // 넥슨 데이터도 몇 분 단위로 갱신되므로 10분이면 충분하다

// 넥슨 에러 코드 → 화면 문구. 목록에 없는 코드는 UNKNOWN_ERROR 문구를 쓴다.
const NEXON_ERRORS = {
  // 없는 닉네임은 실제로 00004(잘못된 파라미터)로 온다(2026-10-01 확인). 우리 요청 값은 닉네임뿐이라 같은 안내를 쓴다.
  OPENAPI00003: { status: 404, message: '넥슨에서 이 닉네임을 찾지 못했어요. 닉네임을 확인해 주세요.' },
  OPENAPI00004: { status: 404, message: '넥슨에서 이 닉네임을 찾지 못했어요. 닉네임을 확인해 주세요.' },
  OPENAPI00005: { status: 500, message: '넥슨 API 키가 올바르지 않아요. 키 설정을 확인해 주세요.' },
  OPENAPI00007: { status: 429, message: '넥슨 조회가 잠시 몰렸어요. 조금 뒤에 다시 시도해 주세요.' },
  OPENAPI00009: { status: 503, message: '넥슨이 데이터를 준비하고 있어요. 조금 뒤에 다시 시도해 주세요.' },
  OPENAPI00010: { status: 503, message: '게임 점검 중이라 조회할 수 없어요. 점검이 끝나면 다시 시도해 주세요.' },
  OPENAPI00011: { status: 503, message: '넥슨 API 점검 중이에요. 점검이 끝나면 다시 시도해 주세요.' },
};
const UNKNOWN_ERROR = { status: 502, message: '넥슨 조회에 실패했어요. 잠시 후 다시 시도해 주세요.' };

class NexonError extends Error {
  constructor(code, status, message) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** 넥슨 API 한 번 호출. 실패하면 NexonError 를 던진다. */
async function callNexon(path, params) {
  const url = `${NEXON_BASE}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { 'x-nxopen-api-key': process.env.NEXON_API_KEY } });
  const body = await res.json().catch(() => null);
  if (res.ok && body && !body.error) return body;

  const code = body?.error?.name || `HTTP${res.status}`;
  const known = NEXON_ERRORS[code] || UNKNOWN_ERROR;
  throw new NexonError(code, known.status, known.message);
}

/** 닉네임 → ocid(넥슨 캐릭터 식별자) */
async function findOcid(name) {
  const { ocid } = await callNexon('/id', { character_name: name });
  return ocid;
}

// 허용한 조회 목록. 새 조회는 여기에 함수를 하나 추가한다.
const ACTIONS = {
  /** 캐릭터 기본 정보: 레벨 · 직업 · 월드 · 이미지 */
  async character(query) {
    const name = query.get('name')?.trim();
    if (!name) throw new NexonError('BAD_REQUEST', 400, '닉네임을 적어 주세요.');
    const ocid = await findOcid(name);
    const basic = await callNexon('/character/basic', { ocid });
    return {
      ocid,
      name: basic.character_name,
      world: basic.world_name,
      job: basic.character_class,
      level: basic.character_level,
      image: basic.character_image,
    };
  },

  /** 장비 점수 계산용 원본: 최종 스탯 + 장착 장비(넥슨 응답 그대로). 계산은 사이트 쪽에서 한다. */
  async spec(query) {
    const name = query.get('name')?.trim();
    if (!name) throw new NexonError('BAD_REQUEST', 400, '닉네임을 적어 주세요.');
    const ocid = await findOcid(name);
    const [basic, stat, equipment] = await Promise.all([
      callNexon('/character/basic', { ocid }),
      callNexon('/character/stat', { ocid }),
      callNexon('/character/item-equipment', { ocid }),
    ]);
    return { ocid, basic, stat, equipment };
  },
};

// 로컬 개발 서버(python http.server)에서 배포된 중계 함수를 부를 수 있게 localhost 만 다른 출처 요청을 허용한다.
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function json(request, status, body, cacheSeconds = 0) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheSeconds > 0 ? `public, s-maxage=${cacheSeconds}` : 'no-store',
    'Vary': 'Origin',
  };
  const origin = request.headers.get('origin');
  if (origin && LOCAL_ORIGIN.test(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}

export async function GET(request) {
  const query = new URL(request.url).searchParams;
  const action = ACTIONS[query.get('action')];
  if (!action) return json(request, 400, { ok: false, code: 'BAD_ACTION', message: '지원하지 않는 조회예요.' });
  if (!process.env.NEXON_API_KEY) {
    return json(request, 500, { ok: false, code: 'NO_KEY', message: '넥슨 API 키가 아직 설정되지 않았어요.' });
  }

  try {
    return json(request, 200, { ok: true, data: await action(query) }, CACHE_SECONDS);
  } catch (e) {
    if (e instanceof NexonError) return json(request, e.status, { ok: false, code: e.code, message: e.message });
    console.error('[api/nexon]', e);
    return json(request, UNKNOWN_ERROR.status, { ok: false, code: 'SERVER_ERROR', message: UNKNOWN_ERROR.message });
  }
}
