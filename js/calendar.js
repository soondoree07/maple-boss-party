// calendar.js — 월간 캘린더 (목요일 시작)
//
// PLAN.md 6.4 — 메이플 주차에 맞춰 요일 헤더는 목/금/토/일/월/화/수.
// 토·일은 빨간색 강조. 셀 클릭 시 onDateClick(dateStr) 호출.

import * as Storage from './storage.js';
import { getBoss } from './data.js';
import { toDateStr, todayStr, el, clear } from './utils.js';

/**
 * @param {{id: string, members: string[]}} party
 * @param {Date} viewDate - 어느 달을 표시할지
 * @param {(dateStr: string) => void} onDateClick
 * @param {(date: Date) => void} [onMonthChange] - 월 이동 시 부모에게 통지 (옵션)
 */
export function renderCalendar(party, viewDate, onDateClick, onMonthChange) {
  const wrap = el('section', { className: 'calendar-section' });

  // 내부에서 월 이동 시 자기 자신을 교체.
  const repaint = (newDate) => {
    onMonthChange?.(newDate);
    const next = renderCalendar(party, newDate, onDateClick, onMonthChange);
    wrap.replaceWith(next);
  };

  paintCalendar(wrap, party, viewDate, onDateClick, repaint);
  return wrap;
}

function paintCalendar(wrap, party, viewDate, onDateClick, repaint) {
  clear(wrap);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // ── 헤더 ──
  wrap.appendChild(el('div', { className: 'calendar-header' },
    el('button', {
      className: 'cal-nav-btn',
      type: 'button',
      title: '이전 달',
      onclick: () => repaint(new Date(year, month - 1, 1)),
    }, '←'),
    el('h2', { className: 'calendar-title' }, `${year}년 ${month + 1}월`),
    el('button', {
      className: 'cal-nav-btn',
      type: 'button',
      title: '다음 달',
      onclick: () => repaint(new Date(year, month + 1, 1)),
    }, '→'),
  ));

  // ── 요일 헤더 (목/금/토/일/월/화/수) ──
  // 토·일은 weekend 클래스로 빨강 강조.
  const dayLabels = ['목', '금', '토', '일', '월', '화', '수'];
  const weekendIdx = new Set([2, 3]); // 토(idx 2), 일(idx 3)
  wrap.appendChild(el('div', { className: 'calendar-weekdays' },
    dayLabels.map((d, i) => el('div', {
      className: 'weekday' + (weekendIdx.has(i) ? ' weekend' : ''),
    }, d)),
  ));

  // ── 6주 = 42칸 그리드 ──
  // 캘린더 시작일 = 그 달 1일이 속한 주의 목요일.
  const firstOfMonth = new Date(year, month, 1);
  const firstDay     = firstOfMonth.getDay();         // 일=0..토=6
  const daysFromThu  = (firstDay - 4 + 7) % 7;
  const calStart     = new Date(year, month, 1 - daysFromThu);

  const allRuns    = Storage.getRunsByParty(party.id);
  const runsByDate = groupByDate(allRuns);

  const allRes    = Storage.getReservationsByParty(party.id);
  const resByDate = groupByDate(allRes);

  const grid = el('div', { className: 'calendar-grid' });
  const todayKey = todayStr();

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(calStart.getFullYear(), calStart.getMonth(), calStart.getDate() + i);
    const cellKey  = toDateStr(cellDate);
    const dow      = cellDate.getDay();
    const runsHere = runsByDate[cellKey] || [];
    const resHere  = resByDate[cellKey] || [];

    grid.appendChild(buildCell({
      cellDate,
      cellKey,
      dow,
      runsHere,
      resHere,
      isOtherMonth: cellDate.getMonth() !== month,
      isToday:      cellKey === todayKey,
      onClick:      () => onDateClick(cellKey),
    }));
  }
  wrap.appendChild(grid);
}

function buildCell({ cellDate, cellKey, dow, runsHere, resHere, isOtherMonth, isToday, onClick }) {
  const cls = ['calendar-cell'];
  if (isOtherMonth)             cls.push('other-month');
  if (isToday)                  cls.push('today');
  if (dow === 0 || dow === 6)   cls.push('weekend');
  if (runsHere.length > 0)      cls.push('has-runs');
  if (resHere && resHere.length > 0) cls.push('has-reservation');

  const MAX_PILLS = 4;
  const visiblePills = runsHere.slice(0, MAX_PILLS);
  const overflow     = runsHere.length - visiblePills.length;

  const reservation = resHere && resHere[0];

  return el('div', {
    className: cls.join(' '),
    onclick: onClick,
    role: 'button',
    'aria-label': `${cellKey} 보기`,
    dataset: { date: cellKey },
  },
    el('div', { className: 'cell-date' }, String(cellDate.getDate())),
    el('div', { className: 'cell-runs' },
      visiblePills.map(run => {
        const b = getBoss(run.boss);
        return el('div', {
          className: 'run-pill',
          style: { '--pill-color': b ? b.color : '#666' },
          title: b ? b.name : run.boss,
        }, b ? b.name : '?');
      }),
      overflow > 0 ? el('div', { className: 'run-more' }, `+${overflow}`) : null,
      reservation ? el('div', {
        className: 'reservation-pill',
        title: `예약: ${reservation.time}`,
      }, reservation.time) : null,
    ),
  );
}

function groupByDate(runs) {
  const map = Object.create(null);
  for (const r of runs) {
    if (!map[r.date]) map[r.date] = [];
    map[r.date].push(r);
  }
  return map;
}
