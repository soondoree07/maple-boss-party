// v2/loot-history.js — 월별 전리품 (메인: 이번 달만 / "전체 보기": 달마다 누가 뭘 얼마에)
//
// 기록(run)마다 들어 있는 드랍템을 한 줄씩 펼쳐 달별로 묶는다.
// 한 줄 = 날짜 · 아이템 · 보스 · 누가(독식이면 그 사람, 분배면 파티원 전체) · 가격(나누기 전).

import { el } from '../utils.js';
import { getBoss, difficultyLabel, getLootImage } from '../data.js';
import { getRuns } from './store.js';
import { formatEok, lootPrice } from './calc.js';
import { characterName, memberLabels } from './members.js';
import { cardDateLabel } from './run-card.js';
import { openModal } from './modal.js';

/** 모든 기록의 드랍템을 최신순 한 줄씩. */
function lootEntries(runs) {
  const entries = [];
  for (const run of runs) { // getRuns() 는 이미 최신순
    for (const item of run.loot) entries.push({ run, item, month: run.date.slice(0, 7) });
  }
  return entries;
}

/** 드랍템 줄들을 달별로 묶는다 (최신 달 먼저). */
function groupByMonth(entries) {
  const months = new Map();
  for (const entry of entries) {
    if (!months.has(entry.month)) months.set(entry.month, []);
    months.get(entry.month).push(entry);
  }
  return [...months].map(([month, list]) => ({ month, list, total: list.reduce((s, e) => s + lootPrice(e.item), 0) }));
}

const monthLabel = (month) => {
  const [y, m] = month.split('-').map(Number);
  return `${y}년 ${m}월`;
};

/** 누가 가져갔는지. 독식이면 그 사람, 분배면 파티원 전체. */
function whoLabel({ run, item }) {
  if (item.mode === 'solo') return `${characterName(item.takerCharacterId)} 독식`;
  return `${memberLabels(run.characterIds).join(' · ')} 분배`;
}

function renderEntry(entry) {
  const { run, item } = entry;
  const img = getLootImage(item.name);
  const boss = getBoss(run.boss);
  return el('li', { className: 'v2-loot-entry' },
    el('span', { className: 'v2-loot-entry-date' }, cardDateLabel(run.date)),
    el('span', { className: 'v2-loot-entry-item' },
      img ? el('img', { className: 'v2-loot-img', src: img, alt: '' }) : null,
      el('strong', null, item.name),
      el('small', null, `${boss?.name || run.boss} ${difficultyLabel(run.difficulty)}`),
    ),
    el('span', { className: 'v2-loot-entry-who' }, whoLabel(entry)),
    el('span', { className: 'v2-loot-entry-price' }, formatEok(lootPrice(item))),
  );
}

const renderList = (list) => el('ul', { className: 'v2-loot-list' }, list.map(renderEntry));

/** 메인 화면 칸 — 이번 달 전리품. */
export function renderLootHistory() {
  const months = groupByMonth(lootEntries(getRuns()));
  const thisMonth = todayMonth();
  const current = months.find(m => m.month === thisMonth);

  return el('section', { className: 'v2-section' },
    el('div', { className: 'v2-section-head' },
      el('h2', { className: 'v2-section-title' }, `${monthLabel(thisMonth)} 전리품`),
      el('span', { className: 'v2-section-sub' }, current ? `${current.list.length}개 · ${formatEok(current.total)}` : ''),
      months.length > 0
        ? el('button', { className: 'btn btn-ghost btn-mini', type: 'button', onclick: () => openAllMonths(months) }, '전체 보기')
        : null,
    ),
    current
      ? renderList(current.list)
      : el('p', { className: 'form-hint' }, '이번 달엔 아직 드랍템이 없어요. 기록에 드랍템을 넣으면 여기에 모여요.'),
  );
}

function todayMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "전체 보기" 창 — 달마다 합계와 목록. */
function openAllMonths(months) {
  const close = openModal({
    title: '월별 전리품',
    wide: true,
    body: el('div', { className: 'v2-loot-months' },
      months.map(({ month, list, total }) => el('section', { className: 'v2-loot-month' },
        el('div', { className: 'v2-loot-month-head' },
          el('h3', null, monthLabel(month)),
          el('span', null, `${list.length}개 · ${formatEok(total)}`),
        ),
        renderList(list),
      )),
    ),
    actions: [el('button', { className: 'btn btn-ghost', type: 'button', onclick: () => close() }, '닫기')],
  });
}
