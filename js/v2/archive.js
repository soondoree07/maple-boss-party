// v2/archive.js — 과거 기록 (#/archive): 2026-09 개편 전 옛 파티(밈곰잉 · 쭈진) 기록을 달별로 정리해 보여 준다.
//
// 데이터는 data/archive-2026.json — 옛 가격표로 한 번 계산해 고정한 요약(읽기 전용, 서버 데이터와 무관).
// 파티 탭 → 파티 전체 합계 → 달마다 [파티원별 수익 · 잡은 보스 · 드랍템(누가 · 얼마)].

import { el, clear } from '../utils.js';
import { difficultyLabel, getLootImage } from '../data.js';
import { formatEok } from './calc.js';
import { cardDateLabel } from './run-card.js';

const ARCHIVE_URL = 'data/archive-2026.json';
let archivePromise = null; // 한 번만 받아 온다
let currentPartyId = null; // 다시 그려도 고른 탭 유지

const loadArchive = () => (archivePromise ||= fetch(ARCHIVE_URL).then(r => {
  if (!r.ok) throw new Error(`archive ${r.status}`);
  return r.json();
}));

const monthLabel = (month) => {
  const [y, m] = month.split('-').map(Number);
  return `${y}년 ${m}월`;
};

export function renderArchive(container) {
  clear(container);
  container.appendChild(el('header', { className: 'page-header' },
    el('a', { href: '#/', className: 'back-btn' }, '← 기록으로'),
    el('h1', { className: 'page-title' }, '과거 기록'),
    el('div', { className: 'header-actions' }),
  ));
  const main = el('main', { className: 'v2-home' }, el('p', { className: 'form-hint' }, '불러오는 중..'));
  container.appendChild(main);

  loadArchive()
    .then(archive => renderBody(main, archive))
    .catch((e) => {
      console.error('[archive] 불러오기 실패:', e);
      main.replaceChildren(el('p', { className: 'form-hint' }, '과거 기록을 불러오지 못했어요. 새로고침해 주세요.'));
    });
}

function renderBody(main, archive) {
  const party = archive.parties.find(p => p.id === currentPartyId) || archive.parties[0];
  currentPartyId = party.id;

  const tabs = el('div', { className: 'v2-tabs' }, archive.parties.map(p => el('button', {
    className: `v2-tab${p.id === party.id ? ' active' : ''}`, type: 'button',
    onclick: () => { currentPartyId = p.id; renderBody(main, archive); },
  }, p.name)));

  main.replaceChildren(
    el('section', { className: 'v2-section' },
      el('div', { className: 'v2-section-head' },
        el('h2', { className: 'v2-section-title' }, `${party.name} 전체`),
        el('span', { className: 'v2-section-sub' }, `${party.runCount}회 · ${formatEok(party.total)}`),
        tabs,
      ),
      renderMemberBars(party.members_total),
      el('p', { className: 'v2-archive-note' }, '개편 전 기록이에요. 결정석은 그때 가격 기준이고, 더 이상 바뀌지 않아요.'),
    ),
    ...party.months.map(renderMonth),
  );
}

/** 파티원별 수익 막대 (수익 순위와 같은 모양). */
function renderMemberBars(rows) {
  const max = Math.max(...rows.map(r => r.total), 0);
  return el('ol', { className: 'v2-rank-list' }, rows.map((row, i) => el('li', { className: 'v2-rank-row' },
    el('span', { className: 'v2-rank-no' }, String(i + 1)),
    el('span', { className: 'v2-rank-name' }, row.name),
    el('span', { className: 'v2-rank-bar' },
      el('span', { className: 'v2-rank-fill', style: { width: `${max > 0 ? (row.total / max) * 100 : 0}%` } })),
    el('span', { className: 'v2-rank-total' }, formatEok(row.total)),
  )));
}

function renderMonth(month) {
  return el('section', { className: 'v2-section' },
    el('div', { className: 'v2-section-head' },
      el('h2', { className: 'v2-section-title' }, monthLabel(month.month)),
      el('span', { className: 'v2-section-sub' }, `${month.runCount}회 · ${formatEok(month.total)}`),
    ),
    el('h3', { className: 'v2-archive-sub' }, '누가 얼마를 벌었나'),
    renderMemberBars(month.members),
    el('h3', { className: 'v2-archive-sub' }, '잡은 보스'),
    el('div', { className: 'v2-run-members' },
      month.bosses.map(b => el('span', { className: 'member-chip' }, `${b.name} ×${b.count}`))),
    el('h3', { className: 'v2-archive-sub' }, `드랍템 ${month.loot.length}개`),
    month.loot.length === 0
      ? el('p', { className: 'form-hint' }, '이 달엔 기록된 드랍템이 없어요.')
      : el('ul', { className: 'v2-loot-list' }, month.loot.map(renderLoot)),
  );
}

function renderLoot(item) {
  const img = getLootImage(item.item);
  return el('li', { className: 'v2-loot-entry' },
    el('span', { className: 'v2-loot-entry-date' }, cardDateLabel(item.date)),
    el('span', { className: 'v2-loot-entry-item' },
      img ? el('img', { className: 'v2-loot-img', src: img, alt: '' }) : null,
      el('strong', null, item.item),
      el('small', null, `${item.bossName} ${difficultyLabel(item.difficulty)}`),
    ),
    el('span', { className: 'v2-loot-entry-who' }, item.who),
    el('span', { className: 'v2-loot-entry-price' }, formatEok(item.price)),
  );
}
