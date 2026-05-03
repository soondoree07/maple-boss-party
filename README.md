# 메이플 보스 파티 기록

메이플스토리 본진 파티의 주간/월간 보스 클리어 현황과 전리품 분배를 기록·조회하는 1인용 정적 웹사이트.

Vanilla HTML + ES Module + localStorage. 빌드 시스템 없음, 외부 의존성은 Pretendard 폰트 CDN뿐.

## 기능

- **파티 관리** — 파티 생성/삭제, 한 명의 파티원이 여러 파티에 중복 소속 가능
- **캘린더 뷰** — 메이플 주차에 맞춘 목→수 시작, 보스별 색상 pill, 오늘 강조
- **이번 주 / 이번 달 진행도** — 클리어한 보스만 색상 활성화, 1인 분배액 자동 계산
- **회차 기록 추가/조회** — 보스 선택에 따라 전리품 드롭다운이 동적으로 갈림
- **JSON 백업/복원** — 한 번에 다운로드/업로드

## 시작하기

ES Module은 `file://`에서는 못 돌아가요. 로컬 서버 띄우고 접속:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

`http://localhost:8000` 접속.

### GitHub Pages 배포

이 폴더를 GitHub repo로 push → Settings → Pages → Source: `main` branch / `/ (root)` 선택.
1~2분 후 `https://<username>.github.io/<repo>/` 에서 접근 가능.

## 데이터 저장

- 모든 데이터는 브라우저 **localStorage**에 단일 JSON으로 저장 (key: `maple-boss-v1`)
- 브라우저/기기마다 따로 저장되니, 정기적으로 `↓ 백업` 버튼으로 JSON을 내보내두세요
- 시크릿 모드에서는 탭 닫으면 사라집니다

## 데이터 모델

```js
Party {
  id, name,
  members:   string[],   // 닉네임
  createdAt: ISO string
}

BossRun {
  id, partyId,
  date,                  // "YYYY-MM-DD"
  boss,                  // 'seren' | 'kalos' | ... | 'blackmage'
  channel,               // "1" | "20세이상" | "2" | ... | "39"
  opener,                // 닉네임
  memberSnapshot: string[],  // 그 회차 시점의 파티원 명단 (정산용)
  loot: [
    { item, taker, price }   // price 단위: 억 (number | null)
  ]
}
```

## 주간/월간 리셋

- **주간**: 목요일 0시 (목/금/토/일/월/화/수가 한 주)
- **월간**: 매월 1일 0시
- 리셋되어도 과거 회차는 그대로 보존. 진행도 위젯은 **현재 시점**의 주/월에 해당하는 회차만 집계.
- 1인 분배액 = (이번 주차 회차의 결정석 합) ÷ (현재 파티원 수)

## 도메인 상수 수정

`js/data.js` 한 군데에서 관리.

```js
// 보스 추가/활성화 — 유피테르 켜고 싶으면 enabled: true로 변경
{ id: 'jupiter', name: '유피테르', cycle: 'weekly', crystal: 17.0, enabled: false, color: '#FB923C' },

// 전리품 색상 — 유니크 5종 색상이 정해지면 LOOT_COLORS.unique 변경
LOOT_COLORS = {
  hammer:  '#D4A056',  // 해머류
  purple:  '#9B5DE5',  // 퍼플코어류
  unique:  '#1A1A1A',  // 황홀한 악몽 / 근원의 속삭임 / 죽음의 맹세 / 불멸의 유산 / 창세의 뱃지
  default: '#1A1A1A',
}
```

## 폴더 구조

```
maple-boss/
├── index.html
├── css/style.css
└── js/
    ├── app.js          # 해시 라우팅 + 파티 상세
    ├── data.js         # 보스/채널/전리품 상수
    ├── storage.js      # localStorage CRUD
    ├── utils.js        # 날짜/메소 포맷/DOM 헬퍼
    ├── party.js        # 메인 (파티 목록 + 만들기 모달)
    ├── progress.js     # 이번 주/달 진행도 위젯
    ├── calendar.js     # 월간 캘린더 (목요일 시작)
    ├── record.js       # 날짜 모달 + 기록 추가 폼
    └── backup.js       # JSON 내보내기/불러오기
```

## 추후 확장

- 유피테르 활성화 — `data.js`에서 `enabled: true`로 바꾸면 즉시 드롭다운에 노출 (전리품 채워야 의미 있음)
- 유니크 5종 색상 지정 — `LOOT_COLORS.unique` 또는 항목별 개별 색
- 통계 (멤버별 누적 가치, 자동 정산)
- 다중 디바이스 동기화 (Firebase / GitHub Gist 백업)
