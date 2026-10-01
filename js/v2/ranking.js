// v2/ranking.js — 유저별 수익 순위 (이번 주 / 이번 달 / 전체)

import { el } from '../utils.js';
import { getRuns, getUsers, getCharacters } from './store.js';
import { runsInPeriod, userTotals, formatEok } from './calc.js';

const PERIODS = [
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'all', label: '전체' },
];

// 다시 그려도(기록 추가 · 실시간 갱신) 보던 기간을 유지한다.
let currentPeriod = 'week';

export function renderRanking() {
  const section = el('section', { className: 'v2-section' });

  const paint = () => {
    const rows = userTotals(runsInPeriod(getRuns(), currentPeriod), getUsers(), getCharacters());
    const top = Math.max(...rows.map(r => r.total), 0);
    const grand = rows.reduce((sum, r) => sum + r.total, 0);

    section.replaceChildren(
      el('div', { className: 'v2-section-head' },
        el('h2', { className: 'v2-section-title' }, '수익 순위'),
        el('div', { className: 'v2-tabs', role: 'tablist' },
          PERIODS.map(p => el('button', {
            className: `v2-tab${p.key === currentPeriod ? ' active' : ''}`,
            type: 'button', role: 'tab', 'aria-selected': p.key === currentPeriod ? 'true' : 'false',
            onclick: () => { currentPeriod = p.key; paint(); },
          }, p.label)),
        ),
      ),
      el('ol', { className: 'v2-rank-list' },
        rows.map(({ user, total }, i) => el('li', { className: 'v2-rank-row' },
          el('span', { className: 'v2-rank-no' }, String(i + 1)),
          el('a', { className: 'v2-rank-name', href: `#/user/${encodeURIComponent(user.id)}`, title: `${user.name} 캐릭터 창 보기` }, user.name),
          el('span', { className: 'v2-rank-bar' },
            el('span', { className: 'v2-rank-fill', style: { width: `${top > 0 ? (total / top) * 100 : 0}%` } })),
          el('span', { className: 'v2-rank-total' }, formatEok(total)),
        )),
      ),
      el('div', { className: 'v2-rank-grand' }, `합계 ${formatEok(grand)}`),
    );
  };

  paint();
  return section;
}
