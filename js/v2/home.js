// v2/home.js — 메인 화면: 수익 순위 · 이번 달 전리품 · 기록 카드 목록(주차별)

import { el, clear, toast } from '../utils.js';
import { getRuns, reloadAll } from './store.js';
import { renderRanking } from './ranking.js';
import { renderLootHistory } from './loot-history.js';
import { renderRunWeeks } from './run-weeks.js';
import { syncFromScheduler } from './auto-runs.js';
import { groupRunsByParty } from './calc.js';
import { openRunForm } from './run-form.js';
import { openModal } from './modal.js';
import { renderChannelRoulette } from '../roulette.js';
import { createThemeToggle } from '../theme.js';

const PAGE_SIZE = 20; // 카드(같은 주 · 같은 파티 묶음) 기준
let visibleCount = PAGE_SIZE; // "더 보기"로 늘린 개수는 다시 그려도 유지

/**
 * @param {HTMLElement} container
 * @param {() => void} rerender - 기록이 바뀌면 화면 전체를 다시 그린다
 */
export function renderHome(container, rerender) {
  clear(container);

  // 기록은 스케줄러에서만 들어온다. 화면에서는 수정 · 삭제만 한다
  // (보스 기록 목록과 전리품 줄에서 연 카드가 같이 쓴다).
  const cardHandlers = {
    onEdit: (run) => openRunForm(run, rerender),
    onDeleted: rerender,
  };

  container.appendChild(el('header', { className: 'page-header' },
    el('h1', { className: 'page-title' }, '메이플 보스 기록'),
    el('div', { className: 'header-actions' },
      createThemeToggle(),
      el('button', { className: 'icon-btn', type: 'button', onclick: openRouletteModal }, '채널 룰렛'),
      el('a', { href: '#/manage', className: 'icon-btn' }, '유저 관리'),
      syncButton(),
    ),
  ));

  container.appendChild(el('main', { className: 'v2-home' },
    renderRanking(),
    renderLootHistory(cardHandlers),
    renderRunList(rerender, cardHandlers),
    el('footer', { className: 'v2-home-footer' },
      el('a', { href: '#/archive', className: 'btn btn-ghost' }, '과거 기록 보기')),
  ));
}

function renderRunList(rerender, handlers) {
  const runs = getRuns();

  if (runs.length === 0) {
    return el('section', { className: 'v2-section' },
      el('h2', { className: 'v2-section-title' }, '보스 기록'),
      el('div', { className: 'empty-state' },
        el('p', null, '아직 기록이 없어요'),
      ),
    );
  }

  const groups = groupRunsByParty(runs);
  const shown = groups.slice(0, visibleCount);
  return el('section', { className: 'v2-section' },
    el('div', { className: 'v2-section-head' },
      el('h2', { className: 'v2-section-title' }, '보스 기록'),
      el('span', { className: 'v2-section-sub' }, `보스 ${runs.length}건`),
    ),
    renderRunWeeks(shown, handlers),
    groups.length > visibleCount
      ? el('button', {
          className: 'btn btn-ghost v2-more', type: 'button',
          onclick: () => { visibleCount += PAGE_SIZE; rerender(); },
        }, `더 보기 (${groups.length - visibleCount}장 남음)`)
      : null,
  );
}

/**
 * 스케줄러에서 가져오기 — 잡은 보스를 바로 가져오고(10분 제한 없이), 다른 사람이 고친 기록까지 다시 불러온다.
 * 사이트를 열 때도 10분에 한 번 자동으로 가져온다.
 * 다시 불러오면 화면 전체를 새로 그리므로 버튼 상태는 따로 되돌리지 않아도 된다(실패할 때만 되돌린다).
 */
function syncButton() {
  const label = '스케줄러에서 가져오기';
  const button = el('button', {
    className: 'btn btn-primary', type: 'button', title: '스케줄러에서 잡은 보스를 가져오고 기록을 새로 불러와요',
    onclick: async () => {
      button.disabled = true;
      button.textContent = '가져오는 중..';
      await syncFromScheduler({ manual: true });
      try {
        await reloadAll();
      } catch (e) {
        console.error('[home] 기록 다시 불러오기 실패:', e);
        toast('기록을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.', 'err');
        button.disabled = false;
        button.textContent = label;
      }
    },
  }, label);
  return button;
}

function openRouletteModal() {
  const close = openModal({
    title: '채널 룰렛',
    body: el('div', { className: 'v2-roulette' }, renderChannelRoulette()),
    actions: [el('button', { className: 'btn btn-ghost', type: 'button', onclick: () => close() }, '닫기')],
  });
}
