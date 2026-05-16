# 메이플 보스 파티 기록 — 진행 상황 (2026-05-17 KST 기준)

## ★ 2026-05-17 — 파티 비밀번호 race condition 수정 (최우선 읽기)
- **증상**: 비번 파티 생성 시 만든 PC는 정답 PIN도 거부 / 다른·재접속 PC는 비번 없이 입장.
- **원인**: `storage.js createParty`가 `parties` INSERT와 `set_party_pw` RPC를 둘 다 fire-and-forget `push()`로 병렬 발사 → RPC가 INSERT보다 먼저 도착하면 `pw_hash` NULL race. (claude.ai 진단 md = `c:/Users/박정혁/Downloads/maple-boss-party-pw-bug-fix.md`, 코드 독립 분석 일치)
- **코드 수정 = 완료·배포됨** (`a6790d9`, Vercel 라이브 `pushSerial` 마커 3회 확인): `pushSerial()` 헬퍼로 `createParty`/`updateParty`를 INSERT→RPC 직렬화. 낙관적 캐시 동기 반환 구조 유지(호출부 무변경). **새로 만드는 비번 파티는 이제 정상.**
- **✅ Supabase SQL 정리 완료 (2026-05-17)** — 사용자가 SQL Editor 실행: `set_party_pw` 원본 복구 + 디버깅 객체(`trg_debug_parties`/`debug_parties_change()`/`debug_log`) 제거 + 테스트 파티 8개 삭제. claude 독립 확인: `parties`=밈곰잉(`0f265ffa5d80`) 1개만·`has_pw=true`·회차21 보존, `debug_log` PGRST205(제거됨).
- **사용자 비번 검증 = 통과 (잘 된다 확인됨, 비번 이슈 종결).**

## ★ 2026-05-17 (후속) — 파티원 추가 일원화 + 새 파티 모달 순서 입력 (배포 완료)
- 파티 선택 카드/파티 상세 strip의 `+ 추가` 칩 제거 → 파티원 추가·삭제는 **파티 설정 페이지(`#/party/:id/settings`)에서만**. `openAddMemberModal` dead code 삭제.
- 새 파티 모달: 파티원 칸 순서 입력 강제 — 직전 칸 비면 다음 칸 잠금(`refreshLocks`), 중간 비우면 뒤 값 자동 위로 당김(`compactSlots`, blur), Enter는 다음 활성 칸으로만.
- 커밋 `788a41a`, Vercel 라이브 `compactSlots` 마커 2회 확인. **다음 세션 첫 액션 = 사용자 새 지시 대기**(진행 중 작업 없음).

## ⛔ 작업 규칙 (사용자 지정 — 반드시 준수)
- **이모지/장식 아이콘을 임의로 쓰지 말 것.** 버튼·라벨·헤더·안내 문구 등에 🎰🎲🎴🏆👆✨🔨 같은 이모지를 내 판단으로 추가하지 않는다. 텍스트만 사용. 아이콘이 꼭 필요하면 먼저 사용자에게 묻는다. (이미 제거: 룰렛 '뽑기', 사다리 '뽑기/다시 뽑기', '사다리 숨김' 커버)

## 프로젝트 개요
메이플스토리 본진 보스 파티의 주간/월간 클리어 + 전리품 분배 기록용 1인 정적 사이트. Vanilla HTML + ES Module + localStorage. 빌드 시스템 없음.

**프로젝트 위치:** `/mnt/c/Users/박정혁/Downloads/maple-boss/` (Windows Downloads 폴더)
**png 원본 폴더:** `/home/soondoree07/maple-boss/png/`
**보스 데이터 원본:** `/home/soondoree07/maple-boss/boss_table.md` (사용자가 준 보스×난이도×결정석×전리품 표)
**배포 URL(공유 링크):** https://maplebossparty.vercel.app  — **Vercel** 호스팅, `git push` 시 자동 재배포. (구: https://soondoree07.github.io/maple-boss-party/ 아직 살아있음·같은 Supabase 데이터)
**Repo:** https://github.com/soondoree07/maple-boss-party (main / root, GitHub Pages 활성)

## 오늘 완료한 것 (2026-05-16 — v0.5: 보스 난이도 모델 전면 도입)

1. **결정석 = 보스×난이도별 고정값** — 사용자 자유 입력(`crystalOverrides`) 폐기. `boss_table.md`의 메소를 억 단위로 변환해 `data.js`에 고정. node 스크립트로 표와 전수 대조 통과
2. **보스 27종** — 기존 9 + 미등록 18 전부 추가. 기존 9보스는 ID 보존(seren/kalos/lotus/baldrix/adversary/kaling/limbo/jupiter/blackmage → 풀네임 매핑)해 기존 BossRun 데이터 그대로 해석
3. **`data.js` 모델 변경** — 보스에 `difficulties: [{ key, crystal, loot }]`. 난이도 키 easy/normal/hard/chaos/extreme + 라벨/정렬 헬퍼. `getEffectiveCrystal(bossId, difficultyKey)`, `getBossLoot(bossId, difficultyKey)`, `resolveDifficultyKey`, `getVisibleBosses`, `bossesByName`, `getLootGroup` 신설. 전리품 그룹은 아이템 이름 기반(`LOOT_GROUP`)으로 단순화 → `getLootDef`/`BOSS_LOOT`/`getEnabledBosses` 제거
4. **전리품 병합 규칙** — 표에 전리품 적힌 (보스,난이도)는 표 값 / **빈칸이면 기존 9보스는 기존 보스별 전리품(v0.4 `BOSS_LOOT`)을 이름 매칭해 채움**(`LEGACY_LOOT` 맵: seren/kalos/adversary/kaling/lotus/limbo/baldrix/jupiter/blackmage) / 신규 18보스 빈칸만 결정석만 (사용자 결정·node로 9보스 전 난이도 loot 존재 검증)
5. **커포 → 커포링 통일** — `LOOT_GROUP`/`LOOT_IMAGE` 키 변경. 이미지 파일은 `png/커포.png` 그대로, 레거시 기록의 `커포`도 같은 이미지/그룹으로 호환
6. **`storage.js`** — `crystalOverrides` 폐기, `bossSettings: { visible, defaults }` 신규(getter/setter + readRaw/import 정규화). 구버전 백업의 crystalOverrides는 무시
7. **결정석 페이지(`#/crystals`) → 보스 설정 페이지로 확장** — 보스마다 가로 행: `[☑ 보이기] [보스명] [기본 난이도 ▼]` + 난이도별 `[결정석 가격 · 전리품 종류]` 조회. 보스 순서 = 사용자 지정(`BOSS_ORDER`) → 나머지 가나다. 저장 시 bossSettings 반영
8. **`record.js` 회차 폼** — 보스 select(보이는 보스만, 사용자 지정 순서) → 그 다음 **난이도 select** 노출. 난이도 초기값 캐스케이드: ① 이 파티가 그 보스 마지막 기록 시 난이도 → ② 보스 설정 기본 난이도 → ③ 첫 난이도. 매 회차 드롭다운 변경 가능. 전리품 타일은 (보스×난이도) 기준. `BossRun.difficulty` 저장. 회차 카드에 난이도 칩 표시
9. **`earnings.js` / `monthly.js`** — 결정석 계산을 `resolveDifficultyKey(boss, run.difficulty, defaults)` 기준으로. 난이도 없는 legacy 회차는 기본설정 → 첫 난이도로 fallback
10. **CSS** — 보스 설정 페이지 가로행 레이아웃(`.boss-setting-card`/`.bsd-row` 등), `.run-difficulty` 칩, `.form-hint`. 구 `.crystal-card*` 규칙 제거
11. **검증** — 전 JS `node --check` 통과 / data.js 표 전수 대조 스크립트 ALL PASS(27보스) / 로컬 서버 주요 자산 200(한글 png 포함)
12. **전리품 그룹·정렬 개편 (후속)** — `에픽` 그룹 신설(연마석·신마석·장신망상자·영달포, 색 `#22C55E`, 기존 default에서 분리). 전리품 표시 순서 = **유니크 → 해머 → 에픽 → 퍼플코어 → 기본**, 그룹 내 순서도 사용자 지정(`LOOT_GROUP_ORDER`/`GROUP_ARRAYS`/`sortLoot`/`lootSortKey`). `getBossLoot` 정렬 반환 → 회차 타일·보스 설정 페이지·회차 카드·월별 사이드 모두 동일 순서. 언컨(유니크) 추가, 익스 칼로스·카링 에테상자 추가 포함

13. **파티 비밀번호 게이트 (디자인 작업 전 선행)** — `Party.pw`(SHA-256 해시, 선택). 새 파티 만들기 모달에 '비밀번호(선택)' 칸. `#/party/:id` 진입 시 pw 있고 미해제면 게이트 화면(입력·검증·목록으로), 정답이면 메모리 `unlockedParties`에 추가 후 상세 진입. **재접속/새로고침하면 다시 입력**(메모리만). 비번 없는 파티(기존 포함)는 그대로 입장. 잠긴 파티 카드에 '비밀번호' 표시. 파티 상세 헤더에 **'비밀번호' 버튼**(설정/변경/해제 모달, `openChangePasswordModal`, 비우고 저장=해제). `utils.sha256Hex`(crypto.subtle + 비보안 fallback). ⚠️ localStorage 기반이라 진짜 보안 아님(개발자도구 우회 가능) — 다인 실보안은 추후 백엔드 필요

## 현재 막힌 지점 / 결정 대기

- **사용자 브라우저 검증 대기** — https://soondoree07.github.io/maple-boss-party/ 푸시 후:
  - `#/crystals` 보스 설정: 보이기 토글 / 기본 난이도 변경 / 난이도별 결정석·전리품 표시 / 저장 후 유지
  - 회차 폼: 보스 선택 후 난이도 드롭다운 노출 / 같은 보스 직전 회차 난이도 자동 선택 / 난이도 바꾸면 전리품 목록 갱신
  - 보이기 끈 보스가 회차 보스 드롭다운에서 사라지는지 (기존 기록·캘린더엔 그대로 보이는지)
  - 주/월 수익 카드가 회차 난이도 결정석으로 합산되는지
  - 기존(난이도 없는) 회차 데이터가 깨지지 않고 fallback 난이도로 표시되는지
- **보스 표시 순서** — ✅ 사용자 지정 완료. `data.js`의 `BOSS_ORDER`(17종: 검마·스우·세렌·칼로스·카링·대적자·흉성·림보·발드릭스·유피테르·진힐라·듄켈·더스크·윌·루시드·가엔슬·데미안) + 나머지 10종 가나다. `bossesInOrder()`/`bossOrderIndex()`로 보스 설정 페이지·회차 드롭다운 정렬

## 다음 액션 (이어할 작업) — ★ 여기부터 재개

> 🟢 **2026-05-16 세션 마감 — "사람들한테 뿌려보고 오류 나면 그때 고치자".**
> **전부 배포 완료, tree clean, 진행 중 작업 없음.** 다음 세션 첫 액션 = **사용자가 공유 후 보고하는 버그/요청 대응** (없으면 새 지시 대기).
> 공유 링크: **https://maplebossparty.vercel.app** (Vercel, push 시 자동배포·캐시 no-store). 백엔드 Supabase `plunswlhklpbyihrnxwo`.
> ⚠️ 사용자 기기에 이미 캐시된 옛 버전은 한 번 캐시 비우기/시크릿창 필요(이후 no-store로 자동). 구 github.io는 Unpublish가 안 먹어 아직 200(같은 새 코드라 무해, 원하면 repo Settings→Pages off 재시도).
> 버그 진단 팁: 라이브 검증은 `curl -s https://maplebossparty.vercel.app/js/<파일> | grep <기대 코드>` 로 서버측부터 확인(과거 "적용 안 됨"은 전부 클라 캐시였음).

> **✅ 1단계(디자인 무드)·2단계(공유 백엔드) 모두 완전 종료 + 호스팅 Vercel 이전 + 모바일 햄버거 최적화 (2026-05-16).** 진행 중 작업 없음 — 다음 세션은 사용자 새 지시 대기.
> 모바일(≤720px): 헤더 액션·룰렛·사다리타기 → 햄버거 드로어(`utils.js isMobile()/buildMobileMenu()`, 렌더 분기·중복 없음·데스크톱 불변, `matchMedia change` 재렌더) `5e23a27`. + input 16px(자동확대 차단)·캘린더 셀 확대·≤480 패딩 축소 `13e3624` + **모바일 캘린더 주 단위 뷰**(목→수 한 주, "N월 N주차"=그 주 일요일 기준, calendar.js `paintWeek()`) `e61c125` + 더블탭 확대 제거(`touch-action: manipulation`) `3410082` + **파티 설정 페이지**(`#/party/:id/settings` 멤버 추가/삭제+비번, party.js `renderPartySettingsPage`, 헤더 "비밀번호"→"파티 설정") + **모바일 룰렛/사다리 별도 페이지**(`#/party/:id/roulette·/ladder`, 햄버거는 이동 버튼, 데스크톱 side-left 유지) `140b88a` + **vercel.json no-store**(인앱 캐시로 업데이트 안 보이던 문제 방지, 서버는 정상이었음) `6954b30` + 룰렛 페이지 세로로 길게·사다리 페이지 한 화면(`.widget-page-main` 스코프) `9b0544c`.
> 롤백 태그: `pre-redesign-2026-05-16`(CSS 토큰화 이전) / `pre-supabase-2026-05-16`(localStorage 버전).

### ✅ 1단계 — 디자인 무드 개편 : 종료
- `style.css` 완전 토큰화(렌더 무변화). 운영 무드 6벌 다크 1~6 연속(`d5a6281`) = 1 Midnight Slate·2 Abyss Teal·3 Crimson Noir·4 Neon Synth·5 Royal Plum·6 Carbon Amber.
- 무드 정책(`d72e4b1`, `js/mood.js`): **파티 선택 화면만 방문마다 랜덤**(`window.__moodRandomId`), **파티 안/게이트/보스설정은 유저 선택 무드**(`localStorage 'maple-mood'`, 기본 1). 헤더 "보스 설정" 왼쪽 **"무드 설정"** 버튼 → `openMoodModal()`(즉시 미리보기, "적용"=저장). 무드 목록 변경 = `index.html` `moods=[…]` + `js/mood.js` `MOOD_IDS`/`MOOD_LABELS` 동기.
- 보안 3건: 진입 가드(`c0f781a`, 공유 딥링크도 항상 파티 선택 페이지) / 비번 4자리 PIN(`d1dc891`, `utils.js pinInput()/isPin()`) / 삭제 가드(아래 P5에서 서버 강제로 승격).

### ✅ 2단계 — 공유 백엔드 전환 : 완전 종료
- **결정 4개:** Supabase / (a)그냥 공유 / boss_settings 파티별(party_id PK) / GitHub Pages 유지.
- **Supabase 프로젝트:** `plunswlhklpbyihrnxwo` (`https://plunswlhklpbyihrnxwo.supabase.co`). 키 = **신규 Publishable** `sb_publishable_…` (`js/config.js`). **legacy API keys Disable 완료** — 노출됐던 service_role·옛 anon JWT 폐기됨.
- **DB:** parties / boss_runs / reservations / boss_settings(파티별). RLS select/insert/update=true, parties delete는 정책 없음(=`delete_party` RPC만). RPC: `verify_party_pw`·`set_party_pw`·`delete_party`(SECURITY DEFINER, anon execute). `pw_hash`는 anon 컬럼권한으로 숨김 + `has_pw` 파생컬럼+트리거.
- **코드(`1363b70`→`07dfb3f`→`5abc320`→`734b323`):** `storage.js` 인메모리 캐시 + `init()` 1회 로드 + Realtime 구독 + 낙관적 write-through(읽기 API 동기 그대로). `boss_settings` `getBossSettings(partyId)`/`setBossSettings(partyId,patch)`, 라우트 `#/crystals/:partyId`. 비번/삭제 = 서버 RPC(클라 sha256 제거, `party.pw`는 불리언 센티넬). `runToRow` numOrNull로 base_reward 빈문자열→null.
- **검증 통과:** 데이터 이전 무손실(파티1·회차21·예약2), 다기기 공유+Realtime, P5 — `pw_hash` 클라 노출 0건·삭제 PIN 서버검증·비번 해제 정상, legacy Disable 후 사이트 정상.

### (선택, 보류) 향후 아이디어
- `utils.js` `sha256Hex`는 이제 미사용(dead) — 정리해도 됨(무해해서 보류).
- run/reservation/boss_settings delete는 아직 anon 직접 허용(비번 대상 아님). 필요 시 RPC화.
- 보스 설정 페이지 검색/필터(27보스), 회차/월별 난이도 표기 일관성.
- 추후 Vercel 이전 시 `config.js`→env 소규모 리팩터(데이터·스키마 무변경).

## 환경/구조 메모

- 로컬 서버: `cd "/mnt/c/Users/박정혁/Downloads/maple-boss" && python3 -m http.server 8000`
- localStorage 키: `maple-boss-v1` → `{ parties, bossRuns, reservations, bossSettings:{visible,defaults} }`
- 이미지 sync: `cp /home/soondoree07/maple-boss/png/*.{png,webp} "/mnt/c/Users/박정혁/Downloads/maple-boss/png/"`
- 라우트: `#/` / `#/party/:id` / `#/crystals/:partyId`(보스 설정) / `#/party/:id/settings`(파티 설정=멤버+비번) / `#/party/:id/roulette` / `#/party/:id/ladder`(모바일 위젯 페이지). 하위 페이지도 비번 게이트 동일 적용. 진입 가드로 새 로드 시 항상 `#/`
- 데이터 모델 v0.5:
  - `BOSSES[].difficulties = [{ key, crystal(억), loot:[이름...] }]` (난이도 오름차순)
  - `BossRun.difficulty` = 그 회차 난이도 key (legacy 미정의 → resolveDifficultyKey fallback)
  - `Party.pw` = SHA-256 해시(선택, 없으면 잠금 없음). 해제는 메모리 `unlockedParties`만(재접속 시 초기화)
  - `bossSettings.visible[id] === false` 면 회차 폼에서 숨김 / `bossSettings.defaults[id]` = 기본 난이도
- **progress.js는 여전히 미사용(dead)** — 이번에 갱신 안 함. import처 없음(브라우저 미로드). 재사용 시 import 수정 필요
- 트리거 키워드: `메이플보스` / `/메이플보스` 입력 시 이 RESUME.md를 가장 먼저 읽음
