// v2/run-filter.js — 메인 "보스 기록"을 캐릭터로 거르기
//
// "캐릭터 고르기" 버튼 → 모달에서 캐릭터 여러 명을 고른다(외부 인원 기타는 고르지 않는다).
// 모달 아래 파티 스위치(기본 끔, "기록 보기"를 누를 때 반영):
//   끔 = 고른 캐릭터가 한 명이라도 들어간 기록 전부 (잉짱 · 혁쥬 → 잉짱 솔플, 혁쥬 솔플, 잉짱혁쥬 파티)
//   켬 = 파티원이 딱 고른 캐릭터들뿐인 기록만 (잉짱 · 혁쥬 → 잉짱혁쥬 파티만, 다른 사람이 끼면 빠진다)
// 고른 상태는 화면을 다시 그려도 유지한다(새로고침하면 처음으로).

import { el } from '../utils.js';
import { openModal } from './modal.js';
import { createCharacterPicker } from './character-picker.js';
import { characterName } from './members.js';
import { getCharacter } from './store.js';

const filter = { characterIds: [], partyOnly: false };

// 고른 뒤 지워진 캐릭터는 조건에서 뺀다(남겨 두면 파티를 켰을 때 아무 기록도 안 맞는다)
const pruneDeleted = () => { filter.characterIds = filter.characterIds.filter(id => getCharacter(id)); };

export const isFiltering = () => { pruneDeleted(); return filter.characterIds.length > 0; };

/** 지금 고른 조건에 맞는 기록만 남긴다. 아무도 안 골랐으면 그대로. */
export function filterRuns(runs) {
  if (!isFiltering()) return runs;
  const chosen = new Set(filter.characterIds);
  if (!filter.partyOnly) return runs.filter(run => run.characterIds.some(id => chosen.has(id)));
  return runs.filter(run => {
    const members = new Set(run.characterIds);
    return members.size === chosen.size && [...chosen].every(id => members.has(id));
  });
}


/**
 * "보스 기록" 제목과 주차 목록 사이의 거르기 줄.
 * @param {() => void} onChange - 조건이 바뀌면 목록을 다시 그린다
 */
export function renderRunFilterBar(onChange) {
  const names = filter.characterIds.map(characterName).join(' · ');
  const pickLabel = !isFiltering() ? '캐릭터 고르기' : filter.partyOnly ? `${names} 파티` : names;

  return el('div', { className: 'v2-run-filter' },
    el('button', {
      className: `v2-filter-pick${isFiltering() ? ' active' : ''}`, type: 'button',
      onclick: () => openPickerModal(onChange),
    }, pickLabel),
    isFiltering()
      ? el('button', {
          className: 'btn-mini', type: 'button',
          onclick: () => { filter.characterIds = []; filter.partyOnly = false; onChange(); },
        }, '전체 보기')
      : null,
  );
}

/** 모달 안 파티 스위치. 바로 거르지 않고 "기록 보기"를 누를 때 반영한다. */
function createPartySwitch() {
  const input = el('input', { type: 'checkbox', role: 'switch', checked: filter.partyOnly });
  const node = el('label', { className: 'v2-switch' },
    el('span', { className: 'v2-switch-text' },
      el('strong', null, '파티'),
      el('small', null, '켜면 고른 캐릭터끼리만 간 기록이 보여요'),
    ),
    input,
    el('span', { className: 'v2-switch-track', 'aria-hidden': 'true' }),
  );
  return { node, isOn: () => input.checked };
}

function openPickerModal(onChange) {
  const picker = createCharacterPicker({ initial: filter.characterIds, includeExternal: false });
  const party = createPartySwitch();
  const close = openModal({
    title: '캐릭터 고르기',
    body: el('div', { className: 'v2-filter-modal' },
      el('p', { className: 'v2-filter-hint' }, '여러 명 고를 수 있어요.'),
      picker.node,
      party.node,
    ),
    actions: [
      el('button', { className: 'btn btn-ghost', type: 'button', onclick: () => picker.setSelected([]) }, '모두 해제'),
      el('button', {
        className: 'btn btn-primary', type: 'button',
        onclick: () => {
          filter.characterIds = picker.getSelected();
          filter.partyOnly = party.isOn();
          close();
          onChange();
        },
      }, '기록 보기'),
    ],
  });
}
