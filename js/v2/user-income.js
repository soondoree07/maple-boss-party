// v2/user-income.js — 유저 캐릭터 창 위쪽: 이번 주 수익 · 파티별 수익(이번 주 / 이번 달)

import { el, todayStr, parseDateStr, getWeekRange } from '../utils.js';
import { formatEok } from './calc.js';
import { memberLabels } from './members.js';
import { cardDateLabel } from './run-card.js';
import { weekIncome, partyIncome } from './user-stats.js';

const PERIODS = [{ key: 'week', label: '이번 주' }, { key: 'month', label: '이번 달' }];
let currentPeriod = 'week'; // 다시 그려도 보던 탭 유지

export function renderWeekIncome(user) {
  const { total, byCharacter } = weekIncome(user.id);
  const week = getWeekRange(parseDateStr(todayStr()));
  return el('section', { className: 'v2-section v2-user-card' },
    el('div', { className: 'v2-section-head' },
      el('h2', { className: 'v2-section-title' }, '이번 주 수익'),
      el('span', { className: 'v2-section-sub' }, `${cardDateLabel(week.start)} ~ ${cardDateLabel(week.end)}`)),
    el('p', { className: 'v2-user-big' }, formatEok(total)),
    el('div', { className: 'v2-user-rows' }, byCharacter.map(({ character, total: eok }) => el('div', { className: 'v2-user-row' },
      el('span', null, character.name, character.job ? el('small', null, character.job) : null),
      el('strong', null, formatEok(eok))))),
  );
}

export function renderPartyIncome(user) {
  const section = el('section', { className: 'v2-section v2-user-card' });
  const paint = () => {
    const parties = partyIncome(user.id, currentPeriod);
    section.replaceChildren(
      el('div', { className: 'v2-section-head' },
        el('h2', { className: 'v2-section-title' }, '파티별 수익'),
        el('div', { className: 'v2-tabs', role: 'tablist' }, PERIODS.map(p => el('button', {
          className: `v2-tab${p.key === currentPeriod ? ' active' : ''}`, type: 'button', role: 'tab',
          'aria-selected': p.key === currentPeriod ? 'true' : 'false',
          onclick: () => { currentPeriod = p.key; paint(); },
        }, p.label)))),
      parties.length === 0
        ? el('p', { className: 'form-hint' }, `${PERIODS.find(p => p.key === currentPeriod).label}엔 아직 기록이 없어요. 보스를 잡고 기록하면 여기에 모여요.`)
        : el('div', { className: 'v2-user-rows' }, parties.map(renderParty)),
    );
  };
  paint();
  return section;
}

function renderParty(party) {
  return el('div', { className: 'v2-user-party' },
    el('div', { className: 'v2-user-party-head' },
      el('strong', null, memberLabels(party.characterIds).join(' · ')),
      el('strong', null, formatEok(party.total))),
    party.drops.length
      ? el('div', { className: 'v2-user-chips' }, party.drops.map(name => el('span', { className: 'v2-user-chip' }, name)))
      : el('span', { className: 'v2-user-empty' }, '드랍템 없음'),
  );
}
