# 메이플 보스 파티 기록 — 진행 상황 (2026-05-04 KST 기준)

## 프로젝트 개요
메이플스토리 본진 보스 파티의 주간/월간 클리어 + 전리품 분배 기록용 1인 정적 사이트. Vanilla HTML + ES Module + localStorage. 빌드 시스템 없음.

**프로젝트 위치:** `/mnt/c/Users/박정혁/Downloads/maple-boss/` (Windows Downloads 폴더)
**png 원본 폴더:** `/home/soondoree07/maple-boss/png/`
**배경 원본 폴더:** `/home/soondoree07/maple-boss/background/`
**배포 URL:** https://soondoree07.github.io/maple-boss-party/
**Repo:** https://github.com/soondoree07/maple-boss-party (main / root, GitHub Pages 활성)

## 오늘 완료한 것 (2026-05-04, 어제 MVP 가동분 포함)

1. **MVP 9개 모듈 + 결정석 편집 페이지** (`#/crystals`, `crystalOverrides`)
2. **파티 모달 6칸 닉네임 그리드 / 카드 × 삭제**
3. **채널 picker 그리드 / 같은 주·달 보스 자동 제외 / opener·baseReward 자동 미리 채움**
4. **전리품 입력 타일 그리드** (이미지+이름 토글) + 유니크 6종 도미넌트 컬러
5. **이미지 27+1종 sync**, 유피테르에 "오만의 원죄"(보스는 `enabled: false`)
6. **분배액 cycle 가드 fix** (월간 검마가 주간 합에 더해지던 문제)
7. **결정석 가격 편집 페이지** — 저장 시 `alert` 제거 후 `history.back()`
8. **결정석 아이콘 22→30px**, summary baseline→center, 분배액 0건은 `—` 대신 `0억`
9. **월별 누적 사이드바 신설** (`monthly.js`) — 이번/-1/-2 카드 3개. 인당 총 결정석 + 전리품 행 (이미지+이름+나누기 전 가격)
10. **파티원 strip이 grid 양쪽에 걸쳐서** 좌우 첫 카드가 같은 y
11. **미래 날짜 예약 기능** (`storage.reservations`) — 시간만 입력, 하루 1건, 캘린더에 골드 점선 pill
12. **배경 이미지 6장 + aqua 팔레트 전환** — 페이지 로드마다 랜덤. 골드 → 시안 (#4ee5f5). 카드 backdrop-blur. CSS variable url() base 함정 해결 (`../background/` prefix 통일)
13. **GitHub Pages 배포** — `soondoree07/maple-boss-party` repo로 push, Pages API 활성화. `0aae021`, `3bfd313` 커밋
14. **채널 룰렛 사이드 카드** (`roulette.js`) — 좌측 220px sticky. 슬롯 윈도우 + 시안/보라 그라데이션 "🎰 뽑기" 버튼. 1.1초 동안 굴러가다 채널 1개로 멈춤. 파티 상세 grid를 220 / 1fr / 320 3컬럼으로
15. **회차 카드 전리품 행에도 이미지 표시** (`record.renderRunCard`) — grid를 `24px 1fr auto auto`로 늘리고 `loot-img` 추가, fallback 박스 처리

## 현재 막힌 지점 / 결정 대기

- **GitHub Pages 한글 파일명 서빙 확인 대기** — 첫 빌드 끝나면 https://soondoree07.github.io/maple-boss-party/ 접속해서 배경 이미지(`background/리버스시티.png` 등)와 전리품 이미지(`png/해머(얼굴장식).png` 등)가 정상 표시되는지 사용자 확인 필요. 안 보이면 영문 alias로 rename + LOOT_IMAGE/BACKGROUNDS 매핑 변경
- **유피테르 활성화 여부** — 오만의 원죄 추가됐지만 `enabled: false` 유지
- **이전 `maple-boss` repo (어제 push분)** — GitHub에 그대로 남아있음. 정리 원하면 `gh repo delete soondoree07/maple-boss --yes` (사용자 직접 결정)

## 다음 액션 (이어할 작업)

1. **배포 사이트 동작 확인** — https://soondoree07.github.io/maple-boss-party/ 에 접속해서 한글 이미지 서빙·룰렛·예약·월별 사이드 동작 검증
2. **유피테르 활성화 결정** — 한 줄 (`enabled: true`) 또는 보류
3. (선택) 해머/박스/석재 fallback 시각 개선
4. (선택) 룰렛 결과를 회차 기록 폼에 자동 채우기 등 연계 기능

## 환경/구조 메모

- 로컬 서버: `cd "/mnt/c/Users/박정혁/Downloads/maple-boss" && python3 -m http.server 8000`
- localStorage 키: `maple-boss-v1` (`parties / bossRuns / reservations / crystalOverrides`)
- 모든 JS는 `node --check` 통과
- 이미지 sync: `cp /home/soondoree07/maple-boss/png/*.{png,webp} "/mnt/c/Users/박정혁/Downloads/maple-boss/png/"`
- 배경 sync: `cp /home/soondoree07/maple-boss/background/*.png "/mnt/c/Users/박정혁/Downloads/maple-boss/background/"`
- 라우트: `#/` / `#/party/:id` / `#/crystals`
- 모듈 11개: `app / data / storage / utils / party / progress / calendar / record / monthly / roulette / crystals / backup`
- 트리거 키워드: `메이플보스` 또는 `/메이플보스` 입력 시 이 RESUME.md를 가장 먼저 읽음
