// v2/home.js — 메인 화면: 수익 순위 · 이번 달 전리품 · 기록 카드 목록

import { el, clear } from '../utils.js';
import { getRuns } from './store.js';
import { renderRanking } from './ranking.js';
import { renderLootHistory } from './loot-history.js';
import { renderRunGroupCard } from './run-card.js';
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

  const addRun = () => openRunForm(null, rerender);

  container.appendChild(el('header', { className: 'page-header' },
    el('h1', { className: 'page-title' }, '메이플 보스 기록'),
    el('div', { className: 'header-actions' },
      createThemeToggle(),
      el('button', { className: 'icon-btn', type: 'button', onclick: openRouletteModal }, '채널 룰렛'),
      el('a', { href: '#/manage', className: 'icon-btn' }, '유저 관리'),
      el('button', { className: 'btn btn-primary', type: 'button', onclick: addRun }, '+ 기록 추가'),
    ),
  ));

  container.appendChild(el('main', { className: 'v2-home' },
    renderRanking(),
    renderLootHistory(),
    renderRunList(rerender, addRun),
    el('footer', { className: 'v2-home-footer' },
      el('a', { href: '#/archive', className: 'btn btn-ghost' }, '과거 기록 보기'),
      // 넥슨 오픈 API 이용 조건: 서비스에 출처 문구를 그대로 표기해야 한다.
      el('small', { className: 'v2-api-credit' }, 'Data based on NEXON Open API')),
  ));
}

function renderRunList(rerender, addRun) {
  const runs = getRuns();
  const handlers = {
    onEdit: (run) => openRunForm(run, rerender),
    onDeleted: rerender,
    onAddMore: (characterIds, date) => openRunForm(null, rerender, { characterIds, date }),
  };

  if (runs.length === 0) {
    return el('section', { className: 'v2-section' },
      el('h2', { className: 'v2-section-title' }, '보스 기록'),
      el('div', { className: 'empty-state' },
        el('p', null, '아직 기록이 없어요'),
        el('p', { className: 'empty-state-sub' }, '보스를 잡으면 첫 기록을 남겨 보세요'),
        el('button', { className: 'btn btn-primary', type: 'button', onclick: addRun }, '+ 기록 추가'),
      ),
    );
  }

  const groups = groupRunsByParty(runs);
  const shown = groups.slice(0, visibleCount);
  return el('section', { className: 'v2-section' },
    el('div', { className: 'v2-section-head' },
      el('h2', { className: 'v2-section-title' }, '보스 기록'),
      el('span', { className: 'v2-section-sub' }, `보스 ${runs.length}건`),
      el('button', { className: 'btn btn-primary btn-mini', type: 'button', onclick: addRun }, '+ 기록 추가'),
    ),
    el('div', { className: 'v2-run-list' }, shown.map(group => renderRunGroupCard(group, handlers))),
    groups.length > visibleCount
      ? el('button', {
          className: 'btn btn-ghost v2-more', type: 'button',
          onclick: () => { visibleCount += PAGE_SIZE; rerender(); },
        }, `더 보기 (${groups.length - visibleCount}장 남음)`)
      : null,
  );
}

function openRouletteModal() {
  const close = openModal({
    title: '채널 룰렛',
    body: el('div', { className: 'v2-roulette' }, renderChannelRoulette()),
    actions: [el('button', { className: 'btn btn-ghost', type: 'button', onclick: () => close() }, '닫기')],
  });
}
