# 메이플 보스 파티 기록 — 진행 상황 (2026-05-04 KST 기준)

## 프로젝트 개요
메이플스토리 본진 보스 파티의 주간/월간 클리어 + 전리품 분배 기록용 1인 정적 사이트. Vanilla HTML + ES Module + localStorage. 빌드 시스템 없음. PLAN.md(`c:/Users/박정혁/Downloads/PLAN.md`)에 기획 전체.

**프로젝트 위치:** `/mnt/c/Users/박정혁/Downloads/maple-boss/` (Windows Downloads 폴더)
**참고용 reference:** `/tmp/reference/maple-boss/` (PLAN.md 옆 zip 추출본)
**png 원본 폴더:** `/home/soondoree07/maple-boss/png/` (사용자가 이미지 추가하는 곳, `cp`로 프로젝트 안 `png/`로 sync 필요)

## 오늘 완료한 것

1. **MVP 골격 (PLAN.md 명세대로) 처음부터 작성**
   - `index.html` / `css/style.css` / `js/{app, data, storage, utils, party, progress, calendar, record, backup}.js` 9개 모듈
   - 다크 테마, Pretendard 폰트 CDN, 모바일 반응형
   - reference보다 개선: dayDiff timezone 버그 fix, ID 12자, 캘린더 viewedMonth 보존, 미래 날짜 가드, ESC 닫기, channelLabel 헬퍼

2. **파티 모달 — 닉네임 입력칸을 6칸 고정 그리드**로 (Enter로 다음 칸 이동, 빈칸은 무시)

3. **파티 카드 우상단 × 삭제 버튼 추가** (호버 노출, confirm으로 기록 N건도 함께 삭제 안내)

4. **데이터 모델 확장**
   - `BossRun.baseReward` 신설 (기본 보상 받은 사람)
   - `crystalOverrides: { bossId: number(억) }` 신설 (사용자가 결정석 가격 수정 가능)

5. **기록 추가 흐름 전면 개편**
   - 채널을 폼에서 빼고 **날짜 모달에 채널 picker 버튼 그리드** (1 / 20세이상 / 2 / 3 / ... / 39, 8열)
   - 같은 날 첫 회차 채널이 정해지면 잠금
   - 같은 날 두 번째 회차부터는 직전 회차의 opener / baseReward 자동 미리 채움
   - 같은 주(주간 보스) / 같은 달(검마)에 이미 클리어한 보스는 드롭다운에서 자동 제외
   - 기본 보상 / 전리품은 비워도 저장 가능 (필수: 보스 + 상자 연 사람만)

6. **전리품 입력 UI 전면 개편**
   - 드롭다운 select → 보스 전리품 **타일 그리드** (이미지 + 이름, 토글 선택)
   - 글자 색이 dark 배경과 합쳐져 안 보이던 select 버그 해결
   - data.js에 `LOOT_IMAGE` 매핑, `LOOT_NAME_COLOR` (유니크 6종 도미넌트 컬러 추출 적용)
   - `getDisplayLootColor(itemName, group)` 헬퍼 — 항목별 override 우선

7. **이미지 sync (`png/` 폴더, 28개)**
   - 해머 5종 / 퍼플코어 8종 / 유니크 6종(오만의 원죄 포함) / 박스·석재·영달포 5종 / 공통 4종 매핑 완료
   - 신마석·연마석·장신망상자만 .webp, 나머지 .png

8. **유니크 글자색 (이미지 도미넌트 컬러 자동 추출)**
   - 황홀한 악몽 `#FE9500`, 근원의 속삭임 `#A500A6`, 죽음의 맹세 `#00FEFD`, 불멸의 유산 `#FFA700`, 창세의 뱃지 `#FB0400`, 오만의 원죄 `#C9B58E`

9. **유피테르(jupiter) BOSS_LOOT에 "오만의 원죄"(unique) 추가** (보스는 여전히 `enabled: false` 상태 — 활성화 여부 미정)

10. **결정석 가격 편집 페이지 (`#/crystals`)**
    - 주간 8보스 카드 2열 + 월간 검마 카드 별도 섹션 + 페이지 하단 저장 버튼 1개
    - 주간/월간 진행도 위젯의 결정석 이미지 클릭 → 페이지로 이동
    - `getEffectiveCrystal(bossId, overrides)` 헬퍼로 분배액 계산에 override 반영
    - 월간 영역에도 "이번 달 1인 분배액" + 월간보스결정석.webp 아이콘 추가 (검마 결정석 ÷ 인원)

11. **분배액 버그 fix**
    - 주간 합계가 검마(월간) 회차나 비활성 보스도 더하던 문제 → `cycle === 'weekly'`만 합산하도록 가드
    - 사용자 환경에서 132.2 떴던 사례: 세렌+대적자+흉성+림보+발드 = 정확히 132.2. 사용자 expected 114.2와 18억 차이. 결정석 가격 수정 페이지를 통해 직접 조정 가능 (실제 결정석 가격이 PLAN.md 기준값과 다를 수 있음 — 자고 와서 확인 후 결정)

## 현재 막힌 지점 / 결정 대기

- **분배액 132.2 vs 114.2 차이의 정체**: 자고 와서 실제 회차 데이터 확인 필요. 백업 JSON으로 export 받아 보면 확정 진단 가능.
- **이미지 미제공 항목 없음**: 모든 27종 + 오만의 원죄까지 이미지 매칭됨.
- **유피테르 enabled 여부**: 오만의 원죄 추가했지만 보스 자체는 `enabled: false` — 활성화 의도면 한 줄만 수정.
- **git init 안 함**: 사용자가 commit/push 요청 명시 안 했고 GitHub Pages 배포는 PLAN.md에만 적힘. 다음 세션에 init / GitHub repo 생성 / Pages 배포 결정 필요.

## 다음 액션 (이어할 작업) — 내일 우선순위

1. **사이트 추가 보완** (사용자가 자고 와서 시각 점검 후 결정 — 채널 picker / 전리품 타일 / 결정석 편집 / 분배액)
2. **결정석 가격 수정 페이지에서 실제 가격 입력** → 132.2 → 114.2 맞추기
3. **사이트 주소 / 도메인 만들기** ★
   - git init → GitHub repo 생성 (`soondoree07/maple-boss` 가능) → Settings → Pages → main / root → `https://soondoree07.github.io/maple-boss/` 자동 배포
   - 또는 커스텀 도메인 (Namecheap / Cloudflare 등에서 구매 → CNAME / A 레코드 → GitHub Pages 연결 → repo `CNAME` 파일에 도메인 한 줄)
   - Pretendard CDN / 모든 path가 상대 경로(`png/`, `css/`, `js/`)라 sub-path 배포에도 그대로 동작
4. **유피테르 활성화 여부 결정** (`enabled: true`로 한 줄 수정)
5. (선택) 디자인 폴리시 — 결정석 카드 호버, 전리품 타일 hover 미세 조정 등

## 환경/구조 메모

- 로컬 서버: `cd /mnt/c/Users/박정혁/Downloads/maple-boss && python3 -m http.server 8000` → `http://localhost:8000`
- localStorage 키: `maple-boss-v1` (단일 JSON: `parties / bossRuns / crystalOverrides`)
- 모든 JS는 `node --check` 통과
- 이미지 sync: `cp /home/soondoree07/maple-boss/png/*.{png,webp} "/mnt/c/Users/박정혁/Downloads/maple-boss/png/"`
- 새 라우트: `#/` / `#/party/:id` / `#/crystals`
- 트리거 키워드: `메이플보스` 또는 `/메이플보스` 입력 시 이 RESUME.md를 가장 먼저 읽음
