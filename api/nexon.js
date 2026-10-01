// api/nexon.js — 넥슨 오픈 API 조회 중계 (Vercel 서버 함수)
//
// 브라우저는 넥슨을 직접 부르지 않고 여기(/api/nexon)를 부른다. 키는 서버에만 있다.
// 정해 둔 조회(ACTIONS)만 통과시키고, 성공한 결과는 Vercel CDN 에 잠깐 캐시해 넥슨 호출 수를 줄인다.
//
// 요청: GET /api/nexon?action=character&name=닉네임
//       GET /api/nexon?action=spec&name=닉네임
//       GET /api/nexon?action=profile&name=닉네임   (유저 캐릭터 창)
//       GET /api/nexon?action=scheduler&characterId=c-xxx
// 응답: 성공 { ok: true, data } / 실패 { ok: false, code, message } (message 는 화면에 그대로 띄우는 문구)

import { ApiError, json, respond } from './_lib/http.js';
import { callNexon, findOcid } from './_lib/nexon-client.js';
import { getCharacter, getUserNexonKey } from './_lib/db.js';
import { loadProfile } from './_lib/profile.js';

const requireParam = (query, key, message) => {
  const value = query.get(key)?.trim();
  if (!value) throw new ApiError('BAD_REQUEST', 400, message);
  return value;
};

// 허용한 조회 목록. 새 조회는 여기에 { cache: 초, run } 을 추가한다.
const ACTIONS = {
  /** 캐릭터 기본 정보: 레벨 · 직업 · 월드 · 이미지 */
  character: {
    cache: 600,
    async run(query) {
      const ocid = await findOcid(requireParam(query, 'name', '닉네임을 적어 주세요.'));
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
  },

  /** 장비 점수 계산용 원본: 최종 스탯 + 장착 장비(넥슨 응답 그대로). 계산은 사이트 쪽에서 한다. */
  spec: {
    cache: 600,
    async run(query) {
      const ocid = await findOcid(requireParam(query, 'name', '닉네임을 적어 주세요.'));
      const [basic, stat, equipment] = await Promise.all([
        callNexon('/character/basic', { ocid }),
        callNexon('/character/stat', { ocid }),
        callNexon('/character/item-equipment', { ocid }),
      ]);
      return { ocid, basic, stat, equipment };
    },
  },

  /** 유저 캐릭터 창: 기본 정보 · 전투력 · 포스 · 유니온 · 챔피언 · 링크 · 어빌리티 · 장비 프리셋 */
  profile: {
    cache: 600,
    run: (query) => loadProfile(requireParam(query, 'name', '닉네임을 적어 주세요.')),
  },

  /**
   * 스케줄러에 등록한 보스 — 그 캐릭터 주인 유저의 키로 부른다(넥슨이 키 주인 계정의 캐릭터만 열어 준다).
   * 보스를 잡으면 바로 바뀌는 값이라 캐시는 짧게 둔다.
   */
  scheduler: {
    cache: 60,
    async run(query) {
      const character = await getCharacter(requireParam(query, 'characterId', '캐릭터를 골라 주세요.'));
      if (!character) throw new ApiError('NO_CHARACTER', 404, '사이트에 없는 캐릭터예요.');
      const userKey = await getUserNexonKey(character.user_id);
      if (!userKey) throw new ApiError('NOT_CONNECTED', 404, '스케줄러가 연결되지 않았어요.');

      const ocid = await findOcid(character.name);
      let state;
      try {
        state = await callNexon('/scheduler/character-state', { ocid }, userKey);
      } catch (e) {
        // 키 주인 계정에 없는 캐릭터면 넥슨이 00003 · 00004 로 거절한다.
        if (e.code === 'OPENAPI00003' || e.code === 'OPENAPI00004') {
          throw new ApiError('NOT_IN_ACCOUNT', 404, '연결한 키의 계정에 이 캐릭터가 없어요.');
        }
        throw e;
      }
      return {
        characterId: character.id,
        clearCount: state.weekly_boss_clear_count,
        clearLimit: state.weekly_boss_clear_limit_count,
        bosses: (state.boss_contents || [])
          .filter(b => b.registration_flag === 'true' && b.cycle !== 'bossDaily')
          .map(b => ({ name: b.content_name, difficulty: b.difficulty, completed: b.complete_flag === 'true' })),
      };
    },
  },
};

export async function GET(request) {
  const query = new URL(request.url).searchParams;
  const action = ACTIONS[query.get('action')];
  if (!action) return json(request, 400, { ok: false, code: 'BAD_ACTION', message: '지원하지 않는 조회예요.' });
  return respond(request, () => action.run(query), action.cache);
}
