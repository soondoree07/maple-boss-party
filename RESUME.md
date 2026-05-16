# 메이플 보스 파티 기록 — 진행 상황 (2026-05-16 KST 기준)

## ⛔ 작업 규칙 (사용자 지정 — 반드시 준수)
- **이모지/장식 아이콘을 임의로 쓰지 말 것.** 버튼·라벨·헤더·안내 문구 등에 🎰🎲🎴🏆👆✨🔨 같은 이모지를 내 판단으로 추가하지 않는다. 텍스트만 사용. 아이콘이 꼭 필요하면 먼저 사용자에게 묻는다. (이미 제거: 룰렛 '뽑기', 사다리 '뽑기/다시 뽑기', '사다리 숨김' 커버)

## 프로젝트 개요
메이플스토리 본진 보스 파티의 주간/월간 클리어 + 전리품 분배 기록용 1인 정적 사이트. Vanilla HTML + ES Module + localStorage. 빌드 시스템 없음.

**프로젝트 위치:** `/mnt/c/Users/박정혁/Downloads/maple-boss/` (Windows Downloads 폴더)
**png 원본 폴더:** `/home/soondoree07/maple-boss/png/`
**보스 데이터 원본:** `/home/soondoree07/maple-boss/boss_table.md` (사용자가 준 보스×난이도×결정석×전리품 표)
**배포 URL:** https://soondoree07.github.io/maple-boss-party/
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

> **체크포인트(2026-05-16):** **1단계 종료·푸시 `449dd44`** (방문마다 무드 6벌 랜덤). devlog 푸시 완료. tree clean. CSS 토큰화 이전 되돌리기 = git 태그 `pre-redesign-2026-05-16` (백업 파일은 삭제됨).
> **이어할 첫 액션 = 사용자가 Supabase 프로젝트 생성 → URL/키 전달 (또는 "가이드 해줘") → P1 착수.** (2단계 결정 4개 확정 완료, 아래)

### 1단계 — 디자인 무드 개편 : ✅ 종료 (방문마다 6벌 랜덤 확정)
- `style.css` 완전 토큰화(값 1:1 동일·렌더 무변화) 완료.
- **확정 방식 = 단일 무드 고정이 아니라 방문(로드)마다 6벌 중 1벌 랜덤** (사용자 결정). `index.html <head>` 인라인 스크립트(`moods=[1,2,3,4,6,8]` 중 1벌 → `style.css` 뒤 `css/themes/mood-N.css <link>` 동기 append, FOUC 없음). 운영 무드 6벌(전부 다크) = 1 Midnight Slate·2 Abyss Teal·3 Crimson Noir·4 Neon Synth·6 Royal Plum·8 Carbon Amber.
- 정리 완료: app.js `applyRandomBackground`/`BACKGROUNDS` 제거, 임시 전환기 `js/theme-switch.js`·index 임시 script 삭제, 미사용 무드 5(Graphite Mono)·7(Espresso Copper) + `css/style.pre-redesign.css` 백업 삭제. 검증: 로컬서버 자산 전부 200·댕글링 참조 0. 커밋 `449dd44` 푸시.
- (추가 무드 조정이 필요하면 `index.html`의 `moods=[…]` 배열만 바꾸면 됨)

### 2단계 — 공유 백엔드 전환 : 설계+결정 완료, **P1 착수 대기** ← ★ 지금 여기
- 산출: `/mnt/c/Users/박정혁/Downloads/maple-boss/BACKEND_PLAN.md` — `storage.js` **인메모리캐시+Realtime(방식2)**(읽기 동기 유지→화면코드 거의 그대로, app.js 2곳만)·1회 마이그레이션(backup JSON→upsert 멱등)·비번 서버 verify RPC+RLS 승격.
- **결정 4개 확정(2026-05-16):** ① 스택=**Supabase** ② 공개범위=**(a) 그냥 공유**(링크만 알면 누구나 조회·수정, 로그인X) ③ `boss_settings`=**파티별 분리**(party_id PK, 호출부 수정 +0.5~1일) ④ 호스팅=**GitHub Pages 유지**(추후 Vercel 전환 가능·되돌릴 수 있음). 공수 약 3.5~5.5일.
- **다음 = P1: 사용자 Supabase 프로젝트 생성** → Project URL·anon key·service_role key 확보 → 내가 §2 스키마(party 스코프 boss_settings)+§5 verify RPC+§8 RLS SQL 일괄 제공 → P2(storage.js 방식2)→P3(app.js)→P4(마이그레이션, 기존 전역 boss_settings를 모든 파티에 시드)→P5(비번 RPC)→P6(배포·Pages 유지).
- 사용자가 Supabase 프로젝트 만들고 URL/키 주면(또는 "가이드 해줘") P1 착수. ⚠️ "그냥 공유"는 RLS가 유일 방어선 — delete 차단·pw_hash RLS 숨김·backup 유도(§8).

### (선택, 보류) 그 외
- 배포 사이트 검증 한 바퀴(회차 난이도 캐스케이드·보이기 필터·기존 데이터 호환)
- 보스 설정 페이지 검색/필터(27보스라 길어짐), 회차 카드/월별 난이도 표기 일관성

## 환경/구조 메모

- 로컬 서버: `cd "/mnt/c/Users/박정혁/Downloads/maple-boss" && python3 -m http.server 8000`
- localStorage 키: `maple-boss-v1` → `{ parties, bossRuns, reservations, bossSettings:{visible,defaults} }`
- 이미지 sync: `cp /home/soondoree07/maple-boss/png/*.{png,webp} "/mnt/c/Users/박정혁/Downloads/maple-boss/png/"`
- 라우트: `#/` / `#/party/:id` / `#/crystals`(보스 설정·결정석)
- 데이터 모델 v0.5:
  - `BOSSES[].difficulties = [{ key, crystal(억), loot:[이름...] }]` (난이도 오름차순)
  - `BossRun.difficulty` = 그 회차 난이도 key (legacy 미정의 → resolveDifficultyKey fallback)
  - `Party.pw` = SHA-256 해시(선택, 없으면 잠금 없음). 해제는 메모리 `unlockedParties`만(재접속 시 초기화)
  - `bossSettings.visible[id] === false` 면 회차 폼에서 숨김 / `bossSettings.defaults[id]` = 기본 난이도
- **progress.js는 여전히 미사용(dead)** — 이번에 갱신 안 함. import처 없음(브라우저 미로드). 재사용 시 import 수정 필요
- 트리거 키워드: `메이플보스` / `/메이플보스` 입력 시 이 RESUME.md를 가장 먼저 읽음
