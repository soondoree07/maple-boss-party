// app.js — 해시 라우팅 + 파티 상세 화면
//
// 라우트:
//   #/                메인 (파티 목록)
//   #/party/:id       파티 상세 (진행도 + 캘린더)

import * as Storage from './storage.js';
import { renderPartyList, openAddMemberModal } from './party.js';
import { renderMonthlyHistory } from './monthly.js';
import { renderChannelRoulette } from './roulette.js';
import { renderLadder } from './ladder.js';
import { renderWeeklyEarnings, renderMonthlyEarnings } from './earnings.js';
import { renderCalendar } from './calendar.js';
import { openDateModal } from './record.js';
import { renderCrystalsPage } from './crystals.js';
import { exportToFile } from './backup.js';
import { el, clear } from './utils.js';

const root = document.getElementById('app');

// 파티 상세에서 캘린더가 보고 있는 월 — 모달이 닫히고 재렌더돼도 보존.
// key: partyId, value: Date (그 달의 1일)
const calendarViewByParty = new Map();

function route() {
  const hash = location.hash || '#/';

  if (hash === '#/crystals') {
    renderCrystalsPage(root);
    return;
  }

  const partyMatch = hash.match(/^#\/party\/([A-Za-z0-9_-]+)$/);
  if (partyMatch) {
    const partyId = partyMatch[1];
    const party = Storage.getParty(partyId);
    if (!party) {
      // 없는 파티면 메인으로 되돌려보냄.
      location.hash = '#/';
      return;
    }
    renderPartyDetail(root, party);
    return;
  }

  // 기본: 메인
  renderPartyList(root);
}

// 배경 — 6장 중 1장을 페이지 로드마다 랜덤으로.
// CSS variable의 url()은 사용되는 stylesheet 위치(/css/)를 base로 풀린다.
// 그래서 ../background/ 로 prefix해야 /background/ 로 풀림.
const BACKGROUNDS = [
  '리버스시티.png',
  '별이삼켜지는심해.png',
  '빛이마지막으로닿는곳.png',
  '산호숲가는길.png',
  '생명의동굴.png',
  '정령의나무가있는곳.png',
];
function applyRandomBackground() {
  const pick = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
  document.documentElement.style.setProperty('--bg-image', `url("../background/${pick}")`);
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', () => {
  applyRandomBackground();
  route();
});

// ── 파티 상세 ─────────────────────────────────────────

function renderPartyDetail(container, party) {
  clear(container);

  // 헤더
  container.appendChild(el('header', { className: 'page-header' },
    el('a', { href: '#/', className: 'back-btn' }, '← 파티 목록'),
    el('h1', { className: 'page-title' }, party.name),
    el('div', { className: 'header-actions' },
      el('a', {
        href: '#/crystals',
        className: 'icon-btn',
        title: '보스 등장/난이도 설정 · 결정석 표',
      }, '보스 설정'),
      el('button', {
        className: 'icon-btn',
        type: 'button',
        title: '백업',
        onclick: () => exportToFile(),
      }, '↓ 백업'),
      el('button', {
        className: 'icon-btn icon-btn-danger',
        type: 'button',
        title: '파티 삭제',
        onclick: () => {
          if (confirm(`"${party.name}" 파티를 삭제하면 관련 보스 기록도 모두 사라져요. 정말 삭제할까요?`)) {
            Storage.deleteParty(party.id);
            calendarViewByParty.delete(party.id);
            location.hash = '#/';
          }
        },
      }, '삭제'),
    ),
  ));

  // 본문 — 파티원 strip은 grid 양쪽에 걸침, 그 아래로 좌(메인)/우(월별 사이드바) 2컬럼
  const main = el('main', { className: 'party-detail-main' });

  // 파티원 strip (양 컬럼 위에 걸쳐서 — 좌/우 첫 카드가 같은 y에서 시작하도록).
  // 끝에 "+ 추가" 칩 — 클릭 시 인라인 모달.
  main.appendChild(el('div', { className: 'party-members-strip' },
    party.members.map(m => el('span', { className: 'member-chip' }, m)),
    el('button', {
      className: 'member-chip member-chip-add',
      type: 'button',
      title: '파티원 추가',
      onclick: () => openAddMemberModal(party, (updated) => {
        renderPartyDetail(container, updated);
      }),
    }, '+ 추가'),
  ));

  const mainCol = el('div', { className: 'party-detail-mainCol' });

  // 위쪽: 이번 주 / 이번 달 수익 카드.
  mainCol.appendChild(renderWeeklyEarnings(party));
  mainCol.appendChild(renderMonthlyEarnings(party));

  // 캘린더 — 보고 있던 월 복원, 없으면 오늘 기준.
  const initialDate = calendarViewByParty.get(party.id) || new Date();

  const handleDateClick = (dateStr) => {
    openDateModal({
      party,
      dateStr,
      onChanged: () => {
        // 회차가 바뀐 경우에만 재렌더.
        const fresh = Storage.getParty(party.id);
        if (!fresh) { location.hash = '#/'; return; }
        renderPartyDetail(container, fresh);
      },
    });
  };

  const handleMonthChange = (date) => {
    calendarViewByParty.set(party.id, date);
  };

  mainCol.appendChild(renderCalendar(party, initialDate, handleDateClick, handleMonthChange));

  // 좌측 사이드: 룰렛 + 사다리타기
  const sideLeft = el('aside', { className: 'side-left' },
    renderChannelRoulette(),
    renderLadder(party),
  );

  main.appendChild(sideLeft);
  main.appendChild(mainCol);
  main.appendChild(renderMonthlyHistory(party));

  container.appendChild(main);
}
