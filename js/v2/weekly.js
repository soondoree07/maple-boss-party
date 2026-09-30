// v2/weekly.js — 이번 주 캐릭터별 주간 보스 현황 (N/12, 목요일 0시 초기화)

import { el, getWeekRange, shortMD } from '../utils.js';
import { getRuns, getUsers, getCharactersOf } from './store.js';
import { weeklyCounts, monthlyClears, WEEKLY_LIMIT } from './calc.js';

export function renderWeekly() {
  const runs = getRuns();
  const counts = weeklyCounts(runs);
  const monthly = monthlyClears(runs);
  const week = getWeekRange(new Date());

  const groups = getUsers()
    .filter(user => !user.isExternal)
    .map(user => ({ user, characters: getCharactersOf(user.id) }))
    .filter(group => group.characters.length > 0);

  return el('section', { className: 'v2-section' },
    el('div', { className: 'v2-section-head' },
      el('h2', { className: 'v2-section-title' }, '이번 주 현황'),
      el('span', { className: 'v2-section-sub' }, `${shortMD(week.start)} ~ ${shortMD(week.end)} · 목요일에 초기화돼요`),
    ),
    el('div', { className: 'v2-weekly-grid' },
      groups.map(({ user, characters }) => el('div', { className: 'v2-weekly-user' },
        el('div', { className: 'v2-weekly-user-name' }, user.name),
        characters.map(ch => renderCharacterRow(ch, counts.get(ch.id) || 0, monthly.has(ch.id))),
      )),
    ),
  );
}

function renderCharacterRow(character, count, clearedMonthly) {
  const full = count >= WEEKLY_LIMIT;
  return el('div', { className: `v2-weekly-char${full ? ' full' : ''}` },
    el('span', { className: 'v2-weekly-char-name' },
      character.name,
      character.job ? el('small', null, character.job) : null,
    ),
    clearedMonthly ? el('span', { className: 'v2-weekly-monthly', title: '이번 달 월간 보스 완료' }, '월간') : null,
    el('span', { className: 'v2-weekly-bar' },
      el('span', { className: 'v2-weekly-fill', style: { width: `${Math.min(count / WEEKLY_LIMIT, 1) * 100}%` } })),
    el('span', { className: 'v2-weekly-count' }, `${count}/${WEEKLY_LIMIT}`),
  );
}
