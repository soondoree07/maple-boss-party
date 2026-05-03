// app.js — 해시 라우팅 + 파티 상세 화면
//
// 라우트:
//   #/                메인 (파티 목록)
//   #/party/:id       파티 상세 (진행도 + 캘린더)

import * as Storage from './storage.js';
import { renderPartyList } from './party.js';
import { renderProgress } from './progress.js';
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

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);

// ── 파티 상세 ─────────────────────────────────────────

function renderPartyDetail(container, party) {
  clear(container);

  // 헤더
  container.appendChild(el('header', { className: 'page-header' },
    el('a', { href: '#/', className: 'back-btn' }, '← 파티 목록'),
    el('h1', { className: 'page-title' }, party.name),
    el('div', { className: 'header-actions' },
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

  // 본문
  const main = el('main', { className: 'party-detail-main' });

  // 파티원 strip
  main.appendChild(el('div', { className: 'party-members-strip' },
    party.members.map(m => el('span', { className: 'member-chip' }, m))
  ));

  // 진행도 위젯
  main.appendChild(renderProgress(party));

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

  main.appendChild(renderCalendar(party, initialDate, handleDateClick, handleMonthChange));

  container.appendChild(main);
}
