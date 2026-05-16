# 공유 백엔드 전환 설계 (2단계)

> 목적: **누가 수정하면 다른 사람 컴퓨터에서도, 내 컴퓨터에서도 보이게** 한다.
> 현재 `localStorage`는 브라우저마다 완전히 격리돼 있어 이 구조로는 절대 불가능 — 데이터를
> "한 곳(서버 DB)"에 두고 모두가 같은 DB를 읽고 쓰는 구조로 바꿔야 한다.
> 프런트(화면/클래스/JS 로직)는 거의 그대로 재사용한다. 바뀌는 핵심은 **`storage.js` 하나**.

---

## 0. 지금 구조 요약 (왜 못 하는지)

- 순수 정적 사이트(빌드 없음) + ES Module + 해시 라우팅. GitHub Pages 배포.
- `storage.js`가 `localStorage['maple-boss-v1']` = `{ parties, bossRuns, reservations, bossSettings }`를
  **동기**로 읽고 쓴다. 모든 화면 코드가 "읽으면 바로 값이 나온다"고 가정.
- 파티 비밀번호는 localStorage 안 SHA-256 → **진짜 보안 아님**(개발자도구로 우회 가능, 브라우저별로
  데이터가 따로 놂).

→ 데이터가 각자 브라우저에만 있으니 공유가 원천적으로 안 됨. **DB가 있어야 한다.**

---

## 1. 스택 비교 · 추천

| 항목 | A. Supabase ★추천 | B. Vercel + Postgres(Neon) | C. Firebase Firestore |
|---|---|---|---|
| 데이터 모델 | Postgres(관계형) — 현 구조와 1:1 | Postgres — 동일 | NoSQL 문서 — 재설계 필요 |
| 실시간 반영 | **기본 제공**(Realtime 구독, 새로고침 없이 즉시) | 별도 폴링/서드파티 필요 | 기본 제공(리스너) |
| 서버 운영 | 불필요(정적사이트에서 직접 호출) | 서버리스 함수 + 빌드 필요 | 불필요 |
| 현 배포 유지 | GitHub Pages 그대로 가능 | Vercel로 이전 + `/api` 추가 | GitHub Pages 그대로 가능 |
| 인증 | 내장(Auth + RLS 행단위 권한) | 직접 구현 | 내장(Auth + 규칙) |
| 마이그레이션 | 백업 JSON → upsert 스크립트 | 동일 | 문서 재구조화 필요 |
| 이 앱에 드는 작업량 | **가장 적음** | 중간(빌드·API층 신설) | 중간(스키마 재설계) |
| 단점 | anon key 공개 → RLS로 보호 설계 필수, 무료티어 1주 미사용 시 일시정지 | 실시간이 약함, glue 코드 많음 | 관계형 집계(주간/월간 정산) 로직 부담·읽기량 비용 |

**추천: A. Supabase.**
- 관계형이라 `parties / bossRuns / reservations / bossSettings`를 거의 그대로 테이블화 → **데이터 모델 재설계 0**.
- Realtime 구독으로 "남이 수정하면 즉시 모두에게 보임"이 추가 인프라 없이 충족(요구사항 정확히 일치).
- 서버를 안 띄워도 됨 → 지금 GitHub Pages 배포 그대로 유지 가능(원하면 Vercel 정적 배포로 옮겨도 됨).
- 가짜 비밀번호를 실제 서버 검증/권한(RLS)으로 승격할 길이 있음.

> Vercel을 꼭 쓰고 싶다면: Vercel에 **정적 그대로** 올리고 DB만 Supabase를 호출하는 조합도 가능
> (Vercel = 호스팅, Supabase = DB/실시간/인증). "Vercel 배포" 요구와 충돌하지 않음.

---

## 2. 데이터 모델 (Postgres)

```sql
-- 파티
create table parties (
  id          text primary key,            -- 기존 Party.id 그대로 (문자열 ID 유지 → 마이그레이션 무손실)
  name        text not null,
  members     jsonb not null default '[]', -- 문자열 배열
  created_at  timestamptz not null default now(),
  pw_hash     text                          -- 선택. NULL = 잠금 없음. 클라가 직접 SELECT 못 하게 RLS로 가림
);

-- 보스 회차
create table boss_runs (
  id              text primary key,
  party_id        text not null references parties(id) on delete cascade,
  date            date not null,
  boss            text not null,
  difficulty      text,                     -- v0.5 난이도 key (legacy 미정의 허용 → NULL)
  channel         text,
  opener          text,
  base_reward     numeric,
  member_snapshot jsonb not null default '[]',
  loot            jsonb not null default '[]',  -- [{item,taker,price,shared}]
  created_at      timestamptz not null default now()
);
create index on boss_runs (party_id, date);

-- 예약
create table reservations (
  id        text primary key,
  party_id  text not null references parties(id) on delete cascade,
  -- 기존 reservation 형태 그대로 (date/time 등)
  payload   jsonb not null
);
create index on reservations (party_id);

-- 보스 설정 — ★결정 ③ = 파티별 분리 (party_id PK)
create table boss_settings (
  party_id  text primary key references parties(id) on delete cascade,
  visible   jsonb not null default '{}',
  defaults  jsonb not null default '{}'
);
```

> **✅ 결정 ① = 파티별 분리.** `boss_settings`는 `party_id` PK. 코드 영향(+0.5~1일):
> `storage.js`의 `getBossSettings()/setBossSettings()`가 **partyId 인자**를 받도록 바꾸고,
> 호출부 `crystals.js`(보스 설정 페이지)·`record.js`(난이도 기본값 캐스케이드)·관련 렌더가
> 현재 파티 컨텍스트를 넘기도록 수정. 마이그레이션 시 기존 전역 1행을 모든 기존 파티에 복제(시드).

---

## 3. `storage.js` async 전환 범위 — 핵심 결정

지금 모든 화면이 `Storage.getParty()` 처럼 **동기 호출 후 바로 렌더**한다. 두 가지 길:

### 방식 1 — 전면 async (호출부 전부 await 전파)
- `Storage.*` 전부 `Promise` 반환. `app.js route()` / `renderPartyDetail` / `record.js` / `earnings.js` /
  `monthly.js` / `calendar.js` / `crystals.js` / `party.js`의 호출부를 전부 `await`로 바꿈.
- 깔끔하지만 **수정 지점이 매우 넓다**(map/loop 안 동기 읽기 다수). 회귀 위험 큼.

### 방식 2 — 인메모리 캐시 + 실시간 동기화  ★추천
- `storage.js`에 **인메모리 스토어** 유지. 읽기 API는 **지금처럼 동기**로 그 캐시를 반환 →
  **화면 코드 거의 그대로**.
- 새 함수 `await Storage.init()` : 앱 시작 시 Supabase에서 전체 1회 로드 → 캐시 채움.
- 쓰기 함수(`createParty`/`addBossRun`/`updateParty`/`deleteParty`/`setBossSettings` …):
  ① 캐시 즉시 갱신(낙관적) → 즉시 재렌더 ② 백그라운드로 Supabase에 비동기 반영(실패 시 롤백·토스트).
- Supabase **Realtime 구독**: 다른 사람이 바꾸면 변경분이 푸시 → 캐시 갱신 → `route()` 재호출.
  이게 "남이 수정 → 내 화면에도 자동 반영"을 만든다.
- `app.js` 변경은 **딱 두 군데**: `DOMContentLoaded`를 `async`로 바꿔 `await Storage.init()` 후 `route()`,
  그리고 realtime 콜백에서 `route()`(또는 현재 화면만 부분 재렌더).

> 결론: **방식 2**가 수정 면적이 훨씬 작고(주로 storage.js + app.js 2곳), 실시간 다인 동기화까지
> 공짜로 얻는다. 방식 1은 비추천.

---

## 4. 마이그레이션 (1회성, 기존 데이터 보존)

- 실제 데이터는 지금 **사용자 브라우저 localStorage에만** 있음.
- 절차: ① 앱의 기존 **백업 내보내기**(backup.js, 이미 있음)로 JSON 덤프 →
  ② 제공 스크립트 `scripts/import-to-supabase.mjs`(service_role 키, 로컬 1회 실행)가
  `parties/boss_runs/reservations/boss_settings`를 **id 기준 upsert**(멱등 — 재실행 안전).
- ID가 이미 고유 문자열이라 무손실. 끝나면 사이트는 DB만 바라봄(localStorage는 백업 용도로만).

---

## 5. 비밀번호 → 서버 검증으로 승격

현재(클라 SHA-256)는 우회 가능. 데이터 공개 범위를 먼저 정해야 함:

> **✅ 결정 ② = (a) 그냥 공유.** 누구나 링크로 조회·수정. 비번은 "실수 방지용 약한 잠금"으로
> 유지하되 `pw_hash`는 RLS로 클라 SELECT 차단 + `verify_party_pw` RPC 서버검증으로 승격.
> 인증(로그인) 없음. anon key 공개 + 느슨한 RLS = 앱 UI 우회 대량변조 이론상 가능 →
> 완화책은 §8 운영 가드 참조.

- (a)면: `pw_hash`를 RLS로 **클라가 SELECT 못 하게 숨기고**, Postgres 함수
  `verify_party_pw(party_id, candidate)`(SECURITY DEFINER)로 **서버에서만 비교**해 boolean 반환.
  해시 추출 불가 → 지금보다 확실히 강함(여전히 완전 인증은 아님, 정직히 명시).
- (b)면: Supabase Auth(매직링크/익명+업그레이드) + `party_members(user_id, party_id)` + RLS로
  멤버만 read/write. 가장 강력하지만 로그인 UX·정책 작업이 추가됨(+1~2일).

권장: **우선 (a)+서버 verify RPC**로 출시(저비용·실효 향상), 진짜 프라이버시가 필요해지면 (b)로 단계 확장.

> 정직한 한 줄: anon key는 공개되므로 **RLS가 유일한 방어선**이다. "그냥 공유"면 (a)로 충분,
> "남이 못 보게"면 (b)까지 가야 하며 비번만으로는 부족하다.

---

## 6. 작업 분해 · 예상 규모

| 단계 | 내용 | 규모 |
|---|---|---|
| P0 | ✅ 결정 완료: Supabase / (a)그냥공유 / boss_settings 파티별 / Pages 유지 | 완료 |
| P1 | Supabase 프로젝트 + 위 스키마 + RLS + verify RPC | ½일 |
| P2 | `storage.js` 방식 2 재작성(init 로드·인메모리·write-through·realtime) | 1일 |
| P3 | `app.js` init/await + realtime 재렌더 배선, 쓰기 경로 오류처리 점검 | ½일 |
| P4 | 1회성 마이그레이션 스크립트 작성·실행 | ½일 |
| P5 | 비번 서버 verify RPC + 해시 가리는 RLS  (또는 P5' 풀 인증 = +1~2일) | ½일 |
| P6 | 배포(Pages 유지 또는 Vercel 정적) + anon key 설정 + 다기기 스모크 | ½일 |
| | **합계(방식2+Supabase+RPC, boss_settings 파티별 +0.5~1일 포함)** | **약 3.5~5.5일** |

---

## 7. 결정 완료 (2026-05-16) — 다음 = P1

| # | 항목 | 결정 |
|---|---|---|
| ① 스택 | **Supabase** (Postgres + Realtime + RLS, 서버 불필요) |
| ② 공개범위 | **(a) 그냥 공유** — 링크만 알면 누구나 조회·수정, 로그인 없음 |
| ③ boss_settings | **파티별 분리** (party_id PK, 호출부 수정 +0.5~1일) |
| ④ 호스팅 | **GitHub Pages 유지** — Supabase는 서버 불필요. 추후 Vercel 전환 = `config.js`→env 소규모 리팩터, 데이터/스키마 무변경·되돌리기 가능 |

**즉시 다음 단계 = P1 (Supabase 프로젝트 생성).** 사용자 Supabase 계정 필요:
1. supabase.com 에서 프로젝트 1개 생성(무료 티어) → **Project URL · anon key · service_role key** 확보
2. SQL editor에 §2 스키마(party 스코프 boss_settings 포함) + §5 `verify_party_pw` RPC + §8 RLS 붙여넣기 (이 문서대로 내가 SQL 일괄 제공)
3. 이후 P2(`storage.js` 방식2) → P3(`app.js`) → P4(마이그레이션) → P5(비번 RPC) → P6(배포) 순으로 내가 구현

→ 사용자가 Supabase 프로젝트를 만들고 URL/키를 주면(또는 "가이드 해줘" 하면 단계별 안내) 그때 P1부터 착수.

---

## 8. "그냥 공유" 운영 가드 (RLS가 유일한 방어선)

- RLS: select/insert/update 허용, **delete는 차단**(또는 service_role만) — 실수·악의 대량삭제 방지
- `parties.pw_hash`는 RLS로 클라 SELECT 불가, `verify_party_pw(party_id, candidate)` SECURITY DEFINER로만 검증
- 정기 backup export 유도(기존 `backup.js`) + abuse 감지 시 anon key 회전
- 정직한 한 줄: 완전 인증 아님. "남이 못 보게"가 필요해지면 (b) Supabase Auth로 단계 확장(+1~2일)
