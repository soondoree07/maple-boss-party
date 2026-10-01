// v2/run-weeks.js — 메인 "보스 기록"을 주차별로 쌓는다
//
// 메이플 주간 리셋(목요일 0시) 기준으로 카드를 주마다 묶고, 주마다 제목 줄을 단다.
// 제목 = "이번 주 · 10/1 (목) ~ 10/7 (수)" + 그 주 보스 수 · 합계(결정석 + 드랍템, 나누기 전).

import { el, todayStr, parseDateStr, toDateStr, getWeekRange } from '../utils.js';
import { formatEok, runTotal } from './calc.js';
import { renderRunGroupCard, cardDateLabel } from './run-card.js';

/** 카드 묶음들을 주 시작일(weekStart)로 다시 묶는다. 입력 순서(최신 주 먼저)를 그대로 지킨다. */
function groupByWeek(cardGroups) {
  const weeks = new Map();
  for (const group of cardGroups) {
    if (!weeks.has(group.weekStart)) weeks.set(group.weekStart, []);
    weeks.get(group.weekStart).push(group);
  }
  return [...weeks].map(([weekStart, groups]) => ({ weekStart, groups }));
}

const addDays = (dateStr, days) => {
  const d = parseDateStr(dateStr);
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
};

function weekTitle(weekStart) {
  const thisWeek = getWeekRange(parseDateStr(todayStr())).start;
  const range = `${cardDateLabel(weekStart)} ~ ${cardDateLabel(addDays(weekStart, 6))}`;
  if (weekStart === thisWeek) return `이번 주 · ${range}`;
  if (weekStart === addDays(thisWeek, -7)) return `지난주 · ${range}`;
  return range;
}

/**
 * @param {object[]} cardGroups - calc.groupRunsByParty 결과 (보여 줄 만큼 자른 것)
 * @param {object} handlers - run-card 의 onEdit · onDeleted · onAddMore
 */
export function renderRunWeeks(cardGroups, handlers) {
  return el('div', { className: 'v2-run-weeks' }, groupByWeek(cardGroups).map(({ weekStart, groups }) => {
    const runs = groups.flatMap(g => g.runs);
    const total = runs.reduce((sum, run) => sum + runTotal(run), 0);
    return el('section', { className: 'v2-run-week' },
      el('div', { className: 'v2-run-week-head' },
        el('h3', null, weekTitle(weekStart)),
        el('span', null, `보스 ${runs.length}건 · ${formatEok(total)}`),
      ),
      el('div', { className: 'v2-run-list' }, groups.map(group => renderRunGroupCard(group, handlers))),
    );
  }));
}
