# 메이플 보스 파티 기록 — 진행 상황 (2026-05-07 KST 기준)

## 프로젝트 개요
메이플스토리 본진 보스 파티의 주간/월간 클리어 + 전리품 분배 기록용 1인 정적 사이트. Vanilla HTML + ES Module + localStorage. 빌드 시스템 없음.

**프로젝트 위치:** `/mnt/c/Users/박정혁/Downloads/maple-boss/` (Windows Downloads 폴더)
**png 원본 폴더:** `/home/soondoree07/maple-boss/png/`
**배경 원본 폴더:** `/home/soondoree07/maple-boss/background/`
**배포 URL:** https://soondoree07.github.io/maple-boss-party/
**Repo:** https://github.com/soondoree07/maple-boss-party (main / root, GitHub Pages 활성)

## 오늘 완료한 것 (2026-05-07 — v0.4)

1. **회차별 참여자 선택** — 파티 단위 고정이던 멤버를 회차마다 선택. 같은 날 직전 회차 멤버 자동 미리 채움(없으면 파티 전체). 후보는 파티 생성 시 등록된 멤버만
2. **전리품 분배 체크박스** — 행에 분배 ON/OFF. ON(디폴트)이면 가격 ÷ 회차 인원, OFF면 taker 전액. ON일 때 taker select 비활성화
3. **결정석 분배 자동화** — progress.js·monthly.js 1인 분배액을 Σ(crystal/회차 인원) 합산으로 변경
4. **회차 카드 표시 개선** — 참여자 명단 행 추가, 분배 전리품은 'taker' 자리에 '분배 ÷N' aqua 색
5. **earnings.js 신설** — 파티원별 이번 주(목~수) 수익 카드. 결정석 1/N + 분배 전리품 1/N + 단독 전리품 전액 합산. progress bar 비중 시각화. 캘린더 바로 밑
6. **ladder.js — 1차 단순 셔플 → 2차 SVG 시각화 전면 재작성**. N개 세로줄+랜덤 가로줄 그리고 점 N개가 색상별로 동시에 위에서 내려가며 가로줄에서 휘어지는 rAF 애니메이션(1.7초). 도착 시 O/X 셀 + winner pop + '🏆 X 당첨!'
7. **회차 기록 수정 기능** — 회차 카드에 ✎ 버튼. openRecordForm에 existingRun 파라미터 추가해서 모든 필드 prefill, 저장 시 updateRun. 수정 모드 보스 select은 자기 보스도 옵션에 포함
8. **side-left wrapper** — 룰렛+사다리를 좌측 sticky 컬럼 안에 함께
9. **호환성** — 기존 데이터의 `memberSnapshot`은 그대로 회차 참여자로 해석, 기존 `LootEntry.shared` 미정의는 단독(taker 전액)으로 해석해 기존 동작 보존
10. **사다리 UX 개선 (3차)** — 뽑기 전엔 SVG가 블러+🎴 cover로 가려짐. 뽑기 누르면 공개 + 이름 input들이 클릭 가능한 색상 칩으로 전환. 칩 클릭 시 그 사람만 stroke-dashoffset 애니메이션으로 path가 그려지며 dot 추적, 도착 셀 outline+pop. 다른 이름 클릭 시 이전 trace 정리
11. **파티원 추가** — 두 곳에서: 메인 파티 카드 멤버 그리드 끝 "+ 추가" 칩 + 파티 상세 strip 끝 "+ 추가" 칩. 클릭 시 닉네임 모달(trim/중복 검사) → `updateParty`로 members append → 재렌더
12. **GitHub Pages 푸시** — `0d68c46` / `3aa36fe` / `40b295d` / `221a840` / `9661cf1` / `c45cfec` 커밋

## 현재 막힌 지점 / 결정 대기

- **사용자 브라우저 검증 대기** — https://soondoree07.github.io/maple-boss-party/ 에서 다음 확인:
  - 회차 추가 시 회차 참여자 토글 정상 동작 (직전 회차 멤버 미리 채움 / 빼고 추가)
  - 전리품 분배 체크 ON/OFF 토글 + taker 비활성화/활성화
  - 진행도 위젯 1인 분배액이 회차별 1/N 합산으로 계산되는지
  - 캘린더 밑 "이번 주 파티원별 수익" 카드 — 멤버별 합산이 직관적인지, progress bar 비중
  - **사다리타기** — 뽑기 전 사다리 가려진 상태 / 뽑기 누르면 공개 + 이름이 칩으로 전환 / 이름 클릭 시 그 사람만 path 그려지며 점 따라감 / 도착 셀 강조
  - **파티원 추가** — strip 끝 "+ 추가" 칩 → 모달 → 저장 후 회차 폼/sidebar 등에서 새 멤버가 자동 노출
  - **회차 카드 ✎ 수정** — 모든 필드 prefill 정상 / 저장 시 같은 회차 ID 유지 / 보스 변경 시에만 loot 비워지는지
  - 기존 데이터(있다면) 그대로 잘 표시되는지
- **유피테르 활성화 여부** — 오만의 원죄 추가됐지만 `enabled: false` 유지 중

## 다음 액션 (이어할 작업)

1. **사용자 검증 후 발견된 이슈 수정** (기능별 토글 동작·계산 정확도·UX)
2. **유피테르 활성화 결정** — 한 줄 (`enabled: true`) 또는 보류
3. (선택) 분배 OFF 전리품에 대해서도 회차 참여자 명단으로 taker 후보를 제한하는 검증을 강화
4. (선택) 사다리타기에 당첨 인원수 옵션 추가 (현재 1명 고정)
5. (선택) earnings 섹션을 월간 누적도 보여주는 토글 추가

## 환경/구조 메모

- 로컬 서버: `cd "/mnt/c/Users/박정혁/Downloads/maple-boss" && python3 -m http.server 8000`
- localStorage 키: `maple-boss-v1` (`parties / bossRuns / reservations / crystalOverrides`)
- 모든 JS는 `node --check` 통과
- 이미지 sync: `cp /home/soondoree07/maple-boss/png/*.{png,webp} "/mnt/c/Users/박정혁/Downloads/maple-boss/png/"`
- 배경 sync: `cp /home/soondoree07/maple-boss/background/*.png "/mnt/c/Users/박정혁/Downloads/maple-boss/background/"`
- 라우트: `#/` / `#/party/:id` / `#/crystals`
- 모듈 13개: `app / data / storage / utils / party / progress / calendar / record / monthly / earnings / roulette / ladder / crystals / backup`
- 데이터 모델 v0.4:
  - `BossRun.memberSnapshot` = 회차 실제 참여자 (파티 전체일 수도 일부일 수도)
  - `LootEntry.shared` = true(N등분) / false(taker 전액) / undefined(legacy → 단독)
- 트리거 키워드: `메이플보스` 또는 `/메이플보스` 입력 시 이 RESUME.md를 가장 먼저 읽음
