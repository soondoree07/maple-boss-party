// app.js — 해시 라우팅 + 파티 상세 화면
//
// 라우트:
//   #/                메인 (파티 목록)
//   #/party/:id       파티 상세 (진행도 + 캘린더)

import * as Storage from './storage.js';
import { renderPartyList, openAddMemberModal, openChangePasswordModal, confirmAndDeleteParty } from './party.js';
import { renderMonthlyHistory } from './monthly.js';
import { renderChannelRoulette } from './roulette.js';
import { renderLadder } from './ladder.js';
import { renderWeeklyEarnings, renderMonthlyEarnings } from './earnings.js';
import { renderCalendar } from './calendar.js';
import { openDateModal } from './record.js';
import { renderCrystalsPage } from './crystals.js';
import { exportToFile } from './backup.js';
import { el, clear, pinInput, isMobile, buildMobileMenu } from './utils.js';
import { applyRouteMood, openMoodModal } from './mood.js';

const root = document.getElementById('app');

// 파티 상세에서 캘린더가 보고 있는 월 — 모달이 닫히고 재렌더돼도 보존.
// key: partyId, value: Date (그 달의 1일)
const calendarViewByParty = new Map();

// 비밀번호 맞게 입력해 해제한 파티 — 메모리에만 유지(새로고침/재접속하면 다시 입력).
const unlockedParties = new Set();

function route() {
  const hash = location.hash || '#/';

  // 무드: 파티 선택 화면만 랜덤, 그 외(파티/게이트/보스 설정)는 유저 선택값.
  applyRouteMood(hash);

  const crystalsMatch = hash.match(/^#\/crystals\/([A-Za-z0-9_-]+)$/);
  if (crystalsMatch) {
    const cParty = Storage.getParty(crystalsMatch[1]);
    if (!cParty) { location.hash = '#/'; return; }
    renderCrystalsPage(root, cParty);
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
    if (party.pw && !unlockedParties.has(party.id)) {
      renderPartyGate(root, party);
      return;
    }
    renderPartyDetail(root, party);
    return;
  }

  // 기본: 메인
  renderPartyList(root);
}

window.addEventListener('hashchange', route);
// 모바일↔데스크톱 폭 경계를 넘으면 레이아웃(햄버거↔사이드) 재구성.
window.matchMedia('(max-width: 720px)').addEventListener('change', route);
window.addEventListener('DOMContentLoaded', async () => {
  // 공유된 딥링크로 들어와도 항상 파티 선택 페이지에서 시작
  // (비밀번호 게이트 우회·파티 존재 노출 방지). 앱 내 이동은 hashchange라 영향 없음.
  if (location.hash && location.hash !== '#/' && location.hash !== '#') {
    history.replaceState(null, '', location.pathname + location.search + '#/');
  }
  // 공유 백엔드: Supabase에서 전체 1회 로드 후 렌더. 실패해도 빈 화면으로라도 뜨게.
  try {
    await Storage.init();
  } catch (e) {
    console.error('[app] Storage.init 실패:', e);
    alert('서버 연결에 실패했어요. 네트워크를 확인하고 새로고침해주세요.');
  }
  // 다른 사람이 수정 → Realtime → 현재 화면 자동 재렌더.
  Storage.onRemoteChange(route);
  route();
});

// ── 파티 비밀번호 게이트 ──────────────────────────────

function renderPartyGate(container, party) {
  clear(container);

  const input = pinInput('비밀번호 (숫자 4자리)', 'current-password');
  const errMsg = el('div', { className: 'gate-error' });

  const submit = async (e) => {
    const btn = e?.currentTarget;
    if (btn) btn.disabled = true;
    errMsg.textContent = '';
    const ok = !!input.value && await Storage.verifyPartyPw(party.id, input.value);
    if (ok) {
      unlockedParties.add(party.id);
      route();
      return;
    }
    if (btn) btn.disabled = false;
    errMsg.textContent = '비밀번호가 올바르지 않아요';
    input.value = '';
    input.focus();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(e); }
  });

  container.appendChild(el('header', { className: 'page-header' },
    el('a', { href: '#/', className: 'back-btn' }, '← 파티 목록'),
    el('h1', { className: 'page-title' }, party.name),
    el('div', { className: 'header-actions' }),
  ));

  container.appendChild(el('main', { className: 'gate-main' },
    el('div', { className: 'gate-card' },
      el('div', { className: 'gate-title' }, '비밀번호가 설정된 파티예요'),
      el('div', { className: 'gate-sub' }, `"${party.name}"에 들어가려면 숫자 4자리 비밀번호를 입력하세요`),
      input,
      errMsg,
      el('div', { className: 'gate-actions' },
        el('a', { href: '#/', className: 'btn btn-ghost' }, '목록으로'),
        el('button', { className: 'btn btn-primary', type: 'button', onclick: submit }, '입장'),
      ),
    ),
  ));

  setTimeout(() => input.focus(), 50);
}

// ── 파티 상세 ─────────────────────────────────────────

function renderPartyDetail(container, party) {
  clear(container);

  // 헤더 액션 — 데스크톱=헤더 우측 / 모바일=햄버거 드로어
  const actionNodes = [
    el('button', {
      className: 'icon-btn',
      type: 'button',
      title: '무드(테마) 설정 — 미리보기 후 적용',
      onclick: () => openMoodModal(),
    }, '무드 설정'),
    el('a', {
      href: `#/crystals/${party.id}`,
      className: 'icon-btn',
      title: '보스 등장/난이도 설정 · 결정석 표',
    }, '보스 설정'),
    el('button', {
      className: 'icon-btn',
      type: 'button',
      title: '파티 비밀번호 설정/변경/해제',
      onclick: () => openChangePasswordModal(party, (updated) => {
        if (updated.pw) unlockedParties.add(updated.id);
        else unlockedParties.delete(updated.id);
        renderPartyDetail(container, updated);
      }),
    }, '비밀번호'),
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
      onclick: async () => {
        if (await confirmAndDeleteParty(party)) {
          calendarViewByParty.delete(party.id);
          location.hash = '#/';
        }
      },
    }, '삭제'),
  ];

  // 룰렛/사다리 — 데스크톱=좌측 사이드 / 모바일=햄버거 드로어 (같은 노드, 한 곳만 사용)
  const roulette = renderChannelRoulette();
  const ladder   = renderLadder(party);

  const header = el('header', { className: 'page-header' },
    el('a', { href: '#/', className: 'back-btn' }, '← 파티 목록'),
    el('h1', { className: 'page-title' }, party.name),
  );

  const mobile = isMobile();
  if (mobile) {
    const { toggle, drawer } = buildMobileMenu([
      el('div', { className: 'drawer-actions' }, actionNodes),
      roulette,
      ladder,
    ]);
    header.appendChild(toggle);
    container.appendChild(header);
    container.appendChild(drawer);
  } else {
    header.appendChild(el('div', { className: 'header-actions' }, actionNodes));
    container.appendChild(header);
  }

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

  // 좌측 사이드(룰렛+사다리)는 데스크톱만 — 모바일은 위 햄버거 드로어로 이동.
  if (!mobile) {
    main.appendChild(el('aside', { className: 'side-left' }, roulette, ladder));
  }
  main.appendChild(mainCol);
  main.appendChild(renderMonthlyHistory(party));

  container.appendChild(main);
}
