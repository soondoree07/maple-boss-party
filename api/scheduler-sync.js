// api/scheduler-sync.js — 스케줄러에서 잡은 보스를 자동 기록으로 가져온다
//
// POST /api/scheduler-sync → { ok: true, data: { created: [{ id, boss, difficulty, characterId }], failures } }
// 사이트를 열 때(10분에 한 번까지)와 메인의 "스케줄러에서 가져오기" 버튼이 부른다.
// 같은 기록은 고정 id 라 여러 번 불러도 한 번만 생긴다. 규칙은 _lib/scheduler-sync.js.

import { respond, preflight } from './_lib/http.js';
import { syncSchedulers } from './_lib/scheduler-sync.js';

export const OPTIONS = preflight;
export const POST = (request) => respond(request, syncSchedulers);
